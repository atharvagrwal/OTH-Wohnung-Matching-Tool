package com.housing.oth_nest.dto;

import com.housing.oth_nest.model.*;

public final class DtoMapper {

    private DtoMapper() {
    }

    public static UserResponseDto toUserResponse(User user) {
        UserResponseDto.UserResponseDtoBuilder builder = UserResponseDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .phoneNumber(user.getPhoneNumber())
                .profilePicture(user.getProfilePicture())
                .bio(user.getBio())
                .verified(user.isVerified())
                .createdAt(user.getCreatedAt());

        if (user.getStudentProfile() != null) {
            StudentProfile sp = user.getStudentProfile();
            builder.studentProfile(StudentProfileDto.builder()
                    .matriculationNumber(sp.getMatriculationNumber())
                    .course(sp.getCourse())
                    .semester(sp.getSemester())
                    .build());
        }

        if (user.getEmployeeProfile() != null) {
            EmployeeProfile ep = user.getEmployeeProfile();
            builder.employeeProfile(EmployeeProfileDto.builder()
                    .department(ep.getDepartment())
                    .position(ep.getPosition())
                    .build());
        }

        return builder.build();
    }

    public static AuthResponse toAuthResponse(User user, String message) {
        return AuthResponse.builder()
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .message(message)
                .build();
    }

    public static OfferResponseDto toOfferResponse(Offer offer) {
        Apartment apt = offer.getApartment();
        User owner = offer.getOwner();

        OfferResponseDto.OfferResponseDtoBuilder builder = OfferResponseDto.builder()
                .id(offer.getId())
                .active(offer.isActive())
                .availableFrom(offer.getAvailableFrom())
                .availableUntil(offer.getAvailableUntil())
                .createdAt(offer.getCreatedAt());

        if (owner != null) {
            builder.ownerId(owner.getId())
                    .ownerName(owner.getName())
                    .ownerEmail(owner.getEmail());
        }

        if (apt != null) {
            builder.apartmentId(apt.getId())
                    .title(apt.getTitle())
                    .description(apt.getDescription())
                    .price(apt.getPrice())
                    .deposit(apt.getDeposit())
                    .location(apt.getLocation())
                    .apartmentType(apt.getApartmentType())
                    .totalOccupants(apt.getTotalOccupants())
                    .photoUrls(apt.getPhotoUrls());
        }

        return builder.build();
    }

    public static ApplicationResponseDto toApplicationResponse(Application application) {
        Offer offer = application.getOffer();
        User applicant = application.getApplicant();

        return ApplicationResponseDto.builder()
                .id(application.getId())
                .message(application.getMessage())
                .appliedAt(application.getAppliedAt())
                .offerId(offer != null ? offer.getId() : null)
                .offerTitle(offer != null && offer.getApartment() != null
                        ? offer.getApartment().getTitle() : null)
                .applicantId(applicant != null ? applicant.getId() : null)
                .applicantName(applicant != null ? applicant.getName() : null)
                .applicantEmail(applicant != null ? applicant.getEmail() : null)
                .build();
    }

    public static Apartment toApartment(ApartmentDto dto) {
        Apartment apartment = new Apartment();
        apartment.setTitle(dto.getTitle());
        apartment.setDescription(dto.getDescription());
        apartment.setPrice(dto.getPrice());
        apartment.setDeposit(dto.getDeposit());
        apartment.setLocation(dto.getLocation());
        apartment.setApartmentType(dto.getApartmentType());
        apartment.setTotalOccupants(dto.getTotalOccupants());
        apartment.setPhotoUrls(dto.getPhotoUrls());
        return apartment;
    }
}
