
package com.eventhub.service;

import com.eventhub.dto.ApiDtos;
import com.eventhub.model.Event;
import com.eventhub.model.MockPaymentOrder;
import com.eventhub.model.MockPaymentStatus;
import com.eventhub.model.Registration;
import com.eventhub.model.TicketType;
import com.eventhub.model.UserAccount;
import com.eventhub.repository.EventRepository;
import com.eventhub.repository.MockPaymentRepository;
import com.eventhub.repository.RegistrationRepository;
import com.eventhub.repository.TicketTypeRepository;
import com.eventhub.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
public class MockPaymentService {

    private static final String CURRENCY = "THB";
    private static final int EXPIRATION_MINUTES = 10;

    private final EventRepository eventRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final RegistrationRepository registrationRepository;
    private final UserRepository userRepository;
    private final MockPaymentRepository mockPaymentRepository;

    // Keep the existing constructor contract used by QA Tests.
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

    // =========================================================
    // 1. Checkout
    // =========================================================

    @Transactional
    public ApiDtos.MockCheckoutDto checkout(
            ApiDtos.MockCheckoutRequest request,
            Principal principal
    ) {
        UserAccount user = currentUser(principal);

        if (request == null
                || request.eventId() == null
                || request.ticketTypeId() == null
                || request.quantity() == null
                || request.quantity() < 1
                || request.quantity() > 10) {
            throw error(HttpStatus.BAD_REQUEST, "Invalid checkout request");
        }

        // Serialize checkout for the same event.
        // This prevents concurrent active pending orders for
        // the same user/event without reserving seats.
        Event event = lockedEvent(request.eventId());

        LocalDateTime now = LocalDateTime.now();
        ensureEventOpen(event, now);

        if (registrationRepository.existsByUserIdAndEventId(
                user.getId(),
                event.getId()
        )) {
            throw error(
                    HttpStatus.CONFLICT,
                    "You are already registered"
            );
        }

        TicketType ticket = ticketRepositoryItem(
                request.ticketTypeId(),
                event.getId()
        );

        if (ticket.getPrice() == null
                || ticket.getPrice().signum() <= 0) {
            throw error(
                    HttpStatus.CONFLICT,
                    "Free tickets must use direct registration"
            );
        }

        // Check current availability, but do not reserve seats.
        ensureCapacity(event, ticket, request.quantity());

        // At most one active pending payment per user/event.
        List<MockPaymentOrder> pendingOrders =
                mockPaymentRepository.findByUserIdAndEventIdAndStatus(
                        user.getId(),
                        event.getId(),
                        MockPaymentStatus.PENDING_PAYMENT
                );

        for (MockPaymentOrder pending : pendingOrders) {
            if (!pending.getExpiresAt().isAfter(now)) {
                // Lazy expiration runs inside this write transaction.
                pending.markExpired();
            } else {
                throw error(
                        HttpStatus.CONFLICT,
                        "An active pending payment already exists"
                );
            }
        }

        MockPaymentOrder order = new MockPaymentOrder(
                user,
                event.getId(),
                ticket.getId(),
                event.getTitle(),
                ticket.getName(),
                request.quantity(),
                ticket.getPrice(),
                now,
                now.plusMinutes(EXPIRATION_MINUTES)
        );

        MockPaymentOrder saved = mockPaymentRepository.save(order);

        return new ApiDtos.MockCheckoutDto(
                saved.getId(),
                saved.getStatus().name(),
                saved.getEventId(),
                saved.getTicketTypeId(),
                saved.getQuantity(),
                saved.getUnitPrice(),
                saved.getTotalAmount(),
                CURRENCY,
                "EVENTHUB_DEMO_PAYMENT:" + saved.getId(),
                saved.getExpiresAt()
        );
    }

    // =========================================================
    // 2. Confirm
    // =========================================================

