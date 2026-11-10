package com.eventhub.service;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class SmtpGuestVerificationMailSender implements GuestVerificationMailSender {
    private final ObjectProvider<JavaMailSender> sender;
    private final String from;

    SmtpGuestVerificationMailSender(ObjectProvider<JavaMailSender> sender,
            @Value("${app.guest-verification.from:}") String from) {
        this.sender = sender;
        this.from = from;
    }

    @Override
    public void send(String email, String code) {
        var mail = sender.getIfAvailable();
        if (mail == null || from.isBlank()) throw unavailable();
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("EventHub email verification");
        message.setText("Your EventHub verification code is " + code + ". It expires in 10 minutes.");
        try {
            mail.send(message);
        } catch (MailException error) {
            // The exception may include message contents; do not log or expose it.
            throw unavailable();
        }
    }

    private static ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Email verification is unavailable");
    }
}
