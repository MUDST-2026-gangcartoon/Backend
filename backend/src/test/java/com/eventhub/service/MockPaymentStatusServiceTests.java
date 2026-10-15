package com.eventhub.service;

import com.eventhub.dto.ApiDtos;
import com.eventhub.model.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MockPaymentStatusServiceTests
        extends MockPaymentTestSupport {

    // PAY-STS-001
    @Test
    void ownerCanReadPaymentStatus() {
        stubCommonRepositories();

        MockPaymentOrder order = pendingPayment();
        stubPayment(order);

        ApiDtos.MockPaymentStatusDto result =
                service.get(500L, alicePrincipal);

        assertEquals(500L, result.paymentId());
        assertEquals("PENDING_PAYMENT", result.status());
        assertEquals("THB", result.currency());

        assertEquals(
                0,
                new BigDecimal("500.00")
                        .compareTo(result.totalAmount())
        );

        assertNull(result.registrationId());
        assertNull(result.confirmedAt());
    }

    // PAY-STS-002
    @Test
    void nonOwnerCannotReadPayment() {
        stubCommonRepositories();
        stubPayment(pendingPayment());

        assertStatus(
                HttpStatus.NOT_FOUND,
                () -> service.get(500L, bobPrincipal)
        );
    }

    // PAY-STS-003
    @Test
    void missingPaymentReturns404() {
        stubCommonRepositories();

        assertStatus(
                HttpStatus.NOT_FOUND,
                () -> service.get(999L, alicePrincipal)
        );
    }

    // Expiration Policy
    @Test
    void expiredPendingIsReportedAsExpiredWithoutWorker() {
        stubCommonRepositories();

        MockPaymentOrder order = expiredPayment();
        stubPayment(order);

        ApiDtos.MockPaymentStatusDto result =
                service.get(500L, alicePrincipal);

        assertEquals("EXPIRED", result.status());
        assertNull(result.registrationId());
    }

    // Boundary: now >= expiresAt
    @Test
    void paymentAtExpirationBoundaryIsNotConfirmable() {
        stubCommonRepositories();

        LocalDateTime expiresAt = LocalDateTime.now();

        MockPaymentOrder order = new MockPaymentOrder(
                alice,
                100L,
                200L,
                "Spring Boot Workshop",
                "General",
                2,
                new BigDecimal("250.00"),
                expiresAt.minusMinutes(10),
                expiresAt
        );

        org.springframework.test.util.ReflectionTestUtils
                .setField(order, "id", 500L);

        stubPayment(order);

        ApiDtos.MockPaymentStatusDto result =
                service.get(500L, alicePrincipal);

        assertEquals("EXPIRED", result.status());
    }

    // PAY-CAN-001
    @Test
    void ownerCanCancelPendingPayment() {
        stubCommonRepositories();

        MockPaymentOrder order = pendingPayment();
        stubPayment(order);

        ApiDtos.MockPaymentStatusDto result =
                service.cancel(500L, alicePrincipal);

        assertEquals("CANCELLED", result.status());
        assertEquals(MockPaymentStatus.CANCELLED, order.getStatus());

        verify(registrations, never()).save(any());
        verify(payments, never()).delete(any());
    }

    // PAY-CAN-002
    @Test
    void cancelledPaymentCannotBeConfirmed() {
        stubCommonRepositories();

        MockPaymentOrder order = pendingPayment();
        order.markCancelled();

        stubPayment(order);

        assertStatus(
                HttpStatus.CONFLICT,
                () -> service.confirm(500L, alicePrincipal)
        );

        verify(registrations, never()).save(any());
    }

    // PAY-CAN-003
    @Test
    void confirmedPaymentCannotBeCancelled() {
        stubCommonRepositories();

        MockPaymentOrder order = pendingPayment();
        Registration registration = issuedRegistration();

        order.markConfirmed(
                registration.getId(),
                registration.getTicketCode(),
                LocalDateTime.now().minusMinutes(1)
        );

        stubPayment(order);

        assertStatus(
                HttpStatus.CONFLICT,
                () -> service.cancel(500L, alicePrincipal)
        );

        assertEquals(MockPaymentStatus.CONFIRMED, order.getStatus());
    }

    // PAY-CAN-004
    @Test
    void nonOwnerCannotCancelPayment() {
        stubCommonRepositories();

        MockPaymentOrder order = pendingPayment();
        stubPayment(order);

        assertStatus(
                HttpStatus.NOT_FOUND,
                () -> service.cancel(500L, bobPrincipal)
        );

        assertEquals(
                MockPaymentStatus.PENDING_PAYMENT,
                order.getStatus()
        );
    }

    // Cancelled payment no longer blocks checkout
    @Test
    void cancelledPaymentDoesNotPreventNewCheckout() {
        stubCommonRepositories();

        ApiDtos.MockCheckoutDto result =
                service.checkout(checkout(1), alicePrincipal);

        assertNotNull(result);
        assertEquals("PENDING_PAYMENT", result.status());
    }

    // Status history after Registration cancellation
    @Test
    void confirmedHistoryRemainsConfirmedAfterTicketCancellation() {
        stubCommonRepositories();

        MockPaymentOrder order = pendingPayment();
        Registration registration = issuedRegistration();

        order.markConfirmed(
                registration.getId(),
                registration.getTicketCode(),
                LocalDateTime.now().minusMinutes(1)
        );

        stubPayment(order);

        // Registration ถูกยกเลิกไปแล้ว

        ApiDtos.MockPaymentStatusDto result =
                service.get(500L, alicePrincipal);

        assertEquals("CONFIRMED", result.status());
        assertEquals(700L, result.registrationId());

        // Payment History ไม่ใช่ Active Ticket
        assertEquals(MockPaymentStatus.CONFIRMED, order.getStatus());
    }
}