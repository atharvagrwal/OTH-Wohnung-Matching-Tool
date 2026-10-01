package com.housing.oth_nest.security;

import com.housing.oth_nest.model.User;
import com.housing.oth_nest.service.ShibbolethAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.saml2.provider.service.authentication.Saml2AuthenticatedPrincipal;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class ShibbolethAuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final ShibbolethAuthService shibbolethAuthService;

    @Value("${app.shibboleth.success-redirect:/sso-callback}")
    private String successRedirect;

    public ShibbolethAuthenticationSuccessHandler(ShibbolethAuthService shibbolethAuthService) {
        this.shibbolethAuthService = shibbolethAuthService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {
        if (!(authentication.getPrincipal() instanceof Saml2AuthenticatedPrincipal principal)) {
            response.sendRedirect("/login?ssoError=1");
            return;
        }

        User user = shibbolethAuthService.resolveOrProvision(principal);
        if (user == null || user.getId() == null) {
            response.sendRedirect("/login?ssoError=1");
            return;
        }

        HttpSession session = request.getSession(true);
        session.setAttribute(SessionIdentity.USER_ID, user.getId());
        SecurityContextHolder.getContext().setAuthentication(authentication);

        String redirectTarget = successRedirect == null || successRedirect.isBlank()
                ? request.getContextPath() + "/sso-callback"
                : successRedirect;

        response.sendRedirect(redirectTarget);
    }
}
