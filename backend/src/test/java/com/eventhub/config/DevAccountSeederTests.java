package com.eventhub.config;

import com.eventhub.model.Role;
import com.eventhub.model.UserAccount;
import com.eventhub.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DevAccountSeederTests {

    @Mock
    private UserRepository userRepository;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);

    @Test
    void shouldOnlyLoadUnderDevAndNeverProd() {
        Profile profile = DevAccountSeeder.class.getAnnotation(Profile.class);
        assertNotNull(profile);
        assertArrayEquals(new String[]{"dev & !prod"}, profile.value());
    }

    @Test
    void shouldCreateThreeAccountsWithCorrectRolesAndHashedPasswords() {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        new DevAccountSeeder(userRepository, passwordEncoder).run();

        ArgumentCaptor<UserAccount> captor = ArgumentCaptor.forClass(UserAccount.class);
        verify(userRepository, times(3)).save(captor.capture());

        Map<String, UserAccount> byEmail = new HashMap<>();
        for (UserAccount user : captor.getAllValues()) {
            byEmail.put(user.getEmail(), user);
            assertNotEquals("11111111", user.getPassword());
            assertTrue(passwordEncoder.matches("11111111", user.getPassword()));
        }
        assertEquals(3, byEmail.size());
        assertEquals(Role.ADMIN, byEmail.get("admin@example").getRole());
        assertEquals(Role.STAFF, byEmail.get("staff@example").getRole());
        assertEquals(Role.USER, byEmail.get("user@example").getRole());
    }

    @Test
    void shouldNotResetExistingUserPasswordOrRole() {
        UserAccount original = new UserAccount(
                "Existing Admin", "admin@example",
                passwordEncoder.encode("existing-password"), Role.USER
        );
        when(userRepository.findByEmail("admin@example")).thenReturn(Optional.of(original));
        when(userRepository.findByEmail("staff@example")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("user@example")).thenReturn(Optional.empty());

        new DevAccountSeeder(userRepository, passwordEncoder).run();

        verify(userRepository, times(2)).save(any(UserAccount.class));
        assertEquals(Role.USER, original.getRole());
        assertTrue(passwordEncoder.matches("existing-password", original.getPassword()));
    }

    @Test
    void shouldBeIdempotentWhenStartedTwice() {
        Map<String, UserAccount> stored = new HashMap<>();
        when(userRepository.findByEmail(anyString()))
                .thenAnswer(invocation -> Optional.ofNullable(stored.get(invocation.getArgument(0))));
        when(userRepository.save(any(UserAccount.class)))
                .thenAnswer(invocation -> {
                    UserAccount user = invocation.getArgument(0);
                    stored.put(user.getEmail(), user);
                    return user;
                });

        DevAccountSeeder seeder = new DevAccountSeeder(userRepository, passwordEncoder);
        seeder.run();
        seeder.run();

        assertEquals(3, stored.size());
        verify(userRepository, times(3)).save(any(UserAccount.class));
    }
}
