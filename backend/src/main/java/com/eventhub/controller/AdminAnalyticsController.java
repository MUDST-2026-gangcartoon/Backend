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
        throw notImplemented();
    }

    @GetMapping("/events/{eventId}")
    public ApiDtos.EventAnalyticsDto eventSummary(
            @PathVariable Long eventId
    ) {
        throw notImplemented();
    }

    private UnsupportedOperationException notImplemented() {
        return new UnsupportedOperationException(
                "AdminAnalyticsController is not implemented"
        );
    }
}