package com.eventhub.controller;

import com.eventhub.dto.ApiDtos;
import com.eventhub.service.EventService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@Import(ControllerHttpTestConfig.class)
class EventControllerHttpTests {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private EventService eventService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {

        reset(eventService);

        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    // ============================================================
    // Test Fixtures
    // ============================================================

    private ApiDtos.EventDto eventDto() {

        return new ApiDtos.EventDto(
                100L,
                "EventHub Workshop",
                "Backend workshop",
                "Bangkok",
                LocalDateTime.of(
                        2027,
                        6,
                        1,
                        10,
                        0
                ),
                100,
                "TECH",
                null,
                List.of(),
                10L,
                90L,
                "OPEN",
                false,
                List.of()
        );
    }

    private ApiDtos.RegistrationDto registrationDto() {

        return new ApiDtos.RegistrationDto(
                500L,
                LocalDateTime.of(
                        2027,
                        5,
                        1,
                        9,
                        0
                ),
                2,
                "GTH-ABC1234567",
                "General",
                new BigDecimal("500.00"),
                eventDto()
        );
    }

    // ============================================================
    // EVT-API-001 — Public Event Detail
    // ============================================================

    @Test
    void eventDetailShouldBePublicForAnonymousUser()
            throws Exception {

        when(
                eventService.get(
                        eq(100L),
                        isNull()
                )
        ).thenReturn(
                eventDto()
        );

        mockMvc.perform(
                        get("/api/events/100")
                )
                .andExpect(
                        status().isOk()
                )
                .andExpect(
                        jsonPath("$.id")
                                .value(100)
                )
                .andExpect(
                        jsonPath("$.title")
                                .value(
                                        "EventHub Workshop"
                                )
                )
                .andExpect(
                        jsonPath("$.category")
                                .value("TECH")
                );

        verify(eventService)
                .get(
                        eq(100L),
                        isNull()
                );
    }

    @Test
    void eventDetailShouldAllowUserStaffAndAdmin()
            throws Exception {

        when(
                eventService.get(
                        eq(100L),
                        any(Principal.class)
                )
        ).thenReturn(
                eventDto()
        );

        mockMvc.perform(
                        get("/api/events/100")
                                .with(
                                        user(
                                                "user@example.test"
                                        ).roles("USER")
                                )
                )
                .andExpect(
                        status().isOk()
                );

        mockMvc.perform(
                        get("/api/events/100")
                                .with(
                                        user(
                                                "staff@example.test"
                                        ).roles("STAFF")
                                )
                )
                .andExpect(
                        status().isOk()
                );

        mockMvc.perform(
                        get("/api/events/100")
                                .with(
                                        user(
                                                "admin@example.test"
                                        ).roles("ADMIN")
                                )
                )
                .andExpect(
                        status().isOk()
                );

        verify(
                eventService,
                times(3)
        ).get(
                eq(100L),
                any(Principal.class)
        );
    }

    // ============================================================
    // EVT-API-002 — Register
    // ============================================================

    @Test
    @WithMockUser(
            username = "alice@example.test",
            roles = "USER"
    )
    void authenticatedUserShouldRegisterThroughHttp()
            throws Exception {

        when(
                eventService.register(
                        eq(100L),
                        any(ApiDtos.PurchaseRequest.class),
                        any(Principal.class)
                )
        ).thenReturn(
                registrationDto()
        );

        mockMvc.perform(
                        post(
                                "/api/events/100/registrations"
                        )
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "ticketTypeId": 200,
                                          "quantity": 2
                                        }
                                        """)
                )
                .andExpect(
                        status().isOk()
                )
                .andExpect(
                        jsonPath("$.id")
                                .value(500)
                )
                .andExpect(
                        jsonPath("$.quantity")
                                .value(2)
                )
                .andExpect(
                        jsonPath("$.ticketCode")
                                .value(
                                        "GTH-ABC1234567"
                                )
                );

        verify(eventService)
                .register(
                        eq(100L),

                        argThat(request ->
                                request.ticketTypeId()
                                        .equals(200L)
                                        &&
                                        request.quantity()
                                                .equals(2)
                        ),

                        argThat(principal ->
                                principal != null
                                        &&
                                        principal.getName()
                                                .equals(
                                                        "alice@example.test"
                                                )
                        )
                );
    }

    @Test
    void anonymousUserShouldNotRegister()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/events/100/registrations"
                        )
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "ticketTypeId": 200,
                                          "quantity": 2
                                        }
                                        """)
                )
                .andExpect(
                        status().isUnauthorized()
                );

        verifyNoInteractions(
                eventService
        );
    }

    @Test
    @WithMockUser(
            username = "alice@example.test",
            roles = "USER"
    )
    void invalidPurchaseRequestShouldReturnBadRequest()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/events/100/registrations"
                        )
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "ticketTypeId": 200,
                                          "quantity": 0
                                        }
                                        """)
                )
                .andExpect(
                        status().isBadRequest()
                );

        verifyNoInteractions(
                eventService
        );
    }

    // ============================================================
    // EVT-API-003 — Cancel Registration
    // ============================================================

    @Test
    @WithMockUser(
            username = "alice@example.test",
            roles = "USER"
    )
    void authenticatedUserShouldCancelRegistration()
            throws Exception {

        mockMvc.perform(
                        delete(
                                "/api/events/100/registrations"
                        )
                                .with(csrf())
                )
                .andExpect(
                        status().isNoContent()
                );

        verify(eventService)
                .cancel(
                        eq(100L),

                        argThat(principal ->
                                principal != null
                                        &&
                                        principal.getName()
                                                .equals(
                                                        "alice@example.test"
                                                )
                        )
                );
    }

    @Test
    void anonymousUserShouldNotCancelRegistration()
            throws Exception {

        mockMvc.perform(
                        delete(
                                "/api/events/100/registrations"
                        )
                                .with(csrf())
                )
                .andExpect(
                        status().isUnauthorized()
                );

        verifyNoInteractions(
                eventService
        );
    }

    // ============================================================
    // EVT-API-004 — My Registrations
    // ============================================================

    @Test
    @WithMockUser(
            username = "alice@example.test",
            roles = "USER"
    )
    void authenticatedUserShouldGetOwnRegistrations()
            throws Exception {

        when(
                eventService.mine(
                        any(Principal.class)
                )
        ).thenReturn(
                List.of(
                        registrationDto()
                )
        );

        mockMvc.perform(
                        get(
                                "/api/registrations/me"
                        )
                )
                .andExpect(
                        status().isOk()
                )
                .andExpect(
                        jsonPath("$[0].id")
                                .value(500)
                )
                .andExpect(
                        jsonPath("$[0].quantity")
                                .value(2)
                )
                .andExpect(
                        jsonPath("$[0].ticketCode")
                                .value(
                                        "GTH-ABC1234567"
                                )
                );

        verify(eventService)
                .mine(
                        argThat(principal ->
                                principal != null
                                        &&
                                        principal.getName()
                                                .equals(
                                                        "alice@example.test"
                                                )
                        )
                );
    }

    @Test
    void anonymousUserShouldNotGetMyRegistrations()
            throws Exception {

        mockMvc.perform(
                        get(
                                "/api/registrations/me"
                        )
                )
                .andExpect(
                        status().isUnauthorized()
                );

        verifyNoInteractions(
                eventService
        );
    }
}