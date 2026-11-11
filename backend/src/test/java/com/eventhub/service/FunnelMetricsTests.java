package com.eventhub.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.UUID;

import com.eventhub.model.RegistrationAttempt;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class FunnelMetricsTests {
    @Autowired EntityManager entityManager;

    @Test
    void maturedAttemptsCountLateConfirmationsAsDroppedButNotPendingAttempts() {
        LocalDateTime now = LocalDateTime.of(2026, 11, 11, 12, 0);
        var clock = mock(GuestPhase2Clock.class);
        when(clock.now()).thenReturn(now);
        var registry = new SimpleMeterRegistry();
        var metrics = new FunnelMetrics(entityManager, clock, registry);
        var timely = new RegistrationAttempt(UUID.randomUUID(), 1L, "g:timely", now.minusMinutes(60));
        timely.confirm(1L, now.minusMinutes(40));
        var late = new RegistrationAttempt(UUID.randomUUID(), 1L, "g:late", now.minusMinutes(60));
        late.confirm(2L, now.minusMinutes(30));
        var abandoned = new RegistrationAttempt(UUID.randomUUID(), 1L, "g:abandoned", now.minusMinutes(45));
        var pending = new RegistrationAttempt(UUID.randomUUID(), 1L, "g:pending", now.minusMinutes(5));
        entityManager.persist(timely);
        entityManager.persist(late);
        entityManager.persist(abandoned);
        entityManager.persist(pending);
        entityManager.flush();

        metrics.refresh();
        assertThat(registry.get("eventhub.registration.attempts.matured").gauge().value()).isEqualTo(3);
        assertThat(registry.get("eventhub.registration.attempts.dropped").gauge().value()).isEqualTo(2);
    }
}
