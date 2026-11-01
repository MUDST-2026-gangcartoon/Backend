package com.eventhub.controller;

import com.eventhub.service.EventRules;
import java.util.Map;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
@Order(-10)
public class ScheduleErrorHandler {

    @ExceptionHandler(EventRules.InvalidSchedule.class)
    public ResponseEntity<?> invalid(EventRules.InvalidSchedule error) {
        return ResponseEntity.badRequest().body(
            Map.of("message", error.getReason(), "fieldErrors", error.fields)
        );
    }
}
