package com.eventhub.dto;

import java.time.LocalDateTime;

public record EventListRow(
        Long id,
        String title,
        String description,
        String location,
        LocalDateTime startsAt,
        int capacity,
        String category,
        String imageUrl,
        String detailImageUrl,
        long registeredCount,
        boolean registered,
        LocalDateTime endsAt,LocalDateTime registrationClosesAt,LocalDateTime checkinOpensAt,LocalDateTime checkinClosesAt,String eventFormat
) {
 public EventListRow(Long id,String title,String description,String location,LocalDateTime startsAt,int capacity,String category,String imageUrl,String detailImageUrl,long registeredCount,boolean registered,LocalDateTime endsAt,LocalDateTime registrationClosesAt,LocalDateTime checkinOpensAt,LocalDateTime checkinClosesAt){this(id,title,description,location,startsAt,capacity,category,imageUrl,detailImageUrl,registeredCount,registered,endsAt,registrationClosesAt,checkinOpensAt,checkinClosesAt,"ONSITE");}
 public EventListRow(Long id,String title,String description,String location,LocalDateTime startsAt,int capacity,String category,String imageUrl,String detailImageUrl,long registeredCount,boolean registered){this(id,title,description,location,startsAt,capacity,category,imageUrl,detailImageUrl,registeredCount,registered,null,null,null,null);}
 public LocalDateTime endsAt(){return endsAt==null?startsAt.plusHours(4):endsAt;}
 public LocalDateTime registrationClosesAt(){return registrationClosesAt==null?startsAt:registrationClosesAt;}
 public LocalDateTime checkinOpensAt(){return "ONLINE".equals(eventFormat)?startsAt:checkinOpensAt==null?startsAt.minusHours(1):checkinOpensAt;}
 public LocalDateTime checkinClosesAt(){return "ONLINE".equals(eventFormat)?endsAt():checkinClosesAt==null?endsAt():checkinClosesAt;}

}