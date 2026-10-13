package com.eventhub.integration.repository;

import com.eventhub.dto.EventListRow;
import com.eventhub.model.Event;
import com.eventhub.model.TicketType;
import com.eventhub.model.UserAccount;
import com.eventhub.repository.EventRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(
        replace = AutoConfigureTestDatabase.Replace.NONE
)
class EventRepositoryIntegrationTests {

    private static final LocalDateTime NOW =
            LocalDateTime.of(
                    2028, 6, 1, 12, 0
            );

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private EventRepository eventRepository;

    private Long openTechId;
    private Long fullTechId;
    private Long endedDesignId;
    private Long openCommunityId;

    private Long aliceId;

    @BeforeEach
    void setUp() {

        RepositoryTestData data =
                new RepositoryTestData(entityManager);

        // -------------------------------------------
        // Event 1: ยังไม่เริ่มและยังไม่เต็ม
        // -------------------------------------------

        Event openTech = data.event(
                "Java Workshop",
                "Hands-on Spring Boot",
                "Bangkok",
                NOW.plusDays(1),
                10,
                "TECH"
        );

        // -------------------------------------------
        // Event 2: ยังไม่เริ่มแต่เต็มแล้ว
        // -------------------------------------------

        Event fullTech = data.event(
                "Cloud Lab",
                "Infrastructure workshop",
                "Harbor City",
                NOW.plusDays(2),
                3,
                "TECH"
        );

        // -------------------------------------------
        // Event 3: เริ่มไปแล้ว
        // -------------------------------------------

        Event endedDesign = data.event(
                "Design Retrospective",
                "Past creativity workshop",
                "Chiang Mai",
                NOW.minusDays(1),
                10,
                "DESIGN"
        );

        // -------------------------------------------
        // Event 4: ยังไม่เริ่มและไม่มีคนลงทะเบียน
        // -------------------------------------------

        Event openCommunity = data.event(
                "Community Meetup",
                "Volunteer gathering",
                "Khon Kaen",
                NOW.plusDays(3),
                8,
                "COMMUNITY"
        );

        // TicketTypes

        TicketType openTicket =
                data.ticket(
                        openTech,
                        "General",
                        10
                );

        TicketType fullTicket =
                data.ticket(
                        fullTech,
                        "General",
                        3
                );

        // Users

        UserAccount alice = data.user(
                "Alice",
                "alice-repo@example.test"
        );

        UserAccount bob = data.user(
                "Bob",
                "bob-repo@example.test"
        );

        UserAccount charlie = data.user(
                "Charlie",
                "charlie-repo@example.test"
        );

        // -------------------------------------------
        // Registrations
        // -------------------------------------------

        // Open Event:
        // 2 registration records
        // แต่ขายจริง 2 + 3 = 5 seats

        data.registration(
                alice,
                openTech,
                openTicket,
                2
        );

        data.registration(
                bob,
                openTech,
                openTicket,
                3
        );

        // Full Event:
        // 1 registration record
        // แต่ขายจริง 3 seats

        data.registration(
                charlie,
                fullTech,
                fullTicket,
                3
        );

        // เก็บ IDs ก่อน clear

        openTechId = openTech.getId();
        fullTechId = fullTech.getId();
        endedDesignId = endedDesign.getId();
        openCommunityId = openCommunity.getId();

        aliceId = alice.getId();

        // ส่งข้อมูลลง DB และ clear managed entities

        data.flushAndClear();
    }

    private Page<EventListRow> search(
            Long userId,
            String search,
            String category,
            String status,
            Pageable pageable
    ) {
        return eventRepository.search(
                userId,
                search,
                category,
                status,
                NOW,
                pageable
        );
    }

    // ============================================================
    // INT-REPO-001 — Search
    // ============================================================

