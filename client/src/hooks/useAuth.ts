// Hooks - useAuth
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';
import { userService } from '../services/userService';

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    setLoading,
    setError,
    clearError,
  } = useAuthStore();

  const handleLogin = async (credentials: { username: string; password: string }) => {
    try {
      setLoading(true);
      clearError();
      const loginResponse = await authService.login(credentials);
      // After login, fetch user identity and profile to persist accurate data
      const userInfo = await authService.checkAuth();
      type Identity = { id?: string; userId?: string; username?: string; displayName?: string } | null;
      const identity: Identity = userInfo as Identity;
      let id = identity?.id ?? identity?.userId ?? 'unknown-id';
      let username = identity?.username ?? credentials.username;
      let displayName = identity?.displayName ?? username;

      try {
        const profile = await userService.getCurrentUser();
        id = profile.id || id;
        username = profile.username || username;
        displayName = profile.displayName || displayName;
        login({
          id,
          username,
          displayName,
          avatar: profile.avatarUrl,
          email: profile.email,
          bio: profile.bio,
          phone: profile.phone,
        });
      } catch (e) {
        // Fallback to basic identity
        login({ id, username, displayName });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (userData: { 
    username: string; 
    password: string; 
    displayName: string; 
    email?: string;
    phone?: string;
    bio?: string;
  }) => {
    try {
      setLoading(true);
      clearError();
      await authService.register(userData);
      // Get user info from the check endpoint
      const userInfo = await authService.checkAuth();
      if (userInfo) {
        login({
          id: userInfo.id,
          username: userInfo.username,
          displayName: userInfo.displayName,
        });
      } else {
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
    } finally {
      logout();
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    setLoading,
    setError,
    clearError,
  };
};
