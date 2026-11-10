package com.eventhub.integration.guest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.eventhub.model.Event;
import com.eventhub.model.Role;
import com.eventhub.model.TicketType;
import com.eventhub.model.UserAccount;
import com.eventhub.repository.EventRepository;
import com.eventhub.repository.RegistrationRepository;
import com.eventhub.repository.UserRepository;
import com.eventhub.service.EventClock;
import com.eventhub.service.GuestPhase2Clock;
import com.eventhub.service.GuestVerificationMailSender;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:eventhub-guest-phase2-it")
@ActiveProfiles("test")
abstract class GuestPhase2TestSupport {
    @Autowired private WebApplicationContext context;
    @Autowired private EventRepository events;
    @Autowired protected RegistrationRepository registrations;
    @Autowired protected UserRepository users;
    @MockitoBean protected GuestPhase2Clock clock;
    @MockitoBean protected GuestVerificationMailSender mailSender;

    protected MockMvc mvc;
    protected LocalDateTime now;

    @BeforeEach
    void setUpGuestApi() {
        now = EventClock.now().withNano(0);
        when(clock.now()).thenReturn(now);
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    protected EventFixture event(int capacity) {
        var event = new Event();
        event.setTitle("Phase 2 QA " + UUID.randomUUID());
        event.setDescription("Guest workflow integration test");
        event.setLocation("Bangkok");
        event.setCategory("TECH");
        event.setCapacity(capacity);
        event.setStartsAt(now.plusDays(2));
        event.setCheckinOpensAt(now.minusHours(1));
        event.setCheckinClosesAt(now.plusDays(3));
        var free = new TicketType(event, "Free", "Free admission", BigDecimal.ZERO, capacity);
        var paid = new TicketType(event, "Paid", "Paid admission", new BigDecimal("125.00"), capacity);
        event.addTicketType(free);
        event.addTicketType(paid);
        events.saveAndFlush(event);
        return new EventFixture(event.getId(), free.getId(), paid.getId());
    }

    protected UserAccount account(String email) {
        return users.saveAndFlush(new UserAccount("Phase 2 Member", email, "not-used-by-mock-authentication", Role.USER));
    }

    protected static String guestEmail() {
        return "phase2-" + UUID.randomUUID() + "@example.test";
    }

    protected static MockHttpServletRequestBuilder guestBooking(
            EventFixture event, long ticketId, String action, MockHttpSession session,
            String email, int quantity, String key, UUID attemptId) {
        var request = post("/api/guest/events/{id}/" + action, event.id())
                .session(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"displayName":"Guest Participant","email":"%s","ticketTypeId":%d,"quantity":%d,"attemptId":%s}
                        """.formatted(email, ticketId, quantity, attemptId == null ? "null" : "\"" + attemptId + "\""));
        return key == null ? request : request.header("Idempotency-Key", key);
    }

    protected MvcResult bookFree(EventFixture event, MockHttpSession session, String email, int quantity,
            String key, UUID attemptId) throws Exception {
        return mvc.perform(guestBooking(event, event.freeTicketId(), "registrations", session,
                        email, quantity, key, attemptId).with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.quantity").value(quantity))
                .andExpect(jsonPath("$.ticketCode").isNotEmpty())
                .andReturn();
    }

    protected MvcResult checkIn(EventFixture event, String ticketCode, String result) throws Exception {
        return mvc.perform(post("/api/staff/events/{id}/check-in", event.id())
                        .with(user("staff@example.test").roles("STAFF")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ticketCode\":\"" + ticketCode + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value(result))
                .andExpect(jsonPath("$.ticketCode").value(ticketCode))
                .andReturn();
    }

    protected static long id(MvcResult response, String path) throws Exception {
        Number value = JsonPath.read(response.getResponse().getContentAsString(), path);
        return value.longValue();
    }

    protected static String string(MvcResult response, String path) throws Exception {
        return JsonPath.read(response.getResponse().getContentAsString(), path);
    }

    protected record EventFixture(long id, long freeTicketId, long paidTicketId) {}
}
