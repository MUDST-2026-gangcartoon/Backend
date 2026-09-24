package com.eventhub.service;

import com.eventhub.dto.ApiDtos;
import com.eventhub.repository.EventRepository;
import com.eventhub.repository.RegistrationRepository;
import com.eventhub.repository.TicketTypeRepository;
import com.eventhub.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.util.List;

import com.eventhub.model.DetailImage;
import com.eventhub.model.Event;
import com.eventhub.model.Registration;
import com.eventhub.model.TicketType;
import com.eventhub.model.UserAccount;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final RegistrationRepository registrationRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final UserRepository userRepository;

    public EventService(
            EventRepository eventRepository,
            RegistrationRepository registrationRepository,
            TicketTypeRepository ticketTypeRepository,
            UserRepository userRepository
    ) {
        this.eventRepository = eventRepository;
        this.registrationRepository = registrationRepository;
        this.ticketTypeRepository = ticketTypeRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public ApiDtos.EventPageDto list(
            Principal principal,
            int page,
            int size,
            String search,
            String category,
            String status
    ) {
        throw notImplemented();
    }

    @Transactional(readOnly = true)
    public ApiDtos.EventDto get(
            Long eventId,
            Principal principal
    ) {
        Event event =
                eventRepository
                        .findById(eventId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Event not found"
                                )
                        );

        boolean registered = false;

        if (principal != null
                && principal.getName() != null
                && !principal.getName().isBlank()) {

            String email =
                    principal.getName()
                            .trim()
                            .toLowerCase(Locale.ROOT);

            UserAccount user =
                    userRepository
                            .findByEmail(email)
                            .orElse(null);

            if (user != null) {
                registered =
                        registrationRepository
                                .existsByUserIdAndEventId(
                                        user.getId(),
                                        event.getId()
                                );
            }
        }

        return eventDto(
                event,
                registered
        );
    }

    @Transactional
    public ApiDtos.EventDto create(
            ApiDtos.EventRequest request
    ) {
        validateTicketCapacityPlan(
                request.capacity(),
                request.ticketTypes()
        );

        Event event = new Event();

        applyEventFields(
                event,
                request
        );

        replaceDetailImages(
                event,
                request.detailImages()
        );

        for (ApiDtos.TicketTypeRequest ticketRequest
                : request.ticketTypes()) {

            TicketType ticket =
                    new TicketType(
                            event,
                            ticketRequest.name(),
                            ticketRequest.description(),
                            ticketRequest.price(),
                            ticketRequest.capacity()
                    );

            event.addTicketType(ticket);
        }

        Event saved =
                eventRepository.save(event);

        return eventDto(
                saved,
                false
        );
    }
    private void validateTicketCapacityPlan(
            int eventCapacity,
            List<ApiDtos.TicketTypeRequest> ticketTypes
    ) {
        long total = 0L;

        for (ApiDtos.TicketTypeRequest ticket
                : ticketTypes) {

            total += ticket.capacity();
        }

        if (total != eventCapacity) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ticket capacities must equal event capacity"
            );
        }
    }
    private void applyEventFields(
            Event event,
            ApiDtos.EventRequest request
    ) {
        event.setTitle(request.title());
        event.setDescription(request.description());
        event.setLocation(request.location());
        event.setStartsAt(request.startsAt());
        event.setCapacity(request.capacity());
        event.setCategory(request.category());
        event.setImageUrl(request.imageUrl());
    }
    private void replaceDetailImages(
            Event event,
            List<ApiDtos.DetailImageRequest> requests
    ) {
        event.getDetailImages().clear();

        if (requests == null) {
            return;
        }

        for (ApiDtos.DetailImageRequest request
                : requests) {

            event.getDetailImages().add(
                    new DetailImage(
                            request.url(),
                            request.placement()
                    )
            );
        }
    }

    @Transactional
    public ApiDtos.EventDto update(
            Long eventId,
            ApiDtos.EventRequest request
    ) {
        validateTicketCapacityPlan(
                request.capacity(),
                request.ticketTypes()
        );

        Event event =
                eventRepository
                        .findByIdForUpdate(eventId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Event not found"
                                )
                        );

        long eventSeatsSold =
                registrationRepository
                        .seatsReservedByEventId(
                                event.getId()
                        );

        if (request.capacity() < eventSeatsSold) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Event capacity cannot be lower than seats already sold"
            );
        }

        java.util.Map<Long, TicketType> existingById =
                new java.util.HashMap<>();

        for (TicketType ticket
                : event.getTicketTypes()) {

            if (ticket.getId() != null) {
                existingById.put(
                        ticket.getId(),
                        ticket
                );
            }
        }

        java.util.Set<Long> requestIds =
                new java.util.HashSet<>();

        for (ApiDtos.TicketTypeRequest ticketRequest
                : request.ticketTypes()) {

            Long ticketId =
                    ticketRequest.id();

            if (ticketId == null) {
                continue;
            }

            if (!requestIds.add(ticketId)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Duplicate ticket type ID"
                );
            }

            TicketType existingTicket =
                    existingById.get(ticketId);

            if (existingTicket == null) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Ticket type does not belong to this event"
                );
            }

            long sold =
                    registrationRepository
                            .seatsReservedByTicketTypeId(
                                    existingTicket.getId()
                            );

            if (ticketRequest.capacity() < sold) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Ticket capacity cannot be lower than seats already sold"
                );
            }
        }

        // ตรวจ TicketType ที่กำลังจะถูกลบ
        for (TicketType existingTicket
                : event.getTicketTypes()) {

            Long ticketId =
                    existingTicket.getId();

            if (ticketId == null
                    || requestIds.contains(ticketId)) {

                continue;
            }

            long sold =
                    registrationRepository
                            .seatsReservedByTicketTypeId(
                                    ticketId
                            );

            if (sold > 0L) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Cannot remove a ticket type that already has sales"
                );
            }
        }

        // ผ่าน validation ทั้งหมดก่อน
        // จึงค่อย mutate entity
        applyEventFields(
                event,
                request
        );

        replaceDetailImages(
                event,
                request.detailImages()
        );

        event.getTicketTypes()
                .removeIf(ticket ->
                        ticket.getId() != null
                                && !requestIds.contains(
                                ticket.getId()
                        )
                );

        for (ApiDtos.TicketTypeRequest ticketRequest
                : request.ticketTypes()) {

            if (ticketRequest.id() == null) {

                TicketType newTicket =
                        new TicketType(
                                event,
                                ticketRequest.name(),
                                ticketRequest.description(),
                                ticketRequest.price(),
                                ticketRequest.capacity()
                        );

                event.addTicketType(newTicket);

                continue;
            }

            TicketType ticket =
                    existingById.get(
                            ticketRequest.id()
                    );

            ticket.setName(
                    ticketRequest.name()
            );

            ticket.setDescription(
                    ticketRequest.description()
            );

            ticket.setPrice(
                    ticketRequest.price()
            );

            ticket.setCapacity(
                    ticketRequest.capacity()
            );
        }

        return eventDto(
                event,
                false
        );
    }

    @Transactional
    public void delete(
            Long eventId
    ) {
        Event event =
                eventRepository
                        .findById(eventId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Event not found"
                                )
                        );

        registrationRepository
                .deleteByEventId(eventId);

        eventRepository.delete(event);
    }

    @Transactional
    public ApiDtos.RegistrationDto register(
            Long eventId,
            ApiDtos.PurchaseRequest request,
            Principal principal
    ) {
        UserAccount user = currentUser(principal);

        Event event = eventRepository
                .findByIdForUpdate(eventId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Event not found"
                        )
                );

        if (!event.getStartsAt().isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Registration has closed"
            );
        }

        if (registrationRepository.existsByUserIdAndEventId(
                user.getId(),
                event.getId()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "You are already registered"
            );
        }

        TicketType ticket = ticketTypeRepository
                .findById(request.ticketTypeId())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Ticket type not found"
                        )
                );

        if (ticket.getEvent() == null
                || !Objects.equals(
                ticket.getEvent().getId(),
                event.getId()
        )) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ticket type does not belong to this event"
            );
        }

        int quantity = request.quantity();

        long eventSeats =
                registrationRepository
                        .seatsReservedByEventId(event.getId());

        if (eventSeats + quantity > event.getCapacity()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Event capacity exceeded"
            );
        }

        long ticketSeats =
                registrationRepository
                        .seatsReservedByTicketTypeId(ticket.getId());

        if (ticketSeats + quantity > ticket.getCapacity()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ticket capacity exceeded"
            );
        }

        Registration registration =
                new Registration(
                        user,
                        event,
                        ticket,
                        quantity
                );

        Registration saved =
                registrationRepository.save(registration);

        return registrationDto(saved);
    }
    private UserAccount currentUser(Principal principal) {

        if (principal == null
                || principal.getName() == null
                || principal.getName().isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        String email =
                principal.getName()
                        .trim()
                        .toLowerCase(Locale.ROOT);

        return userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "User not found"
                        )
                );
    }

    private ApiDtos.RegistrationDto registrationDto(
            Registration registration
    ) {
        TicketType ticket =
                registration.getTicketType();

        BigDecimal totalPrice =
                ticket == null
                        ? BigDecimal.ZERO
                        : ticket.getPrice()
                        .multiply(
                                BigDecimal.valueOf(
                                        registration.getQuantity()
                                )
                        );

        return new ApiDtos.RegistrationDto(
                registration.getId(),
                registration.getRegisteredAt(),
                registration.getQuantity(),
                registration.getTicketCode(),
                ticket == null
                        ? null
                        : ticket.getName(),
                totalPrice,
                eventDto(
                        registration.getEvent(),
                        true
                )
        );
    }


    private ApiDtos.EventDto eventDto(
            Event event,
            boolean registered
    ) {
        long sold =
                event.getId() == null
                        ? 0L
                        : registrationRepository
                        .seatsReservedByEventId(
                                event.getId()
                        );

        long spotsLeft =
                Math.max(
                        0L,
                        (long) event.getCapacity() - sold
                );

        String status;

        if (!event.getStartsAt()
                .isAfter(LocalDateTime.now())) {

            status = "ENDED";

        } else if (sold >= event.getCapacity()) {

            status = "FULL";

        } else {

            status = "OPEN";
        }

        List<ApiDtos.DetailImageDto> detailImages =
                event.getDetailImages()
                        .stream()
                        .map(image ->
                                new ApiDtos.DetailImageDto(
                                        image.getUrl(),
                                        image.getPlacement()
                                )
                        )
                        .toList();

        List<ApiDtos.TicketTypeDto> ticketTypes =
                event.getTicketTypes()
                        .stream()
                        .map(this::ticketTypeDto)
                        .toList();

        return new ApiDtos.EventDto(
                event.getId(),
                event.getTitle(),
                event.getDescription(),
                event.getLocation(),
                event.getStartsAt(),
                event.getCapacity(),
                event.getCategory(),
                event.getImageUrl(),
                detailImages,
                sold,
                spotsLeft,
                status,
                registered,
                ticketTypes
        );
    }

    private ApiDtos.TicketTypeDto ticketTypeDto(
            TicketType ticket
    ) {
        long sold =
                ticket.getId() == null
                        ? 0L
                        : registrationRepository
                        .seatsReservedByTicketTypeId(
                                ticket.getId()
                        );

        long remaining =
                Math.max(
                        0L,
                        (long) ticket.getCapacity() - sold
                );

        return new ApiDtos.TicketTypeDto(
                ticket.getId(),
                ticket.getName(),
                ticket.getDescription(),
                ticket.getPrice(),
                ticket.getCapacity(),
                sold,
                remaining
        );
    }

    @Transactional
    public void cancel(
            Long eventId,
            Principal principal
    ) {
        UserAccount user =
                currentUser(principal);

        long deleted =
                registrationRepository
                        .deleteByUserIdAndEventId(
                                user.getId(),
                                eventId
                        );

        if (deleted == 0L) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Registration not found"
            );
        }
    }

    @Transactional(readOnly = true)
    public List<ApiDtos.RegistrationDto> mine(
            Principal principal
    ) {
        UserAccount user =
                currentUser(principal);

        return registrationRepository
                .findByUserIdOrderByEventStartsAtAsc(
                        user.getId()
                )
                .stream()
                .map(this::registrationDto)
                .toList();
    }
// ============================================================
// Branch 7 — Staff Service Contract
// ============================================================

    @Transactional(readOnly = true)
    public List<ApiDtos.AttendeeDto> attendees(Long eventId) {
        throw notImplemented();
    }

    @Transactional
    public ApiDtos.CheckInDto checkIn(
            Long eventId,
            String ticketCode
    ) {
        throw notImplemented();
    }

    @Transactional(readOnly = true)
    public List<ApiDtos.AttendeeDto> recentCheckIns(Long eventId) {
        throw notImplemented();
    }

    private UnsupportedOperationException notImplemented() {
        return new UnsupportedOperationException(
                "EventService business logic is not implemented"
        );
    }
}