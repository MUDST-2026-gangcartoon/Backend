package com.eventhub.model;

import java.time.LocalDateTime;
import jakarta.persistence.*;

@Entity
@Table(name = "guest_email_verifications")
public class GuestEmailVerification {
    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(name = "code_hash", length = 72)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "resend_at", nullable = false)
    private LocalDateTime resendAt;

    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    protected GuestEmailVerification() {}

    public GuestEmailVerification(Long userId) {
        this.userId = userId;
    }

    public void issue(String email, String codeHash, LocalDateTime now) {
        this.email = email;
        this.codeHash = codeHash;
        expiresAt = now.plusMinutes(10);
        resendAt = now.plusMinutes(1);
        failedAttempts = 0;
        verifiedAt = null;
    }

    public boolean canResend(LocalDateTime now) {
        return resendAt == null || !now.isBefore(resendAt);
    }

    public String activeCodeHash(String email, LocalDateTime now) {
        return this.email.equals(email) && now.isBefore(expiresAt) && failedAttempts < 5
                ? codeHash : null;
    }

    public void rejectCode() {
        failedAttempts++;
        if (failedAttempts >= 5) codeHash = null;
    }

    public void verify(LocalDateTime now) {
        verifiedAt = now;
        codeHash = null;
    }

    public boolean hasProof(String email, LocalDateTime now) {
        return this.email.equals(email) && verifiedAt != null && now.isBefore(verifiedAt.plusMinutes(10));
    }
}
