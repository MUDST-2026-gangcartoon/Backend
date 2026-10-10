package com.eventhub.integration.repository;

import com.eventhub.model.Event;
import com.eventhub.model.Registration;
import com.eventhub.model.Role;
import com.eventhub.model.TicketType;
import com.eventhub.model.UserAccount;

import jakarta.persistence.EntityManager;

import java.math.BigDecimal;
import java.time.LocalDateTime;

final class RepositoryTestData {

    private final EntityManager entityManager;

    RepositoryTestData(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    Event event(
            String title,
            String description,
            String location,
            LocalDateTime startsAt,
            int capacity,
            String category
    ) {
        Event event = new Event();

        event.setTitle(title);
        event.setDescription(description);
        event.setLocation(location);
        event.setStartsAt(startsAt);
        event.setCapacity(capacity);
        event.setCategory(category);

        entityManager.persist(event);

        return event;
    }

    TicketType ticket(
            Event event,
            String name,
            int capacity
    ) {
        TicketType ticket = new TicketType(
                event,
                name,
                name + " ticket",
                new BigDecimal("250.00"),
                capacity
        );

        entityManager.persist(ticket);

        return ticket;
    }

    UserAccount user(
            String name,
            String email
    ) {
        UserAccount user = new UserAccount(
                name,
                email,
                "synthetic-test-password",
                Role.USER
        );

        entityManager.persist(user);

        return user;
    }

    Registration registration(
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

        entityManager.persist(registration);

        return registration;
    }

    void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }
}