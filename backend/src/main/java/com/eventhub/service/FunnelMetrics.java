package com.eventhub.service;

import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicLong;

import io.micrometer.core.instrument.MeterRegistry;
import jakarta.persistence.EntityManager;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Global, all-time funnel cohorts, refreshed independently of scrape requests. */
@Component
@Profile("metrics")
class FunnelMetrics {
    private final EntityManager entityManager;
    private final GuestPhase2Clock clock;
    private final AtomicLong orders = new AtomicLong();
    private final AtomicLong matured = new AtomicLong();
    private final AtomicLong dropped = new AtomicLong();
    private final AtomicLong activeSeats = new AtomicLong();
    private final AtomicLong checkedInSeats = new AtomicLong();

    FunnelMetrics(EntityManager entityManager, GuestPhase2Clock clock, MeterRegistry registry) {
        this.entityManager = entityManager;
        this.clock = clock;
        registry.gauge("eventhub.registration.orders", orders);
        registry.gauge("eventhub.registration.attempts.matured", matured);
        registry.gauge("eventhub.registration.attempts.dropped", dropped);
        registry.gauge("eventhub.registration.seats.active", activeSeats);
        registry.gauge("eventhub.registration.seats.checked_in", checkedInSeats);
    }

    @Scheduled(fixedDelayString = "${app.metrics.refresh-ms:30000}")
    @Transactional(readOnly = true)
    public void refresh() {
        LocalDateTime cutoff = clock.now().minusMinutes(RegistrationFunnelService.MATURITY_MINUTES);
        Object[] attemptCounts = entityManager.createQuery("""
                select count(a), sum(case when a.confirmedAt is null or a.confirmedAt >= a.startedAt + %d minute then 1 else 0 end)
                from RegistrationAttempt a where a.startedAt <= :cutoff
                """.formatted(RegistrationFunnelService.MATURITY_MINUTES), Object[].class).setParameter("cutoff", cutoff).getSingleResult();
        Object[] registrationCounts = entityManager.createQuery("""
                select count(r),
                  sum(case when r.status is null or r.status = 'CONFIRMED' then coalesce(r.quantity, 1) else 0 end),
                  sum(case when (r.status is null or r.status = 'CONFIRMED') and r.checkedInAt is not null then coalesce(r.quantity, 1) else 0 end)
                from Registration r
                """, Object[].class).getSingleResult();
        matured.set(value(attemptCounts[0]));
        dropped.set(value(attemptCounts[1]));
        orders.set(value(registrationCounts[0]));
        activeSeats.set(value(registrationCounts[1]));
        checkedInSeats.set(value(registrationCounts[2]));
    }

    private static long value(Object result) { return result == null ? 0 : ((Number) result).longValue(); }

    @Configuration
    @Profile("metrics")
    @EnableScheduling
    static class SchedulingConfiguration { }
}
