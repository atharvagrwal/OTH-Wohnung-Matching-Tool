import { useState } from 'react';
import { Link } from 'react-router';
import { useOffers, StayType } from '../context/OffersContext';
import { MapPin, Euro, Calendar, Filter } from 'lucide-react';

export function FeedPage() {
  // Destructure loading and error states along with your offers
  const { offers, loading, error } = useOffers();
  const [activeFilters, setActiveFilters] = useState<StayType[]>([]);

  const toggleFilter = (filter: StayType) => {
    setActiveFilters(prev =>
        prev.includes(filter)
            ? prev.filter(f => f !== filter)
            : [...prev, filter]
    );
  };

  const filteredOffers = activeFilters.length === 0
      ? offers
      : offers.filter(offer => activeFilters.includes(offer.stayType));

  const getStayTypeLabel = (type: StayType) => {
    const labels = {
      zwischenmiete: 'Zwischenmiete',
      nachmieter: 'Nachmieter',
      couchsurfing: 'Couchsurfing',
    };
    return labels[type];
  };

  const getStayTypeBadgeColor = (type: StayType) => {
    const colors = {
      zwischenmiete: 'bg-blue-50 text-blue-700',
      nachmieter: 'bg-green-50 text-green-700',
      couchsurfing: 'bg-purple-50 text-purple-700',
    };
    return colors[type];
  };

  // 1. Render Loading Spinner while communicating with the Java server
  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Fetching active listings from OTH Nest server...</p>
        </div>
    );
  }

  // 2. Render Error Feedback if the network connection breaks or CORS is rejected
  if (error) {
    return (
        <div className="max-w-xl mx-auto my-12 p-6 bg-red-50 rounded-xl border border-red-200 text-center">
          <h3 className="text-red-800 font-bold text-lg mb-2">Connection Problem</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-xs text-gray-500">
            Ensure your Spring Boot backend application is running on port 8080 and cross-origin resource sharing (CORS) is explicitly enabled on your controllers.
          </p>
        </div>
    );
  }

  // 3. Main render state once data maps completely
  return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Housing</h1>
          <p className="text-gray-600">Find your perfect accommodation in the OTH Regensburg community</p>
        </div>

        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={20} className="text-gray-600" />
            <span className="font-medium text-gray-900">Filters</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['zwischenmiete', 'nachmieter', 'couchsurfing'] as StayType[]).map((type) => (
                <button
                    key={type}
                    onClick={() => toggleFilter(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeFilters.includes(type)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {getStayTypeLabel(type)}
                </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffers.map((offer) => (
              <Link
                  key={offer.id}
                  to={`/offer/${offer.id}`}
                  className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden group"
              >
                <div className="aspect-[4/3] overflow-hidden bg-gray-200 relative">
                  <img
                      src={offer.images[0]}
                      alt={offer.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStayTypeBadgeColor(offer.stayType)}`}>
                  {getStayTypeLabel(offer.stayType)}
                </span>
                    {!offer.isActive && (
                        <span className="text-xs px-3 py-1 rounded-full font-medium bg-gray-900 text-white">
                    Inactive
                  </span>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {offer.name}
                  </h3>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{offer.address}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="flex-shrink-0" />
                      <span>
                    {new Date(offer.moveInDate).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-1">
                      <Euro size={18} className="text-gray-600" />
                      <span className="font-semibold text-xl text-gray-900">{offer.totalPrice}</span>
                      {offer.totalPrice > 0 && <span className="text-sm text-gray-500">/month</span>}
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                  {offer.apartmentType}
                </span>
                  </div>
                </div>
              </Link>
          ))}
        </div>

        {filteredOffers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No offers match your filters.</p>
            </div>
        )}
      </div>
  );
}