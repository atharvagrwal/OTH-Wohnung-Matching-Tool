package com.housing.oth_nest.dto;

import com.housing.oth_nest.model.ApartmentType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "Apartment / room details for a listing")
public class ApartmentDto {

    @NotBlank
    private String title;

    private String description;

    @NotNull
    @Positive
    private Double price;

    private Double deposit;

    @NotBlank
    private String location;

    @NotNull
    private ApartmentType apartmentType;

    private Integer totalOccupants;

    private List<String> photoUrls;
}
