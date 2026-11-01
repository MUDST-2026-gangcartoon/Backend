package com.eventhub.controller;

import com.eventhub.dto.ApiDtos;
import com.eventhub.service.MockPaymentService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/payments/mock")
public class MockPaymentController {

    private final MockPaymentService paymentService;

    public MockPaymentController(
            MockPaymentService paymentService
    ) {
        this.paymentService = paymentService;
    }

    @PostMapping("/checkout")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiDtos.MockCheckoutDto checkout(
            @Valid @RequestBody ApiDtos.MockCheckoutRequest request,
            Principal principal
    ) {
        return paymentService.checkout(request, principal);
    }

    @PostMapping("/{paymentId}/confirm")
    public ApiDtos.MockConfirmDto confirm(
            @PathVariable Long paymentId,
            Principal principal
    ) {
        return paymentService.confirm(paymentId, principal);
    }

    @GetMapping("/{paymentId}")
    public ApiDtos.MockPaymentStatusDto status(
            @PathVariable Long paymentId,
            Principal principal
    ) {
        return paymentService.get(paymentId, principal);
    }

    @PostMapping("/{paymentId}/cancel")
    public ApiDtos.MockPaymentStatusDto cancel(
            @PathVariable Long paymentId,
            Principal principal
    ) {
        return paymentService.cancel(paymentId, principal);
    }
}