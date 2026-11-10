
package com.eventhub.repository;

import com.eventhub.model.MockPaymentOrder;
import com.eventhub.model.MockPaymentStatus;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
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
    boolean existsByEventId(Long eventId);
    boolean existsByTicketTypeId(Long ticketTypeId);
    boolean existsByUserIdAndEventIdAndStatusAndExpiresAtAfter(Long userId,Long eventId,MockPaymentStatus status,java.time.LocalDateTime expiresAt);
    Optional<MockPaymentOrder> findFirstByRegistrationIdAndStatus(Long registrationId,MockPaymentStatus status);
    @Query("""
            select p from MockPaymentOrder p where p.user.id=:userId
                or (p.status=com.eventhub.model.MockPaymentStatus.CONFIRMED
                    and p.guest.id in (select g.id from GuestIdentity g where g.claimedUserId=:userId))
            order by p.createdAt desc, p.id desc
            """)
    List<MockPaymentOrder> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId);

    Optional<MockPaymentOrder> findByGuestSessionHashAndEventIdAndGuestRequestKey(
            String sessionHash, Long eventId, String requestKey);

    boolean existsByGuestIdAndEventIdAndStatusAndExpiresAtAfter(
            Long guestId, Long eventId, MockPaymentStatus status, LocalDateTime expiresAt);

    // Legacy payment history contract remains available during RED.
    List<MockPaymentOrder> findByUser_IdOrderByCreatedAtDesc(Long userId);
}
