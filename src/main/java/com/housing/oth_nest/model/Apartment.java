package com.housing.oth_nest.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "apartment")
public class Apartment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    private String description;

    private Double price;

    private Double deposit;

    private String location;

    @Enumerated(EnumType.STRING)
    private ApartmentType apartmentType;

    private Integer totalOccupants;

    @ElementCollection
    private List<String> photoUrls;
}