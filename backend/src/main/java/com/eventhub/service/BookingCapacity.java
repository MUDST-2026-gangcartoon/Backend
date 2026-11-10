package com.eventhub.service;

import com.eventhub.model.Event;
import com.eventhub.model.TicketType;
import com.eventhub.repository.RegistrationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

final class BookingCapacity {
    private BookingCapacity() {}

    // Callers hold the event row lock shared by both member and guest writes.
    static void requireAvailable(RegistrationRepository registrations, Event event, TicketType ticket, int quantity) {
        if (registrations.seatsReservedByEventId(event.getId()) + quantity > event.getCapacity()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Event capacity exceeded");
        }
        if (registrations.seatsReservedByTicketTypeId(ticket.getId()) + quantity > ticket.getCapacity()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ticket capacity exceeded");
        }
    }
}
