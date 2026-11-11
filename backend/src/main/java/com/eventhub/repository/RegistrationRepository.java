package com.eventhub.repository;

import com.eventhub.model.Registration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RegistrationRepository
        extends JpaRepository<Registration, Long> {

    long countByEventId(Long eventId);

    @Query("select count(r)>0 from Registration r where (r.user.id=:userId or r.guest.id in (select g.id from GuestIdentity g where g.claimedUserId=:userId)) and r.event.id=:eventId and (r.status is null or r.status='CONFIRMED')")
    boolean existsByUserIdAndEventId(
            Long userId,
            Long eventId
    );

    @Query("""
            select r from Registration r
            where r.user.id=:userId or r.guest.id in (select g.id from GuestIdentity g where g.claimedUserId=:userId)
            order by r.event.startsAt asc, r.id asc
            """)
    List<Registration> findByUserIdOrderByEventStartsAtAsc(@Param("userId") Long userId);

    @Query("""
            select r from Registration r join fetch r.event join r.guest g
            where r.guestSessionHash = :sessionHash and g.claimedUserId is null
            order by r.registeredAt desc, r.id desc
            """)
    List<Registration> findGuestReceipts(@Param("sessionHash") String sessionHash);

    Optional<Registration> findByGuestSessionHashAndEventIdAndGuestRequestKey(
            String sessionHash, Long eventId, String requestKey);

    boolean existsByActiveGuestIdAndEventId(Long guestId, Long eventId);

    long countByGuestId(Long guestId);

    @Query("select distinct r.event.id from Registration r where r.guest.id=:guestId order by r.event.id")
    List<Long> findEventIdsByGuestId(@Param("guestId") Long guestId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Registration r where r.id=:id")
    Optional<Registration> findByIdForUpdate(@Param("id") Long id);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select r from Registration r where r.event.id=:eventId and r.status='CONFIRMED'
                and r.guest.id in (select g.id from GuestIdentity g where g.claimedUserId=:userId)
            order by r.id
            """)
    List<Registration> activeClaimedForUpdate(@Param("userId") Long userId, @Param("eventId") Long eventId);

    @Query("""
            select r from Registration r where r.registeredAt>=:from and r.registeredAt<:to
                and (:eventId is null or r.event.id=:eventId)
            """)
    List<Registration> findFunnelCohort(@Param("eventId") Long eventId,
            @Param("from") java.time.LocalDateTime from, @Param("to") java.time.LocalDateTime to);

    List<Registration>
    findByEventIdOrderByRegisteredAtAsc(Long eventId);

    long deleteByUserIdAndEventId(
            Long userId,
            Long eventId
    );

    void deleteByEventId(Long eventId);

    @Query("""
            select coalesce(sum(coalesce(r.quantity, 1)), 0)
            from Registration r
            where r.event.id = :eventId and (r.status is null or r.status='CONFIRMED')
            """)
    long seatsReservedByEventId(
            @Param("eventId") Long eventId
    );

    @Query("""
            select coalesce(sum(coalesce(r.quantity, 1)), 0)
            from Registration r
            where r.ticketType.id = :ticketTypeId and (r.status is null or r.status='CONFIRMED')
            """)
    long seatsReservedByTicketTypeId(
            @Param("ticketTypeId") Long ticketTypeId
    );

    Optional<Registration> findByTicketCode(String ticketCode);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Registration r where r.ticketCode=:ticketCode")
    Optional<Registration> findForCheckin(@Param("ticketCode") String ticketCode);
    boolean existsByTicketTypeId(Long ticketTypeId);

    List<Registration>
    findTop8ByEventIdAndCheckedInAtIsNotNullOrderByCheckedInAtDesc(
            Long eventId
    );
    boolean existsByEventId(Long eventId);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Registration r where r.user.id=:userId and r.event.id=:eventId and (r.status is null or r.status='CONFIRMED')")
    Optional<Registration> activeForUpdate(@Param("userId") Long userId,@Param("eventId") Long eventId);

    // Legacy lookup retained for the existing EventService during RED.
    Optional<Registration> findByUserIdAndEventId(Long userId, Long eventId);
}