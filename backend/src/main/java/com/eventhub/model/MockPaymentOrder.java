
package com.eventhub.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(
        name = "mock_payment_orders",
        indexes = {
                @Index(
                        name = "idx_mock_payment_user_event_status",
                        columnList = "user_id,event_id,status"
                )
        }
)
public class MockPaymentOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "ticket_type_id", nullable = false)
    private Long ticketTypeId;

    @Column(name = "event_title", nullable = false)
    private String eventTitle;

    @Column(
            name = "ticket_type_name",
            nullable = false,
            length = 80
    )
    private String ticketTypeName;

    @Column(nullable = false)
    private int quantity;

    @Column(
            name = "unit_price",
            nullable = false,
            precision = 12,
            scale = 2
    )
    private BigDecimal unitPrice;

    @Column(
            name = "total_amount",
            nullable = false,
            precision = 14,
            scale = 2
    )
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private MockPaymentStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "registration_id")
    private Long registrationId;

    @Column(name = "issued_ticket_code", length = 32)
    private String issuedTicketCode;

    protected MockPaymentOrder() {
    }

    public MockPaymentOrder(
            UserAccount user,
            Long eventId,
            Long ticketTypeId,
            String eventTitle,
            String ticketTypeName,
            int quantity,
            BigDecimal unitPrice,
            LocalDateTime createdAt,
            LocalDateTime expiresAt
    ) {
        this.user = Objects.requireNonNull(user);
        this.eventId = Objects.requireNonNull(eventId);
        this.ticketTypeId = Objects.requireNonNull(ticketTypeId);
        this.eventTitle = Objects.requireNonNull(eventTitle);
        this.ticketTypeName = Objects.requireNonNull(ticketTypeName);

        this.createdAt = Objects.requireNonNull(createdAt);
        this.expiresAt = Objects.requireNonNull(expiresAt);

        if (quantity < 1 || quantity > 10) {
            throw new IllegalArgumentException(
                    "Quantity must be between 1 and 10"
            );
        }

        if (!expiresAt.isAfter(createdAt)) {
            throw new IllegalArgumentException(
                    "Payment expiration must be after creation"
            );
        }

        this.unitPrice = Objects.requireNonNull(unitPrice)
                .setScale(2, RoundingMode.UNNECESSARY);

        if (this.unitPrice.signum() <= 0) {
            throw new IllegalArgumentException(
                    "Mock payment requires a paid ticket"
            );
        }

        this.quantity = quantity;

        this.totalAmount = this.unitPrice.multiply(
                BigDecimal.valueOf(quantity)
        );

        this.status = MockPaymentStatus.PENDING_PAYMENT;
    }

    public void markConfirmed(
            Long registrationId,
            String ticketCode,
            LocalDateTime confirmedAt
    ) {
        if (status != MockPaymentStatus.PENDING_PAYMENT) {
            throw new IllegalStateException(
                    "Payment is not pending"
            );
        }

        this.registrationId =
                Objects.requireNonNull(registrationId);

        if (ticketCode == null || ticketCode.isBlank()) {
            throw new IllegalArgumentException(
                    "Ticket code is required"
            );
        }

        this.issuedTicketCode = ticketCode;
        this.confirmedAt = Objects.requireNonNull(confirmedAt);
        this.status = MockPaymentStatus.CONFIRMED;
    }

    public void markCancelled() {
        if (status != MockPaymentStatus.PENDING_PAYMENT) {
            throw new IllegalStateException(
                    "Only pending payments can be cancelled"
            );
        }

        this.status = MockPaymentStatus.CANCELLED;
    }

    public void markExpired() {
        if (status != MockPaymentStatus.PENDING_PAYMENT) {
            throw new IllegalStateException(
                    "Only pending payments can expire"
            );
        }

        this.status = MockPaymentStatus.EXPIRED;
    }

    public Long getId() {
        return id;
    }

    public UserAccount getUser() {
        return user;
    }

    public Long getEventId() {
        return eventId;
    }

    public Long getTicketTypeId() {
        return ticketTypeId;
    }

    public String getEventTitle() {
        return eventTitle;
    }

    public String getTicketTypeName() {
        return ticketTypeName;
    }

    public int getQuantity() {
        return quantity;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public MockPaymentStatus getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public LocalDateTime getConfirmedAt() {
        return confirmedAt;
    }

    public Long getRegistrationId() {
        return registrationId;
    }

    public String getIssuedTicketCode() {
        return issuedTicketCode;
    }
}
