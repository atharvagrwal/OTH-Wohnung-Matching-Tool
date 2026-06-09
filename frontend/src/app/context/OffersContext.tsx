import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from "../../services/api.ts";

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
  loading: boolean;
  error: string | null;
  addOffer: (offer: Omit<Offer, 'id' | 'isActive'>) => Promise<void>;
  getOfferById: (id: string) => Offer | undefined;
  markOfferAsInactive: (id: string) => Promise<void>;
  refreshOffers: () => Promise<void>;
}

const OffersContext = createContext<OffersContextType | undefined>(undefined);

// Helper function to map flat Backend entity data straight to Frontend application models
const mapBackendToFrontend = (backendOffer: any): Offer => {
  // Reading data values directly from the root element since response fields are flat
  const data = backendOffer || {};

  // 1. Determine frontend StayType string safely from backend variables
  let deducedStayType: StayType = 'nachmieter';
  if (data.price === 0) {
    deducedStayType = 'couchsurfing';
  } else if (data.apartmentType === 'SUBLET') {
    deducedStayType = 'zwischenmiete';
  }

  // 2. Translate string values safely to prevent component layout crashes
  let deducedAptType: ApartmentType = 'apartment';
  if (data.apartmentType === 'WG') deducedAptType = 'WG';
  if (data.apartmentType === 'STUDIO') deducedAptType = 'studio';

  return {
    id: String(data.id || Math.random()),
    name: data.title || 'Untitled Listing',
    address: data.location || 'No Location Provided',
    stayType: deducedStayType,
    apartmentType: deducedAptType,
    moveInDate: data.availableFrom || new Date().toISOString().split('T')[0],
    area: 0, // Fallback placeholder since backend model currently lacks sizing properties
    description: data.description || 'No description available.',
    images: data.photoUrls && data.photoUrls.length > 0
        ? data.photoUrls
        : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
    genderBreakdown: {
      males: 0,
      females: 0,
      diverse: 0
    },
    priceBreakdown: {
      kaltmiete: data.price || 0,
      nebenkosten: 0,
      kaution: data.deposit || 0
    },
    totalPrice: data.price || 0,
    specifics: {
      pets: 'maybe',
      smoking: 'not-allowed',
      parties: 'maybe',
      instruments: 'maybe',
      visitors: 'allowed',
    },
    contactEmail: data.ownerEmail || '',
    createdBy: String(data.ownerId || '1'), // Matches our test dummy owner token configuration
    isActive: data.active ?? true
  };
};

export function OffersProvider({ children }: { children: ReactNode }) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshOffers = async () => {
    try {
      setLoading(true);
      const backendData = await apiService.getOffers();
      const localizedOffers = backendData.map(mapBackendToFrontend);
      setOffers(localizedOffers);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Could not sync up with backend housing service.');
    } finally {
      setLoading(false);
    }
  };

  // Pull listings directly when context mounts on screen
  useEffect(() => {
    refreshOffers();
  }, []);

  const addOffer = async (frontendOffer: Omit<Offer, 'id' | 'isActive'>) => {
    // 1. Map the React frontend types back to the Backend enum layout
    let backendAptType = frontendOffer.apartmentType.toUpperCase(); // 'WG' or 'STUDIO' or 'APARTMENT'
    if (frontendOffer.stayType === 'zwischenmiete') {
      backendAptType = 'SUBLET';
    }

    // 2. Build the exact payload structure required by OfferRequestDto
    const payload = {
      ownerId: 1, // Hardcoded dummy owner ID to bypass login requirements for now
      apartment: {
        title: frontendOffer.name,
        description: frontendOffer.description,
        price: frontendOffer.totalPrice,
        deposit: frontendOffer.priceBreakdown.kaution,
        location: frontendOffer.address,
        apartmentType: backendAptType,
        totalOccupants: frontendOffer.genderBreakdown.males + frontendOffer.genderBreakdown.females + frontendOffer.genderBreakdown.diverse,
        photoUrls: frontendOffer.images
      },
      availableFrom: frontendOffer.moveInDate,
      availableUntil: null // Optional field in the OfferRequestDto layout
    };

    try {
      // 3. Send over network wire to Java Backend
      await apiService.createOffer(payload);

      // 4. Force state update to refresh local tracking array straight from database source
      await refreshOffers();
    } catch (err) {
      console.error("Error creating listing on the backend:", err);
      alert("Could not post listing. Make sure your backend server is active and CORS is configured.");
    }
  };

  const getOfferById = (id: string) => {
    return offers.find(offer => offer.id === id);
  };

  const markOfferAsInactive = async (id: string) => {
    try {
      await apiService.deactivateOffer(id);
      await refreshOffers();
    } catch (err) {
      console.error("Error deactivating listing:", err);
    }
  };

  return (
      <OffersContext.Provider value={{
        offers,
        loading,
        error,
        addOffer,
        getOfferById,
        markOfferAsInactive,
        refreshOffers
      }}>
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