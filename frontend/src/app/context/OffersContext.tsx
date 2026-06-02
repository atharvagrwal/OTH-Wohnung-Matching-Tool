import { createContext, useContext, useState, ReactNode } from 'react';

export type StayType = 'zwischenmiete' | 'nachmieter' | 'couchsurfing';
export type ApartmentType = 'WG' | 'studio' | 'apartment';
export type PermissionStatus = 'allowed' | 'not-allowed' | 'maybe';

export interface GenderBreakdown {
  males: number;
  females: number;
  diverse: number;
}

export interface PriceBreakdown {
  kaltmiete: number;
  nebenkosten: number;
  kaution: number;
  ablose?: number;
  sonstiges?: number;
}

export interface OfferSpecifics {
  pets: PermissionStatus;
  smoking: PermissionStatus;
  parties: PermissionStatus;
  instruments: PermissionStatus;
  visitors: PermissionStatus;
}

export interface Offer {
  id: string;
  name: string;
  address: string;
  stayType: StayType;
  apartmentType: ApartmentType;
  moveInDate: string;
  area: number;
  description: string;
  images: string[];
  genderBreakdown: GenderBreakdown;
  priceBreakdown: PriceBreakdown;
  totalPrice: number;
  specifics: OfferSpecifics;
  contactEmail: string;
  createdBy: string;
  isActive: boolean;
}

interface OffersContextType {
  offers: Offer[];
  addOffer: (offer: Omit<Offer, 'id' | 'isActive'>) => void;
  getOfferById: (id: string) => Offer | undefined;
  markOfferAsInactive: (id: string) => void;
}

const OffersContext = createContext<OffersContextType | undefined>(undefined);

const mockOffers: Offer[] = [
  {
    id: '1',
    name: 'Cozy WG Room in City Center',
    address: 'Galgenbergstraße 25, 93053 Regensburg',
    stayType: 'zwischenmiete',
    apartmentType: 'WG',
    moveInDate: '2026-06-01',
    area: 18,
    description: 'Bright room in a friendly 3-person WG. Close to university and public transport. Fully furnished with bed, desk, and wardrobe. Perfect for students looking for a temporary place during summer semester.',
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800'],
    genderBreakdown: { males: 1, females: 2, diverse: 0 },
    priceBreakdown: { kaltmiete: 300, nebenkosten: 50, kaution: 600 },
    totalPrice: 350,
    specifics: {
      pets: 'not-allowed',
      smoking: 'not-allowed',
      parties: 'maybe',
      instruments: 'allowed',
      visitors: 'allowed',
    },
    contactEmail: 'student@oth-regensburg.de',
    createdBy: '1',
    isActive: true,
  },
  {
    id: '2',
    name: 'Student Studio Near Campus',
    address: 'Prüfeninger Straße 58, 93049 Regensburg',
    stayType: 'nachmieter',
    apartmentType: 'studio',
    moveInDate: '2026-07-15',
    area: 28,
    description: 'Perfect studio for students! Walking distance to OTH. Private bathroom and kitchenette. Quiet neighborhood with good shopping options.',
    images: ['https://images.unsplash.com/photo-1502672260066-6bc04751c9e9?w=800'],
    genderBreakdown: { males: 0, females: 1, diverse: 0 },
    priceBreakdown: { kaltmiete: 380, nebenkosten: 80, kaution: 760, ablose: 200 },
    totalPrice: 460,
    specifics: {
      pets: 'maybe',
      smoking: 'not-allowed',
      parties: 'not-allowed',
      instruments: 'maybe',
      visitors: 'allowed',
    },
    contactEmail: 'anna.mueller@oth-regensburg.de',
    createdBy: '2',
    isActive: true,
  },
  {
    id: '3',
    name: 'Short-term Couch in Shared Flat',
    address: 'Universitätsstraße 31, 93053 Regensburg',
    stayType: 'couchsurfing',
    apartmentType: 'WG',
    moveInDate: '2026-06-01',
    area: 0,
    description: 'Offering a comfortable couch in our shared living room for short stays (max 2 weeks). Great for students looking for temporary accommodation during internship or waiting for permanent housing.',
    images: ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800'],
    genderBreakdown: { males: 2, females: 1, diverse: 0 },
    priceBreakdown: { kaltmiete: 0, nebenkosten: 0, kaution: 0 },
    totalPrice: 0,
    specifics: {
      pets: 'not-allowed',
      smoking: 'not-allowed',
      parties: 'allowed',
      instruments: 'maybe',
      visitors: 'maybe',
    },
    contactEmail: 'max.schmidt@oth-regensburg.de',
    createdBy: '3',
    isActive: true,
  },
];

export function OffersProvider({ children }: { children: ReactNode }) {
  const [offers, setOffers] = useState<Offer[]>(mockOffers);

  const addOffer = (offer: Omit<Offer, 'id' | 'isActive'>) => {
    const newOffer: Offer = {
      ...offer,
      id: String(Date.now()),
      isActive: true,
    };
    setOffers(prev => [newOffer, ...prev]);
  };

  const getOfferById = (id: string) => {
    return offers.find(offer => offer.id === id);
  };

  const markOfferAsInactive = (id: string) => {
    setOffers(prev =>
      prev.map(offer => (offer.id === id ? { ...offer, isActive: false } : offer))
    );
  };

  return (
    <OffersContext.Provider value={{ offers, addOffer, getOfferById, markOfferAsInactive }}>
      {children}
    </OffersContext.Provider>
  );
}

export function useOffers() {
  const context = useContext(OffersContext);
  if (context === undefined) {
    throw new Error('useOffers must be used within an OffersProvider');
  }
  return context;
}
