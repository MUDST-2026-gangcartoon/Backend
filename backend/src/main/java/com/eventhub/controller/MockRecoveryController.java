package com.eventhub.controller;

import com.eventhub.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** A simulated inbox, intentionally available only in local/test profiles. No SMTP. */
@RestController
@Profile("(dev | e2e | test) & !prod")
@RequestMapping("/api/auth/recovery")
public class MockRecoveryController {

    private static final String KEY = "MOCK_PASSWORD_RECOVERY";
    private final UserRepository users;
    private final PasswordEncoder encoder;

    public MockRecoveryController(
        UserRepository users,
        PasswordEncoder encoder
    ) {
        this.users = users;
        this.encoder = encoder;
    }

    public record Request(@NotBlank @Email String email) {}

    public record Reset(@NotBlank String token, @NotBlank String password) {}

    private record Challenge(
        String email,
        String tokenHash,
        String passwordStamp,
        Instant expiresAt
    ) {}

    @GetMapping("/config")
    public Map<String, Object> config() {
        return Map.of("mock", true, "expiresInMinutes", 15);
    }

    @PostMapping("/request")
    public Map<String, Object> request(
        @Valid @RequestBody Request input,
        HttpServletRequest request
    ) {
        var session = request.getSession(true);
        synchronized (session) {
            var previous = (Instant) session.getAttribute(KEY + "_LAST");
            if (
                previous != null &&
                previous.plusSeconds(30).isAfter(Instant.now())
            ) throw new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "กรุณารอ 30 วินาทีก่อนขอลิงก์ใหม่"
            );
            session.setAttribute(KEY + "_LAST", Instant.now());
            session.removeAttribute(KEY);
            var account = users.findByEmail(
                input.email().trim().toLowerCase(java.util.Locale.ROOT)
            );
            if (account.isEmpty()) return Map.of(
                "mock",
                true,
                "resetToken",
                "",
                "message",
                "หากมีบัญชีนี้ ระบบจะส่งลิงก์ไปยังกล่องข้อความจำลอง"
            );
            byte[] random = new byte[32];
            new SecureRandom().nextBytes(random);
            String token = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(random);
            var expires = Instant.now().plusSeconds(900);
            session.setAttribute(
                KEY,
                new Challenge(
                    account.get().getEmail(),
                    hash(token),
                    account.get().getPassword(),
                    expires
                )
            );
            return Map.of(
                "mock",
                true,
                "resetToken",
                token,
                "expiresAt",
                expires.toString(),
                "message",
                "กล่องข้อความจำลอง: ใช้ลิงก์นี้ภายใน 15 นาที ในเบราว์เซอร์เดิม"
            );
        }
    }

    @PostMapping("/reset")
    @Transactional
    public Map<String, String> reset(
        @Valid @RequestBody Reset input,
        HttpServletRequest request
    ) {
        if (
            input.password().length() < 8 ||
            input.password().getBytes(StandardCharsets.UTF_8).length > 72
        ) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และไม่เกิน 72 ไบต์"
        );
        var session = request.getSession(false);
        if (session == null) throw invalid();
        synchronized (session) {
            var challenge = (Challenge) session.getAttribute(KEY);
            if (
                challenge == null ||
                !challenge.expiresAt().isAfter(Instant.now()) ||
                !MessageDigest.isEqual(
                    challenge.tokenHash().getBytes(StandardCharsets.UTF_8),
                    hash(input.token()).getBytes(StandardCharsets.UTF_8)
                )
            ) throw invalid();
            var account = users
                .findForPasswordReset(challenge.email())
                .orElseThrow(MockRecoveryController::invalid);
            if (
                !account.getPassword().equals(challenge.passwordStamp())
            ) throw invalid();
            if (
                encoder.matches(input.password(), account.getPassword())
            ) throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "กรุณาใช้รหัสผ่านใหม่ที่ต่างจากเดิม"
            );
            account.setPassword(encoder.encode(input.password()));
            users.saveAndFlush(account);
            session.removeAttribute(KEY);
            session.invalidate();
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
            return Map.of(
                "message",
                "เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่"
            );
        }
    }

    private static ResponseStatusException invalid() {
        return new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "ลิงก์ไม่ถูกต้อง หมดอายุ ถูกใช้แล้ว หรือเปิดจากคนละเบราว์เซอร์ กรุณาขอลิงก์ใหม่"
        );
    }

    private static String hash(String token) {
        try {
            return Base64.getEncoder().encodeToString(
                MessageDigest.getInstance("SHA-256").digest(
                    token.getBytes(StandardCharsets.UTF_8)
                )
            );
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
