# Handoff: OTH-Wohnung-Matching-Tool — Shibboleth SSO Integration

**Date**: 2026-09-30
**Workspace**: `c:\Users\uik13297\source\repo\OTH-Wohnung-Matching-Tool`
**Focus of this handoff (per user request)**: exact code changes from the Shibboleth SAML2 SSO integration, plus a full repository analysis so a fresh agent/human can continue unassisted.

---

## 0. READ THIS FIRST — critical state warnings

1. **Nothing in this session is committed.** `git log` HEAD is still `515f664a` ("Merge pull request #1 from atharvagrwal/offer-creation"). Every file below — the entire Groups 1–5 feature work from earlier in this session AND the full Shibboleth integration — exists **only in the working tree**. Running `git stash`, `git checkout .`, or a careless `git reset --hard` will destroy all of it. **Commit before doing anything else.**
2. **A real VM password was pasted into this chat session in plaintext** (`im-vm-105.hs-regensburg.de`, user `standard`). It was never written to any file or memory by the agent, but it lives in this chat's history/logs. Get it rotated with ITZ/the course contact before relying on that VM for anything beyond a throwaway POC.
3. **Two repo-memory files are now stale**: `/memories/repo/architecture.md` and `/memories/repo/java-backend-exploration.md` describe the **pre-Group-1-5** codebase (e.g. they say `Offer.active: boolean` — this was replaced with an `OfferStatus` enum this session). Don't trust them for current state; this document and the live code are authoritative. (`/memories/repo/build-commands.md` and `/memories/repo/shibboleth-integration.md` ARE current and were written this session — see §2 and §4.)
4. **This dev machine cannot fully `mvn compile` right now** — see §4.6 "Known blocker" — that is a local network/TLS issue, not a code defect.

---

## 1. Repository analysis

