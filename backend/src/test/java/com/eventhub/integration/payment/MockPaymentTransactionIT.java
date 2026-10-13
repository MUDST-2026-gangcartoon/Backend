package com.eventhub.integration.payment;

import com.eventhub.model.MockPaymentOrder;
import com.eventhub.model.MockPaymentStatus;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.*;

import static org.springframework.security.test.web.servlet.request
        .SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request
        .SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request
        .MockMvcRequestBuilders.post;

@SpringBootTest
@ActiveProfiles("test")
class MockPaymentTransactionIT extends MockPaymentDbTestSupport {

    @Autowired
    private JdbcTemplate jdbc;

    private boolean hasPersistenceFailure(Throwable error) {
        while (error != null) {
            if (error instanceof DataIntegrityViolationException
                    || error instanceof org.hibernate.exception
                    .ConstraintViolationException) {
                return true;
            }
            error = error.getCause();
        }
        return false;
    }

    // INT-PAY-004 / PAY-CFM-012
    @Test
    void registrationPersistenceFailureMustRollbackConfirmation()
            throws Exception {

        MockPaymentOrder pending = createPending(alice, 2);
        Long paymentId = pending.getId();

        // ทดสอบบน H2 ที่ยังไม่มี Registration
        // Constraint นี้จะปฏิเสธ quantity ปกติ (>= 1)
        jdbc.execute("""
                ALTER TABLE registrations
                ADD CONSTRAINT qa_reject_registration
                CHECK (quantity < 0)
                """);

        try {
            MvcResult result = mvc.perform(
                    post("/api/payments/mock/{id}/confirm", paymentId)
                            .with(user(alice.getEmail()).roles("USER"))
                            .with(csrf())
            ).andReturn();

            Throwable failure = result.getResolvedException();

            // ต้องล้มเหลวจากการเขียน Registration ลง DB
            // ไม่ใช่ UnsupportedOperationException ของ Skeleton
            assertNotNull(failure);

            assertTrue(
                    hasPersistenceFailure(failure),
                    "Expected an actual registration persistence failure"
            );

            assertEquals(0L, registrations.count());

            MockPaymentOrder after =
                    payments.findById(paymentId).orElseThrow();

            assertEquals(
                    MockPaymentStatus.PENDING_PAYMENT,
                    after.getStatus()
            );

            assertNull(after.getRegistrationId());
            assertNull(after.getIssuedTicketCode());

        } finally {
            jdbc.execute("""
                    ALTER TABLE registrations
                    DROP CONSTRAINT qa_reject_registration
                    """);
        }
    }
}