import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.sql.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

/** Explicit local fixture tool. Never called by normal application startup. */
public class PrepareDevData {

  private final Connection db;
  private final LocalDateTime now = LocalDateTime.now(
    ZoneId.of("Asia/Bangkok")
  ).withNano(0);
  private final List<String> guide = new ArrayList<>();
  private long owner;
  private long other;
  private String staff;
  private int sequence;

  PrepareDevData(Connection db) {
    this.db = db;
  }

  public static void main(String[] args) throws Exception {
    if (
      args.length != 2 || !"dev".equals(args[0])
    ) throw new IllegalArgumentException(
      "Usage: PrepareDevData.java dev <backend-directory>"
    );
    Path root = Path.of(args[1]).toRealPath();
    String config = Files.readString(
      root.resolve("src/main/resources/application-dev.yml")
    );
    if (
      !config.contains("jdbc:h2:file:./data/eventhub;AUTO_SERVER=TRUE")
    ) throw new IllegalStateException(
      "Only the existing local dev H2 configuration is supported"
    );
    Path database = root.resolve("data/eventhub");
    if (
      !Files.isRegularFile(Path.of(database + ".mv.db"))
    ) throw new IllegalStateException(
      "Start with profile dev once to initialize the database/accounts first"
    );
    Path backups = root.resolve("data/backups");
    Files.createDirectories(backups);
    String stamp = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss-SSS").format(
      LocalDateTime.now()
    );
    Path backup = backups.resolve("before-dev-fixtures-" + stamp + ".zip");
    Class.forName("org.h2.Driver");
    try (
      Connection db = DriverManager.getConnection(
        "jdbc:h2:file:" +
          database.toString().replace('\\', '/') +
          ";AUTO_SERVER=TRUE",
        "sa",
        ""
      )
    ) {
      PrepareDevData tool = new PrepareDevData(db);
      List<List<String>> accounts = tool.accounts();
      tool.owner = tool.user("user@example", "USER");
      tool.staff = tool.email("STAFF");
      tool.other = tool.optionalOtherUser(tool.owner);
      // H2 creates a transactionally consistent ZIP, including when AUTO_SERVER is running.
      try (Statement s = db.createStatement()) {
        s.execute("BACKUP TO '" + backup.toString().replace("'", "''") + "'");
      }
      if (
        !Files.isRegularFile(backup) || Files.size(backup) == 0
      ) throw new IllegalStateException(
        "Backup missing: refusing to reset data"
      );
      // Same nullable columns as the current entities; supports the older dev DB as well.
      tool.sql(
        "ALTER TABLE events ADD COLUMN IF NOT EXISTS event_format VARCHAR(16)"
      );
      tool.sql(
        "ALTER TABLE events ADD COLUMN IF NOT EXISTS online_meeting_url VARCHAR(2000)"
      );
      tool.sql(
        "ALTER TABLE ticket_types ADD COLUMN IF NOT EXISTS sales_enabled BOOLEAN"
      );
      tool.sql(
        "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS checkin_source VARCHAR(16)"
      );
      db.setAutoCommit(false);
      try {
        tool.seed();
        tool.verify();
        if (!accounts.equals(tool.accounts())) throw new IllegalStateException(
          "Account preservation check failed"
        );
        db.commit();
      } catch (Exception failure) {
        db.rollback();
        throw failure;
      }
      Path manifest = root.resolve("data/DEV_DATA_GUIDE.md");
      String header =
        "# ชุดข้อมูล dev\n\nสร้างเมื่อ " +
        tool.now +
        " (Asia/Bangkok)\n\n" +
        "สำรองฐานข้อมูลเดิม: `" +
        backup +
        "`\n\n" +
        "คงบัญชีเดิมครบ " +
        accounts.size() +
        " บัญชี รวมรหัสผ่าน ชื่อ อีเมล บทบาท และ ID\n\n" +
        "บัญชีผู้ใช้หลัก: user@example / เจ้าหน้าที่: " +
        tool.staff +
        "\n\n" +
        "ลิงก์ออนไลน์เป็น https://example.com สำหรับทดสอบการเปิดลิงก์ ไม่ใช่ห้องประชุมจริง ให้แอดมินเปลี่ยนเป็นห้อง Meet/Zoom ที่สร้างเอง\n\n" +
        "รายการรอจ่ายหมดอายุใน 10 นาทีตามกติกาจริง; ออนไลน์รอบถัดไปเริ่มใน 5 นาที; รอบปัจจุบันเปิดถึงอีก 8 ชั่วโมงนับจากเวลาสร้างชุดข้อมูล\n\n" +
        "| กิจกรรม | ID | สิ่งที่ทดลองได้ |\n|---|---:|---|\n";
      Files.writeString(
        manifest,
        header + String.join("\n", tool.guide) + "\n",
        StandardCharsets.UTF_8
      );
      System.out.println(
        "Prepared 20 events. Preserved all " +
          accounts.size() +
          " existing accounts. Financial, capacity, schedule and check-in assertions passed."
      );
      System.out.println("Backup: " + backup);
      System.out.println("Guide: " + manifest);
    }
  }

  void seed() throws SQLException {
    for (String table : List.of(
      "mock_payment_orders",
      "registrations",
      "page_views",
      "event_detail_images",
      "ticket_types",
      "events"
    ))
      sql("DELETE FROM " + table);
    long e = event(
      "เวิร์กช็อปออกแบบเพื่อทุกคน",
      "DESIGN",
      3,
      24,
      false,
      "เปิดจองฟรี ไม่มีประวัติ: ทดลองจอง ยกเลิก และแก้ไขกิจกรรม"
    );
    ticket(e, "เข้าร่วมฟรี", 0, 24, true);
    e = event(
      "Spring Boot ลงมือทำระบบจริง",
      "TECH",
      5,
      30,
      false,
      "บัตรเสียเงิน: ทดลอง Mock Payment ใหม่และสรุปเงื่อนไขก่อนจอง"
    );
    ticket(e, "Workshop", 490, 20, true);
    ticket(e, "Workshop + เอกสาร", 790, 10, true);
    e = event(
      "Product Day บัตรหลายประเภท",
      "CAREER",
      7,
      20,
      false,
      "ปิดขายเฉพาะ Early Bird แต่บัตรปกติยังซื้อได้"
    );
    ticket(e, "Early Bird (ปิดขาย)", 150, 10, false);
    ticket(e, "Regular", 250, 10, true);
    e = event(
      "Creative Lab รอบเต็ม",
      "DESIGN",
      2,
      2,
      false,
      "เต็ม 2 คนจากการจอง 1 รายการ: ตรวจจำนวนคนกับจำนวนรายการ"
    );
    register(
      e,
      ticket(e, "กลุ่มทดลอง", 0, 2, true),
      other,
      2,
      0,
      "กลุ่มทดลอง",
      null,
      false
    );
    e = event(
      "Community Meetup ปิดรับสมัคร",
      "COMMUNITY",
      1,
      25,
      false,
      "ยังไม่เริ่มแต่ปิดรับสมัครแล้ว ผู้มีบัตรยังเห็นตั๋ว"
    );
    sql(
      "UPDATE events SET registration_closes_at=? WHERE id=?",
      now.minusHours(1),
      e
    );
    register(
      e,
      ticket(e, "สมาชิกชุมชน", 0, 25, true),
      owner,
      1,
      0,
      "สมาชิกชุมชน",
      null,
      false
    );
    e = live(
      "งานเครือข่าย เปิดเช็กอิน",
      false,
      "สตาฟใช้ QR หรือรหัสบัตร เช็กอินพร้อมกันได้เพียงครั้งเดียว"
    );
    register(
      e,
      ticket(e, "ผู้เข้าร่วม", 0, 30, true),
      owner,
      3,
      0,
      "ผู้เข้าร่วม",
      null,
      false
    );
    e = event(
      "งานออกแบบ ยังไม่เปิดเช็กอิน",
      "DESIGN",
      4,
      20,
      false,
      "มีบัตรแล้ว แต่ยังไม่ถึงช่วงเช็กอิน สตาฟต้องได้รับเหตุผล"
    );
    register(
      e,
      ticket(e, "General", 0, 20, true),
      owner,
      1,
      0,
      "General",
      null,
      false
    );
    e = live(
      "เสวนา ปิดช่วงเช็กอินแล้ว",
      false,
      "กิจกรรมยังจัดอยู่ แต่ช่วงรับเช็กอินปิดแล้ว"
    );
    sql(
      "UPDATE events SET checkin_closes_at=? WHERE id=?",
      now.minusMinutes(5),
      e
    );
    register(
      e,
      ticket(e, "General", 0, 30, true),
      owner,
      1,
      0,
      "General",
      null,
      false
    );
    e = event(
      "เวิร์กช็อปเดือนก่อน จบแล้ว",
      "TECH",
      -7,
      20,
      false,
      "บัตรยังไม่เช็กอินของกิจกรรมที่จบแล้ว แยกในกลุ่มประวัติ"
    );
    register(
      e,
      ticket(e, "Archive", 0, 20, true),
      owner,
      1,
      0,
      "Archive",
      null,
      false
    );
    e = live(
      "นิทรรศการ เช็กอินโดยเจ้าหน้าที่",
      false,
      "รายงานต้องแสดงช่องทาง STAFF จำนวน 2 คน และห้ามยกเลิก"
    );
    register(
      e,
      ticket(e, "ผู้เข้าชม", 100, 30, true),
      owner,
      2,
      100,
      "ผู้เข้าชม",
      "STAFF",
      false
    );
    e = event(
      "กิจกรรมฟรี ยกเลิกแล้ว",
      "COMMUNITY",
      6,
      20,
      false,
      "ประวัติยกเลิกบัตรฟรี และกลับมาจองใหม่ได้"
    );
    register(
      e,
      ticket(e, "Free", 0, 20, true),
      owner,
      1,
      0,
      "Free",
      null,
      true
    );
    e = event(
      "คอร์สเสียเงิน ยกเลิกแล้ว",
      "TECH",
      8,
      20,
      false,
      "ยกเลิกก่อนเช็กอิน การชำระเงินยัง CONFIRMED ไม่มีคืนเงินอัตโนมัติ"
    );
    register(
      e,
      ticket(e, "Standard", 350, 20, true),
      owner,
      1,
      350,
      "Standard",
      null,
      true
    );
    e = event(
      "Design Talk ราคาซื้อเดิม",
      "DESIGN",
      9,
      20,
      false,
      "ซื้อ Early Bird 200 บาท x2 ปัจจุบันเปลี่ยนชื่อ/ราคาเป็น Regular 900 บาท ยอดเก่ายัง 400"
    );
    register(
      e,
      ticket(e, "Regular ราคาใหม่", 900, 20, true),
      owner,
      2,
      200,
      "Early Bird ราคาเดิม",
      null,
      false
    );
    e = event(
      "ชำระเงิน Mock รอดำเนินการ",
      "CAREER",
      2,
      20,
      false,
      "เปิดชำระต่อได้ภายใน 10 นาที ยังไม่มีตั๋วจนกว่าจะยืนยันจ่าย"
    );
    long t = ticket(e, "Standard", 250, 20, true);
    payment(
      e,
      t,
      owner,
      2,
      250,
      "Standard",
      "PENDING_PAYMENT",
      null,
      null,
      now.minusSeconds(2)
    );
    e = event(
      "ประวัติชำระเงิน ยกเลิกและหมดอายุ",
      "CAREER",
      10,
      20,
      false,
      "รายการ CANCELLED และ EXPIRED ไม่มีการออกบัตรหรือกันที่นั่ง"
    );
    t = ticket(e, "Standard", 180, 20, true);
    payment(
      e,
      t,
      owner,
      1,
      180,
      "Standard",
      "EXPIRED",
      null,
      null,
      now.minusDays(2)
    );
    payment(
      e,
      t,
      owner,
      1,
      180,
      "Standard",
      "CANCELLED",
      null,
      null,
      now.minusDays(1)
    );
    e = live(
      "ออนไลน์ ซื้อแล้ว เข้าได้ทันที",
      true,
      "user@example ซื้อแล้ว: เปิดตั๋วของฉัน > เช็กอินเพื่อรับลิงก์ > เปิดห้องออนไลน์"
    );
    register(
      e,
      ticket(e, "Online Pass", 299, 30, true),
      owner,
      1,
      299,
      "Online Pass",
      null,
      false
    );
    e = event(
      "ออนไลน์ เริ่มในอีก 5 นาที",
      "TECH",
      1,
      20,
      true,
      "มีบัตรชำระแล้ว ก่อนเริ่มต้องไม่เห็น URL เมื่อถึงเวลาปุ่มเข้าร่วมจะแสดงเอง"
    );
    sql(
      "UPDATE events SET starts_at=?,ends_at=?,registration_closes_at=?,checkin_opens_at=?,checkin_closes_at=? WHERE id=?",
      now.plusMinutes(5),
      now.plusHours(8),
      now.plusMinutes(4),
      now.plusMinutes(5),
      now.plusHours(8),
      e
    );
    register(
      e,
      ticket(e, "Online Pass", 199, 20, true),
      owner,
      1,
      199,
      "Online Pass",
      null,
      false
    );
    e = live(
      "ออนไลน์ เช็กอินผ่านเว็บแล้ว",
      true,
      "รายงานช่องทาง ONLINE จำนวน 2 คน เปิดลิงก์ซ้ำได้ระหว่างกิจกรรมและห้ามยกเลิก"
    );
    register(
      e,
      ticket(e, "Online Free", 0, 30, true),
      owner,
      2,
      0,
      "Online Free",
      "ONLINE",
      false
    );
    e = live(
      "ออนไลน์ ยกเลิกบัตรแล้ว",
      true,
      "เคยชำระแล้วแต่ยกเลิกก่อนเช็กอิน ต้องไม่มีสิทธิ์รับลิงก์"
    );
    register(
      e,
      ticket(e, "Online Pass", 99, 30, true),
      owner,
      1,
      99,
      "Online Pass",
      null,
      true
    );
    e = event(
      "ข้อมูลเก่า ไม่ทราบช่องทางเช็กอิน",
      "COMMUNITY",
      -2,
      20,
      false,
      "รายงานต้องแยก UNKNOWN จำนวน 1 คน ไม่เหมารวมเป็นเจ้าหน้าที่"
    );
    register(
      e,
      ticket(e, "Legacy", 0, 20, true),
      owner,
      1,
      0,
      "Legacy",
      "UNKNOWN",
      false
    );
    // Visits are synthetic local fixtures, distributed over seven days for dashboard charts.
    for (int day = 0; day < 7; day++) for (int v = 0; v < 12 + day; v++) {
      sql(
        "INSERT INTO page_views(type,event_id,session_id,viewed_at) VALUES(?,?,?,?)",
        "SITE",
        null,
        "dev-" + day + "-" + (v % 8),
        now.minusDays(day).minusMinutes(v)
      );
      long viewedEvent = eventIds().get(v % 20);
      sql(
        "INSERT INTO page_views(type,event_id,session_id,viewed_at) VALUES(?,?,?,?)",
        "EVENT",
        viewedEvent,
        "dev-" + day + "-" + (v % 8),
        now.minusDays(day).minusMinutes(v)
      );
    }
  }

  long event(
    String title,
    String category,
    int days,
    int capacity,
    boolean online,
    String scenario
  ) throws SQLException {
    LocalDateTime start = now.plusDays(days);
    long id = insert(
      "INSERT INTO events(title,description,location,starts_at,ends_at,registration_closes_at,checkin_opens_at,checkin_closes_at,capacity,category,organizer_name,organizer_contact,event_format,online_meeting_url) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      title,
      "ชุดข้อมูลพัฒนา: " +
        scenario +
        "\n\nกำหนดการ: แนะนำหัวข้อ ฝึกปฏิบัติ ถามตอบ และสรุปผล\nสิ่งที่ควรเตรียม: คอมพิวเตอร์และหลักฐานบัตร\nติดต่อทีมงานผ่านอีเมลด้านล่าง\nบัตรยกเลิกได้เฉพาะก่อนเช็กอิน การยกเลิกบัตรเสียเงินไม่คืนเงินอัตโนมัติ\n" +
        (online
          ? "ลิงก์ตัวอย่างใช้ทดสอบระบบเท่านั้น แอดมินต้องใส่ห้องประชุมจริงก่อนใช้งาน"
          : "มาถึงก่อนเริ่ม 15 นาที แสดง QR ให้เจ้าหน้าที่"),
      online
        ? "ออนไลน์"
        : "ห้อง " + (++sequence) + " อาคารศูนย์กิจกรรม กรุงเทพฯ",
      start,
      start.plusHours(4),
      start.minusHours(2),
      online ? start : start.minusHours(1),
      start.plusHours(4),
      capacity,
      category,
      "EventHub Dev Team",
      "admin@example",
      online ? "ONLINE" : "ONSITE",
      online ? "https://example.com/?eventhub-dev=online" : null
    );
    guide.add("| " + title + " | " + id + " | " + scenario + " |");
    return id;
  }

  long live(String title, boolean online, String scenario) throws SQLException {
    long id = event(title, "COMMUNITY", 1, 30, online, scenario);
    sql(
      "UPDATE events SET starts_at=?,ends_at=?,registration_closes_at=?,checkin_opens_at=?,checkin_closes_at=? WHERE id=?",
      now.minusHours(1),
      now.plusHours(8),
      now.minusHours(2),
      now.minusHours(1),
      now.plusHours(8),
      id
    );
    return id;
  }

  long ticket(long event, String name, int price, int capacity, boolean enabled)
    throws SQLException {
    return insert(
      "INSERT INTO ticket_types(event_id,name,description,price,capacity,sales_enabled) VALUES(?,?,?,?,?,?)",
      event,
      name,
      "สิทธิ์เข้าร่วมตามประเภทบัตร — ข้อมูลทดสอบ dev",
      price,
      capacity,
      enabled
    );
  }

  void register(
    long event,
    long ticket,
    long user,
    int qty,
    int price,
    String name,
    String source,
    boolean cancelled
  ) throws SQLException {
    String code =
      "GTH-" +
      UUID.randomUUID()
        .toString()
        .replace("-", "")
        .substring(0, 10)
        .toUpperCase(Locale.ROOT);
    LocalDateTime bought = now.minusDays(14).minusMinutes(sequence);
    long id = insert(
      "INSERT INTO registrations(user_id,event_id,ticket_type_id,quantity,registered_at,ticket_code,status,active_user_id,purchased_unit_price,purchased_ticket_name,checked_in_at,checked_in_by,checkin_source,cancelled_at,cancel_reason) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      user,
      event,
      ticket,
      qty,
      bought,
      code,
      cancelled ? "CANCELLED" : "CONFIRMED",
      cancelled ? null : user,
      price,
      name,
      source == null ? null : now.minusDays(2).minusHours(1),
      "STAFF".equals(source)
        ? staff
        : "ONLINE".equals(source)
          ? "ผู้เข้าร่วมออนไลน์"
          : null,
      "UNKNOWN".equals(source) ? null : source,
      cancelled ? now.minusDays(1) : null,
      cancelled ? "ผู้ใช้ยกเลิกก่อนเช็กอิน (ข้อมูล dev)" : null
    );
    // Checked-in fixtures must fall within their own event window, including historical data.
    if (source != null) sql(
      "UPDATE registrations SET checked_in_at=(SELECT starts_at FROM events WHERE id=?) WHERE id=?",
      event,
      id
    );
    if (price > 0) payment(
      event,
      ticket,
      user,
      qty,
      price,
      name,
      "CONFIRMED",
      id,
      code,
      bought
    );
  }

  void payment(
    long event,
    long ticket,
    long user,
    int qty,
    int price,
    String name,
    String status,
    Long reg,
    String code,
    LocalDateTime created
  ) throws SQLException {
    String title;
    try (var p = db.prepareStatement("SELECT title FROM events WHERE id=?")) {
      p.setLong(1, event);
      try (var r = p.executeQuery()) {
        r.next();
        title = r.getString(1);
      }
    }
    insert(
      "INSERT INTO mock_payment_orders(user_id,event_id,ticket_type_id,event_title,ticket_type_name,quantity,unit_price,total_amount,status,created_at,expires_at,confirmed_at,registration_id,issued_ticket_code) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      user,
      event,
      ticket,
      title,
      name,
      qty,
      price,
      BigDecimal.valueOf(price).multiply(BigDecimal.valueOf(qty)),
      status,
      created,
      created.plusMinutes(10),
      "CONFIRMED".equals(status) ? created.plusMinutes(1) : null,
      reg,
      code
    );
  }

  void verify() throws SQLException {
    assertCount("SELECT COUNT(*) FROM events", 20);
    assertCount(
      "SELECT COUNT(*) FROM events WHERE starts_at>=ends_at OR registration_closes_at>starts_at OR checkin_opens_at>=checkin_closes_at OR checkin_closes_at>ends_at",
      0
    );
    assertCount(
      "SELECT COUNT(*) FROM mock_payment_orders WHERE total_amount<>unit_price*quantity OR (status='CONFIRMED' AND (registration_id IS NULL OR confirmed_at IS NULL)) OR (status<>'CONFIRMED' AND registration_id IS NOT NULL)",
      0
    );
    assertCount(
      "SELECT COUNT(*) FROM registrations r LEFT JOIN mock_payment_orders p ON p.registration_id=r.id AND p.status='CONFIRMED' WHERE r.purchased_unit_price>0 AND (p.id IS NULL OR p.unit_price<>r.purchased_unit_price OR p.quantity<>r.quantity OR p.issued_ticket_code<>r.ticket_code OR p.ticket_type_name<>r.purchased_ticket_name)",
      0
    );
    assertCount(
      "SELECT COUNT(*) FROM registrations WHERE (status='CANCELLED' AND (checked_in_at IS NOT NULL OR active_user_id IS NOT NULL)) OR (status='CONFIRMED' AND (active_user_id IS NULL OR active_user_id<>user_id))",
      0
    );
    assertCount(
      "SELECT COUNT(*) FROM events e WHERE (SELECT COALESCE(SUM(r.quantity),0) FROM registrations r WHERE r.event_id=e.id AND r.status='CONFIRMED')>e.capacity",
      0
    );
    assertCount(
      "SELECT COUNT(*) FROM ticket_types t WHERE (SELECT COALESCE(SUM(r.quantity),0) FROM registrations r WHERE r.ticket_type_id=t.id AND r.status='CONFIRMED')>t.capacity",
      0
    );
    assertCount(
      "SELECT COUNT(*) FROM registrations r JOIN events e ON e.id=r.event_id WHERE r.checked_in_at IS NOT NULL AND (r.checked_in_at<e.checkin_opens_at OR r.checked_in_at>e.checkin_closes_at)",
      0
    );
    assertCount("SELECT COUNT(DISTINCT status) FROM mock_payment_orders", 4);
    assertCount(
      "SELECT COUNT(*) FROM registrations WHERE checkin_source='STAFF'",
      1
    );
    assertCount(
      "SELECT COUNT(*) FROM registrations WHERE checkin_source='ONLINE'",
      1
    );
  }

  void assertCount(String query, long expected) throws SQLException {
    try (var s = db.createStatement(); var r = s.executeQuery(query)) {
      r.next();
      if (r.getLong(1) != expected) throw new IllegalStateException(
        "Fixture assertion failed: " + query
      );
    }
  }

  List<Long> eventIds() throws SQLException {
    List<Long> ids = new ArrayList<>();
    try (
      var s = db.createStatement();
      var r = s.executeQuery("SELECT id FROM events ORDER BY id")
    ) {
      while (r.next()) ids.add(r.getLong(1));
    }
    return ids;
  }

  long user(String email, String role) throws SQLException {
    try (
      var p = db.prepareStatement(
        "SELECT id FROM users WHERE email=? AND role=?"
      )
    ) {
      p.setString(1, email);
      p.setString(2, role);
      try (var r = p.executeQuery()) {
        if (!r.next()) throw new IllegalStateException(
          "Required existing account missing: " + email + " (" + role + ")"
        );
        return r.getLong(1);
      }
    }
  }

  String email(String role) throws SQLException {
    try (
      var p = db.prepareStatement(
        "SELECT email FROM users WHERE role=? ORDER BY id"
      )
    ) {
      p.setString(1, role);
      try (var r = p.executeQuery()) {
        if (!r.next()) throw new IllegalStateException(
          "Required role missing: " + role
        );
        return r.getString(1);
      }
    }
  }

  long optionalOtherUser(long owner) throws SQLException {
    try (
      var p = db.prepareStatement(
        "SELECT id FROM users WHERE role='USER' AND id<>? ORDER BY id"
      )
    ) {
      p.setLong(1, owner);
      try (var r = p.executeQuery()) {
        return r.next() ? r.getLong(1) : owner;
      }
    }
  }

  List<List<String>> accounts() throws SQLException {
    List<List<String>> rows = new ArrayList<>();
    try (
      var s = db.createStatement();
      var r = s.executeQuery(
        "SELECT id,name,email,role,password FROM users ORDER BY id"
      )
    ) {
      while (r.next()) rows.add(
        List.of(
          r.getString(1),
          r.getString(2),
          r.getString(3),
          r.getString(4),
          r.getString(5)
        )
      );
    }
    return rows;
  }

  void sql(String query, Object... values) throws SQLException {
    try (var p = db.prepareStatement(query)) {
      bind(p, values);
      p.executeUpdate();
    }
  }

  long insert(String query, Object... values) throws SQLException {
    try (var p = db.prepareStatement(query, Statement.RETURN_GENERATED_KEYS)) {
      bind(p, values);
      p.executeUpdate();
      try (var r = p.getGeneratedKeys()) {
        r.next();
        return r.getLong(1);
      }
    }
  }

  void bind(PreparedStatement p, Object[] values) throws SQLException {
    for (int i = 0; i < values.length; i++) p.setObject(i + 1, values[i]);
  }
}
