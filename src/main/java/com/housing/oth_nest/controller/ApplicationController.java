package com.housing.oth_nest.controller;

import com.housing.oth_nest.dto.ApplicationRequestDto;
import com.housing.oth_nest.dto.ApplicationResponseDto;
import com.housing.oth_nest.service.ApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/applications")
@Tag(name = "application-controller", description = "Apply to listings and view applications")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Apply to a listing with a message")
    public ApplicationResponseDto apply(@Valid @RequestBody ApplicationRequestDto request) {
        return applicationService.apply(request);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get application by ID")
    public ApplicationResponseDto getApplication(@PathVariable Long id) {
        return applicationService.getApplication(id);
    }

    @GetMapping("/offer/{offerId}")
    @Operation(summary = "List applications for a listing (landlord inbox)")
    public List<ApplicationResponseDto> getApplicationsForOffer(@PathVariable Long offerId) {
        return applicationService.getApplicationsForOffer(offerId);
    }

    @GetMapping("/applicant/{applicantId}")
    @Operation(summary = "List applications sent by a user")
    public List<ApplicationResponseDto> getApplicationsByApplicant(@PathVariable Long applicantId) {
        return applicationService.getApplicationsByApplicant(applicantId);
    }
}
