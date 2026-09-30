package com.housing.oth_nest.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SsoExchangeRequest {

    @NotBlank
    private String code;
}
