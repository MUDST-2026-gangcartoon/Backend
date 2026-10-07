package com.eventhub.controller;

import com.eventhub.dto.ApiDtos;
import com.eventhub.service.AnalyticsService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.junit.jupiter.api.Assertions.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@Import(AnalyticsControllerHttpTests.MockConfig.class)
class AnalyticsControllerHttpTests {

    @TestConfiguration
    static class MockConfig {

        @Bean
        @Primary
        AnalyticsService mockAnalyticsService() {
            return mock(
                    AnalyticsService.class
            );
        }
    }

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private AnalyticsService analyticsService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {

        reset(
                analyticsService
        );

        mockMvc =
                MockMvcBuilders
                        .webAppContextSetup(context)
                        .apply(springSecurity())
                        .build();
    }

    // ============================================================
    // EVT-AN-006 — Public Analytics HTTP Contract
    // ============================================================

    @Test
    void anonymousShouldRecordSiteVisitUsingServerSession()
            throws Exception {

        MockHttpSession session =
                new MockHttpSession();

        mockMvc.perform(
                        post(
                                "/api/analytics/visit"
                        )
                                .session(session)
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "type": " site ",
                                          "eventId": null
                                        }
                                        """)
                )
                .andExpect(
                        status().isNoContent()
                );

        verify(analyticsService)
                .recordVisit(
                        argThat(request ->
                                "SITE".equals(
                                        request.type()
                                )
                                        &&
                                        request.eventId() == null
                        ),
                        eq(
                                session.getId()
                        )
                );
    }

    @Test
    void userStaffAndAdminShouldUsePublicAnalyticsEndpoint()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/analytics/visit"
                        )
                                .session(
                                        new MockHttpSession()
                                )
                                .with(
                                        user(
                                                "user@example.test"
                                        ).roles("USER")
                                )
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "type": "SITE",
                                          "eventId": null
                                        }
                                        """)
                )
                .andExpect(
                        status().isNoContent()
                );

        mockMvc.perform(
                        post(
                                "/api/analytics/visit"
                        )
                                .session(
                                        new MockHttpSession()
                                )
                                .with(
                                        user(
                                                "staff@example.test"
                                        ).roles("STAFF")
                                )
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "type": "SITE",
                                          "eventId": null
                                        }
                                        """)
                )
                .andExpect(
                        status().isNoContent()
                );

        mockMvc.perform(
                        post(
                                "/api/analytics/visit"
                        )
                                .session(
                                        new MockHttpSession()
                                )
                                .with(
                                        user(
                                                "admin@example.test"
                                        ).roles("ADMIN")
                                )
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "type": "SITE",
                                          "eventId": null
                                        }
                                        """)
                )
                .andExpect(
                        status().isNoContent()
                );

        verify(
                analyticsService,
                times(3)
        ).recordVisit(
                argThat(request ->
                        "SITE".equals(
                                request.type()
                        )
                ),
                argThat(sessionId ->
                        sessionId != null
                                &&
                                !sessionId.isBlank()
                )
        );
    }

    @Test
    void analyticsVisitWithoutCsrfShouldBeForbidden()
            throws Exception {

        MockHttpSession session =
                new MockHttpSession();

        mockMvc.perform(
                        post(
                                "/api/analytics/visit"
                        )
                                .session(session)
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "type": "SITE",
                                          "eventId": null
                                        }
                                        """)
                )
                .andExpect(
                        status().isForbidden()
                );

        verifyNoInteractions(
                analyticsService
        );
    }

    // ============================================================
    // EVT-AN-003 / EVT-AN-006 — HTTP Bean Validation
    // ============================================================

    @Test
    void nullAnalyticsTypeShouldReturnBadRequest()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/analytics/visit"
                        )
                                .session(
                                        new MockHttpSession()
                                )
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "type": null,
                                          "eventId": null
                                        }
                                        """)
                )
                .andExpect(
                        status().isBadRequest()
                );

        verifyNoInteractions(
                analyticsService
        );
    }

    @Test
    void blankAnalyticsTypeShouldReturnBadRequest()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/analytics/visit"
                        )
                                .session(
                                        new MockHttpSession()
                                )
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "type": "   ",
                                          "eventId": null
                                        }
                                        """)
                )
                .andExpect(
                        status().isBadRequest()
                );

        verifyNoInteractions(
                analyticsService
        );
    }

    @Test
    void unsupportedAnalyticsTypeShouldReturnBadRequest()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/analytics/visit"
                        )
                                .session(
                                        new MockHttpSession()
                                )
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "type": "OTHER",
                                          "eventId": null
                                        }
                                        """)
                )
                .andExpect(
                        status().isBadRequest()
                );

        verifyNoInteractions(
                analyticsService
        );
    }
}