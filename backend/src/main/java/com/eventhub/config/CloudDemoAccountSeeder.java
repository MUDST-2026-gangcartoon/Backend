package com.eventhub.config;

import com.eventhub.model.Role;
import com.eventhub.repository.UserRepository;
import java.util.HashSet;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Order(10)
@Profile("prod & cloud-demo & !e2e")
class CloudDemoAccountSeeder implements CommandLineRunner {
    private final DevAccountSeeder accounts;
    private final String adminPassword;
    private final String staffPassword;
    private final String fixturePassword;

    CloudDemoAccountSeeder(UserRepository users, PasswordEncoder encoder,
            @Value("${app.demo.admin-password}") String adminPassword,
            @Value("${app.demo.staff-password}") String staffPassword,
            @Value("${app.demo.fixture-password}") String fixturePassword) {
        this.accounts = new DevAccountSeeder(users, encoder);
        this.adminPassword = adminPassword;
        this.staffPassword = staffPassword;
        this.fixturePassword = fixturePassword;
    }

    @Override
    @Transactional
    public void run(String... args) {
        var passwords = List.of(adminPassword, staffPassword, fixturePassword);
        if (new HashSet<>(passwords).size() != passwords.size()
                || passwords.stream().anyMatch(password -> !password.matches("[!-~]{16,72}"))) {
            throw new IllegalArgumentException("Cloud demo requires three distinct 16–72 character passwords");
        }
        accounts.createIfMissing("EventHub Admin", "admin@example", Role.ADMIN, adminPassword);
        accounts.createIfMissing("EventHub Staff", "staff@example", Role.STAFF, staffPassword);
        accounts.createIfMissing("EventHub Participant", "user@example", Role.USER, fixturePassword);
    }
}
