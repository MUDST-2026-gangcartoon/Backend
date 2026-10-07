package com.eventhub.dto;

import java.math.BigDecimal;

public record TicketTypeRow(
        Long eventId,
        Long id,
        String name,
        String description,
        BigDecimal price,
        int capacity,
        long sold
) {
}