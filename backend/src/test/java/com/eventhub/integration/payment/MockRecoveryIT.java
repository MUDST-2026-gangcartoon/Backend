package com.eventhub.integration.payment;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class MockRecoveryIT extends MockPaymentDbTestSupport {

    @Test
    void mockLinkIsSessionBoundSingleUseAndChangesRealPassword()
            throws Exception {
        var result = mvc
                .perform(
                        post("/api/auth/recovery/request")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"alice@example.test\"}")
                )
                .andExpect(status().isOk())
                .andReturn();
        var session = (MockHttpSession) result.getRequest().getSession(false);
        String token = JsonPath.read(
                result.getResponse().getContentAsString(),
                "$.resetToken"
        );
        String body =
                "{\"token\":\"" + token + "\",\"password\":\"NewPassword456!\"}";
        mvc
                .perform(
                        post("/api/auth/recovery/reset")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body)
                )
                .andExpect(status().isBadRequest());
        mvc
                .perform(
                        post("/api/auth/recovery/reset")
                                .session(session)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body)
                )
                .andExpect(status().isOk());
        assertTrue(
                passwordEncoder.matches(
                        "NewPassword456!",
                        users.findById(alice.getId()).orElseThrow().getPassword()
                )
        );
        mvc
                .perform(
                        post("/api/auth/recovery/reset")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(body)
                )
                .andExpect(status().isBadRequest());
        mvc
                .perform(
                        post("/api/auth/login")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\"alice@example.test\",\"password\":\"TestPassword123!\"}"
                                )
                )
                .andExpect(status().isUnauthorized());
        mvc
                .perform(
                        post("/api/auth/login")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\"alice@example.test\",\"password\":\"NewPassword456!\"}"
                                )
                )
                .andExpect(status().isOk());
    }

    @Test
    void newRequestInvalidatesPreviousLinkAndRequestsAreThrottled()
            throws Exception {
        var result = mvc
                .perform(
                        post("/api/auth/recovery/request")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"alice@example.test\"}")
                )
                .andExpect(status().isOk())
                .andReturn();
        var session = (MockHttpSession) result.getRequest().getSession(false);
        String old = JsonPath.read(
                result.getResponse().getContentAsString(),
                "$.resetToken"
        );
        mvc
                .perform(
                        post("/api/auth/recovery/request")
                                .session(session)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"alice@example.test\"}")
                )
                .andExpect(status().isTooManyRequests());
        session.setAttribute(
                "MOCK_PASSWORD_RECOVERY_LAST",
                java.time.Instant.now().minusSeconds(31)
        );
        mvc
                .perform(
                        post("/api/auth/recovery/request")
                                .session(session)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"alice@example.test\"}")
                )
                .andExpect(status().isOk());
        mvc
                .perform(
                        post("/api/auth/recovery/reset")
                                .session(session)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"token\":\"" +
                                                old +
                                                "\",\"password\":\"AnotherPassword!\"}"
                                )
                )
                .andExpect(status().isBadRequest());
    }

    @Test
    void resetRejectsExpiredTokenAndWeakPassword() throws Exception {
        var result = mvc
                .perform(
                        post("/api/auth/recovery/request")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"alice@example.test\"}")
                )
                .andReturn();
        var session = (MockHttpSession) result.getRequest().getSession(false);
        String token = JsonPath.read(
                result.getResponse().getContentAsString(),
                "$.resetToken"
        );
        mvc
                .perform(
                        post("/api/auth/recovery/reset")
                                .session(session)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"token\":\"" + token + "\",\"password\":\"short\"}"
                                )
                )
                .andExpect(status().isBadRequest());
        Object challenge = session.getAttribute("MOCK_PASSWORD_RECOVERY");
        var type = challenge.getClass();
        var ctor = type.getDeclaredConstructors()[0];
        ctor.setAccessible(true);
        var email = type.getDeclaredMethod("email");
        email.setAccessible(true);
        var hash = type.getDeclaredMethod("tokenHash");
        hash.setAccessible(true);
        var stamp = type.getDeclaredMethod("passwordStamp");
        stamp.setAccessible(true);
        session.setAttribute(
                "MOCK_PASSWORD_RECOVERY",
                ctor.newInstance(
                        email.invoke(challenge),
                        hash.invoke(challenge),
                        stamp.invoke(challenge),
                        java.time.Instant.now().minusSeconds(1)
                )
        );
        mvc
                .perform(
                        post("/api/auth/recovery/reset")
                                .session(session)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"token\":\"" +
                                                token +
                                                "\",\"password\":\"NewPassword456!\"}"
                                )
                )
                .andExpect(status().isBadRequest());
    }

    @Test
    void passwordChangeExpiresExistingLoggedInSession() throws Exception {
        var login = mvc
                .perform(
                        post("/api/auth/login")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"email\":\"alice@example.test\",\"password\":\"TestPassword123!\"}"
                                )
                )
                .andExpect(status().isOk())
                .andReturn();
        var session = (MockHttpSession) login.getRequest().getSession(false);
        alice.setPassword(passwordEncoder.encode("ChangedElsewhere456!"));
        users.saveAndFlush(alice);
        mvc
                .perform(get("/api/auth/me").session(session))
                .andExpect(status().isUnauthorized());
    }
}
