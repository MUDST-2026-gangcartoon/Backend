package com.eventhub.service;

import com.eventhub.dto.ApiDtos;
import com.eventhub.model.Event;
import com.eventhub.model.Registration;
import com.eventhub.model.Role;
import com.eventhub.model.TicketType;
import com.eventhub.model.UserAccount;
import com.eventhub.repository.EventRepository;
import com.eventhub.repository.RegistrationRepository;
import com.eventhub.repository.TicketTypeRepository;
import com.eventhub.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.function.Executable;

import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
class EventServiceTests {

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
    // Test Fixtures / Helpers
    // ============================================================

    private UserAccount createUser(
            long id,
            String email
    ) {
        UserAccount user = new UserAccount(
                "Alice Tester",
                email,
                "hashed-password",
                Role.USER
        );

        ReflectionTestUtils.setField(user, "id", id);

        return user;
    }

    private Event createEvent(
            long id,
            int capacity,
            LocalDateTime startsAt
    ) {
        Event event = new Event();

        ReflectionTestUtils.setField(event, "id", id);

        event.setTitle("EventHub Workshop");
        event.setDescription("Event used for service testing");
        event.setLocation("Bangkok");
        event.setStartsAt(startsAt);
        event.setCapacity(capacity);
        event.setCategory("TECH");
        event.setImageUrl("https://example.test/event.jpg");

        return event;
    }

    private TicketType createTicket(
            long id,
            Event event,
            String name,
            BigDecimal price,
            int capacity
    ) {
        TicketType ticket = new TicketType(
                event,
                name,
                name + " ticket",
                price,
                capacity
        );

        ReflectionTestUtils.setField(ticket, "id", id);

        return ticket;
    }

    private Registration createRegistration(
            long id,
            UserAccount user,
            Event event,
            TicketType ticket,
            int quantity
    ) {
        Registration registration =
                new Registration(
                        user,
                        event,
                        ticket,
                        quantity
                );

        ReflectionTestUtils.setField(
                registration,
                "id",
                id
        );

        return registration;
    }

    private Principal principal(String email) {
        return () -> email;
    }

    private ApiDtos.TicketTypeRequest ticketRequest(
            Long id,
            String name,
            String price,
            int capacity
    ) {
        return new ApiDtos.TicketTypeRequest(
                id,
                name,
                name + " ticket",
                new BigDecimal(price),
                capacity
        );
    }

    private ApiDtos.EventRequest eventRequest(
            String title,
            int capacity,
            List<ApiDtos.TicketTypeRequest> ticketTypes
    ) {
        return new ApiDtos.EventRequest(
                title,
                "Event description",
                "Bangkok",
                LocalDateTime.now().plusDays(30),
                capacity,
                "TECH",
                "https://example.test/event.jpg",
                List.of(
                        new ApiDtos.DetailImageRequest(
                                "https://example.test/detail.jpg",
                                "BODY"
                        )
                ),
                ticketTypes
        );
    }

    private ResponseStatusException assertStatus(
            HttpStatus expectedStatus,
            Executable executable
    ) {
        ResponseStatusException exception =
                assertThrows(
                        ResponseStatusException.class,
                        executable
                );

        assertEquals(
                expectedStatus.value(),
                exception.getStatusCode().value()
        );

        return exception;
    }

    private record RegistrationFixture(
            UserAccount user,
            Event event,
            TicketType ticket,
            Principal principal
    ) {
    }

    private RegistrationFixture registrationFixture() {

        UserAccount user =
                createUser(
                        10L,
                        "alice@example.test"
                );

        Event event =
                createEvent(
                        100L,
                        100,
                        LocalDateTime.now().plusDays(7)
                );

        TicketType ticket =
                createTicket(
                        200L,
                        event,
                        "General",
                        new BigDecimal("250.00"),
                        50
                );

        event.addTicketType(ticket);

        return new RegistrationFixture(
                user,
                event,
                ticket,
                principal(user.getEmail())
        );
    }
    // ============================================================
    // P0 — Registration
    // ============================================================

