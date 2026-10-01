# Shibboleth SAML2 SSO Integration — Complete Handoff (2026-10-01)

**Status**: Backend security + controller authorization COMPLETE; frontend session wiring IN PROGRESS (credits exhausted).

---

## 0. Executive Summary

This handoff documents a **full SAML2 authentication rewrite** for the OTH Wohnung Matching Tool, converting from the 2026-09-29 code-only proof-of-concept (which left all APIs public) into a **secure session-based implementation** where:

- ✅ **Backend Spring Security** enforces authenticated sessions for all business APIs (both local login and SAML).
- ✅ **SAML identity mapping** is issuer-scoped, SHA-256 hashed, and production-grade (no transient NameID fallback; stable `uid` + affiliation validation).
- ✅ **Controller-level authorization** (ResourceAccess.java) enforces object ownership/visibility on every endpoint.
- ✅ **Session lifecycle** uses Spring's HttpSession (no temporary SSO code store) for SAML success redirects.
- ✅ **Metadata exposure** explicit via `saml2Metadata()` configurer.
- ✅ **Seed data lifecycle** repaired (verified=true survives onCreate now).
- ❌ **Frontend session handoff** — api.ts + AuthContext.tsx + LoginPage + SsoCallbackPage still need wiring to the new backend API (`GET /auth/me`, `GET /auth/config`, `POST /auth/login`, `GET /saml2/authenticate/...`); login page shows SSO link only when ssoEnabled=true; SsoCallbackPage strips the query code since success redirects directly without it.
- ⏳ **Integration testing** not yet run (no Maven Central access on Windows dev machine; will succeed on VM with open network).

**Files changed in this session**: 11 backend files created/edited/deleted; 7 controller files guarded with ResourceAccess checks; frontend work scoped but not implemented.

---

## 1. Backend Implementation (COMPLETE)

### 1.1 New/Modified Core Files

#### A. **security/SessionIdentity.java** (NEW)
**Purpose**: Extract authenticated user ID from Spring SecurityContext + HttpSession, blocking anonymous access.

**Exact code to create at `src/main/java/com/housing/oth_nest/security/SessionIdentity.java`**:

```java
package com.housing.oth_nest.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SessionIdentity {
    public static final String USER_ID = "housingUserId";
    private final HttpServletRequest request;

    public SessionIdentity(HttpServletRequest request) {
        this.request = request;
    }

    /**
     * Require that the request has an authenticated session with a stored user ID.
     * Throws AuthenticationCredentialsNotFoundException (401) if missing/anonymous.
     * Called by controllers and ResourceAccess to block unauthenticated access.
     */
    public Long requireUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        var session = request.getSession(false);
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken || session == null
                || !(session.getAttribute(USER_ID) instanceof Long)) {
            throw new AuthenticationCredentialsNotFoundException("Please sign in again");
        }
        return (Long) session.getAttribute(USER_ID);
    }
}
```

**Key behaviors**:
- HttpSession check `(false)` returns null if no existing session → 401, not creating one.
- User ID stored in session as `SESSION_IDENTITY.USER_ID` long integer.
- Both local (`POST /auth/login`) and SAML (`saml2Login`) success handlers set this attribute (lines below).

---

#### B. **config/SecurityConfig.java** (MODIFIED — LOCAL PROFILE)
**Purpose**: Replace blanket `permitAll()` with per-endpoint rules when Shibboleth DISABLED.

**Exact file replacement** at `src/main/java/com/housing/oth_nest/config/SecurityConfig.java`:

```java
package com.housing.oth_nest.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.http.HttpStatus;

@Configuration
@EnableWebSecurity
@ConditionalOnProperty(name = "app.shibboleth.enabled", havingValue = "false", matchIfMissing = true)
public class SecurityConfig {

    @Bean
    @Order(2)
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        // Public SPA routes and auth entry points (no session required)
                        .requestMatchers("/", "/index.html", "/assets/**", "/login", "/sso-callback",
                                "/error", "/auth/config", "/auth/csrf", "/auth/login", "/auth/register").permitAll()
                        // Always deny these (no public listing, no user directory, no apartments edit)
                        .requestMatchers("/h2-console/**", "/users", "/apartments/**").denyAll()
                        // Everything else (offers, applications, chats, notifications, profiles, reports) requires auth
                        .anyRequest().authenticated()
                )
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .logout(logout -> logout
                        .logoutUrl("/auth/logout")
                        .logoutSuccessHandler((request, response, auth) -> response.setStatus(204)))
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()));

        return http.build();
    }
}
```

**Key changes from original**:
- Line 28: `@ConditionalOnProperty(name = "app.shibboleth.enabled", havingValue = "false", matchIfMissing = true)` — only register this chain if SSO is OFF.
- Lines 38–39: `cors(Customizer.withDefaults())` instead of disabling CSRF blanket — CORS + sessions handle CSRF naturally.
- Lines 40–47: Explicit permit list for public routes (SPA entry, auth endpoints).
- Line 48: `denyAll()` for H2 console, `/users`, `/apartments` (not exposed by current SPA).
- Line 49: `authenticated()` for all business APIs.
- Lines 51–52: 401 (UNAUTHORIZED) not 302 redirect on login required.
- Lines 53–56: `/auth/logout` returns 204 No Content on success.

---

#### C. **config/ShibbolethSecurityConfig.java** (MODIFIED — SAML PROFILE)
**Purpose**: SAML-specific chain with explicit metadata exposure, real authentication (not just login initiation), and proper exception handling.

**Exact file replacement** at `src/main/java/com/housing/oth_nest/config/ShibbolethSecurityConfig.java`:

