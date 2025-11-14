// Layout Components - NavigationSidebar
import React from 'react';
import { Avatar } from '../ui/Avatar';
import { useTheme } from '../../contexts/ThemeContext';

export interface NavigationSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onShowProfile?: () => void;
  onLogout?: () => void;
  currentUser?: {
    id: string;
    name: string;
    avatar?: string;
  };
  className?: string;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  activeTab,
  onTabChange,
  onShowProfile,
  onLogout,
  currentUser,
  className = '',
}) => {
  const { theme, toggleTheme } = useTheme();
  const navItems = [
    { id: 'messages', icon: '💬', label: 'Messages' },
    { id: 'social', icon: '👥', label: 'Social' },
  ];

  return (
    <div className={`w-20 bg-dark-800 dark:bg-dark-800 bg-gray-100 flex flex-col items-center py-6 space-y-6 border-r border-dark-700 dark:border-dark-700 border-gray-200 ${className}`}>
      {/* User Avatar - Clickable to show profile */}
      {currentUser && onShowProfile && (
        <button
          onClick={onShowProfile}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-200 ${
            activeTab === 'profile'
              ? 'bg-purple-600 dark:bg-purple-600'
              : 'hover:bg-dark-700 dark:hover:bg-dark-700 hover:bg-gray-200'
          }`}
          title="Profile"
        >
          <Avatar
            name={currentUser.name}
            size="md"
            src={currentUser.avatar}
            className="border-2 border-purple-600"
          />
        </button>
      )}

      {/* Navigation Items */}
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-white dark:text-white text-gray-700 transition-colors duration-200 ${
            activeTab === item.id
              ? 'bg-purple-600 dark:bg-purple-600'
              : 'hover:bg-dark-700 dark:hover:bg-dark-700 hover:bg-gray-200'
          }`}
          title={item.label}
        >
          <span className="text-2xl font-medium">{item.icon}</span>
        </button>
      ))}

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="w-16 h-16 rounded-full flex items-center justify-center text-white dark:text-white text-gray-700 hover:bg-dark-700 dark:hover:bg-dark-700 hover:bg-gray-200 transition-colors duration-200"
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {theme === 'dark' ? (
          <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
          </svg>
        ) : (
          <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10 10 0 01-19.172 0 .75.75 0 01.982-.98zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Logout Button */}
      {onLogout && (
        <button
          onClick={onLogout}
          className="w-16 h-16 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors duration-200 mt-auto"
          title="Logout"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      )}
    </div>
  );
};