    @Test
    void shouldSearchEventTitleDescriptionAndLocation()
    {
        Pageable pageable =
                PageRequest.of(0, 20);

        // Search title
        Page<EventListRow> titleResults =
                search(
                        null,
                        "java",
                        "ALL",
                        "ALL",
                        pageable
                );

        assertEquals(
                1,
                titleResults.getTotalElements()
        );

        assertEquals(
                openTechId,
                titleResults.getContent().get(0).id()
        );

        // Search description
        Page<EventListRow> descriptionResults =
                search(
                        null,
                        "spring boot",
                        "ALL",
                        "ALL",
                        pageable
                );

        assertEquals(
                1,
                descriptionResults.getTotalElements()
        );

        assertEquals(
                openTechId,
                descriptionResults.getContent().get(0).id()
        );

        // Search location
        Page<EventListRow> locationResults =
                search(
                        null,
                        "harbor",
                        "ALL",
                        "ALL",
                        pageable
                );

        assertEquals(
                1,
                locationResults.getTotalElements()
        );

        assertEquals(
                fullTechId,
                locationResults.getContent().get(0).id()
        );
    }

    // ============================================================
    // INT-REPO-001 — Category
    // ============================================================

    @Test
    void shouldFilterEventsByCategory()
    {
        Pageable pageable =
                PageRequest.of(0, 20);

        // ALL = ไม่กรองหมวดหมู่
        Page<EventListRow> all =
                search(
                        null,
                        null,
                        "ALL",
                        "ALL",
                        pageable
                );

        assertEquals(
                4,
                all.getTotalElements()
        );

        // TECH มี 2 Events
        Page<EventListRow> tech =
                search(
                        null,
                        null,
                        "TECH",
                        "ALL",
                        pageable
                );

        assertEquals(
                2,
                tech.getTotalElements()
        );

        assertEquals(
                List.of(openTechId, fullTechId),
                tech.getContent().stream()
                        .map(EventListRow::id)
                        .toList()
        );

        // DESIGN มี 1 Event
        Page<EventListRow> design =
                search(
                        null,
                        null,
                        "DESIGN",
                        "ALL",
                        pageable
                );

        assertEquals(
                1,
                design.getTotalElements()
        );

        assertEquals(
                endedDesignId,
                design.getContent().get(0).id()
        );

        // COMMUNITY มี 1 Event
        Page<EventListRow> community =
                search(
                        null,
                        null,
                        "COMMUNITY",
                        "ALL",
                        pageable
                );

        assertEquals(
                1,
                community.getTotalElements()
        );

        assertEquals(
                openCommunityId,
                community.getContent().get(0).id()
        );
    }

    // ============================================================
    // INT-REPO-001 — Status
    // ============================================================

    @Test
    void shouldFilterOpenFullEndedAndRegisteredEvents()
    {
        Pageable pageable =
                PageRequest.of(0, 20);

        Page<EventListRow> open =
                search(
                        null,
                        null,
                        "ALL",
                        "OPEN",
                        pageable
                );

        assertEquals(
                2,
                open.getTotalElements()
        );

        assertEquals(
                List.of(openTechId, openCommunityId),
                open.getContent().stream()
                        .map(EventListRow::id)
                        .toList()
        );

        Page<EventListRow> full =
                search(
                        null,
                        null,
                        "ALL",
                        "FULL",
                        pageable
                );

        assertEquals(
                1,
                full.getTotalElements()
        );

        assertEquals(
                fullTechId,
                full.getContent().get(0).id()
        );

        Page<EventListRow> ended =
                search(
                        null,
                        null,
                        "ALL",
                        "ENDED",
                        pageable
                );

        assertEquals(
                1,
                ended.getTotalElements()
        );

        assertEquals(
                endedDesignId,
                ended.getContent().get(0).id()
        );

        // Alice ลงทะเบียนเฉพาะ Open Tech
        Page<EventListRow> registered =
                search(
                        aliceId,
                        null,
                        "ALL",
                        "REGISTERED",
                        pageable
                );

        assertEquals(
                1,
                registered.getTotalElements()
        );

        assertEquals(
                openTechId,
                registered.getContent().get(0).id()
        );

        assertTrue(
                registered.getContent().get(0).registered()
        );

        // Anonymous ไม่มีรายการ REGISTERED
        Page<EventListRow> anonymousRegistered =
                search(
                        null,
                        null,
                        "ALL",
                        "REGISTERED",
                        pageable
                );

        assertTrue(
                anonymousRegistered.isEmpty()
        );

        assertEquals(
                0,
                anonymousRegistered.getTotalElements()
        );
    }

