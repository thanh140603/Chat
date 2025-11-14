import React from 'react';

interface ForwardMessageModalProps {
  isOpen: boolean;
  conversations: Array<{ id: string; name: string; isFavorite?: boolean }>;
  onClose: () => void;
  onSubmit: (conversationId: string, comment: string) => void;
  isSubmitting?: boolean;
  selectedMessagesCount: number;
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  conversations,
  onClose,
  onSubmit,
  isSubmitting = false,
  selectedMessagesCount,
}) => {
  const [targetConversationId, setTargetConversationId] = React.useState<string>('');
  const [comment, setComment] = React.useState('');

  React.useEffect(() => {
    if (!isOpen) {
      setTargetConversationId('');
      setComment('');
    } else if (conversations.length > 0) {
      setTargetConversationId(conversations[0].id);
    }
  }, [isOpen, conversations]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!targetConversationId) {
      alert('Please select a conversation to forward to.');
      return;
    }
    onSubmit(targetConversationId, comment.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-dark-800 border border-dark-700 rounded-xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Forward message</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-dark-700 text-dark-300"
            title="Close"
            type="button"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-dark-300">
          Forwarding <span className="text-white font-semibold">{selectedMessagesCount}</span>{' '}
          {selectedMessagesCount === 1 ? 'message' : 'messages'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-1" htmlFor="targetConversation">
              Conversation
            </label>
            <select
              id="targetConversation"
              value={targetConversationId}
              onChange={(e) => setTargetConversationId(e.target.value)}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {conversations.map((conversation) => (
                <option key={conversation.id} value={conversation.id}>
                  {conversation.name}
                  {conversation.isFavorite ? ' ★' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-200 mb-1" htmlFor="forwardComment">
              Add a comment (optional)
            </label>
            <textarea
              id="forwardComment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Add a note to include with the forwarded message..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-dark-700 text-white hover:bg-dark-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? 'Forwarding...' : 'Forward'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForwardMessageModal;

