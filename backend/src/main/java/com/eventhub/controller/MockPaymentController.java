
package com.eventhub.controller;

import com.eventhub.dto.ApiDtos;
import com.eventhub.service.MockPaymentService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/payments/mock")
public class MockPaymentController {

    private final MockPaymentService paymentService;

    public MockPaymentController(
            MockPaymentService paymentService
    ) {
        this.paymentService = paymentService;
    }

    // =========================================================
    // 1. Checkout
    // =========================================================

    @PostMapping("/checkout")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiDtos.MockCheckoutDto checkout(
            @Valid @RequestBody ApiDtos.MockCheckoutRequest request,
            Principal principal
    ) {
        return paymentService.checkout(request, principal);
    }

    // =========================================================
    // 2. Confirm payment
    // =========================================================

    @PostMapping("/{paymentId}/confirm")
    public ApiDtos.MockConfirmDto confirm(
            @PathVariable Long paymentId,
            Principal principal
    ) {
        return paymentService.confirm(paymentId, principal);
    }

    // =========================================================
    // 3. Payment status
    // =========================================================

    @GetMapping("/{paymentId}")
    public ApiDtos.MockPaymentStatusDto status(
            @PathVariable Long paymentId,
            Principal principal
    ) {
        return paymentService.get(paymentId, principal);
    }

    // =========================================================
    // 4. Resume existing pending payment
    // =========================================================

    @GetMapping("/{paymentId}/resume")
    public ApiDtos.MockPaymentResumeDto resume(
            @PathVariable Long paymentId,
            Principal principal
    ) {
        return paymentService.getResumeDetails(
                paymentId,
                principal
        );
    }

    // =========================================================
    // 5. Payment history
    // =========================================================

    @GetMapping("/history")
    public List<ApiDtos.MockPaymentHistoryDto> history(
            Principal principal
    ) {
        return paymentService.getHistory(principal);
    }

    // =========================================================
    // 6. Cancel payment
    // =========================================================

    @PostMapping("/{paymentId}/cancel")
    public ApiDtos.MockPaymentStatusDto cancel(
            @PathVariable Long paymentId,
            Principal principal
    ) {
        return paymentService.cancel(paymentId, principal);
    }
}
