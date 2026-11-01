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
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class CheckinSourceIT extends MockPaymentDbTestSupport {

  @Autowired
  EventService service;

  @Autowired
  OnlineEventService online;

  private Registration row(
    UserAccount owner,
    int qty,
    String actor,
    String source,
    boolean checked
  ) {
    var row = new Registration(owner, event, ticket, qty);
    if (checked) row.checkIn();
    row.setCheckedInBy(actor);
    row.setCheckinSource(source);
    return registrations.saveAndFlush(row);
  }

  private UserAccount person(String name) {
    return users.saveAndFlush(
      new UserAccount(
        name,
        name + "@example.test",
        alice.getPassword(),
        Role.USER
      )
    );
  }

  @Test
  void staffCheckinStoresSourceAndReadDtoIncludesIt() throws Exception {
    var row = row(alice, 2, null, null, false);
    service.checkIn(event.getId(), row.getTicketCode(), () ->
      "operator@example.test"
    );
    var stored = registrations.findById(row.getId()).orElseThrow();
    assertEquals("STAFF", stored.getCheckinSource());
    stored.setCheckedInBy(null);
    registrations.saveAndFlush(stored);
    assertEquals(
      "STAFF",
      registrations.findById(row.getId()).orElseThrow().getCheckinSource()
    );
    mvc
      .perform(
        get("/api/admin/events/{id}/attendees", event.getId()).with(
          user("admin@example.test").roles("ADMIN")
        )
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$[0].checkinSource").value("STAFF"));
  }

  @Test
  void onlineCheckinStoresSourceAndRepeatedStaffScanDoesNotOverwriteIt() {
    event.setEventFormat("ONLINE");
    event.setOnlineMeetingUrl("https://meeting.example.test/room");
    event.setStartsAt(EventClock.now().minusMinutes(1));
    event.setEndsAt(EventClock.now().plusHours(1));
    events.saveAndFlush(event);
    var row = row(alice, 1, null, null, false);
    online.join(event.getId(), () -> alice.getEmail());
    assertEquals(
      "ALREADY_USED",
      service
        .checkIn(event.getId(), row.getTicketCode(), () ->
          "operator@example.test"
        )
        .result()
    );
    assertEquals(
      "ONLINE",
      registrations.findById(row.getId()).orElseThrow().getCheckinSource()
    );
  }

  @Test
  void legacySourcesUseExistingEvidenceAndLeaveMissingEvidenceUnknown() {
    assertEquals(
      "STAFF",
      row(alice, 1, "operator@example.test", null, true).getCheckinSource()
    );
    assertEquals(
      "ONLINE",
      row(bob, 1, "ผู้เข้าร่วมออนไลน์", null, true).getCheckinSource()
    );
    assertEquals(
      "UNKNOWN",
      row(person("legacy"), 1, null, null, true).getCheckinSource()
    );
    assertNull(row(person("waiting"), 1, null, null, false).getCheckinSource());
  }

  @Test
  void eventAndGlobalReportsCountPeopleBySourceAndExcludeCanceledAndUncheckedRows()
    throws Exception {
    event.setCapacity(12);
    ticket.setCapacity(12);
    events.saveAndFlush(event);
    tickets.saveAndFlush(ticket);
    row(alice, 2, "operator@example.test", "STAFF", true);
    row(bob, 3, "ผู้เข้าร่วมออนไลน์", "ONLINE", true);
    row(person("legacy"), 1, null, null, true);
    row(person("waiting"), 4, null, null, false);
    var canceled = row(
      person("canceled"),
      2,
      "operator@example.test",
      "STAFF",
      true
    );
    canceled.cancel("legacy canceled history");
    registrations.saveAndFlush(canceled);
    for (String endpoint : new String[] {
      "/api/admin/events/" + event.getId() + "/report",
      "/api/admin/analytics/operations",
    }) {
      mvc
        .perform(get(endpoint).with(user("admin@example.test").roles("ADMIN")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.participants").value(10))
        .andExpect(jsonPath("$.checkedIn").value(6))
        .andExpect(jsonPath("$.staffCheckedIn").value(2))
        .andExpect(jsonPath("$.onlineCheckedIn").value(3))
        .andExpect(jsonPath("$.unknownCheckedIn").value(1));
    }
  }
}