### 1.1 Tech stack
- **Backend**: Spring Boot 3.3.5, Java 21, Maven (`mvnw`/`mvnw.cmd`), Lombok, Spring Data JPA, Spring Security, springdoc-openapi (Swagger UI), H2 (dev) / PostgreSQL (prod, opt-in profile).
- **Frontend**: React 18 + TypeScript, Vite 7, Tailwind, shadcn/ui components, react-router, Sonner toasts. Package manager is **npm** in practice (pnpm-workspace.yaml exists but pnpm isn't installed on this dev machine — see build-commands.md).
- **No JWT/session auth today** — `SecurityConfig` is `anyRequest().permitAll()` everywhere except the newly-added Shibboleth chain (§2). Auth is a custom `/auth/register` + `/auth/login` (email/bcrypt) contract, and the **frontend login was, until this session's changes, 100% mocked** (hardcoded 2 demo users, never called the backend) — see §2.4 for what changed.

### 1.2 Package/folder structure
```
src/main/java/com/housing/oth_nest/
  config/       - SecurityConfig, ShibbolethSecurityConfig (new), ReminderSchedulerConfig (new)
  controller/   - REST endpoints (Offer, Application, Auth, Chat, Notification, Report (new))
  service/      - business logic (mirrors controllers) + ShibbolethAuthService (new), EmailService (new)
  repository/   - Spring Data JPA interfaces
  model/        - JPA entities + enums (AuthProvider new, OfferStatus new)
  dto/          - request/response DTOs + DtoMapper (static mapper class)
  exception/    - BadRequestException, ResourceNotFoundException, (+1 more)
  security/     - NEW package this session: ShibbolethAuthenticationSuccessHandler, SsoExchangeCodeStore
src/main/resources/
  application.properties          - base config (mail + support email only, as of this session)
  application-postgres.properties - NEW, opt-in profile, env-var driven Postgres creds
  application-shibboleth.properties - NEW, opt-in profile, SAML config
  application.yml                 - the actual DEFAULT datasource (H2 in-memory) + data.sql seeding
  data.sql                        - seeds 2 demo users (max.mustermann@..., anna.schmidt@...)
src/test/resources/application.properties - NEW this session, forces H2 for `mvn test` regardless of profile
frontend/src/app/
  components/   - Layout, Footer (new), modals, shadcn ui/ primitives
  context/      - React Context providers: Auth, Offers, Applications, Chats, Notifications
  pages/        - one file per route
  routes.tsx    - react-router route table
frontend/src/services/api.ts - single hand-written fetch wrapper (no axios/react-query)
.scratch/<feature-group>/spec.md + issues/NN-*.md - the issue-tracker convention for this repo (see docs/agents/issue-tracker.md)
docs/adr/000N-*.md - architecture decision records for Groups 1-5 (offer status enum, closed_offer_filled status, no general offer-edit endpoint, red-flag email-only)
CONTEXT.md - domain glossary (Offer, Application, Chat, Befristet, House Rule, Red Flag, Reminder — read this for vocabulary)
```

### 1.3 Entity model highlights (current, post-session state)
- `User`: id, name, email(unique), **password (now nullable — was NOT NULL before this session)**, role (`UserRole`: STUDENT/EMPLOYEE/ADMIN), **authProvider (new enum, LOCAL/SHIBBOLETH, defaults LOCAL)**, **externalId (new, unique, nullable — Shibboleth uid)**, verified, createdAt, relations to Offer/Application/StudentProfile/EmployeeProfile.
- `Offer`: status (`OfferStatus`: ACTIVE/MANUALLY_DISABLED/FILLED/EXPIRED — replaced a plain `boolean active` this session), reminderSentAt, stayType, availableFrom/Until.
- `Application`: status (`ApplicationStatus`: PENDING/APPROVED/DECLINED/OFFERED/**CLOSED_OFFER_FILLED new**), message, declineMessage (column kept but UI path removed).
- `Chat`: 1:1 with Application, **originalApplicationMessage (new field this session)**, owner/applicant/offer refs.
- `Notification`: recipient (NOT `user` — field is literally named `recipient`), type (`NotificationType`: APPLICATION/APPROVAL/DECLINE/OFFER/**CLOSED_OFFER_FILLED, REMINDER, REMINDER_ACKNOWLEDGED — all new this session**).

### 1.4 How to build/run/test (see `/memories/repo/build-commands.md` for full detail — summarizing key facts)
- JDK 21 is installed on this machine at `C:\Users\uik13297\AppData\Local\jdks\jdk-21.0.10` (no system JAVA_HOME set — export it per-session or use the `appmod-build-java-project`/`appmod-run-tests-for-java` tools which auto-detect it).
- **Default profile = H2, zero external infra needed**: `$env:JAVA_HOME="...jdk-21.0.10"; .\mvnw.cmd spring-boot:run` → boots in ~9s, seeds `data.sql`, serves `:8080`.
- **`postgres` profile is opt-in** (`-Dspring-boot.run.profiles=postgres`), needs a real Postgres reachable — none is running on this machine/network by default.
- **`shibboleth` profile is opt-in** (`-Dspring-boot.run.profiles=shibboleth`) — see §2.
- Frontend: `cd frontend; npm install; npm run dev` → `:5173`. **Backend's `@CrossOrigin` is hardcoded to `http://localhost:5173`** — if that port is taken (stray process) and Vite falls back to 5174, CORS silently blocks everything. Always verify the dev server actually bound to 5173.
- `mvnw test` now passes standalone (H2 override in `src/test/resources/application.properties`, added this session — previously required live Postgres).

---

## 2. Shibboleth SAML2 SSO integration — full detail

### 2.1 Why this design (read before touching the code)
The tutorial ITZ/the course gave assumes one monolithic Spring Boot app serving both the SAML login *and* the protected pages. This repo is a **decoupled SPA (Vite :5173) + REST API (:8080)** — a normal session cookie from the SAML ACS response isn't visible to the SPA's `fetch()` calls without either (a) reverse-proxying both under one origin, or (b) a token handoff. **Option (b) was implemented**: after a successful SAML login, the backend issues a one-time opaque code and 302-redirects the browser to the SPA with `?ssoCode=...`; the SPA immediately trades that code for a normal `AuthResponse` via `POST /auth/sso/exchange`. This means **zero changes to the existing `AuthResponse` contract or `AuthContext` consumers** — every other page in the app is unaffected.

### 2.2 New backend files (full content)

**`src/main/java/com/housing/oth_nest/model/AuthProvider.java`**
```java
package com.housing.oth_nest.model;

public enum AuthProvider {
    LOCAL,
    SHIBBOLETH
}
```

**`src/main/java/com/housing/oth_nest/config/ShibbolethSecurityConfig.java`**
```java
package com.housing.oth_nest.config;

import com.housing.oth_nest.security.ShibbolethAuthenticationSuccessHandler;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Only active when app.shibboleth.enabled=true (the 'shibboleth' profile). Kept separate from
 * SecurityConfig so the app still starts normally for everyone else without SAML properties set.
 */
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
                .securityMatcher("/saml2/**", "/login/saml2/**", "/logout/**")
                .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                .saml2Login(saml2 -> saml2.successHandler(successHandler))
                .saml2Logout(logout -> {
                });

        return http.build();
    }
}
```
*Why `@Order(1)` + a narrow `securityMatcher`*: the pre-existing `SecurityConfig.securityFilterChain` (bumped to `@Order(2)`, see §2.3) is `anyRequest().permitAll()` — without the narrower matcher taking priority, SAML endpoints would fall through to the permit-all chain and never trigger the SAML login flow.

**`src/main/java/com/housing/oth_nest/security/SsoExchangeCodeStore.java`**
```java
package com.housing.oth_nest.security;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Bridges the backend-only SAML redirect flow to the separately-hosted React SPA: after a
 * successful Shibboleth login the SP issues a one-time code instead of relying on a shared
 * session cookie, and the SPA trades it for a normal AuthResponse via POST /auth/sso/exchange.
 * In-memory only — fine for a single instance; swap for Redis if ever scaled horizontally.
 */
