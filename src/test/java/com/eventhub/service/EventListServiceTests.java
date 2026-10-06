package com.eventhub.service;

import com.eventhub.dto.ApiDtos;
import com.eventhub.dto.EventListRow;
import com.eventhub.dto.TicketTypeRow;
import com.eventhub.model.Role;
import com.eventhub.model.UserAccount;
import com.eventhub.repository.EventRepository;
import com.eventhub.repository.RegistrationRepository;
import com.eventhub.repository.TicketTypeRepository;
import com.eventhub.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EventListServiceTests {

    @Mock
    private EventRepository eventRepository;

    @Mock
    private RegistrationRepository registrationRepository;

    @Mock
    private TicketTypeRepository ticketTypeRepository;

    @Mock
    private UserRepository userRepository;

    private EventService eventService;

    @BeforeEach
    void setUp() {

        eventService = new EventService(
                eventRepository,
                registrationRepository,
                ticketTypeRepository,
                userRepository
        );
    }

    // ============================================================
    // Fixtures
    // ============================================================

    private EventListRow eventRow(
            long id,
            int capacity,
            long registeredCount,
            boolean registered
    ) {

        return new EventListRow(
                id,
                "Event " + id,
                "Event description",
                "Bangkok",
                LocalDateTime.of(
                        2027,
                        6,
                        1,
                        10,
                        0
                ),
                capacity,
                "TECH",
                "https://example.test/event.jpg",
                null,
                registeredCount,
                registered
        );
    }

    private TicketTypeRow ticketRow(
            long eventId,
            long ticketId,
            int capacity,
            long sold
    ) {

        return new TicketTypeRow(
                eventId,
                ticketId,
                "General",
                "General ticket",
                new BigDecimal("250.00"),
                capacity,
                sold
        );
    }

    private UserAccount user(
            long id,
            String email
    ) {

        UserAccount user =
                new UserAccount(
                        "Alice",
                        email,
                        "synthetic-password-hash",
                        Role.USER
                );

        ReflectionTestUtils.setField(
                user,
                "id",
                id
        );

        return user;
    }

    private Page<EventListRow> emptyPage(
            int page,
            int size
    ) {

        return new PageImpl<>(
                List.of(),
                PageRequest.of(
                        page,
                        size
                ),
                0
        );
    }

    private void stubGlobalTotals(
            long totalOpen,
            long totalRegistrations
    ) {

        when(
                eventRepository.countOpen(
                        any(LocalDateTime.class)
                )
        ).thenReturn(totalOpen);

        when(
                registrationRepository.count()
        ).thenReturn(totalRegistrations);
    }
    // ============================================================
    // EVT-LIST-001 — Anonymous
    // ============================================================

    @Test
    void shouldListEventsAnonymouslyAndNormalizeNullFiltersToAll() {

        when(
                eventRepository.search(
                        isNull(),
                        isNull(),
                        eq("ALL"),
                        eq("ALL"),
                        any(LocalDateTime.class),
                        any(Pageable.class)
                )
        ).thenReturn(
                emptyPage(
                        0,
                        20
                )
        );

        stubGlobalTotals(
                3L,
                10L
        );

        ApiDtos.EventPageDto result =
                eventService.list(
                        null,
                        0,
                        20,
                        null,
                        null,
                        null
                );

        assertNotNull(result);
        assertTrue(result.items().isEmpty());

        verifyNoInteractions(
                userRepository
        );

        verify(eventRepository)
                .search(
                        isNull(),
                        isNull(),
                        eq("ALL"),
                        eq("ALL"),
                        any(LocalDateTime.class),
                        any(Pageable.class)
                );
    }

    @Test
    void shouldNormalizeBlankCategoryAndStatusToAll() {

        when(
                eventRepository.search(
                        isNull(),
                        eq("java"),
                        eq("ALL"),
                        eq("ALL"),
                        any(LocalDateTime.class),
                        any(Pageable.class)
                )
        ).thenReturn(
                emptyPage(
                        0,
                        20
                )
        );

        stubGlobalTotals(
                0L,
                0L
        );

        eventService.list(
                null,
                0,
                20,
                "java",
                "   ",
                "   "
        );

        verify(eventRepository)
                .search(
                        isNull(),
                        eq("java"),
                        eq("ALL"),
                        eq("ALL"),
                        any(LocalDateTime.class),
                        any(Pageable.class)
                );
    }

    @Test
    void shouldTrimAndUppercaseCategoryAndStatus() {

        when(
                eventRepository.search(
                        isNull(),
                        eq("java"),
                        eq("TECH"),
                        eq("REGISTERED"),
                        any(LocalDateTime.class),
                        any(Pageable.class)
                )
        ).thenReturn(
                emptyPage(
                        0,
                        20
                )
        );

        stubGlobalTotals(
                0L,
                0L
        );

        eventService.list(
                null,
                0,
                20,
                "java",
                "  tech  ",
                "  registered  "
        );

        verify(eventRepository)
                .search(
                        isNull(),
                        eq("java"),
                        eq("TECH"),
                        eq("REGISTERED"),
                        any(LocalDateTime.class),
                        any(Pageable.class)
                );
    }

    @Test
    void shouldRejectUnsupportedCategory() {

        ResponseStatusException exception =
                assertThrows(
                        ResponseStatusException.class,
                        () -> eventService.list(
                                null,
                                0,
                                20,
                                null,
                                "MUSIC",
                                null
                        )
                );

        assertEquals(
                HttpStatus.BAD_REQUEST.value(),
                exception
                        .getStatusCode()
                        .value()
        );

        verify(
                eventRepository,
                never()
        ).search(
                any(),
                any(),
                any(),
                any(),
                any(),
                any()
        );
    }

    @Test
    void shouldRejectUnsupportedStatus() {

        ResponseStatusException exception =
                assertThrows(
                        ResponseStatusException.class,
                        () -> eventService.list(
                                null,
                                0,
                                20,
                                null,
                                null,
                                "CANCELLED"
                        )
                );

        assertEquals(
                HttpStatus.BAD_REQUEST.value(),
                exception
                        .getStatusCode()
                        .value()
        );

        verify(
                eventRepository,
                never()
        ).search(
                any(),
                any(),
                any(),
                any(),
                any(),
                any()
        );
    }
    // ============================================================
    // EVT-LIST-002 — Authenticated User
    // ============================================================

    @Test
    void shouldUseAuthenticatedUserIdWhenListingEvents() {

        UserAccount alice =
                user(
                        10L,
                        "alice@example.test"
                );

        Principal principal =
                () -> "alice@example.test";

        when(
                userRepository.findByEmail(
                        "alice@example.test"
                )
        ).thenReturn(
                Optional.of(alice)
        );

        EventListRow row =
                eventRow(
                        100L,
                        100,
                        5L,
                        true
                );

        Page<EventListRow> page =
                new PageImpl<>(
                        List.of(row),
                        PageRequest.of(
                                0,
                                20
                        ),
                        1
                );

        when(
                eventRepository.search(
                        eq(10L),
                        isNull(),
                        eq("ALL"),
                        eq("ALL"),
                        any(LocalDateTime.class),
                        any(Pageable.class)
                )
        ).thenReturn(page);

        when(
                ticketTypeRepository
                        .summariesForEventIds(
                                List.of(100L)
                        )
        ).thenReturn(
                List.of()
        );

        stubGlobalTotals(
                1L,
                5L
        );

        ApiDtos.EventPageDto result =
                eventService.list(
                        principal,
                        0,
                        20,
                        null,
                        null,
                        null
                );

        assertEquals(
                1,
                result.items().size()
        );

        assertTrue(
                result.items()
                        .get(0)
                        .registered()
        );

        verify(userRepository)
                .findByEmail(
                        "alice@example.test"
                );

        verify(eventRepository)
                .search(
                        eq(10L),
                        isNull(),
                        eq("ALL"),
                        eq("ALL"),
                        any(LocalDateTime.class),
                        any(Pageable.class)
                );
    }
    // ============================================================
    // EVT-LIST-003 — Unresolved Principal
    // ============================================================

    @Test
    void shouldTreatUnknownAuthenticatedUserAsAnonymous() {

        Principal principal =
                () -> "missing@example.test";

        when(
                userRepository.findByEmail(
                        "missing@example.test"
                )
        ).thenReturn(
                Optional.empty()
        );

        when(
                eventRepository.search(
                        isNull(),
                        isNull(),
                        eq("ALL"),
                        eq("ALL"),
                        any(LocalDateTime.class),
                        any(Pageable.class)
                )
        ).thenReturn(
                emptyPage(
                        0,
                        20
                )
        );

        stubGlobalTotals(
                2L,
                10L
        );

        assertDoesNotThrow(
                () -> eventService.list(
                        principal,
                        0,
                        20,
                        null,
                        null,
                        null
                )
        );

        verify(userRepository)
                .findByEmail(
                        "missing@example.test"
                );

        verify(eventRepository)
                .search(
                        isNull(),
                        isNull(),
                        eq("ALL"),
                        eq("ALL"),
                        any(LocalDateTime.class),
                        any(Pageable.class)
                );
    }

    @Test
    void registeredFilterWithUnknownUserShouldSearchAsAnonymous() {

        Principal principal =
                () -> "missing@example.test";

        when(
                userRepository.findByEmail(
                        "missing@example.test"
                )
        ).thenReturn(
                Optional.empty()
        );

        when(
                eventRepository.search(
                        isNull(),
                        isNull(),
                        eq("ALL"),
                        eq("REGISTERED"),
                        any(LocalDateTime.class),
                        any(Pageable.class)
                )
        ).thenReturn(
                emptyPage(
                        0,
                        20
                )
        );

        stubGlobalTotals(
                4L,
                30L
        );

        ApiDtos.EventPageDto result =
                eventService.list(
                        principal,
                        0,
                        20,
                        null,
                        null,
                        "REGISTERED"
                );

        assertTrue(
                result.items().isEmpty()
        );

        verify(eventRepository)
                .search(
                        isNull(),
                        isNull(),
                        eq("ALL"),
                        eq("REGISTERED"),
                        any(LocalDateTime.class),
                        any(Pageable.class)
                );
    }
    // ============================================================
    // EVT-LIST-006 — Pagination
    // ============================================================

    @Test
    void shouldUseRequestedPageAndSize() {

        when(
                eventRepository.search(
                        isNull(),
                        isNull(),
                        eq("ALL"),
                        eq("ALL"),
                        any(LocalDateTime.class),
                        any(Pageable.class)
                )
        ).thenReturn(
                emptyPage(
                        2,
                        5
                )
        );

        stubGlobalTotals(
                0L,
                0L
        );

        eventService.list(
                null,
                2,
                5,
                null,
                null,
                null
        );

        ArgumentCaptor<Pageable> captor =
                ArgumentCaptor.forClass(
                        Pageable.class
                );

        verify(eventRepository)
                .search(
                        isNull(),
                        isNull(),
                        eq("ALL"),
                        eq("ALL"),
                        any(LocalDateTime.class),
                        captor.capture()
                );

        Pageable pageable =
                captor.getValue();

        assertEquals(
                2,
                pageable.getPageNumber()
        );

        assertEquals(
                5,
                pageable.getPageSize()
        );
    }
    @Test
    void shouldReturnMetadataFromFilteredRepositoryPage() {

        EventListRow row =
                eventRow(
                        100L,
                        100,
                        10L,
                        false
                );

        Page<EventListRow> repositoryPage =
                new PageImpl<>(
                        List.of(row),
                        PageRequest.of(
                                2,
                                5
                        ),
                        13L
                );

        when(
                eventRepository.search(
                        isNull(),
                        eq("java"),
                        eq("TECH"),
                        eq("OPEN"),
                        any(LocalDateTime.class),
                        any(Pageable.class)
                )
        ).thenReturn(
                repositoryPage
        );

        when(
                ticketTypeRepository
                        .summariesForEventIds(
                                List.of(100L)
                        )
        ).thenReturn(
                List.of()
        );

        stubGlobalTotals(
                9L,
                42L
        );

        ApiDtos.EventPageDto result =
                eventService.list(
                        null,
                        2,
                        5,
                        "java",
                        "TECH",
                        "OPEN"
                );

        assertEquals(
                13L,
                result.totalElements()
        );

        assertEquals(
                3,
                result.totalPages()
        );

        assertFalse(
                result.hasNext()
        );

        assertTrue(
                result.hasPrevious()
        );
    }
    // ============================================================
    // EVT-LIST-007 — Event Mapping
    // ============================================================

    @Test
    void shouldMapEventListRowToEventDto() {

        EventListRow row =
                eventRow(
                        100L,
                        100,
                        25L,
                        true
                );

        when(
                eventRepository.search(
                        isNull(),
                        isNull(),
                        eq("ALL"),
                        eq("ALL"),
                        any(LocalDateTime.class),
                        any(Pageable.class)
                )
        ).thenReturn(
                new PageImpl<>(
                        List.of(row),
                        PageRequest.of(
                                0,
                                20
                        ),
                        1
                )
        );

        when(
                ticketTypeRepository
                        .summariesForEventIds(
                                List.of(100L)
                        )
        ).thenReturn(
                List.of()
        );

        stubGlobalTotals(
                1L,
                25L
        );

        ApiDtos.EventPageDto result =
                eventService.list(
                        null,
                        0,
                        20,
                        null,
                        null,
                        null
                );

        assertEquals(
                1,
                result.items().size()
        );

        ApiDtos.EventDto event =
                result.items().get(0);

        assertEquals(
                100L,
                event.id()
        );

        assertEquals(
                "Event 100",
                event.title()
        );

        assertEquals(
                "Event description",
                event.description()
        );

        assertEquals(
                "Bangkok",
                event.location()
        );

        assertEquals(
                100,
                event.capacity()
        );

        assertEquals(
                "TECH",
                event.category()
        );

        assertEquals(
                25L,
                event.registeredCount()
        );

        assertEquals(
                75L,
                event.spotsLeft()
        );

        assertTrue(
                event.registered()
        );
    }
    @Test
    void spotsLeftShouldNeverBeNegative() {

        EventListRow row =
                eventRow(
                        100L,
                        100,
                        120L,
                        false
                );

        when(
                eventRepository.search(
                        any(),
                        any(),
                        anyString(),
                        anyString(),
                        any(LocalDateTime.class),
                        any(Pageable.class)
                )
        ).thenReturn(
                new PageImpl<>(
                        List.of(row),
                        PageRequest.of(
                                0,
                                20
                        ),
                        1
                )
        );

        when(
                ticketTypeRepository
                        .summariesForEventIds(
                                List.of(100L)
                        )
        ).thenReturn(
                List.of()
        );

        stubGlobalTotals(
                0L,
                120L
        );

        ApiDtos.EventPageDto result =
                eventService.list(
                        null,
                        0,
                        20,
                        null,
                        null,
                        null
                );

        assertEquals(
                0L,
                result.items()
                        .get(0)
                        .spotsLeft()
        );
    }
    @Test
    void shouldLoadTicketSummariesInSingleBatchForCurrentPage() {

        EventListRow eventA =
                eventRow(
                        100L,
                        100,
                        10L,
                        false
                );

        EventListRow eventB =
                eventRow(
                        101L,
                        50,
                        5L,
                        true
                );

        when(
                eventRepository.search(
                        any(),
                        any(),
                        anyString(),
                        anyString(),
                        any(LocalDateTime.class),
                        any(Pageable.class)
                )
        ).thenReturn(
                new PageImpl<>(
                        List.of(
                                eventA,
                                eventB
                        ),
                        PageRequest.of(
                                0,
                                20
                        ),
                        2
                )
        );

        when(
                ticketTypeRepository
                        .summariesForEventIds(
                                argThat(ids ->
                                        ids.size() == 2
                                                &&
                                                ids.contains(100L)
                                                &&
                                                ids.contains(101L)
                                )
                        )
        ).thenReturn(
                List.of(
                        ticketRow(
                                100L,
                                200L,
                                100,
                                10L
                        ),
                        ticketRow(
                                101L,
                                201L,
                                50,
                                5L
                        )
                )
        );

        stubGlobalTotals(
                2L,
                15L
        );

        ApiDtos.EventPageDto result =
                eventService.list(
                        null,
                        0,
                        20,
                        null,
                        null,
                        null
                );

        verify(
                ticketTypeRepository,
                times(1)
        ).summariesForEventIds(
                argThat(ids ->
                        ids.size() == 2
                                &&
                                ids.contains(100L)
                                &&
                                ids.contains(101L)
                )
        );

        assertEquals(
                1,
                result.items()
                        .get(0)
                        .ticketTypes()
                        .size()
        );

        assertEquals(
                1,
                result.items()
                        .get(1)
                        .ticketTypes()
                        .size()
        );

        ApiDtos.TicketTypeDto firstTicket =
                result.items()
                        .get(0)
                        .ticketTypes()
                        .get(0);

        assertEquals(
                200L,
                firstTicket.id()
        );

        assertEquals(
                "General",
                firstTicket.name()
        );

        assertEquals(
                100,
                firstTicket.capacity()
        );

        assertEquals(
                10L,
                firstTicket.sold()
        );

        assertEquals(
                90L,
                firstTicket.remaining()
        );
    }
    @Test
    void ticketRemainingShouldNeverBeNegative() {

        EventListRow row =
                eventRow(
                        100L,
                        100,
                        100L,
                        false
                );

        when(
                eventRepository.search(
                        any(),
                        any(),
                        anyString(),
                        anyString(),
                        any(LocalDateTime.class),
                        any(Pageable.class)
                )
        ).thenReturn(
                new PageImpl<>(
                        List.of(row),
                        PageRequest.of(
                                0,
                                20
                        ),
                        1
                )
        );

        when(
                ticketTypeRepository
                        .summariesForEventIds(
                                List.of(100L)
                        )
        ).thenReturn(
                List.of(
                        ticketRow(
                                100L,
                                200L,
                                100,
                                120L
                        )
                )
        );

        stubGlobalTotals(
                0L,
                120L
        );

        ApiDtos.EventPageDto result =
                eventService.list(
                        null,
                        0,
                        20,
                        null,
                        null,
                        null
                );

        assertEquals(
                0L,
                result.items()
                        .get(0)
                        .ticketTypes()
                        .get(0)
                        .remaining()
        );
    }
    @Test
    void shouldNotLoadTicketSummariesWhenEventPageIsEmpty() {

        when(
                eventRepository.search(
                        isNull(),
                        isNull(),
                        eq("ALL"),
                        eq("ALL"),
                        any(LocalDateTime.class),
                        any(Pageable.class)
                )
        ).thenReturn(
                emptyPage(
                        0,
                        20
                )
        );

        stubGlobalTotals(
                0L,
                0L
        );

        ApiDtos.EventPageDto result =
                eventService.list(
                        null,
                        0,
                        20,
                        null,
                        null,
                        null
                );

        assertTrue(
                result.items().isEmpty()
        );

        verify(
                ticketTypeRepository,
                never()
        ).summariesForEventIds(
                anyCollection()
        );
    }
    // ============================================================
    // EVT-LIST-008 — Global Summary
    // ============================================================

    @Test
    void shouldReturnGlobalOpenEventAndRegistrationTotals() {

        EventListRow filteredEvent =
                eventRow(
                        100L,
                        100,
                        3L,
                        false
                );

        when(
                eventRepository.search(
                        isNull(),
                        eq("spring"),
                        eq("TECH"),
                        eq("FULL"),
                        any(LocalDateTime.class),
                        any(Pageable.class)
                )
        ).thenReturn(
                new PageImpl<>(
                        List.of(filteredEvent),
                        PageRequest.of(
                                3,
                                10
                        ),
                        21L
                )
        );

        when(
                ticketTypeRepository
                        .summariesForEventIds(
                                List.of(100L)
                        )
        ).thenReturn(
                List.of()
        );

        // Global ทั้งระบบ
        when(
                eventRepository.countOpen(
                        any(LocalDateTime.class)
                )
        ).thenReturn(
                9L
        );

        // จำนวน Registration records
        // ไม่ใช่ quantity
        when(
                registrationRepository.count()
        ).thenReturn(
                42L
        );

        ApiDtos.EventPageDto result =
                eventService.list(
                        null,
                        3,
                        10,
                        "spring",
                        "TECH",
                        "FULL"
                );

        assertEquals(
                9L,
                result.totalOpenEvents()
        );

        assertEquals(
                42L,
                result.totalRegistrations()
        );

        // filtered page total
        assertEquals(
                21L,
                result.totalElements()
        );

        verify(eventRepository)
                .countOpen(
                        any(LocalDateTime.class)
                );

        verify(registrationRepository)
                .count();
    }
}