package com.eventhub.repository;

import java.util.Optional;

import com.eventhub.model.GuestIdentity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GuestIdentityRepository extends JpaRepository<GuestIdentity, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select g from GuestIdentity g where g.id=:id")
    Optional<GuestIdentity> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<GuestIdentity> findByNormalizedEmail(String normalizedEmail);
}
