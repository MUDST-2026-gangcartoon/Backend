package com.eventhub.service;

import static org.junit.jupiter.api.Assertions.*;

import com.eventhub.dto.ApiDtos;
import com.eventhub.model.Event;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class EventRulesTests {

    @Test
    void statusChangesAtExactBoundaries() {
        var now = LocalDateTime.of(2030, 1, 1, 10, 0);
        var start = now.plusHours(1);
        var end = start.plusHours(4);
        assertEquals("OPEN", EventRules.status(start, end, start, 0, 10, now));
        assertEquals("FULL", EventRules.status(start, end, start, 10, 10, now));
        assertEquals("CLOSED", EventRules.status(start, end, now, 0, 10, now));
        assertEquals("ONGOING", EventRules.status(now, end, now, 0, 10, now));
        assertEquals(
            "ENDED",
            EventRules.status(
                now.minusHours(1),
                now,
                now.minusHours(1),
                0,
                10,
                now
            )
        );
    }

    @Test
    void validationIdentifiesFieldsForInvalidSchedule() {
        var start = com.eventhub.service.EventClock.now().plusDays(1);
        var request = new ApiDtos.EventRequest(
            "Example",
            "description",
            "Bangkok",
            start,
            10,
            "TECH",
            null,
            List.of(),
            List.of(),
            start.minusMinutes(1),
            start.plusMinutes(1),
            start.plusHours(3),
            start.plusHours(2)
        );
        var e = assertThrows(EventRules.InvalidSchedule.class, () ->
            EventRules.validate(request)
        );
        assertTrue(e.fields.containsKey("endsAt"));
        assertTrue(e.fields.containsKey("registrationClosesAt"));
        assertTrue(e.fields.containsKey("checkinClosesAt"));
    }

    @Test
    void legacySchedulesHaveConsistentDefaults() {
        var start = com.eventhub.service.EventClock.now().plusDays(1);
        var e = new Event();
        e.setStartsAt(start);
        assertEquals(start.plusHours(4), e.getEndsAt());
        assertEquals(start, e.getRegistrationClosesAt());
        assertEquals(start.minusHours(1), e.getCheckinOpensAt());
        assertEquals(e.getEndsAt(), e.getCheckinClosesAt());
    }
}
