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
            where r.event.id = :eventId
            """)
    long seatsReservedByEventId(
            @Param("eventId") Long eventId
    );

    @Query("""
            select coalesce(sum(coalesce(r.quantity, 1)), 0)
            from Registration r
            where r.ticketType.id = :ticketTypeId
            """)
    long seatsReservedByTicketTypeId(
            @Param("ticketTypeId") Long ticketTypeId
    );

    Optional<Registration> findByTicketCode(String ticketCode);

    List<Registration>
    findTop8ByEventIdAndCheckedInAtIsNotNullOrderByCheckedInAtDesc(
            Long eventId
    );
}