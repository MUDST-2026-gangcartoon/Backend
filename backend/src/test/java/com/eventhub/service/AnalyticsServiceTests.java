package com.eventhub.service;

import com.eventhub.dto.ApiDtos;
import com.eventhub.model.Event;
import com.eventhub.model.PageView;
import com.eventhub.repository.EventRepository;
import com.eventhub.repository.PageViewRepository;
import com.eventhub.repository.RegistrationRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTests {

    @Mock
    private PageViewRepository pageViewRepository;

    @Mock
    private EventRepository eventRepository;

    @Mock
    private RegistrationRepository registrationRepository;

    private AnalyticsService analyticsService;

    @BeforeEach
    void setUp() {

        analyticsService =
                new AnalyticsService(
                        pageViewRepository,
                        eventRepository,
                        registrationRepository
                );
    }

    private Event event(
            long id,
            String title,
            int capacity
    ) {

        Event event = new Event();

        ReflectionTestUtils.setField(
                event,
                "id",
                id
        );

        event.setTitle(title);
        event.setDescription("Analytics test event");
        event.setLocation("Bangkok");

        event.setStartsAt(
                LocalDateTime.of(
                        2027,
                        6,
                        1,
                        10,
                        0
                )
        );

        event.setCapacity(capacity);
        event.setCategory("TECH");

        return event;
    }

    private ResponseStatusException assertStatus(
            HttpStatus expectedStatus,
            Runnable action
    ) {

        ResponseStatusException exception =
                assertThrows(
                        ResponseStatusException.class,
                        action::run
                );

        assertEquals(
                expectedStatus.value(),
                exception
                        .getStatusCode()
                        .value()
        );

        return exception;
    }
    // ============================================================
    // EVT-AN-001 — Record Site Visit
    // ============================================================

    @Test
    void shouldRecordSiteVisit() {

        ApiDtos.AnalyticsVisitRequest request =
                new ApiDtos.AnalyticsVisitRequest(
                        " site ",
                        null
                );

        analyticsService.recordVisit(
                request,
                "session-001"
        );

        ArgumentCaptor<PageView> captor =
                ArgumentCaptor.forClass(
                        PageView.class
                );

        verify(pageViewRepository)
                .save(captor.capture());

        PageView saved =
                captor.getValue();

        assertEquals(
                "SITE",
                saved.getType()
        );

        assertNull(
                saved.getEventId()
        );

        assertEquals(
                "session-001",
                saved.getSessionId()
        );

        assertNotNull(
                saved.getViewedAt()
        );
    }

    @Test
    void shouldRecordEverySiteVisitWithoutDeduplication() {

        ApiDtos.AnalyticsVisitRequest request =
                new ApiDtos.AnalyticsVisitRequest(
                        "SITE",
                        null
                );

        analyticsService.recordVisit(
                request,
                "same-session"
        );

        analyticsService.recordVisit(
                request,
                "same-session"
        );

        analyticsService.recordVisit(
                request,
                "same-session"
        );

        ArgumentCaptor<PageView> captor =
                ArgumentCaptor.forClass(
                        PageView.class
                );

        verify(
                pageViewRepository,
                times(3)
        ).save(
                captor.capture()
        );

        List<PageView> savedViews =
                captor.getAllValues();

        assertEquals(
                3,
                savedViews.size()
        );

        assertTrue(
                savedViews.stream()
                        .allMatch(view ->
                                "SITE".equals(
                                        view.getType()
                                )
                                        &&
                                        "same-session".equals(
                                                view.getSessionId()
                                        )
                        )
        );
    }
    // ============================================================
    // EVT-AN-002 — Event Detail Visit
    // ============================================================

    @Test
    void shouldRecordEventDetailVisitWhenEventExists() {

        Event existing =
                event(
                        123L,
                        "Spring Boot Workshop",
                        50
                );

        // รองรับได้ทั้ง implementation ที่เลือก
        // existsById หรือ findById
        lenient()
                .when(
                        eventRepository.existsById(
                                123L
                        )
                )
                .thenReturn(true);

        lenient()
                .when(
                        eventRepository.findById(
                                123L
                        )
                )
                .thenReturn(
                        Optional.of(existing)
                );

        ApiDtos.AnalyticsVisitRequest request =
                new ApiDtos.AnalyticsVisitRequest(
                        "EVENT",
                        123L
                );

        analyticsService.recordVisit(
                request,
                "session-event-001"
        );

        ArgumentCaptor<PageView> captor =
                ArgumentCaptor.forClass(
                        PageView.class
                );

        verify(pageViewRepository)
                .save(captor.capture());

        PageView saved =
                captor.getValue();

        assertEquals(
                "EVENT",
                saved.getType()
        );

        assertEquals(
                123L,
                saved.getEventId()
        );

        assertEquals(
                "session-event-001",
                saved.getSessionId()
        );
    }

    @Test
    void shouldReturnNotFoundWhenEventVisitTargetsUnknownEvent() {

        lenient()
                .when(
                        eventRepository.existsById(
                                999L
                        )
                )
                .thenReturn(false);

        lenient()
                .when(
                        eventRepository.findById(
                                999L
                        )
                )
                .thenReturn(
                        Optional.empty()
                );

        ApiDtos.AnalyticsVisitRequest request =
                new ApiDtos.AnalyticsVisitRequest(
                        "EVENT",
                        999L
                );

        assertStatus(
                HttpStatus.NOT_FOUND,
                () -> analyticsService.recordVisit(
                        request,
                        "session-001"
                )
        );

        verify(
                pageViewRepository,
                never()
        ).save(any());
    }
    // ============================================================
    // EVT-AN-003 — Analytics Visit Validation
    // ============================================================

    @Test
    void shouldRejectSiteVisitWithEventId() {

        ApiDtos.AnalyticsVisitRequest request =
                new ApiDtos.AnalyticsVisitRequest(
                        "SITE",
                        123L
                );

        assertStatus(
                HttpStatus.BAD_REQUEST,
                () -> analyticsService.recordVisit(
                        request,
                        "session-001"
                )
        );

        verify(
                pageViewRepository,
                never()
        ).save(any());
    }

    @Test
    void shouldRejectNullSessionId() {

        ApiDtos.AnalyticsVisitRequest request =
                new ApiDtos.AnalyticsVisitRequest(
                        "SITE",
                        null
                );

        assertStatus(
                HttpStatus.BAD_REQUEST,
                () -> analyticsService.recordVisit(
                        request,
                        null
                )
        );

        verify(
                pageViewRepository,
                never()
        ).save(any());
    }


    @Test
    void shouldRejectBlankSessionId() {

        ApiDtos.AnalyticsVisitRequest request =
                new ApiDtos.AnalyticsVisitRequest(
                        "SITE",
                        null
                );

        assertStatus(
                HttpStatus.BAD_REQUEST,
                () -> analyticsService.recordVisit(
                        request,
                        "   "
                )
        );

        verify(
                pageViewRepository,
                never()
        ).save(any());
    }

    @Test
    void shouldRejectUnsupportedAnalyticsType() {

        ApiDtos.AnalyticsVisitRequest request =
                new ApiDtos.AnalyticsVisitRequest(
                        "OTHER",
                        null
                );

        assertStatus(
                HttpStatus.BAD_REQUEST,
                () -> analyticsService.recordVisit(
                        request,
                        "session-001"
                )
        );

        verify(
                pageViewRepository,
                never()
        ).save(any());
    }

    @Test
    void shouldRejectNullAnalyticsType() {

        ApiDtos.AnalyticsVisitRequest request =
                new ApiDtos.AnalyticsVisitRequest(
                        null,
                        null
                );

        assertStatus(
                HttpStatus.BAD_REQUEST,
                () -> analyticsService.recordVisit(
                        request,
                        "session-001"
                )
        );

        verify(
                pageViewRepository,
                never()
        ).save(any());
    }


    @Test
    void shouldRejectBlankAnalyticsType() {

        ApiDtos.AnalyticsVisitRequest request =
                new ApiDtos.AnalyticsVisitRequest(
                        "   ",
                        null
                );

        assertStatus(
                HttpStatus.BAD_REQUEST,
                () -> analyticsService.recordVisit(
                        request,
                        "session-001"
                )
        );

        verify(
                pageViewRepository,
                never()
        ).save(any());
    }
    // ============================================================
    // EVT-AN-004 — Global Analytics Summary
    // ============================================================

    @Test
    void shouldReturnGlobalAnalyticsSummary() {

        when(
                registrationRepository.count()
        ).thenReturn(
                10L
        );

        when(
                eventRepository.count()
        ).thenReturn(
                4L
        );

        when(
                eventRepository.countOpen(
                        any(LocalDateTime.class)
                )
        ).thenReturn(
                3L
        );

        when(
                pageViewRepository.countByType(
                        "SITE"
                )
        ).thenReturn(
                50L
        );

        when(
                pageViewRepository.countByType(
                        "EVENT"
                )
        ).thenReturn(
                20L
        );

        when(
                pageViewRepository.uniqueSessions(
                        "SITE"
                )
        ).thenReturn(
                15L
        );

        ApiDtos.AnalyticsSummaryDto result =
                analyticsService.summary();

        assertEquals(
                10L,
                result.totalRegistrations()
        );

        assertEquals(
                4L,
                result.totalEvents()
        );

        assertEquals(
                3L,
                result.totalOpenEvents()
        );

        assertEquals(
                50L,
                result.siteViews()
        );

        assertEquals(
                20L,
                result.eventDetailViews()
        );

        assertEquals(
                15L,
                result.uniqueVisitors()
        );

        verify(registrationRepository)
                .count();

        verify(eventRepository)
                .count();

        verify(eventRepository)
                .countOpen(
                        any(LocalDateTime.class)
                );

        verify(pageViewRepository)
                .countByType("SITE");

        verify(pageViewRepository)
                .countByType("EVENT");

        verify(pageViewRepository)
                .uniqueSessions("SITE");
    }
    // ============================================================
    // EVT-AN-008 — Raw Views vs Unique Visitors
    // ============================================================

    @Test
    void shouldKeepRawSiteViewsSeparateFromUniqueVisitors() {

        when(
                registrationRepository.count()
        ).thenReturn(0L);

        when(
                eventRepository.count()
        ).thenReturn(0L);

        when(
                eventRepository.countOpen(
                        any(LocalDateTime.class)
                )
        ).thenReturn(0L);

        // session เดิมเข้ามา 3 ครั้ง
        when(
                pageViewRepository.countByType(
                        "SITE"
                )
        ).thenReturn(
                3L
        );

        when(
                pageViewRepository.countByType(
                        "EVENT"
                )
        ).thenReturn(
                0L
        );

        // distinct session = 1
        when(
                pageViewRepository.uniqueSessions(
                        "SITE"
                )
        ).thenReturn(
                1L
        );

        ApiDtos.AnalyticsSummaryDto result =
                analyticsService.summary();

        assertEquals(
                3L,
                result.siteViews()
        );

        assertEquals(
                1L,
                result.uniqueVisitors()
        );
    }
    // ============================================================
    // EVT-AN-005 — Per-Event Analytics
    // ============================================================

    @Test
    void shouldReturnAnalyticsForExistingEvent() {

        Event existing =
                event(
                        123L,
                        "Spring Boot Workshop",
                        50
                );

        when(
                eventRepository.findById(
                        123L
                )
        ).thenReturn(
                Optional.of(existing)
        );

        when(
                pageViewRepository
                        .countByTypeAndEventId(
                                "EVENT",
                                123L
                        )
        ).thenReturn(
                25L
        );

        when(
                registrationRepository.countByEventId(
                        123L
                )
        ).thenReturn(
                4L
        );

        when(
                registrationRepository
                        .seatsReservedByEventId(
                                123L
                        )
        ).thenReturn(
                7L
        );

        ApiDtos.EventAnalyticsDto result =
                analyticsService.eventSummary(
                        123L
                );

        assertEquals(
                123L,
                result.eventId()
        );

        assertEquals(
                "Spring Boot Workshop",
                result.title()
        );

        assertEquals(
                25L,
                result.views()
        );

        assertEquals(
                4L,
                result.registrations()
        );

        assertEquals(
                7L,
                result.registeredSeats()
        );

        assertEquals(
                50,
                result.capacity()
        );

        assertEquals(
                43L,
                result.spotsLeft()
        );
    }
    @Test
    void shouldReturnNotFoundForUnknownEventAnalytics() {

        when(
                eventRepository.findById(
                        999L
                )
        ).thenReturn(
                Optional.empty()
        );

        assertStatus(
                HttpStatus.NOT_FOUND,
                () -> analyticsService.eventSummary(
                        999L
                )
        );

        verifyNoInteractions(
                pageViewRepository,
                registrationRepository
        );
    }
    @Test
    void eventAnalyticsSpotsLeftShouldNeverBeNegative() {

        Event existing =
                event(
                        123L,
                        "Oversold Fixture",
                        50
                );

        when(
                eventRepository.findById(
                        123L
                )
        ).thenReturn(
                Optional.of(existing)
        );

        when(
                pageViewRepository
                        .countByTypeAndEventId(
                                "EVENT",
                                123L
                        )
        ).thenReturn(10L);

        when(
                registrationRepository.countByEventId(
                        123L
                )
        ).thenReturn(5L);

        when(
                registrationRepository
                        .seatsReservedByEventId(
                                123L
                        )
        ).thenReturn(
                60L
        );

        ApiDtos.EventAnalyticsDto result =
                analyticsService.eventSummary(
                        123L
                );

        assertEquals(
                0L,
                result.spotsLeft()
        );
    }
}