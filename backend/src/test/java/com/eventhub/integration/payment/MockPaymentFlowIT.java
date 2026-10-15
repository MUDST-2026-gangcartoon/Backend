package com.eventhub.integration.payment;

import com.eventhub.model.MockPaymentOrder;
import com.eventhub.model.MockPaymentStatus;
import com.eventhub.model.Registration;

import com.jayway.jsonpath.JsonPath;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

import static org.springframework.security.test.web.servlet.request
        .SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request
        .SecurityMockMvcRequestPostProcessors.user;

import static org.springframework.test.web.servlet.request
        .MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result
        .MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
class MockPaymentFlowIT extends MockPaymentDbTestSupport {

    // INT-PAY-001 / PAY-REG-001 / PAY-REG-005
    @Test
    void freeTicketRegisterAndStaffCheckIn() throws Exception {
        ticket.setPrice(BigDecimal.ZERO);
        tickets.saveAndFlush(ticket);

        mvc.perform(
                        post("/api/events/{id}/registrations", event.getId())
                                .with(user(alice.getEmail()).roles("USER"))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                {
                                  "ticketTypeId": %d,
                                  "quantity": 2
                                }
                                """.formatted(ticket.getId()))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quantity").value(2));

        assertEquals(1L, registrations.countByEventId(event.getId()));
        assertEquals(0L, payments.count());
        assertEquals(2L, registrations.seatsReservedByEventId(event.getId()));

        List<Registration> saved =
                registrations.findByUserIdOrderByEventStartsAtAsc(
                        alice.getId()
                );

        assertEquals(1, saved.size());
        assertNotNull(saved.get(0).getTicketCode());

        String ticketCode = saved.get(0).getTicketCode();

        mvc.perform(
                        post("/api/staff/events/{id}/check-in", event.getId())
                                .with(user("staff@example.test").roles("STAFF"))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                {"ticketCode":"%s"}
                                """.formatted(ticketCode))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.checkedIn").value(true));

        Registration checkedIn =
                registrations.findByTicketCode(ticketCode).orElseThrow();

        assertNotNull(checkedIn.getCheckedInAt());
    }

    // INT-PAY-002 / PAY-REG-002 / PAY-REG-003
    @Test
    void paidTicketRequiresCheckoutBeforeRegistration()
            throws Exception {

        // Direct Paid Registration ต้องถูกปฏิเสธ
        mvc.perform(
                        post("/api/events/{id}/registrations", event.getId())
                                .with(user(alice.getEmail()).roles("USER"))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                {
                                  "ticketTypeId": %d,
                                  "quantity": 2
                                }
                                """.formatted(ticket.getId()))
                )
                .andExpect(status().isConflict());

        assertEquals(0L, registrations.count());

        MvcResult checkoutResult =
                checkout(alice.getEmail(), 2)
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.status")
                                .value("PENDING_PAYMENT"))
                        .andReturn();

        Number id = JsonPath.read(
                checkoutResult.getResponse().getContentAsString(),
                "$.paymentId"
        );

        Long paymentId = id.longValue();

        // Pending ไม่ออกตั๋วและไม่จองที่นั่ง
        assertEquals(0L, registrations.count());
        assertEquals(0L, registrations.seatsReservedByEventId(event.getId()));

        MockPaymentOrder pending =
                payments.findById(paymentId).orElseThrow();

        assertEquals(MockPaymentStatus.PENDING_PAYMENT, pending.getStatus());
        assertNull(pending.getRegistrationId());
        assertNull(pending.getIssuedTicketCode());

        mvc.perform(
                        post("/api/payments/mock/{id}/confirm", paymentId)
                                .with(user(alice.getEmail()).roles("USER"))
                                .with(csrf())
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.registration.quantity").value(2));

        assertEquals(1L, registrations.countByEventId(event.getId()));
        assertEquals(2L, registrations.seatsReservedByEventId(event.getId()));

        MockPaymentOrder confirmed =
                payments.findById(paymentId).orElseThrow();

        assertEquals(MockPaymentStatus.CONFIRMED, confirmed.getStatus());
        assertNotNull(confirmed.getRegistrationId());
        assertNotNull(confirmed.getIssuedTicketCode());

        // Staff Check-in ใช้ Ticket ที่ออกจริง
        mvc.perform(
                        post("/api/staff/events/{id}/check-in", event.getId())
                                .with(user("staff@example.test").roles("STAFF"))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                {"ticketCode":"%s"}
                                """.formatted(confirmed.getIssuedTicketCode()))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.checkedIn").value(true));
    }

    // INT-PAY-003 / PAY-REG-004
    @Test
    void paymentHistoryRemainsAfterRegistrationCancellation()
            throws Exception {

        MvcResult result =
                checkout(alice.getEmail(), 1)
                        .andExpect(status().isCreated())
                        .andReturn();

        Long paymentId = ((Number) JsonPath.read(
                result.getResponse().getContentAsString(),
                "$.paymentId"
        )).longValue();

        mvc.perform(
                        post("/api/payments/mock/{id}/confirm", paymentId)
                                .with(user(alice.getEmail()).roles("USER"))
                                .with(csrf())
                )
                .andExpect(status().isOk());

        String oldTicketCode =
                payments.findById(paymentId)
                        .orElseThrow()
                        .getIssuedTicketCode();

        mvc.perform(
                        delete("/api/events/{id}/registrations", event.getId())
                                .with(user(alice.getEmail()).roles("USER"))
                                .with(csrf())
                )
                .andExpect(status().isNoContent());

        assertEquals(0L, registrations.countByEventId(event.getId()));

        // History ยังอยู่
        MockPaymentOrder history =
                payments.findById(paymentId).orElseThrow();

        assertEquals(MockPaymentStatus.CONFIRMED, history.getStatus());

        // Confirm ซ้ำหลัง Registration ถูกยกเลิก → 409
        mvc.perform(
                        post("/api/payments/mock/{id}/confirm", paymentId)
                                .with(user(alice.getEmail()).roles("USER"))
                                .with(csrf())
                )
                .andExpect(status().isConflict());

        assertEquals(0L, registrations.count());

        // Ticket ที่ยกเลิกแล้วห้าม Check-in สำเร็จ
        mvc.perform(
                        post("/api/staff/events/{id}/check-in", event.getId())
                                .with(user("staff@example.test").roles("STAFF"))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                {"ticketCode":"%s"}
                                """.formatted(oldTicketCode))
                )
                .andExpect(status().isNotFound());
    }
}