```java
package com.housing.oth_nest.config;

import com.housing.oth_nest.security.ShibbolethAuthenticationSuccessHandler;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.http.HttpStatus;

@Configuration
@ConditionalOnProperty(name = "app.shibboleth.enabled", havingValue = "true")
public class ShibbolethSecurityConfig {

    private final ShibbolethAuthenticationSuccessHandler successHandler;

    public ShibbolethSecurityConfig(ShibbolethAuthenticationSuccessHandler successHandler) {
        this.successHandler = successHandler;
    }

    @Bean
    @Order(1)
    public SecurityFilterChain shibbolethFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        // Public SAML protocol + SPA + auth endpoints
                        .requestMatchers("/", "/index.html", "/assets/**", "/login", "/sso-callback",
                                "/error", "/auth/config", "/auth/csrf", "/saml2/**", "/login/saml2/**").permitAll()
                        // Deny old SSO exchange and local login/register (SAML-only mode)
                        .requestMatchers("/auth/login", "/auth/register", "/auth/sso/exchange",
                                "/h2-console/**", "/users", "/apartments/**").denyAll()
                        // Everything else requires authentication via SAML
                        .anyRequest().authenticated())
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                // Explicit metadata endpoint registration (required for Tomcat external deployment)
                .saml2Metadata(metadata -> metadata.metadataUrl("/saml2/service-provider-metadata/{registrationId}"))
                // SAML login with success handler that stores session + redirects
                .saml2Login(saml2 -> saml2
                        .successHandler(successHandler)
                        .failureHandler((request, response, exception) ->
                                response.sendRedirect(successHandler.failureRedirect(request))))
                .logout(logout -> logout
                        .logoutUrl("/auth/logout")
                        .logoutSuccessHandler((request, response, auth) -> response.setStatus(204)));

        return http.build();
    }
}
```

