package com.housing.oth_nest.service;

import com.housing.oth_nest.dto.AuthResponse;
import com.housing.oth_nest.dto.DtoMapper;
import com.housing.oth_nest.dto.LoginRequest;
import com.housing.oth_nest.dto.RegisterRequest;
import com.housing.oth_nest.exception.BadRequestException;
import com.housing.oth_nest.model.AuthProvider;
import com.housing.oth_nest.model.EmployeeProfile;
import com.housing.oth_nest.model.StudentProfile;
import com.housing.oth_nest.model.User;
import com.housing.oth_nest.model.UserRole;
import com.housing.oth_nest.repository.UserRepository;
import com.housing.oth_nest.security.SsoExchangeCodeStore;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SsoExchangeCodeStore ssoExchangeCodeStore;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, SsoExchangeCodeStore ssoExchangeCodeStore) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.ssoExchangeCodeStore = ssoExchangeCodeStore;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .phoneNumber(request.getPhoneNumber())
                .bio(request.getBio())
                .build();

        attachRoleProfile(user, request);
        user = userRepository.save(user);

        return DtoMapper.toAuthResponse(user, "Registration successful");
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        if (user.getAuthProvider() != AuthProvider.LOCAL || user.getPassword() == null) {
            throw new BadRequestException("This account uses OTH Single Sign-On. Please log in via SSO instead.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("Invalid email or password");
        }

        return DtoMapper.toAuthResponse(user, "Login successful");
    }

    public AuthResponse exchangeSsoCode(String code) {
        Long userId = ssoExchangeCodeStore.redeem(code)
                .orElseThrow(() -> new BadRequestException("Invalid or expired SSO code"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found"));

        return DtoMapper.toAuthResponse(user, "Login successful");
    }

    private void attachRoleProfile(User user, RegisterRequest request) {
        if (request.getRole() == UserRole.STUDENT) {
            StudentProfile profile = new StudentProfile();
            profile.setMatriculationNumber(request.getMatriculationNumber());
            profile.setCourse(request.getCourse());
            profile.setSemester(request.getSemester());
            profile.setUser(user);
            user.setStudentProfile(profile);
        } else if (request.getRole() == UserRole.EMPLOYEE) {
            EmployeeProfile profile = new EmployeeProfile();
            profile.setDepartment(request.getDepartment());
            profile.setPosition(request.getPosition());
            profile.setUser(user);
            user.setEmployeeProfile(profile);
        }
    }
}
