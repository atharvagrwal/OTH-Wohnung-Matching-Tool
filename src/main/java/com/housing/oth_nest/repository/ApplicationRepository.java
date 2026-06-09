package com.housing.oth_nest.repository;

import com.housing.oth_nest.model.Application;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Long> {

    @EntityGraph(attributePaths = {"offer", "offer.apartment", "applicant"})
    Optional<Application> findWithDetailsById(Long id);

    @EntityGraph(attributePaths = {"offer", "offer.apartment", "applicant"})
    List<Application> findByOffer_Id(Long offerId);

    @EntityGraph(attributePaths = {"offer", "offer.apartment", "applicant"})
    List<Application> findByApplicant_Id(Long applicantId);

    boolean existsByOffer_IdAndApplicant_Id(Long offerId, Long applicantId);
}
