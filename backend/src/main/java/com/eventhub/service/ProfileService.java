package com.eventhub.service;

import com.eventhub.model.UserAccount;
import com.eventhub.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfileService {

  private final UserRepository users;
  private final PasswordEncoder encoder;

  public ProfileService(UserRepository users, PasswordEncoder encoder) {
    this.users = users;
    this.encoder = encoder;
  }

  private UserAccount verified(Principal principal, String password) {
    if (principal == null) throw new ResponseStatusException(
      HttpStatus.UNAUTHORIZED
    );
    var user = users
      .findForPasswordReset(principal.getName())
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    if (
      password.getBytes(StandardCharsets.UTF_8).length > 72 ||
      !encoder.matches(password, user.getPassword())
    ) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "รหัสผ่านปัจจุบันไม่ถูกต้อง"
      );
    }
    return user;
  }

  @Transactional
  public UserAccount update(
    Principal principal,
    String name,
    String email,
    String password
  ) {
    var user = verified(principal, password);
    if (
      users
        .findByEmail(email)
        .filter(other -> !other.getId().equals(user.getId()))
        .isPresent()
    ) {
      throw new ResponseStatusException(
        HttpStatus.CONFLICT,
        "อีเมลนี้มีบัญชีใช้งานแล้ว"
      );
    }
    user.setName(name);
    user.setEmail(email);
    try {
      return users.saveAndFlush(user);
    } catch (DataIntegrityViolationException ex) {
      throw new ResponseStatusException(
        HttpStatus.CONFLICT,
        "อีเมลนี้มีบัญชีใช้งานแล้ว"
      );
    }
  }

  @Transactional
  public UserAccount password(
    Principal principal,
    String current,
    String next
  ) {
    var user = verified(principal, current);
    if (next.getBytes(StandardCharsets.UTF_8).length > 72) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "รหัสผ่านใหม่ต้องไม่เกิน 72 ไบต์"
      );
    }
    if (encoder.matches(next, user.getPassword())) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "รหัสผ่านใหม่ต้องต่างจากรหัสผ่านปัจจุบัน"
      );
    }
    user.setPassword(encoder.encode(next));
    return users.saveAndFlush(user);
  }
}
