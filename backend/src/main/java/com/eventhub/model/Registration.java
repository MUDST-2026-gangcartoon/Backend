package com.eventhub.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name="registrations",uniqueConstraints=@UniqueConstraint(name="uk_active_registration_user_event",columnNames={"active_user_id","event_id"}))
public class Registration {
    @Column(name="active_user_id")
    private Long activeUserId;
    @PrePersist @PreUpdate
    public void syncActiveUser(){activeUserId=isActive()&&user!=null?user.getId():null;}

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

    @Column(length=20) private String status="CONFIRMED";
    private LocalDateTime cancelledAt;
    @Column(length=1000) private String cancelReason;
    @Column(precision=12,scale=2) private java.math.BigDecimal purchasedUnitPrice;
    @Column(length=80) private String purchasedTicketName;
    @Column(length=254) private String checkedInBy;
    @Column(name="checkin_source",length=16) private String checkinSource;
    public String getCheckinSource(){
        if(checkedInAt==null)return null;
        if("STAFF".equals(checkinSource)||"ONLINE".equals(checkinSource))return checkinSource;
        if("ผู้เข้าร่วมออนไลน์".equals(checkedInBy))return "ONLINE";
        return checkedInBy==null||checkedInBy.isBlank()?"UNKNOWN":"STAFF";
    }
    public void setCheckinSource(String value){checkinSource=value;}

    public String getStatus(){return status==null?"CONFIRMED":status;}
    public boolean isActive(){return "CONFIRMED".equals(getStatus());}
    public LocalDateTime getCancelledAt(){return cancelledAt;}
    public String getCancelReason(){return cancelReason;}
    public String getCheckedInBy(){return checkedInBy;}
    public void setCheckedInBy(String value){checkedInBy=value;}
    public java.math.BigDecimal getPurchasedUnitPrice(){return purchasedUnitPrice;}
    public String getPurchasedTicketName(){return purchasedTicketName;}
    public void snapshot(String name,java.math.BigDecimal price){purchasedTicketName=name;purchasedUnitPrice=price;}
    public void cancel(String reason){status="CANCELLED";activeUserId=null;cancelledAt=com.eventhub.service.EventClock.now();cancelReason=reason;}
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
        this.registeredAt = com.eventhub.service.EventClock.now();
        this.ticketCode = generateTicketCode();
        snapshot(ticketType==null?"General":ticketType.getName(),ticketType==null?java.math.BigDecimal.ZERO:ticketType.getPrice());
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
            checkedInAt = com.eventhub.service.EventClock.now();
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
