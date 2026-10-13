package com.eventhub.service;

import com.eventhub.dto.ApiDtos;

import com.eventhub.repository.EventRepository;
import com.eventhub.repository.TicketTypeRepository;
import com.eventhub.repository.RegistrationRepository;
import com.eventhub.repository.UserRepository;
import com.eventhub.repository.MockPaymentRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;

@Service
public class MockPaymentService {

    private final EventRepository eventRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final RegistrationRepository registrationRepository;
    private final UserRepository userRepository;
    private final MockPaymentRepository mockPaymentRepository;

    public MockPaymentService(
            EventRepository eventRepository,
            TicketTypeRepository ticketTypeRepository,
            RegistrationRepository registrationRepository,
            UserRepository userRepository,
            MockPaymentRepository mockPaymentRepository
    ) {
        this.eventRepository = eventRepository;
        this.ticketTypeRepository = ticketTypeRepository;
        this.registrationRepository = registrationRepository;
        this.userRepository = userRepository;
        this.mockPaymentRepository = mockPaymentRepository;
    }

    @Transactional
    public ApiDtos.MockCheckoutDto checkout(
            ApiDtos.MockCheckoutRequest request,
            Principal principal
    ) {
        throw new UnsupportedOperationException(
                "Mock payment checkout is not implemented"
        );
    }

    @Transactional
    public ApiDtos.MockConfirmDto confirm(
            Long paymentId,
            Principal principal
    ) {
        throw new UnsupportedOperationException(
                "Mock payment confirmation is not implemented"
        );
    }

    @Transactional(readOnly = true)
    public ApiDtos.MockPaymentStatusDto get(
            Long paymentId,
            Principal principal
    ) {
        throw new UnsupportedOperationException(
                "Mock payment status is not implemented"
        );
    }

    @Transactional
    public ApiDtos.MockPaymentStatusDto cancel(
            Long paymentId,
            Principal principal
    ) {
        throw new UnsupportedOperationException(
                "Mock payment cancellation is not implemented"
        );
    }
}