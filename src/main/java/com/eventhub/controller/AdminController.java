package com.eventhub.controller;

import com.eventhub.dto.ApiDtos;
import com.eventhub.service.EventService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final EventService eventService;

    public AdminController(
            EventService eventService
    ) {
        this.eventService = eventService;
    }

    @PostMapping("/events")
    public ApiDtos.EventDto create(
            @Valid @RequestBody ApiDtos.EventRequest body
    ) {
        throw notImplemented();
    }

    @PutMapping("/events/{eventId}")
    public ApiDtos.EventDto update(
            @PathVariable Long eventId,
            @Valid @RequestBody ApiDtos.EventRequest body
    ) {
        throw notImplemented();
    }

    @DeleteMapping("/events/{eventId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long eventId
    ) {
        throw notImplemented();
    }

    @GetMapping("/events/{eventId}/attendees")
    public List<ApiDtos.AttendeeDto> attendees(
            @PathVariable Long eventId
    ) {
        throw notImplemented();
    }

    private UnsupportedOperationException notImplemented() {
        return new UnsupportedOperationException(
                "AdminController is not implemented"
        );
    }
}