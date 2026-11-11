package com.eventhub.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.UUID;

import com.eventhub.model.RegistrationAttempt;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles({"test", "metrics"})
@Transactional
class FunnelMetricsTests {
    @Autowired EntityManager entityManager;
    @Autowired FunnelMetrics metrics;
    @Autowired MeterRegistry registry;

    @Test
    void maturedAttemptsCountLateConfirmationsAsDroppedButNotPendingAttempts() {
        LocalDateTime now = LocalDateTime.now();
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
