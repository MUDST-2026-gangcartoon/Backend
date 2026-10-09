package com.eventhub.controller;

import com.eventhub.dto.ApiDtos;
import com.eventhub.service.AnalyticsService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/analytics")
public class AdminAnalyticsController {

    private final AnalyticsService analyticsService;

    public AdminAnalyticsController(
            AnalyticsService analyticsService
    ) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/summary")
    public ApiDtos.AnalyticsSummaryDto summary() {
        return analyticsService.summary();
    }

    @GetMapping("/events/{eventId}")
    public ApiDtos.EventAnalyticsDto eventSummary(
            @PathVariable Long eventId
    ) {
        return analyticsService.eventSummary(
                eventId
        );
    }

    private UnsupportedOperationException notImplemented() {
        return new UnsupportedOperationException(
                "AdminAnalyticsController is not implemented"
        );
    }
}