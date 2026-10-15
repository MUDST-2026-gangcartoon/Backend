package com.eventhub.config;

import java.io.IOException;
import java.util.List;
import java.util.Locale;

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
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.eventhub.model.UserAccount;
import com.eventhub.repository.UserRepository;

import jakarta.servlet.http.HttpServletResponse;

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
            String email = username.trim().toLowerCase(Locale.ROOT);

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

    // CORS: อนุญาตให้ Frontend เรียก Backend ข้าม origin ได้
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOriginPatterns(
                List.of(
                        "http://localhost:[5173,5174]",
                        "http://127.0.0.1:[5173,5174]",
                        "http://192.168.*:[5173,5174]",
                        "http://10.*:[5173,5174]",
                        "https://*.trycloudflare.com"
                )
        );

        configuration.setAllowCredentials(true);
        configuration.setAllowedMethods(
                List.of(
                        "GET",
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE",
                        "OPTIONS"
                )
        );

        configuration.setAllowedHeaders(
                List.of(
                        "Authorization",
                        "Content-Type",
                        "Accept",
                        "X-CSRF-TOKEN"
                )
        );

        // จำเป็นสำหรับการส่ง Session Cookie
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            SecurityContextRepository securityContextRepository,
            CsrfTokenRepository csrfTokenRepository,
            CorsConfigurationSource corsConfigurationSource
    ) throws Exception {

        http
                // เปิด CORS ก่อนจัดการ Authentication
                .cors(cors ->
                        cors.configurationSource(corsConfigurationSource)
                )

                .securityContext(context ->
                        context.securityContextRepository(
                                securityContextRepository
                        )
                )

                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfTokenRepository)
                        .ignoringRequestMatchers("/h2-console/**")
                )

                .authorizeHttpRequests(auth -> auth

                                // Allow Kubernetes health probes without authentication
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/actuator/health",
                                        "/actuator/health/**"
                                ).permitAll()

// Deny access to all other Actuator paths
                                .requestMatchers("/actuator/**").denyAll()
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
                        // Mock Payment APIs are available only to ROLE_USER.
                        // Individual payment ownership is checked in MockPaymentService.
                        .requestMatchers(
                                "/api/payments/mock/**"
                        ).hasRole("USER")

                        // ADMIN only
                        .requestMatchers(
                                "/api/admin/**"
                        ).hasRole("ADMIN")

                        // STAFF and ADMIN
                        .requestMatchers(
                                "/api/staff/**"
                        ).hasAnyRole("STAFF", "ADMIN")

                        // Other routes require authentication
                        .anyRequest().authenticated()
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

                // ใช้ /api/auth/logout ของโปรเจกต์เอง
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