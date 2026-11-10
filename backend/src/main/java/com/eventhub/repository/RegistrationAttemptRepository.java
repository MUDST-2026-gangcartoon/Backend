package com.eventhub.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.eventhub.model.RegistrationAttempt;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RegistrationAttemptRepository extends JpaRepository<RegistrationAttempt, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from RegistrationAttempt a where a.id=:id")
    Optional<RegistrationAttempt> findByIdForUpdate(@Param("id") UUID id);

    @Query("""
            select a from RegistrationAttempt a where a.startedAt>=:from and a.startedAt<:to
                and (:eventId is null or a.eventId=:eventId)
            """)
    List<RegistrationAttempt> findFunnelCohort(@Param("eventId") Long eventId,
            @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
