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
class AdminControllerHttpTests {

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
    // Fixtures
    // ============================================================

    private ApiDtos.EventDto eventDto() {

        return new ApiDtos.EventDto(
                100L,
                "Admin Event",
                "Created by admin",
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
                0L,
                100L,
                "OPEN",
                false,
                List.of()
        );
    }

    private ApiDtos.AttendeeDto attendeeDto() {

        return new ApiDtos.AttendeeDto(
                10L,
                "Alice",
                "alice@example.test",
                LocalDateTime.of(
                        2027,
                        5,
                        1,
                        9,
                        0
                ),
                "General",
                2,
                "GTH-ABC1234567",
                null
        );
    }

    private String validEventRequestJson() {

        return """
                {
                  "title": "Admin Event",
                  "description": "Created by admin",
                  "location": "Bangkok",
                  "startsAt": "2027-06-01T10:00:00",
                  "capacity": 100,
                  "category": "TECH",
                  "imageUrl": null,
                  "detailImages": [],
                  "ticketTypes": [
                    {
                      "id": null,
                      "name": "General",
                      "description": "General ticket",
                      "price": 100.00,
                      "capacity": 100
                    }
                  ]
                }
                """;
    }

    // ============================================================
    // EVT-API-005 — Admin Create Event
    // ============================================================

    @Test
    @WithMockUser(
            username = "admin@example.test",
            roles = "ADMIN"
    )
    void adminShouldCreateEvent()
            throws Exception {

        when(
                eventService.create(
                        any(ApiDtos.EventRequest.class)
                )
        ).thenReturn(
                eventDto()
        );

        mockMvc.perform(
                        post("/api/admin/events")
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        validEventRequestJson()
                                )
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
                                .value("Admin Event")
                );

        verify(eventService)
                .create(
                        argThat(request ->
                                request.title()
                                        .equals("Admin Event")
                                        &&
                                        request.capacity() == 100
                        )
                );
    }

    @Test
    void anonymousShouldNotCreateAdminEvent()
            throws Exception {

        mockMvc.perform(
                        post("/api/admin/events")
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        validEventRequestJson()
                                )
                )
                .andExpect(
                        status().isUnauthorized()
                );

        verifyNoInteractions(
                eventService
        );
    }

    @Test
    void userAndStaffShouldNotCreateAdminEvent()
            throws Exception {

        mockMvc.perform(
                        post("/api/admin/events")
                                .with(
                                        user(
                                                "user@example.test"
                                        ).roles("USER")
                                )
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        validEventRequestJson()
                                )
                )
                .andExpect(
                        status().isForbidden()
                );

        mockMvc.perform(
                        post("/api/admin/events")
                                .with(
                                        user(
                                                "staff@example.test"
                                        ).roles("STAFF")
                                )
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        validEventRequestJson()
                                )
                )
                .andExpect(
                        status().isForbidden()
                );

        verifyNoInteractions(
                eventService
        );
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void invalidAdminEventRequestShouldReturn400()
            throws Exception {

        mockMvc.perform(
                        post("/api/admin/events")
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "title": "",
                                          "description": "Invalid",
                                          "location": "Bangkok",
                                          "startsAt": "2027-06-01T10:00:00",
                                          "capacity": 0,
                                          "category": "INVALID",
                                          "detailImages": [],
                                          "ticketTypes": []
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
    // EVT-API-006 — Admin Update Event
    // ============================================================

    @Test
    @WithMockUser(
            username = "admin@example.test",
            roles = "ADMIN"
    )
    void adminShouldUpdateEvent()
            throws Exception {

        when(
                eventService.update(
                        eq(100L),
                        any(ApiDtos.EventRequest.class)
                )
        ).thenReturn(
                eventDto()
        );

        mockMvc.perform(
                        put("/api/admin/events/100")
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        validEventRequestJson()
                                )
                )
                .andExpect(
                        status().isOk()
                )
                .andExpect(
                        jsonPath("$.id")
                                .value(100)
                );

        verify(eventService)
                .update(
                        eq(100L),
                        any(ApiDtos.EventRequest.class)
                );
    }

    @Test
    void userShouldNotUpdateAdminEvent()
            throws Exception {

        mockMvc.perform(
                        put("/api/admin/events/100")
                                .with(
                                        user(
                                                "user@example.test"
                                        ).roles("USER")
                                )
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        validEventRequestJson()
                                )
                )
                .andExpect(
                        status().isForbidden()
                );

        verifyNoInteractions(
                eventService
        );
    }

    // ============================================================
    // EVT-API-007 — Admin Delete Event
    // ============================================================

    @Test
    @WithMockUser(
            username = "admin@example.test",
            roles = "ADMIN"
    )
    void adminShouldDeleteEvent()
            throws Exception {

        mockMvc.perform(
                        delete(
                                "/api/admin/events/100"
                        )
                                .with(csrf())
                )
                .andExpect(
                        status().isNoContent()
                );

        verify(eventService)
                .delete(100L);
    }

    @Test
    void userShouldNotDeleteAdminEvent()
            throws Exception {

        mockMvc.perform(
                        delete(
                                "/api/admin/events/100"
                        )
                                .with(
                                        user(
                                                "user@example.test"
                                        ).roles("USER")
                                )
                                .with(csrf())
                )
                .andExpect(
                        status().isForbidden()
                );

        verifyNoInteractions(
                eventService
        );
    }

    // ============================================================
    // EVT-API-008 — Admin Attendees
    // ============================================================

    @Test
    @WithMockUser(
            username = "admin@example.test",
            roles = "ADMIN"
    )
    void adminShouldGetEventAttendees()
            throws Exception {

        when(
                eventService.attendees(100L)
        ).thenReturn(
                List.of(
                        attendeeDto()
                )
        );

        mockMvc.perform(
                        get(
                                "/api/admin/events/100/attendees"
                        )
                )
                .andExpect(
                        status().isOk()
                )
                .andExpect(
                        jsonPath("$[0].id")
                                .value(10)
                )
                .andExpect(
                        jsonPath("$[0].name")
                                .value("Alice")
                )
                .andExpect(
                        jsonPath("$[0].ticketType")
                                .value("General")
                );

        verify(eventService)
                .attendees(100L);
    }

    @Test
    void staffShouldNotAccessAdminAttendees()
            throws Exception {

        mockMvc.perform(
                        get(
                                "/api/admin/events/100/attendees"
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
                eventService
        );
    }
}