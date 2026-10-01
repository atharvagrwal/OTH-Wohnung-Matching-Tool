package com.housing.oth_nest.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.stereotype.Component;

@Component
public class SessionIdentity {

    public static final String USER_ID = "housingUserId";

    public Long currentUserId(HttpServletRequest request) {
        if (request == null) {
            return null;
        }

        HttpSession session = request.getSession(false);
        if (session == null) {
            return null;
        }

        Object value = session.getAttribute(USER_ID);
        if (value instanceof Long userId) {
            return userId;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text) {
            try {
                return Long.parseLong(text);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }

        return null;
    }

    public Long requireUserId(HttpServletRequest request) {
        Long userId = currentUserId(request);
        if (userId == null) {
            throw new AuthenticationCredentialsNotFoundException("No authenticated user found in session");
        }
        return userId;
    }
}
