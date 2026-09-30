import { Link, useNavigate } from 'react-router';
import { useOffers } from '../context/OffersContext';
import { useApplications } from '../context/ApplicationsContext';
import { useAuth } from '../context/AuthContext';
import { ChevronRight, MapPin, Users } from 'lucide-react';

export function ReviewApplicantsPage() {
  const { offers } = useOffers();
  const { applications } = useApplications();
  const { user } = useAuth();
  const navigate = useNavigate();

  const myOffers = offers.filter(offer => offer.createdBy === user?.id);

  const getPendingApplicantCount = (offerId: number) => {
    return applications.filter(
      app => app.offerId === offerId && app.status === 'PENDING'
    ).length;
  };

  const getTotalApplicantCount = (offerId: number) => {
    return applications.filter(app => app.offerId === offerId).length;
  };

  if (myOffers.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Applicants</h1>
          <p className="text-gray-600">See all applications for your listings</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Users size={40} className="text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No offers yet</h2>
          <p className="text-gray-600 mb-6">Create an offer to start receiving applications</p>
          <button
            onClick={() => navigate('/create')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Create Offer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Applicants</h1>
        <p className="text-gray-600">Manage applications for your {myOffers.length} listing{myOffers.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="space-y-4">
        {myOffers.map(offer => {
          const pendingCount = getPendingApplicantCount(offer.id);
          const totalCount = getTotalApplicantCount(offer.id);

          return (
            <Link
              key={offer.id}
              to={`/applications/${offer.id}`}
              className="block group"
            >
              <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {offer.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                      <MapPin size={16} />
                      {offer.address}
                    </div>
                    <div className="flex gap-6 mt-3">
                      <div className="text-sm">
                        <span className="text-gray-600">Pending: </span>
                        <span className="font-semibold text-blue-600">{pendingCount}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Total: </span>
                        <span className="font-semibold text-gray-900">{totalCount}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {pendingCount > 0 && (
                      <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                        {pendingCount} waiting
                      </div>
                    )}
                    <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