@Component
public class SsoExchangeCodeStore {

    private static final Duration TTL = Duration.ofMinutes(2);

    private final Map<String, Entry> codes = new ConcurrentHashMap<>();

    public String issue(Long userId) {
        String code = UUID.randomUUID().toString();
        codes.put(code, new Entry(userId, Instant.now().plus(TTL)));
        return code;
    }

    public Optional<Long> redeem(String code) {
        Entry entry = codes.remove(code);
        if (entry == null || Instant.now().isAfter(entry.expiresAt())) {
            return Optional.empty();
        }
        return Optional.of(entry.userId());
    }

    private record Entry(Long userId, Instant expiresAt) {
    }
}
```

**`src/main/java/com/housing/oth_nest/security/ShibbolethAuthenticationSuccessHandler.java`**
```java
package com.housing.oth_nest.security;

import com.housing.oth_nest.model.User;
import com.housing.oth_nest.service.ShibbolethAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.saml2.provider.service.authentication.Saml2AuthenticatedPrincipal;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class ShibbolethAuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final ShibbolethAuthService shibbolethAuthService;
    private final SsoExchangeCodeStore codeStore;

    @Value("${app.shibboleth.success-redirect:/}")
    private String successRedirect;

    public ShibbolethAuthenticationSuccessHandler(ShibbolethAuthService shibbolethAuthService, SsoExchangeCodeStore codeStore) {
        this.shibbolethAuthService = shibbolethAuthService;
        this.codeStore = codeStore;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {
        Saml2AuthenticatedPrincipal principal = (Saml2AuthenticatedPrincipal) authentication.getPrincipal();
        User user = shibbolethAuthService.resolveOrProvision(principal);
        String code = codeStore.issue(user.getId());

        String separator = successRedirect.contains("?") ? "&" : "?";
        response.sendRedirect(successRedirect + separator + "ssoCode=" + code);
    }
}
```

**`src/main/java/com/housing/oth_nest/service/ShibbolethAuthService.java`**
```java
package com.housing.oth_nest.service;

