'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Send, 
  Smile, 
  Paperclip, 
  Image as ImageIcon,
  Loader2,
  X,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  dealId: string;
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

// Common emoji list
const COMMON_EMOJIS = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣',
  '😊', '😇', '🙂', '🙃', '😉', '😌', '😍',
  '🥰', '😘', '😗', '😙', '😚', '😋', '😛',
  '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎',
  '🤩', '🥳', '😏', '😒', '😞', '😔', '😟',
  '😕', '🙁', '☹️', '😣', '😖', '😫', '😩',
  '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰',
  '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
  '😶', '😐', '😑', '😬', '🙄', '😯', '😦',
  '😧', '😮', '😲', '🥱', '😴', '🤤', '😪',
  '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷',
  '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹',
  '👺', '🤡', '💩', '👻', '💀', '☠️', '👽',
  '👾', '🤖', '🎃', '😺', '😸', '😹', '😻',
  '😼', '😽', '🙀', '😿', '😾', '👋', '🤚',
  '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️',
  '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
  '🖕', '👇', '☝️', '👍', '👎', '👊', '✊',
  '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
  '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿'
];

const MessageInput = ({ 
  dealId, 
  onSendMessage, 
  disabled = false,
  placeholder = "Type a message...",
  className 
}: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 120); // Max 120px (about 5 lines)
    textarea.style.height = `${newHeight}px`;
  }, []);

  // Handle message input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    adjustTextareaHeight();

    // Handle typing indicator
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      // TODO: Emit typing start event via socket
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      // TODO: Emit typing stop event via socket
    }, 1000);
  };

  // Handle send message
  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled || isSending) return;

    try {
      setIsSending(true);
      await onSendMessage(trimmedMessage);
      setMessage('');
      adjustTextareaHeight();
      
      // Clear typing indicator
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newMessage = message.slice(0, start) + emoji + message.slice(end);
    
    setMessage(newMessage);
    setShowEmojiPicker(false);
    
    // Focus back to textarea and set cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      adjustTextareaHeight();
    }, 0);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Adjust height on mount
  useEffect(() => {
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);

  const canSend = message.trim().length > 0 && !disabled && !isSending;

  return (
    <div className={cn("relative", className)}>
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div 
          ref={emojiPickerRef}
          className="absolute bottom-full left-0 mb-2 p-4 glass-card rounded-xl border border-border/40 shadow-lg z-50 w-80"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Emojis</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEmojiPicker(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
            {COMMON_EMOJIS.map((emoji, index) => (
              <button
                key={index}
                onClick={() => handleEmojiSelect(emoji)}
                className="h-8 w-8 flex items-center justify-center hover:bg-muted/20 rounded text-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Container */}
      <div className="glass-card rounded-xl border border-border/40 p-3">
        <div className="flex items-end space-x-2">

          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
        value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={cn(
                "w-full resize-none bg-transparent border-0 outline-none",
                "text-sm placeholder:text-muted-foreground",
                "min-h-[2rem] max-h-[7.5rem] py-1 px-0",
                "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
              )}
              style={{ height: 'auto' }}
            />
          </div>

          {/* Emoji Button */}
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={cn(
              "flex-shrink-0 h-8 w-8 p-0 hover:bg-muted/20",
              showEmojiPicker && "bg-muted/20"
            )}
          >
            <Smile className="h-4 w-4" />
          </Button>

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!canSend}
            size="sm"
            className={cn(
              "flex-shrink-0 h-8 w-8 p-0",
              canSend 
                ? "btn-monad hover:scale-105 transition-transform" 
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Character count and shortcuts */}
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <div className="flex items-center space-x-2">
            {isTyping && (
              <span className="text-monad-purple">Typing...</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {message.length > 0 && (
              <span className={cn(
                message.length > 1000 ? "text-red-400" : "text-muted-foreground"
              )}>
                {message.length}/1000
              </span>
            )}
            <span className="hidden sm:inline">
              Enter to send • Shift+Enter for new line
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageInput; 