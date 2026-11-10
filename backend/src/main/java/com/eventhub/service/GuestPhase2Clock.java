package com.eventhub.service;

import java.time.LocalDateTime;
import org.springframework.stereotype.Component;

@Component
public class GuestPhase2Clock {
    public LocalDateTime now() {
        return EventClock.now();
    }
}
