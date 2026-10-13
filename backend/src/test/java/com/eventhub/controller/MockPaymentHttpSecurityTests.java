package com.eventhub.controller;

import com.eventhub.dto.ApiDtos;
import com.eventhub.service.MockPaymentService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;

import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import static org.springframework.security.test.web.servlet.request
        .SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request
        .SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup
        .SecurityMockMvcConfigurers.springSecurity;

import static org.springframework.test.web.servlet.request
        .MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result
        .MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@Import(MockPaymentHttpSecurityTests.PaymentMockConfig.class)
class MockPaymentHttpSecurityTests {

    @TestConfiguration
    static class PaymentMockConfig {

        @Bean
        @Primary
        MockPaymentService mockPaymentService() {
            return mock(MockPaymentService.class);
        }
    }

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private MockPaymentService paymentService;

    private MockMvc mvc;

    private static final String CHECKOUT =
            "/api/payments/mock/checkout";

    private static final String CONFIRM =
            "/api/payments/mock/500/confirm";

    private static final String CANCEL =
            "/api/payments/mock/500/cancel";

    private static final String STATUS =
            "/api/payments/mock/500";

    private static final String VALID_CHECKOUT = """
            {
              "eventId": 100,
              "ticketTypeId": 200,
              "quantity": 2
            }
            """;

