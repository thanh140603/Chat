// UI Components - Avatar
import React from 'react';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-32 h-32 text-2xl',
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gray-300 flex items-center justify-center overflow-hidden ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt || name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          loading="lazy"
          onError={(e) => {
            // Fallback to initials if image fails to load (e.g., tracking prevention blocks cookies)
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <span className="text-gray-600 font-medium">
          {name ? getInitials(name) : '?'}
        </span>
      )}
    </div>
  );
};
