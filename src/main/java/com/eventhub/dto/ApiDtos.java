package com.eventhub.dto;

import com.eventhub.model.Role;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public final class ApiDtos {

    private ApiDtos() {
    }

    // =========================
    // Authentication
    // =========================

    public record LoginRequest(

            @NotBlank(message = "Email is required")
            @Email(message = "Email must be valid")
            @Size(max = 254, message = "Email must not exceed 254 characters")
            String email,

            @NotBlank(message = "Password is required")
            @Size(max = 100, message = "Password must not exceed 100 characters")
            String password
    ) {
    }

    public record SignupRequest(

            @NotBlank(message = "Name is required")
            @Size(
                    min = 2,
                    max = 100,
                    message = "Name must contain between 2 and 100 characters"
            )
            String name,

            @NotBlank(message = "Email is required")
            @Email(message = "Email must be valid")
            @Size(max = 254, message = "Email must not exceed 254 characters")
            String email,

            @NotBlank(message = "Password is required")
            @Size(
                    min = 8,
                    max = 100,
                    message = "Password must contain between 8 and 100 characters"
            )
            String password
    ) {
    }

    public record UserDto(
            Long id,
            String name,
            String email,
            Role role
    ) {
    }


    // =========================
    // Detail Images
    // =========================

    public record DetailImageRequest(

            @NotBlank(message = "Image URL is required")
            @Size(
                    max = 2000,
                    message = "Image URL must not exceed 2000 characters"
            )
            String url,

            @NotBlank(message = "Image placement is required")
            @Size(
                    max = 24,
                    message = "Image placement must not exceed 24 characters"
            )
            String placement
    ) {
    }

    public record DetailImageDto(
            String url,
            String placement
    ) {
    }


    // =========================
    // Ticket Types
    // =========================

    public record TicketTypeRequest(

            Long id,

            @NotBlank(message = "Ticket type name is required")
            @Size(
                    max = 80,
                    message = "Ticket type name must not exceed 80 characters"
            )
            String name,

            @Size(
                    max = 500,
                    message = "Ticket type description must not exceed 500 characters"
            )
            String description,

            @NotNull(message = "Ticket price is required")
            @DecimalMin(
                    value = "0.00",
                    inclusive = true,
                    message = "Ticket price must be zero or greater"
            )
            @Digits(
                    integer = 10,
                    fraction = 2,
                    message = "Ticket price must contain at most 10 integer digits and 2 decimal places"
            )
            BigDecimal price,

            @NotNull(message = "Ticket capacity is required")
            @Min(
                    value = 1,
                    message = "Ticket capacity must be at least 1"
            )
            Integer capacity
    ) {
    }

    public record TicketTypeDto(
            Long id,
            String name,
            String description,
            BigDecimal price,
            int capacity,
            long sold,
            long remaining
    ) {
    }


    // =========================
    // Event
    // =========================

    public record EventRequest(

            @NotBlank(message = "Event title is required")
            @Size(
                    max = 255,
                    message = "Event title must not exceed 255 characters"
            )
            String title,

            @NotBlank(message = "Event description is required")
            @Size(
                    max = 2000,
                    message = "Event description must not exceed 2000 characters"
            )
            String description,

            @NotBlank(message = "Event location is required")
            @Size(
                    max = 255,
                    message = "Event location must not exceed 255 characters"
            )
            String location,

            @NotNull(message = "Event start time is required")
            LocalDateTime startsAt,

            @Min(
                    value = 1,
                    message = "Event capacity must be at least 1"
            )
            int capacity,

            @NotBlank(message = "Event category is required")
            @Pattern(
                    regexp = "TECH|DESIGN|CAREER|COMMUNITY",
                    message = "Event category must be TECH, DESIGN, CAREER, or COMMUNITY"
            )
            String category,

            @Size(
                    max = 2000,
                    message = "Image URL must not exceed 2000 characters"
            )
            String imageUrl,

            @Valid
            List<
                    @NotNull(message = "Detail image must not be null")
                            DetailImageRequest
                    > detailImages,

            @NotEmpty(message = "At least one ticket type is required")
            @Valid
            List<
                    @NotNull(message = "Ticket type must not be null")
                            TicketTypeRequest
                    > ticketTypes
    ) {
    }

    public record EventDto(
            Long id,
            String title,
            String description,
            String location,
            LocalDateTime startsAt,
            int capacity,
            String category,
            String imageUrl,
            List<DetailImageDto> detailImages,
            long registeredCount,
            long spotsLeft,
            String status,
            boolean registered,
            List<TicketTypeDto> ticketTypes
    ) {
    }

    public record EventPageDto(
            List<EventDto> items,
            int page,
            int size,
            long totalElements,
            int totalPages,
            boolean hasNext,
            boolean hasPrevious,
            long totalOpenEvents,
            long totalRegistrations
    ) {
    }


    // =========================
    // Registration / Purchase
    // =========================

    public record PurchaseRequest(

            @NotNull(message = "Ticket type ID is required")
            Long ticketTypeId,

            @NotNull(message = "Quantity is required")
            @Min(
                    value = 1,
                    message = "Quantity must be at least 1"
            )
            @Max(
                    value = 10,
                    message = "Quantity must not exceed 10"
            )
            Integer quantity
    ) {
    }

    public record RegistrationDto(
            Long id,
            LocalDateTime registeredAt,
            int quantity,
            String ticketCode,
            String ticketTypeName,
            BigDecimal totalPrice,
            EventDto event
    ) {
    }


    // =========================
    // Attendee / Check-in
    // =========================

    public record AttendeeDto(
            Long id,
            String name,
            String email,
            LocalDateTime registeredAt,
            String ticketType,
            int quantity,
            String ticketCode,
            LocalDateTime checkedInAt
    ) {
    }

    public record CheckInRequest(

            @NotBlank(message = "Ticket code is required")
            @Size(
                    max = 32,
                    message = "Ticket code must not exceed 32 characters"
            )
            String ticketCode
    ) {
    }

    public record CheckInDto(
            String ticketCode,
            String attendeeName,
            String eventTitle,
            String ticketType,
            int quantity,
            boolean checkedIn,
            LocalDateTime checkedInAt
    ) {
    }


    // =========================
    // Error
    // =========================

    public record ErrorDto(
            String message
    ) {
    }
}