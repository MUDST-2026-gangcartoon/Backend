package com.eventhub.controller;

import com.eventhub.dto.ApiDtos;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log =
            LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiDtos.ErrorDto> handleValidation(
            MethodArgumentNotValidException ex
    ) {
        FieldError firstError = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .findFirst()
                .orElse(null);

        String message;

        if (firstError != null) {
            message = firstError.getDefaultMessage();
        } else {
            message = "Invalid request";
        }

        return ResponseEntity
                .badRequest()
                .body(new ApiDtos.ErrorDto(message));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiDtos.ErrorDto> handleConstraintViolation(
            ConstraintViolationException ex
    ) {
        String message = ex.getConstraintViolations()
                .stream()
                .findFirst()
                .map(violation -> violation.getMessage())
                .orElse("Invalid request");

        return ResponseEntity
                .badRequest()
                .body(new ApiDtos.ErrorDto(message));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiDtos.ErrorDto> handleUnreadableRequest(
            HttpMessageNotReadableException ex
    ) {
        return ResponseEntity
                .badRequest()
                .body(new ApiDtos.ErrorDto("Malformed request body"));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiDtos.ErrorDto> handleResponseStatus(
            ResponseStatusException ex
    ) {
        String message = ex.getReason();

        if (message == null || message.isBlank()) {
            message = "Request failed";
        }

        return ResponseEntity
                .status(ex.getStatusCode())
                .body(new ApiDtos.ErrorDto(message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiDtos.ErrorDto> handleUnexpected(
            Exception ex
    ) {
        log.error("Unexpected backend error", ex);

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiDtos.ErrorDto(
                        "An unexpected error occurred"
                ));
    }
}