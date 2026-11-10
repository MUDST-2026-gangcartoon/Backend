package com.eventhub.service;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.eventhub.dto.ApiDtos;
import com.eventhub.dto.EventListRow;
import com.eventhub.dto.TicketTypeRow;
import com.eventhub.model.DetailImage;
import com.eventhub.model.Event;
import com.eventhub.model.Registration;
import com.eventhub.model.TicketType;
import com.eventhub.model.UserAccount;
import com.eventhub.repository.EventRepository;
import com.eventhub.repository.RegistrationRepository;
import com.eventhub.repository.TicketTypeRepository;
import com.eventhub.repository.UserRepository;
@Service
public class EventService {

    private final EventRepository eventRepository;
    private final RegistrationRepository registrationRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final UserRepository userRepository;
    @org.springframework.beans.factory.annotation.Autowired
    private com.eventhub.repository.MockPaymentRepository paymentRepository;
    @org.springframework.beans.factory.annotation.Autowired
    private RegistrationAttemptTracking attemptTracking;
    private boolean paymentHistory(Long eventId){return paymentRepository!=null && paymentRepository.existsByEventId(eventId);}
    private boolean paid(Registration r){return r.getPurchasedUnitPrice()!=null && r.getPurchasedUnitPrice().signum()>0 || paymentRepository!=null && paymentRepository.findFirstByRegistrationIdAndStatus(r.getId(),com.eventhub.model.MockPaymentStatus.CONFIRMED).isPresent();}
    private String deletionReason(Long id){return id!=null&&(registrationRepository.existsByEventId(id)||paymentHistory(id))?"กิจกรรมที่มีประวัติจองหรือชำระเงินไม่สามารถลบได้":null;}
    private String ticketRemovalReason(Long id){return id!=null&&(registrationRepository.existsByTicketTypeId(id)||(paymentRepository!=null&&paymentRepository.existsByTicketTypeId(id)))?"ประเภทบัตรมีประวัติจองหรือชำระเงิน จึงลบไม่ได้":null;}
    static String cancellationReason(Registration r){
      if(!r.isActive())return "รายการนี้ยกเลิกแล้ว";
      if(r.getCheckedInAt()!=null)return "เช็กอินแล้ว ไม่สามารถยกเลิกการจองได้";
      return null;
    }


    public EventService(
            EventRepository eventRepository,
            RegistrationRepository registrationRepository,
            TicketTypeRepository ticketTypeRepository,
            UserRepository userRepository
    ) {
        this.eventRepository = eventRepository;
        this.registrationRepository = registrationRepository;
        this.ticketTypeRepository = ticketTypeRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public ApiDtos.EventPageDto list(
            Principal principal,
            int page,
            int size,
            String search,
            String category,
            String status
    ) {
        String normalizedCategory =
                normalizeListCategory(category);

        String normalizedStatus =
                normalizeListStatus(status);

        Long userId =
                resolveListUserId(principal);

        LocalDateTime now =
                com.eventhub.service.EventClock.now();

        Pageable pageable =
                PageRequest.of(
                        page,
                        size
                );

        Page<EventListRow> eventPage =
                eventRepository.search(
                        userId,
                        search,
                        normalizedCategory,
                        normalizedStatus,
                        now,
                        pageable
                );

        List<EventListRow> rows =
                eventPage.getContent();

        Map<Long, List<ApiDtos.TicketTypeDto>>
                ticketTypesByEvent =
                loadTicketTypeSummaries(rows);

        List<ApiDtos.EventDto> items =
                rows.stream()
                        .map(row ->
                                eventListDto(
                                        row,
                                        ticketTypesByEvent
                                                .getOrDefault(
                                                        row.id(),
                                                        List.of()
                                                ),
                                        now
                                )
                        )
                        .toList();

        long totalOpenEvents =
                eventRepository.countOpen(now);

        long totalRegistrations =
                registrationRepository.count();

        return new ApiDtos.EventPageDto(
                items,
                eventPage.getNumber(),
                eventPage.getSize(),
                eventPage.getTotalElements(),
                eventPage.getTotalPages(),
                eventPage.hasNext(),
                eventPage.hasPrevious(),
                totalOpenEvents,
                totalRegistrations
        );

    }

    private String normalizeListCategory(
            String category
    ) {
        if (category == null
                || category.isBlank()) {

            return "ALL";
        }

        String normalized =
                category
                        .trim()
                        .toUpperCase(Locale.ROOT);

        if (!List.of(
                "ALL",
                "TECH",
                "DESIGN",
                "CAREER",
                "COMMUNITY"
        ).contains(normalized)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported event category"
            );
        }

        return normalized;
    }
    private String normalizeListStatus(
            String status
    ) {
        if (status == null
                || status.isBlank()) {

            return "ALL";
        }

        String normalized =
                status
                        .trim()
                        .toUpperCase(Locale.ROOT);

        if (!List.of(
                "ALL",
                "OPEN",
                "FULL",
                "ENDED", "CLOSED", "ONGOING",
                "REGISTERED"
        ).contains(normalized)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported event status"
            );
        }

