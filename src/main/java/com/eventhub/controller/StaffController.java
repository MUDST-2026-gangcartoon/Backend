package com.eventhub.controller;

import com.eventhub.dto.ApiDtos;
import com.eventhub.service.EventService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/staff/events")
public class StaffController {

    private final EventService eventService;

    public StaffController(
            EventService eventService
    ) {
        this.eventService = eventService;
    }

    @GetMapping("/{eventId}/attendees")
    public List<ApiDtos.AttendeeDto> attendees(
            @PathVariable Long eventId
    ) {
        return eventService.attendees(eventId);
    }

    @PostMapping("/{eventId}/check-in")
    public ApiDtos.CheckInDto checkIn(
            @PathVariable Long eventId,
            @Valid @RequestBody ApiDtos.CheckInRequest body
    ) {
        return eventService.checkIn(
                eventId,
                body.ticketCode()
        );
    }

    @GetMapping("/{eventId}/recent-check-ins")
    public List<ApiDtos.AttendeeDto> recentCheckIns(
            @PathVariable Long eventId
    ) {
        return eventService.recentCheckIns(eventId);
    }

    private UnsupportedOperationException notImplemented() {
        return new UnsupportedOperationException(
                "StaffController is not implemented"
        );
    }
}