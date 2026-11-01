package com.eventhub.integration.payment;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.eventhub.model.*;
import com.eventhub.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class OnlineTicketsIT extends MockPaymentDbTestSupport {

  private static final String LINK =
    "https://meet.example.test/private-room?key=secret-room-key";

  @Autowired
  EventService service;

  @Autowired
  OnlineEventService onlineService;

  private Registration online(boolean started) {
    event.setEventFormat("ONLINE");
    event.setOnlineMeetingUrl(LINK);
    var now = EventClock.now();
    event.setStartsAt(started ? now.minusMinutes(1) : now.plusDays(1));
    event.setEndsAt(now.plusDays(2));
    events.saveAndFlush(event);
    return registrations.saveAndFlush(
      new Registration(alice, event, ticket, 1)
    );
  }

  private String eventBody(String format, String link, Boolean sales) {
    return """
    {"title":"Online workshop","description":"Details","location":"Bangkok","startsAt":"%s","capacity":5,"category":"TECH","eventFormat":"%s","onlineMeetingUrl":"%s","ticketTypes":[{"id":%s,"name":"General","description":"Admission","price":250,"capacity":5,"salesEnabled":%s}]}
    """.formatted(event.getStartsAt(), format, link, ticket.getId(), sales);
  }

  @Test
  void onlineCreationValidatesLinkAndHidesItFromPublicResponses()
    throws Exception {
    var body = eventBody("ONLINE", LINK, true);
    mvc
      .perform(
        put("/api/admin/events/{id}", event.getId())
          .with(user("admin@example.test").roles("ADMIN"))
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(body)
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.eventFormat").value("ONLINE"))
      .andExpect(jsonPath("$.location").value("ออนไลน์"))
      .andExpect(jsonPath("$.onlineMeetingUrl").doesNotExist());
    for (String path : new String[] {
      "/api/events/" + event.getId(),
      "/api/events",
    }) {
      var text = mvc
        .perform(get(path))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString();
      assertFalse(text.contains("secret-room-key"));
      assertTrue(text.contains("ONLINE"));
    }
    mvc
      .perform(
        get("/api/admin/events/{id}/online-settings", event.getId()).with(
          user("admin@example.test").roles("ADMIN")
        )
      )
      .andExpect(status().isOk())
      .andExpect(header().string("Cache-Control", "no-store"))
      .andExpect(jsonPath("$.onlineMeetingUrl").value(LINK));
    for (String bad : new String[] {
      "",
      "javascript:alert(1)",
      "http://meet.example.test/room",
      "https://user:password@meet.example.test/room",
    }) {
      mvc
        .perform(
          put("/api/admin/events/{id}", event.getId())
            .with(user("admin@example.test").roles("ADMIN"))
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content(eventBody("ONLINE", bad, true))
        )
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fieldErrors.onlineMeetingUrl").isNotEmpty());
    }
  }

  @Test
  void meetingSettingsAreNotAccessibleToUsersStaffOrGuests() throws Exception {
    online(false);
    mvc
      .perform(get("/api/admin/events/{id}/online-settings", event.getId()))
      .andExpect(status().isUnauthorized());
    for (String role : new String[] { "USER", "STAFF" })
      mvc
        .perform(
          get("/api/admin/events/{id}/online-settings", event.getId()).with(
            user(alice.getEmail()).roles(role)
          )
        )
        .andExpect(status().isForbidden());
  }

  @Test
  void onlineLinkOpensOnlyDuringEventAndJoinRecordsCheckinIdempotently()
    throws Exception {
    var registration = online(false);
    mvc
      .perform(
        get("/api/events/{id}/online-access", event.getId()).with(
          user(alice.getEmail()).roles("USER")
        )
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.available").value(false))
      .andExpect(jsonPath("$.url").doesNotExist());
    mvc
      .perform(
        post("/api/events/{id}/online-join", event.getId())
          .with(user(alice.getEmail()).roles("USER"))
          .with(csrf())
      )
      .andExpect(status().isConflict());
    assertNull(
      registrations
        .findById(registration.getId())
        .orElseThrow()
        .getCheckedInAt()
    );
    event.setStartsAt(EventClock.now().minusMinutes(1));
    events.saveAndFlush(event);
    mvc
      .perform(
        get("/api/events/{id}/online-access", event.getId()).with(
          user(alice.getEmail()).roles("USER")
        )
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.available").value(true))
      .andExpect(jsonPath("$.url").doesNotExist());
    for (int n = 0; n < 2; n++) mvc
      .perform(
        post("/api/events/{id}/online-join", event.getId())
          .with(user(alice.getEmail()).roles("USER"))
          .with(csrf())
      )
      .andExpect(status().isOk())
      .andExpect(header().string("Cache-Control", "no-store"))
      .andExpect(jsonPath("$.url").value(LINK))
      .andExpect(jsonPath("$.checkedInAt").isNotEmpty());
    assertEquals(1, registrations.count());
    assertEquals(
      "ผู้เข้าร่วมออนไลน์",
      registrations
        .findById(registration.getId())
        .orElseThrow()
        .getCheckedInBy()
    );
    mvc
      .perform(
        delete("/api/events/{id}/registrations", event.getId())
          .with(user(alice.getEmail()).roles("USER"))
          .with(csrf())
      )
      .andExpect(status().isConflict());
    event.setEndsAt(EventClock.now().minusSeconds(1));
    events.saveAndFlush(event);
    mvc
      .perform(
        post("/api/events/{id}/online-join", event.getId())
          .with(user(alice.getEmail()).roles("USER"))
          .with(csrf())
      )
      .andExpect(status().isConflict());
  }

  @Test
  void onlineAccessRequiresActiveOwnedTicketLoginRoleAndCsrf()
    throws Exception {
    var registration = online(true);
    mvc
      .perform(post("/api/events/{id}/online-join", event.getId()).with(csrf()))
      .andExpect(status().isUnauthorized());
    mvc
      .perform(
        post("/api/events/{id}/online-join", event.getId())
          .with(user(alice.getEmail()).roles("STAFF"))
          .with(csrf())
      )
      .andExpect(status().isForbidden());
    mvc
      .perform(
        post("/api/events/{id}/online-join", event.getId())
          .with(user(bob.getEmail()).roles("USER"))
          .with(csrf())
      )
      .andExpect(status().isForbidden());
    mvc
      .perform(
        post("/api/events/{id}/online-join", event.getId()).with(
          user(alice.getEmail()).roles("USER")
        )
      )
      .andExpect(status().isForbidden());
    service.cancel(event.getId(), () -> alice.getEmail());
    mvc
      .perform(
        get("/api/events/{id}/online-access", event.getId()).with(
          user(alice.getEmail()).roles("USER")
        )
      )
      .andExpect(status().isForbidden());
    mvc
      .perform(
        post("/api/events/{id}/online-join", event.getId())
          .with(user(alice.getEmail()).roles("USER"))
          .with(csrf())
      )
      .andExpect(status().isForbidden());
    assertNull(
      registrations
        .findById(registration.getId())
        .orElseThrow()
        .getCheckedInAt()
    );
  }

  @Test
  void pendingPaymentDoesNotGrantOnlineAccess() throws Exception {
    event.setEventFormat("ONLINE");
    event.setOnlineMeetingUrl(LINK);
    events.saveAndFlush(event);
    createPending(alice, 1);
    mvc
      .perform(
        get("/api/events/{id}/online-access", event.getId()).with(
          user(alice.getEmail()).roles("USER")
        )
      )
      .andExpect(status().isForbidden());
  }

  @Test
  void onsiteTicketCannotUseOnlineJoin() throws Exception {
    registrations.saveAndFlush(new Registration(alice, event, ticket, 1));
    mvc
      .perform(
        post("/api/events/{id}/online-join", event.getId())
          .with(user(alice.getEmail()).roles("USER"))
          .with(csrf())
      )
      .andExpect(status().isConflict());
  }

  @Test
  void closedFreeTypeRejectsBookingAndLegacyNullKeepsTypesOpen()
    throws Exception {
    ticket.setPrice(java.math.BigDecimal.ZERO);
    ticket.setSalesEnabled(false);
    tickets.saveAndFlush(ticket);
    mvc
      .perform(
        post("/api/events/{id}/registrations", event.getId())
          .with(user(alice.getEmail()).roles("USER"))
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content("{\"ticketTypeId\":" + ticket.getId() + ",\"quantity\":1}")
      )
      .andExpect(status().isConflict());
    mvc
      .perform(get("/api/events/{id}", event.getId()))
      .andExpect(jsonPath("$.eventFormat").value("ONSITE"))
      .andExpect(jsonPath("$.ticketTypes[0].salesEnabled").value(false));
    ticket.setSalesEnabled(null);
    tickets.saveAndFlush(ticket);
    mvc
      .perform(
        post("/api/events/{id}/registrations", event.getId())
          .with(user(alice.getEmail()).roles("USER"))
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content("{\"ticketTypeId\":" + ticket.getId() + ",\"quantity\":1}")
      )
      .andExpect(status().isOk());
  }

  @Test
  void closedPaidTypeRejectsCheckoutResumeAndPendingConfirmationButKeepsIssuedTicketsValid()
    throws Exception {
    var pending = createPending(alice, 1);
    ticket.setSalesEnabled(false);
    tickets.saveAndFlush(ticket);
    checkout(bob.getEmail(), 1).andExpect(status().isConflict());
    mvc
      .perform(
        get("/api/payments/mock/{id}/resume", pending.getId()).with(
          user(alice.getEmail()).roles("USER")
        )
      )
      .andExpect(status().isConflict());
    mvc
      .perform(
        post("/api/payments/mock/{id}/confirm", pending.getId())
          .with(user(alice.getEmail()).roles("USER"))
          .with(csrf())
      )
      .andExpect(status().isConflict());
    assertEquals(
      MockPaymentStatus.PENDING_PAYMENT,
      payments.findById(pending.getId()).orElseThrow().getStatus()
    );
    assertEquals(0, registrations.count());
    ticket.setSalesEnabled(true);
    tickets.saveAndFlush(ticket);
    mvc
      .perform(
        post("/api/payments/mock/{id}/confirm", pending.getId())
          .with(user(alice.getEmail()).roles("USER"))
          .with(csrf())
      )
      .andExpect(status().isOk());
    ticket.setSalesEnabled(false);
    tickets.saveAndFlush(ticket);
    var issued = registrations.findAll().get(0);
    assertEquals(
      "CHECKED_IN",
      service
        .checkIn(event.getId(), issued.getTicketCode(), () ->
          "staff@example.test"
        )
        .result()
    );
  }

  @Test
  void adminCanToggleSalesAndOmittedFlagDoesNotReopenClosedTypes()
    throws Exception {
    mvc
      .perform(
        put("/api/admin/events/{id}", event.getId())
          .with(user("admin@example.test").roles("ADMIN"))
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(eventBody("ONSITE", "", false))
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.ticketTypes[0].salesEnabled").value(false));
    var oldClientBody = eventBody("ONSITE", "", false).replace(
      ",\"salesEnabled\":false",
      ""
    );
    mvc
      .perform(
        put("/api/admin/events/{id}", event.getId())
          .with(user("admin@example.test").roles("ADMIN"))
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(oldClientBody)
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.ticketTypes[0].salesEnabled").value(false));
    mvc
      .perform(get("/api/events"))
      .andExpect(status().isOk())
      .andExpect(
        jsonPath("$.items[0].ticketTypes[0].salesEnabled").value(false)
      );
  }

  @Test
  void changingFormatAfterBookingHistoryIsBlockedButMeetingLinkCanBeUpdated()
    throws Exception {
    var registration = online(false);
    mvc
      .perform(
        put("/api/admin/events/{id}", event.getId())
          .with(user("admin@example.test").roles("ADMIN"))
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(eventBody("ONSITE", "", true))
      )
      .andExpect(status().isConflict());
    mvc
      .perform(
        put("/api/admin/events/{id}", event.getId())
          .with(user("admin@example.test").roles("ADMIN"))
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(eventBody("ONLINE", LINK + "-updated", true))
      )
      .andExpect(status().isOk());
    assertEquals(
      "ONLINE",
      events.findById(event.getId()).orElseThrow().getEventFormat()
    );
    assertEquals(registration.getId(), registrations.findAll().get(0).getId());
  }
  @Test
  void concurrentOnlineJoinAndCancellationCannotBothSucceed() throws Exception {
    var registration=online(true);
    var barrier=new java.util.concurrent.CyclicBarrier(2);
    var pool=java.util.concurrent.Executors.newFixedThreadPool(2);
    try {
      java.util.concurrent.Callable<String> join=()->{
        barrier.await(10,java.util.concurrent.TimeUnit.SECONDS);
        try{onlineService.join(event.getId(),()->alice.getEmail());return "joined";}
        catch(org.springframework.web.server.ResponseStatusException expected){return "blocked";}
      };
      java.util.concurrent.Callable<String> cancel=()->{
        barrier.await(10,java.util.concurrent.TimeUnit.SECONDS);
        try{service.cancel(event.getId(),()->alice.getEmail());return "canceled";}
        catch(org.springframework.web.server.ResponseStatusException expected){return "blocked";}
      };
      var first=pool.submit(join);var second=pool.submit(cancel);
      var a=first.get(20,java.util.concurrent.TimeUnit.SECONDS);var b=second.get(20,java.util.concurrent.TimeUnit.SECONDS);
      assertTrue(a.equals("blocked")^b.equals("blocked"));
      var current=registrations.findById(registration.getId()).orElseThrow();
      assertTrue(current.isActive()?current.getCheckedInAt()!=null:current.getCheckedInAt()==null);
    }finally{pool.shutdownNow();assertTrue(pool.awaitTermination(10,java.util.concurrent.TimeUnit.SECONDS));}
  }

}
