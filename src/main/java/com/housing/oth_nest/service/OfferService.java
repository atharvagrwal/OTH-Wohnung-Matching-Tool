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

import java.util.ArrayList;
import java.util.List;

@Service
public class OfferService {

    private final OfferRepository offerRepository;
    private final ApartmentRepository apartmentRepository;
    private final UserRepository userRepository;

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
    public OfferResponseDto createOffer(OfferRequestDto request) {
        User owner = userRepository.findById(request.getOwnerId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Owner not found: " + request.getOwnerId()));

        Apartment apartment = DtoMapper.toApartment(request.getApartment());
        apartment = apartmentRepository.save(apartment);

        Offer offer = new Offer();
        offer.setApartment(apartment);
        offer.setOwner(owner);
        offer.setAvailableFrom(request.getAvailableFrom());
        offer.setAvailableUntil(request.getAvailableUntil());
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
