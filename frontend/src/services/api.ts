const API_BASE_URL = 'http://localhost:8080'; // Change to your Spring Boot port

export interface OfferResponse {
    id: number;
    apartment: {
        id: number;
        title: string;
        description: string;
        price: number;
        deposit: number;
        location: string;
        apartmentType: 'WG' | 'STUDIO' | 'ROOM' | 'APARTMENT' | 'SUBLET';
        totalOccupants: number;
        photoUrls: string[];
    };
    owner: {
        id: number;
        // add any user properties your partner has in User model
    };
    availableFrom: string;
    availableUntil: string;
    active: boolean;
    createdAt: string;
}

export const apiService = {
    // Fetch active offers for the Feed Page
    async getOffers(filters?: { location?: string; maxPrice?: number; apartmentType?: string }): Promise<OfferResponse[]> {
        const params = new URLSearchParams();
        if (filters?.location) params.append('location', filters.location);
        if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
        if (filters?.apartmentType) params.append('apartmentType', filters.apartmentType);

        const response = await fetch(`${API_BASE_URL}/offers?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch offers');
        return response.json();
    },

    // Fetch offers belonging to a specific owner for My Offers page
    async getOffersByOwner(ownerId: number | string): Promise<OfferResponse[]> {
        const response = await fetch(`${API_BASE_URL}/offers/owner/${ownerId}`);
        if (!response.ok) throw new Error('Failed to fetch user offers');
        return response.json();
    },

    // Post a new listing matching OfferRequestDto layout
    async createOffer(data: any): Promise<OfferResponse> {
        const response = await fetch(`${API_BASE_URL}/offers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create offer');
        return response.json();
    },

    // Deactivate an offer
    async deactivateOffer(id: number | string): Promise<OfferResponse> {
        const response = await fetch(`${API_BASE_URL}/offers/${id}/deactivate`, {
            method: 'PATCH',
        });
        if (!response.ok) throw new Error('Failed to deactivate offer');
        return response.json();
    }
};