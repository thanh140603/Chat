// Pages - ProfilePage
import React, { useState, useEffect } from 'react';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { userService } from '../services/userService';
import { useAuthStore } from '../stores/authStore';

export interface ProfilePageProps {
  user: {
    id: string;
    name: string;
    avatar?: string;
    username?: string;
    email?: string;
    bio?: string;
    phone?: string;
  };
  onBack: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user }) => {
  const { updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state - only essential fields
  const [formData, setFormData] = useState({
    displayName: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    bio: user.bio || '',
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(null);

  // Load user data when component mounts
  useEffect(() => {
    loadUserProfile();
  }, [user.id]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load profile data from API
      try {
        const userData = await userService.getCurrentUser();
        setFormData({
          displayName: userData.displayName || '',
          email: userData.email || '',
          phone: userData.phone || '',
          bio: userData.bio || '',
        });
      } catch (apiError) {
        // Fallback to props data if API fails
        setFormData({
          displayName: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          bio: user.bio || '',
        });
        // Don't show error if we have fallback data
        if (!user.name && !user.email) {
          setError('Failed to load profile data');
        }
      }
    } catch (err) {
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Upload avatar if changed
      let avatarUrlToSave: string | undefined;
      if (avatarFile) {
        const avatarResponse = await userService.uploadAvatar(avatarFile);
        avatarUrlToSave = avatarResponse.avatarUrl;
        setUploadedAvatarUrl(avatarResponse.avatarUrl);
      }

      // Update profile (include avatarUrl if uploaded)
      const updatedUser = await userService.updateProfile({
        ...formData,
        ...(avatarUrlToSave ? { avatarUrl: avatarUrlToSave } : {}),
      });
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      
      // Reset file input, but keep the latest avatar URL for UI
      setAvatarFile(null);
      setAvatarPreview(null);
      if (updatedUser.avatarUrl) setUploadedAvatarUrl(updatedUser.avatarUrl);
      // Sync to global auth store so other parts (navbar/sidebar) reflect immediately
      updateUser({
        displayName: updatedUser.displayName,
        email: updatedUser.email,
        bio: updatedUser.bio,
        phone: updatedUser.phone,
        avatar: updatedUser.avatarUrl,
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setSuccess(null);
    setAvatarFile(null);
    setAvatarPreview(null);
    // Reset form data to original values
    loadUserProfile();
  };

  // Get current date
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  if (loading && !isEditing) {
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome, {formData.displayName || 'User'}</h1>
            <p className="text-gray-500 dark:text-dark-400 text-sm">{currentDate}</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 dark:text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search"
                className="pl-10 pr-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-dark-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            {/* Notification Bell */}
            <button className="p-2 text-gray-400 dark:text-dark-500 hover:text-gray-600 dark:hover:text-dark-300 transition-colors">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5V7a7 7 0 00-14 0v5l-5 5h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            
            {/* User Avatar */}
            <Avatar
              name={formData.displayName}
              size="sm"
              src={avatarPreview || uploadedAvatarUrl || user.avatar}
              className="border-2 border-gray-300 dark:border-dark-600"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Card className="bg-white dark:bg-dark-800 border-gray-200 dark:border-dark-700 shadow-sm dark:shadow-lg">
          {/* Profile Header with Gradient */}
          <div className="relative">
            {/* Gradient Background */}
            <div className="h-32 bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 rounded-t-lg"></div>
            
            {/* User Info Section */}
            <div className="px-6 pb-6">
              <div className="flex items-end -mt-16 space-x-4">
                <div className="relative">
                  <label className="cursor-pointer">
                    <Avatar
                      name={formData.displayName}
                      size="xl"
                      src={avatarPreview || uploadedAvatarUrl || user.avatar}
                      className="border-4 border-white shadow-lg hover:shadow-xl transition-shadow duration-200"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    {/* Edit overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 rounded-full transition-all duration-200 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white opacity-0 hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </label>
                </div>
                
                <div className="flex-1 pb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formData.displayName || 'Your Name'}
                  </h2>
                  <p className="text-gray-600 dark:text-dark-300">{formData.email}</p>
                </div>
                
                <div className="pb-4">
                  {!isEditing ? (
                    <Button
                      onClick={() => setIsEditing(true)}
                      className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                    >
                      Edit
                    </Button>
                  ) : (
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleCancel}
                        variant="outline"
                        className="text-gray-600 dark:text-dark-300 hover:text-gray-800 dark:hover:text-white border-gray-300 dark:border-dark-600"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                      >
                        {loading ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div className="px-6 pb-6">
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

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-2">
                  Display Name
                </label>
                <Input
                  value={formData.displayName}
                  onChange={(value) => handleInputChange('displayName', value)}
                  placeholder="Your display name"
                  disabled={!isEditing}
                  className="bg-gray-50 dark:bg-dark-700 border-gray-300 dark:border-dark-600 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-2">
                  Email Address
                </label>
                <Input
                  value={formData.email}
                  onChange={(value) => handleInputChange('email', value)}
                  placeholder="your.email@example.com"
                  disabled={!isEditing}
                  className="bg-gray-50 dark:bg-dark-700 border-gray-300 dark:border-dark-600 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-2">
                  Phone Number
                </label>
                <Input
                  value={formData.phone}
                  onChange={(value) => handleInputChange('phone', value)}
                  placeholder="+1 (555) 123-4567"
                  disabled={!isEditing}
                  className="bg-gray-50 dark:bg-dark-700 border-gray-300 dark:border-dark-600 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-2">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                  disabled={!isEditing}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Account Information */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-dark-400">User ID:</span>
                  <span className="text-gray-900 dark:text-white ml-2 font-mono">{user.id}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-dark-400">Member since:</span>
                  <span className="text-gray-900 dark:text-white ml-2">January 2024</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-dark-400">Last active:</span>
                  <span className="text-gray-900 dark:text-white ml-2">Now</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-dark-400">Account status:</span>
                  <span className="text-green-600 dark:text-green-400 ml-2 font-medium">Active</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
