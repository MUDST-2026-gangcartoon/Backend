package com.eventhub.model;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;

@Entity
@Table(name = "registration_attempts", indexes = @Index(
        name = "idx_registration_attempts_event_started", columnList = "event_id,started_at"))
public class RegistrationAttempt {
    @Id
    private UUID id;

    @Version
    private Long version;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "owner_key", nullable = false, length = 66)
    private String ownerKey;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "registration_id")
    private Long registrationId;

    protected RegistrationAttempt() {}

    public RegistrationAttempt(UUID id, Long eventId, String ownerKey, LocalDateTime startedAt) {
        this.id = id;
        this.eventId = eventId;
        this.ownerKey = ownerKey;
        this.startedAt = startedAt;
    }

    public boolean belongsTo(Long eventId, String ownerKey) {
        return this.eventId.equals(eventId) && this.ownerKey.equals(ownerKey);
    }

    public boolean isGuest() { return ownerKey.startsWith("g:"); }
    public LocalDateTime getStartedAt() { return startedAt; }
    public LocalDateTime getConfirmedAt() { return confirmedAt; }
    public Long getRegistrationId() { return registrationId; }

    public void confirm(Long registrationId, LocalDateTime confirmedAt) {
        this.registrationId = registrationId;
        this.confirmedAt = confirmedAt;
    }
}
