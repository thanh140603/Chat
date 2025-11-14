// Pages - SocialPage
import React, { useState, useEffect } from 'react';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import conversationService from '../services/conversationService';
import { friendService } from '../services/friendService';
import { userService } from '../services/userService';

export interface SocialPageProps {
  currentUser: {
    id: string;
    name: string;
    avatar?: string;
  };
  onBack: () => void;
  onSelectConversation?: (conversationId: string) => void;
}

interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
}

interface FriendRequest {
  id: string;
  from: string;
  to: string;
  message?: string;
  createdAt: string;
  fromUser?: User;
}

interface Friend {
  id: string;
  userA: string;
  userB: string;
  createdAt: string;
  friendUser?: User;
}

export const SocialPage: React.FC<SocialPageProps> = ({ currentUser, onBack, onSelectConversation }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'friends' | 'requests'>('users');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Load data when component mounts
  useEffect(() => {
    loadUsers();
    loadFriends();
    loadFriendRequests();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // If user has friends, load "friends of friends" as suggestions
      const friendsList = await friendService.getFriends();
      
      if (friendsList.length > 0) {
        // Show friends of friends (suggestions based on friends)
        // For now, we'll just load all users and filter for suggestions
        const allUsers = await userService.getAllUsers();
        
        // Get friend IDs
        const friendIds = new Set(friendsList.map((f: any) => f.friendId));
        friendIds.add(currentUser.id);
        
        // Filter out current user and direct friends
        const suggestedUsers = allUsers
          .filter(user => !friendIds.has(user.id))
          .map(user => ({
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            email: user.email,
            avatarUrl: user.avatarUrl,
            bio: user.bio
          }));
        
        setUsers(suggestedUsers);
      } else {
        // No friends yet, load all users and show random 10
        const allUsers = await userService.getAllUsers();
        
        // Filter out current user
        const otherUsers = allUsers.filter(user => user.id !== currentUser.id);
        
        // Get random 10 users
        const shuffled = otherUsers.sort(() => 0.5 - Math.random());
        const randomUsers = shuffled.slice(0, 10).map(user => ({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          avatarUrl: user.avatarUrl,
          bio: user.bio
        }));
        
        setUsers(randomUsers);
      }
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      setLoading(true);
      const friendsList = await friendService.getFriends();
      
      // Backend returns FriendResponseDTO: { id, username, displayName, avatarUrl }
      const mappedFriends: Friend[] = friendsList.map((u: any) => ({
        id: u.id,
        userA: currentUser.id,
        userB: u.id,
        createdAt: new Date().toISOString(),
        friendUser: {
          id: u.id,
          username: u.username,
          displayName: u.displayName || u.username,
          email: undefined,
          avatarUrl: u.avatarUrl,
          bio: undefined
        }
      }));
      
      setFriends(mappedFriends);
    } catch (err) {
      setError('Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const loadFriendRequests = async () => {
    try {
      setLoading(true);
      const requestsData = await friendService.getFriendRequests();
      
      // Combine received and sent requests, but we only show received requests in the UI
      const mappedRequests: FriendRequest[] = requestsData.received.map((request: any) => ({
        id: request.id,
        from: request.fromUserId,
        to: request.toUserId,
        message: request.message,
        createdAt: request.createdAt,
        fromUser: {
          id: request.fromUserId,
          username: request.fromUsername,
          displayName: request.fromDisplayName,
          email: undefined,
          avatarUrl: request.fromAvatarUrl,
          bio: undefined
        }
      }));
      
      setFriendRequests(mappedRequests);
    } catch (err) {
      setError('Failed to load friend requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      await friendService.sendFriendRequest({ to: userId });
      setSuccess('Friend request sent!');
      loadFriendRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      setLoading(true);
      setError(null);
      await friendService.acceptFriendRequest(requestId);
      setSuccess('Friend request accepted!');
      await loadFriendRequests();
      await loadFriends();
    } catch (err: any) {
      setError(err.message || 'Failed to accept friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      setLoading(true);
      setError(null);
      await friendService.declineFriendRequest(requestId);
      setSuccess('Friend request declined');
      await loadFriendRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to decline friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = async (friendUserId: string, friendDisplayName: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Ensure direct conversation exists (will find existing or create new)
      const conversation = await conversationService.ensureDirectConversation(friendUserId);
      
      // Select the conversation and go back to chat
      if (onSelectConversation) {
        onSelectConversation(conversation.id);
      }
      
      onBack(); // Go back to chat page
      setSuccess(`Starting conversation with ${friendDisplayName}`);
    } catch (err: any) {
      setError(err.message || 'Failed to start conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId: string, friendDisplayName: string) => {
    try {
      setLoading(true);
      setError(null);
      
      if (confirm(`Are you sure you want to remove ${friendDisplayName}?`)) {
        await friendService.removeFriend(friendId);
        setSuccess('Friend removed');
        await loadFriends();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove friend');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.id !== currentUser.id && 
    (user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isFriend = (userId: string) => {
    return friends.some(friend => 
      friend.userA === userId || friend.userB === userId
    );
  };

  const hasPendingRequest = (userId: string) => {
    return friendRequests.some(req => 
      (req.from === userId && req.to === currentUser.id) ||
      (req.from === currentUser.id && req.to === userId)
    );
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-dark-900">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 dark:bg-dark-900 flex flex-col">
      {/* Header Bar */}
      <div className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Social</h1>
            <p className="text-gray-500 dark:text-dark-400 text-sm">Connect with other users</p>
          </div>
          <Button
            variant="outline"
            onClick={onBack}
            className="text-gray-600 dark:text-dark-300 hover:text-gray-800 dark:hover:text-white border-gray-300 dark:border-dark-600"
          >
            ← Back to Chat
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 px-6">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'users'
                ? 'border-purple-500 dark:border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 dark:text-dark-400 hover:text-gray-700 dark:hover:text-dark-300'
            }`}
          >
            All Users
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'friends'
                ? 'border-purple-500 dark:border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 dark:text-dark-400 hover:text-gray-700 dark:hover:text-dark-300'
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'requests'
                ? 'border-purple-500 dark:border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 dark:text-dark-400 hover:text-gray-700 dark:hover:text-dark-300'
            }`}
          >
            Requests ({friendRequests.length})
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400">
            {success}
          </div>
        )}

        {/* Search Bar */}
        {activeTab === 'users' && (
          <div className="mb-6">
            <Input
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
              placeholder="Search users..."
              className="bg-white dark:bg-dark-700 border-gray-300 dark:border-dark-600 text-gray-900 dark:text-white"
            />
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="bg-white dark:bg-dark-800 border-gray-200 dark:border-dark-700 shadow-sm dark:shadow-lg">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar
                      name={user.displayName}
                      size="md"
                      src={user.avatarUrl}
                      className="border-2 border-gray-300 dark:border-dark-600"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{user.displayName}</h3>
                      <p className="text-gray-500 dark:text-dark-400 text-sm">@{user.username}</p>
                      {user.bio && (
                        <p className="text-gray-600 dark:text-dark-300 text-sm mt-1">{user.bio}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    {isFriend(user.id) ? (
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-sm">
                        Friends
                      </span>
                    ) : hasPendingRequest(user.id) ? (
                      <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-sm">
                        Pending
                      </span>
                    ) : (
                      <Button
                        onClick={() => handleSendFriendRequest(user.id)}
                        disabled={loading}
                        className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                      >
                        Add Friend
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="space-y-4">
            {friends.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-dark-400">No friends yet</p>
                <p className="text-gray-400 dark:text-dark-500 text-sm mt-2">Start connecting with other users!</p>
              </div>
            ) : (
              friends.map((friend) => (
                <Card key={friend.id} className="bg-white dark:bg-dark-800 border-gray-200 dark:border-dark-700 shadow-sm dark:shadow-lg">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar
                        name={friend.friendUser?.displayName || 'Friend'}
                        size="md"
                        src={friend.friendUser?.avatarUrl}
                        className="border-2 border-gray-300 dark:border-dark-600"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {friend.friendUser?.displayName || 'Unknown User'}
                        </h3>
                        <p className="text-gray-500 dark:text-dark-400 text-sm">
                          @{friend.friendUser?.username || 'unknown'}
                        </p>
                        {friend.friendUser?.bio && (
                          <p className="text-gray-600 dark:text-dark-300 text-sm mt-1">{friend.friendUser.bio}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => handleMessage(
                          friend.userB === currentUser.id ? friend.userA : friend.userB,
                          friend.friendUser?.displayName || 'Friend'
                        )}
                        disabled={loading}
                        className="text-gray-600 dark:text-dark-300 hover:text-gray-800 dark:hover:text-white border-gray-300 dark:border-dark-600"
                      >
                        Message
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleRemoveFriend(
                          friend.userB === currentUser.id ? friend.userA : friend.userB,
                          friend.friendUser?.displayName || 'Friend'
                        )}
                        disabled={loading}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border-red-300 dark:border-red-800"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Friend Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {friendRequests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-dark-400">No friend requests</p>
                <p className="text-gray-400 dark:text-dark-500 text-sm mt-2">You're all caught up!</p>
              </div>
            ) : (
              friendRequests.map((request) => (
                <Card key={request.id} className="bg-white dark:bg-dark-800 border-gray-200 dark:border-dark-700 shadow-sm dark:shadow-lg">
                  <div className="p-4">
                    <div className="flex items-center space-x-4 mb-4">
                      <Avatar
                        name={request.fromUser?.displayName || 'User'}
                        size="md"
                        src={request.fromUser?.avatarUrl}
                        className="border-2 border-gray-300 dark:border-dark-600"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {request.fromUser?.displayName || 'Unknown User'}
                        </h3>
                        <p className="text-gray-500 dark:text-dark-400 text-sm">
                          @{request.fromUser?.username || 'unknown'}
                        </p>
                        {request.message && (
                          <p className="text-gray-600 dark:text-dark-300 text-sm mt-2">{request.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleAcceptRequest(request.id)}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                      >
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleDeclineRequest(request.id)}
                        disabled={loading}
                        variant="outline"
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border-red-300 dark:border-red-800"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
