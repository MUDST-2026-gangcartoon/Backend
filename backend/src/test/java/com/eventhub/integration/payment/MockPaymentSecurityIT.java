package com.eventhub.integration.payment;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.*;

import static org.springframework.security.test.web.servlet.request
        .SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request
        .SecurityMockMvcRequestPostProcessors.user;

import static org.springframework.test.web.servlet.request
        .MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result
        .MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class MockPaymentSecurityIT extends MockPaymentDbTestSupport {

    // INT-PAY-006
    @Test
    void unauthenticatedPaymentRequestsAreRejected()
            throws Exception {

        mvc.perform(
                        post("/api/payments/mock/checkout")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                {
                                  "eventId": 100,
                                  "ticketTypeId": 200,
                                  "quantity": 1
                                }
                                """)
                )
                .andExpect(status().isUnauthorized());

        mvc.perform(
                        post("/api/payments/mock/999/confirm")
                                .with(csrf())
                )
                .andExpect(status().isUnauthorized());
    }

    @Test
    void missingCsrfIsRejected() throws Exception {
        mvc.perform(
                        post("/api/payments/mock/checkout")
                                .with(user(alice.getEmail()).roles("USER"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                {
                                  "eventId": 100,
                                  "ticketTypeId": 200,
                                  "quantity": 1
                                }
                                """)
                )
                .andExpect(status().isForbidden());
    }

    @Test
    void paymentOwnershipReturns404ForOtherUser()
            throws Exception {

        Long paymentId = createPending(alice, 1).getId();

        mvc.perform(
                        get("/api/payments/mock/{id}", paymentId)
                                .with(user(bob.getEmail()).roles("USER"))
                )
                .andExpect(status().isNotFound());

        mvc.perform(
                        post("/api/payments/mock/{id}/confirm", paymentId)
                                .with(user(bob.getEmail()).roles("USER"))
                                .with(csrf())
                )
                .andExpect(status().isNotFound());

        mvc.perform(
                        post("/api/payments/mock/{id}/cancel", paymentId)
                                .with(user(bob.getEmail()).roles("USER"))
                                .with(csrf())
                )
                .andExpect(status().isNotFound());
    }

    // Login และ HTTP Session จริง
    @Test
    void authenticatedSessionCanCheckout()
            throws Exception {

        MockHttpSession initialSession =
                new MockHttpSession();

        MvcResult loginResult =
                mvc.perform(
                                post("/api/auth/login")
                                        .session(initialSession)
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content("""
                                        {
                                          "email": "alice@example.test",
                                          "password": "TestPassword123!"
                                        }
                                        """)
                        )
                        .andExpect(status().isOk())
                        .andReturn();

        MockHttpSession session =
                (MockHttpSession)
                        loginResult.getRequest().getSession(false);

        assertNotNull(session);

        // SecurityContext ถูกเก็บใน Session
        mvc.perform(
                        get("/api/auth/me").session(session)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email")
                        .value("alice@example.test"));

        // ใช้ Session เดิมเรียก Payment API
        mvc.perform(
                        post("/api/payments/mock/checkout")
                                .session(session)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                {
                                  "eventId": %d,
                                  "ticketTypeId": %d,
                                  "quantity": 1
                                }
                                """.formatted(
                                        event.getId(),
                                        ticket.getId()
                                ))
                )
                .andExpect(status().isCreated());

        assertEquals(1L, payments.count());
    }
}