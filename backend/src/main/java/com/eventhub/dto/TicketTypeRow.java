package com.eventhub.dto;

import java.math.BigDecimal;

public record TicketTypeRow(
        Long eventId,
        Long id,
        String name,
        String description,
        BigDecimal price,
        int capacity,
        long sold, boolean salesEnabled
) {
 public TicketTypeRow(Long eventId,Long id,String name,String description,BigDecimal price,int capacity,long sold){this(eventId,id,name,description,price,capacity,sold,true);}
}