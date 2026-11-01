package com.eventhub.controller;

import com.eventhub.service.*;
import java.security.Principal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class BookingToolsController {

    private final BookingToolsService tools;
    private final EventService events;

    public BookingToolsController(BookingToolsService t, EventService e) {
        tools = t;
        events = e;
    }

    @GetMapping("/payments/mock/history")
    public Object history(
        Principal p,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "ALL") String status
    ) {
        return tools.history(p, page, status);
    }

    @GetMapping("/payments/mock/{id}/resume")
    public Object resume(@PathVariable Long id, Principal p) {
        return tools.resume(id, p);
    }

    @GetMapping("/admin/events/{id}/report")
    public Object report(@PathVariable Long id) {
        return tools.report(id);
    }

    @GetMapping("/admin/analytics/operations")
    public Object totals() {
        return tools.totals();
    }

    public record Cancellation(String reason) {}

    @PostMapping("/events/{id}/registrations/cancel")
    public void cancel(
        @PathVariable Long id,
        Principal p,
        @RequestBody Cancellation input
    ) {
        events.cancel(id, p, input.reason());
    }
}
