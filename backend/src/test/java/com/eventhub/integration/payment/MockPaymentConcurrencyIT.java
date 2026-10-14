package com.eventhub.integration.payment;

import com.eventhub.model.MockPaymentOrder;
import com.eventhub.model.MockPaymentStatus;
import com.eventhub.model.Role;
import com.eventhub.model.UserAccount;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

import static org.springframework.security.test.web.servlet.request
        .SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request
        .SecurityMockMvcRequestPostProcessors.user;

import static org.springframework.test.web.servlet.request
        .MockMvcRequestBuilders.post;

@SpringBootTest
@ActiveProfiles("test")
class MockPaymentConcurrencyIT extends MockPaymentDbTestSupport {

    private int confirm(
            Long paymentId,
            String email
    ) throws Exception {
        return mvc.perform(
                post("/api/payments/mock/{id}/confirm", paymentId)
                        .with(user(email).roles("USER"))
                        .with(csrf())
        ).andReturn().getResponse().getStatus();
    }

    private List<Integer> runTogether(
            Callable<Integer> first,
            Callable<Integer> second
    ) throws Exception {

        ExecutorService executor =
                Executors.newFixedThreadPool(2);

        CyclicBarrier barrier =
                new CyclicBarrier(2);

        try {
            Future<Integer> f1 = executor.submit(() -> {
                barrier.await(10, TimeUnit.SECONDS);
                return first.call();
            });

            Future<Integer> f2 = executor.submit(() -> {
                barrier.await(10, TimeUnit.SECONDS);
                return second.call();
            });

            return List.of(
                    f1.get(20, TimeUnit.SECONDS),
                    f2.get(20, TimeUnit.SECONDS)
            );
        } finally {
            executor.shutdownNow();

            assertTrue(
                    executor.awaitTermination(10, TimeUnit.SECONDS),
                    "Concurrent test workers must terminate"
            );
        }
    }

    // Duplicate Pending — Concurrent Checkout
    @Test
    void concurrentCheckoutMustNotCreateDuplicateActivePending()
            throws Exception {

        List<Integer> statuses = runTogether(
                () -> checkout(alice.getEmail(), 1)
                        .andReturn().getResponse().getStatus(),
                () -> checkout(alice.getEmail(), 1)
                        .andReturn().getResponse().getStatus()
        );

        assertTrue(statuses.contains(201));
        assertTrue(statuses.contains(409));

        List<MockPaymentOrder> pending =
                payments.findByUserIdAndEventIdAndStatus(
                        alice.getId(),
                        event.getId(),
                        MockPaymentStatus.PENDING_PAYMENT
                );

        assertEquals(1, pending.size());
        assertEquals(0L, registrations.count());
    }

    // PAY-CFM-013 — Confirm Payment เดียวกันพร้อมกัน
    @Test
    void concurrentConfirmSamePaymentIssuesOnlyOneRegistration()
            throws Exception {

        MockPaymentOrder order = createPending(alice, 1);
        Long paymentId = order.getId();

        List<Integer> statuses = runTogether(
                () -> confirm(paymentId, alice.getEmail()),
                () -> confirm(paymentId, alice.getEmail())
        );

        // Confirm ซ้ำแบบ Idempotent ต้องไม่ออก Ticket ใหม่
        // การคืน 200 หลังพบ Registration เดิมเป็น Policy ที่ยืนยันแล้ว
        assertEquals(List.of(200, 200), statuses);

        assertEquals(
                1L,
                registrations.countByEventId(event.getId())
        );

        assertEquals(
                1L,
                registrations.seatsReservedByEventId(event.getId())
        );

        MockPaymentOrder after =
                payments.findById(paymentId).orElseThrow();

        assertEquals(MockPaymentStatus.CONFIRMED, after.getStatus());
        assertNotNull(after.getRegistrationId());
        assertNotNull(after.getIssuedTicketCode());
    }

    // INT-PAY-005 — ผู้ใช้สองคนแย่งที่นั่งสุดท้าย
    @Test
    void concurrentConfirmCannotOversellEventOrTicket()
            throws Exception {

        // เหลือที่นั่งทั้งหมดเพียง 1
        event.setCapacity(1);
        ticket.setCapacity(1);

        events.saveAndFlush(event);
        tickets.saveAndFlush(ticket);

        MockPaymentOrder alicePayment =
                createPending(alice, 1);

        MockPaymentOrder bobPayment =
                createPending(bob, 1);

        List<Integer> statuses = runTogether(
                () -> confirm(
                        alicePayment.getId(),
                        alice.getEmail()
                ),
                () -> confirm(
                        bobPayment.getId(),
                        bob.getEmail()
                )
        );

        // ต้องมีผู้สำเร็จหนึ่งคน และอีกคนได้รับ Conflict
        assertTrue(statuses.contains(200));
        assertTrue(statuses.contains(409));

        assertEquals(
                1L,
                registrations.countByEventId(event.getId())
        );

        assertEquals(
                1L,
                registrations.seatsReservedByEventId(event.getId())
        );

        assertEquals(
                1L,
                registrations.seatsReservedByTicketTypeId(ticket.getId())
        );
    }
}