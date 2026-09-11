package com.eventhub;

import com.eventhub.model.Role;
import com.eventhub.model.UserAccount;
import com.eventhub.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class AuthSecurityTests {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    @Test
    void csrfEndpointShouldReturnToken() throws Exception {

        mockMvc.perform(
                        get("/api/auth/csrf")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(
                        jsonPath("$.headerName")
                                .value("X-CSRF-TOKEN")
                );
    }

    @Test
    void meShouldRequireAuthentication() throws Exception {

        mockMvc.perform(
                        get("/api/auth/me")
                )
                .andExpect(status().isUnauthorized())
                .andExpect(
                        jsonPath("$.message")
                                .value("Authentication required")
                );
    }

    @Test
    void loginWithoutCsrfShouldBeForbidden() throws Exception {

        mockMvc.perform(
                        post("/api/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "email":"test@example.com",
                                          "password":"password123"
                                        }
                                        """)
                )
                .andExpect(status().isForbidden());
    }

    @Test
    void signupShouldCreateUserAndLoginAutomatically()
            throws Exception {

        String email =
                "test-" + UUID.randomUUID() + "@example.com";

        MvcResult result = mockMvc.perform(
                        post("/api/auth/signup")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "name":"Alice Test",
                                          "email":"%s",
                                          "password":"password123"
                                        }
                                        """.formatted(email))
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.role").value("USER"))
                .andReturn();

        UserAccount saved =
                userRepository.findByEmail(email)
                        .orElseThrow();

        assertTrue(
                passwordEncoder.matches(
                        "password123",
                        saved.getPassword()
                )
        );

        MockHttpSession session =
                (MockHttpSession)
                        result.getRequest().getSession(false);

        mockMvc.perform(
                        get("/api/auth/me")
                                .session(session)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));
    }

    @Test
    void loginShouldNormalizeEmail() throws Exception {

        String email =
                "user-" + UUID.randomUUID() + "@example.com";

        userRepository.save(
                new UserAccount(
                        "Test User",
                        email,
                        passwordEncoder.encode("password123"),
                        Role.USER
                )
        );

        mockMvc.perform(
                        post("/api/auth/login")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "email":"  %s  ",
                                          "password":"password123"
                                        }
                                        """.formatted(
                                        email.toUpperCase()
                                ))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));
    }

    @Test
    void invalidPasswordShouldReturn401() throws Exception {

        String email =
                "invalid-" + UUID.randomUUID()
                        + "@example.com";

        userRepository.save(
                new UserAccount(
                        "Test User",
                        email,
                        passwordEncoder.encode("password123"),
                        Role.USER
                )
        );

        mockMvc.perform(
                        post("/api/auth/login")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "email":"%s",
                                          "password":"wrongpassword"
                                        }
                                        """.formatted(email))
                )
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void userShouldNotAccessAdminApi()
            throws Exception {

        mockMvc.perform(
                        get("/api/admin/events")
                )
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "USER")
    void userShouldNotAccessStaffApi()
            throws Exception {

        mockMvc.perform(
                        get("/api/staff/events/1/attendees")
                )
                .andExpect(status().isForbidden());
    }
}