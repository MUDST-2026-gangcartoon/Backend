package com.eventhub.controller;

import com.eventhub.dto.ApiDtos;
import com.eventhub.model.UserAccount;
import com.eventhub.service.ProfileService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.security.Principal;
import java.util.Locale;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class ProfileController {

  private final ProfileService profiles;
  private final SecurityContextRepository contexts;
  private final SessionAuthenticationStrategy sessions;
  private final CsrfTokenRepository csrf;

  public ProfileController(
    ProfileService profiles,
    SecurityContextRepository contexts,
    SessionAuthenticationStrategy sessions,
    CsrfTokenRepository csrf
  ) {
    this.profiles = profiles;
    this.contexts = contexts;
    this.sessions = sessions;
    this.csrf = csrf;
  }

  public record ProfileRequest(
    @NotBlank(message = "กรุณาระบุชื่อ")
    @Size(min = 2, max = 100, message = "ชื่อควรมี 2–100 ตัวอักษร")
    String name,
    @NotBlank(message = "กรุณาระบุอีเมล")
    @Email(message = "รูปแบบอีเมลไม่ถูกต้อง")
    @Size(max = 254)
    String email,
    @NotBlank(message = "กรุณายืนยันรหัสผ่านปัจจุบัน")
    @Size(max = 100)
    String currentPassword
  ) {
    public ProfileRequest {
      if (name != null) name = name.trim();
      if (email != null) email = email.trim().toLowerCase(Locale.ROOT);
    }
  }

  public record PasswordRequest(
    @NotBlank(message = "กรุณาระบุรหัสผ่านปัจจุบัน") @Size(
      max = 100
    ) String currentPassword,
    @NotBlank(message = "กรุณาระบุรหัสผ่านใหม่") @Size(
      min = 8,
      max = 100,
      message = "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร"
    ) String newPassword
  ) {}

  @PutMapping("/profile")
  public ApiDtos.UserDto profile(
    @Valid @RequestBody ProfileRequest body,
    Principal principal,
    HttpServletRequest request,
    HttpServletResponse response
  ) {
    return refresh(
      profiles.update(
        principal,
        body.name(),
        body.email(),
        body.currentPassword()
      ),
      request,
      response
    );
  }

  @PostMapping("/password")
  public ApiDtos.UserDto password(
    @Valid @RequestBody PasswordRequest body,
    Principal principal,
    HttpServletRequest request,
    HttpServletResponse response
  ) {
    return refresh(
      profiles.password(principal, body.currentPassword(), body.newPassword()),
      request,
      response
    );
  }

  // Preserve this browser's login with the new identity; older sessions expire via PasswordSessionGuard.
  private ApiDtos.UserDto refresh(
    UserAccount account,
    HttpServletRequest request,
    HttpServletResponse response
  ) {
    var details = User.withUsername(account.getEmail())
      .password(account.getPassword())
      .roles(account.getRole().name())
      .build();
    var authentication = UsernamePasswordAuthenticationToken.authenticated(
      details,
      null,
      details.getAuthorities()
    );
    sessions.onAuthentication(authentication, request, response);
    var context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(authentication);
    SecurityContextHolder.setContext(context);
    contexts.saveContext(context, request, response);
    request
      .getSession(true)
      .setAttribute("AUTH_PASSWORD_STAMP", account.getPassword());
    csrf.saveToken(null, request, response);
    return new ApiDtos.UserDto(
      account.getId(),
      account.getName(),
      account.getEmail(),
      account.getRole()
    );
  }
}
