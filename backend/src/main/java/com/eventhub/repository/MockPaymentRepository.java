
package com.eventhub.repository;

import com.eventhub.model.MockPaymentOrder;
import com.eventhub.model.MockPaymentStatus;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MockPaymentRepository
        extends JpaRepository<MockPaymentOrder, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select p
            from MockPaymentOrder p
            where p.id = :id
            """)
    Optional<MockPaymentOrder> findByIdForUpdate(
            @Param("id") Long id
    );

    List<MockPaymentOrder> findByUserIdAndEventIdAndStatus(
            Long userId,
            Long eventId,
            MockPaymentStatus status
    );

    List<MockPaymentOrder> findByUser_IdOrderByCreatedAtDesc(
        Long userId
);
}