    @Transactional
    public ApiDtos.MockConfirmDto confirm(
            Long paymentId,
            Principal principal
    ) {
        UserAccount user = currentUser(principal);
        MockPaymentOrder order = ownedPaymentForUpdate(
                paymentId,
                user
        );

        // Idempotency: never issue a second registration.
        if (order.getStatus() == MockPaymentStatus.CONFIRMED) {
            Registration existing = registrationRepository
                    .findById(order.getRegistrationId())
                    .orElseThrow(() -> error(
                            HttpStatus.CONFLICT,
                            "The issued registration is no longer active"
                    ));

            if (!Objects.equals(
                    existing.getUser().getId(),
                    user.getId()
            ) || !Objects.equals(
                    existing.getEvent().getId(),
                    order.getEventId()
            ) || !Objects.equals(
                    existing.getTicketCode(),
                    order.getIssuedTicketCode()
            )) {
                throw error(
                        HttpStatus.CONFLICT,
                        "The original registration is no longer valid"
                );
            }

            return new ApiDtos.MockConfirmDto(
                    order.getId(),
                    MockPaymentStatus.CONFIRMED.name(),
                    toRegistrationDto(existing, order)
            );
        }

        if (order.getStatus() != MockPaymentStatus.PENDING_PAYMENT) {
            throw error(
                    HttpStatus.CONFLICT,
                    "Payment is not pending"
            );
        }

        LocalDateTime now = LocalDateTime.now();

        // At the expiration boundary, confirmation is rejected.
        if (!order.getExpiresAt().isAfter(now)) {
            // GET reports EXPIRED using the effective status.
            // Do not mutate then throw inside this transaction,
            // because the exception would roll back the mutation.
            throw error(
                    HttpStatus.CONFLICT,
                    "Payment has expired"
            );
        }

        // Lock the event before checking current capacity.
        Event event = lockedEvent(order.getEventId());
        ensureEventOpen(event, now);

        TicketType ticket = ticketRepositoryItem(
                order.getTicketTypeId(),
                event.getId()
        );

        if (ticket.getPrice() == null
                || ticket.getPrice().compareTo(
                order.getUnitPrice()
        ) != 0) {
            throw error(
                    HttpStatus.CONFLICT,
                    "Ticket price has changed"
            );
        }

        if (registrationRepository.existsByUserIdAndEventId(
                user.getId(),
                event.getId()
        )) {
            throw error(
                    HttpStatus.CONFLICT,
                    "You are already registered"
            );
        }

        ensureCapacity(event, ticket, order.getQuantity());

        Registration registration = new Registration(
                user,
                event,
                ticket,
                order.getQuantity()
        );

        // Persist and flush registration inside the same transaction
        // before marking the payment CONFIRMED.
        Registration saved = registrationRepository.save(registration);
        registrationRepository.flush();

        order.markConfirmed(
                saved.getId(),
                saved.getTicketCode(),
                LocalDateTime.now()
        );

        return new ApiDtos.MockConfirmDto(
                order.getId(),
                order.getStatus().name(),
                toRegistrationDto(saved, order)
        );
    }

    // =========================================================
    // 3. Status / Payment history
    // =========================================================

    @Transactional(readOnly = true)
    public ApiDtos.MockPaymentStatusDto get(
            Long paymentId,
            Principal principal
    ) {
        UserAccount user = currentUser(principal);
        MockPaymentOrder order = ownedPayment(paymentId, user);

        // Reading history must not require an active Registration,
        // Event or TicketType.
        return toStatusDto(order);
    }

    // =========================================================
    // 4. Cancel
    // =========================================================

    @Transactional
    public ApiDtos.MockPaymentStatusDto cancel(
            Long paymentId,
            Principal principal
    ) {
        UserAccount user = currentUser(principal);
        MockPaymentOrder order = ownedPaymentForUpdate(
                paymentId,
                user
        );

        if (effectiveStatus(order, LocalDateTime.now())
                != MockPaymentStatus.PENDING_PAYMENT) {
            throw error(
                    HttpStatus.CONFLICT,
                    "Only active pending payments can be cancelled"
            );
        }

        order.markCancelled();

        // Preserve payment history and never delete Registration.
        return toStatusDto(order);
    }

    // =========================================================
    // 5. Authentication and ownership
    // =========================================================

