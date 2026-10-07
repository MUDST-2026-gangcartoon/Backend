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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.mockito.Mockito.*;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@Import(AdminAnalyticsControllerHttpTests.MockConfig.class)
class AdminAnalyticsControllerHttpTests {

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

    private ApiDtos.AnalyticsSummaryDto summaryDto() {

        return new ApiDtos.AnalyticsSummaryDto(
                10L,
                4L,
                3L,
                50L,
                20L,
                15L
        );
    }

    private ApiDtos.EventAnalyticsDto eventAnalyticsDto() {

        return new ApiDtos.EventAnalyticsDto(
                123L,
                "Spring Boot Workshop",
                25L,
                4L,
                7L,
                50,
                43L
        );
    }

    // ============================================================
    // EVT-AN-007 — Summary Authorization
    // ============================================================

    @Test
    void summaryShouldRejectAnonymousUserAndStaff()
            throws Exception {

        mockMvc.perform(
                        get(
                                "/api/admin/analytics/summary"
                        )
                )
                .andExpect(
                        status().isUnauthorized()
                );

        mockMvc.perform(
                        get(
                                "/api/admin/analytics/summary"
                        )
                                .with(
                                        user(
                                                "user@example.test"
                                        ).roles("USER")
                                )
                )
                .andExpect(
                        status().isForbidden()
                );

        mockMvc.perform(
                        get(
                                "/api/admin/analytics/summary"
                        )
                                .with(
                                        user(
                                                "staff@example.test"
                                        ).roles("STAFF")
                                )
                )
                .andExpect(
                        status().isForbidden()
                );

        verifyNoInteractions(
                analyticsService
        );
    }

    @Test
    void adminShouldGetAnalyticsSummary()
            throws Exception {

        when(
                analyticsService.summary()
        ).thenReturn(
                summaryDto()
        );

        mockMvc.perform(
                        get(
                                "/api/admin/analytics/summary"
                        )
                                .with(
                                        user(
                                                "admin@example.test"
                                        ).roles("ADMIN")
                                )
                )
                .andExpect(
                        status().isOk()
                )
                .andExpect(
                        jsonPath(
                                "$.totalRegistrations"
                        ).value(10)
                )
                .andExpect(
                        jsonPath(
                                "$.totalEvents"
                        ).value(4)
                )
                .andExpect(
                        jsonPath(
                                "$.totalOpenEvents"
                        ).value(3)
                )
                .andExpect(
                        jsonPath(
                                "$.siteViews"
                        ).value(50)
                )
                .andExpect(
                        jsonPath(
                                "$.eventDetailViews"
                        ).value(20)
                )
                .andExpect(
                        jsonPath(
                                "$.uniqueVisitors"
                        ).value(15)
                );

        verify(analyticsService)
                .summary();
    }

    // ============================================================
    // EVT-AN-007 — Event Analytics Authorization
    // ============================================================

    @Test
    void eventAnalyticsShouldRejectAnonymousUserAndStaff()
            throws Exception {

        mockMvc.perform(
                        get(
                                "/api/admin/analytics/events/123"
                        )
                )
                .andExpect(
                        status().isUnauthorized()
                );

        mockMvc.perform(
                        get(
                                "/api/admin/analytics/events/123"
                        )
                                .with(
                                        user(
                                                "user@example.test"
                                        ).roles("USER")
                                )
                )
                .andExpect(
                        status().isForbidden()
                );

        mockMvc.perform(
                        get(
                                "/api/admin/analytics/events/123"
                        )
                                .with(
                                        user(
                                                "staff@example.test"
                                        ).roles("STAFF")
                                )
                )
                .andExpect(
                        status().isForbidden()
                );

        verifyNoInteractions(
                analyticsService
        );
    }

    @Test
    void adminShouldGetEventAnalytics()
            throws Exception {

        when(
                analyticsService.eventSummary(
                        123L
                )
        ).thenReturn(
                eventAnalyticsDto()
        );

        mockMvc.perform(
                        get(
                                "/api/admin/analytics/events/123"
                        )
                                .with(
                                        user(
                                                "admin@example.test"
                                        ).roles("ADMIN")
                                )
                )
                .andExpect(
                        status().isOk()
                )
                .andExpect(
                        jsonPath("$.eventId")
                                .value(123)
                )
                .andExpect(
                        jsonPath("$.title")
                                .value(
                                        "Spring Boot Workshop"
                                )
                )
                .andExpect(
                        jsonPath("$.views")
                                .value(25)
                )
                .andExpect(
                        jsonPath("$.registrations")
                                .value(4)
                )
                .andExpect(
                        jsonPath("$.registeredSeats")
                                .value(7)
                )
                .andExpect(
                        jsonPath("$.capacity")
                                .value(50)
                )
                .andExpect(
                        jsonPath("$.spotsLeft")
                                .value(43)
                );

        verify(analyticsService)
                .eventSummary(
                        123L
                );
    }
}