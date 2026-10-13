
package com.eventhub.config;

import com.eventhub.model.Event;
import com.eventhub.model.Registration;
import com.eventhub.model.Role;
import com.eventhub.model.TicketType;
import com.eventhub.model.UserAccount;
import com.eventhub.repository.EventRepository;
import com.eventhub.repository.RegistrationRepository;
import com.eventhub.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Component
@Profile("e2e & !prod")
public class E2ETestDataSeeder implements CommandLineRunner {

    // Stable ticket codes for repeatable E2E scenarios.
    public static final String PENDING_CODE = "E2E-PENDING-001";
    public static final String CHECKED_CODE = "E2E-CHECKED-001";
    public static final String FULL_CODE = "E2E-FULL-001";

    private final UserRepository users;
    private final EventRepository events;
    private final RegistrationRepository registrations;
    private final PasswordEncoder encoder;
    private final EntityManager entityManager;
    private final DataSource dataSource;
    private final String seedPassword;

    public E2ETestDataSeeder(
            UserRepository users,
            EventRepository events,
            RegistrationRepository registrations,
            PasswordEncoder encoder,
            EntityManager entityManager,
            DataSource dataSource,
            @Value("${app.e2e.seed.password}") String seedPassword
    ) {
        this.users = users;
        this.events = events;
        this.registrations = registrations;
        this.encoder = encoder;
        this.entityManager = entityManager;
        this.dataSource = dataSource;
        this.seedPassword = seedPassword;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {

        // Seed only the dedicated, disposable H2 E2E database.
        // This guard does not replace safe datasource configuration.
        try (var connection = dataSource.getConnection()) {
            String jdbcUrl = connection.getMetaData()
                    .getURL()
                    .toLowerCase(Locale.ROOT);

            if (!jdbcUrl.startsWith("jdbc:h2:mem:eventhub_e2e")) {
                throw new IllegalStateException(
                        "E2E seeding requires the dedicated H2 in-memory database"
                );
            }
        }

        // Do not use a hardcoded password in source control.
        if (seedPassword == null
                || seedPassword.length() < 8
                || seedPassword.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalStateException(
                    "APP_E2E_SEED_PASSWORD must contain at least 8 characters "
                            + "and no more than 72 UTF-8 bytes"
            );
        }

        // Fail safely instead of deleting or overwriting existing data.
        if (users.count() != 0
                || events.count() != 0
                || registrations.count() != 0) {
            throw new IllegalStateException(
                    "E2E database must be empty before initial seeding"
            );
        }

        // =====================================================
        // 1. Seed accounts
        // =====================================================

        createUser("E2E Admin", "e2e.admin@example.com", Role.ADMIN);
        createUser("E2E Staff", "e2e.staff@example.com", Role.STAFF);

        UserAccount freshUser = createUser(
                "E2E Fresh User",
                "e2e.user@example.com",
                Role.USER
        );

        UserAccount pendingUser = createUser(
                "E2E Pending User",
                "e2e.pending@example.com",
                Role.USER
        );

        UserAccount checkedUser = createUser(
                "E2E Checked User",
                "e2e.checked@example.com",
                Role.USER
        );

        // Keep the fresh user unregistered for booking tests.
        // Registration scenarios use the other two USER accounts.

        // =====================================================
        // 2. Seed an OPEN event and ticket types
        // =====================================================

        LocalDateTime startTime = LocalDateTime.now()
                .plusDays(30)
                .withHour(10)
                .withMinute(0)
                .withSecond(0)
                .withNano(0);

        Event openEvent = createEvent(
                "[E2E] Open Workshop",
                "E2E workshop for registration and check-in testing",
                "E2E Test Hall",
                "TECH",
                startTime,
                6
        );

        TicketType general = new TicketType(
                openEvent,
                "General",
                "General admission",
                new BigDecimal("100.00"),
                4
        );

        TicketType vip = new TicketType(
                openEvent,
                "VIP",
                "VIP admission",
                new BigDecimal("250.00"),
                2
        );

        openEvent.addTicketType(general);
        openEvent.addTicketType(vip);

        events.saveAndFlush(openEvent);

        // =====================================================
        // 3. Seed a FULL event
        // =====================================================

        Event fullEvent = createEvent(
                "[E2E] Full Workshop",
                "E2E workshop for full-capacity testing",
                "E2E Test Hall",
                "COMMUNITY",
                startTime.plusDays(1),
                1
        );

        TicketType fullTicket = new TicketType(
                fullEvent,
                "General",
                "Limited admission",
                BigDecimal.ZERO,
                1
        );

        fullEvent.addTicketType(fullTicket);
        events.saveAndFlush(fullEvent);

        // =====================================================
        // 4. Seed registrations
        // =====================================================

        Registration pending = new Registration(
                pendingUser,
                openEvent,
                general,
                2
        );

        Registration checked = new Registration(
                checkedUser,
                openEvent,
                vip,
                1
        );

        // One registration is already checked in.
        checked.checkIn();

        Registration full = new Registration(
                checkedUser,
                fullEvent,
                fullTicket,
                1
        );

        registrations.saveAllAndFlush(
                List.of(pending, checked, full)
        );

        // =====================================================
        // 5. Assign predictable E2E ticket codes
        // =====================================================

        // Registration normally generates a random ticket code.
        // JPQL bulk updates are used only in this E2E fixture
        // so QA can rely on known codes without changing the
        // production Registration entity or code generator.

        assignTicketCode(pending.getId(), PENDING_CODE);
        assignTicketCode(checked.getId(), CHECKED_CODE);
        assignTicketCode(full.getId(), FULL_CODE);

        // Clear managed entities after JPQL bulk updates.
        entityManager.clear();

        // Prevent accidental removal of the fresh account.
        if (freshUser.getId() == null) {
            throw new IllegalStateException(
                    "Failed to create the fresh E2E user"
            );
        }
    }

    private UserAccount createUser(
            String name,
            String email,
            Role role
    ) {
        return users.save(
                new UserAccount(
                        name,
                        email,
                        encoder.encode(seedPassword),
                        role
                )
        );
    }

    private Event createEvent(
            String title,
            String description,
            String location,
            String category,
            LocalDateTime startsAt,
            int capacity
    ) {
        Event event = new Event();
        event.setTitle(title);
        event.setDescription(description);
        event.setLocation(location);
        event.setCategory(category);
        event.setStartsAt(startsAt);
        event.setCapacity(capacity);
        return event;
    }

    private void assignTicketCode(
            Long registrationId,
            String ticketCode
    ) {
        int updated = entityManager.createQuery("""
                update Registration r
                set r.ticketCode = :ticketCode
                where r.id = :registrationId
                """)
                .setParameter("ticketCode", ticketCode)
                .setParameter("registrationId", registrationId)
                .executeUpdate();

        if (updated != 1) {
            throw new IllegalStateException(
                    "Failed to assign E2E ticket code: " + ticketCode
            );
        }
    }
}
