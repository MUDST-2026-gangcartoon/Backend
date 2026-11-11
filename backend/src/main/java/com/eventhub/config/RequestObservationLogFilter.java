package com.eventhub.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** A bounded request log for the disposable tracing demo; never logs URLs or query data. */
@Component
@Profile("tracing")
@Order(Ordered.LOWEST_PRECEDENCE)
public class RequestObservationLogFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(RequestObservationLogFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        try {
            chain.doFilter(request, response);
        } finally {
            log.info("HTTP request completed method={} status={}", request.getMethod(), response.getStatus());
        }
    }
}
