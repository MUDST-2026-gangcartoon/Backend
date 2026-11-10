package com.eventhub.controller;

import java.security.Principal;
import java.time.LocalDate;

import com.eventhub.dto.GuestApiDtos;
import com.eventhub.service.GuestPhase2Service;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class GuestPhase2Controller {
    private final GuestPhase2Service service;

    public GuestPhase2Controller(GuestPhase2Service service) {
        this.service = service;
    }

    @PostMapping("/guest/events/{eventId}/registrations")
    @ResponseStatus(HttpStatus.CREATED)
    public GuestApiDtos.Receipt register(@PathVariable Long eventId,
            @RequestHeader(name = "Idempotency-Key", required = false) String key,
            @Valid @RequestBody GuestApiDtos.BookingRequest booking, HttpServletRequest request,
            HttpServletResponse response) {
        noStore(response);
        return service.register(eventId, requireKey(key), booking, request);
    }

    @PostMapping("/guest/events/{eventId}/checkout")
    @ResponseStatus(HttpStatus.CREATED)
    public GuestApiDtos.Payment checkout(@PathVariable Long eventId,
            @RequestHeader(name = "Idempotency-Key", required = false) String key,
            @Valid @RequestBody GuestApiDtos.BookingRequest booking, HttpServletRequest request,
            HttpServletResponse response) {
        noStore(response);
        return service.checkout(eventId, requireKey(key), booking, request);
    }

    @GetMapping("/guest/bookings/{registrationId}")
    public GuestApiDtos.Receipt receipt(@PathVariable Long registrationId,
            HttpServletRequest request, HttpServletResponse response) {
        noStore(response);
        return service.receipt(registrationId, request);
    }

    @PostMapping("/guest/bookings/{registrationId}/cancel")
    public GuestApiDtos.Receipt cancelRegistration(@PathVariable Long registrationId,
            HttpServletRequest request, HttpServletResponse response) {
        noStore(response);
        return service.cancelRegistration(registrationId, request);
    }

    @GetMapping("/guest/payments/{paymentId}")
    public GuestApiDtos.Payment payment(@PathVariable Long paymentId,
            HttpServletRequest request, HttpServletResponse response) {
        noStore(response);
        return service.payment(paymentId, request);
    }

    @PostMapping("/guest/payments/{paymentId}/confirm")
    public GuestApiDtos.Payment confirmPayment(@PathVariable Long paymentId,
            HttpServletRequest request, HttpServletResponse response) {
        noStore(response);
        return service.confirmPayment(paymentId, request);
    }

    @PostMapping("/guest/payments/{paymentId}/cancel")
    public GuestApiDtos.Payment cancelPayment(@PathVariable Long paymentId,
            HttpServletRequest request, HttpServletResponse response) {
        noStore(response);
        return service.cancelPayment(paymentId, request);
    }

    @PostMapping("/auth/email-verification/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void requestVerification(Principal principal) {
        service.requestVerification(principal);
    }

    @PostMapping("/auth/email-verification/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirmVerification(@Valid @RequestBody GuestApiDtos.VerificationCode verification,
            Principal principal) {
        service.confirmVerification(principal, verification.code());
    }

    @PostMapping("/registrations/claim-guest")
    public GuestApiDtos.ClaimResult claim(Principal principal) {
        return service.claim(principal);
    }

    @PostMapping("/analytics/registration-attempts")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void startAttempt(@Valid @RequestBody GuestApiDtos.StartAttempt attempt,
            Principal principal, HttpServletRequest request) {
        service.startAttempt(attempt, principal, request);
    }

    @GetMapping("/admin/analytics/funnel")
    public GuestApiDtos.Funnel funnel(@RequestParam(required = false) Long eventId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (from == null || to == null || !from.isBefore(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid from/to date range is required");
        }
        return service.funnel(eventId, from, to);
    }

    private static String requireKey(String key) {
        if (key == null || !key.matches("[A-Za-z0-9._:-]{1,128}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid Idempotency-Key header is required");
        }
        return key;
    }

    private static void noStore(HttpServletResponse response) {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
    }
}
