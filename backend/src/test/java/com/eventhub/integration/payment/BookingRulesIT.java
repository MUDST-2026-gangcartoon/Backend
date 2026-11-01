package com.eventhub.integration.payment;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.eventhub.model.*;
import com.eventhub.service.EventService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class BookingRulesIT extends MockPaymentDbTestSupport {

    @Autowired
    EventService service;

    private Registration registerFree(int qty) {
        ticket.setPrice(BigDecimal.ZERO);
        tickets.saveAndFlush(ticket);
        service.register(
            event.getId(),
            new com.eventhub.dto.ApiDtos.PurchaseRequest(ticket.getId(), qty),
            () -> alice.getEmail()
        );
        return registrations
            .findByUserIdOrderByEventStartsAtAsc(alice.getId())
            .stream()
            .filter(Registration::isActive)
            .findFirst()
            .orElseThrow();
    }

    private void confirm(Long id) throws Exception {
        mvc
            .perform(
                post("/api/payments/mock/{id}/confirm", id)
                    .with(user(alice.getEmail()).roles("USER"))
                    .with(csrf())
            )
            .andExpect(status().isOk());
    }

    @Test
    void paidCanCancelBeforeCheckinAndHistoricalPriceSurvivesEdit() throws Exception {
        var order = createPending(alice, 2);
        confirm(order.getId());
        ticket.setName("Renamed");
        ticket.setPrice(new BigDecimal("900.00"));
        tickets.saveAndFlush(ticket);
        mvc
            .perform(
                delete("/api/events/{id}/registrations", event.getId())
                    .with(user(alice.getEmail()).roles("USER"))
                    .with(csrf())
            )
            .andExpect(status().isNoContent());
        mvc
            .perform(
                get("/api/registrations/me").with(
                    user(alice.getEmail()).roles("USER")
                )
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].ticketTypeName").value("General"))
            .andExpect(jsonPath("$[0].totalPrice").value(500))
            .andExpect(jsonPath("$[0].cancellable").value(false));
    }

    @Test
    void cancellationIsAllowedAfterDeadlineAndEventEndUntilCheckin() {
        var registration=registerFree(1);
        var now=com.eventhub.service.EventClock.now();
        event.setStartsAt(now.minusHours(4));
        event.setEndsAt(now.minusHours(1));
        event.setRegistrationClosesAt(now.minusHours(5));
        events.saveAndFlush(event);
        assertTrue(service.mine(()->alice.getEmail()).get(0).cancellable());
        service.cancel(event.getId(),()->alice.getEmail(),"ไม่ได้เข้าร่วม");
        assertFalse(registrations.findById(registration.getId()).orElseThrow().isActive());
    }

    @Test
    void paidCancellationDoesNotRefundOrReissueOriginalTicket() throws Exception {
        var order=createPending(alice,1);confirm(order.getId());
        var original=registrations.findAll().get(0);
        service.cancel(event.getId(),()->alice.getEmail(),"เปลี่ยนแผน");
        assertEquals(MockPaymentStatus.CONFIRMED,payments.findById(order.getId()).orElseThrow().getStatus());
        mvc.perform(post("/api/payments/mock/{id}/confirm",order.getId()).with(user(alice.getEmail()).roles("USER")).with(csrf()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.registration.status").value("CANCELLED"))
            .andExpect(jsonPath("$.registration.cancellable").value(false)).andExpect(jsonPath("$.registration.event.registered").value(false));
        assertEquals(1,registrations.count());
        assertEquals(0,registrations.seatsReservedByEventId(event.getId()));
        assertEquals(original.getTicketCode(),registrations.findAll().get(0).getTicketCode());
    }

    @Test
    void paidCheckedInTicketCannotCancel() throws Exception {
        var order=createPending(alice,1);confirm(order.getId());
        var original=registrations.findAll().get(0);
        service.checkIn(event.getId(),original.getTicketCode(),()->"staff@example.test");
        mvc.perform(delete("/api/events/{id}/registrations",event.getId()).with(user(alice.getEmail()).roles("USER")).with(csrf()))
            .andExpect(status().isConflict());
        assertFalse(service.mine(()->alice.getEmail()).get(0).cancellable());
        assertTrue(registrations.findById(original.getId()).orElseThrow().isActive());
    }

    @Test
    void cancelPreservesHistoryReturnsSeatsAndAllowsNewBooking()
        throws Exception {
        var first = registerFree(2);
        service.cancel(event.getId(), () -> alice.getEmail(), "เปลี่ยนแผน");
        assertEquals(0, registrations.seatsReservedByEventId(event.getId()));
        assertEquals(
            "CANCELLED",
            registrations.findById(first.getId()).orElseThrow().getStatus()
        );
        var second = registerFree(3);
        assertNotEquals(first.getTicketCode(), second.getTicketCode());
        assertEquals(2, registrations.count());
        assertEquals(3, registrations.seatsReservedByEventId(event.getId()));
        mvc
            .perform(get("/api/events/{id}", event.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.registeredCount").value(3))
            .andExpect(jsonPath("$.ticketTypes[0].sold").value(3));
        mvc
            .perform(
                get("/api/events?status=REGISTERED").with(
                    user(alice.getEmail()).roles("USER")
                )
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void checkedInFreeTicketCannotCancel() {
        var r = registerFree(2);
        assertEquals(
            "CHECKED_IN",
            service
                .checkIn(event.getId(), r.getTicketCode(), () ->
                    "staff@example.test"
                )
                .result()
        );
        assertThrows(
            org.springframework.web.server.ResponseStatusException.class,
            () -> service.cancel(event.getId(), () -> alice.getEmail())
        );
    }

    @Test
    void canceledHistoryAndPendingPaymentBothBlockEventDeletion()
        throws Exception {
        registerFree(1);
        service.cancel(event.getId(), () -> alice.getEmail());
        mvc
            .perform(
                delete("/api/admin/events/{id}", event.getId())
                    .with(user("admin@example.test").roles("ADMIN"))
                    .with(csrf())
            )
            .andExpect(status().isConflict());
        registrations.deleteAllInBatch();
        ticket.setPrice(new BigDecimal("250.00"));
        tickets.saveAndFlush(ticket);
        createPending(alice, 1);
        mvc
            .perform(
                delete("/api/admin/events/{id}", event.getId())
                    .with(user("admin@example.test").roles("ADMIN"))
                    .with(csrf())
            )
            .andExpect(status().isConflict());
        assertTrue(events.existsById(event.getId()));
    }

    @Test
    void concurrentCheckinReturnsOneSuccessAndOneAlreadyUsed()
        throws Exception {
        var r = registerFree(3);
        var barrier = new CyclicBarrier(2);
        var pool = Executors.newFixedThreadPool(2);
        try {
            Callable<String> call = () -> {
                barrier.await(10, TimeUnit.SECONDS);
                return service
                    .checkIn(event.getId(), r.getTicketCode(), () ->
                        "staff@example.test"
                    )
                    .result();
            };
            var a = pool.submit(call);
            var b = pool.submit(call);
            var results = List.of(
                a.get(20, TimeUnit.SECONDS),
                b.get(20, TimeUnit.SECONDS)
            );
            assertTrue(results.contains("CHECKED_IN"));
            assertTrue(results.contains("ALREADY_USED"));
            assertEquals(
                3,
                registrations.seatsReservedByEventId(event.getId())
            );
        } finally {
            pool.shutdownNow();
            assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS));
        }
    }

    @Test
    void historyIsOwnerOnlyAndResumeDoesNotCreateNewOrder() throws Exception {
        var own = createPending(alice, 2);
        var other = createPending(bob, 1);
        mvc
            .perform(
                get("/api/payments/mock/history").with(
                    user(alice.getEmail()).roles("USER")
                )
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(1))
            .andExpect(jsonPath("$.items[0].paymentId").value(own.getId()));
        mvc
            .perform(
                get("/api/payments/mock/{id}/resume", other.getId()).with(
                    user(alice.getEmail()).roles("USER")
                )
            )
            .andExpect(status().isForbidden());
        mvc
            .perform(
                get("/api/payments/mock/{id}/resume", own.getId()).with(
                    user(alice.getEmail()).roles("USER")
                )
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.paymentId").value(own.getId()));
        assertEquals(2, payments.count());
    }

    @Test
    void registrationDeadlineAndCheckinWindowAreEnforced() throws Exception {
        var r = registerFree(1);
        event.setCheckinOpensAt(com.eventhub.service.EventClock.now().plusHours(1));
        event.setRegistrationClosesAt(com.eventhub.service.EventClock.now().minusMinutes(1));
        events.saveAndFlush(event);
        assertThrows(
            org.springframework.web.server.ResponseStatusException.class,
            () -> service.checkIn(event.getId(), r.getTicketCode())
        );
        mvc
            .perform(
                post("/api/events/{id}/registrations", event.getId())
                    .with(user(bob.getEmail()).roles("USER"))
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"ticketTypeId\":" +
                            ticket.getId() +
                            ",\"quantity\":1}"
                    )
            )
            .andExpect(status().isConflict());
        mvc
            .perform(get("/api/events?status=CLOSED"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(1))
            .andExpect(jsonPath("$.items[0].status").value("CLOSED"));
    }

    @Test
    void freeBookingRejectsStaffRole() throws Exception {
        ticket.setPrice(BigDecimal.ZERO);
        tickets.saveAndFlush(ticket);
        mvc
            .perform(
                post("/api/events/{id}/registrations", event.getId())
                    .with(user(alice.getEmail()).roles("STAFF"))
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"ticketTypeId\":" +
                            ticket.getId() +
                            ",\"quantity\":1}"
                    )
            )
            .andExpect(status().isForbidden());
    }

    @Test
    void reportCountsPeopleSeparatelyFromOrders() throws Exception {
        registerFree(3);
        mvc
            .perform(
                get("/api/admin/events/{id}/report", event.getId()).with(
                    user("admin@example.test").roles("ADMIN")
                )
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.orders").value(1))
            .andExpect(jsonPath("$.participants").value(3))
            .andExpect(jsonPath("$.notCheckedIn").value(3));
    }
}
