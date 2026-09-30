package com.housing.oth_nest.controller;

import com.housing.oth_nest.dto.ReportUserRequestDto;
import com.housing.oth_nest.exception.BadRequestException;
import com.housing.oth_nest.exception.ResourceNotFoundException;
import com.housing.oth_nest.model.Chat;
import com.housing.oth_nest.model.User;
import com.housing.oth_nest.repository.ChatRepository;
import com.housing.oth_nest.repository.UserRepository;
import com.housing.oth_nest.service.EmailService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/report-user")
@Tag(name = "report-controller", description = "Report suspicious or inappropriate user behavior")
@CrossOrigin(origins = "http://localhost:5173")
public class ReportController {

    private final EmailService emailService;
    private final UserRepository userRepository;
    private final ChatRepository chatRepository;

    public ReportController(
            EmailService emailService,
            UserRepository userRepository,
            ChatRepository chatRepository) {
        this.emailService = emailService;
        this.userRepository = userRepository;
        this.chatRepository = chatRepository;
    }

    /**
     * POST /report-user
     * Reports a user to support via email.
     * 
     * Request body:
     * {
     *   "reportedUserId": 123,
     *   "reporterId": 456,
     *   "description": "Detailed description of the issue..."
     * }
     * 
     * Response:
     * {
     *   "success": true,
     *   "message": "Report sent to support. Thank you for helping us maintain a safe community."
     * }
     */
    @PostMapping
    @Operation(summary = "Report a user for suspicious or inappropriate behavior")
    public ResponseEntity<Map<String, Object>> reportUser(
            @Valid @RequestBody ReportUserRequestDto request) {
        
        // Validate reporter exists
        User reporter = userRepository.findById(request.getReporterId())
                .orElseThrow(() -> new ResourceNotFoundException("Reporter user not found"));

        // Validate reported user exists
        User reportedUser = userRepository.findById(request.getReportedUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Reported user not found"));

        // Validate description
        if (request.getDescription() == null || request.getDescription().trim().length() < 10) {
            throw new BadRequestException("Description must be at least 10 characters");
        }

        // Validate that reporter and reported user have an active chat
        boolean hasChatConnection = chatRepository.existsByOwner_IdAndApplicant_Id(
                request.getReporterId(), request.getReportedUserId())
                || chatRepository.existsByOwner_IdAndApplicant_Id(
                request.getReportedUserId(), request.getReporterId());
        
        if (!hasChatConnection) {
            throw new BadRequestException("You can only report users you have chatted with");
        }

        // Send email to support
        emailService.sendReportEmail(
                reporter.getName(),
                reportedUser.getName(),
                request.getDescription()
        );

        // Return success response
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Report sent to support. Thank you for helping us maintain a safe community.");

        return ResponseEntity.ok(response);
    }
}