        return normalized;
    }
    private Long resolveListUserId(
            Principal principal
    ) {
        if (principal == null
                || principal.getName() == null
                || principal.getName().isBlank()) {

            return null;
        }

        String email =
                principal
                        .getName()
                        .trim()
                        .toLowerCase(Locale.ROOT);

        return userRepository
                .findByEmail(email)
                .map(UserAccount::getId)
                .orElse(null);
    }
    private Map<Long, List<ApiDtos.TicketTypeDto>>
    loadTicketTypeSummaries(
            List<EventListRow> rows
    ) {
        if (rows.isEmpty()) {
            return Map.of();
        }

        List<Long> eventIds =
                rows.stream()
                        .map(EventListRow::id)
                        .toList();

        List<TicketTypeRow> ticketRows =
                ticketTypeRepository
                        .summariesForEventIds(
                                eventIds
                        );

        Map<Long, List<ApiDtos.TicketTypeDto>>
                result =
                new HashMap<>();

        for (TicketTypeRow row
                : ticketRows) {

            result
                    .computeIfAbsent(
                            row.eventId(),
                            ignored ->
                                    new ArrayList<>()
                    )
                    .add(
                            ticketTypeDto(row)
                    );
        }

        return result;
    }
    private ApiDtos.TicketTypeDto ticketTypeDto(
            TicketTypeRow row
    ) {
        long remaining =
                Math.max(
                        0L,
                        (long) row.capacity()
                                - row.sold()
                );

        return new ApiDtos.TicketTypeDto(
                row.id(),
                row.name(),
                row.description(),
                row.price(),
                row.capacity(),
                row.sold(),
                remaining,ticketRemovalReason(row.id())==null,ticketRemovalReason(row.id()),row.salesEnabled()
        );
    }
    private ApiDtos.EventDto eventListDto(
            EventListRow row,
            List<ApiDtos.TicketTypeDto> ticketTypes,
            LocalDateTime now
    ) {
        long spotsLeft =
                Math.max(
                        0L,
                        (long) row.capacity()
                                - row.registeredCount()
                );

        String eventStatus =
                eventListStatus(
                        row,
                        now
                );

        return new ApiDtos.EventDto(
                row.id(),
                row.title(),
                row.description(),
                row.location(),
                row.startsAt(),
                row.capacity(),
                row.category(),
                row.imageUrl(),
                List.of(),
                row.registeredCount(),
                spotsLeft,
                eventStatus,
                row.registered(),
                ticketTypes,row.endsAt(),row.registrationClosesAt(),row.checkinOpensAt(),row.checkinClosesAt(),
                deletionReason(row.id())==null,deletionReason(row.id()),null,null,row.eventFormat()
        );
    }
    private String eventListStatus(EventListRow row,LocalDateTime now){return EventRules.status(row.startsAt(),row.endsAt(),row.registrationClosesAt(),row.registeredCount(),row.capacity(),now);}

    @Transactional(readOnly = true)
    public ApiDtos.EventDto get(
            Long eventId,
            Principal principal
    ) {
        Event event =
                eventRepository
                        .findById(eventId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Event not found"
                                )
                        );

        boolean registered = false;

        if (principal != null
                && principal.getName() != null
                && !principal.getName().isBlank()) {

            String email =
                    principal.getName()
                            .trim()
                            .toLowerCase(Locale.ROOT);

            UserAccount user =
                    userRepository
                            .findByEmail(email)
                            .orElse(null);

            if (user != null) {
                registered =
                        registrationRepository
                                .existsByUserIdAndEventId(
                                        user.getId(),
                                        event.getId()
                                );
            }
        }

        return eventDto(
                event,
                registered
        );
    }

    @Transactional
    public ApiDtos.EventDto create(
            ApiDtos.EventRequest request
    ) {
        validateTicketCapacityPlan(
                request.capacity(),
                request.ticketTypes()
        );

        Event event = new Event();

        applyEventFields(
                event,
                request
        );

        replaceDetailImages(
                event,
                request.detailImages()
        );

        for (ApiDtos.TicketTypeRequest ticketRequest
                : request.ticketTypes()) {

            TicketType ticket =
                    new TicketType(
                            event,
                            ticketRequest.name(),
                            ticketRequest.description(),
                            ticketRequest.price(),
                            ticketRequest.capacity()
                    );

            ticket.setSalesEnabled(ticketRequest.salesEnabled());
            event.addTicketType(ticket);
        }

        Event saved =
                eventRepository.save(event);

        return eventDto(
                saved,
                false
        );
    }
    private void validateTicketCapacityPlan(
            int eventCapacity,
            List<ApiDtos.TicketTypeRequest> ticketTypes
    ) {
        long total = 0L;

        for (ApiDtos.TicketTypeRequest ticket
                : ticketTypes) {

            total += ticket.capacity();
        }

        if (total != eventCapacity) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ticket capacities must equal event capacity"
            );
        }
    }
    private void applyEventFields(
            Event event,
            ApiDtos.EventRequest request
    ) {
        EventRules.validate(request,event);
        String format=request.eventFormat()==null?event.getEventFormat():request.eventFormat();
        event.setEventFormat(format);
        event.setOnlineMeetingUrl("ONLINE".equals(format)?request.onlineMeetingUrl()==null?event.getOnlineMeetingUrl():request.onlineMeetingUrl():null);
        event.setEndsAt(request.endsAt());event.setRegistrationClosesAt(request.registrationClosesAt());event.setCheckinOpensAt(request.checkinOpensAt());event.setCheckinClosesAt(request.checkinClosesAt());
        event.setOrganizerName(request.organizerName());
        event.setOrganizerContact(request.organizerContact());
        event.setTitle(request.title());
        event.setDescription(request.description());
        event.setLocation("ONLINE".equals(format)?"ออนไลน์":request.location());
        event.setStartsAt(request.startsAt());
        event.setCapacity(request.capacity());
        event.setCategory(request.category());
        event.setImageUrl(request.imageUrl());
    }
    private void replaceDetailImages(
            Event event,
            List<ApiDtos.DetailImageRequest> requests
    ) {
        event.getDetailImages().clear();

        if (requests == null) {
            return;
        }

        for (ApiDtos.DetailImageRequest request
                : requests) {

            event.getDetailImages().add(
                    new DetailImage(
                            request.url(),
                            request.placement()
                    )
            );
        }
    }

    @Transactional
    public ApiDtos.EventDto update(
            Long eventId,
            ApiDtos.EventRequest request
    ) {
        validateTicketCapacityPlan(
                request.capacity(),
                request.ticketTypes()
        );

        Event event =
                eventRepository
                        .findByIdForUpdate(eventId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Event not found"
                                )
                        );

        if(request.eventFormat()!=null&&!request.eventFormat().equals(event.getEventFormat())
                &&(registrationRepository.existsByEventId(eventId)||paymentHistory(eventId)))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"เปลี่ยนรูปแบบกิจกรรมไม่ได้เมื่อมีประวัติการจองหรือชำระเงินแล้ว");

        long eventSeatsSold =
                registrationRepository
                        .seatsReservedByEventId(
                                event.getId()
                        );

        if (request.capacity() < eventSeatsSold) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Event capacity cannot be lower than seats already sold"
            );
        }

        java.util.Map<Long, TicketType> existingById =
                new java.util.HashMap<>();

        for (TicketType ticket
                : event.getTicketTypes()) {

            if (ticket.getId() != null) {
                existingById.put(
                        ticket.getId(),
                        ticket
                );
            }
        }

        java.util.Set<Long> requestIds =
                new java.util.HashSet<>();

        for (ApiDtos.TicketTypeRequest ticketRequest
                : request.ticketTypes()) {

            Long ticketId =
                    ticketRequest.id();

            if (ticketId == null) {
                continue;
            }

            if (!requestIds.add(ticketId)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Duplicate ticket type ID"
                );
            }

            TicketType existingTicket =
                    existingById.get(ticketId);

            if (existingTicket == null) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Ticket type does not belong to this event"
                );
            }

            long sold =
                    registrationRepository
                            .seatsReservedByTicketTypeId(
                                    existingTicket.getId()
                            );

            if (ticketRequest.capacity() < sold) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Ticket capacity cannot be lower than seats already sold"
                );
            }
        }

        // ตรวจ TicketType ที่กำลังจะถูกลบ
        for (TicketType existingTicket
                : event.getTicketTypes()) {

            Long ticketId =
                    existingTicket.getId();

            if (ticketId == null
                    || requestIds.contains(ticketId)) {

                continue;
            }

            long sold =
                    registrationRepository
                            .seatsReservedByTicketTypeId(
                                    ticketId
                            );

            if (sold > 0L || registrationRepository.existsByTicketTypeId(ticketId)
                    || (paymentRepository != null && paymentRepository.existsByTicketTypeId(ticketId))) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "ประเภทบัตรมีประวัติจองหรือชำระเงิน จึงลบไม่ได้"
                );
            }
        }

        // ผ่าน validation ทั้งหมดก่อน
        // จึงค่อย mutate entity
        applyEventFields(
                event,
                request
        );

        replaceDetailImages(
                event,
                request.detailImages()
        );

        event.getTicketTypes()
                .removeIf(ticket ->
                        ticket.getId() != null
                                && !requestIds.contains(
                                ticket.getId()
                        )
                );

        for (ApiDtos.TicketTypeRequest ticketRequest
                : request.ticketTypes()) {

            if (ticketRequest.id() == null) {

                TicketType newTicket =
                        new TicketType(
                                event,
                                ticketRequest.name(),
                                ticketRequest.description(),
                                ticketRequest.price(),
                                ticketRequest.capacity()
                        );

                newTicket.setSalesEnabled(ticketRequest.salesEnabled());
                event.addTicketType(newTicket);

                continue;
            }

            TicketType ticket =
                    existingById.get(
                            ticketRequest.id()
                    );

            if(ticketRequest.salesEnabled()!=null)ticket.setSalesEnabled(ticketRequest.salesEnabled());
            ticket.setName(
                    ticketRequest.name()
            );

            ticket.setDescription(
                    ticketRequest.description()
            );

            ticket.setPrice(
                    ticketRequest.price()
            );

            ticket.setCapacity(
                    ticketRequest.capacity()
            );
        }

        return eventDto(
                event,
                false
        );
    }

    @Transactional
    public void delete(Long eventId){
        Event event=eventRepository.findByIdForUpdate(eventId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Event not found"));
        if(registrationRepository.existsByEventId(eventId)||paymentHistory(eventId))throw new ResponseStatusException(HttpStatus.CONFLICT,"กิจกรรมที่มีประวัติจองหรือชำระเงินไม่สามารถลบได้");
        eventRepository.delete(event);
    }

    @Transactional
    public ApiDtos.RegistrationDto register(
            Long eventId,
            ApiDtos.PurchaseRequest request,
            Principal principal
    ) {
        UserAccount user = currentUser(principal);
        if(user.getRole()!=com.eventhub.model.Role.USER)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"กรุณาใช้บัญชีผู้เข้าร่วมสำหรับจองบัตร");

        Event event = eventRepository
                .findByIdForUpdate(eventId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Event not found"
                        )
                );

        EventRules.requireBookingOpen(event);
        if (!event.getStartsAt().isAfter(com.eventhub.service.EventClock.now())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Registration has closed"
                );
        }

        if (registrationRepository.existsByUserIdAndEventId(
                user.getId(),
                event.getId()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "You are already registered"
            );
        }

        TicketType ticket = ticketTypeRepository
                .findById(request.ticketTypeId())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Ticket type not found"
                        )
                );

        if (ticket.getEvent() == null
                || !Objects.equals(
                ticket.getEvent().getId(),
                event.getId()
        )) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ticket type does not belong to this event"
            );

        }
        EventRules.requireTicketOnSale(ticket);
