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
            if (connection.getMetaData().getDatabaseProductName().equals("H2")) {
                jdbc.execute(
                    "alter table registrations drop constraint if exists uk_registration_user_event"
                );
                // Hibernate update adds the new columns but keeps legacy H2 nullability.
                allowGuestOwnersOnLegacyH2(connection, "REGISTRATIONS");
                allowGuestOwnersOnLegacyH2(connection, "MOCK_PAYMENT_ORDERS");
            }
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

    private void allowGuestOwnersOnLegacyH2(java.sql.Connection connection, String table)
        throws java.sql.SQLException {
        var metadata = connection.getMetaData();
        boolean lowerCase = metadata.storesLowerCaseIdentifiers();
        String storedTable = lowerCase ? table.toLowerCase(java.util.Locale.ROOT) : table;
        String storedColumn = lowerCase ? "user_id" : "USER_ID";
        try (var columns = metadata.getColumns(null, connection.getSchema(), storedTable, storedColumn)) {
            if (columns.next() && columns.getInt("NULLABLE") == java.sql.DatabaseMetaData.columnNoNulls) {
                jdbc.execute("alter table " + table + " alter column user_id drop not null");
            }
        }
    }
}
