package com.eventhub.repository;

import com.eventhub.model.PageView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PageViewRepository
        extends JpaRepository<PageView, Long> {

    long countByType(String type);

    long countByTypeAndEventId(
            String type,
            Long eventId
    );

    @Query("""
            select count(distinct p.sessionId)
            from PageView p
            where p.type = :type
            """)
    long uniqueSessions(
            @Param("type") String type
    );
}