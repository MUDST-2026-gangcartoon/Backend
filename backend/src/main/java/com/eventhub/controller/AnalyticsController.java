package com.eventhub.controller;

import com.eventhub.dto.ApiDtos;
import com.eventhub.service.AnalyticsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(
            AnalyticsService analyticsService
    ) {
        this.analyticsService = analyticsService;
    }

    @PostMapping("/visit")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void visit(
            @Valid @RequestBody ApiDtos.AnalyticsVisitRequest body,
            HttpServletRequest request
    ) {
        throw notImplemented();
    }

    private UnsupportedOperationException notImplemented() {
        return new UnsupportedOperationException(
                "AnalyticsController is not implemented"
        );
    }
}