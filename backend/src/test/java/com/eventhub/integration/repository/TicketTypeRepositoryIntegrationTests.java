package com.eventhub.integration.repository;

import com.eventhub.dto.TicketTypeRow;
import com.eventhub.model.Event;
import com.eventhub.model.TicketType;
import com.eventhub.model.UserAccount;
import com.eventhub.repository.TicketTypeRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
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
class TicketTypeRepositoryIntegrationTests {

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private TicketTypeRepository ticketTypeRepository;

    private Long eventAId;
    private Long eventBId;

    private Long generalId;
    private Long vipId;
    private Long unusedId;
    private Long eventBTicketId;

    @BeforeEach
    void setUp() {

        RepositoryTestData data =
                new RepositoryTestData(entityManager);

        // ===========================================
        // Event A
        // ===========================================

        Event eventA = data.event(
                "Event A",
                "Ticket summary test",
                "Bangkok",
                LocalDateTime.of(2028, 6, 10, 10, 0),
                20,
                "TECH"
        );

        TicketType general = data.ticket(
                eventA,
                "General",
                10
        );

        TicketType vip = data.ticket(
                eventA,
                "VIP",
                5
        );

        TicketType unused = data.ticket(
                eventA,
                "Unused",
                5
        );

        // ===========================================
        // Event B
        // ===========================================

        Event eventB = data.event(
                "Event B",
                "Another event",
                "Chiang Mai",
                LocalDateTime.of(2028, 6, 20, 10, 0),
                10,
                "DESIGN"
        );

        TicketType eventBTicket = data.ticket(
                eventB,
                "Standard",
                10
        );

        // ===========================================
        // Users
        // ===========================================

        UserAccount alice = data.user(
                "Alice",
                "ticket-alice@example.test"
        );

        UserAccount bob = data.user(
                "Bob",
                "ticket-bob@example.test"
        );

        UserAccount charlie = data.user(
                "Charlie",
                "ticket-charlie@example.test"
        );

        UserAccount david = data.user(
                "David",
                "ticket-david@example.test"
        );

        // ===========================================
        // Registrations
        // ===========================================

        // Event A / General
        // 2 records, total quantity = 5

        data.registration(
                alice,
                eventA,
                general,
                2
        );

        data.registration(
                bob,
                eventA,
                general,
                3
        );

        // Event A / VIP
        // 1 record, total quantity = 4

        data.registration(
                charlie,
                eventA,
                vip,
                4
        );

        // Event A / Unused
        // 0 records

        // Event B / Standard
        // 1 record, total quantity = 6

        data.registration(
                david,
                eventB,
                eventBTicket,
                6
        );

        eventAId = eventA.getId();
        eventBId = eventB.getId();

        generalId = general.getId();
        vipId = vip.getId();
        unusedId = unused.getId();

        eventBTicketId = eventBTicket.getId();

        data.flushAndClear();
    }

    // ============================================================
    // INT-REPO-003 — Grouped ticket summaries
    // ============================================================

    @Test
    void shouldGroupTicketSummariesByEventAndTicketType()
    {
        List<TicketTypeRow> rows =
                ticketTypeRepository.summariesForEventIds(
                        List.of(
                                eventAId,
                                eventBId
                        )
                );

        // Event A มี 3 Ticket Types
        // Event B มี 1 Ticket Type

        assertEquals(
                4,
                rows.size()
        );

        Map<Long, TicketTypeRow> byTicketId =
                rows.stream()
                        .collect(
                                Collectors.toMap(
                                        TicketTypeRow::id,
                                        Function.identity()
                                )
                        );

        // -------------------------------------------
        // Event A / General
        // -------------------------------------------

        TicketTypeRow general =
                byTicketId.get(generalId);

        assertNotNull(general);

        assertEquals(
                eventAId,
                general.eventId()
        );

        assertEquals(
                "General",
                general.name()
        );

        assertEquals(
                10,
                general.capacity()
        );

        // Alice quantity 2 + Bob quantity 3
        assertEquals(
                5L,
                general.sold()
        );

        // -------------------------------------------
        // Event A / VIP
        // -------------------------------------------

        TicketTypeRow vip =
                byTicketId.get(vipId);

        assertNotNull(vip);

        assertEquals(
                eventAId,
                vip.eventId()
        );

        assertEquals(
                "VIP",
                vip.name()
        );

        assertEquals(
                5,
                vip.capacity()
        );

        assertEquals(
                4L,
                vip.sold()
        );

        // -------------------------------------------
        // Event A / Unused
        // -------------------------------------------

        TicketTypeRow unused =
                byTicketId.get(unusedId);

        assertNotNull(unused);

        assertEquals(
                eventAId,
                unused.eventId()
        );

        assertEquals(
                "Unused",
                unused.name()
        );

        // Ticket ที่ยังไม่มีคนซื้อ ต้อง sold = 0
        assertEquals(
                0L,
                unused.sold()
        );

        // -------------------------------------------
        // Event B / Standard
        // -------------------------------------------

        TicketTypeRow standard =
                byTicketId.get(eventBTicketId);

        assertNotNull(standard);

        assertEquals(
                eventBId,
                standard.eventId()
        );

        assertEquals(
                "Standard",
                standard.name()
        );

        assertEquals(
                6L,
                standard.sold()
        );
    }

    // ============================================================
    // INT-REPO-003 — Filter by Event IDs
    // ============================================================

    @Test
    void shouldReturnTicketSummariesOnlyForRequestedEvents()
    {
        List<TicketTypeRow> rows =
                ticketTypeRepository.summariesForEventIds(
                        List.of(eventAId)
                );

        assertEquals(
                3,
                rows.size()
        );

        // ทุก Ticket ต้องเป็นของ Event A
        assertTrue(
                rows.stream()
                        .allMatch(
                                row -> eventAId.equals(
                                        row.eventId()
                                )
                        )
        );

        List<Long> ticketIds =
                rows.stream()
                        .map(TicketTypeRow::id)
                        .toList();

        assertTrue(ticketIds.contains(generalId));
        assertTrue(ticketIds.contains(vipId));
        assertTrue(ticketIds.contains(unusedId));

        assertFalse(
                ticketIds.contains(eventBTicketId)
        );
    }
}