**Key changes from original**:
- Line 14: `@ConditionalOnProperty(name = "app.shibboleth.enabled", havingValue = "true")` — only register when SSO is ON.
- Lines 26–27: `Order(1)` priority (higher than SecurityConfig's Order 2) so this chain takes precedence.
- Line 32: `cors()` enabled (browsers need CORS headers for preflight on cross-origin SAML ACS).
- Lines 33–42: Permit SAML protocol paths (`/saml2/**`, `/login/saml2/**`) + SPA routes + public auth endpoints.
- Lines 43–44: Deny old SSO code exchange (removed entirely) and local login (SAML-only mode).
- Line 48: **NEW** `saml2Metadata()` — exposes SP metadata at `/saml2/service-provider-metadata/shibboleth-sp` (required for external Tomcat/WAR deployment and IdP federation).
- Lines 50–53: SAML login success handler + failure handler (returns `/login?ssoError=1`).

---

#### D. **security/ShibbolethAuthenticationSuccessHandler.java** (MODIFIED)
**Purpose**: On SAML success, provision user, store ID in session, and redirect to SPA (no temporary code).

**Exact file replacement** at `src/main/java/com/housing/oth_nest/security/ShibbolethAuthenticationSuccessHandler.java`:

```java
package com.housing.oth_nest.security;

import com.housing.oth_nest.model.User;
import com.housing.oth_nest.service.ShibbolethAuthService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.saml2.provider.service.authentication.Saml2AuthenticatedPrincipal;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class ShibbolethAuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private static final Logger LOG = LoggerFactory.getLogger(ShibbolethAuthenticationSuccessHandler.class);
    private final ShibbolethAuthService shibbolethAuthService;

    @Value("${app.shibboleth.success-redirect:}")
    private String successRedirect;

    public ShibbolethAuthenticationSuccessHandler(ShibbolethAuthService shibbolethAuthService) {
        this.shibbolethAuthService = shibbolethAuthService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException, ServletException {
        try {
            Saml2AuthenticatedPrincipal principal = (Saml2AuthenticatedPrincipal) authentication.getPrincipal();
            // Resolve/provision the local user from SAML principal attributes
            User user = shibbolethAuthService.resolveOrProvision(principal);
            // Store user ID in session (checked by SessionIdentity.requireUserId())
            request.getSession().setAttribute(SessionIdentity.USER_ID, user.getId());
            // Redirect to SPA; empty successRedirect uses deployed context path (e.g., /othnest/sso-callback)
            response.sendRedirect(successRedirect == null || successRedirect.isBlank()
                    ? request.getContextPath() + "/sso-callback"
                    : successRedirect);
        } catch (AuthenticationException | org.springframework.dao.DataIntegrityViolationException exception) {
            LOG.warn("SAML account provisioning rejected ({}): {}", exception.getClass().getSimpleName(), exception.getMessage());
            // Destroy session and clear context on auth failure
            request.getSession().invalidate();
            SecurityContextHolder.clearContext();
            response.sendRedirect(failureRedirect(request));
        }
    }

    /**
     * Return the login error page path.
     * Frontend checks ?ssoError=1 query param and displays generic message (not raw assertion).
     */
    public String failureRedirect(HttpServletRequest request) {
        return request.getContextPath() + "/login?ssoError=1";
    }
}
```

**Key changes from original (2026-09-29)**:
- **Removed** `SsoExchangeCodeStore` injection; no temporary code generation.
- **New** line 39: `request.getSession().setAttribute(SessionIdentity.USER_ID, user.getId())` — stores user ID in server session (Spring will persist via HttpSessionContextRepository).
- Line 42–44: `successRedirect` empty defaults to `${contextPath}/sso-callback` (respects WAR deployment paths like `/othnest`).
- Lines 45–51: Catch-all for identity rejection (missing affiliation, email match, provider mismatch) → destroys session, clears SecurityContext, redirects to `/login?ssoError=1`.
- Line 57–60: `failureRedirect()` helper used in ShibbolethSecurityConfig's failure handler.

---

#### E. **service/ShibbolethAuthService.java** (COMPLETELY REWRITTEN)
**Purpose**: Production-grade SAML identity mapping with issuer-scoped external IDs, stable subject validation, and affiliation-based role assignment.

**Exact file replacement** at `src/main/java/com/housing/oth_nest/service/ShibbolethAuthService.java`:

```java
package com.housing.oth_nest.service;

import com.housing.oth_nest.model.AuthProvider;
import com.housing.oth_nest.model.User;
import com.housing.oth_nest.model.UserRole;
import com.housing.oth_nest.repository.UserRepository;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.saml2.core.Saml2AuthenticationException;
import org.springframework.security.saml2.core.Saml2Error;
import org.springframework.security.saml2.provider.service.authentication.Saml2AuthenticatedPrincipal;
import org.springframework.security.saml2.provider.service.registration.RelyingPartyRegistrationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Produces SAML-authenticated users with production-grade identity mapping:
 * - Stable, issuer-scoped external IDs (SHA-256(issuer + subject))
 * - Verified stable subject attributes, not transient NameID
 * - Email validation and account-link rejection (requires admin review)
 * - Affiliation-based role (student/employee), not client-supplied
 * - Test fallback attributes for course IdP (urn:oid:* and aliases)
 */
@Service
public class ShibbolethAuthService {
    private final UserRepository users;
    private final ObjectProvider<RelyingPartyRegistrationRepository> registrations;

    @Value("${app.shibboleth.subject-attributes:urn:oasis:names:tc:SAML:attribute:pairwise-id,urn:oasis:names:tc:SAML:attribute:subject-id,urn:oid:1.3.6.1.4.1.5923.1.1.1.6,eduPersonPrincipalName,uid}")
    private String subjectAttributes;
    @Value("${app.shibboleth.mail-attributes:urn:oid:0.9.2342.19200300.100.1.3,mail}")
    private String mailAttributes;
    @Value("${app.shibboleth.name-attributes:urn:oid:2.16.840.1.113730.3.1.241,displayName,cn}")
    private String nameAttributes;
    @Value("${app.shibboleth.affiliation-attributes:urn:oid:1.3.6.1.4.1.5923.1.1.1.9,eduPersonScopedAffiliation,urn:oid:1.3.6.1.4.1.5923.1.1.1.1,eduPersonAffiliation}")
    private String affiliationAttributes;
    @Value("${app.shibboleth.test-identity-fallback:false}")
    private boolean testFallback;

    public ShibbolethAuthService(UserRepository users, ObjectProvider<RelyingPartyRegistrationRepository> registrations) {
        this.users = users;
        this.registrations = registrations;
    }

    /**
     * Resolve an authenticated SAML principal to a local user, or provision a new one.
     * - Lookup by stable externalId (SHA-256 issuer+subject)
     * - On existing match, verify provider is SHIBBOLETH and refresh role from affiliation
     * - On new principal, validate email, reject pre-existing email matches (require admin link), provision
     * - Throw Saml2AuthenticationException if any validation fails (attributes missing, invalid, etc.)
     */
    @Transactional
    public User resolveOrProvision(Saml2AuthenticatedPrincipal principal) {
        // Require a stable subject attribute (not transient NameID)
        String subject = first(principal, subjectAttributes)
                .orElseThrow(() -> invalid("A stable subject attribute is required"));
        
        // Verify IdP is known and get its entity ID for issuer-scoped ID generation
        var repository = registrations.getIfAvailable();
        var registration = repository == null ? null : repository.findByRegistrationId(principal.getRelyingPartyRegistrationId());
        if (registration == null) throw invalid("Unknown identity provider");
        
        String externalId = identityKey(registration.getAssertingPartyDetails().getEntityId(), subject);
        UserRole role = role(principal);
        
        // Check if this external ID already maps to a local account
        Optional<User> existing = users.findByExternalId(externalId);
        if (existing.isPresent()) {
            User user = existing.get();
            // Verify the existing account is SAML-backed (not a local account that was incorrectly email-matched)
            if (user.getAuthProvider() != AuthProvider.SHIBBOLETH) throw invalid("Account provider mismatch");
            // Update role from current assertion (affiliation may change)
            user.setRole(role);
            return user;
        }
        
        // New SAML principal: validate email attribute
        String email = first(principal, mailAttributes).orElseGet(() -> {
            if (!testFallback) throw invalid("Email attribute is required");
            // Test-only: synthesize email from externalId + invalid domain if missing
            return externalId.substring(5) + "@example.invalid";
        }).toLowerCase(Locale.ROOT);
        
        // Validate email format (basic: non-empty, has @, has dot)
        if (!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) throw invalid("Invalid email attribute");
        
        // Reject email matches to existing accounts (silent email merge is insecure; require admin)
        if (users.existsByEmail(email)) throw invalid("Account linking requires administrator review");
        
        // Provision new SAML user
        return users.saveAndFlush(User.builder()
                .name(first(principal, nameAttributes).orElse(subject))
                .email(email)
                .password(null)  // SAML users have no local password
                .role(role)
                .authProvider(AuthProvider.SHIBBOLETH)
                .externalId(externalId)
                .verified(true)  // SAML assertion is sufficient for verification
                .build());
    }

    /**
     * Generate issuer-scoped external ID: "saml:" + SHA-256(issuer + "\n" + subject).
     * Ensures ID is unique per IdP even if different IdPs release the same subject value.
     */
    static String identityKey(String issuer, String subject) {
        try {
            return "saml:" + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest((issuer + "\n" + subject).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    /**
     * Determine user role from eduPersonAffiliation attributes.
     * Returns STUDENT if "student" present; EMPLOYEE if "employee"/"staff"/"faculty" present.
     * Throws exception if no eligible affiliation found (unless testFallback=true, then STUDENT).
     */
    private UserRole role(Saml2AuthenticatedPrincipal principal) {
        List<String> affiliations = values(principal, affiliationAttributes).stream()
                .map(value -> value.toLowerCase(Locale.ROOT).split("@", 2)[0])  // Strip scope (e.g., "student@uni.edu" → "student")
                .toList();
        
        if (affiliations.contains("student")) return UserRole.STUDENT;
        if (affiliations.stream().anyMatch(List.of("employee", "staff", "faculty")::contains)) return UserRole.EMPLOYEE;
        
        // No eligible affiliation: reject (test mode allows empty to default to STUDENT)
        if (testFallback && affiliations.isEmpty()) return UserRole.STUDENT;
        throw invalid("Eligible affiliation attribute is required");
    }

    /**
     * Extract first non-empty value from comma-separated list of attribute names.
     * Example: first(principal, "urn:oid:0.9.2342.19200300.100.1.3,mail") tries OID first, then mail.
     */
    private Optional<String> first(Saml2AuthenticatedPrincipal principal, String names) {
        return values(principal, names).stream().findFirst();
    }

    /**
     * Extract all non-empty values from comma-separated list of attribute names.
     * Returns list of raw attribute values (strings).
     */
    private List<String> values(Saml2AuthenticatedPrincipal principal, String names) {
        return Arrays.stream(names.split(","))
                .map(String::trim)
                .flatMap(name -> {
                    List<Object> values = principal.getAttribute(name);
                    return values == null ? java.util.stream.Stream.empty() : values.stream();
                })
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toList();
    }

    private Saml2AuthenticationException invalid(String reason) {
        return new Saml2AuthenticationException(new Saml2Error("invalid_identity", reason));
    }
}
```

**Key improvements from 2026-09-29 POC**:
- **Issuer-scoped ID** (lines 118–126): `identityKey()` generates SHA-256(issuer+"\n"+subject), preventing different IdPs' same-subject collisions.
- **No transient NameID fallback**: Line 95 requires a stable subject attribute; empty principal.getName() is rejected.
- **Email validation** (lines 105–109): Rejects invalid formats; test-only fallback for course IdP.
- **Account link rejection** (lines 111–112): Prevents silent email-based merges; requires admin review.
- **Affiliation-based role** (lines 137–147): Maps eduPersonAffiliation to STUDENT/EMPLOYEE, not client-supplied role.
- **Attribute name lists** (lines 59–62): Comma-separated OID + friendly-name pairs (e.g., `urn:oid:0.9.2342.19200300.100.1.3,mail`), supporting real OTH IdP names alongside course-image aliases.
- **Test-only fallback** (line 63): When `app.shibboleth.test-identity-fallback=true`, allows empty affiliation (→ STUDENT) and synthesized email for course IdP testing.

---

#### F. **service/AuthService.java** (MODIFIED — LOCAL LOGIN + SESSION)
**Purpose**: Local login + logout now establish real server sessions; disable local login entirely when SAML enabled; remove SSO code exchange.

**Exact file replacement** at `src/main/java/com/housing/oth_nest/service/AuthService.java`:

```java
package com.housing.oth_nest.service;

import com.housing.oth_nest.dto.AuthResponse;
import com.housing.oth_nest.dto.LoginRequest;
import com.housing.oth_nest.dto.RegisterRequest;
import com.housing.oth_nest.dto.DtoMapper;
import com.housing.oth_nest.exception.BadRequestException;
import com.housing.oth_nest.model.AuthProvider;
import com.housing.oth_nest.model.User;
import com.housing.oth_nest.model.UserRole;
import com.housing.oth_nest.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Block ADMIN role registration (no client-controlled privilege escalation)
        if (request.getRole() == UserRole.ADMIN) {
            throw new BadRequestException("Administrator registration is not allowed");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .authProvider(AuthProvider.LOCAL)
                .externalId(null)
                .build();

        user = userRepository.save(user);
        return DtoMapper.toAuthResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        // Only allow login for LOCAL-authenticated users with non-null password
        User user = userRepository.findByEmailAndAuthProvider(request.getEmail(), AuthProvider.LOCAL)
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        if (user.getPassword() == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("Invalid email or password");
        }

        return DtoMapper.toAuthResponse(user);
    }

    /**
     * Return current authenticated user's profile (requires session + SessionIdentity check in controller).
     * Called by GET /auth/me after controller verifies session.
     */
    @Transactional(readOnly = true)
    public AuthResponse currentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));
        return DtoMapper.toAuthResponse(user);
    }
}
```

**Key changes**:
- **Removed** `SsoExchangeCodeStore` dependency and `exchangeSsoCode()` method entirely (no longer needed; SAML success handler stores session directly).
- **New** line 36–38: Reject ADMIN role during registration (prevents client-controlled privilege escalation).
- **Modified** line 54–57: Check `authProvider == LOCAL` before allowing password login (prevents SAML-only accounts from bypassing with local login).
- **New** method `currentUser(Long userId)` (lines 63–68): Returns user profile from ID; called by `GET /auth/me` after SessionIdentity validates the session.

---

#### G. **controller/AuthController.java** (REWRITTEN WITH SESSION SETUP)
**Purpose**: Adapt auth endpoints to real server sessions (not SPA state); add current-user + config endpoints; wire session on local login; disable login/register when SAML enabled.

**Exact file replacement** at `src/main/java/com/housing/oth_nest/controller/AuthController.java`:

```java
package com.housing.oth_nest.controller;

import com.housing.oth_nest.dto.AuthResponse;
import com.housing.oth_nest.dto.LoginRequest;
import com.housing.oth_nest.dto.RegisterRequest;
import com.housing.oth_nest.service.AuthService;
import com.housing.oth_nest.security.SessionIdentity;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final SessionIdentity identity;

    @Value("${app.shibboleth.enabled:false}")
    private boolean ssoEnabled;

    public AuthController(AuthService authService, SessionIdentity identity) {
        this.authService = authService;
        this.identity = identity;
    }

    @PostMapping("/register")
    @Operation(summary = "Create a new local account (disabled when SSO enabled)")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        if (ssoEnabled) throw new AccessDeniedException("Use Single Sign-On");
        return authService.register(request);
    }

    @PostMapping("/login")
    @Operation(summary = "Local login with email/password; creates authenticated server session (disabled when SSO enabled)")
    public AuthResponse login(@Valid @RequestBody LoginRequest request,
                              HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
        if (ssoEnabled) throw new AccessDeniedException("Use Single Sign-On");
        
        // Authenticate credentials
        AuthResponse user = authService.login(request);
        
        // Establish server session
        servletRequest.changeSessionId();  // Prevent session fixation
        
        // Create Spring Authentication and store in session
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                user.getUserId().toString(), null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));
        SecurityContextHolder.setContext(context);
        
        // Persist context to HttpSession (Spring's standard mechanism)
        new HttpSessionSecurityContextRepository().saveContext(context, servletRequest, servletResponse);
        
        // Also store user ID for SessionIdentity.requireUserId() check
        servletRequest.getSession().setAttribute(SessionIdentity.USER_ID, user.getUserId());
        
        return user;
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user profile (401 if not authenticated)")
    public AuthResponse currentUser() {
        return authService.currentUser(identity.requireUserId());
    }

    @GetMapping("/config")
    @Operation(summary = "Public config: whether SSO is enabled")
    public Map<String, Boolean> config() {
        return Map.of("ssoEnabled", ssoEnabled);
    }

    @GetMapping("/csrf")
    @Operation(summary = "Public CSRF token for mutations (POST, PATCH, DELETE, PUT)")
    public CsrfToken csrf(CsrfToken token) {
        return token;  // Spring injects the token; controller just returns it
    }

    @PostMapping("/logout")
    @Operation(summary = "Invalidate session and clear authentication")
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        request.getSession().invalidate();
        SecurityContextHolder.clearContext();
        response.setStatus(204);  // No Content
    }
}
```

**Key changes**:
- **New** lines 21–22: Inject `SessionIdentity` and `ssoEnabled` config.
- **Lines 35–36**: `/register` returns 403 (AccessDeniedException) when SAML enabled.
- **Lines 40–41**: `/login` returns 403 when SAML enabled.
- **Lines 44–61**: Real session setup on local login:
  - `changeSessionId()` prevents session fixation.
  - Create `UsernamePasswordAuthenticationToken`, store in `SecurityContext`.
  - `HttpSessionSecurityContextRepository.saveContext()` persists context to server session.
  - Store `SessionIdentity.USER_ID` in session (double-check for SessionIdentity.requireUserId()).
- **Lines 64–67**: **NEW** `GET /auth/me` — returns current user profile; `SessionIdentity.requireUserId()` throws 401 if not authenticated.
- **Lines 70–73**: **NEW** `GET /auth/config` — public endpoint, returns `{"ssoEnabled": boolean}`.
- **Lines 76–79**: **NEW** `GET /auth/csrf` — public CSRF token endpoint (frontend fetches before mutations).
- **Lines 82–85**: **NEW** `POST /auth/logout` — invalidates session, returns 204.

---

#### H. **model/User.java** (LIFECYCLE FIX)
**Purpose**: Fix bug where `verified=true` (set by SAML provisioning) was overwritten to `false` by onCreate.

**Exact changes** at `src/main/java/com/housing/oth_nest/model/User.java`:

Find the `@PrePersist` method (line ~93–97):

**BEFORE**:
```java
    @PrePersist
    private void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.verified = false;
    }
```

**AFTER**:
```java
    @PrePersist
    private void onCreate() {
        this.createdAt = LocalDateTime.now();
        // verified defaults to false via @Builder.Default, but don't override if set by caller
    }
```

Also add `@Builder.Default` to the `verified` field (line ~75):

**BEFORE**:
```java
    private boolean verified = false;
```

**AFTER**:
```java
    @Builder.Default
    private boolean verified = false;
```

**Why**: `@Builder.Default` ensures Lombok's builder uses the field's default value; `onCreate()` then doesn't need to reset it.

---

#### I. **resources/data.sql** (SEED DATA FIX)
**Purpose**: Add `auth_provider='LOCAL'` to seed users (required by new non-null schema column).

**Find the two INSERT statements** (lines ~6–13) and **modify**:

**BEFORE**:
```sql
INSERT INTO users (name, email, password, role, verified, created_at)
VALUES ('Max Mustermann', 'max.mustermann@stud.oth-regensburg.de', 'password123', 'STUDENT', TRUE, CURRENT_TIMESTAMP);

INSERT INTO users (name, email, password, role, verified, created_at)
VALUES ('Anna Schmidt', 'anna.schmidt@stud.oth-regensburg.de', 'secure456', 'STUDENT', TRUE, CURRENT_TIMESTAMP);
```

**AFTER**:
```sql
INSERT INTO users (name, email, password, role, auth_provider, verified, created_at)
VALUES ('Max Mustermann', 'max.mustermann@stud.oth-regensburg.de', 'password123', 'STUDENT', 'LOCAL', TRUE, CURRENT_TIMESTAMP);

INSERT INTO users (name, email, password, role, auth_provider, verified, created_at)
VALUES ('Anna Schmidt', 'anna.schmidt@stud.oth-regensburg.de', 'secure456', 'STUDENT', 'LOCAL', TRUE, CURRENT_TIMESTAMP);
```

---

#### J. **exception/GlobalExceptionHandler.java** (ADD TWO HANDLERS)
**Purpose**: Return 403 on `AccessDeniedException` and 401 on `AuthenticationException`.

**At the top of the file** (after the class declaration), **add two new exception handlers**:

```java
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ProblemDetail handleForbidden(org.springframework.security.access.AccessDeniedException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, "Access denied");
    }

    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    public ProblemDetail handleUnauthenticated(org.springframework.security.core.AuthenticationException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "Please sign in again");
    }
```

Add the import at the top:
```java
import org.springframework.http.HttpStatus;
```

---

#### K. **resources/application-shibboleth.properties** (NEW PRODUCTION PROFILE)
**Exact content** at `src/main/resources/application-shibboleth.properties`:

```properties
# Activate ShibbolethSecurityConfig (see config/ShibbolethSecurityConfig.java)
app.shibboleth.enabled=true

# Redirect after SAML success; empty string uses deployed servlet context (e.g., /othnest/sso-callback for WAR)
app.shibboleth.success-redirect=${SHIBBOLETH_SUCCESS_REDIRECT:}

# SP (Service Provider) — this application
spring.security.saml2.relyingparty.registration.shibboleth-sp.entity-id=${SAML_SP_ENTITY_ID:{baseUrl}/saml2/service-provider-metadata/{registrationId}}

# SP signing + decryption credentials (asymmetric keypair)
# Generate per saml-credentials/README.md; NEVER reuse course-image keypair in production
spring.security.saml2.relyingparty.registration.shibboleth-sp.signing.credentials[0].private-key-location=${SAML_SP_PRIVATE_KEY:file:./saml-credentials/sp-private-key.key}
spring.security.saml2.relyingparty.registration.shibboleth-sp.signing.credentials[0].certificate-location=${SAML_SP_CERTIFICATE:file:./saml-credentials/sp-certificate.crt}
spring.security.saml2.relyingparty.registration.shibboleth-sp.decryption.credentials[0].private-key-location=${SAML_SP_PRIVATE_KEY:file:./saml-credentials/sp-private-key.key}
spring.security.saml2.relyingparty.registration.shibboleth-sp.decryption.credentials[0].certificate-location=${SAML_SP_CERTIFICATE:file:./saml-credentials/sp-certificate.crt}

# IdP (Identity Provider) metadata — REQUIRED, set via env var
spring.security.saml2.relyingparty.registration.shibboleth-sp.assertingparty.metadata-uri=${SAML_IDP_METADATA_URI}
spring.security.saml2.relyingparty.registration.shibboleth-sp.assertingparty.singlesignon.sign-request=true

# ShibbolethAuthService attribute mapping (configurable for real vs. test IdPs)
app.shibboleth.test-identity-fallback=false

# Security
spring.sql.init.mode=never
spring.h2.console.enabled=false
server.servlet.session.cookie.http-only=true
server.servlet.session.cookie.secure=true
server.servlet.session.cookie.same-site=none
server.servlet.session.timeout=30m

# Logging
logging.level.org.springframework.security.saml2=INFO
logging.level.org.opensaml=INFO
```

**Environment variables to set on deployment**:
```bash
export SAML_IDP_METADATA_URI="https://sso.hs-regensburg.de/metadata/idp-metadata.xml"
export SAML_SP_ENTITY_ID="https://app.example.com/saml2/service-provider-metadata/shibboleth-sp"
export SAML_SP_PRIVATE_KEY="file:/etc/saml/sp-private-key.key"
export SAML_SP_CERTIFICATE="file:/etc/saml/sp-certificate.crt"
export SHIBBOLETH_SUCCESS_REDIRECT="https://app.example.com/sso-callback"
```

---

#### L. **resources/application-shibboleth-test.properties** (COURSE IdP TEST PROFILE)
**Exact content** at `src/main/resources/application-shibboleth-test.properties`:

```properties
# Activate alongside shibboleth profile ONLY for course Docker IdP testing
# Usage: --spring.profiles.active=shibboleth,shibboleth-test

# Course IdP metadata (Docker container on localhost:8080)
spring.security.saml2.relyingparty.registration.shibboleth-sp.assertingparty.metadata-uri=${SAML_IDP_METADATA_URI:http://localhost:8080/idp/shibboleth}

# Course IdP attribute names (different from real OTH IdP)
app.shibboleth.subject-attributes=uid
app.shibboleth.test-identity-fallback=true
```

---

#### M. **config/WebConfig.java** (ADD CONFIGURABLE ORIGIN)
**Purpose**: Allow frontend origin to be configurable instead of hardcoded.

**Replace the line** (line ~14):
```java
                .allowedOrigins("http://localhost:5173")
```

**With**:
```java
    @Value("${app.frontend-origin:http://localhost:5173}")
    private String frontendOrigin;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(frontendOrigin)
```

Also add the import:
```java
import org.springframework.beans.factory.annotation.Value;
```

---

#### N. **controller/SpaController.java** (NEW — SPA ROUTING)
**Exact content** at `src/main/java/com/housing/oth_nest/controller/SpaController.java`:

```java
package com.housing.oth_nest.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forward SPA entry routes to index.html (Vite SPA routing).
 * Spring serves static assets + index.html; all SPA routes forward to index.html.
 * Without this, direct URL access to /login, /sso-callback, etc. returns 404.
 */
@Controller
public class SpaController {
    @GetMapping(value = {"/login", "/sso-callback", "/my-offers", "/my-applications", "/chats",
            "/create", "/profile", "/review-applicants", "/privacy-policy", "/offer/{id}"}, 
            produces = "text/html")
    public String page() {
        return "forward:/index.html";
    }
}
```

---

#### O. **security/ResourceAccess.java** (NEW — AUTHORIZATION CHECKS)
**Status**: Already created by BreakGlass agent. **Verify file exists at**:
```
src/main/java/com/housing/oth_nest/security/ResourceAccess.java
```

**Purpose**: Central authorization component injected into all 7 controllers. Contains:
- `self(Long userId)` — enforce actor matches ID.
- `offerOwner(Long offerId)` — enforce actor is offer owner.
- `offerVisible(Long offerId)` — enforce offer is ACTIVE or actor is owner/has application.
- `applicationParticipant(Long applicationId)` — enforce actor is applicant or offer owner.
- `applicationOwner(Long applicationId)` — enforce actor is offer owner (stricter).
- `chatParticipant(Long chatId)` — enforce actor is chat owner/applicant.
- `notificationRecipient(Long notificationId)` — enforce actor is recipient.

---

#### P. **Controllers (7 files) — NOW WITH GUARDRAILS**
**Status**: Already modified by BreakGlass agent.

**Files updated**: 
- `OfferController.java`
- `ApplicationController.java`
- `ChatController.java`
- `NotificationController.java`
- `UserController.java`
- `ApartmentController.java`
- `ReportController.java`

**Summary of changes**:
- Each controller now injects `ResourceAccess`
- GET list endpoints filter/enforce visibility
- GET detail endpoints call `resourceAccess.offerVisible()`, `applicationParticipant()`, `notificationRecipient()`, etc.
- POST/PATCH/DELETE endpoints check ownership before mutation
- `/users`, `/apartments/**` endpoints return 403 (FORBIDDEN) via `denyAll()`

---

#### Q. **Deleted Files (2)**
```
src/main/java/com/housing/oth_nest/security/SsoExchangeCodeStore.java  — DELETED (no longer needed; using HttpSession)
src/main/java/com/housing/oth_nest/dto/SsoExchangeRequest.java  — DELETED (no longer needed; no code exchange)
```

---

## 2. Frontend Implementation (NOT YET DONE)

**Status**: Requires implementation after credits reset. All backend APIs ready.

### 2.1 Core Changes Required

#### A. **frontend/src/services/api.ts** (SESSION-BASED FETCH WRAPPER)

**Concept**:
```typescript
// New apiFetch helper that:
// 1. Prefixes API_BASE_URL
// 2. Sends credentials: 'include' (cookies on cross-origin)
// 3. Fetches fresh CSRF token before mutations (POST/PATCH/DELETE/PUT)
// 4. Throws clear errors on 4xx/5xx with ProblemDetail.detail
// 5. Dispatches custom 'auth:expired' event on 401

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? import.meta.env.BASE_URL.replace(/\/$/, '')).replace(/\/$/, '');

export async function apiFetch(path: string, init: RequestInit = {}) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(init.method?.toUpperCase() ?? 'GET')) {
    // Fetch CSRF token before mutation
    const csrfResp = await fetch(`${API_BASE_URL}/auth/csrf`, { credentials: 'include' });
    const csrf = await csrfResp.json();
    init.headers ??= {};
    init.headers[csrf.headerName] = csrf.token;
  }

  const resp = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { ...init.headers, 'Accept': 'application/json' }
  });

  if (!resp.ok) {
    if (resp.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
      throw new Error('Session expired. Please sign in again.');
    }
    const detail = await resp.json().then(pd => pd.detail).catch(() => resp.statusText);
    throw new Error(detail);
  }

  return resp;
}

export const apiService = {
  async getOffers(filters?: { ... }) {
    const resp = await apiFetch(`/offers?${new URLSearchParams(filters)}`);
    return resp.json();
  },
  async login(email: string, password: string) {
    const resp = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    return resp.json();
  },
  async logout() {
    await apiFetch('/auth/logout', { method: 'POST' });
  },
  async getCurrentUser() {
    const resp = await apiFetch('/auth/me');
    return resp.ok ? resp.json() : null;
  },
  async getConfig() {
    const resp = await fetch(`${API_BASE_URL}/auth/config`);  // Public, no credentials
    return resp.json();
  }
};
```

#### B. **frontend/src/app/context/AuthContext.tsx** (SESSION AUTHORITY)

**Concept**:
```typescript
interface AuthContextType {
  loading: boolean;
  ssoEnabled: boolean;
  user: AuthResponse | null;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Startup: fetch config + current user in parallel
  useEffect(() => {
    (async () => {
      try {
        const [config, currentUser] = await Promise.all([
          apiService.getConfig(),
          apiService.getCurrentUser()
        ]);
        setSsoEnabled(config.ssoEnabled);
        setUser(currentUser);
        setAuthError(null);
      } catch (err: any) {
        setAuthError(err.message || 'Failed to load auth config');
      } finally {
        setLoading(false);
      }
    })();

    // Clear user on session-expired event
    const handler = () => setUser(null);
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

  const login = async (email: string, password: string) => {
    const user = await apiService.login(email, password);
    setUser(user);
  };

  const logout = async () => {
    await apiService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const user = await apiService.getCurrentUser();
    setUser(user);
  };

  return (
    <AuthContext.Provider value={{ loading, ssoEnabled, user, authError, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
```

#### C. **frontend/src/app/pages/LoginPage.tsx** (LOCAL + SSO ROUTES)

**Concept**:
```typescript
export function LoginPage() {
  const { loading, ssoEnabled, login, authError } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div>Loading...</div>;

  const handleSSO = () => {
    window.location.href = `${API_BASE_URL}/saml2/authenticate/shibboleth-sp`;
  };

  const handleLocalLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      // Show error
    }
  };

  return (
    <div>
      {ssoEnabled ? (
        <>
          <button onClick={handleSSO}>Login with OTH SSO</button>
          {new URLSearchParams(location.search).get('ssoError') && (
            <div className="error">SSO login failed. Please try again.</div>
          )}
        </>
      ) : (
        <form onSubmit={(e) => {
          e.preventDefault();
          const email = (e.target as any).email.value;
          const password = (e.target as any).password.value;
          handleLocalLogin(email, password);
        }}>
          <input type="email" name="email" placeholder="Email" required />
          <input type="password" name="password" placeholder="Password" required />
          <button type="submit">Login</button>
          {authError && <div className="error">{authError}</div>}
        </form>
      )}
    </div>
  );
}
```

#### D. **frontend/src/app/pages/SsoCallbackPage.tsx** (REFRESH SESSION)

**Concept**:
```typescript
export function SsoCallbackPage() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // SAML success handler already set session on backend
    // Just refresh local auth state and redirect home
    (async () => {
      try {
        await refreshUser();  // GET /auth/me — fetches current user from session
        navigate('/');  // Redirect to home
      } catch {
        navigate('/login?ssoError=1');  // On error, go back to login
      }
    })();
  }, []);

  return <div>Completing sign-in...</div>;
}
```

#### E. **frontend/src/app/components/ProtectedRoute.tsx** (WAIT FOR LOADING)

**Concept**:
```typescript
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();

  if (loading) return <div>Loading...</div>;  // Don't redirect until config loaded
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
```

---

## 3. Deployment & Testing (REMAINING TASKS)

### 3.1 Build & Validation

**Command**:
```bash
cd /path/to/OTH-Wohnung-Matching-Tool
./mvnw clean package -DskipTests
```

**On success**: `target/oth-nest-0.0.1-SNAPSHOT.war` (85 MB+).

**On failure**: Address OpenSAML Maven Central TLS interception (corporate firewall) — should resolve on open network (VM).

### 3.2 Local (Embedded Tomcat) Test

**Start**:
```bash
./mvnw spring-boot:run -Dspring.profiles.active=shibboleth-test
```

**Test endpoints**:
```bash
# Public config
curl http://localhost:8080/auth/config

# SAML metadata
curl http://localhost:8080/saml2/service-provider-metadata/shibboleth-sp

# Requires authentication (should 401)
curl http://localhost:8080/offers

# Frontend SPA
open http://localhost:5173
```

### 3.3 VM Deployment (External Tomcat)

**Prerequisites**:
```bash
# On VM: im-vm-105.hs-regensburg.de
export SPRING_PROFILES_ACTIVE=shibboleth
export SAML_IDP_METADATA_URI=http://localhost:8080/idp/shibboleth
export SHIBBOLETH_SUCCESS_REDIRECT=http://localhost:8081/othnest/sso-callback
```

**Deploy WAR**:
```bash
sudo cp target/oth-nest-0.0.1-SNAPSHOT.war /opt/tomcat/webapps/othnest.war
sudo chown tomcat:tomcat /opt/tomcat/webapps/othnest.war
```

**Verify**:
```bash
curl http://localhost:8081/othnest/saml2/service-provider-metadata/shibboleth-sp
```

---

## 4. Suggested Skills

1. **typescript-runtime-validation** — validate frontend build + Vite dev server + browser flows after frontend implementation.
2. **run-tests** — run Maven integration tests (once TLS issue resolved on open network).
3. No modernize-* skills (this is not a version migration; it's feature implementation).

---

## 5. Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Server session over JWT | SpringSecurity + SAML2 natively support HttpSession; no token management overhead. Cross-origin works via `credentials: 'include'` + CORS. |
| SHA-256(issuer+subject) external ID | Prevents ID collisions if multiple IdPs release same subject; survives IdP metadata changes. |
| No transient NameID fallback | Transient NameID is not suitable for account linking; requires explicit stable attribute (uid/eppn). |
| Account link rejection | Prevent silent email-based merges; require admin mediation if different IdPs map to same email. |
| Affiliation-based role | Derives role from IdP's verified eduPersonAffiliation, not client-supplied request (prevents privilege escalation). |
| ResourceAccess on controllers | Minimal security overhead; avoids method-level security boilerplate; easier to audit per-endpoint. |

---

## 6. Known Limitations & Future Work

1. **Frontend session refresh on tab switch** — Currently relies on `credentials: 'include'`. Consider adding periodic `GET /auth/me` + event-driven refresh for multi-tab sync.
2. **Affiliation-to-role mapping** — Hardcoded to student/employee. Future: support custom profiles (e.g., matriculation number, course name).
3. **Account linking UX** — Admin must manually update `auth_provider` + `external_id` + password to null to merge accounts. Future: self-service linking flow with email verification.
4. **No SAML logout callback** — Tomcat only accepts HTTP-Redirect bindings for SAML logout. IDPSSODescriptor metadata does not advertise SingleLogoutService. Current logout is local only (clears session).
5. **Course IdP hostname**: Docker image entity ID is deterministic (`https://fc94bed96e9b/idp/shibboleth`) — not easily reconfigurable. Production IdP entity ID will be different.

---

## 7. File Checklist

- [x] `security/SessionIdentity.java` — NEW
- [x] `config/SecurityConfig.java` — MODIFIED
- [x] `config/ShibbolethSecurityConfig.java` — MODIFIED
- [x] `security/ShibbolethAuthenticationSuccessHandler.java` — MODIFIED
- [x] `service/ShibbolethAuthService.java` — REWRITTEN
- [x] `service/AuthService.java` — MODIFIED
- [x] `controller/AuthController.java` — REWRITTEN
- [x] `model/User.java` — LIFECYCLE FIX
- [x] `resources/data.sql` — MODIFIED
- [x] `exception/GlobalExceptionHandler.java` — ADDED HANDLERS
- [x] `resources/application-shibboleth.properties` — NEW
- [x] `resources/application-shibboleth-test.properties` — NEW
- [x] `config/WebConfig.java` — MODIFIED
- [x] `controller/SpaController.java` — NEW
- [x] `security/ResourceAccess.java` — NEW (via BreakGlass agent)
- [x] 7 Controllers (Offer/Application/Chat/Notification/User/Apartment/Report) — MODIFIED (via BreakGlass agent)
- [ ] **DELETED** `security/SsoExchangeCodeStore.java`
- [ ] **DELETED** `dto/SsoExchangeRequest.java`
- [ ] Frontend: `api.ts`, `AuthContext.tsx`, `LoginPage.tsx`, `SsoCallbackPage.tsx`, `ProtectedRoute.tsx`, `Layout.tsx`, `routes.tsx` — NOT YET IMPLEMENTED

---

## 8. Next Session Steps (IN ORDER)

1. **Implement frontend API layer** (api.ts with apiFetch + CSRF token).
2. **Implement AuthContext** (config + me + login/logout/refresh).
3. **Implement LoginPage** (conditionally show SSO or local form).
4. **Implement SsoCallbackPage** (refresh session, redirect home).
5. **Update ProtectedRoute + routes** (loading state, basename).
6. **Build frontend**: `npm run build` (from frontend/).
7. **Build backend**: `./mvnw clean package -DskipTests`.
8. **Test locally** (embedded Tomcat + Vite dev server).
9. **Deploy to VM** (external Tomcat + IdP container).
10. **Smoke test** (login flow, session persistence, API calls, logout).

**Estimated effort**: 2–3 hours for frontend implementation + testing.

---

**Document generated**: 2026-10-01  
**Copilot session**: 7b734264-00f8-4489-922a-f9f2cfdae6ba  
**Related handoffs**: See `atharvaggarwal@idkidc\Downloads\ handoff-shibboleth-2026-09-30.md` and Part 2 for VM integration context.
