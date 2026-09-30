package com.housing.oth_nest.config;

import com.housing.oth_nest.security.ShibbolethAuthenticationSuccessHandler;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

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
