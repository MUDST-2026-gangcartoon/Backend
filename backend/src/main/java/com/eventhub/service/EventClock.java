package com.eventhub.service;

import java.time.LocalDateTime;
import java.time.ZoneId;

/** Event dates in the existing database are Bangkok wall-clock times. */
public final class EventClock {

  private static final ZoneId ZONE = ZoneId.of("Asia/Bangkok");

  private EventClock() {}

  public static LocalDateTime now() {
    return LocalDateTime.now(ZONE);
  }
}
