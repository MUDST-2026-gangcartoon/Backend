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

    private ApiDtos.EventDto eventDto() {

        return new ApiDtos.EventDto(
                100L,
                "EventHub Workshop",
                "Backend workshop",
                "Bangkok",
                LocalDateTime.of(
                        2027, 6, 1, 10, 0
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
                        2027, 5, 1, 9, 0
                ),
                2,
                "GTH-ABC1234567",
                "General",
                new BigDecimal("500.00"),
                eventDto()
        );
    }
    // EVT-API-001 Public Event Detail
    @Test
    void eventDetailShouldBePublic() throws Exception {

        ApiDtos.EventDto response =
                eventDto();

        when(
                eventService.get(
                        eq(100L),
                        isNull()
                )
        ).thenReturn(response);

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
                );

        verify(eventService)
                .get(
                        eq(100L),
                        isNull()
                );
    }
    @Test
    void eventDetailShouldAllowAuthenticatedRoles()
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
                .andExpect(status().isOk());

        mockMvc.perform(
                        get("/api/events/100")
                                .with(
                                        user(
                                                "staff@example.test"
                                        ).roles("STAFF")
                                )
                )
                .andExpect(status().isOk());

        mockMvc.perform(
                        get("/api/events/100")
                                .with(
                                        user(
                                                "admin@example.test"
                                        ).roles("ADMIN")
                                )
                )
                .andExpect(status().isOk());
    }
    // EVT-API-002 Register ผ่าน HTTP
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

        verifyNoInteractions(eventService);
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

        verifyNoInteractions(eventService);
    }
    // EVT-API-003 Cancel Registration
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

        verifyNoInteractions(eventService);
    }
    // EVT-API-004 My Registrations
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

        verifyNoInteractions(eventService);
    }
    private ApiDtos.EventPageDto eventPageDto() {

        return new ApiDtos.EventPageDto(
                List.of(
                        eventDto()
                ),
                0,
                20,
                1L,
                1,
                false,
                false,
                1L,
                10L
        );
    }
    // ============================================================
    // EVT-API-012 — Public Event List
    // ============================================================

    @Test
    void eventListShouldBePublicAndUseDefaultParameters()
            throws Exception {

        when(
                eventService.list(
                        isNull(),
                        eq(0),
                        eq(20),
                        isNull(),
                        isNull(),
                        isNull()
                )
        ).thenReturn(
                eventPageDto()
        );

        mockMvc.perform(
                        get("/api/events")
                )
                .andExpect(
                        status().isOk()
                )
                .andExpect(
                        jsonPath("$.page")
                                .value(0)
                )
                .andExpect(
                        jsonPath("$.size")
                                .value(20)
                )
                .andExpect(
                        jsonPath("$.totalElements")
                                .value(1)
                )
                .andExpect(
                        jsonPath("$.items[0].id")
                                .value(100)
                )
                .andExpect(
                        jsonPath("$.items[0].title")
                                .value(
                                        "EventHub Workshop"
                                )
                );

        verify(eventService)
                .list(
                        isNull(),
                        eq(0),
                        eq(20),
                        isNull(),
                        isNull(),
                        isNull()
                );
    }
    @Test
    void eventListShouldForwardExplicitQueryParameters()
            throws Exception {

        ApiDtos.EventPageDto response =
                new ApiDtos.EventPageDto(
                        List.of(
                                eventDto()
                        ),
                        2,
                        5,
                        11L,
                        3,
                        true,
                        true,
                        4L,
                        25L
                );

        when(
                eventService.list(
                        isNull(),
                        eq(2),
                        eq(5),
                        eq("java"),
                        eq("TECH"),
                        eq("OPEN")
                )
        ).thenReturn(
                response
        );

        mockMvc.perform(
                        get("/api/events")
                                .param(
                                        "page",
                                        "2"
                                )
                                .param(
                                        "size",
                                        "5"
                                )
                                .param(
                                        "search",
                                        "java"
                                )
                                .param(
                                        "category",
                                        "TECH"
                                )
                                .param(
                                        "status",
                                        "OPEN"
                                )
                )
                .andExpect(
                        status().isOk()
                )
                .andExpect(
                        jsonPath("$.page")
                                .value(2)
                )
                .andExpect(
                        jsonPath("$.size")
                                .value(5)
                )
                .andExpect(
                        jsonPath("$.totalElements")
                                .value(11)
                );

        verify(eventService)
                .list(
                        isNull(),
                        eq(2),
                        eq(5),
                        eq("java"),
                        eq("TECH"),
                        eq("OPEN")
                );
    }
    @Test
    void eventListShouldAllowUserStaffAndAdmin()
            throws Exception {

        when(
                eventService.list(
                        any(Principal.class),
                        eq(0),
                        eq(20),
                        isNull(),
                        isNull(),
                        isNull()
                )
        ).thenReturn(
                eventPageDto()
        );

        mockMvc.perform(
                        get("/api/events")
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
                        get("/api/events")
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
                        get("/api/events")
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
        ).list(
                any(Principal.class),
                eq(0),
                eq(20),
                isNull(),
                isNull(),
                isNull()
        );
    }
    @Test
    void eventListShouldForwardAuthenticatedPrincipal()
            throws Exception {

        when(
                eventService.list(
                        any(Principal.class),
                        eq(0),
                        eq(20),
                        isNull(),
                        isNull(),
                        isNull()
                )
        ).thenReturn(
                eventPageDto()
        );

        mockMvc.perform(
                        get("/api/events")
                                .with(
                                        user(
                                                "alice@example.test"
                                        ).roles("USER")
                                )
                )
                .andExpect(
                        status().isOk()
                );

        verify(eventService)
                .list(
                        argThat(principal ->
                                principal != null
                                        &&
                                        principal.getName()
                                                .equals(
                                                        "alice@example.test"
                                                )
                        ),
                        eq(0),
                        eq(20),
                        isNull(),
                        isNull(),
                        isNull()
                );
    }
}
