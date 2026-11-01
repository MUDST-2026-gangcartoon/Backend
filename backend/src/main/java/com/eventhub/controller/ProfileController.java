package com.eventhub.controller;

import com.eventhub.dto.ApiDtos;
import com.eventhub.service.ProfileService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.security.Principal;
import java.util.Locale;
import org.springframework.web.bind.annotation.*;

/** HTTP contract only. Business behavior is implemented after QA RED. */
@RestController
@RequestMapping("/api/auth")
public class ProfileController {

    private final ProfileService profiles;

    public ProfileController(ProfileService profiles) {
        this.profiles = profiles;
    }

    public record ProfileRequest(
        @NotBlank @Size(min = 2, max = 100) String name,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank String currentPassword
    ) {
        public ProfileRequest {
            if (name != null) name = name.trim();
            if (email != null) email = email.trim().toLowerCase(Locale.ROOT);
        }
    }

    public record PasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 8, max = 100) String newPassword
    ) {}

    @PutMapping("/profile")
    public ApiDtos.UserDto profile(@Valid @RequestBody ProfileRequest input, Principal principal) {
        throw new UnsupportedOperationException("Profile update pending QA tests");
    }

    @PostMapping("/password")
    public ApiDtos.UserDto password(@Valid @RequestBody PasswordRequest input, Principal principal) {
        throw new UnsupportedOperationException("Password update pending QA tests");
    }
}
