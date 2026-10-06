package com.eventhub.controller;

import com.eventhub.dto.ApiDtos;
import com.eventhub.service.EventService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
public class EventController {

    private final EventService eventService;

    public EventController(
            EventService eventService
    ) {
        this.eventService = eventService;
    }

    @GetMapping("/api/events")
    public ApiDtos.EventPageDto events(
            Principal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status
    ) {
        return eventService.list(
                principal,
                page,
                size,
                search,
                category,
                status
        );
    }

    @GetMapping("/api/events/{eventId}")
    public ApiDtos.EventDto event(
            @PathVariable Long eventId,
            Principal principal
    ) {
        return eventService.get(
                eventId,
                principal
        );
    }

    @PostMapping("/api/events/{eventId}/registrations")
    public ApiDtos.RegistrationDto register(
            @PathVariable Long eventId,
            @Valid @RequestBody ApiDtos.PurchaseRequest body,
            Principal principal
    ) {
        return eventService.register(
                eventId,
                body,
                principal
        );
    }

    @DeleteMapping("/api/events/{eventId}/registrations")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(
            @PathVariable Long eventId,
            Principal principal
    ) {
        eventService.cancel(
                eventId,
                principal
        );
    }

    @GetMapping("/api/registrations/me")
    public List<ApiDtos.RegistrationDto> mine(
            Principal principal
    ) {
        return eventService.mine(principal);
    }

    private UnsupportedOperationException notImplemented() {
        return new UnsupportedOperationException(
                "EventController is not implemented"
        );
    }
}