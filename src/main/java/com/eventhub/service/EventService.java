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
        throw notImplemented();
    }

    @Transactional
    public ApiDtos.EventDto create(
            ApiDtos.EventRequest request
    ) {
        throw notImplemented();
    }

    @Transactional
    public ApiDtos.EventDto update(
            Long eventId,
            ApiDtos.EventRequest request
    ) {
        throw notImplemented();
    }

    @Transactional
    public void delete(
            Long eventId
    ) {
        throw notImplemented();
    }

    @Transactional
    public ApiDtos.RegistrationDto register(
            Long eventId,
            ApiDtos.PurchaseRequest request,
            Principal principal
    ) {
        throw notImplemented();
    }

    @Transactional
    public void cancel(
            Long eventId,
            Principal principal
    ) {
        throw notImplemented();
    }

    @Transactional(readOnly = true)
    public List<ApiDtos.RegistrationDto> mine(
            Principal principal
    ) {
        throw notImplemented();
    }

    private UnsupportedOperationException notImplemented() {
        return new UnsupportedOperationException(
                "EventService business logic is not implemented"
        );
    }
}