package com.eventhub.config;

import com.eventhub.model.Event;
import com.eventhub.model.GuestIdentity;
import com.eventhub.model.MockPaymentOrder;
import com.eventhub.model.MockPaymentStatus;
import com.eventhub.model.PageView;
import com.eventhub.model.Registration;
import com.eventhub.model.RegistrationAttempt;
import com.eventhub.model.Role;
import com.eventhub.model.TicketType;
import com.eventhub.model.UserAccount;
import com.eventhub.repository.UserRepository;
import com.eventhub.service.EventClock;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Order(20)
@Profile("dev & !prod & !e2e")
@ConditionalOnProperty(name = "app.dev.demo.enabled", havingValue = "true", matchIfMissing = true)
public class DevDemoDataSeeder implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(DevDemoDataSeeder.class);
    private static final BigDecimal FREE = BigDecimal.ZERO;
    private static final BigDecimal PAID = BigDecimal.valueOf(150);
    private final EntityManager database;
    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final String batch;

    public DevDemoDataSeeder(EntityManager database, JdbcTemplate jdbc, UserRepository users,
            PasswordEncoder encoder, @Value("${app.dev.demo.set:default}") String batch) {
        this.database = database;
        this.jdbc = jdbc;
        this.users = users;
        this.encoder = encoder;
        this.batch = batch.strip().toLowerCase(Locale.ROOT);
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!batch.matches("[a-z0-9][a-z0-9-]{0,23}")) {
            throw new IllegalArgumentException("APP_DEV_DEMO_SET must use 1–24 letters, numbers or hyphens");
        }
        boolean h2 = Boolean.TRUE.equals(jdbc.execute((ConnectionCallback<Boolean>) connection ->
                connection.getMetaData().getURL().startsWith("jdbc:h2:")));
        if (!h2) {
            log.info("Skipping local demo fixtures because the dev database is not H2");
            return;
        }

        // H2 commits DDL, so create the dev-only marker table before any transactional writes.
        jdbc.execute("CREATE TABLE IF NOT EXISTS dev_demo_batches (batch_name VARCHAR(24) PRIMARY KEY)");
        try {
            jdbc.update("INSERT INTO dev_demo_batches (batch_name) VALUES (?)", batch);
        } catch (DuplicateKeyException alreadySeeded) {
            return;
        }

        seed(EventClock.now().truncatedTo(ChronoUnit.MINUTES));
        log.info("Created local EventHub demo fixtures for set {}", batch);
    }

    private void seed(LocalDateTime now) {
        var attendee = demoUser("ผู้เข้าร่วมตัวอย่าง", demoEmail("demo.attendee"));
        var member = users.findByEmail("user@example").filter(user -> user.getRole() == Role.USER).orElseGet(() -> demoUser("สมาชิกตัวอย่าง", demoEmail("demo.member")));
        var claimedMember = demoUser("สมาชิกที่ย้ายบัตร Guest แล้ว", unusedGuestEmail("demo.claimed"));
        var bookedAt = now.minusHours(2);

        var workshop = event("เวิร์กช็อปทำโปสเตอร์", "DESIGN", now.plusDays(3), 20, List.of(
                new Ticket("บัตรทั่วไป (ฟรี)", FREE, 12), new Ticket("บัตรพร้อมอุปกรณ์", PAID, 8)));
        var checkin = event("พบปะนักพัฒนา · เช็กอินได้", "TECH", now.minusMinutes(30), 24, FREE);
        var near = event("ถ่ายภาพเล่าเรื่อง · ใกล้เต็ม", "DESIGN", now.plusDays(2), 10, FREE);
        var full = event("เสวนาอาชีพ · เต็มแล้ว", "CAREER", now.plusDays(4), 5, FREE);
        var closed = event("ตลาดนัดชุมชน · ปิดรับจอง", "COMMUNITY", now.plusDays(1), 18, FREE);
        closed.setRegistrationClosesAt(now.minusHours(1));
        var past = event("เสวนางานสร้างสรรค์ · จบแล้ว", "COMMUNITY", now.minusDays(1), 30, PAID);
        var online = event("พบปะออนไลน์ · เข้าร่วมได้", "TECH", now.minusMinutes(20), 18, FREE);
        online.setEventFormat("ONLINE");
        online.setOnlineMeetingUrl("https://example.com/");

        memberBooking(member, checkin, 3, bookedAt, null, false);
        memberBooking(attendee, checkin, 4, bookedAt, "STAFF", false);
        guestBooking(checkin, "Guest รอรับบัตรเข้าบัญชี", unusedGuestEmail("guest.demo"), null, 2, bookedAt);
        guestBooking(full, "Guest ที่ย้ายบัตรแล้ว", claimedMember.getEmail(), claimedMember, 5, bookedAt);
        memberBooking(attendee, near, 8, bookedAt, null, false);
        memberBooking(member, online, 1, bookedAt, null, false);
        memberBooking(attendee, online, 2, bookedAt, "ONLINE", false);

        var pastBookingTime = past.getStartsAt().minusDays(1);
        var paid = memberBooking(member, past, 2, pastBookingTime, "STAFF", false);
        var noShow = memberBooking(attendee, past, 1, pastBookingTime, null, false);
        var cancelled = memberBooking(member, past, 1, pastBookingTime, null, true);
        payment(member, past, 0, paid.getQuantity(), pastBookingTime.minusMinutes(2), MockPaymentStatus.CONFIRMED, paid);
        payment(attendee, past, 0, noShow.getQuantity(), pastBookingTime.minusMinutes(2), MockPaymentStatus.CONFIRMED, noShow);
        payment(member, past, 0, cancelled.getQuantity(), pastBookingTime.minusMinutes(2), MockPaymentStatus.CONFIRMED, cancelled);
        payment(member, workshop, 1, 1, bookedAt, MockPaymentStatus.CANCELLED, null);
        payment(member, workshop, 1, 1, bookedAt.plusMinutes(20), MockPaymentStatus.EXPIRED, null);
        payment(attendee, workshop, 1, 1, now, MockPaymentStatus.PENDING_PAYMENT, null);

        attempt(workshop, "u:" + member.getId(), bookedAt, null);
        attempt(workshop, "g:" + UUID.randomUUID(), bookedAt.plusMinutes(10), null);
        attempt(workshop, "g:" + UUID.randomUUID(), now.minusMinutes(2), null);
        for (int visit = 0; visit < 16; visit++) {
            String session = "dev-" + batch + "-" + visit;
            database.persist(new PageView("SITE", null, session));
            if (visit < 11) database.persist(new PageView("EVENT", workshop.getId(), session));
        }
    }

    private String demoEmail(String local) {
        return local + ("default".equals(batch) ? "" : "+" + batch) + "@example.test";
    }

    private String unusedGuestEmail(String local) {
        String email = demoEmail(local);
        var matches = database.createQuery(
                "select count(g) from GuestIdentity g where g.normalizedEmail = :email", Long.class)
                .setParameter("email", email).getSingleResult();
        if (matches == 0 && users.findByEmail(email).isEmpty()) return email;
        return demoEmail(local + "-" + UUID.randomUUID().toString().substring(0, 8));
    }

    private UserAccount demoUser(String name, String email) {
        return users.findByEmail(email).orElseGet(() -> users.save(
                new UserAccount(name, email, encoder.encode(DevAccountSeeder.DEV_PASSWORD), Role.USER)));
    }

    private Event event(String title, String category, LocalDateTime start, int capacity, BigDecimal price) {
        return event(title, category, start, capacity, List.of(new Ticket("บัตรทั่วไป", price, capacity)));
    }

    private Event event(String title, String category, LocalDateTime start, int capacity, List<Ticket> tickets) {
        var event = new Event();
        String prefix = "default".equals(batch) ? "[DEV]" : "[DEV " + batch + "]";
        event.setTitle(prefix + " " + title);
        event.setDescription("ข้อมูลตัวอย่างสำหรับทดลองจองบัตร เช็กอิน และดูรายงาน EventHub");
        event.setLocation("ห้องกิจกรรม EventHub");
        event.setCategory(category);
        event.setStartsAt(start);
        event.setEndsAt(start.plusHours(4));
        event.setCapacity(capacity);
        event.setOrganizerName("ทีมเดโม EventHub");
        event.setOrganizerContact("organizer@example.test");
        for (Ticket ticket : tickets) {
            event.addTicketType(new TicketType(event, ticket.name(), "", ticket.price(), ticket.capacity()));
        }
        database.persist(event);
        return event;
    }

    private Registration memberBooking(UserAccount user, Event event, int quantity,
            LocalDateTime bookedAt, String checkinSource, boolean cancelled) {
        var registration = new Registration(user, event, event.getTicketTypes().getFirst(), quantity);
        if (checkinSource != null) {
            registration.checkIn();
            registration.setCheckinSource(checkinSource);
            registration.setCheckedInBy("ONLINE".equals(checkinSource) ? "ผู้เข้าร่วมออนไลน์" : "staff@example");
        }
        if (cancelled) registration.cancel("รายการตัวอย่างที่ยกเลิก");
        database.persist(registration);
        // Public registration methods use the current clock. Backdate only these new fixture rows.
        database.createQuery("""
                update Registration r set r.registeredAt = :bookedAt, r.checkedInAt = :checkedAt,
                    r.cancelledAt = :cancelledAt where r.id = :id
                """)
                .setParameter("id", registration.getId())
                .setParameter("bookedAt", bookedAt)
                .setParameter("checkedAt", checkinSource == null ? null : event.getStartsAt().plusMinutes(5))
                .setParameter("cancelledAt", cancelled ? bookedAt.plusMinutes(10) : null)
                .executeUpdate();
        attempt(event, "u:" + user.getId(), bookedAt.minusMinutes(2), registration);
        return registration;
    }

    private void guestBooking(Event event, String name, String email, UserAccount owner, int quantity,
            LocalDateTime bookedAt) {
        var guest = new GuestIdentity(email);
        if (owner != null) guest.claim(owner.getId());
        database.persist(guest);
        String session = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        var attemptId = UUID.randomUUID();
        var attempt = new RegistrationAttempt(attemptId, event.getId(), "g:" + session, bookedAt.minusMinutes(2));
        var registration = Registration.forGuest(guest, name, session, UUID.randomUUID().toString(),
                attemptId, event, event.getTicketTypes().getFirst(), quantity, bookedAt);
        database.persist(registration);
        attempt.confirm(registration.getId(), bookedAt);
        database.persist(attempt);
    }

    private void attempt(Event event, String owner, LocalDateTime start, Registration registration) {
        var attempt = new RegistrationAttempt(UUID.randomUUID(), event.getId(), owner, start);
        if (registration != null) attempt.confirm(registration.getId(), start.plusMinutes(2));
        database.persist(attempt);
    }

    private void payment(UserAccount user, Event event, int ticketIndex, int quantity, LocalDateTime createdAt,
            MockPaymentStatus status, Registration registration) {
        TicketType ticket = event.getTicketTypes().get(ticketIndex);
        var order = new MockPaymentOrder(user, event.getId(), ticket.getId(), event.getTitle(), ticket.getName(),
                quantity, ticket.getPrice(), createdAt, createdAt.plusMinutes(10));
        switch (status) {
            case CONFIRMED -> order.markConfirmed(registration.getId(), registration.getTicketCode(), createdAt.plusMinutes(2));
            case CANCELLED -> order.markCancelled();
            case EXPIRED -> order.markExpired();
            case PENDING_PAYMENT -> { }
        }
        database.persist(order);
    }

    private record Ticket(String name, BigDecimal price, int capacity) {}
}
