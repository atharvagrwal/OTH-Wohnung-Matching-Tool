package com.housing.oth_nest.service;

import com.housing.oth_nest.model.AuthProvider;
import com.housing.oth_nest.model.User;
import com.housing.oth_nest.model.UserRole;
import com.housing.oth_nest.repository.UserRepository;
import org.springframework.security.saml2.provider.service.authentication.Saml2AuthenticatedPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class ShibbolethAuthService {

    private final UserRepository userRepository;

    public ShibbolethAuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public User resolveOrProvision(Saml2AuthenticatedPrincipal principal) {
        String subject = principal.getName();
        if (subject == null || subject.isBlank()) {
            throw new IllegalArgumentException("SAML subject is missing");
        }

        String issuer = principal.getAttributes().containsKey("issuer")
                ? principal.getAttributes().get("issuer").toString()
                : "unknown-issuer";

        String externalId = hashIdentity(issuer, subject);
        String email = firstAttribute(principal, "mail")
                .or(() -> firstAttribute(principal, "email"))
                .orElse(null);

        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("SAML email is missing or invalid");
        }

        return userRepository.findByExternalId(externalId)
                .or(() -> userRepository.findByEmail(email))
                .orElseGet(() -> provisionNewUser(externalId, email, principal));
    }

    private User provisionNewUser(String externalId, String email, Saml2AuthenticatedPrincipal principal) {
        String displayName = firstAttribute(principal, "displayName")
                .or(() -> firstAttribute(principal, "cn"))
                .orElse("OTH User");

        UserRole role = firstAttribute(principal, "eduPersonAffiliation")
                .map(value -> value.toLowerCase(Locale.ROOT))
                .filter(value -> value.contains("student") || value.contains("employee"))
                .map(value -> value.contains("student") ? UserRole.STUDENT : UserRole.EMPLOYEE)
                .orElse(UserRole.STUDENT);

        User user = User.builder()
                .name(displayName)
                .email(email)
                .password(null)
                .role(role)
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

    private String hashIdentity(String issuer, String subject) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest((issuer + "\n" + subject).getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            return issuer + ":" + subject;
        }
    }
}
