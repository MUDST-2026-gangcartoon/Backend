package com.eventhub.dto;

import com.eventhub.model.Role;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import java.util.Locale;

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
        public LoginRequest {
            if (email != null) {
                email = email.trim().toLowerCase(Locale.ROOT);
            }
        }
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
        public SignupRequest {
            if (name != null) {
                name = name.trim();
            }

            if (email != null) {
                email = email.trim().toLowerCase(Locale.ROOT);
            }
        }
    }

    public record UserDto(
            Long id,
            String name,
            String email,
            Role role
    ) {
    }
    public record CsrfDto(
            String token,
            String headerName
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
            Integer capacity, Boolean salesEnabled
    ) {
        public TicketTypeRequest(Long id,String name,String description,BigDecimal price,Integer capacity){this(id,name,description,price,capacity,null);}
    }

    public record TicketTypeDto(
            Long id,
            String name,
            String description,
            BigDecimal price,
            int capacity,
            long sold,
            long remaining,
            boolean removable, String removalBlockedReason, boolean salesEnabled
    ) {
        public TicketTypeDto(Long id,String name,String description,BigDecimal price,int capacity,long sold,long remaining,boolean removable,String reason){this(id,name,description,price,capacity,sold,remaining,removable,reason,true);}
        public TicketTypeDto(Long id,String name,String description,BigDecimal price,int capacity,long sold,long remaining){this(id,name,description,price,capacity,sold,remaining,sold==0,sold==0?null:"ประเภทบัตรมีประวัติการจอง จึงลบไม่ได้");}
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
                    > ticketTypes,
            LocalDateTime endsAt, LocalDateTime registrationClosesAt,
            LocalDateTime checkinOpensAt, LocalDateTime checkinClosesAt,
            @Size(max=100) String organizerName, @Size(max=254) String organizerContact,
            @Pattern(regexp="ONSITE|ONLINE",message="รูปแบบกิจกรรมต้องเป็น ONSITE หรือ ONLINE") String eventFormat,
            @Size(max=2000,message="ลิงก์ออนไลน์ต้องไม่เกิน 2000 ตัวอักษร") String onlineMeetingUrl
    ) {
        public EventRequest {if("ONLINE".equals(eventFormat))location="ออนไลน์";}
        public EventRequest(String title,String description,String location,LocalDateTime startsAt,int capacity,String category,String imageUrl,List<DetailImageRequest> detailImages,List<TicketTypeRequest> ticketTypes,LocalDateTime endsAt,LocalDateTime registrationClosesAt,LocalDateTime checkinOpensAt,LocalDateTime checkinClosesAt,String organizerName,String organizerContact){this(title,description,location,startsAt,capacity,category,imageUrl,detailImages,ticketTypes,endsAt,registrationClosesAt,checkinOpensAt,checkinClosesAt,organizerName,organizerContact,null,null);}
        public EventRequest(String title,String description,String location,LocalDateTime startsAt,int capacity,String category,String imageUrl,List<DetailImageRequest> detailImages,List<TicketTypeRequest> ticketTypes,LocalDateTime endsAt,LocalDateTime registrationClosesAt,LocalDateTime checkinOpensAt,LocalDateTime checkinClosesAt){this(title,description,location,startsAt,capacity,category,imageUrl,detailImages,ticketTypes,endsAt,registrationClosesAt,checkinOpensAt,checkinClosesAt,null,null);}
        public EventRequest(String title,String description,String location,LocalDateTime startsAt,int capacity,String category,String imageUrl,List<DetailImageRequest> detailImages,List<TicketTypeRequest> ticketTypes){this(title,description,location,startsAt,capacity,category,imageUrl,detailImages,ticketTypes,null,null,null,null);}

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
            List<TicketTypeDto> ticketTypes,
            LocalDateTime endsAt,LocalDateTime registrationClosesAt,LocalDateTime checkinOpensAt,LocalDateTime checkinClosesAt,
            boolean deletable,String deletionBlockedReason,
            String organizerName,String organizerContact,String eventFormat
    ) {
        public EventDto {if(eventFormat==null)eventFormat="ONSITE";}
        public EventDto(Long id,String title,String description,String location,LocalDateTime startsAt,int capacity,String category,String imageUrl,List<DetailImageDto> detailImages,long registeredCount,long spotsLeft,String status,boolean registered,List<TicketTypeDto> ticketTypes,LocalDateTime endsAt,LocalDateTime registrationClosesAt,LocalDateTime checkinOpensAt,LocalDateTime checkinClosesAt,boolean deletable,String deletionBlockedReason,String organizerName,String organizerContact){this(id,title,description,location,startsAt,capacity,category,imageUrl,detailImages,registeredCount,spotsLeft,status,registered,ticketTypes,endsAt,registrationClosesAt,checkinOpensAt,checkinClosesAt,deletable,deletionBlockedReason,organizerName,organizerContact,"ONSITE");}
        public EventDto(Long id,String title,String description,String location,LocalDateTime startsAt,int capacity,String category,String imageUrl,List<DetailImageDto> detailImages,long registeredCount,long spotsLeft,String status,boolean registered,List<TicketTypeDto> ticketTypes,LocalDateTime endsAt,LocalDateTime registrationClosesAt,LocalDateTime checkinOpensAt,LocalDateTime checkinClosesAt,boolean deletable,String deletionBlockedReason){this(id,title,description,location,startsAt,capacity,category,imageUrl,detailImages,registeredCount,spotsLeft,status,registered,ticketTypes,endsAt,registrationClosesAt,checkinOpensAt,checkinClosesAt,deletable,deletionBlockedReason,null,null);}
        public EventDto(Long id,String title,String description,String location,LocalDateTime startsAt,int capacity,String category,String imageUrl,List<DetailImageDto> detailImages,long registeredCount,long spotsLeft,String status,boolean registered,List<TicketTypeDto> ticketTypes){this(id,title,description,location,startsAt,capacity,category,imageUrl,detailImages,registeredCount,spotsLeft,status,registered,ticketTypes,null,null,null,null,true,null);}

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
            EventDto event,
            String status,LocalDateTime cancelledAt,String cancelReason,LocalDateTime checkedInAt,boolean cancellable,String cancellationBlockedReason,boolean paid
    ) {
        public RegistrationDto(Long id,LocalDateTime registeredAt,int quantity,String ticketCode,String ticketTypeName,BigDecimal totalPrice,EventDto event){this(id,registeredAt,quantity,ticketCode,ticketTypeName,totalPrice,event,"CONFIRMED",null,null,null,true,null,false);}
        // Compatibility constructor used by existing EventService during the RED phase.
        public RegistrationDto(Long id, LocalDateTime registeredAt, int quantity, String ticketCode,
                String ticketTypeName, BigDecimal totalPrice, EventDto event, LocalDateTime checkedInAt) {
            this(id, registeredAt, quantity, ticketCode, ticketTypeName, totalPrice, event,
                    "CONFIRMED", null, null, checkedInAt, checkedInAt == null, null, false);
        }

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
            LocalDateTime checkedInAt,
            String status,String checkedInBy,String checkinSource
    ) {
        public AttendeeDto(Long id,String name,String email,LocalDateTime registeredAt,String ticketType,int quantity,String ticketCode,LocalDateTime checkedInAt,String status,String checkedInBy){this(id,name,email,registeredAt,ticketType,quantity,ticketCode,checkedInAt,status,checkedInBy,checkedInAt==null?null:"ผู้เข้าร่วมออนไลน์".equals(checkedInBy)?"ONLINE":checkedInBy==null||checkedInBy.isBlank()?"UNKNOWN":"STAFF");}
        public AttendeeDto(Long id,String name,String email,LocalDateTime registeredAt,String ticketType,int quantity,String ticketCode,LocalDateTime checkedInAt){this(id,name,email,registeredAt,ticketType,quantity,ticketCode,checkedInAt,"CONFIRMED",null);}

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
            LocalDateTime checkedInAt,
            String result,String checkedInBy
    ) {
        public CheckInDto(String ticketCode,String attendeeName,String eventTitle,String ticketType,int quantity,boolean checkedIn,LocalDateTime checkedInAt){this(ticketCode,attendeeName,eventTitle,ticketType,quantity,checkedIn,checkedInAt,"CHECKED_IN",null);}

    }


    // =========================
    // Error
    // =========================

    public record ErrorDto(
            String message
    ) {
    }

