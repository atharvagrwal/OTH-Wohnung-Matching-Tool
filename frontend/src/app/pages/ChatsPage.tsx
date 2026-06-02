import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChats } from '../context/ChatsContext';
import { useApplications } from '../context/ApplicationsContext';
import { useOffers } from '../context/OffersContext';
import { useNotifications } from '../context/NotificationsContext';
import { Send, X, Check } from 'lucide-react';
import { toast } from 'sonner';

export function ChatsPage() {
  const { user } = useAuth();
  const { getUserChats, sendMessage, deactivateChat } = useChats();
  const { updateApplicationStatus } = useApplications();
  const { getOfferById, markOfferAsInactive } = useOffers();
  const { addNotification } = useNotifications();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [declineMessage, setDeclineMessage] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [actionApplicationId, setActionApplicationId] = useState<string | null>(null);

  const chats = user ? getUserChats(user.id) : [];
  const selectedChat = chats.find(chat => chat.id === selectedChatId);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChat || !user) return;

    sendMessage(selectedChat.id, user.id, user.name, messageInput.trim());
    setMessageInput('');
  };

  const handleOfferAccommodation = (chatId: string, applicationId: string) => {
    if (!user || !selectedChat) return;

    const offer = getOfferById(selectedChat.offerId);
    if (!offer) return;

    updateApplicationStatus(applicationId, 'offered');
    markOfferAsInactive(offer.id);

    const otherUserId = selectedChat.participants.find(id => id !== user.id);
    if (otherUserId) {
      addNotification({
        userId: otherUserId,
        type: 'offer',
        title: 'Accommodation Offered! 🎉',
        message: `You've been selected for ${offer.name}! Chat is available to coordinate details.`,
        applicationId,
        offerId: offer.id,
      });
    }

    toast.success('Accommodation offered successfully! The offer has been marked as inactive.');
  };

  const handleFinalDecline = () => {
    if (!selectedChat || !user || !actionApplicationId) return;

    const offer = getOfferById(selectedChat.offerId);
    if (!offer) return;

    updateApplicationStatus(actionApplicationId, 'declined', declineMessage.trim() || undefined);
    deactivateChat(selectedChat.id);

    const otherUserId = selectedChat.participants.find(id => id !== user.id);
    if (otherUserId) {
      addNotification({
        userId: otherUserId,
        type: 'final-decline',
        title: 'Application Update',
        message: declineMessage.trim() || `The owner has decided to go with another applicant for ${offer.name}.`,
        applicationId: actionApplicationId,
        offerId: offer.id,
      });
    }

    toast.info('Application declined and chat closed.');

    setShowDeclineModal(false);
    setDeclineMessage('');
    setActionApplicationId(null);
    setSelectedChatId(null);
  };

  const isOwner = (chat: typeof selectedChat) => {
    if (!chat || !user) return false;
    const offer = getOfferById(chat.offerId);
    return offer?.createdBy === user.id;
  };

  if (chats.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chats</h1>
          <p className="text-gray-600">Your conversations with applicants and owners</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-500">No active chats yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Chats</h1>
        <p className="text-gray-600">Your conversations</p>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-250px)]">
        <div className="col-span-4 bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">Conversations ({chats.length})</h2>
          </div>
          <div className="overflow-y-auto h-full">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={`w-full p-4 text-left border-b hover:bg-gray-50 transition-colors ${
                  selectedChatId === chat.id ? 'bg-blue-50' : ''
                }`}
              >
                <h3 className="font-medium text-gray-900 mb-1">{chat.offerName}</h3>
                {chat.lastMessage && (
                  <p className="text-sm text-gray-600 truncate">
                    {chat.lastMessage.senderName}: {chat.lastMessage.text}
                  </p>
                )}
                {!chat.isActive && (
                  <span className="inline-block mt-2 text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                    Chat Closed
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-8 bg-white rounded-lg shadow-sm flex flex-col">
          {selectedChat ? (
            <>
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-900">{selectedChat.offerName}</h2>
                {!selectedChat.isActive && (
                  <p className="text-sm text-red-600 mt-1">This chat has been closed</p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedChat.messages.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    Start the conversation! 👋
                  </p>
                ) : (
                  selectedChat.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-md px-4 py-2 rounded-lg ${
                          message.senderId === user?.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm font-medium mb-1">{message.senderName}</p>
                        <p>{message.text}</p>
                        <p className="text-xs opacity-75 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString('de-DE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {selectedChat.isActive ? (
                <>
                  <form onSubmit={handleSendMessage} className="p-4 border-t">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!messageInput.trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  </form>

                  {isOwner(selectedChat) && (
                    <div className="p-4 border-t bg-gray-50 flex gap-3">
                      <button
                        onClick={() => handleOfferAccommodation(selectedChat.id, selectedChat.applicationId)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        <Check size={20} />
                        Offer Accommodation
                      </button>
                      <button
                        onClick={() => {
                          setActionApplicationId(selectedChat.applicationId);
                          setShowDeclineModal(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        <X size={20} />
                        Decline
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 border-t bg-gray-50 text-center text-sm text-gray-600">
                  This conversation has been closed
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>

      {showDeclineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Decline Applicant</h2>
              <button
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineMessage('');
                  setActionApplicationId(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Optional message to applicant
              </label>
              <textarea
                value={declineMessage}
                onChange={(e) => setDeclineMessage(e.target.value)}
                rows={4}
                placeholder="Explain why you chose another applicant (optional)..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowDeclineModal(false);
                    setDeclineMessage('');
                    setActionApplicationId(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinalDecline}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Confirm Decline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