import com.housing.oth_nest.model.AuthProvider;
import com.housing.oth_nest.model.User;
import com.housing.oth_nest.model.UserRole;
import com.housing.oth_nest.repository.UserRepository;
import org.springframework.security.saml2.provider.service.authentication.Saml2AuthenticatedPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Resolves the local User for a Shibboleth-authenticated principal, provisioning one on first
 * login (JIT provisioning). Attribute names below (uid, mail) match the sample IdP config in
 * shibboleth-Integ.md; confirm the real attribute names released by OTH's IdP before go-live.
 */
@Service
public class ShibbolethAuthService {

    private final UserRepository userRepository;

    public ShibbolethAuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public User resolveOrProvision(Saml2AuthenticatedPrincipal principal) {
        String externalId = firstAttribute(principal, "uid").orElse(principal.getName());
        String email = firstAttribute(principal, "mail").orElse(null);

        return userRepository.findByExternalId(externalId)
                .or(() -> email != null ? userRepository.findByEmail(email) : Optional.empty())
                .orElseGet(() -> provisionNewUser(externalId, email, principal));
    }

    private User provisionNewUser(String externalId, String email, Saml2AuthenticatedPrincipal principal) {
        String displayName = firstAttribute(principal, "displayName")
                .or(() -> firstAttribute(principal, "cn"))
                .orElse(externalId);

        User user = User.builder()
                .name(displayName)
                .email(email != null ? email : externalId + "@sso.oth-regensburg.de")
                .password(null)
                .role(UserRole.STUDENT) // TODO: refine once ITZ confirms which attribute carries student/employee affiliation
                .authProvider(AuthProvider.SHIBBOLETH)
                .externalId(externalId)
                .verified(true)
                .build();

        return userRepository.save(user);
    }

    private Optional<String> firstAttribute(Saml2AuthenticatedPrincipal principal, String name) {
        List<Object> values = principal.getAttribute(name);
        if (values == null || values.isEmpty() || values.get(0) == null) {
            return Optional.empty();
        }
        return Optional.of(values.get(0).toString());
    }
}
```
**⚠️ This is the #1 thing that needs real-world confirmation** — `uid`/`mail`/`displayName`/`cn` are placeholder attribute names copied from the sample IdP config in `shibboleth-Integ.md` (repo root). The real OTH IdP will release whatever ITZ configures in their `attribute-filter.xml` for our SP — **ask them explicitly** which attributes we'll get, then update the string literals in this file (3 call sites: `"uid"`, `"mail"`, `"displayName"`/`"cn"`), and also resolve the `UserRole.STUDENT` hardcode (line with the TODO) once you know which attribute distinguishes student vs. employee (likely `eduPersonAffiliation`).

**`src/main/java/com/housing/oth_nest/dto/SsoExchangeRequest.java`**
```java
package com.housing.oth_nest.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SsoExchangeRequest {

    @NotBlank
    private String code;
}
```

### 2.3 Modified backend files (exact changes)

**`pom.xml`** — 3 changes:
1. Added `<packaging>war</packaging>` right after the `<version>` tag (needed to deploy into external Tomcat).
2. Added `spring-boot-starter-tomcat` with `<scope>provided</scope>` right after `spring-boot-starter-web` (embedded Tomcat only needed for local `spring-boot:run`; excluded from the deployable WAR since the external Tomcat provides its own).
3. Added `spring-security-saml2-service-provider` dependency right after `spring-boot-starter-security`.
4. Added a `<repositories>` block (before `<build>`) pointing at `https://build.shibboleth.net/nexus/content/repositories/releases/` — **OpenSAML (a transitive dependency of #3) is not published to Maven Central**, this repo is required or the build fails with "Could not find artifact org.opensaml:opensaml-core:jar:4.3.2".

