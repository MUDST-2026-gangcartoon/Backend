package com.eventhub.config;

import com.eventhub.dto.ApiDtos;
import com.eventhub.model.Role;
import com.eventhub.model.UserAccount;
import com.eventhub.repository.UserRepository;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:dev-account-seeder-it;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.h2.console.enabled=false"
})
@ActiveProfiles("dev")
class DevAccountSeederIT {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private Validator validator;

    @Autowired
    private DevDemoDataSeeder demoSeeder;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void seedsTheDemoScenariosOnceWithoutChangingExistingRecords() {
        assertEquals(7, count("events"));
        assertEquals(10, count("registrations"));
        assertEquals(6, count("mock_payment_orders"));
        assertEquals(27, count("page_views"));
        assertEquals(13, count("registration_attempts"));
        assertEquals(2, count("guest_identities"));

        jdbc.update("UPDATE events SET title = 'Edited demo event' WHERE title LIKE '%เวิร์กช็อปทำโปสเตอร์'");
        demoSeeder.run();

        assertEquals(7, count("events"));
        assertEquals(10, count("registrations"));
        assertEquals(6, count("mock_payment_orders"));
        assertEquals(27, count("page_views"));
        assertEquals(13, count("registration_attempts"));
        assertEquals(2, count("guest_identities"));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM events WHERE title = 'Edited demo event'", Integer.class));
    }

    private int count(String table) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class);
    }

    @Test
    void shouldSeedRealDatabaseWhenDevStarts() {
        assertAccount("admin@example", Role.ADMIN);
        assertAccount("staff@example", Role.STAFF);
        assertAccount("user@example", Role.USER);
    }

    private void assertAccount(String email, Role role) {
        UserAccount account = userRepository.findByEmail(email).orElseThrow();
        assertEquals(role, account.getRole());
        assertTrue(passwordEncoder.matches("11111111", account.getPassword()));
        assertNotEquals("11111111", account.getPassword());
        // Checks whether the project's existing LoginRequest validation accepts this exact email.
        assertTrue(validator.validate(new ApiDtos.LoginRequest(email, "11111111")).isEmpty(),
                "LoginRequest email validation rejected: " + email);
    }
}
