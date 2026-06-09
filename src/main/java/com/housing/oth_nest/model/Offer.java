package com.housing.oth_nest.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Offer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    private Apartment apartment;

    @ManyToOne
    private User owner;

    private LocalDate availableFrom;

    private LocalDate availableUntil;

    private boolean active = true;

    private LocalDateTime createdAt = LocalDateTime.now();
}