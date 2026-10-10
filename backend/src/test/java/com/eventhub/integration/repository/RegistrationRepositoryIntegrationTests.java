package com.eventhub.integration.repository;

import com.eventhub.model.Event;
import com.eventhub.model.TicketType;
import com.eventhub.model.UserAccount;
import com.eventhub.repository.RegistrationRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(
        replace = AutoConfigureTestDatabase.Replace.NONE
)
class RegistrationRepositoryIntegrationTests {

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private RegistrationRepository registrationRepository;

    private Long eventAId;
    private Long eventBId;
    private Long emptyEventId;

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
                "Capacity test A",
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
                "Capacity test B",
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
        // Event C — ไม่มี Registration
        // ===========================================

        Event emptyEvent = data.event(
                "Empty Event",
                "No registrations",
                "Bangkok",
                LocalDateTime.of(2028, 6, 30, 10, 0),
                10,
                "COMMUNITY"
        );

        // ===========================================
        // Users
        // ===========================================

        UserAccount alice = data.user(
                "Alice",
                "capacity-alice@example.test"
        );

        UserAccount bob = data.user(
                "Bob",
                "capacity-bob@example.test"
        );

        UserAccount charlie = data.user(
                "Charlie",
                "capacity-charlie@example.test"
        );

        UserAccount david = data.user(
                "David",
                "capacity-david@example.test"
        );

        // ===========================================
        // Registrations
        // ===========================================

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

        data.registration(
                charlie,
                eventA,
                vip,
                4
        );

        data.registration(
                david,
                eventB,
                eventBTicket,
                6
        );

        eventAId = eventA.getId();
        eventBId = eventB.getId();
        emptyEventId = emptyEvent.getId();

        generalId = general.getId();
        vipId = vip.getId();
        unusedId = unused.getId();
        eventBTicketId = eventBTicket.getId();

        data.flushAndClear();
    }

    // ============================================================
    // INT-REPO-004 — Event Capacity
    // ============================================================

    @Test
    void shouldSumReservedSeatsByEventId()
    {
        // Event A:
        // 3 Registration records
        // quantities = 2 + 3 + 4 = 9

        assertEquals(
                3L,
                registrationRepository.countByEventId(
                        eventAId
                )
        );

        assertEquals(
                9L,
                registrationRepository.seatsReservedByEventId(
                        eventAId
                )
        );

        // Event B:
        // 1 Registration record
        // quantity = 6

        assertEquals(
                1L,
                registrationRepository.countByEventId(
                        eventBId
                )
        );

        assertEquals(
                6L,
                registrationRepository.seatsReservedByEventId(
                        eventBId
                )
        );

        // Event C:
        // ไม่มี Registration

        assertEquals(
                0L,
                registrationRepository.seatsReservedByEventId(
                        emptyEventId
                )
        );

        // ทั้งฐานข้อมูลมี Registration 4 rows
        assertEquals(
                4L,
                registrationRepository.count()
        );
    }

    // ============================================================
    // INT-REPO-004 — Ticket Capacity
    // ============================================================

    @Test
    void shouldSumReservedSeatsByTicketTypeId()
    {
        // General:
        // 2 + 3 = 5

        assertEquals(
                5L,
                registrationRepository.seatsReservedByTicketTypeId(
                        generalId
                )
        );

        // VIP:
        // 4

        assertEquals(
                4L,
                registrationRepository.seatsReservedByTicketTypeId(
                        vipId
                )
        );

        // Event B / Standard:
        // 6

        assertEquals(
                6L,
                registrationRepository.seatsReservedByTicketTypeId(
                        eventBTicketId
                )
        );

        // Unused Ticket:
        // 0

        assertEquals(
                0L,
                registrationRepository.seatsReservedByTicketTypeId(
                        unusedId
                )
        );
    }

    // ============================================================
    // INT-REPO-004 — Empty results
    // ============================================================

    @Test
    void shouldReturnZeroWhenNoSeatsAreReserved()
    {
        assertEquals(
                0L,
                registrationRepository.seatsReservedByEventId(
                        emptyEventId
                )
        );

        assertEquals(
                0L,
                registrationRepository.seatsReservedByTicketTypeId(
                        unusedId
                )
        );
    }
}