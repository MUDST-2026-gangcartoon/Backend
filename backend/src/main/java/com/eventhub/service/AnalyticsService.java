package com.eventhub.service;

import com.eventhub.dto.ApiDtos;
import com.eventhub.repository.EventRepository;
import com.eventhub.repository.PageViewRepository;
import com.eventhub.repository.RegistrationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnalyticsService {

    private final PageViewRepository pageViewRepository;
    private final EventRepository eventRepository;
    private final RegistrationRepository registrationRepository;

    public AnalyticsService(
            PageViewRepository pageViewRepository,
            EventRepository eventRepository,
            RegistrationRepository registrationRepository
    ) {
        this.pageViewRepository = pageViewRepository;
        this.eventRepository = eventRepository;
        this.registrationRepository = registrationRepository;
    }

    @Transactional
    public void recordVisit(
            ApiDtos.AnalyticsVisitRequest request,
            String sessionId
    ) {
        throw notImplemented();
    }

    @Transactional(readOnly = true)
    public ApiDtos.AnalyticsSummaryDto summary() {
        throw notImplemented();
    }

    @Transactional(readOnly = true)
    public ApiDtos.EventAnalyticsDto eventSummary(
            Long eventId
    ) {
        throw notImplemented();
    }

    private UnsupportedOperationException notImplemented() {
        return new UnsupportedOperationException(
                "Analytics business logic is not implemented"
        );
    }
}