    // EVT-REG-001 ลงทะเบียนสำเร็จ - Save Registration พร้อม User, Event, TicketType, quantity, ticketCode
    @Test
    void shouldRegisterSuccessfully() {

        RegistrationFixture f =
                registrationFixture();

        ApiDtos.PurchaseRequest request =
                new ApiDtos.PurchaseRequest(
                        f.ticket().getId(),
                        2
                );

        when(
                userRepository.findByEmail(
                        f.user().getEmail()
                )
        ).thenReturn(Optional.of(f.user()));

        when(
                eventRepository.findByIdForUpdate(
                        f.event().getId()
                )
        ).thenReturn(Optional.of(f.event()));

        when(
                registrationRepository
                        .existsByUserIdAndEventId(
                                f.user().getId(),
                                f.event().getId()
                        )
        ).thenReturn(false);

        when(
                ticketTypeRepository.findById(
                        f.ticket().getId()
                )
        ).thenReturn(Optional.of(f.ticket()));

        when(
                registrationRepository
                        .seatsReservedByEventId(
                                f.event().getId()
                        )
        ).thenReturn(10L);

        when(
                registrationRepository
                        .seatsReservedByTicketTypeId(
                                f.ticket().getId()
                        )
        ).thenReturn(5L);

        when(
                registrationRepository.save(
                        any(Registration.class)
                )
        ).thenAnswer(invocation -> {

            Registration registration =
                    invocation.getArgument(0);

            ReflectionTestUtils.setField(
                    registration,
                    "id",
                    500L
            );

            return registration;
        });

        ApiDtos.RegistrationDto result =
                eventService.register(
                        f.event().getId(),
                        request,
                        f.principal()
                );

        ArgumentCaptor<Registration> captor =
                ArgumentCaptor.forClass(
                        Registration.class
                );

        verify(registrationRepository)
                .save(captor.capture());

        Registration saved =
                captor.getValue();

        assertSame(
                f.user(),
                saved.getUser()
        );

        assertSame(
                f.event(),
                saved.getEvent()
        );

        assertSame(
                f.ticket(),
                saved.getTicketType()
        );

        assertEquals(
                2,
                saved.getQuantity()
        );

        assertNotNull(
                saved.getRegisteredAt()
        );

        assertNotNull(
                saved.getTicketCode()
        );

        assertTrue(
                saved.getTicketCode()
                        .startsWith("GTH-")
        );

        assertNotNull(result);

        assertEquals(
                2,
                result.quantity()
        );

        assertEquals(
                saved.getTicketCode(),
                result.ticketCode()
        );
    }


    // EVT-REG-002 Event ไม่มีอยู่ - Not Found, ไม่ Save
    @Test
    void shouldRejectRegistrationWhenEventDoesNotExist() {

        RegistrationFixture f =
                registrationFixture();

        ApiDtos.PurchaseRequest request =
                new ApiDtos.PurchaseRequest(
                        f.ticket().getId(),
                        1
                );

        when(
                userRepository.findByEmail(
                        f.user().getEmail()
                )
        ).thenReturn(Optional.of(f.user()));

        when(
                eventRepository.findByIdForUpdate(
                        999L
                )
        ).thenReturn(Optional.empty());

        assertStatus(
                HttpStatus.NOT_FOUND,
                () -> eventService.register(
                        999L,
                        request,
                        f.principal()
                )
        );

        verify(
                registrationRepository,
                never()
        ).save(any());
    }


    // EVT-REG-003 Event เริ่มแล้ว - Conflict, ไม่ Save
    @Test
    void shouldRejectRegistrationWhenEventHasStarted() {

        RegistrationFixture f =
                registrationFixture();

        f.event().setStartsAt(
                LocalDateTime.now()
                        .minusMinutes(1)
        );

        ApiDtos.PurchaseRequest request =
                new ApiDtos.PurchaseRequest(
                        f.ticket().getId(),
                        1
                );

        when(
                userRepository.findByEmail(
                        f.user().getEmail()
                )
        ).thenReturn(Optional.of(f.user()));

        when(
                eventRepository.findByIdForUpdate(
                        f.event().getId()
                )
        ).thenReturn(Optional.of(f.event()));

        ResponseStatusException exception =
                assertStatus(
                        HttpStatus.CONFLICT,
                        () -> eventService.register(
                                f.event().getId(),
                                request,
                                f.principal()
                        )
                );

        assertEquals(
                "Registration has closed",
                exception.getReason()
        );

        verify(
                registrationRepository,
                never()
        ).save(any());
    }


    // EVT-REG-004 ลงทะเบียน Event เดิมซ้ำ - Conflict, ไม่ Save
    @Test
    void shouldRejectDuplicateRegistration() {

        RegistrationFixture f =
                registrationFixture();

        ApiDtos.PurchaseRequest request =
                new ApiDtos.PurchaseRequest(
                        f.ticket().getId(),
                        1
                );

        when(
                userRepository.findByEmail(
                        f.user().getEmail()
                )
        ).thenReturn(Optional.of(f.user()));

        when(
                eventRepository.findByIdForUpdate(
                        f.event().getId()
                )
        ).thenReturn(Optional.of(f.event()));

        when(
                registrationRepository
                        .existsByUserIdAndEventId(
                                f.user().getId(),
                                f.event().getId()
                        )
        ).thenReturn(true);

        ResponseStatusException exception =
                assertStatus(
                        HttpStatus.CONFLICT,
                        () -> eventService.register(
                                f.event().getId(),
                                request,
                                f.principal()
                        )
                );

        assertEquals(
                "You are already registered",
                exception.getReason()
        );

        verify(
                registrationRepository,
                never()
        ).save(any());
    }


