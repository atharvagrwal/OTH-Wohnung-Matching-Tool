package com.housing.oth_nest.dto;

import com.housing.oth_nest.model.ApartmentType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "Apartment / room details for a listing")
public class ApartmentDto {

    @NotBlank
    private String title;

    private String description;

    @NotNull
    @PositiveOrZero
    private Double price;

    private Double deposit;

    @NotBlank
    private String location;

    private Double area;
    private Double kaltmiete;
    private Double nebenkosten;
    private Double ablose;
    private Double sonstiges;

    @NotNull
    private ApartmentType apartmentType;

    private Integer totalOccupants;
    private Integer malesCount;
    private Integer femalesCount;
    private Integer diverseCount;

    private String petsPermission;
    private String smokingPermission;
    private String partiesPermission;
    private String instrumentsPermission;
    private String visitorsPermission;

    private List<String> photoUrls;
}