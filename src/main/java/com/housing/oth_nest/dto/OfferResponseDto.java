package com.housing.oth_nest.dto;

import com.housing.oth_nest.model.ApartmentType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@Schema(description = "Housing offer listing shown in search results")
public class OfferResponseDto {

    private Long id;
    private boolean active;
    private LocalDate availableFrom;
    private LocalDate availableUntil;
    private LocalDateTime createdAt;

    private Long apartmentId;
    private String title;
    private String description;
    private Double price;
    private Double deposit;
    private String location;
    private ApartmentType apartmentType;
    private Integer totalOccupants;
    private List<String> photoUrls;

    private Long ownerId;
    private String ownerName;
    private String ownerEmail;
}
