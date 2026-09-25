
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

import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EventStaffServiceTests {

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

    private Event createEvent(
            long id,
            String title
    ) {
        Event event = new Event();

        ReflectionTestUtils.setField(
                event,
                "id",
                id
        );

        event.setTitle(title);
        event.setDescription("Test event");
        event.setLocation("Bangkok");
        event.setStartsAt(
                LocalDateTime.of(2027, 6, 1, 10, 0)
        );
        event.setCapacity(100);
        event.setCategory("TECH");

        return event;
    }

    private UserAccount createUser(
            long id,
            String name,
            String email
    ) {
        UserAccount user = new UserAccount(
                name,
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

    private TicketType createTicket(
            Event event,
            String name
    ) {
        return new TicketType(
                event,
                name,
                "Test ticket",
                new BigDecimal("250.00"),
                100
        );
    }

    private Registration createRegistration(
            long id,
            UserAccount user,
            Event event,
            TicketType ticket,
            int quantity,
            LocalDateTime registeredAt,
            LocalDateTime checkedInAt
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

        ReflectionTestUtils.setField(
                registration,
                "registeredAt",
                registeredAt
        );

        ReflectionTestUtils.setField(
                registration,
                "checkedInAt",
                checkedInAt
        );

        return registration;
    }

    // EVT-STAFF-001 ตรวจสอบและแปลงข้อมูลผู้เข้าร่วมงาน (Attendees)
    @Test
    void shouldReturnAttendeesForRequestedEvent() {

        // Arrange: สร้าง Event A และ Event B
        Event eventA = createEvent(
                100L,
                "Event A"
        );

        Event eventB = createEvent(
                200L,
                "Event B"
        );

        // ผู้ลงทะเบียน Event A
        UserAccount alice = createUser(
                10L,
                "Alice",
                "alice@example.test"
        );

        UserAccount bob = createUser(
                11L,
                "Bob",
                "bob@example.test"
        );

        // ผู้ลงทะเบียน Event B
        UserAccount charlie = createUser(
                12L,
                "Charlie",
                "charlie@example.test"
        );

        TicketType general = createTicket(
                eventA,
                "General"
        );

        TicketType vip = createTicket(
                eventA,
                "VIP"
        );

        TicketType otherTicket = createTicket(
                eventB,
                "Other Event Ticket"
        );

        LocalDateTime firstRegisteredAt =
                LocalDateTime.of(
                        2027, 5, 1, 9, 0
                );

        LocalDateTime secondRegisteredAt =
                LocalDateTime.of(
                        2027, 5, 1, 10, 0
                );

        LocalDateTime bobCheckedInAt =
                LocalDateTime.of(
                        2027, 6, 1, 9, 30
                );

        Registration aliceRegistration =
                createRegistration(
                        501L,
                        alice,
                        eventA,
                        general,
                        2,
                        firstRegisteredAt,
                        null
                );

        Registration bobRegistration =
                createRegistration(
                        502L,
                        bob,
                        eventA,
                        vip,
                        1,
                        secondRegisteredAt,
                        bobCheckedInAt
                );

        // เตรียม Registration ของ Event B
        // เพื่อยืนยันว่าข้อมูลของงานอื่นไม่ถูกปะปน
        Registration charlieRegistration =
                createRegistration(
                        503L,
                        charlie,
                        eventB,
                        otherTicket,
                        1,
                        firstRegisteredAt,
                        null
                );

        assertEquals(
                eventB,
                charlieRegistration.getEvent()
        );

        // Repository คืนเฉพาะผู้ลงทะเบียน Event A
        when(eventRepository.findById(100L))
                .thenReturn(Optional.of(eventA));

        when(
                registrationRepository
                        .findByEventIdOrderByRegisteredAtAsc(100L)
        ).thenReturn(
                List.of(
                        aliceRegistration,
                        bobRegistration
                )
        );

        // Act
        List<ApiDtos.AttendeeDto> result =
                eventService.attendees(100L);

        // Assert: ต้องมีผู้ลงทะเบียนสองรายการ
        assertEquals(
                2,
                result.size()
        );

        // ตรวจข้อมูลของ Alice
        ApiDtos.AttendeeDto first =
                result.get(0);

        assertEquals(10L, first.id());
        assertEquals("Alice", first.name());
        assertEquals(
                "alice@example.test",
                first.email()
        );
        assertEquals(
                firstRegisteredAt,
                first.registeredAt()
        );
        assertEquals(
                "General",
                first.ticketType()
        );
        assertEquals(2, first.quantity());
        assertEquals(
                aliceRegistration.getTicketCode(),
                first.ticketCode()
        );
        assertNull(first.checkedInAt());

        // ตรวจข้อมูลของ Bob
        ApiDtos.AttendeeDto second =
                result.get(1);

        assertEquals(11L, second.id());
        assertEquals("Bob", second.name());
        assertEquals(
                "bob@example.test",
                second.email()
        );
        assertEquals(
                secondRegisteredAt,
                second.registeredAt()
        );
        assertEquals(
                "VIP",
                second.ticketType()
        );
        assertEquals(1, second.quantity());
        assertEquals(
                bobRegistration.getTicketCode(),
                second.ticketCode()
        );
        assertEquals(
                bobCheckedInAt,
                second.checkedInAt()
        );

        // ตรวจว่า Service ขอข้อมูลของ Event A
        verify(eventRepository)
                .findById(100L);

        verify(registrationRepository)
                .findByEventIdOrderByRegisteredAtAsc(100L);

        // ต้องไม่ขอรายชื่อของ Event B
        verify(registrationRepository, never())
                .findByEventIdOrderByRegisteredAtAsc(200L);
    }

    // EVT-STAFF-002 เมื่อขอรายชื่อผู้ลงทะเบียนของ Event ที่ไม่มีอยู่ ระบบต้องตอบ 404 และไม่ส่งข้อมูลผู้ลงทะเบียนของงานอื่น
    @Test
    void shouldReturnNotFoundWhenAttendeesEventDoesNotExist() {

        // Arrange: Event ID 999 ไม่มีอยู่
        when(eventRepository.findById(999L))
                .thenReturn(Optional.empty());

        // Act + Assert: ต้องถูกปฏิเสธเป็น 404
        ResponseStatusException exception =
                assertThrows(
                        ResponseStatusException.class,
                        () -> eventService.attendees(999L)
                );

        assertEquals(
                HttpStatus.NOT_FOUND.value(),
                exception.getStatusCode().value()
        );

        // ตรวจว่ามีการค้นหา Event ที่ร้องขอ
        verify(eventRepository)
                .findById(999L);

        // ไม่ควรดึงรายชื่อผู้ลงทะเบียนเมื่อ Event ไม่มี
        verifyNoInteractions(
                registrationRepository
        );
    }
}
