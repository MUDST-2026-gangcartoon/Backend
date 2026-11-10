package com.eventhub.service;

import com.eventhub.dto.ApiDtos;
import com.eventhub.model.*;
import com.eventhub.repository.*;
import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class BookingToolsService {

    private final MockPaymentRepository payments;
    private final UserRepository users;
    private final EventRepository events;
    private final RegistrationRepository registrations;

    public BookingToolsService(
        MockPaymentRepository p,
        UserRepository u,
        EventRepository e,
        RegistrationRepository r
    ) {
        payments = p;
        users = u;
        events = e;
        registrations = r;
    }

    private UserAccount user(Principal principal) {
        if (principal == null) throw new ResponseStatusException(
            HttpStatus.UNAUTHORIZED
        );
        return users
            .findByEmail(principal.getName())
            .orElseThrow(() ->
                new ResponseStatusException(HttpStatus.UNAUTHORIZED)
            );
    }

    public record PaymentView(
        Long paymentId,
        Long eventId,
        String eventTitle,
        String ticketType,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal totalAmount,
        String status,
        LocalDateTime createdAt,
        LocalDateTime expiresAt,
        LocalDateTime confirmedAt,
        Long registrationId,
        String ticketCode
    ) {}

    private String status(MockPaymentOrder p) {
        return p.getStatus() == MockPaymentStatus.PENDING_PAYMENT &&
        !p.getExpiresAt().isAfter(com.eventhub.service.EventClock.now())
            ? "EXPIRED"
            : p.getStatus().name();
    }

    public Object history(Principal principal, int page, String filter) {
        if (
            page < 0 ||
            !List.of(
                "ALL",
                "PENDING_PAYMENT",
                "CONFIRMED",
                "EXPIRED",
                "CANCELLED"
            ).contains(filter)
        ) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "ตัวกรองไม่ถูกต้อง"
        );
        var rows = payments
            .findByUserIdOrderByCreatedAtDesc(user(principal).getId())
            .stream()
            .filter(p -> filter.equals("ALL") || filter.equals(status(p)))
            .map(p ->
                new PaymentView(
                    p.getId(),
                    p.getEventId(),
                    p.getEventTitle(),
                    p.getTicketTypeName(),
                    p.getQuantity(),
                    p.getUnitPrice(),
                    p.getTotalAmount(),
                    status(p),
                    p.getCreatedAt(),
                    p.getExpiresAt(),
                    p.getConfirmedAt(),
                    p.getRegistrationId(),
                    p.getIssuedTicketCode()
                )
            )
            .toList();
        int from = (int) Math.min((long) page * 20, rows.size());
        return Map.of(
            "items",
            rows.subList(from, Math.min(from + 20, rows.size())),
            "totalElements",
            rows.size(),
            "totalPages",
            (rows.size() + 19) / 20,
            "page",
            page
        );
    }

    public ApiDtos.MockCheckoutDto resume(Long id, Principal principal) {
        var p = payments
            .findById(id)
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "ไม่พบรายการชำระเงิน"
                )
            );
        if (p.getUser() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบรายการชำระเงิน");
        }
        if (
            !p.getUser().getId().equals(user(principal).getId())
        ) throw new ResponseStatusException(
            HttpStatus.FORBIDDEN,
            "ไม่มีสิทธิ์ดูรายการนี้"
        );
        if (
            !"PENDING_PAYMENT".equals(status(p))
        ) throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "รายการนี้ไม่ได้อยู่ระหว่างรอชำระ หรือหมดอายุแล้ว"
        );
        if(registrations.existsByUserIdAndEventId(user(principal).getId(),p.getEventId()))throw new ResponseStatusException(HttpStatus.CONFLICT,"คุณลงทะเบียนกิจกรรมนี้แล้ว กรุณายกเลิกรายการรอชำระเดิม");
        var event=events.findById(p.getEventId()).orElseThrow(()->new ResponseStatusException(HttpStatus.CONFLICT,"ไม่พบกิจกรรม"));
        EventRules.requireBookingOpen(event);
        var ticket=event.getTicketTypes().stream().filter(t->t.getId().equals(p.getTicketTypeId())).findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.CONFLICT,"ไม่พบประเภทบัตร"));
        EventRules.requireTicketOnSale(ticket);
        return new ApiDtos.MockCheckoutDto(
            p.getId(),
            status(p),
            p.getEventId(),
            p.getTicketTypeId(),
            p.getQuantity(),
            p.getUnitPrice(),
            p.getTotalAmount(),
            "THB",
            "EVENTHUB_DEMO_PAYMENT:" + p.getId(),
            p.getExpiresAt()
        );
    }

    private Map<String,Object> sourceCounts(List<Registration> rows){
        long staff=0,online=0,unknown=0;
        for(var row:rows){
            if(!row.isActive()||row.getCheckedInAt()==null)continue;
            switch(row.getCheckinSource()){
                case "STAFF" -> staff+=row.getQuantity();
                case "ONLINE" -> online+=row.getQuantity();
                default -> unknown+=row.getQuantity();
            }
        }
        return Map.of("staffCheckedIn",staff,"onlineCheckedIn",online,"unknownCheckedIn",unknown);
    }

    public Map<String, Object> report(Long eventId) {
        var e = events
            .findById(eventId)
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "ไม่พบกิจกรรม"
                )
            );
        var rows = registrations.findByEventIdOrderByRegisteredAtAsc(eventId);
        long seats = rows
            .stream()
            .filter(Registration::isActive)
            .mapToLong(Registration::getQuantity)
            .sum();
        long checked = rows
            .stream()
            .filter(Registration::isActive)
            .filter(r -> r.getCheckedInAt() != null)
            .mapToLong(Registration::getQuantity)
            .sum();
        var result=new LinkedHashMap<String,Object>(Map.of(
            "eventTitle",
            e.getTitle(),
            "orders",
            rows.size(),
            "activeOrders",
            rows.stream().filter(Registration::isActive).count(),
            "cancelledOrders",
            rows
                .stream()
                .filter(r -> !r.isActive())
                .count(),
            "participants",
            seats,
            "checkedIn",
            checked,
            "notCheckedIn",
            seats - checked,
            "capacity",
            e.getCapacity(),
            "available",
            Math.max(0, e.getCapacity() - seats)
        ));
        result.putAll(sourceCounts(rows));
        return result;
    }

    public Map<String, Object> totals() {
        var rows = registrations.findAll();
        var result=new LinkedHashMap<String,Object>(Map.of(
            "orders",
            rows.size(),
            "participants",
            rows
                .stream()
                .filter(Registration::isActive)
                .mapToLong(Registration::getQuantity)
                .sum(),
            "checkedIn",
            rows
                .stream()
                .filter(Registration::isActive)
                .filter(r -> r.getCheckedInAt() != null)
                .mapToLong(Registration::getQuantity)
                .sum(),
            "cancelledOrders",
            rows
                .stream()
                .filter(r -> !r.isActive())
                .count()
        ));
        result.putAll(sourceCounts(rows));
        return result;
    }
}