    // EVT-REG-005 TicketType ไม่มี - Not Found, ไม่ Save
    @Test
    void shouldRejectRegistrationWhenTicketTypeDoesNotExist() {

        RegistrationFixture f =
                registrationFixture();

        ApiDtos.PurchaseRequest request =
                new ApiDtos.PurchaseRequest(
                        999L,
                        1
                );

        when(
                userRepository.findByEmail(
                        f.user().getEmail()
                )
        ).thenReturn(Optional.of(f.user()));

        when(
                eventRepository.findByIdForUpdate(
                        f.event().getId()
                )
        ).thenReturn(Optional.of(f.event()));

        when(
                registrationRepository
                        .existsByUserIdAndEventId(
                                f.user().getId(),
                                f.event().getId()
                        )
        ).thenReturn(false);

        when(
                ticketTypeRepository.findById(
                        999L
                )
        ).thenReturn(Optional.empty());

        assertStatus(
                HttpStatus.NOT_FOUND,
                () -> eventService.register(
                        f.event().getId(),
                        request,
                        f.principal()
                )
        );

        verify(
                registrationRepository,
                never()
        ).save(any());
    }


    // EVT-REG-006 - TicketType เป็นของ Event อื่น - Conflict, ไม่ Save
    @Test
    void shouldRejectTicketTypeFromDifferentEvent() {

        RegistrationFixture f =
                registrationFixture();

        Event anotherEvent =
                createEvent(
                        101L,
                        50,
                        LocalDateTime.now()
                                .plusDays(7)
                );

        TicketType wrongTicket =
                createTicket(
                        300L,
                        anotherEvent,
                        "Other Event VIP",
                        new BigDecimal("500.00"),
                        50
                );

        ApiDtos.PurchaseRequest request =
                new ApiDtos.PurchaseRequest(
                        wrongTicket.getId(),
                        1
                );

        when(
                userRepository.findByEmail(
                        f.user().getEmail()
                )
        ).thenReturn(Optional.of(f.user()));

        when(
                eventRepository.findByIdForUpdate(
                        f.event().getId()
                )
        ).thenReturn(Optional.of(f.event()));

        when(
                registrationRepository
                        .existsByUserIdAndEventId(
                                f.user().getId(),
                                f.event().getId()
                        )
        ).thenReturn(false);

        when(
                ticketTypeRepository.findById(
                        wrongTicket.getId()
                )
        ).thenReturn(Optional.of(wrongTicket));

        assertStatus(
                HttpStatus.CONFLICT,
                () -> eventService.register(
                        f.event().getId(),
                        request,
                        f.principal()
                )
        );

        verify(
                registrationRepository,
                never()
        ).save(any());
    }


    // EVT-REG-007 Event capacity ไม่พอ - Conflict, ไม่ Save
    @Test
    void shouldRejectRegistrationWhenEventCapacityExceeded() {

        RegistrationFixture f =
                registrationFixture();

        ApiDtos.PurchaseRequest request =
                new ApiDtos.PurchaseRequest(
                        f.ticket().getId(),
                        3
                );

        when(
                userRepository.findByEmail(
                        f.user().getEmail()
                )
        ).thenReturn(Optional.of(f.user()));

        when(
                eventRepository.findByIdForUpdate(
                        f.event().getId()
                )
        ).thenReturn(Optional.of(f.event()));

        when(
                registrationRepository
                        .existsByUserIdAndEventId(
                                f.user().getId(),
                                f.event().getId()
                        )
        ).thenReturn(false);

        when(
                ticketTypeRepository.findById(
                        f.ticket().getId()
                )
        ).thenReturn(Optional.of(f.ticket()));

        when(
                registrationRepository
                        .seatsReservedByEventId(
                                f.event().getId()
                        )
        ).thenReturn(98L);

        assertStatus(
                HttpStatus.CONFLICT,
                () -> eventService.register(
                        f.event().getId(),
                        request,
                        f.principal()
                )
        );

        verify(
                registrationRepository,
                never()
        ).save(any());
    }


    // EVT-REG-008 TicketType capacity ไม่พอ - Conflict, ไม่ Save
    @Test
    void shouldRejectRegistrationWhenTicketCapacityExceeded() {

        RegistrationFixture f =
                registrationFixture();

        ApiDtos.PurchaseRequest request =
                new ApiDtos.PurchaseRequest(
                        f.ticket().getId(),
                        2
                );

        when(
                userRepository.findByEmail(
                        f.user().getEmail()
                )
        ).thenReturn(Optional.of(f.user()));

        when(
                eventRepository.findByIdForUpdate(
                        f.event().getId()
                )
        ).thenReturn(Optional.of(f.event()));

        when(
                registrationRepository
                        .existsByUserIdAndEventId(
                                f.user().getId(),
                                f.event().getId()
                        )
        ).thenReturn(false);

        when(
                ticketTypeRepository.findById(
                        f.ticket().getId()
                )
        ).thenReturn(Optional.of(f.ticket()));

        when(
                registrationRepository
                        .seatsReservedByEventId(
                                f.event().getId()
                        )
        ).thenReturn(10L);

        f.ticket().setCapacity(20);

        when(
                registrationRepository
                        .seatsReservedByTicketTypeId(
                                f.ticket().getId()
                        )
        ).thenReturn(19L);

        assertStatus(
                HttpStatus.CONFLICT,
                () -> eventService.register(
                        f.event().getId(),
                        request,
                        f.principal()
                )
        );

        verify(
                registrationRepository,
                never()
        ).save(any());
    }


