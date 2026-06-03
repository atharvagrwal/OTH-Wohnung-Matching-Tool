package com.housing.oth_nest.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "Apply to a listing with a message (like WG-Gesucht contact)")
public class ApplicationRequestDto {

    @NotNull
    private Long applicantId;

    @NotNull
    private Long offerId;

    @NotBlank
    @Size(max = 2000)
    private String message;
}
