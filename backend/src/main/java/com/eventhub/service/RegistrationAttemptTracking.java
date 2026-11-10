package com.eventhub.service;

import java.util.UUID;

import com.eventhub.model.Registration;
import com.eventhub.model.RegistrationAttempt;
import com.eventhub.repository.RegistrationAttemptRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class RegistrationAttemptTracking {
    private final RegistrationAttemptRepository attempts;
    private final GuestPhase2Clock clock;

    RegistrationAttemptTracking(RegistrationAttemptRepository attempts, GuestPhase2Clock clock) {
        this.attempts = attempts;
        this.clock = clock;
    }

    RegistrationAttempt active(UUID id, Long eventId, String ownerKey) {
        if (id == null) return null;
        return attempts.findByIdForUpdate(id)
                .filter(attempt -> attempt.belongsTo(eventId, ownerKey) && attempt.getRegistrationId() == null)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Registration attempt is invalid"));
    }

    void complete(RegistrationAttempt attempt, Registration registration) {
        if (attempt != null) attempt.confirm(registration.getId(), clock.now());
    }
}
