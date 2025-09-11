'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Send, MoreVertical, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { socketClient } from '@/lib/socket/client';
import { toast } from 'sonner';
import { format, isToday, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Friend {
  id: string;
  username: string;
  nickname: string;
  profileImageUrl?: string;
  isActive?: boolean;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    nickname: string;
    profileImageUrl?: string;
  };
  receiver: {
    id: string;
    username: string;
    nickname: string;
    profileImageUrl?: string;
  };
}

interface ChatModalProps {
  friend: Friend;
  currentUserId: string;
  onClose: () => void;
}

const ChatModal: React.FC<ChatModalProps> = ({ friend, currentUserId, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // 메시지 내역 불러오기
  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/messages?friendId=${friend.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('메시지를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 스크롤을 맨 아래로
  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }
      }
    }, 100);
  };

  // Socket.io 이벤트 설정
  useEffect(() => {
    const socket = socketClient.connect();

    // 새 메시지 수신
    const handleNewMessage = (data: { message: Message }) => {
      if (data.message.senderId === friend.id) {
        setMessages(prev => [...prev, data.message]);
        scrollToBottom();
        
        // 읽음 처리
        socket.emit('mark_messages_read', {
          messageIds: [data.message.id],
          senderId: friend.id
        });
      }
    };

    // 메시지 읽음 처리
    const handleMessagesRead = (data: { messageIds: string[]; readBy: string }) => {
      if (data.readBy === friend.id) {
        setMessages(prev => prev.map(msg => 
          data.messageIds.includes(msg.id) 
            ? { ...msg, isRead: true, readAt: new Date().toISOString() }
            : msg
        ));
      }
    };

    // 타이핑 상태
    const handleTyping = (data: { userId: string }) => {
      if (data.userId === friend.id) {
        setIsTyping(true);
      }
    };

    const handleStoppedTyping = (data: { userId: string }) => {
      if (data.userId === friend.id) {
        setIsTyping(false);
      }
    };

    // 이벤트 리스너 등록
    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('user_typing_chat', handleTyping);
    socket.on('user_stopped_typing_chat', handleStoppedTyping);

    // 메시지 내역 요청
    socket.emit('request_message_history', {
      friendId: friend.id,
      limit: 50
    });

    socket.on('message_history', (data: { messages: Message[] }) => {
      setMessages(data.messages);
      setIsLoading(false);
      scrollToBottom();
    });

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
      socket.off('user_typing_chat', handleTyping);
      socket.off('user_stopped_typing_chat', handleStoppedTyping);
      socket.off('message_history');
    };
  }, [friend.id]);

  // 메시지 전송
  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    const socket = socketClient.getSocket();
    if (!socket) {
      toast.error('연결이 끊어졌습니다. 새로고침 해주세요.');
      return;
    }

    setIsSending(true);
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      senderId: currentUserId,
      receiverId: friend.id,
      content: newMessage.trim(),
      isRead: false,
      createdAt: new Date().toISOString(),
      sender: {
        id: currentUserId,
        username: '',
        nickname: '',
        profileImageUrl: undefined
      },
      receiver: friend
    };

    // 임시 메시지 추가
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    scrollToBottom();

    // Socket.io로 전송
    socket.emit('send_message', {
      receiverId: friend.id,
      content: tempMessage.content,
      tempId
    });

    // 메시지 전송 확인
    socket.once('message_sent', (data: { message: Message; tempId: string }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.tempId ? data.message : msg
      ));
      setIsSending(false);
    });

    socket.once('message_error', (data: { error: string; tempId: string }) => {
      setMessages(prev => prev.filter(msg => msg.id !== data.tempId));
      toast.error(data.error);
      setIsSending(false);
    });
  };

  // 타이핑 이벤트
  const handleTyping = useCallback(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;

    socket.emit('typing_start_chat', { receiverId: friend.id });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop_chat', { receiverId: friend.id });
    }, 1000);
  }, [friend.id]);

  // 날짜 포맷팅
  const formatMessageDate = (date: string) => {
    const messageDate = new Date(date);
    
    if (isToday(messageDate)) {
      return format(messageDate, 'a h:mm', { locale: ko });
    } else if (isYesterday(messageDate)) {
      return `어제 ${format(messageDate, 'a h:mm', { locale: ko })}`;
    } else {
      return format(messageDate, 'MM월 dd일 a h:mm', { locale: ko });
    }
  };

  // 이니셜 생성
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <AnimatePresence>
      {/* Semi-transparent backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30
        }}
        className={cn(
          "fixed z-50",
          "bg-white rounded-lg shadow-2xl border",
          isMinimized ? "h-14 w-80" : "h-[500px] w-[400px]",
          "flex flex-col"
        )}
        style={{
          position: 'fixed',
          top: '250px',  // 헤더 아래 위치 (100px 더 아래로)
          right: '40px',
          maxHeight: 'calc(100vh - 290px)'
        }}
      >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 border-b cursor-pointer select-none"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={friend.profileImageUrl} />
            <AvatarFallback>{getInitials(friend.nickname)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{friend.nickname}</p>
            {friend.isActive && !isMinimized && (
              <p className="text-xs text-green-600">접속중</p>
            )}
            {isTyping && !isMinimized && (
              <p className="text-xs text-gray-500">입력중...</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
          >
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              isMinimized ? "rotate-180" : ""
            )} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      {!isMinimized && (
        <>
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">메시지 불러오는 중...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">아직 대화가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => {
                  const isSentByMe = message.senderId === currentUserId;
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        isSentByMe ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg px-3 py-2",
                          isSentByMe 
                            ? "bg-blue-500 text-white" 
                            : "bg-gray-100 text-gray-900"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <div className={cn(
                          "flex items-center gap-1 mt-1",
                          isSentByMe ? "justify-end" : "justify-start"
                        )}>
                          <p className={cn(
                            "text-xs",
                            isSentByMe ? "text-blue-100" : "text-gray-500"
                          )}>
                            {formatMessageDate(message.createdAt)}
                          </p>
                          {isSentByMe && message.isRead && (
                            <span className="text-xs text-blue-100">읽음</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-3 py-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="메시지 입력..."
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="flex-1"
                disabled={isSending}
              />
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={!newMessage.trim() || isSending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
      </motion.div>
    </AnimatePresence>
  );
};

export default ChatModal;