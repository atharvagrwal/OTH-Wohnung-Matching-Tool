package com.housing.oth_nest.dto;

import com.housing.oth_nest.model.UserRole;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Schema(description = "Register a new user (WG-Gesucht style account)")
public class RegisterRequest {

    @NotBlank
    private String name;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String password;

    @NotNull
    private UserRole role;

    private String phoneNumber;
    private String bio;

    @Schema(description = "Student only: matriculation number")
    private String matriculationNumber;

    @Schema(description = "Student only: course of study")
    private String course;

    @Schema(description = "Student only: current semester")
    private Integer semester;

    @Schema(description = "Employee only: department")
    private String department;

    @Schema(description = "Employee only: job position")
    private String position;
}
