package com.eventhub.config;

import com.eventhub.model.MockPaymentStatus;
import com.eventhub.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Non-destructive upgrade: existing successful payments provide original purchase snapshots. */
@Component
@Order(-100)
public class BookingDataUpgrade implements CommandLineRunner {

    private final RegistrationRepository registrations;
    private final MockPaymentRepository payments;
    private final JdbcTemplate jdbc;

    public BookingDataUpgrade(
        RegistrationRepository r,
        MockPaymentRepository p,
        JdbcTemplate j
    ) {
        registrations = r;
        payments = p;
        jdbc = j;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        try (var connection = jdbc.getDataSource().getConnection()) {
            if (
                connection.getMetaData().getDatabaseProductName().equals("H2")
            ) jdbc.execute(
                "alter table registrations drop constraint if exists uk_registration_user_event"
            );
        }
        for (var r : registrations.findAll()) {
            r.syncActiveUser();
            if (r.getPurchasedUnitPrice() == null) {
                var quote = payments.findFirstByRegistrationIdAndStatus(
                    r.getId(),
                    MockPaymentStatus.CONFIRMED
                );
                if (quote.isPresent()) r.snapshot(
                    quote.get().getTicketTypeName(),
                    quote.get().getUnitPrice()
                );
                else r.snapshot(
                    r.getTicketType() == null
                        ? "General"
                        : r.getTicketType().getName(),
                    java.math.BigDecimal.ZERO
                );
            }
        }
    }
}
