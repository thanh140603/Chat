import { useEffect } from 'react';
import { AuthPage } from './pages/AuthPage';
import { ChatPage } from './pages/ChatPage';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { useAuth } from './hooks/useAuth';
import { userService } from './services/userService';
import { useAuthStore } from './stores/authStore';
import { useChatStore } from './stores/chatStore';
import conversationService from './services/conversationService';
import { authService } from './services/authService';
import './App.css';

function App() {
  const { isAuthenticated, user, register, logout, isLoading, error, setLoading } = useAuth();
  const { login: setUser } = useAuthStore();
  const { conversations, setConversations } = useChatStore();

  const handleLogin = async (credentials: { username: string; password: string }) => {
    try {
      setLoading(true);
      await authService.login(credentials);
      const userInfo = await authService.checkAuth();
      try {
        const profile = await userService.getCurrentUser();
        setUser({
          id: profile.id || (userInfo as any)?.id || (userInfo as any)?.userId,
          username: profile.username || userInfo?.username || credentials.username,
          displayName: profile.displayName || userInfo?.displayName || credentials.username,
          avatar: profile.avatarUrl,
          email: profile.email,
          bio: profile.bio,
          phone: profile.phone,
        });
      } catch (e) {
        setUser({
          id: (userInfo as any)?.id || (userInfo as any)?.userId || 'unknown-id',
          username: userInfo?.username || credentials.username,
          displayName: userInfo?.displayName || credentials.username,
        });
      }
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    const checkInitialAuth = async () => {
      try {
        setLoading(true);
        const token = authService.getToken();
        if (!token) {
          setLoading(false);
          return;
        }
        const userInfo = await authService.checkAuth();
        if (userInfo) {
          try {
            const profile = await userService.getCurrentUser();
            setUser({
              id: profile.id || (userInfo as any).id || (userInfo as any).userId,
              username: profile.username || userInfo.username,
              displayName: profile.displayName || userInfo.displayName,
              avatar: profile.avatarUrl,
              email: profile.email,
              bio: profile.bio,
              phone: profile.phone,
            });
          } catch (e) {
            setUser({
              id: (userInfo as any).id || (userInfo as any).userId,
              username: userInfo.username,
              displayName: userInfo.displayName,
            });
          }
        } else {
          logout();
        }
      } catch (err) {
        logout();
      } finally {
        setLoading(false);
      }
    };

    checkInitialAuth();
  }, []); 

  useEffect(() => {
    const loadConversations = async () => {
      if (isAuthenticated && conversations.length === 0) {
        try {
          const apiConversations = await conversationService.getUserConversations();
          const uiConversations = apiConversations.map((conv: any) => ({
            id: conv.id,
            name: conv.name || 'Unnamed Conversation',
            type: (conv.type || 'DIRECT').toString().toLowerCase() === 'group' ? 'group' : 'direct',
            participants: conv.participants?.map((p: any) => ({
              id: p.id,
              name: p.displayName || p.username,
              username: p.username,
              displayName: p.displayName || p.username,
              avatarUrl: p.avatarUrl,
              isOnline: p.isOnline,
              role: ((p.role || 'member') as string).toLowerCase(),
              joinedAt: p.joinedAt,
              lastSeenAt: p.lastSeenAt,
              lastReadMessageId: p.lastReadMessageId,
            })) || [],
            lastMessage: conv.lastMessageContent
              ? {
                  content: conv.lastMessageContent || '',
                  timestamp: conv.lastMessageCreatedAt || conv.updatedAt,
                  senderName: conv.lastMessageSenderName || 'Unknown',
                }
              : undefined,
            unreadCount: conv.unreadCount || 0,
            isFavorite: Boolean(conv.favorite ?? conv.isFavorite),
            isMuted: Boolean(conv.muted ?? conv.isMuted),
            avatarUrl: conv.avatarUrl ?? conv.groupAvatarUrl ?? null,
            pinnedMessageId: conv.pinnedMessageId ?? null,
            pinnedAt: conv.pinnedAt ?? null,
            pinnedByUserId: conv.pinnedByUserId ?? null,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
          }));
          
          setConversations(uiConversations);
        } catch (err) {
          setConversations([]);
        }
      }
    };

    loadConversations();
  }, [isAuthenticated, user?.id, conversations.length]);

  const handleSendMessage = (_conversationId: string, _content: string) => {};

  const handleTyping = (_conversationId: string, _isTyping: boolean) => {};

  const handleCreateConversation = () => {
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      logout();
    } catch (err) {
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-dark-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <AuthPage
        onLogin={handleLogin}
        onRegister={register}
        loading={isLoading}
        error={error || undefined}
      />
    );
  }

  return (
    <>
      {isLoading ? (
        <LoadingSpinner />
      ) : !isAuthenticated ? (
        <AuthPage
          onLogin={handleLogin}
          onRegister={register}
          loading={isLoading}
          error={error || undefined}
        />
      ) : (
        <ChatPage
          user={{
            id: user.id,
            name: user.displayName || 'User',
            avatar: user.avatar,
            username: user.username,
            email: user.email,
            bio: user.bio,
            phone: user.phone
          }}
          conversations={conversations}
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          onCreateConversation={handleCreateConversation}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}

export default App;
