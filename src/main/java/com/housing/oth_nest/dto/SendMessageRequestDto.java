package com.housing.oth_nest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SendMessageRequestDto {
    @NotNull
    private Long senderId;

    @NotBlank
    private String content;
}