package com.housing.oth_nest.service;

import com.housing.oth_nest.dto.DtoMapper;
import com.housing.oth_nest.dto.OfferRequestDto;
import com.housing.oth_nest.dto.OfferResponseDto;
import com.housing.oth_nest.exception.ResourceNotFoundException;
import com.housing.oth_nest.model.Apartment;
import com.housing.oth_nest.model.ApartmentType;
import com.housing.oth_nest.model.Offer;
import com.housing.oth_nest.model.User;
import com.housing.oth_nest.repository.ApartmentRepository;
import com.housing.oth_nest.repository.OfferRepository;
import com.housing.oth_nest.repository.UserRepository;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class OfferService {

    private final OfferRepository offerRepository;
    private final ApartmentRepository apartmentRepository;
    private final UserRepository userRepository;

    // Define the persistent disk write storage location on your local Mac
    private final String uploadDir = "src/main/resources/static/uploads/";

    public OfferService(
            OfferRepository offerRepository,
            ApartmentRepository apartmentRepository,
            UserRepository userRepository) {
        this.offerRepository = offerRepository;
        this.apartmentRepository = apartmentRepository;
        this.userRepository = userRepository;
    }

    public List<OfferResponseDto> searchOffers(
            String location,
            Double maxPrice,
            ApartmentType apartmentType,
            Boolean activeOnly) {

        boolean active = activeOnly == null || activeOnly;

        Specification<Offer> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("apartment", JoinType.INNER);
                root.fetch("owner", JoinType.LEFT);
            }

            var apartment = root.join("apartment");

            if (active) {
                predicates.add(cb.isTrue(root.get("active")));
            }
            if (location != null && !location.isBlank()) {
                predicates.add(cb.like(
                        cb.lower(apartment.get("location")),
                        "%" + location.toLowerCase() + "%"));
            }
            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(apartment.get("price"), maxPrice));
            }
            if (apartmentType != null) {
                predicates.add(cb.equal(apartment.get("apartmentType"), apartmentType));
            }

            query.distinct(true);
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return offerRepository.findAll(spec).stream()
                .map(DtoMapper::toOfferResponse)
                .toList();
    }

    public OfferResponseDto getOfferById(Long id) {
        Offer offer = offerRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found: " + id));
        return DtoMapper.toOfferResponse(offer);
    }

    public List<OfferResponseDto> getOffersByOwner(Long ownerId) {
        if (!userRepository.existsById(ownerId)) {
            throw new ResourceNotFoundException("User not found: " + ownerId);
        }
        return offerRepository.findByOwner_IdAndActiveTrue(ownerId).stream()
                .map(DtoMapper::toOfferResponse)
                .toList();
    }

    @Transactional
    public OfferResponseDto createOffer(OfferRequestDto request, List<MultipartFile> files) {
        User owner = userRepository.findById(request.getOwnerId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Owner not found: " + request.getOwnerId()));

        Apartment apartment = DtoMapper.toApartment(request.getApartment());

        // Process binary multi-part files into static assets if present
        List<String> photoUrls = new ArrayList<>();
        if (files != null && !files.isEmpty()) {
            try {
                File directory = new File(uploadDir);
                if (!directory.exists()) {
                    directory.mkdirs(); // Generate local folders path string recursively if missing
                }

                for (MultipartFile file : files) {
                    if (!file.isEmpty()) {
                        // Secure filenames with random unique UUID markers to prevent collisions
                        String uniqueFilename = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
                        Path targetPath = Paths.get(uploadDir + uniqueFilename);

                        // Stream byte data directly onto your Mac SSD storage layer
                        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

                        // Map the path to a web accessible Tomcat URL matching our local host setup
                        photoUrls.add("http://localhost:8080/uploads/" + uniqueFilename);
                    }
                }
            } catch (IOException e) {
                throw new RuntimeException("Failed to write multipart file upload to local directory target", e);
            }
        }

        // Overwrite the image URLs tracking list inside your processed entities block
        apartment.setPhotoUrls(photoUrls);
        apartment = apartmentRepository.save(apartment);

        Offer offer = new Offer();
        offer.setApartment(apartment);
        offer.setOwner(owner);
        offer.setAvailableFrom(request.getAvailableFrom());
        offer.setAvailableUntil(request.getAvailableUntil());
        offer.setStayType(request.getStayType());
        offer.setActive(true);

        offer = offerRepository.save(offer);
        return DtoMapper.toOfferResponse(offer);
    }

    @Transactional
    public OfferResponseDto deactivateOffer(Long id) {
        Offer offer = offerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found: " + id));
        offer.setActive(false);
        return DtoMapper.toOfferResponse(offerRepository.save(offer));
    }
}