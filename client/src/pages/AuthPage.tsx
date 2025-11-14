// Pages - AuthPage
import React, { useState } from 'react';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import chisaImage from '../assets/chisa.jpg';

export interface AuthPageProps {
  onLogin: (credentials: { username: string; password: string }) => Promise<void>;
  onRegister: (userData: { 
    username: string; 
    password: string; 
    displayName: string; 
    email?: string;
    phone?: string;
    bio?: string;
  }) => Promise<void>;
  loading?: boolean;
  error?: string;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onLogin,
  onRegister,
  loading = false,
  error,
}) => {
  const [isLogin, setIsLogin] = useState(true);
  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Column - Image (1/3 width) */}
      <div 
        className="w-1/3 relative"
        style={{
          backgroundImage: `url(${chisaImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          minHeight: '100vh'
        }}
      >
      </div>

      {/* Right Column - Form (2/3 width) */}
      <div className="w-2/3 bg-white flex flex-col">
        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-6">
            {/* Form Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              {isLogin ? (
                <LoginForm
                  onSubmit={onLogin}
                  loading={loading}
                  error={error}
                  onSwitchToRegister={() => setIsLogin(false)}
                />
              ) : (
                <RegisterForm
                  onSubmit={onRegister}
                  loading={loading}
                  error={error}
                  onSwitchToLogin={() => setIsLogin(true)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
