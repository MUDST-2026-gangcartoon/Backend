package com.eventhub.integration.guest;

import java.util.Locale;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GuestClaimIT extends GuestPhase2TestSupport {
    @Test
    void verifiedAccountClaimsExistingBookingWithoutChangingTheTicketOrOrigin() throws Exception {
        var event = event(4);
        var guestSession = new MockHttpSession();
        var member = account(guestEmail());
        var other = account(guestEmail());
        var booking = bookFree(event, guestSession, member.getEmail().toUpperCase(Locale.ROOT),
                2, "claim-booking", null);
        long registrationId = id(booking, "$.registrationId");
        String ticketCode = string(booking, "$.ticketCode");

        mvc.perform(get("/api/registrations/me").with(user(member.getEmail()).roles("USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(post("/api/registrations/claim-guest")
                        .with(user(member.getEmail()).roles("USER")).with(csrf()))
                .andExpect(status().isForbidden());

        String code = requestCode(member.getEmail());
        mvc.perform(confirmation(other.getEmail(), code))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/registrations/claim-guest")
                        .with(user(other.getEmail()).roles("USER")).with(csrf()))
                .andExpect(status().isForbidden());
        mvc.perform(confirmation(member.getEmail(), code))
                .andExpect(status().isNoContent());
        mvc.perform(confirmation(member.getEmail(), code))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/registrations/claim-guest")
                        .with(user(member.getEmail()).roles("USER")).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.claimedRegistrations").value(1));

        // A new member request without the original Guest session must see the same booking.
        mvc.perform(get("/api/registrations/me").with(user(member.getEmail()).roles("USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(registrationId))
                .andExpect(jsonPath("$[0].ticketCode").value(ticketCode))
                .andExpect(jsonPath("$[0].quantity").value(2));
        mvc.perform(get("/api/registrations/me").with(user(other.getEmail()).roles("USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        assertEquals(1, registrations.countByEventId(event.id()));
        assertEquals(2, registrations.seatsReservedByEventId(event.id()));

        checkIn(event, ticketCode, "CHECKED_IN");
        mvc.perform(get("/api/staff/events/{id}/attendees", event.id())
                        .with(user("staff@example.test").roles("STAFF")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].registrationId").value(registrationId))
                .andExpect(jsonPath("$[0].origin").value("GUEST"))
                .andExpect(jsonPath("$[0].claimStatus").value("CLAIMED"));

        member.setEmail(guestEmail());
        users.saveAndFlush(member);
        mvc.perform(get("/api/registrations/me").with(user(member.getEmail()).roles("USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(registrationId))
                .andExpect(jsonPath("$[0].ticketCode").value(ticketCode));
    }

    @Test
    void verificationEnforcesRoleCsrfCooldownAndCodeExpiry() throws Exception {
        var member = account(guestEmail());
        mvc.perform(post("/api/auth/email-verification/request").with(csrf()))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/email-verification/request")
                        .with(user("staff@example.test").roles("STAFF")).with(csrf()))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/email-verification/request").with(user(member.getEmail()).roles("USER")))
                .andExpect(status().isForbidden());

        String code = requestCode(member.getEmail());
        mvc.perform(post("/api/auth/email-verification/request")
                        .with(user(member.getEmail()).roles("USER")).with(csrf()))
                .andExpect(status().isTooManyRequests());
        when(clock.now()).thenReturn(now.plusMinutes(11));
        mvc.perform(confirmation(member.getEmail(), code))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/registrations/claim-guest")
                        .with(user(member.getEmail()).roles("USER")).with(csrf()))
                .andExpect(status().isForbidden());
    }

    private String requestCode(String email) throws Exception {
        mvc.perform(post("/api/auth/email-verification/request").with(user(email).roles("USER")).with(csrf()))
                .andExpect(status().isAccepted())
                .andExpect(result -> assertEquals("", result.getResponse().getContentAsString()));
        var code = ArgumentCaptor.forClass(String.class);
        verify(mailSender).send(eq(email), code.capture());
        return code.getValue();
    }

    private static MockHttpServletRequestBuilder confirmation(String email, String code) {
        return post("/api/auth/email-verification/confirm").with(user(email).roles("USER")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"" + code + "\"}");
    }
}
