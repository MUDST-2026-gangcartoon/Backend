package com.eventhub.model;

import jakarta.persistence.*;

@Entity
@Table(name = "guest_identities")
public class GuestIdentity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "normalized_email", nullable = false, unique = true, length = 254)
    private String normalizedEmail;

    @Column(name = "claimed_user_id")
    private Long claimedUserId;

    protected GuestIdentity() {}

    public GuestIdentity(String normalizedEmail) {
        this.normalizedEmail = normalizedEmail;
    }

    public Long getId() { return id; }
    public String getNormalizedEmail() { return normalizedEmail; }
    public Long getClaimedUserId() { return claimedUserId; }

    public void claim(Long userId) {
        if (claimedUserId != null && !claimedUserId.equals(userId)) {
            throw new IllegalStateException("Guest identity already has an owner");
        }
        claimedUserId = userId;
    }
}