**`src/main/java/com/housing/oth_nest/OthNestApplication.java`** — full new content:
```java
package com.housing.oth_nest;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

@SpringBootApplication
public class OthNestApplication extends SpringBootServletInitializer {

	public static void main(String[] args) {
		SpringApplication.run(OthNestApplication.class, args);
	}

	// Entry point used when deployed as a WAR into an external servlet container (e.g. Tomcat)
	@Override
	protected SpringApplicationBuilder configure(SpringApplicationBuilder builder) {
		return builder.sources(OthNestApplication.class);
	}

}
```
(Was: plain `@SpringBootApplication` class with just `main()`. This is required for WAR deployment — an external Tomcat needs a `SpringBootServletInitializer` entry point since there's no embedded container to call `main()`.)

**`src/main/java/com/housing/oth_nest/config/SecurityConfig.java`** — added `@Order(2)` to the existing `@Bean public SecurityFilterChain securityFilterChain(...)` method (plus the `org.springframework.core.annotation.Order` import). No other change — this chain still does `anyRequest().permitAll()`.

**`src/main/java/com/housing/oth_nest/model/User.java`** — 2 changes:
1. `password` field: removed `@NotBlank` and `@Column(nullable = false)`, replaced with plain `@Column` (nullable), and the comment `// null for Shibboleth-provisioned accounts, which authenticate via SAML instead`.
2. Added two new fields right after the `role` field:
```java
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuthProvider authProvider = AuthProvider.LOCAL;

    // Shibboleth uid/eduPersonPrincipalName; null for locally-registered accounts
    @Column(unique = true)
    private String externalId;
```
(Note the `@Builder.Default` — without it, Lombok's `@Builder` silently ignores the field initializer and every `User.builder()...build()` call that doesn't explicitly set `.authProvider(...)` would get `null` instead of `LOCAL`.)

**`src/main/java/com/housing/oth_nest/repository/UserRepository.java`** — added one method:
```java
    Optional<User> findByExternalId(String externalId);
```

**`src/main/java/com/housing/oth_nest/service/AuthService.java`** — 3 changes:
1. Constructor now also takes `SsoExchangeCodeStore ssoExchangeCodeStore` (new field + constructor param).
2. `login()` gained a guard right after the `findByEmail` lookup, before the password check:
```java
        if (user.getAuthProvider() != AuthProvider.LOCAL || user.getPassword() == null) {
            throw new BadRequestException("This account uses OTH Single Sign-On. Please log in via SSO instead.");
        }
```
   (Prevents a local-login attempt against an SSO-provisioned account whose `password` is `null` — matching `passwordEncoder.matches(raw, null)` would otherwise throw an unhandled `IllegalArgumentException` rather than a clean 400.)
3. New method:
```java
    public AuthResponse exchangeSsoCode(String code) {
        Long userId = ssoExchangeCodeStore.redeem(code)
                .orElseThrow(() -> new BadRequestException("Invalid or expired SSO code"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));

        return DtoMapper.toAuthResponse(user, "Login successful");
    }
```

**`src/main/java/com/housing/oth_nest/controller/AuthController.java`** — added:
```java
    @PostMapping("/sso/exchange")
    @Operation(summary = "Trade a one-time Shibboleth SSO code (from the /saml2 redirect) for an AuthResponse")
    public AuthResponse exchangeSsoCode(@Valid @RequestBody SsoExchangeRequest request) {
        return authService.exchangeSsoCode(request.getCode());
    }
```
(plus the `SsoExchangeRequest` import). Endpoint: `POST /auth/sso/exchange`, body `{"code": "..."}`, returns the same `AuthResponse` shape as `/auth/login`.

**`.gitignore`** — appended:
```
### Shibboleth SP credentials (never commit real keys/certs) ###
saml-credentials/*.key
saml-credentials/*.crt
saml-credentials/*.pem
```

### 2.4 New Spring profile: `src/main/resources/application-shibboleth.properties` (full content)
```properties
# Activates ShibbolethSecurityConfig (see config/ShibbolethSecurityConfig.java)
app.shibboleth.enabled=true

# Where the SPA should be sent after a successful SAML login; the SP appends ?ssoCode=<code>
app.shibboleth.success-redirect=${SHIBBOLETH_SUCCESS_REDIRECT:http://localhost:8081/sso-callback}

# ===== Service Provider (us) =====
spring.security.saml2.relyingparty.registration.shibboleth-sp.entity-id={baseUrl}/saml2/service-provider-metadata/{registrationId}

# Generate a real keypair for this SP - do NOT reuse the shared course-image keypair beyond the throwaway POC.
# See saml-credentials/README.md for how to generate these and where to place them.
spring.security.saml2.relyingparty.registration.shibboleth-sp.signing.credentials[0].private-key-location=${SAML_SP_PRIVATE_KEY:file:./saml-credentials/sp-private-key.key}
spring.security.saml2.relyingparty.registration.shibboleth-sp.signing.credentials[0].certificate-location=${SAML_SP_CERTIFICATE:file:./saml-credentials/sp-certificate.crt}

# ===== Asserting Party (IdP) =====
# Test IdP (course Docker image) defaults shown; override via env vars for the real OTH IdP:
#   SAML_IDP_ENTITY_ID=https://sso.hs-regensburg.de/idp/shibboleth
#   SAML_IDP_METADATA_URI=https://idp.hs-regensburg.de/metadata/idp-metadata.xml  (see shibboleth-IntegMeta.xml in repo root)
spring.security.saml2.relyingparty.registration.shibboleth-sp.assertingparty.entity-id=${SAML_IDP_ENTITY_ID:https://fc94bed96e9b/idp/shibboleth}
spring.security.saml2.relyingparty.registration.shibboleth-sp.assertingparty.metadata-uri=${SAML_IDP_METADATA_URI:https://localhost:8443/idp/shibboleth}
spring.security.saml2.relyingparty.registration.shibboleth-sp.assertingparty.singlesignon.sign-request=true

logging.level.org.springframework.security.saml2=DEBUG
logging.level.org.springframework.security.web.authentication=DEBUG
logging.level.org.opensaml=DEBUG
```
All IdP/credential values are env-var overridable — nothing here needs to be hand-edited for different environments (test IdP vs real OTH IdP), just set the env vars documented in the comments.

### 2.5 `saml-credentials/` folder (new, gitignored contents)
`saml-credentials/README.md` (tracked) documents the exact `openssl` commands to generate a fresh SP keypair (PKCS#8 private key + self-signed cert), and warns explicitly: **do not reuse the shared course Docker image's keypair beyond the throwaway POC** — a key everyone in the course has is not a private key. The `.key`/`.crt`/`.pem` extensions in this folder are gitignored; only the README is tracked.

### 2.6 Frontend changes

**`frontend/src/services/api.ts`**:
- `const API_BASE_URL` → exported as `export const API_BASE_URL`.
- Added `export interface AuthResponse { userId: number; name: string; email: string; role: 'STUDENT'|'EMPLOYEE'|'ADMIN'; message: string; }`.
- Added method:
```ts
    async exchangeSsoCode(code: string): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/sso/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
        });
        if (!response.ok) throw new Error('SSO login failed or expired. Please try again.');
        return response.json();
    }
```

**`frontend/src/app/context/AuthContext.tsx`**:
- Added `completeSsoLogin: (code: string) => Promise<void>;` to the context type.
- Added implementation (maps backend `AuthResponse` → the existing frontend `User` shape; note `gender`/`dateOfBirth` aren't in `AuthResponse` yet, so they're placeholder'd — see inline comment):
```ts
  const completeSsoLogin = async (code: string) => {
    const response = await apiService.exchangeSsoCode(code);
    setUser({
      id: String(response.userId),
      email: response.email,
      name: response.name,
      gender: 'diverse',
      dateOfBirth: '',
      role: response.role === 'STUDENT' ? 'student' : 'worker',
    });
  };
```
- The rest of `AuthContext` (the mocked `login()` for the 2 demo users) is **unchanged** — local mock login and real SSO login now coexist.

**`frontend/src/app/pages/SsoCallbackPage.tsx`** (new, full file) — reads `?ssoCode=` from the URL on mount (guarded by a `useRef` so React StrictMode's double-invoke doesn't burn the one-time code twice), calls `completeSsoLogin`, navigates to `/` on success or shows a retry link on failure.

**`frontend/src/app/pages/LoginPage.tsx`** — added, after the existing password-login `<form>`:
```tsx
          {/* Full-page navigation (not fetch) - the browser must follow the SAML redirect to the IdP */}
          <a
              href={`${API_BASE_URL}/saml2/authenticate/shibboleth-sp`}
              className="block w-full text-center border border-blue-600 text-blue-600 py-3 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            Login with OTH Single Sign-On
          </a>
```
Deliberately a real `<a href>` (full browser navigation), **not** a `fetch()`/`onClick` handler — the browser has to actually follow the redirect chain to the IdP and back; an XHR/fetch call cannot do this.

**`frontend/src/app/routes.tsx`** — added, as a top-level sibling of `/login` (i.e. **outside** the `<ProtectedRoute><Layout/></ProtectedRoute>` tree):
```tsx
  {
    path: '/sso-callback',
    Component: SsoCallbackPage,
  },
```

### 2.7 Known blocker on THIS dev machine (not a code problem)
`mvn compile`/`mvn test-compile` currently fails to resolve `org.opensaml:opensaml-core:jar:4.3.2` etc. from `https://build.shibboleth.net/...` with `PKIX path building failed: unable to find valid certification path to requested target`. Maven Central resolves fine on this same machine — this points to a corporate/campus network doing TLS interception that blocks or mis-terminates TLS to that specific host, not a `pom.xml` mistake. **This should resolve itself the first time a build runs on the actual deployment VM** (assuming normal/campus internet there), and Maven caches the artifacts locally after that first success. All new Java files were verified error-free via the language server (import/type resolution), but a full `mvn compile` could not be completed here to give 100% certainty — **run `mvnw clean compile` as the very first sanity check on the VM** before anything else.

### 2.8 What's NOT done yet (remaining steps for a working end-to-end integration)
1. **Confirm real SAML attributes with ITZ** — email them (or check `doku.tid.dfn.de/de:shibsp`) asking exactly which attributes will be released to our SP (candidates: `uid`, `mail`, `eduPersonPrincipalName`, `eduPersonAffiliation`, `displayName`/`cn`, `sn`, `givenName`). Then update the 3 attribute-name string literals + the `UserRole.STUDENT` hardcode in `ShibbolethAuthService.java` (§2.2).
2. **VM setup** (course POC VM `im-vm-105.hs-regensburg.de`, credentials rotated per §0.2): install Java 17+/Docker, `docker pull` + run the course's `alixandresantana/img_shibboleth_tomcat` image (ports `8443:8443`, `8080:8080`), install a **separate local Tomcat** on the VM and change its connector port to `8081` (avoids colliding with the Docker container's `8080` mapping). Full copy-pasteable command sequence for all of this was given earlier in this chat session (not saved to a file — re-derive from `shibboleth-Integ.md` in the repo root if this chat isn't available, the commands are the same, just cleaned up from that file's corrupted asterisks).
3. **Generate a real SP keypair** on the VM (commands in `saml-credentials/README.md`), place `sp-private-key.key`/`sp-certificate.crt` in that folder (or point `SAML_SP_PRIVATE_KEY`/`SAML_SP_CERTIFICATE` env vars elsewhere).
4. **Build & deploy the WAR**: `./mvnw clean package` → `target/oth-nest-0.0.1-SNAPSHOT.war` → copy into the VM Tomcat's `webapps/` (rename to `ROOT.war` to serve at `http://localhost:8081/`) → run with `SPRING_PROFILES_ACTIVE=shibboleth` set in the Tomcat process environment (e.g. via `setenv.sh` in Tomcat's `bin/`).
5. **Register the SP with the test IdP**: the SP's auto-generated metadata is served at `GET http://localhost:8081/saml2/service-provider-metadata/shibboleth-sp` — feed that (or its cert) into the course IdP's `attribute-filter.xml`/`relying-party.xml` per `shibboleth-Integ.md`.
6. **Test the raw SP↔IdP handshake** first, without the SPA: open `http://localhost:8081/saml2/authenticate/shibboleth-sp`, log in with the test IdP's `user`/`12345678`, confirm the browser lands on `.../sso-callback?ssoCode=...`; then manually `POST /auth/sso/exchange {"code": "<that code>"}` via curl/Postman and confirm a valid `AuthResponse` JSON comes back with a newly-provisioned user.
7. **Once the real VM/IdP arrives from ITZ**: swap `SAML_IDP_ENTITY_ID`/`SAML_IDP_METADATA_URI` env vars to the real values (the real IdP metadata is already cached at `shibboleth-IntegMeta.xml` in the repo root for reference), generate a **second, separate** SP keypair (never reuse the POC one), send ITZ the new metadata URL, and re-run step 6 against production.
8. **Deploy the frontend somewhere reachable from the same origin as the backend** (or solve CORS/cookie cross-origin properly) before wiring the real "Login with OTH SSO" button end-to-end for real users — right now `app.shibboleth.success-redirect` defaults to `http://localhost:8081/sso-callback`, which assumes frontend and backend are served from the same host:port (true once the WAR + frontend build are both behind that one Tomcat; not true in the current local dev setup where they're on :8080/:5173 separately — that's fine for local dev of everything BUT the actual SSO redirect leg).

---

## 3. Feature work from earlier this session (Groups 1–5) — reference, not duplicated here

All of this is **fully specified in existing repo artifacts** — read these instead of re-deriving from scratch:
- `.scratch/offer-lifecycle/spec.md` + `.scratch/offer-lifecycle/issues/*.md` — Group 1 (OfferStatus enum, CLOSED_OFFER_FILLED, reminder scheduler, email/report feature).
- `.scratch/applications-ux/spec.md` + issues — Group 2 (3-column MyApplicationsPage, decline-modal removal, ReviewApplicantsPage).
- `.scratch/chat-ux/spec.md` + issues — Group 3 (chat UX: original-message banner, report button, closed-chat states).
- `.scratch/offer-creation/spec.md` + issues — Group 4 (befristet checkbox, house-rules cleanup).
- `.scratch/cross-cutting/spec.md` + issues — Group 5 (feed sort/filter, footer/privacy page, report-user email).
- `docs/adr/0001`–`0004` — the 4 locked architecture decisions behind Group 1/2.
- `CONTEXT.md` — domain glossary/vocabulary, read this before touching any of the above.
- `/memories/repo/build-commands.md` — verified run/test/build commands, environment quirks (JDK path, npm/vite Windows-shim gotcha, Postgres/H2 profile split), all confirmed working as of 2026-09-29.

**Status**: all of Groups 1–5 are implemented (todo list in the session showed all 9 top-level items completed) and both `mvnw test` and `npm run build` were verified green — but again, **none of it is committed** (§0.1).

---

## 4. Suggested skills for the next session

- **`agent-customization`** — if the next task involves adjusting how Copilot itself behaves for this repo (e.g. codifying the "always check `git status` before touching branches" lesson from §0.1 into a repo instructions file).
- No Java-upgrade/.NET/modernization skills apply here — this is a feature-development Spring Boot + React repo, not a migration/modernization project. Skip the `modernize-*` agent family entirely; it's for legacy migration workflows and isn't relevant.
- If asked to actually SSH/deploy to the VM: no skill covers that (it's outside the sandboxed workspace) — treat it as manual human-executed steps per §2.8, the agent should give instructions, not attempt remote execution itself (no credentials should ever be typed into chat/tools for this).
- If asked to write more Java entity/service code: no special skill needed, just follow the existing package conventions in §1.2 and the Lombok `@Builder.Default` gotcha noted in §2.3.

---

## 5. Open questions to carry forward
1. Which SAML attributes will OTH's real IdP release to our SP? (blocks finalizing `ShibbolethAuthService.java`)
2. Has the VM password been rotated yet?
3. Where will the frontend actually be deployed for the real integration (same origin as backend, or does the token-handoff design in §2.1 need a CORS/cookie rework)?
4. Is `UserRole.ADMIN` ever going to be assignable via SSO, or only STUDENT/EMPLOYEE via affiliation attribute?
5. Nothing has been committed yet this whole session — first thing to do is decide a commit strategy (one big commit vs. split by feature group vs. split Shibboleth from features) and actually commit.
