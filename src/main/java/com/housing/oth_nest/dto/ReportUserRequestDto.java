package com.housing.oth_nest.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ReportUserRequestDto {
    
    @NotNull
    private Long reporterId;
    
    @NotNull
    private Long reportedUserId;
    
    @NotNull
    private String description;
}
