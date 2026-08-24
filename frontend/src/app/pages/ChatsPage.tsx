import {useState, useEffect} from 'react';
import {useAuth} from '../context/AuthContext';
import {useChats} from '../context/ChatsContext';
import {useApplications} from '../context/ApplicationsContext';
import {apiService} from '../../services/api';
import {Send, X, Check, Home, Lock} from 'lucide-react';
import {toast} from 'sonner';

export function ChatsPage() {
    const {user} = useAuth();
    const {chats, sendMessage, markAsRead, refreshChats} = useChats();
    const {updateApplicationStatus, refreshApplications} = useApplications();

    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [showOfferModal, setShowOfferModal] = useState(false);

    //auto select first chat if available
    useEffect(() => {
        if (chats.length > 0 && !selectedChatId) {
            setSelectedChatId(chats[0].id);
        }
    }, [chats, selectedChatId]);

    const selectedChat = chats.find(c => c.id === selectedChatId);
    const isClosed = selectedChat?.applicationStatus === 'DECLINED';

    //mark as read when selected chat changes
    useEffect(() => {
        if (selectedChatId && user) {
            markAsRead(selectedChatId);
        }
    }, [selectedChatId, user]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedChat || !user || isClosed) return;

        try {
            await sendMessage(selectedChat.id, user.id, messageInput.trim());
            setMessageInput('');
        } catch {
            toast.error('Failed to send message.');
        }
    };

    const handleOfferAccommodation = async () => {
        if (!selectedChat) return;

        try {
            await apiService.finalizeOffer(selectedChat.applicationId);
            await refreshChats();
            await refreshApplications();
            setShowOfferModal(false);
            toast.success(`Accommodation successfully offered to ${selectedChat.applicantName}!`);
        } catch {
            toast.error('Could not finalize offer');
        }
    };

    const handleFinalDecline = async () => {
        if (!selectedChat) return;

        try {
            await updateApplicationStatus(
                selectedChat.applicationId,
                'declined'
            );
            await refreshChats();
            await refreshApplications();
            setShowDeclineModal(false);
            toast.info(`Application for ${selectedChat.applicantName} declined and chat closed.`);
        } catch {
            toast.error('Could not decline application');
        }
    };

    const isOwner = selectedChat?.ownerId === user?.id;
    const chatPartnerName = isOwner ? selectedChat?.applicantName : selectedChat?.ownerName;

    if (chats.length === 0) {
        return (
            <div className="max-w-4xl mx-auto py-12 text-center bg-white rounded-xl shadow-sm border p-8">
                <Home size={40} className="text-gray-400 mx-auto mb-3"/>
                <h2 className="text-xl font-semibold text-gray-800">No active chats</h2>
                <p className="text-gray-500 text-sm mt-1">
                    Chats become available once a listing owner approves an application.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Chats</h1>
                <p className="text-gray-600">Your conversations with applicants and owners</p>
            </div>

            <div className="grid grid-cols-12 gap-6 h-[calc(100vh-220px)]">
                {/* Sidebar */}
                <div className="col-span-4 bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col">
                    <div className="p-4 border-b bg-gray-50">
                        <h2 className="font-semibold text-gray-900">Conversations ({chats.length})</h2>
                    </div>
                    <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                        {chats.map(chat => {
                            const partner = chat.ownerId === user?.id ? chat.applicantName : chat.ownerName;
                            const lastMsg = chat.messages[chat.messages.length - 1];
                            const chatIsClosed = chat.applicationStatus === 'DECLINED';

                            return (
                                <button
                                    key={chat.id}
                                    onClick={() => setSelectedChatId(chat.id)}
                                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors flex flex-col ${
                                        selectedChatId === chat.id ? 'bg-blue-50/70 border-l-4 border-blue-600' : ''
                                    }`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold text-gray-900">{partner}</span>
                                        {chat.unreadCount > 0 && (
                                            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                                                {chat.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-500 truncate">{chat.offerName}</span>
                                    {chatIsClosed && (
                                        <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-red-600 font-medium">
                                            <Lock size={12} /> Chat Closed
                                        </span>
                                    )}

                                    {lastMsg && !chatIsClosed && (
                                        <p className="text-xs text-gray-400 mt-1 truncate">
                                            {lastMsg.senderName}: {lastMsg.text}
                                        </p>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="col-span-8 bg-white rounded-lg shadow-sm border flex flex-col overflow-hidden">
                    {selectedChat ? (
                        <>
                            <div className="p-4 border-b flex justify-between items-center bg-white">
                                <div>
                                    <h2 className="font-semibold text-gray-900">{chatPartnerName}</h2>
                                    <p className="text-xs text-gray-500">{selectedChat.offerName}</p>
                                </div>
                                {isClosed && (
                                    <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 text-xs rounded-full font-medium flex items-center gap-1">
                                        <Lock size={12} /> Chat Closed
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
                                {selectedChat.messages.length === 0 ? (
                                    <p className="text-center text-gray-400 py-8">No messages yet</p>
                                ) : (
                                    selectedChat.messages.map(message => {
                                        const isMe = message.senderId === user?.id;
                                        return (
                                            <div
                                                key={message.id}
                                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-md px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                                                        isMe
                                                            ? 'bg-blue-600 text-white rounded-br-none'
                                                            : 'bg-white border text-gray-800 rounded-bl-none'
                                                    }`}
                                                >
                                                    <p>{message.text}</p>
                                                    <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-100 text-right' : 'text-gray-400'}`}>
                                                        {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        }) : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {!isClosed ? (
                                <>
                                    <form onSubmit={handleSendMessage} className="p-3 border-t bg-white flex gap-2">
                                        <input
                                            type="text"
                                            value={messageInput}
                                            onChange={e => setMessageInput(e.target.value)}
                                            placeholder="Type your message..."
                                            className="flex-1 px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!messageInput.trim()}
                                            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                        >
                                            <Send size={18}/>
                                        </button>
                                    </form>

                                    {isOwner && (
                                        <div className="p-3 border-t bg-gray-50 flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setShowOfferModal(true)}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                                            >
                                                <Check size={18}/>
                                                Offer this apartment to {selectedChat.applicantName}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowDeclineModal(true)}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                                            >
                                                <X size={18}/>
                                                Decline
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="p-4 border-t bg-gray-100 text-center text-sm text-gray-500 font-medium">
                                    This conversation is closed. No further messages can be sent.
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

            {showOfferModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Offer Accommodation</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            When offering this apartment to <strong>{selectedChat?.applicantName}</strong>, you won't be
                            able to offer it to a different person anymore. The listing will be closed, and other
                            applicants will be notified
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowOfferModal(false)}
                                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleOfferAccommodation}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                            >
                                Confirm Offer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeclineModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Decline Application</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Are you sure you want to decline <strong>{selectedChat?.applicantName}</strong>'s application?
                            This conversation will be closed.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeclineModal(false)}
                                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFinalDecline}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                            >
                                Confirm Decline
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}