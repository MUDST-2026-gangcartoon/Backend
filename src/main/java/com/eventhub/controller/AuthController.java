package com.eventhub.controller;

import com.eventhub.dto.ApiDtos;
import com.eventhub.model.Role;
import com.eventhub.model.UserAccount;
import com.eventhub.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;
    private final CsrfTokenRepository csrfTokenRepository;

    public AuthController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            SecurityContextRepository securityContextRepository,
            SessionAuthenticationStrategy sessionAuthenticationStrategy,
            CsrfTokenRepository csrfTokenRepository
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
        this.csrfTokenRepository = csrfTokenRepository;
    }

    @GetMapping("/csrf")
    public ApiDtos.CsrfDto csrf(
            CsrfToken csrfToken
    ) {
        return new ApiDtos.CsrfDto(
                csrfToken.getToken(),
                csrfToken.getHeaderName()
        );
    }

    @PostMapping("/signup")
    public ResponseEntity<ApiDtos.UserDto> signup(
            @Valid @RequestBody ApiDtos.SignupRequest body,
            HttpServletRequest request,
            HttpServletResponse response
    ) {

        validateBcryptPassword(body.password());

        if (userRepository.findByEmail(body.email()).isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email is already registered"
            );
        }

        UserAccount user = new UserAccount(
                body.name(),
                body.email(),
                passwordEncoder.encode(body.password()),
                Role.USER
        );

        try {
            user = userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {

            // กัน race condition เช่น signup email เดียวกันพร้อมกัน
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email is already registered"
            );
        }

        authenticateAndStore(
                body.email(),
                body.password(),
                request,
                response
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(toUserDto(user));
    }

    @PostMapping("/login")
    public ApiDtos.UserDto login(
            @Valid @RequestBody ApiDtos.LoginRequest body,
            HttpServletRequest request,
            HttpServletResponse response
    ) {

        Authentication authentication =
                authenticateAndStore(
                        body.email(),
                        body.password(),
                        request,
                        response
                );

        UserAccount user = userRepository
                .findByEmail(authentication.getName())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Authentication required"
                        )
                );

        return toUserDto(user);
    }

    @GetMapping("/me")
    public ApiDtos.UserDto me(
            Authentication authentication
    ) {

        if (authentication == null ||
                !authentication.isAuthenticated()) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        UserAccount user = userRepository
                .findByEmail(authentication.getName())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Authentication required"
                        )
                );

        return toUserDto(user);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) {

        SecurityContextLogoutHandler logoutHandler =
                new SecurityContextLogoutHandler();

        logoutHandler.logout(
                request,
                response,
                authentication
        );
    }

    private Authentication authenticateAndStore(
            String email,
            String rawPassword,
            HttpServletRequest request,
            HttpServletResponse response
    ) {

        Authentication authentication =
                authenticationManager.authenticate(
                        UsernamePasswordAuthenticationToken
                                .unauthenticated(
                                        email,
                                        rawPassword
                                )
                );

        sessionAuthenticationStrategy.onAuthentication(
                authentication,
                request,
                response
        );

        SecurityContext context =
                SecurityContextHolder.createEmptyContext();

        context.setAuthentication(authentication);

        SecurityContextHolder.setContext(context);

        securityContextRepository.saveContext(
                context,
                request,
                response
        );

        // หลัง login/signup ให้ token เดิมหมดอายุ
        // Frontend ต้อง GET /api/auth/csrf ใหม่
        csrfTokenRepository.saveToken(
                null,
                request,
                response
        );

        return authentication;
    }

    private void validateBcryptPassword(
            String password
    ) {

        int utf8Bytes = password
                .getBytes(StandardCharsets.UTF_8)
                .length;

        if (utf8Bytes > 72) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password is too long"
            );
        }
    }

    private ApiDtos.UserDto toUserDto(
            UserAccount user
    ) {

        return new ApiDtos.UserDto(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole()
        );
    }
}