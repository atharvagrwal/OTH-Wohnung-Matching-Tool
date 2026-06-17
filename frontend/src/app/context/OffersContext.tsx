import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from "../../services/api.ts";
import axios from 'axios';

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
  images: string[]; // Still tracks output string preview URLs for grid component rendering
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
  // ACCEPT BOTH TEXT METADATA OBJECTS AND RAW FILES ARRAYS
  addOffer: (offer: Omit<Offer, 'id' | 'isActive' | 'images'>, binaryFiles: File[]) => Promise<void>;
  getOfferById: (id: string) => Offer | undefined;
  markOfferAsInactive: (id: string) => Promise<void>;
  refreshOffers: () => Promise<void>;
}

const OffersContext = createContext<OffersContextType | undefined>(undefined);

const mapBackendToFrontend = (backendOffer: any): Offer => {
  const data = backendOffer || {};

  let deducedStayType: StayType = 'nachmieter';
  if (data.stayType === 'COUCHSURFING' || data.price === 0) {
    deducedStayType = 'couchsurfing';
  } else if (data.stayType === 'ZWISCHENMIETE') {
    deducedStayType = 'zwischenmiete';
  }

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
    area: data.area || 0,
    description: data.description || 'No description available.',
    images: data.photoUrls && data.photoUrls.length > 0
        ? data.photoUrls
        : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
    genderBreakdown: {
      males: data.malesCount || 0,
      females: data.femalesCount || 0,
      diverse: data.diverseCount || 0
    },
    priceBreakdown: {
      kaltmiete: data.kaltmiete || data.price || 0,
      nebenkosten: data.nebenkosten || 0,
      kaution: data.deposit || 0,
      ablose: data.ablose || 0,
      sonstiges: data.sonstiges || 0
    },
    totalPrice: data.price || 0,
    specifics: {
      pets: (data.petsPermission as PermissionStatus) || 'maybe',
      smoking: (data.smokingPermission as PermissionStatus) || 'not-allowed',
      parties: (data.partiesPermission as PermissionStatus) || 'maybe',
      instruments: (data.instrumentsPermission as PermissionStatus) || 'maybe',
      visitors: (data.visitorsPermission as PermissionStatus) || 'allowed',
    },
    contactEmail: data.ownerEmail || '',
    createdBy: String(data.ownerId || '1'),
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

  useEffect(() => {
    refreshOffers();
  }, []);

  const addOffer = async (frontendOffer: Omit<Offer, 'id' | 'isActive' | 'images'>, binaryFiles: File[]) => {
    let backendAptType = frontendOffer.apartmentType.toUpperCase();
    if (backendAptType === 'STUDIO') {
      backendAptType = 'STUDIO';
    } else if (backendAptType === 'APARTMENT') {
      backendAptType = 'APARTMENT';
    } else {
      backendAptType = 'WG';
    }

    // 1. Pack text attributes inside our baseline metadata object block
    const offerMetadata = {
      ownerId: Number(frontendOffer.createdBy) || 1,
      stayType: frontendOffer.stayType.toUpperCase(),
      apartment: {
        title: frontendOffer.name,
        description: frontendOffer.description,
        price: frontendOffer.totalPrice,
        deposit: frontendOffer.priceBreakdown.kaution,
        location: frontendOffer.address,
        apartmentType: backendAptType,
        totalOccupants: (frontendOffer.genderBreakdown.males || 0) + (frontendOffer.genderBreakdown.females || 0) + (frontendOffer.genderBreakdown.diverse || 0),
        area: frontendOffer.area || 0,
        kaltmiete: frontendOffer.priceBreakdown.kaltmiete || 0,
        nebenkosten: frontendOffer.priceBreakdown.nebenkosten || 0,
        ablose: frontendOffer.priceBreakdown.ablose || 0,
        sonstiges: frontendOffer.priceBreakdown.sonstiges || 0,
        malesCount: frontendOffer.genderBreakdown.males || 0,
        femalesCount: frontendOffer.genderBreakdown.females || 0,
        diverseCount: frontendOffer.genderBreakdown.diverse || 0,
        petsPermission: frontendOffer.specifics.pets || 'maybe',
        smokingPermission: frontendOffer.specifics.smoking || 'not-allowed',
        partiesPermission: frontendOffer.specifics.parties || 'maybe',
        instrumentsPermission: frontendOffer.specifics.instruments || 'maybe',
        visitorsPermission: frontendOffer.specifics.visitors || 'allowed'
      },
      availableFrom: frontendOffer.moveInDate,
      availableUntil: null
    };

    // 2. Initialize browser FormData engine container instance
    const formData = new FormData();

    // 3. Bind metadata block context as a Blob flagged with explicit application/json formatting headers
    formData.append(
        'offer',
        new Blob([JSON.stringify(offerMetadata)], { type: 'application/json' })
    );

    // 4. Append your native binary device file objects array cleanly onto the form
    binaryFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      // 5. Fire raw Multi-Part envelope across network wire directly to Spring controller endpoint
      await axios.post('http://localhost:8080/offers', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      await refreshOffers();
    } catch (err) {
      console.error("Error creating multipart listing on the backend:", err);
      alert("Could not post listing files. Verify server connectivity settings.");
      throw err;
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