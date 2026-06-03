package com.housing.oth_nest.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@Schema(description = "Application to a housing offer")
public class ApplicationResponseDto {

    private Long id;
    private String message;
    private LocalDateTime appliedAt;

    private Long offerId;
    private String offerTitle;

    private Long applicantId;
    private String applicantName;
    private String applicantEmail;
}
