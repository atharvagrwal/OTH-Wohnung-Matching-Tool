package com.housing.oth_nest.dto;

import com.housing.oth_nest.model.ApplicationStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ApplicationStatusUpdateDto {
    @NotNull
    private ApplicationStatus status;
    private String declineMessage;
}