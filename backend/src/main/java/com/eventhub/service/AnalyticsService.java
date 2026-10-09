package com.eventhub.service;

import com.eventhub.dto.ApiDtos;
import com.eventhub.repository.EventRepository;
import com.eventhub.repository.PageViewRepository;
import com.eventhub.repository.RegistrationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.eventhub.model.PageView;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
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
        if (sessionId == null
                || sessionId.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Session ID is required"
            );
        }

        String type =
                request.type();

        if (type == null
                || type.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Analytics type is required"
            );
        }

        type = type
                .trim()
                .toUpperCase(Locale.ROOT);

        if (!type.equals("SITE")
                && !type.equals("EVENT")) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported analytics type"
            );
        }

        Long eventId =
                request.eventId();

        if (type.equals("SITE")) {

            if (eventId != null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "SITE visit must not contain eventId"
                );
            }

        } else {

            if (eventId == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "EVENT visit requires eventId"
                );
            }

            if (!eventRepository.existsById(eventId)) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Event not found"
                );
            }
        }

        pageViewRepository.save(
                new PageView(
                        type,
                        eventId,
                        sessionId
                )
        );
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