// Chat Components - GroupManagementModal
import React, { useState, useEffect, useRef } from 'react';
import { Avatar } from '../ui/Avatar';
import { friendService } from '../../services/friendService';
import conversationService, { type Participant } from '../../services/conversationService';

export interface GroupManagementModalProps {
  conversationId: string;
  conversationName: string;
  conversationAvatarUrl?: string;
  participants: Participant[];
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const GroupManagementModal: React.FC<GroupManagementModalProps> = ({
  conversationId,
  conversationName,
  conversationAvatarUrl,
  participants,
  currentUserId,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'add'>('info');
  const [groupName, setGroupName] = useState(conversationName);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(conversationAvatarUrl);
  const [friends, setFriends] = useState<Array<{ id: string; username?: string; displayName?: string; avatar?: string }>>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentParticipant = participants.find(p => p.id === currentUserId);
  const isAdmin = currentParticipant?.role === 'admin';

  useEffect(() => {
    if (isOpen && activeTab === 'add') {
      loadFriends();
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (isOpen) {
      setGroupName(conversationName);
      setAvatarPreview(conversationAvatarUrl);
      setSelectedFriendIds([]);
      setError(null);
    }
  }, [isOpen, conversationName, conversationAvatarUrl]);

  const loadFriends = async () => {
    try {
      const friendsList = await friendService.getFriends();
      // Filter out friends who are already participants
      const participantIds = new Set(participants.map(p => p.id));
      const availableFriends = friendsList.filter(f => !participantIds.has(f.id));
      setFriends(availableFriends);
    } catch (err: any) {
      setError('Failed to load friends');
    }
  };

  const handleUpdateGroupName = async () => {
    if (!groupName.trim() || groupName === conversationName) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await conversationService.updateConversation(conversationId, { groupName: groupName.trim() });
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update group name');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Avatar must be smaller than 5MB');
      return;
    }

    try {
      setAvatarUploading(true);
      setError(null);
      const updatedConversation = await conversationService.updateGroupAvatar(conversationId, file);
      const newAvatar = updatedConversation.avatarUrl ?? undefined;
      setAvatarPreview(newAvatar || conversationAvatarUrl || undefined);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to update group avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleAvatarUpload(file);
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleAddMembers = async () => {
    if (selectedFriendIds.length === 0) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await conversationService.addMembers(conversationId, { memberIds: selectedFriendIds });
      onUpdate();
      setSelectedFriendIds([]);
      setActiveTab('members');
      // Reload friends list to update available friends
      await loadFriends();
    } catch (err: any) {
      setError(err.message || 'Failed to add members');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from this group?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await conversationService.removeMember(conversationId, userId);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'member') => {
    try {
      setLoading(true);
      setError(null);
      await conversationService.updateParticipantRole(conversationId, userId, { role: newRole });
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriendIds(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-dark-800 rounded-xl border border-dark-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h2 className="text-xl font-semibold text-white">Group Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-dark-700 rounded-full flex items-center justify-center hover:bg-dark-600 transition-colors"
          >
            <svg className="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-700">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'info'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            Group Info
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'members'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            Members ({participants.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'add'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            Add Members
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {activeTab === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Group Avatar</label>
                <div className="flex items-center gap-4">
                  <Avatar
                    name={groupName}
                    src={avatarPreview}
                    size="xl"
                    className="border-2 border-dark-600"
                  />
                  <div className="space-y-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploading}
                      className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {avatarUploading ? 'Uploading...' : (avatarPreview ? 'Change Avatar' : 'Upload Avatar')}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />
                    <p className="text-xs text-dark-400">
                      Recommended square image, maximum 5MB.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter group name"
                />
              </div>
              <button
                onClick={handleUpdateGroupName}
                disabled={loading || !groupName.trim() || groupName === conversationName}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-3">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between rounded-xl border border-dark-600/60 bg-dark-700/60 px-4 py-3 shadow-sm backdrop-blur transition-all hover:border-purple-500/40 hover:bg-dark-700/80"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar
                      name={participant.displayName || participant.username}
                      src={participant.avatarUrl}
                      size="sm"
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {participant.displayName || participant.username}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            participant.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : 'bg-dark-600 text-dark-200 border border-dark-500/60'
                          }`}
                        >
                          {participant.role === 'admin' ? 'Admin' : 'Member'}
                        </span>
                      </div>
                      <p className="text-xs text-dark-300">{participant.username}</p>
                    </div>
                  </div>
                  {isAdmin && participant.id !== currentUserId && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={participant.role}
                        onChange={(e) => handleUpdateRole(participant.id, e.target.value as 'admin' | 'member')}
                        disabled={loading}
                        className="rounded-lg border border-dark-500/70 bg-dark-800/80 px-3 py-1.5 text-sm text-white shadow-sm transition focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:opacity-60"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(participant.id, participant.displayName || participant.username)}
                        disabled={loading}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-200 transition hover:bg-red-500/15 focus:outline-none focus:ring-2 focus:ring-red-500/30 disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'add' && isAdmin && (
            <div className="space-y-4">
              <div className="max-h-96 overflow-y-auto space-y-2">
                {friends.length === 0 ? (
                  <p className="text-center text-dark-400 py-8">No friends available to add</p>
                ) : (
                  friends.map((friend) => (
                    <label
                      key={friend.id}
                      className="flex items-center space-x-3 p-3 bg-dark-700 rounded-lg cursor-pointer hover:bg-dark-600 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFriendIds.includes(friend.id)}
                        onChange={() => toggleFriendSelection(friend.id)}
                        className="w-4 h-4 text-purple-600 bg-dark-800 border-dark-600 rounded focus:ring-purple-500"
                      />
                      <Avatar
                        name={friend.displayName || friend.username || friend.id}
                        src={friend.avatar}
                        size="sm"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-white">
                          {friend.displayName || friend.username || friend.id}
                        </span>
                        {friend.username && (
                          <p className="text-xs text-dark-400">{friend.username}</p>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
              {selectedFriendIds.length > 0 && (
                <button
                  onClick={handleAddMembers}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : `Add ${selectedFriendIds.length} member(s)`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

