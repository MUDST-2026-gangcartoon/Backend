package com.eventhub.service;

import com.eventhub.dto.ApiDtos;
import com.eventhub.model.Event;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** One set of schedule rules for listing, booking, payment and check-in. Times are Bangkok local time. */
public final class EventRules {

    private EventRules() {}

    public static String status(Event event, long seats, LocalDateTime now) {
        return status(
            event.getStartsAt(),
            event.getEndsAt(),
            event.getRegistrationClosesAt(),
            seats,
            event.getCapacity(),
            now
        );
    }

    public static String status(
        LocalDateTime start,
        LocalDateTime end,
        LocalDateTime close,
        long seats,
        int capacity,
        LocalDateTime now
    ) {
        if (!now.isBefore(end)) return "ENDED";
        if (!now.isBefore(start)) return "ONGOING";
        if (!now.isBefore(close)) return "CLOSED";
        return seats >= capacity ? "FULL" : "OPEN";
    }

    public static void requireBookingOpen(Event event) {
        if (
            !com.eventhub.service.EventClock.now().isBefore(event.getRegistrationClosesAt()) ||
            !com.eventhub.service.EventClock.now().isBefore(event.getStartsAt())
        ) throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "ปิดรับสมัครแล้ว"
        );
    }

    public static void requireTicketOnSale(com.eventhub.model.TicketType ticket) {
        if(!ticket.isSalesEnabled())throw new ResponseStatusException(HttpStatus.CONFLICT,"ประเภทบัตรนี้ปิดขายชั่วคราว กรุณาเลือกประเภทอื่น");
    }

    public static void validate(ApiDtos.EventRequest input) {validate(input,null);}
    public static void validate(ApiDtos.EventRequest input, Event existing) {
        if (input.startsAt() == null) return;
        var start = input.startsAt();
        var end = input.endsAt() == null ? start.plusHours(4) : input.endsAt();
        var close =
            input.registrationClosesAt() == null
                ? start
                : input.registrationClosesAt();
        boolean online="ONLINE".equals(input.eventFormat()==null && existing!=null?existing.getEventFormat():input.eventFormat());
        var opens = online ? start :
            input.checkinOpensAt() == null
                ? start.minusHours(1)
                : input.checkinOpensAt();
        var closes = online ? end :
            input.checkinClosesAt() == null ? end : input.checkinClosesAt();
        var errors = new LinkedHashMap<String, String>();
        if (!end.isAfter(start)) errors.put(
            "endsAt",
            "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มกิจกรรม"
        );
        if (close.isAfter(start)) errors.put(
            "registrationClosesAt",
            "วันปิดรับสมัครต้องไม่เกินเวลาเริ่มกิจกรรม"
        );
        if (!closes.isAfter(opens)) errors.put(
            "checkinClosesAt",
            "เวลาปิดเช็กอินต้องอยู่หลังเวลาเปิดเช็กอิน"
        );
        if (opens.isAfter(end)) errors.put(
            "checkinOpensAt",
            "เวลาเปิดเช็กอินต้องไม่อยู่หลังสิ้นสุดกิจกรรม"
        );
        if (closes.isAfter(end)) errors.put(
            "checkinClosesAt",
            "เวลาปิดเช็กอินต้องไม่เกินเวลาสิ้นสุดกิจกรรม"
        );
        if (closes.isBefore(start)) errors.put(
            "checkinClosesAt",
            "เวลาปิดเช็กอินต้องไม่อยู่ก่อนเริ่มกิจกรรม"
        );
        if(online){
            String url=input.onlineMeetingUrl()==null&&existing!=null?existing.getOnlineMeetingUrl():input.onlineMeetingUrl();
            try{var uri=java.net.URI.create(url==null?"":url.trim());if(!"https".equalsIgnoreCase(uri.getScheme())||uri.getHost()==null||uri.getUserInfo()!=null)throw new IllegalArgumentException();}
            catch(IllegalArgumentException ex){errors.put("onlineMeetingUrl","กรุณาระบุลิงก์เข้าร่วมแบบ https:// ที่มีชื่อเว็บไซต์และไม่มีชื่อผู้ใช้หรือรหัสผ่านใน URL");}
        }
        if (!errors.isEmpty()) throw new InvalidSchedule(errors);
    }

    public static class InvalidSchedule extends ResponseStatusException {

        public final Map<String, String> fields;

        public InvalidSchedule(Map<String, String> fields) {
            super(HttpStatus.BAD_REQUEST, "กรุณาตรวจสอบข้อมูลกิจกรรม");
            this.fields = Map.copyOf(fields);
        }
    }
}
