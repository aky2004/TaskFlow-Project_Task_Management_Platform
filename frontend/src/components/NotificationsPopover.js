import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationAPI, projectAPI } from '../services/api';
import { XMarkIcon, BellIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const NotificationsPopover = ({ onClose }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const popoverRef = useRef(null);
    const { user } = useAuth();

    useEffect(() => {
        loadNotifications();
        
        const handleClick = (e) => {
             if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                 onClose();
             }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const loadNotifications = async () => {
        try {
            const res = await notificationAPI.getNotifications();
            setNotifications(res.data.notifications);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (notification) => {
        try {
            await projectAPI.respondToInvitation(notification.relatedProject._id, 'active');
            toast.success('Joined project!');
            await notificationAPI.markAsRead(notification._id);
            setNotifications(prev => prev.filter(n => n._id !== notification._id));
            window.location.reload(); 
        } catch (e) {
            toast.error('Failed to accept');
        }
    };

    const handleDecline = async (notification) => {
        try {
            await projectAPI.respondToInvitation(notification.relatedProject._id, 'declined');
            toast.success('Invitation declined');
            await notificationAPI.markAsRead(notification._id);
            setNotifications(prev => prev.filter(n => n._id !== notification._id));
        } catch (e) {
            toast.error('Failed to decline');
        }
    };

    return (
        <div className="absolute right-0 top-14 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-fade-in-up" ref={popoverRef}>
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-5 h-5"/></button>
            </div>
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="p-8 text-center text-gray-400 text-xs">Loading...</div>
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs text-center flex flex-col items-center gap-2">
                        <BellIcon className="w-8 h-8 opacity-20"/>
                        No notifications
                    </div>
                ) : (
                    notifications.map(n => (
                        <div key={n._id} className={`p-4 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${n.isRead ? 'opacity-60' : ''}`}>
                             <div className="flex gap-3">
                                <div className="mt-1 min-w-[32px]">
                                     <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xs">
                                         {n.sender?.name?.charAt(0)}
                                     </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug mb-1">
                                        <span className="font-bold">{n.sender?.name}</span> invited you to <span className="font-bold">{n.relatedProject?.name}</span>
                                    </p>
                                    <p className="text-[10px] text-gray-400 mb-3">{new Date(n.createdAt).toLocaleDateString()}</p>
                                    
                                    {n.type === 'project-invited' && !n.isRead && (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleAccept(n)}
                                                className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold transition-colors"
                                            >
                                                Accept
                                            </button>
                                            <button 
                                                onClick={() => handleDecline(n)}
                                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    )}
                                </div>
                             </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationsPopover;
