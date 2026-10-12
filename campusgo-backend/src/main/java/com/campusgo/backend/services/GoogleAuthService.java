package com.campusgo.backend.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class GoogleAuthService {

    @Value("${app.google.client-id:}")
    private String configuredClientId;

    @Value("${app.google.allowed-domains:anurag.edu.in}")
    private String allowedDomainsConfig;

    @Value("${app.google.allow-mock-tokens:false}")
    private boolean allowMockTokens;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Data
    @Builder
    public static class GoogleUserInfo {
        private String email;
        private String name;
        private String picture;
        private String hostedDomain; // Google Workspace 'hd' claim
        private boolean emailVerified;
    }

    /**
     * Get the set of normalized allowed domains (e.g. ["anurag.edu.in"])
     */
    public Set<String> getAllowedDomains() {
        if (allowedDomainsConfig == null || allowedDomainsConfig.isBlank()) {
            return Collections.emptySet();
        }
        return Arrays.stream(allowedDomainsConfig.split(","))
                .map(String::trim)
                .map(String::toLowerCase)
                .filter(s -> !s.isEmpty())
                .map(s -> s.startsWith("@") ? s.substring(1) : s)
                .collect(Collectors.toSet());
    }

    /**
     * Validates the Google ID token and ensures the account matches the allowed institution domain.
     */
    public GoogleUserInfo verifyAndValidateDomain(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new IllegalArgumentException("Google ID Token is missing.");
        }

        GoogleUserInfo userInfo;

        if (idToken.startsWith("mock-google-token:")) {
            if (!allowMockTokens) {
                throw new SecurityException("Mock Google tokens are disabled.");
            }
            userInfo = parseMockToken(idToken);
        } else {
            userInfo = verifyWithGoogle(idToken);
        }

        // Validate domain restriction
        validateDomainRestriction(userInfo);

        return userInfo;
    }

    private GoogleUserInfo verifyWithGoogle(String idToken) {
        try {
            RestClient restClient = RestClient.create();

            // Try Google userinfo endpoint first (for access tokens from implicit/pkce flow)
            try {
                String userinfoUrl = "https://www.googleapis.com/oauth2/v3/userinfo";
                String responseBody = restClient.get()
                        .uri(userinfoUrl)
                        .header("Authorization", "Bearer " + idToken.trim())
                        .retrieve()
                        .body(String.class);

                Map<String, Object> claims = objectMapper.readValue(responseBody, new TypeReference<Map<String, Object>>() {});
                String email = (String) claims.get("email");
                Object verifiedObj = claims.get("email_verified");
                boolean emailVerified = Boolean.TRUE.equals(verifiedObj) || "true".equalsIgnoreCase(String.valueOf(verifiedObj));

                if (email == null || email.isBlank()) {
                    throw new SecurityException("Google account did not provide an email address.");
                }
                if (!emailVerified) {
                    throw new SecurityException("Google account email is not verified.");
                }

                String name = (String) claims.get("name");
                String picture = (String) claims.get("picture");
                String hostedDomain = (String) claims.get("hd");

                return GoogleUserInfo.builder()
                        .email(email.toLowerCase().trim())
                        .name(name != null && !name.isBlank() ? name.trim() : null)
                        .picture(picture)
                        .hostedDomain(hostedDomain != null ? hostedDomain.toLowerCase().trim() : null)
                        .emailVerified(true)
                        .build();

            } catch (HttpClientErrorException userinfoEx) {
                // If userinfo fails, fall through to tokeninfo (for ID tokens)
                log.debug("userinfo endpoint failed ({}), trying tokeninfo...", userinfoEx.getStatusCode());
            }

            // Fallback: try tokeninfo for ID tokens
            String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" +
                    URLEncoder.encode(idToken.trim(), StandardCharsets.UTF_8);

            String responseBody = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(String.class);

            Map<String, Object> claims = objectMapper.readValue(responseBody, new TypeReference<Map<String, Object>>() {});

            String email = (String) claims.get("email");
            Object verifiedObj = claims.get("email_verified");
            boolean emailVerified = Boolean.TRUE.equals(verifiedObj) || "true".equalsIgnoreCase(String.valueOf(verifiedObj));

            if (email == null || email.isBlank()) {
                throw new SecurityException("Google token did not contain a valid email address.");
            }
            if (!emailVerified) {
                throw new SecurityException("Google account email is not verified.");
            }

            // Optional audience validation
            if (configuredClientId != null && !configuredClientId.isBlank()) {
                String aud = (String) claims.get("aud");
                if (aud != null && !configuredClientId.trim().equalsIgnoreCase(aud.trim())) {
                    log.warn("Audience mismatch: expected [{}] but received [{}]", configuredClientId, aud);
                    throw new SecurityException("Google token was not issued for this application.");
                }
            }

            String name = (String) claims.get("name");
            String picture = (String) claims.get("picture");
            String hostedDomain = (String) claims.get("hd");

            return GoogleUserInfo.builder()
                    .email(email.toLowerCase().trim())
                    .name(name != null && !name.isBlank() ? name.trim() : null)
                    .picture(picture)
                    .hostedDomain(hostedDomain != null ? hostedDomain.toLowerCase().trim() : null)
                    .emailVerified(true)
                    .build();

        } catch (HttpClientErrorException e) {
            log.error("Google token validation failed with status {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new SecurityException("Invalid or expired Google token. Please sign in again.");
        } catch (SecurityException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error during Google token verification", e);
            throw new SecurityException("Failed to verify Google authentication.");
        }
    }

    private GoogleUserInfo parseMockToken(String idToken) {
        String payload = idToken.substring("mock-google-token:".length());
        String[] parts = payload.split(":", 2);
        String email = parts[0].toLowerCase().trim();
        String name = parts.length > 1 && !parts[1].isBlank() ? parts[1].trim() : null;
        String domain = email.contains("@") ? email.substring(email.indexOf("@") + 1) : null;

        return GoogleUserInfo.builder()
                .email(email)
                .name(name)
                .hostedDomain(domain)
                .emailVerified(true)
                .build();
    }

    private void validateDomainRestriction(GoogleUserInfo userInfo) {
        Set<String> allowed = getAllowedDomains();
        if (allowed.isEmpty()) {
            return; // No restrictions configured
        }

        String email = userInfo.getEmail();
        String userDomain = "";
        if (email != null && email.contains("@")) {
            userDomain = email.substring(email.indexOf("@") + 1).toLowerCase().trim();
        }

        boolean domainMatches = allowed.contains(userDomain);
        boolean hdMatches = userInfo.getHostedDomain() != null && allowed.contains(userInfo.getHostedDomain().toLowerCase().trim());

        if (!domainMatches && !hdMatches) {
            String allowedListStr = String.join(", ", allowed.stream().map(d -> "@" + d).toList());
            log.warn("Access denied for Google user [{}]. Domain [{}] is not in allowed domains: {}",
                    email, userDomain, allowedListStr);
            throw new SecurityException("Access restricted: Only Google accounts from " + allowedListStr +
                    " are authorized to sign in. Your email (" + email + ") is not permitted.");
        }
    }
}
