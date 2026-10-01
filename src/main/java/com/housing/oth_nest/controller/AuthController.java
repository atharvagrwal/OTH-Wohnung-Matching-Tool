package com.housing.oth_nest.controller;

import com.housing.oth_nest.dto.AuthResponse;
import com.housing.oth_nest.dto.LoginRequest;
import com.housing.oth_nest.dto.RegisterRequest;
import com.housing.oth_nest.security.SessionIdentity;
import com.housing.oth_nest.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@Tag(name = "auth-controller", description = "Register and login (WG-Gesucht style accounts)")
public class AuthController {

    private final AuthService authService;
    private final SessionIdentity sessionIdentity;
    private final boolean ssoEnabled;

    public AuthController(AuthService authService, SessionIdentity sessionIdentity,
                         @Value("${app.shibboleth.enabled:false}") boolean ssoEnabled) {
        this.authService = authService;
        this.sessionIdentity = sessionIdentity;
        this.ssoEnabled = ssoEnabled;
    }

    @PostMapping("/register")
    @Operation(summary = "Create a new student or employee account")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        if (ssoEnabled) {
            throw new AccessDeniedException("Local registration is disabled while Shibboleth is enabled");
        }
        return authService.register(request);
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email and password")
    public AuthResponse login(@Valid @RequestBody LoginRequest request,
                             HttpServletRequest httpRequest,
                             HttpServletResponse httpResponse) {
        // Keep the seeded demo/local accounts usable even when university SSO is enabled.
        // Shibboleth is an additional sign-in option, not a replacement for local access.
        AuthResponse response = authService.login(request);
        HttpSession session = httpRequest.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        HttpSession newSession = httpRequest.getSession(true);
        newSession.setAttribute(SessionIdentity.USER_ID, response.getUserId());

        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                response.getUserId(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + response.getRole().name()))
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        newSession.setAttribute("SPRING_SECURITY_CONTEXT", SecurityContextHolder.getContext());

        return response;
    }

    @GetMapping("/me")
    public AuthResponse me(HttpServletRequest request) {
        Long userId = sessionIdentity.requireUserId(request);
        return authService.currentUser(userId);
    }

    @GetMapping("/config")
    public Map<String, Boolean> config() {
        return Map.of("ssoEnabled", ssoEnabled);
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(HttpServletRequest request) {
        return Map.of("token", request.getSession().getId());
    }

    @PostMapping("/logout")
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        response.setStatus(HttpServletResponse.SC_NO_CONTENT);
    }
}
