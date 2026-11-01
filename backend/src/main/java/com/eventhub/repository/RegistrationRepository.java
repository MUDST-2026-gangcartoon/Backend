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

    @Query("select count(r)>0 from Registration r where r.user.id=:userId and r.event.id=:eventId and (r.status is null or r.status='CONFIRMED')")
    boolean existsByUserIdAndEventId(
            Long userId,
            Long eventId
    );

    List<Registration>
    findByUserIdOrderByEventStartsAtAsc(Long userId);

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