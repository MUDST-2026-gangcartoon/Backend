package com.eventhub.integration.payment;

import com.eventhub.model.*;
import com.eventhub.repository.*;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.springframework.security.test.web.servlet.request
        .SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request
        .SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup
        .SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request
        .MockMvcRequestBuilders.post;

abstract class MockPaymentDbTestSupport {

    @Autowired protected WebApplicationContext context;
    @Autowired protected EventRepository events;
    @Autowired protected TicketTypeRepository tickets;
    @Autowired protected RegistrationRepository registrations;
    @Autowired protected MockPaymentRepository payments;
    @Autowired protected UserRepository users;
    @Autowired protected PasswordEncoder passwordEncoder;

    protected MockMvc mvc;

    protected UserAccount alice;
    protected UserAccount bob;

    protected Event event;
    protected TicketType ticket;

    @BeforeEach
    void preparePaymentDatabase() {

        // ไม่ใช้ @Transactional ครอบ HTTP Integration Tests
        // เพื่อให้แต่ละ HTTP request มี Transaction จริงของตัวเอง

        registrations.deleteAllInBatch();
        payments.deleteAllInBatch();
        tickets.deleteAllInBatch();
        events.deleteAllInBatch();
        users.deleteAllInBatch();

        alice = users.saveAndFlush(new UserAccount(
                "Alice",
                "alice@example.test",
                passwordEncoder.encode("TestPassword123!"),
                Role.USER
        ));

        bob = users.saveAndFlush(new UserAccount(
                "Bob",
                "bob@example.test",
                passwordEncoder.encode("TestPassword123!"),
                Role.USER
        ));

        event = new Event();

        event.setTitle("Paid Workshop");
        event.setDescription("Payment integration test");
        event.setLocation("Bangkok");
        event.setCategory("TECH");
        event.setCapacity(5);
        event.setStartsAt(LocalDateTime.now().plusDays(7));

        ticket = new TicketType(
                event,
                "General",
                "General admission",
                new BigDecimal("250.00"),
                5
        );

        event.addTicketType(ticket);

        event = events.saveAndFlush(event);
        ticket = event.getTicketTypes().get(0);

        mvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    protected MockPaymentOrder createPending(
            UserAccount owner,
            int quantity
    ) {
        LocalDateTime now = LocalDateTime.now();

        MockPaymentOrder payment = new MockPaymentOrder(
                owner,
                event.getId(),
                ticket.getId(),
                event.getTitle(),
                ticket.getName(),
                quantity,
                ticket.getPrice(),
                now,
                now.plusMinutes(10)
        );

        return payments.saveAndFlush(payment);
    }

    protected ResultActions checkout(
            String email,
            int quantity
    ) throws Exception {
        return mvc.perform(
                post("/api/payments/mock/checkout")
                        .with(user(email).roles("USER"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventId": %d,
                                  "ticketTypeId": %d,
                                  "quantity": %d
                                }
                                """.formatted(
                                event.getId(),
                                ticket.getId(),
                                quantity
                        ))
        );
    }
}