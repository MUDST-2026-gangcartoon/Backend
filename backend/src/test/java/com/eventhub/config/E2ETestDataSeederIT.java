
package com.eventhub.config;

import com.eventhub.model.Event;
import com.eventhub.model.Registration;
import com.eventhub.model.Role;
import com.eventhub.model.UserAccount;
import com.eventhub.repository.EventRepository;
import com.eventhub.repository.RegistrationRepository;
import com.eventhub.repository.TicketTypeRepository;
import com.eventhub.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("e2e")
class E2ETestDataSeederIT {

    // Generate a test-only password at runtime.
    // No reusable credential is committed to Git.
    private static final String TEST_PASSWORD =
            "test-e2e-" + UUID.randomUUID();

    @DynamicPropertySource
    static void e2eProperties(DynamicPropertyRegistry registry) {
        registry.add(
                "app.e2e.seed.password",
                () -> TEST_PASSWORD
        );
    }

    @Autowired
    private UserRepository users;

    @Autowired
    private EventRepository events;

    @Autowired
    private TicketTypeRepository ticketTypes;

    @Autowired
    private RegistrationRepository registrations;

    @Autowired
    private PasswordEncoder encoder;

    @Test
    void shouldSeedAccountsAndRoles() {
        assertEquals(5, users.count());

        assertUser("e2e.admin@example.com", Role.ADMIN);
        assertUser("e2e.staff@example.com", Role.STAFF);
        assertUser("e2e.user@example.com", Role.USER);
        assertUser("e2e.pending@example.com", Role.USER);
        assertUser("e2e.checked@example.com", Role.USER);
    }

    @Test
    void shouldSeedOpenAndFullEvents() {
        assertEquals(2, events.count());

        Event open = findEvent("[E2E] Open Workshop");
        Event full = findEvent("[E2E] Full Workshop");

        assertEquals(6, open.getCapacity());
        assertEquals(1, full.getCapacity());

        assertTrue(open.getStartsAt().isAfter(LocalDateTime.now()));
        assertTrue(full.getStartsAt().isAfter(LocalDateTime.now()));

        assertEquals(
                2,
                ticketTypes.findByEventIdOrderByIdAsc(
                        open.getId()
                ).size()
        );

        assertEquals(
                1,
                ticketTypes.findByEventIdOrderByIdAsc(
                        full.getId()
                ).size()
        );

        // OPEN event: 3 seats reserved out of 6.
        assertEquals(
                3L,
                registrations.seatsReservedByEventId(open.getId())
        );

        // FULL event: 1 seat reserved out of 1.
        assertEquals(
                1L,
                registrations.seatsReservedByEventId(full.getId())
        );
    }

    @Test
    void shouldSeedPredictableCheckInScenarios() {
        assertEquals(3, registrations.count());

        Registration pending = registrations
                .findByTicketCode(
                        E2ETestDataSeeder.PENDING_CODE
                )
                .orElseThrow();

        Registration checked = registrations
                .findByTicketCode(
                        E2ETestDataSeeder.CHECKED_CODE
                )
                .orElseThrow();

        Registration full = registrations
                .findByTicketCode(
                        E2ETestDataSeeder.FULL_CODE
                )
                .orElseThrow();

        assertEquals(2, pending.getQuantity());
        assertNull(pending.getCheckedInAt());

        assertEquals(1, checked.getQuantity());
        assertNotNull(checked.getCheckedInAt());

        assertEquals(1, full.getQuantity());
        assertNull(full.getCheckedInAt());

        // Fresh user must still be able to register.
        UserAccount fresh = users
                .findByEmail("e2e.user@example.com")
                .orElseThrow();

        Event open = findEvent("[E2E] Open Workshop");

        assertFalse(
                registrations.existsByUserIdAndEventId(
                        fresh.getId(),
                        open.getId()
                )
        );
    }

    private void assertUser(String email, Role role) {
        UserAccount user = users.findByEmail(email).orElseThrow();

        assertEquals(role, user.getRole());
        assertTrue(
                encoder.matches(TEST_PASSWORD, user.getPassword())
        );
        assertNotEquals(TEST_PASSWORD, user.getPassword());
    }

    private Event findEvent(String title) {
        return events.findAll()
                .stream()
                .filter(event -> title.equals(event.getTitle()))
                .findFirst()
                .orElseThrow();
    }
}