    private UserAccount currentUser(Principal principal) {
        if (principal == null
                || principal.getName() == null
                || principal.getName().isBlank()) {
            throw error(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        String email = principal.getName()
                .trim()
                .toLowerCase(Locale.ROOT);

        return userRepository.findByEmail(email)
                .orElseThrow(() -> error(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));
    }

    private MockPaymentOrder ownedPayment(
            Long paymentId,
            UserAccount user
    ) {
        MockPaymentOrder order = mockPaymentRepository
                .findById(paymentId)
                .orElseThrow(() -> error(
                        HttpStatus.NOT_FOUND,
                        "Payment not found"
                ));

        ensureOwner(order, user);
        return order;
    }

    private MockPaymentOrder ownedPaymentForUpdate(
            Long paymentId,
            UserAccount user
    ) {
        // Pessimistic row lock prevents double confirmation.
        MockPaymentOrder order = mockPaymentRepository
                .findByIdForUpdate(paymentId)
                .orElseThrow(() -> error(
                        HttpStatus.NOT_FOUND,
                        "Payment not found"
                ));

        ensureOwner(order, user);
        return order;
    }

    private void ensureOwner(
            MockPaymentOrder order,
            UserAccount user
    ) {
        if (!Objects.equals(
                order.getUser().getId(),
                user.getId()
        )) {
            // Do not reveal another user's payment existence.
            throw error(
                    HttpStatus.NOT_FOUND,
                    "Payment not found"
            );
        }
    }

    // =========================================================
    // 6. Event, ticket and capacity validation
    // =========================================================

    private Event lockedEvent(Long eventId) {
        return eventRepository.findByIdForUpdate(eventId)
                .orElseThrow(() -> error(
                        HttpStatus.NOT_FOUND,
                        "Event not found"
                ));
    }

    private TicketType ticketRepositoryItem(
            Long ticketTypeId,
            Long eventId
    ) {
        TicketType ticket = ticketTypeRepository
                .findById(ticketTypeId)
                .orElseThrow(() -> error(
                        HttpStatus.NOT_FOUND,
                        "Ticket type not found"
                ));

        if (ticket.getEvent() == null
                || !Objects.equals(
                ticket.getEvent().getId(),
                eventId
        )) {
            throw error(
                    HttpStatus.CONFLICT,
                    "Ticket type does not belong to this event"
            );
        }

        return ticket;
    }

    private void ensureEventOpen(
            Event event,
            LocalDateTime now
    ) {
        if (!event.getStartsAt().isAfter(now)) {
            throw error(
                    HttpStatus.CONFLICT,
                    "Registration has closed"
            );
        }
    }

    private void ensureCapacity(
            Event event,
            TicketType ticket,
            int quantity
    ) {
        long eventSold = registrationRepository
                .seatsReservedByEventId(event.getId());

        if (eventSold + quantity > event.getCapacity()) {
            throw error(
                    HttpStatus.CONFLICT,
                    "Event capacity exceeded"
            );
        }

        long ticketSold = registrationRepository
                .seatsReservedByTicketTypeId(ticket.getId());

        if (ticketSold + quantity > ticket.getCapacity()) {
            throw error(
                    HttpStatus.CONFLICT,
                    "Ticket capacity exceeded"
            );
        }
    }

    // =========================================================
    // 7. Status mapping
    // =========================================================

    private MockPaymentStatus effectiveStatus(
            MockPaymentOrder order,
            LocalDateTime now
    ) {
        if (order.getStatus() == MockPaymentStatus.PENDING_PAYMENT
                && !order.getExpiresAt().isAfter(now)) {
            return MockPaymentStatus.EXPIRED;
        }

        return order.getStatus();
    }

    private ApiDtos.MockPaymentStatusDto toStatusDto(
            MockPaymentOrder order
    ) {
        return new ApiDtos.MockPaymentStatusDto(
                order.getId(),
                effectiveStatus(order, LocalDateTime.now()).name(),
                order.getTotalAmount(),
                CURRENCY,
                order.getConfirmedAt(),
                order.getRegistrationId()
        );
    }

    // =========================================================
    // 8. Registration response mapping
    // =========================================================

    private ApiDtos.RegistrationDto toRegistrationDto(
            Registration registration,
            MockPaymentOrder order
    ) {
        Event event = registration.getEvent();

        long sold = registrationRepository
                .seatsReservedByEventId(event.getId());

        long spotsLeft = Math.max(
                0L,
                (long) event.getCapacity() - sold
        );

        String status;

        if (!event.getStartsAt().isAfter(LocalDateTime.now())) {
            status = "ENDED";
        } else if (sold >= event.getCapacity()) {
            status = "FULL";
        } else {
            status = "OPEN";
        }

        List<ApiDtos.DetailImageDto> detailImages =
                event.getDetailImages()
                        .stream()
                        .map(image -> new ApiDtos.DetailImageDto(
                                image.getUrl(),
                                image.getPlacement()
                        ))
                        .toList();

        List<ApiDtos.TicketTypeDto> ticketTypes =
                event.getTicketTypes()
                        .stream()
                        .map(ticket -> {
                            long ticketSold = registrationRepository
                                    .seatsReservedByTicketTypeId(
                                            ticket.getId()
                                    );

                            return new ApiDtos.TicketTypeDto(
                                    ticket.getId(),
                                    ticket.getName(),
                                    ticket.getDescription(),
                                    ticket.getPrice(),
                                    ticket.getCapacity(),
                                    ticketSold,
                                    Math.max(
                                            0L,
                                            (long) ticket.getCapacity()
                                                    - ticketSold
                                    )
                            );
                        })
                        .toList();

        ApiDtos.EventDto eventDto = new ApiDtos.EventDto(
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
                true,
                ticketTypes
        );

        return new ApiDtos.RegistrationDto(
                registration.getId(),
                registration.getRegisteredAt(),
                registration.getQuantity(),
                registration.getTicketCode(),
                order.getTicketTypeName(),
                order.getTotalAmount(),
                eventDto
        );
    }

    private ResponseStatusException error(
            HttpStatus status,
            String message
    ) {
        return new ResponseStatusException(status, message);
    }
}
