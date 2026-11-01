package com.eventhub.integration.payment;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.eventhub.model.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class ProfileIT extends MockPaymentDbTestSupport {

  private static final String OLD = "TestPassword123!";
  private static final String NEXT = "ChangedPassword456!";

  private MockHttpSession login(String email, String password)
    throws Exception {
    return (MockHttpSession) mvc
      .perform(
        post("/api/auth/login")
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(
            "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"
          )
      )
      .andExpect(status().isOk())
      .andReturn()
      .getRequest()
      .getSession(false);
  }

  private String profile(String email, String password) {
    return (
      "{\"name\":\"Alice Updated\",\"email\":\"" +
      email +
      "\",\"currentPassword\":\"" +
      password +
      "\",\"role\":\"ADMIN\"}"
    );
  }

  @ParameterizedTest
  @EnumSource(Role.class)
  void everyRoleCanEditOwnProfileWithoutChangingIdentityOrRole(Role role)
    throws Exception {
    alice.setRole(role);
    users.saveAndFlush(alice);
    var session = login(alice.getEmail(), OLD);
    var other = login(alice.getEmail(), OLD);
    registrations.saveAndFlush(new Registration(alice, event, ticket, 1));
    mvc
      .perform(
        put("/api/auth/profile")
          .session(session)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(profile(" NEW@example.test ", OLD))
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.id").value(alice.getId()))
      .andExpect(jsonPath("$.email").value("new@example.test"))
      .andExpect(jsonPath("$.role").value(role.name()))
      .andExpect(jsonPath("$.password").doesNotExist());
    mvc
      .perform(get("/api/auth/me").session(session))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.name").value("Alice Updated"));
    mvc
      .perform(get("/api/auth/me").session(other))
      .andExpect(status().isUnauthorized());
    assertEquals(
      alice.getId(),
      users.findByEmail("new@example.test").orElseThrow().getId()
    );
    assertEquals(
      alice.getId(),
      registrations.findAll().get(0).getUser().getId()
    );
    mvc
      .perform(
        post("/api/auth/login")
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(
            "{\"email\":\"alice@example.test\",\"password\":\"" + OLD + "\"}"
          )
      )
      .andExpect(status().isUnauthorized());
    login("new@example.test", OLD);
  }

  @Test
  void rejectsWrongPasswordDuplicateEmailAndInvalidEmailWithoutChangingAccount()
    throws Exception {
    var session = login(alice.getEmail(), OLD);
    mvc
      .perform(
        put("/api/auth/profile")
          .session(session)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(profile("new@example.test", "wrong-password"))
      )
      .andExpect(status().isBadRequest());
    mvc
      .perform(
        put("/api/auth/profile")
          .session(session)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(profile(bob.getEmail(), OLD))
      )
      .andExpect(status().isConflict());
    mvc
      .perform(
        put("/api/auth/profile")
          .session(session)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(profile("invalid", OLD))
      )
      .andExpect(status().isBadRequest());
    mvc
      .perform(get("/api/auth/me").session(session))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.email").value(alice.getEmail()));
  }

  @Test
  void passwordChangePreservesCurrentSessionAndExpiresOtherSessions()
    throws Exception {
    var session = login(alice.getEmail(), OLD);
    var other = login(alice.getEmail(), OLD);
    mvc
      .perform(
        post("/api/auth/password")
          .session(session)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(
            "{\"currentPassword\":\"" +
              OLD +
              "\",\"newPassword\":\"" +
              NEXT +
              "\"}"
          )
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.password").doesNotExist());
    mvc
      .perform(get("/api/auth/me").session(session))
      .andExpect(status().isOk());
    mvc
      .perform(get("/api/auth/me").session(other))
      .andExpect(status().isUnauthorized());
    assertTrue(
      passwordEncoder.matches(
        NEXT,
        users.findById(alice.getId()).orElseThrow().getPassword()
      )
    );
    mvc
      .perform(
        post("/api/auth/login")
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(
            "{\"email\":\"alice@example.test\",\"password\":\"" + OLD + "\"}"
          )
      )
      .andExpect(status().isUnauthorized());
    login(alice.getEmail(), NEXT);
  }

  @Test
  void passwordValidationRejectsWrongOldSameShortAndOversizedUtf8Passwords()
    throws Exception {
    var session = login(alice.getEmail(), OLD);
    for (var pair : new String[][] {
      { "incorrect", NEXT },
      { OLD, OLD },
      { OLD, "short" },
      { OLD, "ก".repeat(25) },
    }) {
      mvc
        .perform(
          post("/api/auth/password")
            .session(session)
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(
              "{\"currentPassword\":\"" +
                pair[0] +
                "\",\"newPassword\":\"" +
                pair[1] +
                "\"}"
            )
        )
        .andExpect(status().isBadRequest());
    }
    assertTrue(
      passwordEncoder.matches(
        OLD,
        users.findById(alice.getId()).orElseThrow().getPassword()
      )
    );
  }

  @Test
  void profileRequiresLoginAndCsrf() throws Exception {
    mvc
      .perform(
        put("/api/auth/profile")
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(profile("new@example.test", OLD))
      )
      .andExpect(status().isUnauthorized());
    mvc
      .perform(
        post("/api/auth/password")
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content("{}")
      )
      .andExpect(status().isUnauthorized());
    var session = login(alice.getEmail(), OLD);
    mvc
      .perform(
        put("/api/auth/profile")
          .session(session)
          .contentType(MediaType.APPLICATION_JSON)
          .content(profile("new@example.test", OLD))
      )
      .andExpect(status().isForbidden());
    mvc
      .perform(
        post("/api/auth/password")
          .session(session)
          .contentType(MediaType.APPLICATION_JSON)
          .content("{}")
      )
      .andExpect(status().isForbidden());
  }
}
