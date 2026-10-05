package com.eventhub.controller;

import com.eventhub.dto.ApiDtos;
import com.eventhub.service.EventService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
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
class StaffControllerHttpTests {

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
                LocalDateTime.of(
                        2027,
                        6,
                        1,
                        9,
                        30
                )
        );
    }

    private ApiDtos.CheckInDto checkInDto() {

        return new ApiDtos.CheckInDto(
                "GTH-ABC1234567",
                "Alice",
                "Event A",
                "General",
                2,
                true,
                LocalDateTime.of(
                        2027,
                        6,
                        1,
                        9,
                        30
                )
        );
    }

    // ============================================================
    // EVT-STAFF-009 — HTTP Authorization
    // GET route
    // ============================================================

    @Test
    void anonymousShouldNotAccessStaffApi()
            throws Exception {

        mockMvc.perform(
                        get(
                                "/api/staff/events/100/attendees"
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
    void userShouldNotAccessStaffApi()
            throws Exception {

        mockMvc.perform(
                        get(
                                "/api/staff/events/100/attendees"
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

        verifyNoInteractions(
                eventService
        );
    }

    @Test
    void staffShouldAccessStaffGetRoute()
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
                                "/api/staff/events/100/attendees"
                        )
                                .with(
                                        user(
                                                "staff@example.test"
                                        ).roles("STAFF")
                                )
                )
                .andExpect(
                        status().isOk()
                );

        verify(eventService)
                .attendees(100L);
    }

    @Test
    void adminShouldAccessStaffGetRoute()
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
                                "/api/staff/events/100/attendees"
                        )
                                .with(
                                        user(
                                                "admin@example.test"
                                        ).roles("ADMIN")
                                )
                )
                .andExpect(
                        status().isOk()
                );

        verify(eventService)
                .attendees(100L);
    }

    // ============================================================
    // EVT-STAFF-009 / EVT-API-010
    // POST Authorization + CSRF
    // ============================================================

    @Test
    void anonymousShouldNotCheckIn()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/staff/events/100/check-in"
                        )
                                .with(csrf())
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "ticketCode":
                                          "GTH-ABC1234567"
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
    void userShouldNotCheckIn()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/staff/events/100/check-in"
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
                                          "ticketCode":
                                          "GTH-ABC1234567"
                                        }
                                        """)
                )
                .andExpect(
                        status().isForbidden()
                );

        verifyNoInteractions(
                eventService
        );
    }

    @Test
    void staffCheckInWithoutCsrfShouldBeForbidden()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/staff/events/100/check-in"
                        )
                                .with(
                                        user(
                                                "staff@example.test"
                                        ).roles("STAFF")
                                )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content("""
                                        {
                                          "ticketCode":
                                          "GTH-ABC1234567"
                                        }
                                        """)
                )
                .andExpect(
                        status().isForbidden()
                );

        verifyNoInteractions(
                eventService
        );
    }

    @Test
    void staffShouldCheckInWithCsrf()
            throws Exception {

        when(
                eventService.checkIn(
                        100L,
                        "GTH-ABC1234567"
                )
        ).thenReturn(
                checkInDto()
        );

        mockMvc.perform(
                        post(
                                "/api/staff/events/100/check-in"
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
                                          "ticketCode":
                                          "GTH-ABC1234567"
                                        }
                                        """)
                )
                .andExpect(
                        status().isOk()
                )
                .andExpect(
                        jsonPath("$.ticketCode")
                                .value(
                                        "GTH-ABC1234567"
                                )
                )
                .andExpect(
                        jsonPath("$.checkedIn")
                                .value(true)
                );

        verify(eventService)
                .checkIn(
                        100L,
                        "GTH-ABC1234567"
                );
    }

    @Test
    void adminShouldCheckInThroughStaffApi()
            throws Exception {

        when(
                eventService.checkIn(
                        100L,
                        "GTH-ABC1234567"
                )
        ).thenReturn(
                checkInDto()
        );

        mockMvc.perform(
                        post(
                                "/api/staff/events/100/check-in"
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
                                          "ticketCode":
                                          "GTH-ABC1234567"
                                        }
                                        """)
                )
                .andExpect(
                        status().isOk()
                );

        verify(eventService)
                .checkIn(
                        100L,
                        "GTH-ABC1234567"
                );
    }

    // ============================================================
    // EVT-STAFF-010 — Check-in Validation
    // ============================================================

    @Test
    void nullTicketCodeShouldReturnBadRequest()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/staff/events/100/check-in"
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
                                          "ticketCode": null
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

    @Test
    void blankTicketCodeShouldReturnBadRequest()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/staff/events/100/check-in"
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
                                          "ticketCode": "   "
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

    @Test
    void ticketCodeLongerThan32CharactersShouldReturnBadRequest()
            throws Exception {

        String tooLongCode =
                "A".repeat(33);

        mockMvc.perform(
                        post(
                                "/api/staff/events/100/check-in"
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
                                .content(
                                        """
                                        {
                                          "ticketCode": "%s"
                                        }
                                        """.formatted(
                                                tooLongCode
                                        )
                                )
                )
                .andExpect(
                        status().isBadRequest()
                );

        verifyNoInteractions(
                eventService
        );
    }

    // ============================================================
    // EVT-API-009 — Staff Attendees
    // ============================================================

    @Test
    void staffAttendeesShouldReturnAttendeeDtos()
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
                                "/api/staff/events/100/attendees"
                        )
                                .with(
                                        user(
                                                "staff@example.test"
                                        ).roles("STAFF")
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
                )
                .andExpect(
                        jsonPath("$[0].quantity")
                                .value(2)
                );

        verify(eventService)
                .attendees(100L);
    }

    // ============================================================
    // EVT-API-010 — Staff Check-in
    // ============================================================

    @Test
    void validCheckInShouldDelegateToService()
            throws Exception {

        when(
                eventService.checkIn(
                        100L,
                        "GTH-ABC1234567"
                )
        ).thenReturn(
                checkInDto()
        );

        mockMvc.perform(
                        post(
                                "/api/staff/events/100/check-in"
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
                                          "ticketCode":
                                          "GTH-ABC1234567"
                                        }
                                        """)
                )
                .andExpect(
                        status().isOk()
                )
                .andExpect(
                        jsonPath("$.attendeeName")
                                .value("Alice")
                )
                .andExpect(
                        jsonPath("$.eventTitle")
                                .value("Event A")
                )
                .andExpect(
                        jsonPath("$.checkedIn")
                                .value(true)
                );

        verify(eventService)
                .checkIn(
                        100L,
                        "GTH-ABC1234567"
                );
    }

    // ============================================================
    // EVT-API-011 — Recent Check-ins
    // ============================================================

    @Test
    void staffShouldGetRecentCheckIns()
            throws Exception {

        when(
                eventService.recentCheckIns(
                        100L
                )
        ).thenReturn(
                List.of(
                        attendeeDto()
                )
        );

        mockMvc.perform(
                        get(
                                "/api/staff/events/100/recent-check-ins"
                        )
                                .with(
                                        user(
                                                "staff@example.test"
                                        ).roles("STAFF")
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
                        jsonPath("$[0].checkedInAt")
                                .exists()
                );

        verify(eventService)
                .recentCheckIns(
                        100L
                );
    }
}