    // EVT-REG-009 ใช้ Event lock ตอนลงทะเบียน - Conflict, ไม่ Save เรียก findByIdForUpdate() ก่อนตรวจ capacity
    @Test
    void shouldLockEventBeforeCheckingCapacityAndSavingRegistration() {

        RegistrationFixture f =
                registrationFixture();

        ApiDtos.PurchaseRequest request =
                new ApiDtos.PurchaseRequest(
                        f.ticket().getId(),
                        1
                );

        when(
                userRepository.findByEmail(
                        f.user().getEmail()
                )
        ).thenReturn(Optional.of(f.user()));

        when(
                eventRepository.findByIdForUpdate(
                        f.event().getId()
                )
        ).thenReturn(Optional.of(f.event()));

        when(
                registrationRepository
                        .existsByUserIdAndEventId(
                                f.user().getId(),
                                f.event().getId()
                        )
        ).thenReturn(false);

        when(
                ticketTypeRepository.findById(
                        f.ticket().getId()
                )
        ).thenReturn(Optional.of(f.ticket()));

        when(
                registrationRepository
                        .seatsReservedByEventId(
                                f.event().getId()
                        )
        ).thenReturn(10L);

        when(
                registrationRepository
                        .seatsReservedByTicketTypeId(
                                f.ticket().getId()
                        )
        ).thenReturn(5L);

        when(
                registrationRepository.save(
                        any(Registration.class)
                )
        ).thenAnswer(invocation ->
                invocation.getArgument(0)
        );

        eventService.register(
                f.event().getId(),
                request,
                f.principal()
        );

        InOrder order =
                inOrder(
                        eventRepository,
                        registrationRepository
                );

        order.verify(eventRepository)
                .findByIdForUpdate(
                        f.event().getId()
                );

        order.verify(registrationRepository)
                .seatsReservedByEventId(
                        f.event().getId()
                );

        order.verify(registrationRepository)
                .seatsReservedByTicketTypeId(
                        f.ticket().getId()
                );

        order.verify(registrationRepository)
                .save(any(Registration.class));
    }
    // ============================================================
    // P0 — Create Event
    // ============================================================

    // EVT-CREATE-001 สร้าง Event สำเร็จ - Save ทุก field และเชื่อม TicketType กับ Event ถูกต้อง
    @Test
    void shouldCreateEventSuccessfully() {

        ApiDtos.EventRequest request =
                eventRequest(
                        "KBTG Tech Event",
                        100,
                        List.of(
                                ticketRequest(
                                        null,
                                        "General",
                                        "100.00",
                                        60
                                ),
                                ticketRequest(
                                        null,
                                        "VIP",
                                        "250.00",
                                        40
                                )
                        )
                );

        when(
                eventRepository.save(
                        any(Event.class)
                )
        ).thenAnswer(invocation -> {

            Event event =
                    invocation.getArgument(0);

            ReflectionTestUtils.setField(
                    event,
                    "id",
                    100L
            );

            return event;
        });

        ApiDtos.EventDto result =
                eventService.create(request);

        ArgumentCaptor<Event> captor =
                ArgumentCaptor.forClass(
                        Event.class
                );

        verify(eventRepository)
                .save(captor.capture());

        Event saved =
                captor.getValue();

        assertEquals(
                request.title(),
                saved.getTitle()
        );

        assertEquals(
                request.description(),
                saved.getDescription()
        );

        assertEquals(
                request.location(),
                saved.getLocation()
        );

        assertEquals(
                request.startsAt(),
                saved.getStartsAt()
        );

        assertEquals(
                100,
                saved.getCapacity()
        );

        assertEquals(
                "TECH",
                saved.getCategory()
        );

        assertEquals(
                request.imageUrl(),
                saved.getImageUrl()
        );

        assertEquals(
                1,
                saved.getDetailImages().size()
        );

        assertEquals(
                2,
                saved.getTicketTypes().size()
        );

        for (TicketType ticket :
                saved.getTicketTypes()) {

            assertSame(
                    saved,
                    ticket.getEvent()
            );
        }

        assertNotNull(result);
    }


