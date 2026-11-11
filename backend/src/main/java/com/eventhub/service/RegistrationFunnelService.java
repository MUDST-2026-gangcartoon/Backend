package com.eventhub.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.eventhub.dto.GuestApiDtos;
import com.eventhub.model.Registration;
import com.eventhub.model.RegistrationAttempt;
import com.eventhub.repository.EventRepository;
import com.eventhub.repository.RegistrationAttemptRepository;
import com.eventhub.repository.RegistrationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
class RegistrationFunnelService {
    static final int MATURITY_MINUTES = 30;

    private final RegistrationAttemptRepository attempts;
    private final RegistrationRepository registrations;
    private final EventRepository events;
    private final GuestPhase2Clock clock;

    RegistrationFunnelService(RegistrationAttemptRepository attempts, RegistrationRepository registrations,
            EventRepository events, GuestPhase2Clock clock) {
        this.attempts = attempts;
        this.registrations = registrations;
        this.events = events;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public GuestApiDtos.Funnel report(Long eventId, LocalDate from, LocalDate to) {
        if (to.isAfter(from.plusYears(1))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The reporting range cannot exceed one year");
        }
        if (eventId != null && !events.existsById(eventId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found");
        }
        var now = clock.now();
        var start = from.atStartOfDay();
        var end = to.atStartOfDay();
        var total = new Counts();
        var guest = new Counts();
        var member = new Counts();
        for (var attempt : attempts.findFunnelCohort(eventId, start, end)) {
            total.add(attempt, now);
            (attempt.isGuest() ? guest : member).add(attempt, now);
        }
        for (var registration : registrations.findFunnelCohort(eventId, start, end)) {
            total.add(registration);
            (registration.isGuest() ? guest : member).add(registration);
        }
        return new GuestApiDtos.Funnel(eventId, from, to, MATURITY_MINUTES,
                total.dto(), guest.dto(), member.dto());
    }

    private static final class Counts {
        private long started;
        private long completed;
        private long matured;
        private long pending;
        private long dropped;
        private long orders;
        private long seats;
        private long activeSeats;
        private long checkedInSeats;
        private long cancelledOrders;
        private long cancelledSeats;

        void add(RegistrationAttempt attempt, LocalDateTime now) {
            started++;
            var confirmation = attempt.getConfirmedAt();
            var deadline = attempt.getStartedAt().plusMinutes(MATURITY_MINUTES);
            if (confirmation != null) completed++;
            if (!now.isBefore(deadline)) {
                matured++;
                if (confirmation == null || !confirmation.isBefore(deadline)) dropped++;
            } else if (confirmation == null) {
                pending++;
            }
        }

        void add(Registration registration) {
            orders++;
            seats += registration.getQuantity();
            if (registration.isActive()) {
                activeSeats += registration.getQuantity();
                if (registration.getCheckedInAt() != null) checkedInSeats += registration.getQuantity();
            } else {
                cancelledOrders++;
                cancelledSeats += registration.getQuantity();
            }
        }

        GuestApiDtos.FunnelCounts dto() {
            return new GuestApiDtos.FunnelCounts(started, completed, matured, pending, dropped, rate(dropped, matured),
                    orders, seats, activeSeats, checkedInSeats, rate(checkedInSeats, activeSeats),
                    cancelledOrders, cancelledSeats);
        }

        private static BigDecimal rate(long numerator, long denominator) {
            return denominator == 0 ? null : BigDecimal.valueOf(numerator).movePointRight(2)
                    .divide(BigDecimal.valueOf(denominator), 2, RoundingMode.HALF_UP);
        }
    }
}
