package com.eventhub.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.web.util.WebUtils;

@Component
final class GuestSession {
    private static final String ATTRIBUTE = GuestSession.class.getName() + ".credential";

    private static final String COOKIE = "EVENTHUB_GUEST";
    private static final Duration LIFETIME = Duration.ofDays(180);
    private final boolean secure;

    GuestSession(@Value("${server.servlet.session.cookie.secure:false}") boolean secure) {
        this.secure = secure;
    }

    String credential(HttpServletRequest request) {
        return credential(request, null, false);
    }

    String credential(HttpServletRequest request, HttpServletResponse response, boolean create) {
        if (request.getCookies() != null) {
            for (var cookie : request.getCookies()) {
                if (COOKIE.equals(cookie.getName()) && cookie.getValue().matches("[a-f0-9-]{36}")) {
                    return digest(cookie.getValue());
                }
            }
        }
        // Reuse credentials from bookings made before the persistent cookie was introduced.
        HttpSession session = request.getSession(create);
        if (session == null) return null;
        synchronized (WebUtils.getSessionMutex(session)) {
            String secret = (String) session.getAttribute(ATTRIBUTE);
            if (secret == null && create) {
                secret = UUID.randomUUID().toString();
                session.setAttribute(ATTRIBUTE, secret);
            }
            if (secret == null) return null;
            if (response != null) {
                response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from(COOKIE, secret)
                        .httpOnly(true).secure(secure || request.isSecure()).sameSite("Lax")
                        .path(request.getContextPath() + "/api").maxAge(LIFETIME).build().toString());
            }
            return digest(secret);
        }
    }

    static String digest(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }
}
