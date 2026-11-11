package com.eventhub.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@Profile("metrics")
class MetricsSecurityConfig {
    @Bean
    @Order(0)
    SecurityFilterChain metricsSecurity(HttpSecurity http) throws Exception {
        return http.securityMatcher(request -> request.getLocalPort() == 9091
                        && request.getMethod().equals("GET")
                        && request.getRequestURI().equals("/actuator/prometheus"))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .build();
    }
}
