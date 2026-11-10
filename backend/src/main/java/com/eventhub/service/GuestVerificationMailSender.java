package com.eventhub.service;

/** Delivery boundary for a one-time code; implementations must not log the code. */
public interface GuestVerificationMailSender {
    void send(String email, String code);
}
