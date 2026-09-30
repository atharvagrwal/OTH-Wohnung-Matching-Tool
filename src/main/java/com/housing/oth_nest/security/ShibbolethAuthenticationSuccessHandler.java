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
