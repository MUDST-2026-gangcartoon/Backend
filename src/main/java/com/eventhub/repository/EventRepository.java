package com.eventhub.repository;

import com.eventhub.dto.EventListRow;
import com.eventhub.model.Event;
import com.eventhub.model.Registration;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface EventRepository
        extends JpaRepository<Event, Long> {

    @Query(
            value = """
                    select new com.eventhub.dto.EventListRow(
                        e.id,
                        e.title,
                        e.description,
                        e.location,
                        e.startsAt,
                        e.capacity,
                        e.category,
                        e.imageUrl,
                        e.detailImageUrl,
                        coalesce(sum(coalesce(r.quantity, 1)), 0),
                        case when count(vr.id) > 0 then true else false end
                    )
                    from Event e
                    left join Registration r
                        on r.event = e
                    left join Registration vr
                        on vr.event = e
                        and vr.user.id = :userId
                    where (
                        :search is null
                        or :search = ''
                        or lower(e.title) like concat('%', lower(:search), '%')
                        or lower(e.description) like concat('%', lower(:search), '%')
                        or lower(e.location) like concat('%', lower(:search), '%')
                    )
                    and (
                        :category = 'ALL'
                        or upper(e.category) = upper(:category)
                    )
                    group by
                        e.id,
                        e.title,
                        e.description,
                        e.location,
                        e.startsAt,
                        e.capacity,
                        e.category,
                        e.imageUrl,
                        e.detailImageUrl
                    having (
                        :status = 'ALL'
                        or (
                            :status = 'OPEN'
                            and e.startsAt > :now
                            and coalesce(sum(coalesce(r.quantity, 1)), 0) < e.capacity
                        )
                        or (
                            :status = 'FULL'
                            and e.startsAt > :now
                            and coalesce(sum(coalesce(r.quantity, 1)), 0) >= e.capacity
                        )
                        or (
                            :status = 'ENDED'
                            and e.startsAt <= :now
                        )
                        or (
                            :status = 'REGISTERED'
                            and count(vr.id) > 0
                        )
                    )
                    order by e.startsAt asc, e.id asc
                    """,
            countQuery = """
                    select count(e.id)
                    from Event e
                    where (
                        :search is null
                        or :search = ''
                        or lower(e.title) like concat('%', lower(:search), '%')
                        or lower(e.description) like concat('%', lower(:search), '%')
                        or lower(e.location) like concat('%', lower(:search), '%')
                    )
                    and (
                        :category = 'ALL'
                        or upper(e.category) = upper(:category)
                    )
                    and (
                        :status = 'ALL'
                        or (
                            :status = 'OPEN'
                            and e.startsAt > :now
                            and coalesce(
                                (
                                    select sum(coalesce(r2.quantity, 1))
                                    from Registration r2
                                    where r2.event = e
                                ),
                                0
                            ) < e.capacity
                        )
                        or (
                            :status = 'FULL'
                            and e.startsAt > :now
                            and coalesce(
                                (
                                    select sum(coalesce(r2.quantity, 1))
                                    from Registration r2
                                    where r2.event = e
                                ),
                                0
                            ) >= e.capacity
                        )
                        or (
                            :status = 'ENDED'
                            and e.startsAt <= :now
                        )
                        or (
                            :status = 'REGISTERED'
                            and exists (
                                select 1
                                from Registration rr
                                where rr.event = e
                                and rr.user.id = :userId
                            )
                        )
                    )
                    """
    )
    Page<EventListRow> search(
            @Param("userId") Long userId,
            @Param("search") String search,
            @Param("category") String category,
            @Param("status") String status,
            @Param("now") LocalDateTime now,
            Pageable pageable
    );

    @Query("""
            select count(e)
            from Event e
            where e.startsAt > :now
            and coalesce(
                (
                    select sum(coalesce(r.quantity, 1))
                    from Registration r
                    where r.event = e
                ),
                0
            ) < e.capacity
            """)
    long countOpen(@Param("now") LocalDateTime now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select e
            from Event e
            where e.id = :id
            """)
    Optional<Event> findByIdForUpdate(@Param("id") Long id);
}