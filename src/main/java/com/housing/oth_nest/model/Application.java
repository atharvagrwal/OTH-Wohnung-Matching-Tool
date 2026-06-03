package com.housing.oth_nest.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private User applicant;

    @ManyToOne
    private Offer offer;

    @Column(length = 2000)
    private String message;

    private LocalDateTime appliedAt = LocalDateTime.now();
}