package com.eventhub.integration.payment;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.eventhub.model.*;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class AuditFixesIT extends MockPaymentDbTestSupport {

  private TicketType freeType() {
    event.setCapacity(6);
    var free = new TicketType(event, "Free", "Free ticket", BigDecimal.ZERO, 1);
    event.addTicketType(free);
    events.saveAndFlush(event);
    return tickets
      .findByEventIdOrderByIdAsc(event.getId())
      .stream()
      .filter(t -> t.getPrice().signum() == 0)
      .findFirst()
      .orElseThrow();
  }

  @Test
  void pendingPaidOrderMustBeCanceledBeforeBookingFreeTicket()
    throws Exception {
    var free = freeType();
    var pending = createPending(alice, 1);
    mvc
      .perform(
        post("/api/events/{id}/registrations", event.getId())
          .with(user(alice.getEmail()).roles("USER"))
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content("{\"ticketTypeId\":" + free.getId() + ",\"quantity\":1}")
      )
      .andExpect(status().isConflict());
    assertEquals(0, registrations.count());
    mvc
      .perform(
        post("/api/payments/mock/{id}/cancel", pending.getId())
          .with(user(alice.getEmail()).roles("USER"))
          .with(csrf())
      )
      .andExpect(status().isOk());
    mvc
      .perform(
        post("/api/events/{id}/registrations", event.getId())
          .with(user(alice.getEmail()).roles("USER"))
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content("{\"ticketTypeId\":" + free.getId() + ",\"quantity\":1}")
      )
      .andExpect(status().isOk());
  }

  @Test
  void conflictingLegacyPendingCannotResumeButCanBeCanceled() throws Exception {
    var free = freeType();
    var pending = createPending(alice, 1);
    registrations.saveAndFlush(new Registration(alice, event, free, 1));
    mvc
      .perform(
        get("/api/payments/mock/{id}/resume", pending.getId()).with(
          user(alice.getEmail()).roles("USER")
        )
      )
      .andExpect(status().isConflict());
    mvc
      .perform(
        post("/api/payments/mock/{id}/cancel", pending.getId())
          .with(user(alice.getEmail()).roles("USER"))
          .with(csrf())
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status").value("CANCELLED"));
  }

  @Test
  void deletionMetadataDistinguishesEmptyFromCanceledHistory()
    throws Exception {
    mvc
      .perform(get("/api/events/{id}", event.getId()))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.deletable").value(true))
      .andExpect(jsonPath("$.deletionBlockedReason").isEmpty())
      .andExpect(jsonPath("$.ticketTypes[0].removable").value(true));
    var reg = new Registration(alice, event, ticket, 1);
    reg.cancel("test history");
    registrations.saveAndFlush(reg);
    mvc
      .perform(get("/api/events/{id}", event.getId()))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.deletable").value(false))
      .andExpect(jsonPath("$.ticketTypes[0].sold").value(0))
      .andExpect(jsonPath("$.ticketTypes[0].removable").value(false))
      .andExpect(
        jsonPath("$.ticketTypes[0].removalBlockedReason").isNotEmpty()
      );
  }

  @Test
  void organizerFieldsAreStoredAndReturnedThroughApi() throws Exception {
    String request = """
      {"title":"Organized workshop","description":"Details","location":"Bangkok","startsAt":"%s","capacity":5,"category":"TECH","organizerName":"Workshop Team","organizerContact":"contact@example.test","ticketTypes":[{"name":"General","description":"Admission","price":100,"capacity":5}]}
      """.formatted(event.getStartsAt());
    mvc
      .perform(
        post("/api/admin/events")
          .with(user("admin@example.test").roles("ADMIN"))
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(request)
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.organizerName").value("Workshop Team"))
      .andExpect(jsonPath("$.organizerContact").value("contact@example.test"));
  }

  @Test
  void malformedQueryParametersReturn400() throws Exception {
    mvc.perform(get("/api/events?page=abc")).andExpect(status().isBadRequest());
    mvc
      .perform(
        get("/api/payments/mock/history?page=abc").with(
          user(alice.getEmail()).roles("USER")
        )
      )
      .andExpect(status().isBadRequest());
    mvc
      .perform(get("/api/events/not-a-number"))
      .andExpect(status().isBadRequest());
  }
}