    // EVT-CREATE-002 ผลรวม Ticket capacity ไม่เท่า Event capacity - Conflict, ไม่ Save
    @Test
    void shouldRejectCreateWhenTicketCapacitiesDoNotMatchEventCapacity() {

        ApiDtos.EventRequest request =
                eventRequest(
                        "Invalid Ticket Plan",
                        100,
                        List.of(
                                ticketRequest(
                                        null,
                                        "General",
                                        "100.00",
                                        50
                                ),
                                ticketRequest(
                                        null,
                                        "VIP",
                                        "250.00",
                                        30
                                )
                        )
                );

        assertStatus(
                HttpStatus.CONFLICT,
                () -> eventService.create(request)
        );

        verify(
                eventRepository,
                never()
        ).save(any(Event.class));
    }


    // ============================================================
    // P0 — Update Event Capacity
    // ============================================================

    // EVT-UPDATE-003 ลด Event capacity ต่ำกว่าที่ขายแล้ว - ลด Event capacity ต่ำกว่าที่ขายแล้ว
    @Test
    void shouldRejectReducingEventCapacityBelowSeatsAlreadySold() {

        Event existing =
                createEvent(
                        100L,
                        100,
                        LocalDateTime.now()
                                .plusDays(10)
                );

        TicketType ticket =
                createTicket(
                        200L,
                        existing,
                        "General",
                        new BigDecimal("100.00"),
                        100
                );

        existing.addTicketType(ticket);

        ApiDtos.EventRequest request =
                eventRequest(
                        "Updated Event",
                        20,
                        List.of(
                                ticketRequest(
                                        ticket.getId(),
                                        "General",
                                        "100.00",
                                        20
                                )
                        )
                );

        when(
                eventRepository.findByIdForUpdate(
                        existing.getId()
                )
        ).thenReturn(Optional.of(existing));

        when(
                registrationRepository
                        .seatsReservedByEventId(
                                existing.getId()
                        )
        ).thenReturn(30L);

        assertStatus(
                HttpStatus.CONFLICT,
                () -> eventService.update(
                        existing.getId(),
                        request
                )
        );

        assertEquals(
                100,
                existing.getCapacity()
        );
    }
    // ============================================================
    // P0 — Cancel Registration
    // ============================================================

    // EVT-CANCEL-001 ยกเลิก Registration ของตัวเอง - ลบเฉพาะ User + Event ที่ถูกต้อง
    @Test
    void shouldCancelCurrentUsersRegistration() {

        UserAccount user =
                createUser(
                        10L,
                        "alice@example.test"
                );

        Principal principal =
                principal(
                        user.getEmail()
                );

        when(
                userRepository.findByEmail(
                        user.getEmail()
                )
        ).thenReturn(Optional.of(user));

        when(
                registrationRepository
                        .deleteByUserIdAndEventId(
                                user.getId(),
                                100L
                        )
        ).thenReturn(1L);

        eventService.cancel(
                100L,
                principal
        );

        verify(registrationRepository)
                .deleteByUserIdAndEventId(
                        user.getId(),
                        100L
                );
    }


    // EVT-CANCEL-002 ไม่มี Registration ให้ยกเลิก - Not Found
    @Test
    void shouldReturnNotFoundWhenCancellingMissingRegistration() {

        UserAccount user =
                createUser(
                        10L,
                        "alice@example.test"
                );

        Principal principal =
                principal(
                        user.getEmail()
                );

        when(
                userRepository.findByEmail(
                        user.getEmail()
                )
        ).thenReturn(Optional.of(user));

        when(
                registrationRepository
                        .deleteByUserIdAndEventId(
                                user.getId(),
                                100L
                        )
        ).thenReturn(0L);

        ResponseStatusException exception =
                assertStatus(
                        HttpStatus.NOT_FOUND,
                        () -> eventService.cancel(
                                100L,
                                principal
                        )
                );

        assertEquals(
                "Registration not found",
                exception.getReason()
        );
    }
    // ============================================================
    // P1 — Authentication
    // ============================================================

    // EVT-AUTH-001 — Register
    @Test
    void shouldRejectRegisterWithoutAuthentication() {

        ApiDtos.PurchaseRequest request =
                new ApiDtos.PurchaseRequest(
                        200L,
                        1
                );

        assertStatus(
                HttpStatus.UNAUTHORIZED,
                () -> eventService.register(
                        100L,
                        request,
                        null
                )
        );

        verifyNoInteractions(
                eventRepository,
                registrationRepository,
                ticketTypeRepository
        );
    }


    // EVT-AUTH-001 — Cancel
    @Test
    void shouldRejectCancelWithoutAuthentication() {

        assertStatus(
                HttpStatus.UNAUTHORIZED,
                () -> eventService.cancel(
                        100L,
                        null
                )
        );

        verifyNoInteractions(
                eventRepository,
                registrationRepository,
                ticketTypeRepository
        );
    }


