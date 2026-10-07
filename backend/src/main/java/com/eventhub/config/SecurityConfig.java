package com.eventhub.config;

import com.eventhub.model.UserAccount;
import com.eventhub.repository.UserRepository;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.DelegatingSecurityContextRepository;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;

import java.io.IOException;
import java.util.Locale;

@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService(
            UserRepository userRepository
    ) {
        return username -> {

            String email = username
                    .trim()
                    .toLowerCase(Locale.ROOT);

            UserAccount user = userRepository
                    .findByEmail(email)
                    .orElseThrow(() ->
                            new UsernameNotFoundException(
                                    "Invalid email or password"
                            )
                    );

            return User.withUsername(user.getEmail())
                    .password(user.getPassword())
                    .roles(user.getRole().name())
                    .build();
        };
    }

    @Bean
    public AuthenticationManager authenticationManager(
            UserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder
    ) {
        DaoAuthenticationProvider provider =
                new DaoAuthenticationProvider(userDetailsService);

        provider.setPasswordEncoder(passwordEncoder);

        return new ProviderManager(provider);
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {

        return new DelegatingSecurityContextRepository(
                new RequestAttributeSecurityContextRepository(),
                new HttpSessionSecurityContextRepository()
        );
    }

    @Bean
    public SessionAuthenticationStrategy sessionAuthenticationStrategy() {
        return new ChangeSessionIdAuthenticationStrategy();
    }

    @Bean
    public CsrfTokenRepository csrfTokenRepository() {

        HttpSessionCsrfTokenRepository repository =
                new HttpSessionCsrfTokenRepository();

        repository.setHeaderName("X-CSRF-TOKEN");

        return repository;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            SecurityContextRepository securityContextRepository,
            CsrfTokenRepository csrfTokenRepository
    ) throws Exception {

        http
                .securityContext(context ->
                        context.securityContextRepository(
                                securityContextRepository
                        )
                )

                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfTokenRepository)

                        // H2 console ใช้เฉพาะ development
                        .ignoringRequestMatchers("/h2-console/**")
                )

                .authorizeHttpRequests(auth -> auth

                        // Static frontend
                        .requestMatchers(
                                "/",
                                "/index.html",
                                "/assets/**",
                                "/art-*.svg",
                                "/favicon.ico"
                        ).permitAll()

                        // Authentication
                        .requestMatchers(
                                "/api/auth/signup",
                                "/api/auth/login",
                                "/api/auth/logout",
                                "/api/auth/csrf"
                        ).permitAll()

                        .requestMatchers(
                                "/api/auth/me"
                        ).authenticated()

                        // Public Event browsing
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/events",
                                "/api/events/*"
                        ).permitAll()

                        // Public assets / analytics
                        .requestMatchers(
                                "/uploads/**",
                                "/api/analytics/visit"
                        ).permitAll()

                        // H2 development console
                        .requestMatchers(
                                "/h2-console/**"
                        ).permitAll()

                        // ADMIN
                        .requestMatchers(
                                "/api/admin/**"
                        ).hasRole("ADMIN")

                        // STAFF + ADMIN
                        .requestMatchers(
                                "/api/staff/**"
                        ).hasAnyRole(
                                "STAFF",
                                "ADMIN"
                        )

                        // ทุก route ที่เหลือต้อง login
                        .anyRequest()
                        .authenticated()
                )

                .exceptionHandling(errors -> errors

                        .authenticationEntryPoint(
                                (request, response, exception) ->
                                        writeJsonError(
                                                response,
                                                HttpStatus.UNAUTHORIZED,
                                                "Authentication required"
                                        )
                        )

                        .accessDeniedHandler(
                                (request, response, exception) ->
                                        writeJsonError(
                                                response,
                                                HttpStatus.FORBIDDEN,
                                                "Access denied"
                                        )
                        )
                )

                .requestCache(AbstractHttpConfigurer::disable)

                .formLogin(AbstractHttpConfigurer::disable)

                .httpBasic(AbstractHttpConfigurer::disable)

                // เรามี /api/auth/logout ของเราเอง
                .logout(AbstractHttpConfigurer::disable)

                .headers(headers ->
                        headers.frameOptions(frame ->
                                frame.sameOrigin()
                        )
                );

        return http.build();
    }

    private static void writeJsonError(
            HttpServletResponse response,
            HttpStatus status,
            String message
    ) throws IOException {

        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        response.getWriter().write(
                "{\"message\":\"" + message + "\"}"
        );
    }
}