package com.eventhub.service;

import static org.junit.jupiter.api.Assertions.*;

import java.time.*;
import java.util.TimeZone;
import org.junit.jupiter.api.Test;

class EventClockTests {

  @Test
  void eventClockUsesBangkokEvenOnUtcServer() {
    var original = TimeZone.getDefault();
    try {
      TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
      assertTrue(
        Duration.between(
            EventClock.now(),
            LocalDateTime.now(ZoneId.of("Asia/Bangkok"))
          )
            .abs()
            .getSeconds() <
          2
      );
    } finally {
      TimeZone.setDefault(original);
    }
  }
}
