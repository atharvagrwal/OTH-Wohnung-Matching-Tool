package com.housing.oth_nest.config;

import com.housing.oth_nest.security.ShibbolethAuthenticationSuccessHandler;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;

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
                .cors(Customizer.withDefaults())
                .securityMatcher("/saml2/**", "/login/saml2/**", "/logout/**")
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/saml2/service-provider-metadata/**").permitAll()
                        .requestMatchers("/saml2/authenticate/**", "/login/saml2/**", "/logout/**").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .saml2Metadata(metadata -> metadata.metadataUrl("/saml2/service-provider-metadata/{registrationId}"))
                .saml2Login(saml2 -> saml2
                        .successHandler(successHandler)
                        .failureHandler((request, response, exception) -> response.sendRedirect("/login?ssoError=1")))
                .saml2Logout(logout -> {});

        return http.build();
    }
}
