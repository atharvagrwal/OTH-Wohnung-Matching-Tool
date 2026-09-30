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
                .role(UserRole.STUDENT)
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