    // EVT-AUTH-001 — Mine
    @Test
    void shouldRejectMineWithoutAuthentication() {

        assertStatus(
                HttpStatus.UNAUTHORIZED,
                () -> eventService.mine(null)
        );

        verifyNoInteractions(
                eventRepository,
                registrationRepository,
                ticketTypeRepository
        );
    }


    // EVT-AUTH-002
    @Test
    void shouldReturnNotFoundWhenAuthenticatedUserDoesNotExist() {

        Principal principal =
                principal(
                        "missing@example.test"
                );

        when(
                userRepository.findByEmail(
                        "missing@example.test"
                )
        ).thenReturn(Optional.empty());

        assertStatus(
                HttpStatus.NOT_FOUND,
                () -> eventService.mine(
                        principal
                )
        );

        verifyNoInteractions(
                eventRepository,
                registrationRepository,
                ticketTypeRepository
        );
    }


    // ============================================================
    // P1 — Total Price
    // ============================================================

    // EVT-REG-010
    @Test
    void shouldCalculateTotalPriceFromTicketPriceAndQuantity() {

        RegistrationFixture f =
                registrationFixture();

        f.ticket().setPrice(
                new BigDecimal("250.00")
        );

        ApiDtos.PurchaseRequest request =
                new ApiDtos.PurchaseRequest(
                        f.ticket().getId(),
                        3
                );

        when(
                userRepository.findByEmail(
                        f.user().getEmail()
                )
        ).thenReturn(Optional.of(f.user()));

        when(
                eventRepository.findByIdForUpdate(
                        f.event().getId()
                )
        ).thenReturn(Optional.of(f.event()));

        when(
                registrationRepository
                        .existsByUserIdAndEventId(
                                f.user().getId(),
                                f.event().getId()
                        )
        ).thenReturn(false);

        when(
                ticketTypeRepository.findById(
                        f.ticket().getId()
                )
        ).thenReturn(Optional.of(f.ticket()));

        when(
                registrationRepository
                        .seatsReservedByEventId(
                                f.event().getId()
                        )
        ).thenReturn(10L);

        when(
                registrationRepository
                        .seatsReservedByTicketTypeId(
                                f.ticket().getId()
                        )
        ).thenReturn(5L);

        when(
                registrationRepository.save(
                        any(Registration.class)
                )
        ).thenAnswer(invocation ->
                invocation.getArgument(0)
        );

        ApiDtos.RegistrationDto result =
                eventService.register(
                        f.event().getId(),
                        request,
                        f.principal()
                );

        assertEquals(
                0,
                new BigDecimal("750.00")
                        .compareTo(
                                result.totalPrice()
                        )
        );
    }
    // ============================================================
    // P1 — Update Event
    // ============================================================

    // EVT-UPDATE-001
    @Test
    void shouldUpdateExistingEventSuccessfully() {

        Event existing =
                createEvent(
                        100L,
                        100,
                        LocalDateTime.now()
                                .plusDays(20)
                );

        TicketType general =
                createTicket(
                        201L,
                        existing,
                        "General",
                        new BigDecimal("100.00"),
                        60
                );

        TicketType vip =
                createTicket(
                        202L,
                        existing,
                        "VIP",
                        new BigDecimal("250.00"),
                        40
                );

        existing.addTicketType(general);
        existing.addTicketType(vip);

        ApiDtos.EventRequest request =
                eventRequest(
                        "Updated Event Name",
                        120,
                        List.of(
                                ticketRequest(
                                        general.getId(),
                                        "General",
                                        "120.00",
                                        70
                                ),
                                ticketRequest(
                                        vip.getId(),
                                        "VIP",
                                        "300.00",
                                        50
                                )
                        )
                );

        when(
                eventRepository.findByIdForUpdate(
                        existing.getId()
                )
        ).thenReturn(Optional.of(existing));

        when(
                registrationRepository
                        .seatsReservedByEventId(
                                existing.getId()
                        )
        ).thenReturn(20L);

        lenient().when(
                registrationRepository
                        .seatsReservedByTicketTypeId(
                                general.getId()
                        )
        ).thenReturn(10L);

        lenient().when(
                registrationRepository
                        .seatsReservedByTicketTypeId(
                                vip.getId()
                        )
        ).thenReturn(5L);

        lenient().when(
                ticketTypeRepository.findById(
                        general.getId()
                )
        ).thenReturn(Optional.of(general));

        lenient().when(
                ticketTypeRepository.findById(
                        vip.getId()
                )
        ).thenReturn(Optional.of(vip));

        ApiDtos.EventDto result =
                eventService.update(
                        existing.getId(),
                        request
                );

        assertEquals(
                "Updated Event Name",
                existing.getTitle()
        );

        assertEquals(
                120,
                existing.getCapacity()
        );

        assertNotNull(result);

        verify(eventRepository)
                .findByIdForUpdate(
                        existing.getId()
                );
    }


