package com.housing.oth_nest.controller;

import com.housing.oth_nest.dto.AuthResponse;
import com.housing.oth_nest.dto.LoginRequest;
import com.housing.oth_nest.model.UserRole;
import com.housing.oth_nest.security.SessionIdentity;
import com.housing.oth_nest.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @Mock
    private SessionIdentity sessionIdentity;

    @Test
    void loginShouldStillWorkWhenShibbolethIsEnabled() {
        AuthController controller = new AuthController(authService, sessionIdentity, true);
        LoginRequest request = new LoginRequest();
        request.setEmail("max.mustermann@stud.oth-regensburg.de");
        request.setPassword("password123");

        AuthResponse expected = AuthResponse.builder()
                .userId(1L)
                .email("max.mustermann@stud.oth-regensburg.de")
                .name("Max Mustermann")
                .role(UserRole.STUDENT)
                .message("Login successful")
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(expected);

        MockHttpServletRequest httpRequest = new MockHttpServletRequest();
        MockHttpServletResponse httpResponse = new MockHttpServletResponse();

        AuthResponse actual = assertDoesNotThrow(() -> controller.login(request, httpRequest, httpResponse));

        assertEquals(expected.getUserId(), actual.getUserId());
        HttpSession session = httpRequest.getSession(false);
        assertEquals(1L, session.getAttribute(SessionIdentity.USER_ID));
    }
}
