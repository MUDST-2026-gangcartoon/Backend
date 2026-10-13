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
class MockPaymentConfirmServiceTests
        extends MockPaymentTestSupport {

    // PAY-CFM-001, PAY-REG-003
    @Test
    void validConfirmCreatesRegistrationAndConfirmsPayment() {
        stubCommonRepositories();

        MockPaymentOrder order = pendingPayment();
        stubPayment(order);

        ApiDtos.MockConfirmDto result =
                service.confirm(500L, alicePrincipal);

        verify(registrations).save(any(Registration.class));

        assertEquals("CONFIRMED", result.paymentStatus());
        assertEquals(500L, result.paymentId());

        assertNotNull(result.registration());
        assertEquals(700L, result.registration().id());
        assertEquals(2, result.registration().quantity());

        assertNotNull(result.registration().ticketCode());
        assertFalse(result.registration().ticketCode().isBlank());

        assertEquals(MockPaymentStatus.CONFIRMED, order.getStatus());
        assertEquals(700L, order.getRegistrationId());
        assertNotNull(order.getIssuedTicketCode());
        assertNotNull(order.getConfirmedAt());
    }

    // PAY-CFM-002 — Idempotent confirm
    @Test
    void confirmedPaymentReturnsExistingRegistration() {
        stubCommonRepositories();

        MockPaymentOrder order = pendingPayment();
        Registration existing = issuedRegistration();

        order.markConfirmed(
                existing.getId(),
                existing.getTicketCode(),
                LocalDateTime.now().minusSeconds(30)
        );

        stubPayment(order);
        stubIssuedRegistration(existing);

        ApiDtos.MockConfirmDto result =
                service.confirm(500L, alicePrincipal);

        assertEquals("CONFIRMED", result.paymentStatus());
        assertEquals(700L, result.registration().id());

        assertEquals(
                existing.getTicketCode(),
                result.registration().ticketCode()
        );

        verify(registrations, never()).save(any());
    }

    // PAY-CFM-003 — Ownership failure must look like 404
    @Test
    void anotherUserCannotConfirmPayment() {
        stubCommonRepositories();
        stubPayment(pendingPayment());

        assertStatus(
                HttpStatus.NOT_FOUND,
                () -> service.confirm(500L, bobPrincipal)
        );

        verify(registrations, never()).save(any());
    }

    // PAY-CFM-004 — Expired
    @Test
    void expiredPaymentCannotBeConfirmed() {
        stubCommonRepositories();
        stubPayment(expiredPayment());

        assertStatus(
                HttpStatus.CONFLICT,
                () -> service.confirm(500L, alicePrincipal)
        );

        verify(registrations, never()).save(any());
    }

    // PAY-CFM-005 — Cancelled
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

    // PAY-CFM-006
    @Test
    void startedEventCannotBeConfirmed() {
        stubCommonRepositories();
        stubPayment(pendingPayment());

        event.setStartsAt(LocalDateTime.now().minusDays(1));

        assertStatus(
                HttpStatus.CONFLICT,
                () -> service.confirm(500L, alicePrincipal)
        );

        verify(registrations, never()).save(any());
    }

    // PAY-CFM-007
    @Test
    void fullEventCannotBeConfirmed() {
        stubCommonRepositories();
        stubPayment(pendingPayment());

        when(registrations.seatsReservedByEventId(100L))
                .thenReturn(19L);

        assertStatus(
                HttpStatus.CONFLICT,
                () -> service.confirm(500L, alicePrincipal)
        );

        verify(registrations, never()).save(any());
    }

    // PAY-CFM-008
    @Test
    void fullTicketTypeCannotBeConfirmed() {
        stubCommonRepositories();
        stubPayment(pendingPayment());

        when(registrations.seatsReservedByTicketTypeId(200L))
                .thenReturn(19L);

        assertStatus(
                HttpStatus.CONFLICT,
                () -> service.confirm(500L, alicePrincipal)
        );

        verify(registrations, never()).save(any());
    }

    // PAY-CFM-009 — Price changed
    @Test
    void priceChangeBetweenCheckoutAndConfirmReturns409() {
        stubCommonRepositories();
        stubPayment(pendingPayment());

        ticket.setPrice(new BigDecimal("300.00"));

        assertStatus(
                HttpStatus.CONFLICT,
                () -> service.confirm(500L, alicePrincipal)
        );

        verify(registrations, never()).save(any());
    }

    // BR-PAY-004 — Numeric equality, not BigDecimal scale
    @Test
    void equalNumericPriceWithDifferentScaleIsAccepted() {
        stubCommonRepositories();
        stubPayment(pendingPayment());

        ticket.setPrice(new BigDecimal("250.0"));

        ApiDtos.MockConfirmDto result =
                service.confirm(500L, alicePrincipal);

        assertEquals("CONFIRMED", result.paymentStatus());

        verify(registrations).save(any(Registration.class));
    }

    // PAY-CFM-010 — Ticket removed
    @Test
    void deletedTicketTypeReturns404() {
        stubCommonRepositories();
        stubPayment(pendingPayment());

        when(tickets.findById(200L))
                .thenReturn(Optional.empty());

        assertStatus(
                HttpStatus.NOT_FOUND,
                () -> service.confirm(500L, alicePrincipal)
        );

        verify(registrations, never()).save(any());
    }

    // API-PAY-002 — Event removed
    @Test
    void deletedEventReturns404() {
        stubCommonRepositories();
        stubPayment(pendingPayment());

        when(events.findById(100L)).thenReturn(Optional.empty());
        when(events.findByIdForUpdate(100L))
                .thenReturn(Optional.empty());

        assertStatus(
                HttpStatus.NOT_FOUND,
                () -> service.confirm(500L, alicePrincipal)
        );

        verify(registrations, never()).save(any());
    }

    // PAY-CFM-011
    @Test
    void existingRegistrationPreventsSecondIssuance() {
        stubCommonRepositories();
        stubPayment(pendingPayment());

        when(registrations.existsByUserIdAndEventId(10L, 100L))
                .thenReturn(true);

        assertStatus(
                HttpStatus.CONFLICT,
                () -> service.confirm(500L, alicePrincipal)
        );

        verify(registrations, never()).save(any());
    }

    // PAY-CFM-014 — Confirmed payment, Registration deleted
    @Test
    void cancelledRegistrationCannotBeReissued() {
        stubCommonRepositories();

        MockPaymentOrder order = pendingPayment();
        Registration previous = issuedRegistration();

        order.markConfirmed(
                previous.getId(),
                previous.getTicketCode(),
                LocalDateTime.now().minusMinutes(1)
        );

        stubPayment(order);

        when(registrations.findById(700L))
                .thenReturn(Optional.empty());

        assertStatus(
                HttpStatus.CONFLICT,
                () -> service.confirm(500L, alicePrincipal)
        );

        verify(registrations, never()).save(any());
        assertEquals(MockPaymentStatus.CONFIRMED, order.getStatus());
    }

    // Ownership policy — missing ID
    @Test
    void missingPaymentReturns404() {
        stubCommonRepositories();

        assertStatus(
                HttpStatus.NOT_FOUND,
                () -> service.confirm(999L, alicePrincipal)
        );

        verify(registrations, never()).save(any());
    }

    // No authentication
    @Test
    void unauthenticatedConfirmReturns401() {
        assertStatus(
                HttpStatus.UNAUTHORIZED,
                () -> service.confirm(500L, null)
        );

        verify(registrations, never()).save(any());
    }
}