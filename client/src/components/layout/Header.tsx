// Layout Components - Header
import React from 'react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

export interface HeaderProps {
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  onLogout: () => void;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  className = '',
}) => {
  return (
    <header className={`bg-white border-b border-gray-200 px-4 py-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl font-bold text-gray-900">Chat App</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Avatar
              name={user.name}
              src={user.avatar}
              size="sm"
            />
            <span className="text-sm font-medium text-gray-700">{user.name}</span>
          </div>
          
          <Button
            onClick={onLogout}
            variant="outline"
            size="sm"
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};
