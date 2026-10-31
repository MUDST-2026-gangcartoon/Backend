package com.eventhub.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;

/**
 * API contract for the test-first password-recovery feature.
 * The recovery behavior is intentionally not implemented in this commit.
 */
@RestController
@Profile("(dev | e2e | test) & !prod")
@RequestMapping("/api/auth/recovery")
public class MockRecoveryController {
    public record Request(@NotBlank @Email String email) {}
    public record Reset(@NotBlank String token, @NotBlank String password) {}

    @GetMapping("/config")
    public Map<String, Object> config() {
        throw new UnsupportedOperationException("Recovery config pending QA tests");
    }

    @PostMapping("/request")
    public Map<String, Object> request(
        @Valid @RequestBody Request input,
        HttpServletRequest request
    ) {
        throw new UnsupportedOperationException("Recovery request pending QA tests");
    }

    @PostMapping("/reset")
    public Map<String, String> reset(
        @Valid @RequestBody Reset input,
        HttpServletRequest request
    ) {
        throw new UnsupportedOperationException("Password reset pending QA tests");
    }
}
