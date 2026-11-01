package com.eventhub.config;

import com.eventhub.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/** Login sessions carrying an old password stamp expire after a password change. */
public class PasswordSessionGuard extends OncePerRequestFilter {

    private final UserRepository users;

    public PasswordSessionGuard(UserRepository users) {
        this.users = users;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain chain
    ) throws ServletException, IOException {
        var session = request.getSession(false);
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (
            session != null &&
            auth != null &&
            session.getAttribute("AUTH_PASSWORD_STAMP") instanceof String stamp
        ) {
            boolean current = users
                .findByEmail(auth.getName())
                .map(u -> u.getPassword().equals(stamp))
                .orElse(false);
            if (!current) {
                session.invalidate();
                SecurityContextHolder.clearContext();
                response.setStatus(401);
                response.setContentType("application/json;charset=UTF-8");
                response
                    .getWriter()
                    .write(
                        "{\"message\":\"ข้อมูลเข้าสู่ระบบมีการเปลี่ยนแปลง กรุณาเข้าสู่ระบบใหม่\"}"
                    );
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