    // ============================================================
    // INT-REPO-001 — registeredCount
    // ============================================================

    @Test
    void shouldSumQuantityInsteadOfCountingRegistrationRows()
    {
        Page<EventListRow> page =
                search(
                        aliceId,
                        null,
                        "ALL",
                        "ALL",
                        PageRequest.of(0, 20)
                );

        assertEquals(
                4,
                page.getTotalElements()
        );

        Map<Long, EventListRow> rows =
                page.getContent()
                        .stream()
                        .collect(
                                Collectors.toMap(
                                        EventListRow::id,
                                        Function.identity()
                                )
                        );

        EventListRow open =
                rows.get(openTechId);

        EventListRow full =
                rows.get(fullTechId);

        EventListRow ended =
                rows.get(endedDesignId);

        EventListRow community =
                rows.get(openCommunityId);

        assertNotNull(open);
        assertNotNull(full);
        assertNotNull(ended);
        assertNotNull(community);

        // Alice = 2 seats, Bob = 3 seats
        // 2 Registration records แต่ 5 seats

        assertEquals(
                5L,
                open.registeredCount()
        );

        // Alice ลงทะเบียน Event นี้
        assertTrue(
                open.registered()
        );

        // Full Event มี Registration 1 row
        // แต่ quantity = 3

        assertEquals(
                3L,
                full.registeredCount()
        );

        assertFalse(
                full.registered()
        );

        // ไม่มี Registration
        assertEquals(
                0L,
                ended.registeredCount()
        );

        assertEquals(
                0L,
                community.registeredCount()
        );

        assertFalse(ended.registered());
        assertFalse(community.registered());
    }

    // ============================================================
    // INT-REPO-001 — Pagination
    // ============================================================

    @Test
    void shouldReturnCorrectPaginationMetadataAndOrder()
    {
        Page<EventListRow> page =
                search(
                        null,
                        null,
                        "ALL",
                        "ALL",
                        PageRequest.of(1, 2)
                );

        assertEquals(
                1,
                page.getNumber()
        );

        assertEquals(
                2,
                page.getSize()
        );

        assertEquals(
                4L,
                page.getTotalElements()
        );

        assertEquals(
                2,
                page.getTotalPages()
        );

        assertFalse(
                page.hasNext()
        );

        assertTrue(
                page.hasPrevious()
        );

        assertEquals(
                2,
                page.getContent().size()
        );

        // Repository order:
        // startsAt ASC, id ASC
        //
        // หน้าแรก: Ended Design, Open Tech
        // หน้าที่ 2: Full Tech, Open Community

        assertEquals(
                List.of(
                        fullTechId,
                        openCommunityId
                ),
                page.getContent().stream()
                        .map(EventListRow::id)
                        .toList()
        );
    }

    // ============================================================
    // INT-REPO-002 — countOpen
    // ============================================================

    @Test
    void shouldCountOnlyFutureEventsThatAreNotFull()
    {
        long openCount =
                eventRepository.countOpen(NOW);

        // Open Tech: 5 / 10
        // Open Community: 0 / 8
        //
        // Full Tech: 3 / 3 (ไม่นับ)
        // Ended Design: เริ่มไปแล้ว (ไม่นับ)

        assertEquals(
                2L,
                openCount
        );

        // Event ที่ startsAt = NOW
        // ถือว่าเริ่มแล้ว จึงไม่ควรถูกนับ

        RepositoryTestData data =
                new RepositoryTestData(entityManager);

        data.event(
                "Starts Exactly Now",
                "Boundary test",
                "Bangkok",
                NOW,
                10,
                "TECH"
        );

        data.flushAndClear();

        assertEquals(
                2L,
                eventRepository.countOpen(NOW)
        );
    }
}