    // EVT-UPDATE-002
    @Test
    void shouldReturnNotFoundWhenUpdatingMissingEvent() {

        ApiDtos.EventRequest request =
                eventRequest(
                        "Missing Event",
                        100,
                        List.of(
                                ticketRequest(
                                        null,
                                        "General",
                                        "100.00",
                                        100
                                )
                        )
                );

        when(
                eventRepository.findByIdForUpdate(
                        999L
                )
        ).thenReturn(Optional.empty());

        assertStatus(
                HttpStatus.NOT_FOUND,
                () -> eventService.update(
                        999L,
                        request
                )
        );
    }


    // EVT-UPDATE-004
    @Test
    void shouldRejectReducingTicketCapacityBelowSeatsSold() {

        Event event =
                createEvent(
                        100L,
                        100,
                        LocalDateTime.now()
                                .plusDays(10)
                );

        TicketType vip =
                createTicket(
                        201L,
                        event,
                        "VIP",
                        new BigDecimal("250.00"),
                        20
                );

        TicketType general =
                createTicket(
                        202L,
                        event,
                        "General",
                        new BigDecimal("100.00"),
                        80
                );

        event.addTicketType(vip);
        event.addTicketType(general);

        ApiDtos.EventRequest request =
                eventRequest(
                        "Updated Event",
                        100,
                        List.of(
                                ticketRequest(
                                        vip.getId(),
                                        "VIP",
                                        "250.00",
                                        10
                                ),
                                ticketRequest(
                                        general.getId(),
                                        "General",
                                        "100.00",
                                        90
                                )
                        )
                );

        when(
                eventRepository.findByIdForUpdate(
                        event.getId()
                )
        ).thenReturn(Optional.of(event));

        when(
                registrationRepository
                        .seatsReservedByEventId(
                                event.getId()
                        )
        ).thenReturn(20L);

        lenient().when(
                registrationRepository
                        .seatsReservedByTicketTypeId(
                                vip.getId()
                        )
        ).thenReturn(15L);

        assertStatus(
                HttpStatus.CONFLICT,
                () -> eventService.update(
                        event.getId(),
                        request
                )
        );

        assertEquals(
                20,
                vip.getCapacity()
        );
    }


    // EVT-UPDATE-005
    @Test
    void shouldRejectRemovingTicketTypeThatHasSales() {

        Event event =
                createEvent(
                        100L,
                        100,
                        LocalDateTime.now()
                                .plusDays(10)
                );

        TicketType vip =
                createTicket(
                        201L,
                        event,
                        "VIP",
                        new BigDecimal("250.00"),
                        20
                );

        TicketType general =
                createTicket(
                        202L,
                        event,
                        "General",
                        new BigDecimal("100.00"),
                        80
                );

        event.addTicketType(vip);
        event.addTicketType(general);

        ApiDtos.EventRequest request =
                eventRequest(
                        "Updated Event",
                        100,
                        List.of(
                                ticketRequest(
                                        general.getId(),
                                        "General",
                                        "100.00",
                                        100
                                )
                        )
                );

        when(
                eventRepository.findByIdForUpdate(
                        event.getId()
                )
        ).thenReturn(Optional.of(event));

        when(
                registrationRepository
                        .seatsReservedByEventId(
                                event.getId()
                        )
        ).thenReturn(2L);

        lenient().when(
                registrationRepository
                        .seatsReservedByTicketTypeId(
                                vip.getId()
                        )
        ).thenReturn(2L);

        assertStatus(
                HttpStatus.CONFLICT,
                () -> eventService.update(
                        event.getId(),
                        request
                )
        );

        assertTrue(
                event.getTicketTypes()
                        .contains(vip)
        );
    }


    // EVT-UPDATE-006
    @Test
    void shouldRejectTicketTypeIdBelongingToAnotherEvent() {

        Event eventA =
                createEvent(
                        100L,
                        100,
                        LocalDateTime.now()
                                .plusDays(10)
                );

        Event eventB =
                createEvent(
                        101L,
                        100,
                        LocalDateTime.now()
                                .plusDays(10)
                );

        TicketType eventATicket =
                createTicket(
                        201L,
                        eventA,
                        "General",
                        new BigDecimal("100.00"),
                        100
                );

        TicketType eventBTicket =
                createTicket(
                        999L,
                        eventB,
                        "Foreign Ticket",
                        new BigDecimal("999.00"),
                        100
                );

        eventA.addTicketType(eventATicket);
        eventB.addTicketType(eventBTicket);

        ApiDtos.EventRequest request =
                eventRequest(
                        "Updated A",
                        100,
                        List.of(
                                ticketRequest(
                                        eventBTicket.getId(),
                                        "Foreign Ticket",
                                        "999.00",
                                        100
                                )
                        )
                );

        when(
                eventRepository.findByIdForUpdate(
                        eventA.getId()
                )
        ).thenReturn(Optional.of(eventA));

        lenient().when(
                ticketTypeRepository.findById(
                        eventBTicket.getId()
                )
        ).thenReturn(
                Optional.of(eventBTicket)
        );

        assertStatus(
                HttpStatus.CONFLICT,
                () -> eventService.update(
                        eventA.getId(),
                        request
                )
        );
    }


