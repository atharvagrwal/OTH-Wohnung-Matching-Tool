package com.housing.oth_nest.repository;

import com.housing.oth_nest.model.Offer;
import com.housing.oth_nest.model.OfferStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface OfferRepository extends JpaRepository<Offer, Long>, JpaSpecificationExecutor<Offer> {

    @EntityGraph(attributePaths = {"apartment", "owner"})
    List<Offer> findByStatusOrderByCreatedAtDesc(OfferStatus status);

    @EntityGraph(attributePaths = {"apartment", "owner"})
    List<Offer> findByOwner_IdAndStatusOrderByCreatedAtDesc(Long ownerId, OfferStatus status);

    @EntityGraph(attributePaths = {"apartment", "owner"})
    Optional<Offer> findWithDetailsById(Long id);

    // Query offers with status ACTIVE, availableFrom = today, and no OFFERED application
    @Query("SELECT o FROM Offer o LEFT JOIN Application a ON o.id = a.offer.id AND a.status = 'OFFERED' " +
           "WHERE o.status = 'ACTIVE' AND o.availableFrom = :today AND a.id IS NULL " +
           "ORDER BY o.createdAt DESC")
    List<Offer> findReminderCandidates(LocalDate today);

    List<Offer> findByOwner_Id(Long ownerId);
}