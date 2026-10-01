package com.housing.oth_nest.security;

import com.housing.oth_nest.model.AuthProvider;
import com.housing.oth_nest.model.User;
import com.housing.oth_nest.model.UserRole;
import com.housing.oth_nest.service.ShibbolethAuthService;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.saml2.provider.service.authentication.Saml2AuthenticatedPrincipal;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShibbolethAuthenticationSuccessHandlerTest {

    @Mock
    private ShibbolethAuthService shibbolethAuthService;

    private ShibbolethAuthenticationSuccessHandler handler;

    @BeforeEach
    void setUp() {
        handler = new ShibbolethAuthenticationSuccessHandler(shibbolethAuthService);
        ReflectionTestUtils.setField(handler, "successRedirect", "/sso-callback");
    }

    @Test
    void onAuthenticationSuccessStoresUserInSessionAndRedirects() throws Exception {
        User user = User.builder()
                .id(42L)
                .name("Test User")
                .email("test@oth-regensburg.de")
                .role(UserRole.STUDENT)
                .authProvider(AuthProvider.SHIBBOLETH)
                .externalId("uid-42")
                .verified(true)
                .build();

        when(shibbolethAuthService.resolveOrProvision(any())).thenReturn(user);

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        Saml2AuthenticatedPrincipal principal = Mockito.mock(Saml2AuthenticatedPrincipal.class);

        TestingAuthenticationToken authentication = new TestingAuthenticationToken(principal, null);

        handler.onAuthenticationSuccess(request, response, authentication);

        HttpSession session = request.getSession(false);
        assertNotNull(session);
        assertEquals(42L, session.getAttribute(SessionIdentity.USER_ID));
        assertEquals("/sso-callback", response.getRedirectedUrl());
    }
}