    @BeforeEach
    void setUp() {
        reset(paymentService);

        mvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    // API-PAY-001 — Valid checkout
    @Test
    void userCheckoutReturns201() throws Exception {
        when(paymentService.checkout(any(), any()))
                .thenReturn(new ApiDtos.MockCheckoutDto(
                        500L,
                        "PENDING_PAYMENT",
                        100L,
                        200L,
                        2,
                        new BigDecimal("250.00"),
                        new BigDecimal("500.00"),
                        "THB",
                        "EVENTHUB_DEMO_PAYMENT:500",
                        LocalDateTime.now().plusMinutes(10)
                ));

        mvc.perform(
                        post(CHECKOUT)
                                .with(user("alice@example.test").roles("USER"))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(VALID_CHECKOUT)
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.paymentId").value(500))
                .andExpect(jsonPath("$.status").value("PENDING_PAYMENT"))
                .andExpect(jsonPath("$.quantity").value(2))
                .andExpect(jsonPath("$.totalAmount").value(500.00))
                .andExpect(jsonPath("$.currency").value("THB"))
                .andExpect(jsonPath("$.qrPayload")
                        .value("EVENTHUB_DEMO_PAYMENT:500"));

        verify(paymentService).checkout(
                eq(new ApiDtos.MockCheckoutRequest(100L, 200L, 2)),
                argThat(p -> p != null
                        && "alice@example.test".equals(p.getName()))
        );
    }

    // Anonymous
    @Test
    void guestCannotCheckout() throws Exception {
        mvc.perform(
                        post(CHECKOUT)
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(VALID_CHECKOUT)
                )
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(paymentService);
    }

    @Test
    void guestCannotConfirm() throws Exception {
        mvc.perform(post(CONFIRM).with(csrf()))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(paymentService);
    }

    @Test
    void guestCannotReadStatus() throws Exception {
        mvc.perform(get(STATUS))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(paymentService);
    }

    @Test
    void guestCannotCancel() throws Exception {
        mvc.perform(post(CANCEL).with(csrf()))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(paymentService);
    }

    // ROLE_USER only
    @Test
    void staffCannotAccessPaymentApi() throws Exception {
        mvc.perform(
                        post(CHECKOUT)
                                .with(user("staff@example.test").roles("STAFF"))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(VALID_CHECKOUT)
                )
                .andExpect(status().isForbidden());

        mvc.perform(
                        post(CONFIRM)
                                .with(user("staff@example.test").roles("STAFF"))
                                .with(csrf())
                )
                .andExpect(status().isForbidden());

        mvc.perform(
                        post(CANCEL)
                                .with(user("staff@example.test").roles("STAFF"))
                                .with(csrf())
                )
                .andExpect(status().isForbidden());

        mvc.perform(
                        get(STATUS)
                                .with(user("staff@example.test").roles("STAFF"))
                )
                .andExpect(status().isForbidden());

        verifyNoInteractions(paymentService);
    }

    @Test
    void adminCannotAccessPaymentApi() throws Exception {
        mvc.perform(
                        post(CHECKOUT)
                                .with(user("admin@example.test").roles("ADMIN"))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(VALID_CHECKOUT)
                )
                .andExpect(status().isForbidden());

        mvc.perform(
                        post(CONFIRM)
                                .with(user("admin@example.test").roles("ADMIN"))
                                .with(csrf())
                )
                .andExpect(status().isForbidden());

        mvc.perform(
                        post(CANCEL)
                                .with(user("admin@example.test").roles("ADMIN"))
                                .with(csrf())
                )
                .andExpect(status().isForbidden());

        mvc.perform(
                        get(STATUS)
                                .with(user("admin@example.test").roles("ADMIN"))
                )
                .andExpect(status().isForbidden());

        verifyNoInteractions(paymentService);
    }

    // CSRF
    @Test
    void missingCsrfBlocksCheckout() throws Exception {
        mvc.perform(
                        post(CHECKOUT)
                                .with(user("alice@example.test").roles("USER"))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(VALID_CHECKOUT)
                )
                .andExpect(status().isForbidden());

        verifyNoInteractions(paymentService);
    }

    @Test
    void missingCsrfBlocksConfirm() throws Exception {
        mvc.perform(
                        post(CONFIRM)
                                .with(user("alice@example.test").roles("USER"))
                )
                .andExpect(status().isForbidden());

        verifyNoInteractions(paymentService);
    }

    @Test
    void missingCsrfBlocksCancel() throws Exception {
        mvc.perform(
                        post(CANCEL)
                                .with(user("alice@example.test").roles("USER"))
                )
                .andExpect(status().isForbidden());

        verifyNoInteractions(paymentService);
    }

    // DTO Validation
    @Test
    void invalidCheckoutQuantityReturns400() throws Exception {
        mvc.perform(
                        post(CHECKOUT)
                                .with(user("alice@example.test").roles("USER"))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                {
                                  "eventId": 100,
                                  "ticketTypeId": 200,
                                  "quantity": 0
                                }
                                """)
                )
                .andExpect(status().isBadRequest());

        mvc.perform(
                        post(CHECKOUT)
                                .with(user("alice@example.test").roles("USER"))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                {
                                  "eventId": 100,
                                  "ticketTypeId": 200,
                                  "quantity": 11
                                }
                                """)
                )
                .andExpect(status().isBadRequest());

        verifyNoInteractions(paymentService);
    }

    @Test
    void missingCheckoutFieldsReturn400() throws Exception {
        mvc.perform(
                        post(CHECKOUT)
                                .with(user("alice@example.test").roles("USER"))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                {
                                  "eventId": null,
                                  "ticketTypeId": null,
                                  "quantity": null
                                }
                                """)
                )
                .andExpect(status().isBadRequest());

        verifyNoInteractions(paymentService);
    }

    // API-PAY-003 — Status response
    @Test
    void ownerStatusHttpContractReturns200() throws Exception {
        when(paymentService.get(eq(500L), any()))
                .thenReturn(new ApiDtos.MockPaymentStatusDto(
                        500L,
                        "PENDING_PAYMENT",
                        new BigDecimal("500.00"),
                        "THB",
                        null,
                        null
                ));

        mvc.perform(
                        get(STATUS)
                                .with(user("alice@example.test").roles("USER"))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentId").value(500))
                .andExpect(jsonPath("$.status").value("PENDING_PAYMENT"))
                .andExpect(jsonPath("$.currency").value("THB"));
    }

    // API-PAY-004 — Cancel response
    @Test
    void ownerCancelHttpContractReturns200() throws Exception {
        when(paymentService.cancel(eq(500L), any()))
                .thenReturn(new ApiDtos.MockPaymentStatusDto(
                        500L,
                        "CANCELLED",
                        new BigDecimal("500.00"),
                        "THB",
                        null,
                        null
                ));

        mvc.perform(
                        post(CANCEL)
                                .with(user("alice@example.test").roles("USER"))
                                .with(csrf())
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }
}