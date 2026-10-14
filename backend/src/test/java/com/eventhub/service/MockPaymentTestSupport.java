package com.eventhub.service;

import com.eventhub.dto.ApiDtos;
import com.eventhub.model.*;
import com.eventhub.repository.*;

import org.junit.jupiter.api.BeforeEach;
import org.mockito.Mock;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

abstract class MockPaymentTestSupport {

    @Mock protected EventRepository events;
    @Mock protected TicketTypeRepository tickets;
    @Mock protected RegistrationRepository registrations;
    @Mock protected UserRepository users;
    @Mock protected MockPaymentRepository payments;

    protected MockPaymentService service;

    protected UserAccount alice;
    protected UserAccount bob;
    protected Event event;
    protected TicketType ticket;

    protected Principal alicePrincipal;
    protected Principal bobPrincipal;

    @BeforeEach
    void setupPaymentFixture() {
        service = new MockPaymentService(
                events, tickets, registrations, users, payments
        );

        alice = new UserAccount(
                "Alice", "alice@example.test", "hash", Role.USER
        );
        bob = new UserAccount(
                "Bob", "bob@example.test", "hash", Role.USER
        );

        ReflectionTestUtils.setField(alice, "id", 10L);
        ReflectionTestUtils.setField(bob, "id", 11L);

        alicePrincipal = alice::getEmail;
        bobPrincipal = bob::getEmail;

        event = new Event();
        ReflectionTestUtils.setField(event, "id", 100L);

        event.setTitle("Spring Boot Workshop");
        event.setDescription("Backend workshop");
        event.setLocation("Bangkok");
        event.setCategory("TECH");
        event.setCapacity(20);
        event.setStartsAt(LocalDateTime.now().plusDays(7));

        ticket = new TicketType(
                event,
                "General",
                "General ticket",
                new BigDecimal("250.00"),
                20
        );

        ReflectionTestUtils.setField(ticket, "id", 200L);
        event.addTicketType(ticket);
    }

    protected ApiDtos.MockCheckoutRequest checkout(int quantity) {
        return new ApiDtos.MockCheckoutRequest(
                event.getId(), ticket.getId(), quantity
        );
    }

    protected MockPaymentOrder pendingPayment() {
        return payment(
                LocalDateTime.now().minusMinutes(1),
                LocalDateTime.now().plusMinutes(9)
        );
    }

    protected MockPaymentOrder expiredPayment() {
        return payment(
                LocalDateTime.now().minusMinutes(20),
                LocalDateTime.now().minusMinutes(10)
        );
    }

    private MockPaymentOrder payment(
            LocalDateTime created,
            LocalDateTime expires
    ) {
        MockPaymentOrder order = new MockPaymentOrder(
                alice,
                event.getId(),
                ticket.getId(),
                event.getTitle(),
                ticket.getName(),
                2,
                new BigDecimal("250.00"),
                created,
                expires
        );

        ReflectionTestUtils.setField(order, "id", 500L);
        return order;
    }

    protected Registration issuedRegistration() {
        Registration registration = new Registration(
                alice, event, ticket, 2
        );

        ReflectionTestUtils.setField(registration, "id", 700L);
        return registration;
    }

    protected void stubCommonRepositories() {
        // ใช้ lenient เพราะ Test บางกรณีต้องหยุดก่อนถึง
        // Repository บางตัว เช่น invalid quantity / capacity

        lenient().when(users.findByEmail(alice.getEmail()))
                .thenReturn(Optional.of(alice));

        lenient().when(users.findByEmail(bob.getEmail()))
                .thenReturn(Optional.of(bob));

        lenient().when(events.findById(100L))
                .thenReturn(Optional.of(event));

        lenient().when(events.findByIdForUpdate(100L))
                .thenReturn(Optional.of(event));

        lenient().when(tickets.findById(200L))
                .thenReturn(Optional.of(ticket));

        lenient().when(
                registrations.existsByUserIdAndEventId(10L, 100L)
        ).thenReturn(false);

        lenient().when(
                registrations.seatsReservedByEventId(100L)
        ).thenReturn(0L);

        lenient().when(
                registrations.seatsReservedByTicketTypeId(200L)
        ).thenReturn(0L);

        lenient().when(
                payments.findByUserIdAndEventIdAndStatus(
                        10L,
                        100L,
                        MockPaymentStatus.PENDING_PAYMENT
                )
        ).thenReturn(List.of());

        lenient().when(payments.save(any(MockPaymentOrder.class)))
                .thenAnswer(invocation -> {
                    MockPaymentOrder order = invocation.getArgument(0);

                    ReflectionTestUtils.setField(
                            order, "id", 500L
                    );
                    return order;
                });

        lenient().when(registrations.save(any(Registration.class)))
                .thenAnswer(invocation -> {
                    Registration registration =
                            invocation.getArgument(0);

                    ReflectionTestUtils.setField(
                            registration, "id", 700L
                    );
                    return registration;
                });
    }

    protected void stubPayment(MockPaymentOrder order) {
        lenient().when(payments.findById(500L))
                .thenReturn(Optional.of(order));

        lenient().when(payments.findByIdForUpdate(500L))
                .thenReturn(Optional.of(order));
    }

    protected void stubIssuedRegistration(Registration registration) {
        lenient().when(registrations.findById(700L))
                .thenReturn(Optional.of(registration));

        lenient().when(
                registrations.findByTicketCode(registration.getTicketCode())
        ).thenReturn(Optional.of(registration));
    }

    protected void assertStatus(
            HttpStatus expected,
            org.junit.jupiter.api.function.Executable action
    ) {
        ResponseStatusException error =
                assertThrows(ResponseStatusException.class, action);

        assertEquals(
                expected.value(),
                error.getStatusCode().value()
        );
    }
}