    // EVT-UPDATE-007
    @Test
    void shouldRejectDuplicateTicketTypeIdsInUpdateRequest() {

        Event event =
                createEvent(
                        100L,
                        100,
                        LocalDateTime.now()
                                .plusDays(10)
                );

        TicketType ticket =
                createTicket(
                        201L,
                        event,
                        "General",
                        new BigDecimal("100.00"),
                        100
                );

        event.addTicketType(ticket);

        ApiDtos.EventRequest request =
                eventRequest(
                        "Updated Event",
                        100,
                        List.of(
                                ticketRequest(
                                        ticket.getId(),
                                        "General A",
                                        "100.00",
                                        50
                                ),
                                ticketRequest(
                                        ticket.getId(),
                                        "General B",
                                        "100.00",
                                        50
                                )
                        )
                );

        when(
                eventRepository.findByIdForUpdate(
                        event.getId()
                )
        ).thenReturn(Optional.of(event));

        assertStatus(
                HttpStatus.CONFLICT,
                () -> eventService.update(
                        event.getId(),
                        request
                )
        );
    }
    // ============================================================
    // P1 — Delete Event
    // ============================================================

    // EVT-DELETE-001
    @Test
    void shouldDeleteRegistrationsBeforeDeletingEvent() {

        Event event =
                createEvent(
                        100L,
                        100,
                        LocalDateTime.now()
                                .plusDays(10)
                );

        when(
                eventRepository.findById(
                        event.getId()
                )
        ).thenReturn(Optional.of(event));

        eventService.delete(
                event.getId()
        );

        InOrder order =
                inOrder(
                        registrationRepository,
                        eventRepository
                );

        order.verify(registrationRepository)
                .deleteByEventId(
                        event.getId()
                );

        order.verify(eventRepository)
                .delete(event);
    }


    // EVT-DELETE-002
    @Test
    void shouldReturnNotFoundWhenDeletingMissingEvent() {

        when(
                eventRepository.findById(
                        999L
                )
        ).thenReturn(Optional.empty());

        assertStatus(
                HttpStatus.NOT_FOUND,
                () -> eventService.delete(
                        999L
                )
        );

        verify(
                registrationRepository,
                never()
        ).deleteByEventId(anyLong());

        verify(
                eventRepository,
                never()
        ).delete(any(Event.class));
    }


    // ============================================================
    // P1 — My Registrations
    // ============================================================

    // EVT-MINE-001
    @Test
    void shouldReturnCurrentUsersRegistrations() {

        UserAccount user =
                createUser(
                        10L,
                        "alice@example.test"
                );

        Principal principal =
                principal(
                        user.getEmail()
                );

        Event firstEvent =
                createEvent(
                        100L,
                        100,
                        LocalDateTime.now()
                                .plusDays(5)
                );

        Event secondEvent =
                createEvent(
                        101L,
                        100,
                        LocalDateTime.now()
                                .plusDays(10)
                );

        TicketType firstTicket =
                createTicket(
                        201L,
                        firstEvent,
                        "General",
                        new BigDecimal("100.00"),
                        100
                );

        TicketType secondTicket =
                createTicket(
                        202L,
                        secondEvent,
                        "VIP",
                        new BigDecimal("250.00"),
                        100
                );

        firstEvent.addTicketType(firstTicket);
        secondEvent.addTicketType(secondTicket);

        Registration firstRegistration =
                createRegistration(
                        501L,
                        user,
                        firstEvent,
                        firstTicket,
                        1
                );

        Registration secondRegistration =
                createRegistration(
                        502L,
                        user,
                        secondEvent,
                        secondTicket,
                        2
                );

        when(
                userRepository.findByEmail(
                        user.getEmail()
                )
        ).thenReturn(Optional.of(user));

        when(
                registrationRepository
                        .findByUserIdOrderByEventStartsAtAsc(
                                user.getId()
                        )
        ).thenReturn(
                List.of(
                        firstRegistration,
                        secondRegistration
                )
        );

        List<ApiDtos.RegistrationDto> result =
                eventService.mine(
                        principal
                );

        assertEquals(
                2,
                result.size()
        );

        assertEquals(
                501L,
                result.get(0).id()
        );

        assertEquals(
                502L,
                result.get(1).id()
        );

        verify(registrationRepository)
                .findByUserIdOrderByEventStartsAtAsc(
                        user.getId()
                );
    }
}