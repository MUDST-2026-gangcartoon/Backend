package com.eventhub.service;

import java.security.Principal;
import java.time.LocalDate;
import java.util.Locale;

import com.eventhub.dto.GuestApiDtos;
import com.eventhub.model.RegistrationAttempt;
import com.eventhub.model.Role;
import com.eventhub.repository.EventRepository;
import com.eventhub.repository.RegistrationAttemptRepository;
import com.eventhub.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class GuestPhase2Service {
    private final EventRepository events;
    private final UserRepository users;
    private final RegistrationAttemptRepository attempts;
    private final GuestPhase2Clock clock;

    public GuestPhase2Service(EventRepository events, UserRepository users,
            RegistrationAttemptRepository attempts, GuestPhase2Clock clock) {
        this.events = events;
        this.users = users;
        this.attempts = attempts;
        this.clock = clock;
    }

    public GuestApiDtos.Receipt register(
            Long eventId, String idempotencyKey, GuestApiDtos.BookingRequest booking, HttpServletRequest request) {
        throw pending();
    }

    public GuestApiDtos.Payment checkout(
            Long eventId, String idempotencyKey, GuestApiDtos.BookingRequest booking, HttpServletRequest request) {
        throw pending();
    }

    public GuestApiDtos.Receipt receipt(Long registrationId, HttpServletRequest request) {
        throw pending();
    }

    public GuestApiDtos.Receipt cancelRegistration(Long registrationId, HttpServletRequest request) {
        throw pending();
    }

    public GuestApiDtos.Payment payment(Long paymentId, HttpServletRequest request) {
        throw pending();
    }

    public GuestApiDtos.Payment confirmPayment(Long paymentId, HttpServletRequest request) {
        throw pending();
    }

    public GuestApiDtos.Payment cancelPayment(Long paymentId, HttpServletRequest request) {
        throw pending();
    }

    public void requestVerification(Principal principal) {
        throw pending();
    }

    public void confirmVerification(Principal principal, String code) {
        throw pending();
    }

    public GuestApiDtos.ClaimResult claim(Principal principal) {
        throw pending();
    }

    @Transactional
    public void startAttempt(GuestApiDtos.StartAttempt attempt, Principal principal, HttpServletRequest request) {
        String ownerKey = attemptOwner(principal, request);
        events.findByIdForUpdate(attempt.eventId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        var existing = attempts.findById(attempt.attemptId());
        if (existing.isPresent()) {
            if (!existing.get().belongsTo(attempt.eventId(), ownerKey)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Attempt ID is already in use");
            }
            return;
        }
        try {
            attempts.saveAndFlush(new RegistrationAttempt(
                    attempt.attemptId(), attempt.eventId(), ownerKey, clock.now()));
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Attempt ID is already in use");
        }
    }

    private String attemptOwner(Principal principal, HttpServletRequest request) {
        if (principal == null) return "g:" + GuestSession.credential(request, true);
        var user = users.findByEmail(principal.getName().trim().toLowerCase(Locale.ROOT))
                .filter(account -> account.getRole() == Role.USER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied"));
        return "u:" + user.getId();
    }

    public GuestApiDtos.Funnel funnel(Long eventId, LocalDate from, LocalDate to) {
        throw pending();
    }

    private static ResponseStatusException pending() {
        return new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "Phase 2 behavior is pending");
    }
}