// =========================
// Analytics
// =========================

public record AnalyticsVisitRequest(

        @NotBlank(message = "Analytics type is required")
        @Pattern(
                regexp = "SITE|EVENT",
                message = "Analytics type must be SITE or EVENT"
        )
        String type,

        Long eventId
) {
    public AnalyticsVisitRequest {
        if (type != null) {
            type = type
                    .trim()
                    .toUpperCase(Locale.ROOT);
        }
    }
}

public record AnalyticsSummaryDto(
        long totalRegistrations,
        long totalEvents,
        long totalOpenEvents,
        long siteViews,
        long eventDetailViews,
        long uniqueVisitors
) {
}

public record EventAnalyticsDto(
        Long eventId,
        String title,
        long views,
        long registrations,
        long registeredSeats,
        int capacity,
        long spotsLeft
) {
}
// =========================
// Mock Payment
// =========================

    public record MockCheckoutRequest(

            @NotNull(message = "Event ID is required")
            Long eventId,

            @NotNull(message = "Ticket type ID is required")
            Long ticketTypeId,

            @NotNull(message = "Quantity is required")
            @Min(value = 1, message = "Quantity must be at least 1")
            @Max(value = 10, message = "Quantity must not exceed 10")
            Integer quantity
    ) {
    }

    public record MockCheckoutDto(
            Long paymentId,
            String status,
            Long eventId,
            Long ticketTypeId,
            int quantity,
            BigDecimal unitPrice,
            BigDecimal totalAmount,
            String currency,
            String qrPayload,
            LocalDateTime expiresAt
    ) {
    }

    public record MockConfirmDto(
            Long paymentId,
            String paymentStatus,
            RegistrationDto registration
    ) {
    }

    public record MockPaymentStatusDto(
            Long paymentId,
            String status,
            BigDecimal totalAmount,
            String currency,
            LocalDateTime confirmedAt,
            Long registrationId
    ) {
    }

    // Existing DTO contracts retained until Backend GREEN updates the payment controller.
    public record MockPaymentResumeDto(
        Long paymentId, String status, Long eventId, Long ticketTypeId,
        int quantity, BigDecimal unitPrice, BigDecimal totalAmount, String currency,
        String qrPayload, LocalDateTime expiresAt
    ) {}

    public record MockPaymentHistoryDto(
        Long paymentId, Long eventId, String eventTitle, String ticketTypeName,
        int quantity, BigDecimal totalAmount, String status, LocalDateTime createdAt,
        LocalDateTime expiresAt, LocalDateTime confirmedAt
    ) {}
}