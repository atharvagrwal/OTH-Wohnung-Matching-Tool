package com.housing.oth_nest.security;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SsoExchangeCodeStore {

    private static final Duration TTL = Duration.ofMinutes(2);

    private final Map<String, Entry> codes = new ConcurrentHashMap<>();

    public String issue(Long userId) {
        String code = UUID.randomUUID().toString();
        codes.put(code, new Entry(userId, Instant.now().plus(TTL)));
        return code;
    }

    public Optional<Long> redeem(String code) {
        Entry entry = codes.remove(code);
        if (entry == null || Instant.now().isAfter(entry.expiresAt())) {
            return Optional.empty();
        }
        return Optional.of(entry.userId());
    }

    private record Entry(Long userId, Instant expiresAt) {
    }
}
