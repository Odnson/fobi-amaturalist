import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faEnvelope, faArrowLeft, faPaperPlane, faUser, faCircle,
    faSpinner, faSearch, faTimes, faCheck, faCheckDouble
} from '@fortawesome/free-solid-svg-icons';
import Header from '../components/Header';
import { apiFetch } from '../utils/api';
const getImageUrl = (profilePicture, fallbackName = 'User') => {
    if (!profilePicture) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=2c2c2c&color=fff`;
    }
    if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
        return profilePicture;
    }
    const cleanPath = profilePicture
        .replace(/^\/storage\//, '')
        .replace(/^\/api\/storage\//, '')
        .replace(/^storage\//, '')
        .replace(/^api\/storage\//, '');
    
    return `https://api.amaturalist.com/storage/${cleanPath}`;
};

const Messages = () => {
    const { conversationId } = useParams();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef(null);
    const currentUserId = localStorage.getItem('user_id');
    const fetchInbox = async () => {
        try {
            const response = await apiFetch('/messages/inbox', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setConversations(data.data.conversations || []);
            }
        } catch (error) {
            console.error('Error fetching inbox:', error);
        } finally {
            setLoading(false);
        }
    };
    const fetchConversation = async (userId) => {
        try {
            const response = await apiFetch(`/messages/conversation/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setSelectedConversation(data.data.other_user);
                setMessages(data.data.messages || []);
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        } catch (error) {
            console.error('Error fetching conversation:', error);
        }
    };
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

        setSendingMessage(true);
        try {
            const response = await apiFetch('/messages/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify({
                    receiver_id: selectedConversation.id,
                    message: newMessage.trim()
                })
            });
            const data = await response.json();
            if (data.success) {
                setMessages(prev => [...prev, data.data]);
                setNewMessage('');
                fetchInbox();
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSendingMessage(false);
        }
    };
    useEffect(() => {
        fetchInbox();
    }, []);
    useEffect(() => {
        if (conversationId) {
            fetchConversation(conversationId);
        }
    }, [conversationId]);
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Kemarin';
        } else if (diffDays < 7) {
            return date.toLocaleDateString('id-ID', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        }
    };
    const filteredConversations = conversations.filter(conv => 
        conv.uname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.fname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lname?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const handleSelectConversation = (conv) => {
        navigate(`/messages/${conv.other_user_id}`);
    };

    return (
            
            <div className="container mx-auto px-4 py-6 mt-16">
                <div className="bg-[#1a1a1a] rounded-2xl border border-[#252525] shadow-xl overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
                    <div className="flex h-full">
                        {/* Sidebar - Conversation List */}
                        <div className={`w-full md:w-96 border-r border-[#252525] flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                            {/* Header */}
                            <div className="p-4 border-b border-[#252525]">
                                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                    <FontAwesomeIcon icon={faEnvelope} className="text-[#3B82F6]" />
                                    Pesan
                                </h1>
                            </div>

                            {/* Search */}
                            <div className="p-3 border-b border-[#252525]">
                                <div className="relative">
                                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Cari percakapan..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-[#252525] border border-[#333] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#3B82F6]"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                        >
                                            <FontAwesomeIcon icon={faTimes} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Conversation List */}
                            <div className="flex-1 overflow-y-auto">
                                {loading ? (
                                    <div className="flex items-center justify-center h-32">
                                        <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-gray-500" />
                                    </div>
                                ) : filteredConversations.length === 0 ? (
                                    <div className="p-6 text-center text-gray-500">
                                        {searchQuery ? 'Tidak ada hasil pencarian' : 'Belum ada percakapan'}
                                    </div>
                                ) : (
                                    filteredConversations.map((conv) => {
                                        const isAdminOrSystem = conv.is_admin_message || conv.is_system_user || conv.uname === 'amaturalist';
                                        return (
                                            <div
                                                key={conv.other_user_id}
                                                onClick={() => handleSelectConversation(conv)}
                                                className={`flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-[#252525] ${
                                                    conversationId == conv.other_user_id 
                                                        ? (isAdminOrSystem ? 'bg-blue-900/40' : 'bg-[#252525]')
                                                        : (isAdminOrSystem ? 'bg-blue-900/20 hover:bg-blue-900/30' : 'hover:bg-[#252525]')
                                                }`}
                                            >
                                                <div className="relative">
                                                    <div className={`w-12 h-12 rounded-full overflow-hidden ${isAdminOrSystem ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-[#333]'}`}>
                                                        <img 
                                                            src={getImageUrl(conv.profile_picture, conv.uname)} 
                                                            alt={conv.uname}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.uname || 'User')}&background=2c2c2c&color=fff`;
                                                            }}
                                                        />
                                                    </div>
                                                    {conv.unread_count > 0 && (
                                                        <span className="absolute -top-1 -right-1 bg-[#3B82F6] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                                            {conv.unread_count > 9 ? '9+' : conv.unread_count}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-medium truncate ${isAdminOrSystem ? 'text-blue-300' : 'text-white'}`}>{conv.uname}</span>
                                                            {isAdminOrSystem && (
                                                                <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] rounded font-medium">
                                                                    ADMIN
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-gray-500">{formatTime(conv.last_message_at)}</span>
                                                    </div>
                                                    <p className={`text-sm truncate ${conv.unread_count > 0 ? 'text-white font-medium' : 'text-gray-500'}`}>
                                                        {conv.last_sender_id == currentUserId && (
                                                            <span className="text-gray-500">Anda: </span>
                                                        )}
                                                        {conv.last_message}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Main - Conversation View */}
                        <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                            {selectedConversation ? (
                                <>
                                    {/* Conversation Header */}
                                    <div className="p-4 border-b border-[#252525] flex items-center gap-3">
                                        <button
                                            onClick={() => {
                                                setSelectedConversation(null);
                                                navigate('/messages');
                                            }}
                                            className="md:hidden p-2 text-gray-400 hover:text-white"
                                        >
                                            <FontAwesomeIcon icon={faArrowLeft} />
                                        </button>
                                        <Link to={`/profile/${selectedConversation.id}`} className="flex items-center gap-3 hover:opacity-80">
                                            {(() => {
                                                const isAdminConv = selectedConversation.is_admin_message || selectedConversation.is_system_user || selectedConversation.uname === 'amaturalist';
                                                return (
                                                    <>
                                                        <div className={`w-10 h-10 rounded-full overflow-hidden ${isAdminConv ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-[#333]'}`}>
                                                            <img 
                                                                src={getImageUrl(selectedConversation.profile_picture, selectedConversation.uname)} 
                                                                alt={selectedConversation.uname}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedConversation.uname || 'User')}&background=2c2c2c&color=fff`;
                                                                }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h2 className={`font-medium ${isAdminConv ? 'text-blue-300' : 'text-white'}`}>{selectedConversation.uname}</h2>
                                                                {isAdminConv && (
                                                                    <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] rounded font-medium">
                                                                        ADMIN
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {(selectedConversation.fname || selectedConversation.lname) && (
                                                                <p className="text-xs text-gray-500">
                                                                    {[selectedConversation.fname, selectedConversation.lname].filter(Boolean).join(' ')}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </Link>
                                    </div>

                                    {/* Messages */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {messages.length === 0 ? (
                                            <div className="flex items-center justify-center h-full text-gray-500">
                                                Mulai percakapan dengan {selectedConversation.uname}
                                            </div>
                                        ) : (
                                            messages.map((msg) => {
                                                const isOwn = msg.sender_id == currentUserId;
                                                return (
                                                    <div
                                                        key={msg.id}
                                                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                                                    >
                                                        <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                                                            <div className={`px-4 py-2 rounded-2xl ${
                                                                isOwn 
                                                                    ? 'bg-[#3B82F6] text-white rounded-br-md' 
                                                                    : 'bg-[#252525] text-white rounded-bl-md'
                                                            }`}>
                                                                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                                                            </div>
                                                            <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                                                <span>{formatTime(msg.created_at)}</span>
                                                                {isOwn && (
                                                                    <FontAwesomeIcon 
                                                                        icon={msg.is_read ? faCheckDouble : faCheck} 
                                                                        className={msg.is_read ? 'text-[#3B82F6]' : ''}
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Message Input */}
                                    <form onSubmit={handleSendMessage} className="p-4 border-t border-[#252525]">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                placeholder="Tulis pesan..."
                                                className="flex-1 bg-[#252525] border border-[#333] rounded-full px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#3B82F6]"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!newMessage.trim() || sendingMessage}
                                                className="w-10 h-10 bg-[#3B82F6] text-white rounded-full flex items-center justify-center hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {sendingMessage ? (
                                                    <FontAwesomeIcon icon={faSpinner} spin />
                                                ) : (
                                                    <FontAwesomeIcon icon={faPaperPlane} />
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center text-gray-500">
                                        <FontAwesomeIcon icon={faEnvelope} className="text-6xl mb-4" />
                                        <p className="text-lg">Pilih percakapan untuk mulai chat</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
    );
};

export default Messages;
