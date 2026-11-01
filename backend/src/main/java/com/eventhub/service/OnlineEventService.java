package com.eventhub.service;

import com.eventhub.model.*;
import com.eventhub.repository.*;
import java.security.Principal;
import java.time.LocalDateTime;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OnlineEventService {

  private final EventRepository events;
  private final RegistrationRepository registrations;
  private final UserRepository users;

  public OnlineEventService(
    EventRepository events,
    RegistrationRepository registrations,
    UserRepository users
  ) {
    this.events = events;
    this.registrations = registrations;
    this.users = users;
  }

  public record Settings(String eventFormat, String onlineMeetingUrl) {}

  public record Access(
    boolean available,
    String reason,
    LocalDateTime startsAt,
    LocalDateTime endsAt,
    LocalDateTime checkedInAt
  ) {}

  public record Joined(String url, LocalDateTime checkedInAt) {}

  @Transactional(readOnly = true)
  public Settings settings(Long id) {
    var event = event(id);
    return new Settings(event.getEventFormat(), event.getOnlineMeetingUrl());
  }

  private Event event(Long id) {
    return events
      .findById(id)
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบกิจกรรม")
      );
  }

  private UserAccount user(Principal principal) {
    if (principal == null) throw new ResponseStatusException(
      HttpStatus.UNAUTHORIZED
    );
    var user = users
      .findByEmail(principal.getName())
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    if (user.getRole() != Role.USER) throw new ResponseStatusException(
      HttpStatus.FORBIDDEN,
      "กรุณาใช้บัญชีผู้เข้าร่วม"
    );
    return user;
  }

  private String blocked(Event event) {
    if (
      !"ONLINE".equals(event.getEventFormat())
    ) return "กิจกรรมนี้จัด ณ สถานที่จริง";
    var now = EventClock.now();
    if (
      now.isBefore(event.getStartsAt())
    ) return "ลิงก์เข้าร่วมจะเปิดเมื่อถึงเวลาเริ่มกิจกรรม";
    if (
      !now.isBefore(event.getEndsAt())
    ) return "กิจกรรมสิ้นสุดแล้ว ปิดลิงก์เข้าร่วม";
    if (
      event.getOnlineMeetingUrl() == null
    ) return "ผู้จัดยังไม่ได้กำหนดลิงก์เข้าร่วม";
    return null;
  }

  @Transactional(readOnly = true)
  public Access access(Long id, Principal principal) {
    var user = user(principal);
    var event = event(id);
    var registration = registrations
      .findByUserIdOrderByEventStartsAtAsc(user.getId())
      .stream()
      .filter(r -> r.isActive() && r.getEvent().getId().equals(id))
      .findFirst()
      .orElseThrow(() ->
        new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "ต้องมีบัตรที่ยังใช้งานของกิจกรรมนี้"
        )
      );
    var reason = blocked(event);
    // Never include a meeting URL in a read endpoint, including before the start time.
    return new Access(
      reason == null,
      reason,
      event.getStartsAt(),
      event.getEndsAt(),
      registration.getCheckedInAt()
    );
  }

  @Transactional
  public Joined join(Long id, Principal principal) {
    var user = user(principal);
    var event = events
      .findByIdForUpdate(id)
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบกิจกรรม")
      );
    // Use the same registration row lock as cancellation and staff check-in.
    var registration = registrations
      .activeForUpdate(user.getId(), id)
      .orElseThrow(() ->
        new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "ต้องมีบัตรที่ยังใช้งานของกิจกรรมนี้"
        )
      );
    var reason = blocked(event);
    if (reason != null) throw new ResponseStatusException(
      HttpStatus.CONFLICT,
      reason
    );
    if (registration.getCheckedInAt() == null) {
      registration.checkIn();
      registration.setCheckinSource("ONLINE");
      registration.setCheckedInBy("ผู้เข้าร่วมออนไลน์");
    }
    return new Joined(
      event.getOnlineMeetingUrl(),
      registration.getCheckedInAt()
    );
  }
}
