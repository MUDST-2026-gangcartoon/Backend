package com.eventhub.service;

import com.eventhub.dto.ApiDtos;
import com.eventhub.model.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MockPaymentCheckoutServiceTests
        extends MockPaymentTestSupport {

    // PAY-CHK-001, 010
    @Test
    void paidCheckoutCreatesPendingOrderWithPriceSnapshot() {
        ticket.setPrice(new BigDecimal("125.30"));
        stubCommonRepositories();

        ApiDtos.MockCheckoutDto result =
                service.checkout(checkout(3), alicePrincipal);

        ArgumentCaptor<MockPaymentOrder> captor =
                ArgumentCaptor.forClass(MockPaymentOrder.class);

        verify(payments).save(captor.capture());

        MockPaymentOrder saved = captor.getValue();

        assertEquals(MockPaymentStatus.PENDING_PAYMENT, saved.getStatus());
        assertEquals(10L, saved.getUser().getId());
        assertEquals(100L, saved.getEventId());
        assertEquals(200L, saved.getTicketTypeId());
        assertEquals("Spring Boot Workshop", saved.getEventTitle());
        assertEquals("General", saved.getTicketTypeName());
        assertEquals(3, saved.getQuantity());

        assertEquals(
                0,
                new BigDecimal("125.30").compareTo(saved.getUnitPrice())
        );

        assertEquals(
                0,
                new BigDecimal("375.90").compareTo(saved.getTotalAmount())
        );

        assertEquals(500L, result.paymentId());
        assertEquals("PENDING_PAYMENT", result.status());
        assertEquals("THB", result.currency());
        assertEquals("EVENTHUB_DEMO_PAYMENT:500", result.qrPayload());

        assertEquals(
                0,
                new BigDecimal("375.90").compareTo(result.totalAmount())
        );
    }

    // PAY-CHK-002
    @Test
    void freeTicketCannotUsePaidCheckout() {
        ticket.setPrice(BigDecimal.ZERO);
        stubCommonRepositories();

        assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> service.checkout(checkout(1), alicePrincipal)
        );

        verify(payments, never()).save(any());
        verify(registrations, never()).save(any());
    }

    // PAY-CHK-003
    @Test
    void anonymousCheckoutReturns401() {
        assertStatus(
                HttpStatus.UNAUTHORIZED,
                () -> service.checkout(checkout(1), null)
        );

        verify(payments, never()).save(any());
    }

    // PAY-CHK-004
    @Test
    void missingEventReturns404() {
        stubCommonRepositories();

        when(events.findById(100L)).thenReturn(Optional.empty());
        when(events.findByIdForUpdate(100L))
                .thenReturn(Optional.empty());

        assertStatus(
                HttpStatus.NOT_FOUND,
                () -> service.checkout(checkout(1), alicePrincipal)
        );

        verify(payments, never()).save(any());
    }

    // PAY-CHK-005
    @Test
    void ticketFromDifferentEventIsRejected() {
        stubCommonRepositories();

        Event another = new Event();
        org.springframework.test.util.ReflectionTestUtils
                .setField(another, "id", 999L);

        ticket.setEvent(another);

        assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> service.checkout(checkout(1), alicePrincipal)
        );

        verify(payments, never()).save(any());
    }

    // PAY-CHK-006
    @ParameterizedTest
    @ValueSource(ints = {0, 11})
    void quantityMustBeBetweenOneAndTen(int quantity) {
        stubCommonRepositories();

        assertStatus(
                HttpStatus.BAD_REQUEST,
                () -> service.checkout(checkout(quantity), alicePrincipal)
        );

        verify(payments, never()).save(any());
    }

    // PAY-CHK-007
    @Test
    void eventCapacityExceededReturns409() {
        stubCommonRepositories();

        when(registrations.seatsReservedByEventId(100L))
                .thenReturn(19L);

        assertStatus(
                HttpStatus.CONFLICT,
                () -> service.checkout(checkout(2), alicePrincipal)
        );

        verify(payments, never()).save(any());
    }

    // PAY-CHK-008
    @Test
    void ticketCapacityExceededReturns409() {
        stubCommonRepositories();

        when(registrations.seatsReservedByTicketTypeId(200L))
                .thenReturn(19L);

        assertStatus(
                HttpStatus.CONFLICT,
                () -> service.checkout(checkout(2), alicePrincipal)
        );

        verify(payments, never()).save(any());
    }

    // PAY-CHK-009
    @Test
    void existingRegistrationReturns409() {
        stubCommonRepositories();

        when(registrations.existsByUserIdAndEventId(10L, 100L))
                .thenReturn(true);

        assertStatus(
                HttpStatus.CONFLICT,
                () -> service.checkout(checkout(2), alicePrincipal)
        );

        verify(payments, never()).save(any());
    }

    // PAY-CHK-011, 012, 013
    @Test
    void pendingDoesNotIssueTicketOrReserveCapacity() {
        stubCommonRepositories();

        service.checkout(checkout(2), alicePrincipal);

        ArgumentCaptor<MockPaymentOrder> captor =
                ArgumentCaptor.forClass(MockPaymentOrder.class);

        verify(payments).save(captor.capture());

        MockPaymentOrder order = captor.getValue();

        assertEquals(MockPaymentStatus.PENDING_PAYMENT, order.getStatus());
        assertNull(order.getRegistrationId());
        assertNull(order.getIssuedTicketCode());
        assertNull(order.getConfirmedAt());

        verify(registrations, never()).save(any());
    }

    // BR-PAY-005
    @Test
    void checkoutExpiresAfterTenMinutes() {
        stubCommonRepositories();

        LocalDateTime before = LocalDateTime.now();

        service.checkout(checkout(1), alicePrincipal);

        LocalDateTime after = LocalDateTime.now();

        ArgumentCaptor<MockPaymentOrder> captor =
                ArgumentCaptor.forClass(MockPaymentOrder.class);

        verify(payments).save(captor.capture());

        MockPaymentOrder order = captor.getValue();

        assertEquals(
                order.getCreatedAt().plusMinutes(10),
                order.getExpiresAt()
        );

        assertFalse(order.getCreatedAt().isBefore(before));
        assertFalse(order.getCreatedAt().isAfter(after));
    }

    // Duplicate Pending Policy
    @Test
    void activePendingSameUserEventReturns409() {
        stubCommonRepositories();

        when(payments.findByUserIdAndEventIdAndStatus(
                10L, 100L, MockPaymentStatus.PENDING_PAYMENT
        )).thenReturn(List.of(pendingPayment()));

        assertStatus(
                HttpStatus.CONFLICT,
                () -> service.checkout(checkout(2), alicePrincipal)
        );

        verify(payments, never()).save(any());
    }

    // Duplicate Pending แม้เปลี่ยน Ticket Type
    @Test
    void activePendingBlocksDifferentTicketTypeOfSameEvent() {
        stubCommonRepositories();

        TicketType vip = new TicketType(
                event, "VIP", "VIP ticket",
                new BigDecimal("500.00"), 20
        );

        org.springframework.test.util.ReflectionTestUtils
                .setField(vip, "id", 201L);

        lenient().when(tickets.findById(201L))
                .thenReturn(Optional.of(vip));

        when(payments.findByUserIdAndEventIdAndStatus(
                10L, 100L, MockPaymentStatus.PENDING_PAYMENT
        )).thenReturn(List.of(pendingPayment()));

        assertStatus(
                HttpStatus.CONFLICT,
                () -> service.checkout(
                        new ApiDtos.MockCheckoutRequest(100L, 201L, 1),
                        alicePrincipal
                )
        );

        verify(payments, never()).save(any());
    }

    // Pending หมดอายุแล้ว สามารถ Checkout ใหม่
    @Test
    void expiredPreviousPendingAllowsNewCheckout() {
        stubCommonRepositories();

        when(payments.findByUserIdAndEventIdAndStatus(
                10L, 100L, MockPaymentStatus.PENDING_PAYMENT
        )).thenReturn(List.of(expiredPayment()));

        ApiDtos.MockCheckoutDto result =
                service.checkout(checkout(1), alicePrincipal);

        assertNotNull(result);

        verify(payments).save(any(MockPaymentOrder.class));
    }

    // Checkout หลัง Event เริ่มแล้ว
    @Test
    void startedEventCannotCheckout() {
        event.setStartsAt(LocalDateTime.now().minusDays(1));
        stubCommonRepositories();

        assertStatus(
                HttpStatus.CONFLICT,
                () -> service.checkout(checkout(1), alicePrincipal)
        );

        verify(payments, never()).save(any());
    }
}