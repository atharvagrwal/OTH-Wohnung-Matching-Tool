package com.housing.oth_nest.dto;

import com.housing.oth_nest.model.StayType;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
@Schema(description = "Create a WG-Gesucht style housing offer (apartment + availability)")
public class OfferRequestDto {

    @NotNull
    private Long ownerId;

    @NotNull
    private StayType stayType;

    @Valid
    @NotNull
    private ApartmentDto apartment;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate availableFrom;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate availableUntil;
}