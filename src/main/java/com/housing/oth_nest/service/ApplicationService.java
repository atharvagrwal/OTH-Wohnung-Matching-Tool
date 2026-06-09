package com.housing.oth_nest.service;

import com.housing.oth_nest.dto.ApplicationRequestDto;
import com.housing.oth_nest.dto.ApplicationResponseDto;
import com.housing.oth_nest.dto.DtoMapper;
import com.housing.oth_nest.exception.BadRequestException;
import com.housing.oth_nest.exception.ResourceNotFoundException;
import com.housing.oth_nest.model.Application;
import com.housing.oth_nest.model.Offer;
import com.housing.oth_nest.model.User;
import com.housing.oth_nest.repository.ApplicationRepository;
import com.housing.oth_nest.repository.OfferRepository;
import com.housing.oth_nest.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final OfferRepository offerRepository;
    private final UserRepository userRepository;

    public ApplicationService(
            ApplicationRepository applicationRepository,
            OfferRepository offerRepository,
            UserRepository userRepository) {
        this.applicationRepository = applicationRepository;
        this.offerRepository = offerRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public ApplicationResponseDto apply(ApplicationRequestDto request) {
        User applicant = userRepository.findById(request.getApplicantId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Applicant not found: " + request.getApplicantId()));

        Offer offer = offerRepository.findById(request.getOfferId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Offer not found: " + request.getOfferId()));

        if (!offer.isActive()) {
            throw new BadRequestException("This offer is no longer active");
        }

        if (offer.getOwner() != null && offer.getOwner().getId().equals(applicant.getId())) {
            throw new BadRequestException("You cannot apply to your own listing");
        }

        if (applicationRepository.existsByOffer_IdAndApplicant_Id(
                request.getOfferId(), request.getApplicantId())) {
            throw new BadRequestException("You have already applied to this offer");
        }

        Application application = new Application();
        application.setApplicant(applicant);
        application.setOffer(offer);
        application.setMessage(request.getMessage());

        application = applicationRepository.save(application);
        return applicationRepository.findWithDetailsById(application.getId())
                .map(DtoMapper::toApplicationResponse)
                .orElseThrow();
    }

    public ApplicationResponseDto getApplication(Long id) {
        Application application = applicationRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + id));
        return DtoMapper.toApplicationResponse(application);
    }

    public List<ApplicationResponseDto> getApplicationsForOffer(Long offerId) {
        if (!offerRepository.existsById(offerId)) {
            throw new ResourceNotFoundException("Offer not found: " + offerId);
        }
        return applicationRepository.findByOffer_Id(offerId).stream()
                .map(DtoMapper::toApplicationResponse)
                .toList();
    }

    public List<ApplicationResponseDto> getApplicationsByApplicant(Long applicantId) {
        if (!userRepository.existsById(applicantId)) {
            throw new ResourceNotFoundException("User not found: " + applicantId);
        }
        return applicationRepository.findByApplicant_Id(applicantId).stream()
                .map(DtoMapper::toApplicationResponse)
                .toList();
    }
}
