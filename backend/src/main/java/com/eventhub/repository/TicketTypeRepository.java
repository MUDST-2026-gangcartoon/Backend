package com.eventhub.repository;

import com.eventhub.dto.TicketTypeRow;
import com.eventhub.model.TicketType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface TicketTypeRepository
        extends JpaRepository<TicketType, Long> {

    boolean existsByEventId(Long eventId);

    List<TicketType> findByEventIdOrderByIdAsc(Long eventId);

    @Query("""
            select new com.eventhub.dto.TicketTypeRow(
                t.event.id,
                t.id,
                t.name,
                t.description,
                t.price,
                t.capacity,
                coalesce(
                    sum(
                        case
                            when r.id is null then 0
                            else coalesce(r.quantity, 1)
                        end
                    ),
                    0
                )
            )
            from TicketType t
            left join Registration r
                on r.ticketType = t
            where t.event.id in :eventIds
            group by
                t.event.id,
                t.id,
                t.name,
                t.description,
                t.price,
                t.capacity
            order by t.event.id asc, t.id asc
            """)
    List<TicketTypeRow> summariesForEventIds(
            @Param("eventIds") Collection<Long> eventIds
    );
}