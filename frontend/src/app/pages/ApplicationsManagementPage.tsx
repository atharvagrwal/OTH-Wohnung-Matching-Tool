import { useParams, useNavigate } from 'react-router';
import { useOffers } from '../context/OffersContext';
import { useApplications } from '../context/ApplicationsContext';
import { useChats } from '../context/ChatsContext';
import { useNotifications } from '../context/NotificationsContext';
import { ArrowLeft, Check, X, Mail } from 'lucide-react';
import { toast } from 'sonner';

export function ApplicationsManagementPage() {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const { getOfferById } = useOffers();
  const { getApplicationsByOffer, updateApplicationStatus } = useApplications();
  const { createChat } = useChats();
  const { addNotification } = useNotifications();
  const offer = getOfferById(offerId || '');
  const applications = getApplicationsByOffer(offerId || '');

  if (!offer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Offer not found</p>
        <button onClick={() => navigate('/my-offers')} className="mt-4 text-blue-600 hover:text-blue-700">
          Back to my offers
        </button>
      </div>
    );
  }

  const handleApprove = (applicationId: string, applicantId: string, applicantName: string) => {
    updateApplicationStatus(applicationId, 'approved');

    createChat(applicationId, offer.id, offer.name, [offer.createdBy, applicantId]);

    addNotification({
      userId: applicantId,
      type: 'approval',
      title: 'Application Approved!',
      message: `Your application for ${offer.name} has been approved. You can now chat with the owner.`,
      applicationId,
      offerId: offer.id,
    });

    toast.success(`${applicantName}'s application approved! Chat created.`);
  };

  const handleDecline = (applicationId: string, applicantId: string) => {
    updateApplicationStatus(applicationId, 'declined');

    addNotification({
      userId: applicantId,
      type: 'decline',
      title: 'Application Update',
      message: `Your application for ${offer.name} was not selected at this time.`,
      applicationId,
      offerId: offer.id,
    });

    toast.info('Application declined.');
  };

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const approvedApplications = applications.filter(app => app.status === 'approved' || app.status === 'offered');
  const declinedApplications = applications.filter(app => app.status === 'declined');

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      approved: 'bg-green-50 text-green-700 border-green-200',
      declined: 'bg-red-50 text-red-700 border-red-200',
      offered: 'bg-blue-100 text-blue-800 border-blue-300',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate(`/offer/${offer.id}`)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to offer</span>
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Applications for {offer.name}</h1>
        <p className="text-gray-600">{applications.length} total applications</p>
      </div>

      {pendingApplications.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Pending ({pendingApplications.length})
          </h2>
          <div className="space-y-4">
            {pendingApplications.map((app) => (
              <div key={app.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{app.applicantName}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Mail size={16} />
                      <span>{app.applicantEmail}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Applied {new Date(app.createdAt).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(app.status)}`}>
                    Pending
                  </span>
                </div>

                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Message:</p>
                  <p className="text-gray-600 whitespace-pre-line">{app.message}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(app.id, app.applicantId, app.applicantName)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <Check size={20} />
                    Approve & Start Chat
                  </button>
                  <button
                    onClick={() => handleDecline(app.id, app.applicantId)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    <X size={20} />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {approvedApplications.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Approved ({approvedApplications.length})
          </h2>
          <div className="space-y-4">
            {approvedApplications.map((app) => (
              <div key={app.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{app.applicantName}</h3>
                    <p className="text-sm text-gray-600">{app.applicantEmail}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(app.status)}`}>
                    {app.status === 'offered' ? 'Offered' : 'Approved'}
                  </span>
                </div>

                {app.status === 'offered' ? (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-900">✓ Accommodation offered to this applicant</p>
                    <p className="text-sm text-blue-700 mt-1">The offer has been marked as inactive.</p>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate('/chats')}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Go to Chat
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {declinedApplications.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Declined ({declinedApplications.length})
          </h2>
          <div className="space-y-4">
            {declinedApplications.map((app) => (
              <div key={app.id} className="bg-white rounded-lg shadow-sm border p-6 opacity-60">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{app.applicantName}</h3>
                    <p className="text-sm text-gray-600">{app.applicantEmail}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(app.status)}`}>
                    Declined
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {applications.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500">No applications yet</p>
        </div>
      )}
    </div>
  );
}
