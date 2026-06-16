package com.housing.oth_nest.controller;

import com.housing.oth_nest.dto.OfferRequestDto;
import com.housing.oth_nest.dto.OfferResponseDto;
import com.housing.oth_nest.model.ApartmentType;
import com.housing.oth_nest.service.OfferService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/offers")
@Tag(name = "offer-controller", description = "Browse, search, and manage housing listings")
@CrossOrigin(origins = "http://localhost:5173")
public class OfferController {

    private final OfferService offerService;

    public OfferController(OfferService offerService) {
        this.offerService = offerService;
    }

    @GetMapping
    @Operation(summary = "Search active listings (WG-Gesucht style filters)")
    public List<OfferResponseDto> searchOffers(
            @Parameter(description = "City or district, e.g. Passau")
            @RequestParam(required = false) String location,
            @Parameter(description = "Maximum monthly rent (warm)")
            @RequestParam(required = false) Double maxPrice,
            @Parameter(description = "WG, ROOM, STUDIO, APARTMENT, SUBLET")
            @RequestParam(required = false) ApartmentType apartmentType,
            @Parameter(description = "Only active listings (default true)")
            @RequestParam(required = false) Boolean activeOnly) {
        return offerService.searchOffers(location, maxPrice, apartmentType, activeOnly);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get listing details by ID")
    public OfferResponseDto getOffer(@PathVariable Long id) {
        return offerService.getOfferById(id);
    }

    @GetMapping("/owner/{ownerId}")
    @Operation(summary = "Get all active listings by a user (my listings)")
    public List<OfferResponseDto> getOffersByOwner(@PathVariable Long ownerId) {
        return offerService.getOffersByOwner(ownerId);
    }

    @PostMapping
    @Operation(summary = "Post a new listing (apartment + offer)")
    public OfferResponseDto createOffer(@Valid @RequestBody OfferRequestDto request) {
        return offerService.createOffer(request);
    }

    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Deactivate a listing (remove from search)")
    public OfferResponseDto deactivateOffer(@PathVariable Long id) {
        return offerService.deactivateOffer(id);
    }
}
