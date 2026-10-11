
package com.eventhub.controller;

import com.eventhub.dto.ApiDtos;
import com.eventhub.service.EventService;
import com.eventhub.service.UploadStorageService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final EventService eventService;
    private final UploadStorageService uploadStorageService;

    public AdminController(
            EventService eventService,
            UploadStorageService uploadStorageService
    ) {
        this.eventService = eventService;
        this.uploadStorageService = uploadStorageService;
    }

    @PostMapping("/uploads")
    public Map<String, String> uploadImage(
            @RequestParam("file") MultipartFile file
    ) {
        return Map.of(
                "url",
                uploadStorageService.storeImage(file)
        );
    }

    @PostMapping("/events")
    public ApiDtos.EventDto create(
            @Valid @RequestBody ApiDtos.EventRequest body
    ) {
        return eventService.create(body);
    }

    @PutMapping("/events/{eventId}")
    public ApiDtos.EventDto update(
            @PathVariable Long eventId,
            @Valid @RequestBody ApiDtos.EventRequest body
    ) {
        return eventService.update(eventId, body);
    }

    @DeleteMapping("/events/{eventId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long eventId
    ) {
        eventService.delete(eventId);
    }

    @GetMapping("/events/{eventId}/attendees")
    public List<ApiDtos.AttendeeDto> attendees(
            @PathVariable Long eventId
    ) {
        return eventService.attendees(eventId);
    }
}