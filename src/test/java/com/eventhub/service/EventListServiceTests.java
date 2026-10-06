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
}