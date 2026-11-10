package com.eventhub.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class GuestApiDtos {
    private GuestApiDtos() {}

    public record BookingRequest(
            @NotBlank @Size(max = 120) String displayName,
            @NotBlank @Email @Size(max = 254) String email,
            @NotNull @Positive Long ticketTypeId,
            @NotNull @Min(1) @Max(10) Integer quantity,
            UUID attemptId
    ) {}

    public record Receipt(
            Long registrationId, Long eventId, String eventTitle, String displayName,
            int quantity, String status, String ticketCode, LocalDateTime registeredAt,
            LocalDateTime checkedInAt
    ) {}

    public record Payment(
            Long paymentId, Long eventId, int quantity, String status, BigDecimal totalAmount,
            LocalDateTime expiresAt, String qrPayload, Receipt registration
    ) {}

    public record VerificationCode(@NotBlank @Pattern(regexp = "[0-9]{6}") String code) {}

    public record ClaimResult(int claimedRegistrations) {}

    public record StartAttempt(@NotNull @Positive Long eventId, @NotNull UUID attemptId) {}

    public record Funnel(
            Long eventId, LocalDate from, LocalDate to, int maturityMinutes,
            FunnelCounts total, FunnelCounts guest, FunnelCounts user
    ) {}

    public record FunnelCounts(
            long startedAttempts, long completedAttempts, long maturedAttempts,
            long pendingAttempts, long droppedOffAttempts, BigDecimal dropOffRate,
            long confirmedOrders, long confirmedSeats, long activeSeats, long checkedInSeats,
            BigDecimal showRate, long cancelledOrders, long cancelledSeats
    ) {}
}
