package com.eventhub.integration.guest;

import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GuestFunnelIT extends GuestPhase2TestSupport {
    @Test
    void attemptStartIsCsrfProtectedAndIdempotentOnlyWithinTheSameOwner() throws Exception {
        var event = event(4);
        var owner = new MockHttpSession();
        var attempt = UUID.randomUUID();

        mvc.perform(attempt(event, owner, attempt)).andExpect(status().isForbidden());
        mvc.perform(attempt(event, owner, attempt).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(attempt(event, owner, attempt).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(attempt(event, new MockHttpSession(), attempt).with(csrf()))
                .andExpect(status().isConflict());
    }

    @Test
    void funnelSeparatesGuestAndMemberAttemptsAndExcludesPendingFromDropOff() throws Exception {
        var event = event(6);
        var guest = new MockHttpSession();
        var completed = UUID.randomUUID();
        var member = account(guestEmail());
        when(clock.now()).thenReturn(now.minusMinutes(31));

        mvc.perform(attempt(event, guest, completed).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(attempt(event, guest, completed).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(attempt(event, new MockHttpSession(), UUID.randomUUID()).with(csrf()))
                .andExpect(status().isNoContent());
        var booked = bookFree(event, guest, guestEmail(), 2, "funnel-success", completed);
        checkIn(event, string(booked, "$.ticketCode"), "CHECKED_IN");

        when(clock.now()).thenReturn(now);
        mvc.perform(attempt(event, new MockHttpSession(), UUID.randomUUID()).with(csrf()))
                .andExpect(status().isNoContent());
        mvc.perform(attempt(event, new MockHttpSession(), UUID.randomUUID())
                        .with(user(member.getEmail()).roles("USER")).with(csrf()))
                .andExpect(status().isNoContent());

        mvc.perform(funnel(event, now.toLocalDate().minusDays(1), now.toLocalDate().plusDays(1))
                        .with(user("admin@example.test").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.maturityMinutes").value(30))
                .andExpect(jsonPath("$.total.startedAttempts").value(4))
                .andExpect(jsonPath("$.total.completedAttempts").value(1))
                .andExpect(jsonPath("$.total.maturedAttempts").value(2))
                .andExpect(jsonPath("$.total.pendingAttempts").value(2))
                .andExpect(jsonPath("$.total.droppedOffAttempts").value(1))
                .andExpect(jsonPath("$.total.dropOffRate").value(50.0))
                .andExpect(jsonPath("$.guest.startedAttempts").value(3))
                .andExpect(jsonPath("$.guest.confirmedOrders").value(1))
                .andExpect(jsonPath("$.guest.confirmedSeats").value(2))
                .andExpect(jsonPath("$.guest.activeSeats").value(2))
                .andExpect(jsonPath("$.guest.checkedInSeats").value(2))
                .andExpect(jsonPath("$.guest.showRate").value(100.0))
                .andExpect(jsonPath("$.user.startedAttempts").value(1))
                .andExpect(jsonPath("$.user.pendingAttempts").value(1))
                .andExpect(jsonPath("$.user.dropOffRate").doesNotExist());

        mvc.perform(funnel(event, now.toLocalDate().minusDays(2), now.toLocalDate().minusDays(1))
                        .with(user("admin@example.test").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total.startedAttempts").value(0))
                .andExpect(jsonPath("$.total.dropOffRate").doesNotExist())
                .andExpect(jsonPath("$.total.showRate").doesNotExist());
    }

    @Test
    void funnelRequiresAdminAndAValidDateRange() throws Exception {
        var event = event(4);
        var from = now.toLocalDate();
        var to = from.plusDays(1);
        mvc.perform(funnel(event, from, to)).andExpect(status().isUnauthorized());
        mvc.perform(funnel(event, from, to).with(user("staff@example.test").roles("STAFF")))
                .andExpect(status().isForbidden());
        mvc.perform(funnel(event, from, to).with(user("member@example.test").roles("USER")))
                .andExpect(status().isForbidden());
        mvc.perform(funnel(event, from, from).with(user("admin@example.test").roles("ADMIN")))
                .andExpect(status().isBadRequest());
        mvc.perform(funnel(event, from, to).with(user("admin@example.test").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total.startedAttempts").value(0))
                .andExpect(jsonPath("$.total.dropOffRate").doesNotExist())
                .andExpect(jsonPath("$.total.showRate").doesNotExist());
    }

    private static MockHttpServletRequestBuilder attempt(EventFixture event, MockHttpSession session, UUID id) {
        return post("/api/analytics/registration-attempts").session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"eventId":%d,"attemptId":"%s"}
                        """.formatted(event.id(), id));
    }

    private static MockHttpServletRequestBuilder funnel(EventFixture event, LocalDate from, LocalDate to) {
        return get("/api/admin/analytics/funnel").param("eventId", Long.toString(event.id()))
                .param("from", from.toString()).param("to", to.toString());
    }
}
