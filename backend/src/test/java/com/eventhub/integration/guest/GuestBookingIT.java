package com.eventhub.integration.guest;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GuestBookingIT extends GuestPhase2TestSupport {
    @Test
    void guestWritesRequireCsrfAndAnIdempotencyKeyWhileMemberPaymentsStayRestricted() throws Exception {
        var event = event(3);
        var session = new MockHttpSession();
        String email = guestEmail();

        mvc.perform(guestBooking(event, event.freeTicketId(), "registrations", session, email, 1, "no-csrf", null))
                .andExpect(status().isForbidden());
        mvc.perform(guestBooking(event, event.freeTicketId(), "registrations", session, email, 1, null, null).with(csrf()))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/payments/mock/checkout").session(session).with(csrf()))
                .andExpect(status().isUnauthorized());
        assertEquals(0, registrations.countByEventId(event.id()));
    }

    @Test
    void freeReceiptRequiresTheOriginalSessionAndReplayDoesNotConsumeMoreSeats() throws Exception {
        var event = event(3);
        var owner = new MockHttpSession();
        String email = guestEmail();

        var initial = bookFree(event, owner, email, 2, "free-retry", null);
        long registrationId = id(initial, "$.registrationId");
        String ticketCode = string(initial, "$.ticketCode");
        var replay = bookFree(event, owner, email, 2, "free-retry", null);
        assertEquals(registrationId, id(replay, "$.registrationId"));
        assertEquals(ticketCode, string(replay, "$.ticketCode"));
        mvc.perform(guestBooking(event, event.freeTicketId(), "registrations", owner,
                        email, 1, "free-retry", null).with(csrf()))
                .andExpect(status().isConflict());
        assertEquals(1, registrations.countByEventId(event.id()));
        assertEquals(2, registrations.seatsReservedByEventId(event.id()));

        mvc.perform(get("/api/guest/bookings/{id}", registrationId).session(owner))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.registrationId").value(registrationId))
                .andExpect(jsonPath("$.ticketCode").value(ticketCode))
                .andExpect(jsonPath("$.email").doesNotExist());
        mvc.perform(get("/api/guest/bookings/{id}", registrationId))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/guest/bookings/{id}", registrationId).session(new MockHttpSession()))
                .andExpect(status().isNotFound());
    }

    @Test
    void competingGuestSessionsCannotReserveTheSameLastSeat() throws Exception {
        var event = event(1);
        var first = guestBooking(event, event.freeTicketId(), "registrations", new MockHttpSession(),
                guestEmail(), 1, "race-1", null).with(csrf());
        var second = guestBooking(event, event.freeTicketId(), "registrations", new MockHttpSession(),
                guestEmail(), 1, "race-2", null).with(csrf());
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var outcomes = List.of(first, second).stream().map(request -> pool.submit(() -> {
                ready.countDown();
                assertTrue(start.await(10, TimeUnit.SECONDS));
                return mvc.perform(request).andReturn().getResponse().getStatus();
            })).toList();
            boolean readyInTime = ready.await(10, TimeUnit.SECONDS);
            start.countDown();
            assertTrue(readyInTime);
            var statuses = List.of(outcomes.get(0).get(20, TimeUnit.SECONDS), outcomes.get(1).get(20, TimeUnit.SECONDS));
            assertEquals(List.of(201, 409), statuses.stream().sorted().toList());
        }
        assertEquals(1, registrations.countByEventId(event.id()));
        assertEquals(1, registrations.seatsReservedByEventId(event.id()));
    }

    @Test
    void paidGuestReceivesATicketOnlyAfterOwnerConfirmationAndCanRetrySafely() throws Exception {
        var event = event(3);
        var owner = new MockHttpSession();
        String email = guestEmail();
        mvc.perform(guestBooking(event, event.paidTicketId(), "registrations", owner,
                        email, 2, "paid-direct", null).with(csrf()))
                .andExpect(status().isConflict());
        var pending = mvc.perform(guestBooking(event, event.paidTicketId(), "checkout", owner,
                        email, 2, "paid-retry", null).with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING_PAYMENT"))
                .andExpect(jsonPath("$.registration").doesNotExist())
                .andReturn();
        long paymentId = id(pending, "$.paymentId");
        mvc.perform(guestBooking(event, event.paidTicketId(), "checkout", owner,
                        email, 2, "paid-retry", null).with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.paymentId").value(paymentId));
        assertEquals(0, registrations.seatsReservedByEventId(event.id()));

        mvc.perform(get("/api/guest/payments/{id}", paymentId).session(new MockHttpSession()))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/guest/payments/{id}/confirm", paymentId)
                        .session(new MockHttpSession()).with(csrf()))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/guest/payments/{id}/confirm", paymentId).session(owner))
                .andExpect(status().isForbidden());
        var confirmed = mvc.perform(post("/api/guest/payments/{id}/confirm", paymentId).session(owner).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.registration.ticketCode").isNotEmpty())
                .andReturn();
        long registrationId = id(confirmed, "$.registration.registrationId");
        mvc.perform(post("/api/guest/payments/{id}/confirm", paymentId).session(owner).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.registration.registrationId").value(registrationId));
        mvc.perform(get("/api/guest/bookings/{id}", registrationId).session(owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ticketCode").value(string(confirmed, "$.registration.ticketCode")));
        assertEquals(1, registrations.countByEventId(event.id()));
        assertEquals(2, registrations.seatsReservedByEventId(event.id()));
    }

    @Test
    void onlyTheOwnerCanCancelAndStaffCannotCheckInACancelledGuestTicket() throws Exception {
        var event = event(3);
        var owner = new MockHttpSession();
        var booking = bookFree(event, owner, guestEmail(), 2, "cancel-guest", null);
        long registrationId = id(booking, "$.registrationId");
        String ticketCode = string(booking, "$.ticketCode");

        mvc.perform(post("/api/guest/bookings/{id}/cancel", registrationId)
                        .session(new MockHttpSession()).with(csrf()))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/guest/bookings/{id}/cancel", registrationId).session(owner).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.registrationId").value(registrationId))
                .andExpect(jsonPath("$.status").value("CANCELLED"));
        assertEquals(1, registrations.countByEventId(event.id()));
        assertEquals(0, registrations.seatsReservedByEventId(event.id()));
        mvc.perform(post("/api/staff/events/{id}/check-in", event.id())
                        .with(user("staff@example.test").roles("STAFF")).with(csrf())
                        .contentType("application/json")
                        .content("{\"ticketCode\":\"" + ticketCode + "\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void staffCheckInUsesTheGuestSnapshotAndTreatsAScanReplayAsAlreadyUsed() throws Exception {
        var event = event(3);
        var booking = bookFree(event, new MockHttpSession(), guestEmail(), 2, "guest-checkin", null);
        long registrationId = id(booking, "$.registrationId");
        String ticketCode = string(booking, "$.ticketCode");

        var first = checkIn(event, ticketCode, "CHECKED_IN");
        var repeated = checkIn(event, ticketCode, "ALREADY_USED");
        assertEquals(2, id(first, "$.quantity"));
        assertEquals("Guest Participant", string(first, "$.attendeeName"));
        var firstAt = LocalDateTime.parse(string(first, "$.checkedInAt"));
        var repeatedAt = LocalDateTime.parse(string(repeated, "$.checkedInAt"));
        assertTrue(Math.abs(ChronoUnit.NANOS.between(firstAt, repeatedAt)) <= 1_000);
        mvc.perform(get("/api/staff/events/{id}/attendees", event.id())
                        .with(user("staff@example.test").roles("STAFF")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].registrationId").value(registrationId))
                .andExpect(jsonPath("$[0].origin").value("GUEST"))
                .andExpect(jsonPath("$[0].claimStatus").value("UNCLAIMED"))
                .andExpect(jsonPath("$[0].userId").doesNotExist());
    }
}
