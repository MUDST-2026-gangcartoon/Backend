package com.eventhub.service;

import java.security.Principal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Objects;

import com.eventhub.dto.GuestApiDtos;
import com.eventhub.model.Event;
import com.eventhub.model.GuestIdentity;
import com.eventhub.model.MockPaymentOrder;
import com.eventhub.model.MockPaymentStatus;
import com.eventhub.model.Registration;
import com.eventhub.model.RegistrationAttempt;
import com.eventhub.model.Role;
import com.eventhub.model.TicketType;
import com.eventhub.repository.*;
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
    private final TicketTypeRepository tickets;
    private final RegistrationRepository registrations;
    private final MockPaymentRepository payments;
    private final GuestIdentityRepository guests;
    private final RegistrationAttemptRepository attempts;
    private final RegistrationAttemptTracking tracking;
    private final GuestPhase2Clock clock;
    private final GuestClaimService claims;
    private final RegistrationFunnelService funnel;

    public GuestPhase2Service(EventRepository events, UserRepository users, TicketTypeRepository tickets,
            RegistrationRepository registrations, MockPaymentRepository payments, GuestIdentityRepository guests,
            RegistrationAttemptRepository attempts, RegistrationAttemptTracking tracking, GuestPhase2Clock clock,
            GuestClaimService claims, RegistrationFunnelService funnel) {
        this.events = events;
        this.users = users;
        this.tickets = tickets;
        this.registrations = registrations;
        this.payments = payments;
        this.guests = guests;
        this.attempts = attempts;
        this.tracking = tracking;
        this.clock = clock;
        this.claims = claims;
        this.funnel = funnel;
    }

    @Transactional
    public GuestApiDtos.Receipt register(
            Long eventId, String key, GuestApiDtos.BookingRequest booking, HttpServletRequest request) {
        String session = GuestSession.credential(request, true);
        GuestIdentity guest = lockedGuest(booking.email());
        Event event = lockedEvent(eventId);
        var previous = registrations.findByGuestSessionHashAndEventIdAndGuestRequestKey(session, eventId, key);
        if (previous.isPresent()) {
            if (guest.getClaimedUserId() != null) throw missing("Booking");
            Registration registration = previous.get();
            requireSameRequest(booking, registration.getGuest(), registration.getGuestDisplayName(),
                    registration.getTicketType().getId(), registration.getQuantity(), registration.getGuestAttemptId());
            return receipt(registration);
        }

        LocalDateTime now = clock.now();
        TicketType ticket = availableTicket(guest, event, booking, now);
        if (ticket.getPrice() != null && ticket.getPrice().signum() > 0) {
            throw conflict("Paid tickets require mock payment checkout");
        }
        requireNoPendingPayment(guest, eventId, now);
        RegistrationAttempt attempt = tracking.active(booking.attemptId(), eventId, "g:" + session);
        Registration registration = registrations.save(Registration.forGuest(guest, booking.displayName().strip(),
                session, key, booking.attemptId(), event, ticket, booking.quantity(), now));
        tracking.complete(attempt, registration);
        return receipt(registration);
    }

    @Transactional
    public GuestApiDtos.Payment checkout(
            Long eventId, String key, GuestApiDtos.BookingRequest booking, HttpServletRequest request) {
        String session = GuestSession.credential(request, true);
        GuestIdentity guest = lockedGuest(booking.email());
        Event event = lockedEvent(eventId);
        var previous = payments.findByGuestSessionHashAndEventIdAndGuestRequestKey(session, eventId, key);
        if (previous.isPresent()) {
            if (guest.getClaimedUserId() != null) throw missing("Payment");
            MockPaymentOrder order = previous.get();
            requireSameRequest(booking, order.getGuest(), order.getGuestDisplayName(),
                    order.getTicketTypeId(), order.getQuantity(), order.getAttemptId());
            return payment(order);
        }

        LocalDateTime now = clock.now();
        TicketType ticket = availableTicket(guest, event, booking, now);
        if (ticket.getPrice() == null || ticket.getPrice().signum() <= 0) {
            throw conflict("Free tickets must use direct registration");
        }
        requireNoPendingPayment(guest, eventId, now);
        tracking.active(booking.attemptId(), eventId, "g:" + session);
        MockPaymentOrder order = payments.save(MockPaymentOrder.forGuest(guest, booking.displayName().strip(),
                session, key, booking.attemptId(), eventId, ticket.getId(), event.getTitle(), ticket.getName(),
                booking.quantity(), ticket.getPrice(), now, now.plusMinutes(MockPaymentService.EXPIRATION_MINUTES)));
        return payment(order);
    }

    @Transactional(readOnly = true)
    public GuestApiDtos.Receipt receipt(Long registrationId, HttpServletRequest request) {
        String session = requireSession(request, "Booking");
        return receipt(registrations.findById(registrationId)
                .filter(r -> session.equals(r.getGuestSessionHash()) && r.getGuest().getClaimedUserId() == null)
                .orElseThrow(() -> missing("Booking")));
    }

    @Transactional
    public GuestApiDtos.Receipt cancelRegistration(Long registrationId, HttpServletRequest request) {
        String session = requireSession(request, "Booking");
        // Lock the same registration row used by staff check-in.
        var registration = registrations.findByIdForUpdate(registrationId)
                .filter(r -> session.equals(r.getGuestSessionHash()))
                .orElseThrow(() -> missing("Booking"));
        var guest = guests.findByIdForUpdate(registration.getGuest().getId()).orElseThrow(() -> missing("Booking"));
        if (guest.getClaimedUserId() != null) throw missing("Booking");
        String blocked = EventService.cancellationReason(registration);
        if (blocked != null) throw conflict(blocked);
        registration.cancel("ผู้เข้าร่วมยกเลิก");
        return receipt(registration);
    }

    @Transactional(readOnly = true)
    public GuestApiDtos.Payment payment(Long paymentId, HttpServletRequest request) {
        String session = requireSession(request, "Payment");
        return payment(payments.findById(paymentId)
                .filter(p -> session.equals(p.getGuestSessionHash()) && p.getGuest().getClaimedUserId() == null)
                .orElseThrow(() -> missing("Payment")));
    }

    @Transactional
    public GuestApiDtos.Payment confirmPayment(Long paymentId, HttpServletRequest request) {
        MockPaymentOrder order = ownedOrderForUpdate(paymentId, request);
        if (order.getStatus() == MockPaymentStatus.CONFIRMED) return payment(order);
        LocalDateTime now = clock.now();
        if (effectiveStatus(order, now) != MockPaymentStatus.PENDING_PAYMENT) throw conflict("Payment is not pending");
        GuestIdentity guest = order.getGuest();
        Event event = lockedEvent(order.getEventId());
        requireGuestAvailable(guest, event, now);
        TicketType ticket = ticket(order.getTicketTypeId(), event.getId());
        if (ticket.getPrice() == null || ticket.getPrice().compareTo(order.getUnitPrice()) != 0) {
            throw conflict("Ticket price has changed");
        }
        BookingCapacity.requireAvailable(registrations, event, ticket, order.getQuantity());
        RegistrationAttempt attempt = tracking.active(order.getAttemptId(), event.getId(),
                "g:" + order.getGuestSessionHash());
        Registration registration = Registration.forGuest(guest, order.getGuestDisplayName(),
                order.getGuestSessionHash(), null, order.getAttemptId(), event, ticket, order.getQuantity(), now);
        registration.snapshot(order.getTicketTypeName(), order.getUnitPrice());
        registrations.saveAndFlush(registration);
        order.markConfirmed(registration.getId(), registration.getTicketCode(), now);
        tracking.complete(attempt, registration);
        return payment(order);
    }

    @Transactional
    public GuestApiDtos.Payment cancelPayment(Long paymentId, HttpServletRequest request) {
        MockPaymentOrder order = ownedOrderForUpdate(paymentId, request);
        if (effectiveStatus(order, clock.now()) != MockPaymentStatus.PENDING_PAYMENT) {
            throw conflict("Only active pending payments can be cancelled");
        }
        order.markCancelled();
        return payment(order);
    }

    public void requestVerification(Principal principal) {
        claims.requestVerification(principal);
    }

    public void confirmVerification(Principal principal, String code) {
        claims.confirmVerification(principal, code);
    }

    public GuestApiDtos.ClaimResult claim(Principal principal) {
        return claims.claim(principal);
    }

    @Transactional
    public void startAttempt(GuestApiDtos.StartAttempt attempt, Principal principal, HttpServletRequest request) {
        String ownerKey = attemptOwner(principal, request);
        lockedEvent(attempt.eventId());
        var existing = attempts.findById(attempt.attemptId());
        if (existing.isPresent()) {
            if (!existing.get().belongsTo(attempt.eventId(), ownerKey)) throw conflict("Attempt ID is already in use");
            return;
        }
        try {
            attempts.saveAndFlush(new RegistrationAttempt(
                    attempt.attemptId(), attempt.eventId(), ownerKey, clock.now()));
        } catch (DataIntegrityViolationException e) {
            throw conflict("Attempt ID is already in use");
        }
    }

    public GuestApiDtos.Funnel funnel(Long eventId, LocalDate from, LocalDate to) {
        return funnel.report(eventId, from, to);
    }

    private String attemptOwner(Principal principal, HttpServletRequest request) {
        if (principal == null) return "g:" + GuestSession.credential(request, true);
        var user = users.findByEmail(normalizeEmail(principal.getName()))
                .filter(account -> account.getRole() == Role.USER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied"));
        return "u:" + user.getId();
    }

    private GuestIdentity lockedGuest(String email) {
        String normalized = normalizeEmail(email);
        return guests.findByNormalizedEmail(normalized).orElseGet(() -> {
            try {
                return guests.saveAndFlush(new GuestIdentity(normalized));
            } catch (DataIntegrityViolationException e) {
                throw conflict("Another booking is being processed; retry the same request");
            }
        });
    }

    private Event lockedEvent(Long id) {
        return events.findByIdForUpdate(id).orElseThrow(() -> missing("Event"));
    }

    private TicketType ticket(Long id, Long eventId) {
        TicketType ticket = tickets.findById(id).orElseThrow(() -> missing("Ticket type"));
        if (!ticket.getEvent().getId().equals(eventId)) throw conflict("Ticket type does not belong to this event");
        EventRules.requireTicketOnSale(ticket);
        return ticket;
    }

    private TicketType availableTicket(GuestIdentity guest, Event event, GuestApiDtos.BookingRequest booking,
            LocalDateTime now) {
        requireGuestAvailable(guest, event, now);
        TicketType ticket = ticket(booking.ticketTypeId(), event.getId());
        BookingCapacity.requireAvailable(registrations, event, ticket, booking.quantity());
        return ticket;
    }

    private void requireGuestAvailable(GuestIdentity guest, Event event, LocalDateTime now) {
        EventRules.requireBookingOpen(event, now);
        if (guest.getClaimedUserId() != null || registrations.existsByActiveGuestIdAndEventId(guest.getId(), event.getId())) {
            throw conflict("Unable to book with this contact; check your existing registration or sign in");
        }
    }

    private void requireNoPendingPayment(GuestIdentity guest, Long eventId, LocalDateTime now) {
        if (payments.existsByGuestIdAndEventIdAndStatusAndExpiresAtAfter(
                guest.getId(), eventId, MockPaymentStatus.PENDING_PAYMENT, now)) {
            throw conflict("An active pending payment already exists");
        }
    }

    private static void requireSameRequest(GuestApiDtos.BookingRequest booking, GuestIdentity guest,
            String name, Long ticketId, int quantity, java.util.UUID attemptId) {
        if (!normalizeEmail(booking.email()).equals(guest.getNormalizedEmail())
                || !booking.displayName().strip().equals(name) || !booking.ticketTypeId().equals(ticketId)
                || booking.quantity() != quantity || !Objects.equals(booking.attemptId(), attemptId)) {
            throw conflict("Idempotency key was already used for a different booking");
        }
    }

    private MockPaymentOrder ownedOrderForUpdate(Long id, HttpServletRequest request) {
        String session = requireSession(request, "Payment");
        var order = payments.findByIdForUpdate(id)
                .filter(p -> session.equals(p.getGuestSessionHash()))
                .orElseThrow(() -> missing("Payment"));
        var guest = guests.findByIdForUpdate(order.getGuest().getId()).orElseThrow(() -> missing("Payment"));
        if (guest.getClaimedUserId() != null) throw missing("Payment");
        return order;
    }

    private GuestApiDtos.Payment payment(MockPaymentOrder order) {
        MockPaymentStatus status = effectiveStatus(order, clock.now());
        GuestApiDtos.Receipt receipt = order.getRegistrationId() == null ? null
                : registrations.findById(order.getRegistrationId()).map(GuestPhase2Service::receipt).orElse(null);
        return new GuestApiDtos.Payment(order.getId(), order.getEventId(), order.getQuantity(), status.name(),
                order.getTotalAmount(), order.getExpiresAt(),
                status == MockPaymentStatus.PENDING_PAYMENT ? "EVENTHUB_DEMO_PAYMENT:" + order.getId() : null, receipt);
    }

    private static GuestApiDtos.Receipt receipt(Registration registration) {
        Event event = registration.getEvent();
        return new GuestApiDtos.Receipt(registration.getId(), event.getId(), event.getTitle(),
                registration.getGuestDisplayName(), registration.getQuantity(), registration.getStatus(),
                registration.isActive() ? registration.getTicketCode() : null,
                registration.getRegisteredAt(), registration.getCheckedInAt());
    }

    private static MockPaymentStatus effectiveStatus(MockPaymentOrder order, LocalDateTime now) {
        return order.getStatus() == MockPaymentStatus.PENDING_PAYMENT && !order.getExpiresAt().isAfter(now)
                ? MockPaymentStatus.EXPIRED : order.getStatus();
    }

    private static String requireSession(HttpServletRequest request, String resource) {
        String session = GuestSession.credential(request, false);
        if (session == null) throw missing(resource);
        return session;
    }

    private static ResponseStatusException missing(String resource) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, resource + " not found");
    }

    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    static String normalizeEmail(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }
}