// Paid tickets must go through Mock Payment checkout.
// The direct Registration API is reserved for free tickets.
        if (ticket.getPrice() != null
                && ticket.getPrice().signum() > 0) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Paid tickets require mock payment checkout"
            );
        }
        if(paymentRepository!=null&&paymentRepository.existsByUserIdAndEventIdAndStatusAndExpiresAtAfter(user.getId(),event.getId(),com.eventhub.model.MockPaymentStatus.PENDING_PAYMENT,com.eventhub.service.EventClock.now())){
            throw new ResponseStatusException(HttpStatus.CONFLICT,"มีรายการรอชำระเงินของกิจกรรมนี้ กรุณายกเลิกรายการเดิมในประวัติชำระเงินก่อนจองใหม่");
        }
        int quantity = request.quantity();

        BookingCapacity.requireAvailable(registrationRepository, event, ticket, quantity);
        var attempt = request.attemptId() == null ? null
                : attemptTracking.active(request.attemptId(), eventId, "u:" + user.getId());

        Registration registration =
                new Registration(
                        user,
                        event,
                        ticket,
                        quantity
                );

        Registration saved =
                registrationRepository.save(registration);

        if (attempt != null) attemptTracking.complete(attempt, saved);
        return registrationDto(saved);
    }
    private UserAccount currentUser(Principal principal) {

        if (principal == null
                || principal.getName() == null
                || principal.getName().isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        String email =
                principal.getName()
                        .trim()
                        .toLowerCase(Locale.ROOT);

        return userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "User not found"
                        )
                );
    }

    private ApiDtos.RegistrationDto registrationDto(Registration r){
        var ticket=r.getTicketType();
        var price=r.getPurchasedUnitPrice();var name=r.getPurchasedTicketName();
        if(price==null && paymentRepository!=null){var old=paymentRepository.findFirstByRegistrationIdAndStatus(r.getId(),com.eventhub.model.MockPaymentStatus.CONFIRMED);if(old.isPresent()){price=old.get().getUnitPrice();name=old.get().getTicketTypeName();}}
        if(price==null)price=BigDecimal.ZERO;
        if(name==null)name=ticket==null?"General":ticket.getName();
        String reason=cancellationReason(r);
        return new ApiDtos.RegistrationDto(r.getId(),r.getRegisteredAt(),r.getQuantity(),r.getTicketCode(),name,price.multiply(BigDecimal.valueOf(r.getQuantity())),eventDto(r.getEvent(),r.isActive()),r.getStatus(),r.getCancelledAt(),r.getCancelReason(),r.getCheckedInAt(),reason==null,reason,paid(r));
    }

    private ApiDtos.EventDto eventDto(
            Event event,
            boolean registered
    ) {
        long sold =
                event.getId() == null
                        ? 0L
                        : registrationRepository
                        .seatsReservedByEventId(
                                event.getId()
                        );

        long spotsLeft =
                Math.max(
                        0L,
                        (long) event.getCapacity() - sold
                );

        String status=EventRules.status(event,sold,com.eventhub.service.EventClock.now());

        List<ApiDtos.DetailImageDto> detailImages =
                event.getDetailImages()
                        .stream()
                        .map(image ->
                                new ApiDtos.DetailImageDto(
                                        image.getUrl(),
                                        image.getPlacement()
                                )
                        )
                        .toList();

        List<ApiDtos.TicketTypeDto> ticketTypes =
                event.getTicketTypes()
                        .stream()
                        .map(this::ticketTypeDto)
                        .toList();

        return new ApiDtos.EventDto(
                event.getId(),
                event.getTitle(),
                event.getDescription(),
                event.getLocation(),
                event.getStartsAt(),
                event.getCapacity(),
                event.getCategory(),
                event.getImageUrl(),
                detailImages,
                sold,
                spotsLeft,
                status,
                registered,
                ticketTypes,event.getEndsAt(),event.getRegistrationClosesAt(),event.getCheckinOpensAt(),event.getCheckinClosesAt(),
                deletionReason(event.getId())==null,deletionReason(event.getId()),event.getOrganizerName(),event.getOrganizerContact(),event.getEventFormat()
        );
    }

    private ApiDtos.TicketTypeDto ticketTypeDto(
            TicketType ticket
    ) {
        long sold =
                ticket.getId() == null
                        ? 0L
                        : registrationRepository
                        .seatsReservedByTicketTypeId(
                                ticket.getId()
                        );

        long remaining =
                Math.max(
                        0L,
                        (long) ticket.getCapacity() - sold
                );

        return new ApiDtos.TicketTypeDto(
                ticket.getId(),
                ticket.getName(),
                ticket.getDescription(),
                ticket.getPrice(),
                ticket.getCapacity(),
                sold,
                remaining,ticketRemovalReason(ticket.getId())==null,ticketRemovalReason(ticket.getId()),ticket.isSalesEnabled()
        );
    }

    @Transactional
    public void cancel(Long eventId,Principal principal){cancel(eventId,principal,"ผู้เข้าร่วมยกเลิก");}
    @Transactional
    public void cancel(Long eventId,Principal principal,String reason){
        UserAccount user=currentUser(principal);
        var memberBooking = registrationRepository.activeForUpdate(user.getId(), eventId);
        var claimedBookings = registrationRepository.activeClaimedForUpdate(user.getId(), eventId);
        if (claimedBookings.size() + (memberBooking.isPresent() ? 1 : 0) > 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Specify the registration ID to cancel");
        }
        var r = memberBooking.or(() -> claimedBookings.stream().findFirst())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registration not found"));
        cancelOwnedRegistration(r, reason);
    }

    @Transactional
    public void cancelByRegistrationId(Long registrationId, Principal principal) {
        UserAccount user = currentUser(principal);
        var registration = registrationRepository.findByIdForUpdate(registrationId)
                .filter(row -> row.isOwnedBy(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registration not found"));
        cancelOwnedRegistration(registration, "ผู้เข้าร่วมยกเลิก");
    }

    private static void cancelOwnedRegistration(Registration r, String reason) {
        String blocked=cancellationReason(r);if(blocked!=null)throw new ResponseStatusException(HttpStatus.CONFLICT,blocked);
        if(reason==null||reason.isBlank()||reason.length()>1000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"กรุณาระบุเหตุผลไม่เกิน 1000 ตัวอักษร");
        r.cancel(reason.trim());
    }

    @Transactional(readOnly = true)
    public List<ApiDtos.RegistrationDto> mine(
            Principal principal
    ) {
        UserAccount user =
                currentUser(principal);

        return registrationRepository
                .findByUserIdOrderByEventStartsAtAsc(
                        user.getId()
                )
                .stream()
                .map(this::registrationDto)
                .toList();
    }
// ============================================================
// Branch 7 — Staff Service Contract
// ============================================================

    @Transactional(readOnly = true)
    public List<ApiDtos.AttendeeDto> attendees(
            Long eventId
    ) {
        eventRepository
                .findById(eventId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Event not found"
                        )
                );

        return registrationRepository
                .findByEventIdOrderByRegisteredAtAsc(eventId)
                .stream()
                .map(this::attendeeDto)
                .toList();
    }
    private ApiDtos.AttendeeDto attendeeDto(
            Registration registration
    ) {
        var guest = registration.getGuest();
        UserAccount user = registration.getUser();
        Long userId = guest == null ? user.getId() : guest.getClaimedUserId();
        String claimStatus = guest == null ? null : userId == null ? "UNCLAIMED" : "CLAIMED";
        TicketType ticket = registration.getTicketType();

        return new ApiDtos.AttendeeDto(
                userId,
                registration.attendeeName(),
                registration.attendeeEmail(),
                registration.getRegisteredAt(),
                registration.getPurchasedTicketName() != null ? registration.getPurchasedTicketName() : ticket == null ? null : ticket.getName(),
                registration.getQuantity(),
                registration.getTicketCode(),
                registration.getCheckedInAt(),registration.getStatus(),registration.getCheckedInBy(),registration.getCheckinSource(),
                registration.getId(), userId, guest == null ? "USER" : "GUEST", claimStatus
        );
    }

    @Transactional
    public ApiDtos.CheckInDto checkIn(Long eventId,String ticketCode){return checkIn(eventId,ticketCode,null);}
    @Transactional
    public ApiDtos.CheckInDto checkIn(Long eventId,String ticketCode,Principal principal){
        var r=registrationRepository.findForCheckin(ticketCode.trim().toUpperCase(Locale.ROOT)).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Ticket code not found"));
        if(r.getEvent()==null||!Objects.equals(r.getEvent().getId(),eventId))throw new ResponseStatusException(HttpStatus.CONFLICT,"Ticket code does not belong to this event");
        if(!r.isActive())throw new ResponseStatusException(HttpStatus.CONFLICT,"รายการนี้ยกเลิกแล้ว บัตรไม่สามารถใช้งานได้");
        boolean used=r.getCheckedInAt()!=null;
        if(!used){var now=com.eventhub.service.EventClock.now();var event=r.getEvent();if(now.isBefore(event.getCheckinOpensAt())||!now.isBefore(event.getCheckinClosesAt()))throw new ResponseStatusException(HttpStatus.CONFLICT,"อยู่นอกช่วงเวลาเช็กอิน");r.checkIn();r.setCheckinSource("STAFF");r.setCheckedInBy(principal==null?"Staff":principal.getName());}
        var base=checkInDto(r);
        return new ApiDtos.CheckInDto(base.ticketCode(),base.attendeeName(),base.eventTitle(),base.ticketType(),base.quantity(),base.checkedIn(),base.checkedInAt(),used?"ALREADY_USED":"CHECKED_IN",r.getCheckedInBy());
    }
    private ApiDtos.CheckInDto checkInDto(
            Registration registration
    ) {
        Event event =
                registration.getEvent();

        TicketType ticket =
                registration.getTicketType();

        return new ApiDtos.CheckInDto(
                registration.getTicketCode(),
                registration.attendeeName(),
                event.getTitle(),
                registration.getPurchasedTicketName() != null ? registration.getPurchasedTicketName() : ticket == null ? null : ticket.getName(),
                registration.getQuantity(),
                registration.getCheckedInAt() != null,
                registration.getCheckedInAt()
        );
    }

    @Transactional(readOnly = true)
    public List<ApiDtos.AttendeeDto> recentCheckIns(
            Long eventId
    ) {
        return registrationRepository
                .findTop8ByEventIdAndCheckedInAtIsNotNullOrderByCheckedInAtDesc(
                        eventId
                )
                .stream()
                .map(this::attendeeDto)
                .toList();
    }

    private UnsupportedOperationException notImplemented() {
        return new UnsupportedOperationException(
                "EventService business logic is not implemented"
        );
    }
}
