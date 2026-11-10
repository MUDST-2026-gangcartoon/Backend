package com.eventhub.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.util.WebUtils;

final class GuestSession {
    private static final String ATTRIBUTE = GuestSession.class.getName() + ".credential";

    private GuestSession() {}

    static String credential(HttpServletRequest request, boolean create) {
        HttpSession session = request.getSession(create);
        if (session == null) return null;
        synchronized (WebUtils.getSessionMutex(session)) {
            String secret = (String) session.getAttribute(ATTRIBUTE);
            if (secret == null && create) {
                secret = UUID.randomUUID().toString();
                session.setAttribute(ATTRIBUTE, secret);
            }
            return secret == null ? null : digest(secret);
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
