package com.eventhub.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(
        name = "registrations",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_registration_user_event",
                        columnNames = {"user_id", "event_id"}
                )
        }
)
public class Registration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_type_id")
    private TicketType ticketType;

    @Column(name = "registered_at", nullable = false)
    private LocalDateTime registeredAt;

    private Integer quantity = 1;

    @Column(
            name = "ticket_code",
            length = 32,
            nullable = false,
            unique = true
    )
    private String ticketCode;

    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;

    public Registration() {
    }

    public Registration(
            UserAccount user,
            Event event,
            TicketType ticketType,
            Integer quantity
    ) {
        this.user = user;
        this.event = event;
        this.ticketType = ticketType;
        this.quantity = quantity == null ? 1 : quantity;
        this.registeredAt = LocalDateTime.now();
        this.ticketCode = generateTicketCode();
    }

    private static String generateTicketCode() {
        String randomPart = UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 10)
                .toUpperCase(Locale.ROOT);

        return "GTH-" + randomPart;
    }

    public void checkIn() {
        if (checkedInAt == null) {
            checkedInAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public UserAccount getUser() {
        return user;
    }

    public void setUser(UserAccount user) {
        this.user = user;
    }

    public Event getEvent() {
        return event;
    }

    public void setEvent(Event event) {
        this.event = event;
    }

    public TicketType getTicketType() {
        return ticketType;
    }

    public void setTicketType(TicketType ticketType) {
        this.ticketType = ticketType;
    }

    public LocalDateTime getRegisteredAt() {
        return registeredAt;
    }

    public Integer getQuantity() {
        return quantity == null ? 1 : quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public String getTicketCode() {
        return ticketCode;
    }

    public LocalDateTime getCheckedInAt() {
        return checkedInAt;
    }
}