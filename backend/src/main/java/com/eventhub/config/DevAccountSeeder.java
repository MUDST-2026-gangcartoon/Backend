package com.eventhub.config;

import com.eventhub.model.Role;
import com.eventhub.model.UserAccount;
import com.eventhub.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Seeds local-only demo accounts, without modifying existing accounts. */
@Component
@Profile("dev & !prod")
public class DevAccountSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DevAccountSeeder.class);
    private static final String DEV_PASSWORD = "11111111";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DevAccountSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        createIfMissing("Dev Admin", "admin@example", Role.ADMIN);
        createIfMissing("Dev Staff", "staff@example", Role.STAFF);
        createIfMissing("Dev User", "user@example", Role.USER);
    }

    private void createIfMissing(String name, String email, Role role) {
        if (userRepository.findByEmail(email).isPresent()) {
            log.info("Dev account already exists; leaving it unchanged: {}", email);
            return;
        }

        userRepository.save(new UserAccount(
                name,
                email,
                passwordEncoder.encode(DEV_PASSWORD),
                role
        ));
        log.info("Created {} account for local development: {}", role, email);
    }
}
