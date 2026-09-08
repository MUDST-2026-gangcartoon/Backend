package com.eventhub.dto;

import java.time.LocalDateTime;

public record EventListRow(
        Long id,
        String title,
        String description,
        String location,
        LocalDateTime startsAt,
        Integer capacity,
        String category,
        String imageUrl,
        String detailImageUrl,
        Long registeredCount,
        Boolean registered
) {
}