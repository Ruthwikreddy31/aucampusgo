package com.campusgo.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    @Value("${app.rate-limit.auth-requests-per-minute:10}")
    private int authRequestsPerMinute;

    @Value("${app.rate-limit.api-requests-per-minute:120}")
    private int apiRequestsPerMinute;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/") || "OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        boolean authRoute = path.startsWith("/api/auth/");
        int limit = authRoute ? authRequestsPerMinute : apiRequestsPerMinute;
        String key = clientKey(request) + ":" + (authRoute ? "auth" : "api");

        if (!allow(key, limit)) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Too many requests. Please wait and try again.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean allow(String key, int limit) {
        long minute = Instant.now().getEpochSecond() / 60;
        Window window = windows.compute(key, (ignored, existing) -> {
            if (existing == null || existing.minute != minute) {
                return new Window(minute);
            }
            return existing;
        });
        return window.count.incrementAndGet() <= Math.max(1, limit);
    }

    private String clientKey(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static class Window {
        private final long minute;
        private final AtomicInteger count = new AtomicInteger();

        private Window(long minute) {
            this.minute = minute;
        }
    }
}
