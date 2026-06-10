import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search, Phone, Video, MoreVertical, Send,
  Circle, Check, CheckCheck, Hourglass
} from 'lucide-react';
import { hasSupabase, supabase } from '@/lib/supabaseClient';
import { createNotification, NotificationTemplates } from '@/components/notifications/NotificationHelper';

export default function Chat() {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      const user = await appClient.auth.me();
      setCurrentUser(user);
      
      const profiles = await appClient.entities.UserProfile.filter({ created_by: user.email });
      setCurrentProfile(profiles[0]);
    };
    fetchUser();
  }, []);

  const isNutritionist = currentProfile?.user_type === 'nutritionist';

  // Fetch conversations
  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      if (isNutritionist) {
        return appClient.entities.Conversation.filter({ nutritionist_id: user.email }, '-last_message_date');
      } else {
        return appClient.entities.Conversation.filter({ user_id: user.email }, '-last_message_date');
      }
    },
    enabled: !!currentUser,
    refetchInterval: 12000, // realtime cobre a maior parte; polling apenas como safety net
    refetchOnWindowFocus: true,
    initialData: []
  });

  // Fetch all profiles
  const { data: profiles } = useQuery({
    queryKey: ['chatProfiles'],
    queryFn: async () => {
      const allProfiles = await appClient.entities.UserProfile.list();
      return allProfiles.reduce((acc, p) => {
        acc[p.created_by] = p;
        return acc;
      }, {});
    },
    initialData: {}
  });

  // Fetch messages for selected conversation
  const { data: messages } = useQuery({
    queryKey: ['messages', selectedConversation?.id],
    queryFn: () => appClient.entities.ChatMessage.filter({
      conversation_id: selectedConversation.id
    }, 'created_date'),
    enabled: !!selectedConversation,
    refetchInterval: 10000, // realtime push cuida do tempo real
    refetchOnWindowFocus: true,
    initialData: []
  });

  // Realtime: instant push from Postgres for chat tables
  useEffect(() => {
    if (!hasSupabase || !supabase || !currentUser) return undefined;
    const channelName = `chat-${currentUser.email}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_message' }, () => {
        queryClient.invalidateQueries({ queryKey: ['messages'] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['nutriConversations'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation' }, () => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['nutriConversations'] });
        queryClient.invalidateQueries({ queryKey: ['pendingPatientRequests'] });
        queryClient.invalidateQueries({ queryKey: ['activePatients'] });
      });
    channel.subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [currentUser, queryClient]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText) => {
      const user = await appClient.auth.me();
      const receiverId = selectedConversation.user_id === user.email 
        ? selectedConversation.nutritionist_id 
        : selectedConversation.user_id;

      await appClient.entities.ChatMessage.create({
        conversation_id: selectedConversation.id,
        sender_id: user.email,
        receiver_id: receiverId,
        message: messageText
      });

      const updateData = {
        last_message: messageText,
        last_message_date: new Date().toISOString(),
        __expected_updated_date: selectedConversation.updated_date
      };

      if (!isNutritionist) {
        updateData.user_messages_count = (selectedConversation.user_messages_count || 0) + 1;
      }

      await appClient.entities.Conversation.update(selectedConversation.id, updateData);

      // Notifica receiver (apenas em conversas accepted, para nao spammar a pending request)
      if (selectedConversation.status === 'accepted') {
        try {
          const senderProfile = profiles?.[user.email];
          const senderName = senderProfile
            ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim()
            : user.email;
          const tpl = isNutritionist
            ? NotificationTemplates.newNutritionistMessage(senderName)
            : NotificationTemplates.newPatientMessage(senderName);
          await createNotification(receiverId, tpl.type, tpl.title, tpl.message, tpl.actionUrl, { conversation_id: selectedConversation.id });
        } catch (notifyError) {
          console.warn('Falha ao notificar receiver da nova mensagem', notifyError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setNewMessage('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  });

  // Accept conversation (nutritionist only)
  const acceptConversationMutation = useMutation({
    mutationFn: (conversation) => appClient.entities.Conversation.update(conversation.id, {
      status: 'accepted',
      __expected_updated_date: conversation.updated_date
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  // Reject conversation (nutritionist only)
  const rejectConversationMutation = useMutation({
    mutationFn: (conversation) => appClient.entities.Conversation.update(conversation.id, {
      status: 'rejected',
      __expected_updated_date: conversation.updated_date
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedConversation(null);
    }
  });

  const getOtherUser = (conv) => {
    const otherId = conv.user_id === currentUser?.email 
      ? conv.nutritionist_id 
      : conv.user_id;
    return profiles[otherId];
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  const canSendMessage = () => {
    if (!selectedConversation) return false;
    return selectedConversation.status === 'accepted';
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const otherUser = getOtherUser(conv);
    const searchLower = searchQuery.toLowerCase();
    return otherUser?.first_name?.toLowerCase().includes(searchLower) ||
           otherUser?.last_name?.toLowerCase().includes(searchLower) ||
           conv.last_message?.toLowerCase().includes(searchLower);
  });

  const otherUser = selectedConversation ? getOtherUser(selectedConversation) : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN - Conversations List */}
        <div className="w-full md:w-96 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Conversas</h1>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar conversa..."
                className="pl-10 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="text-gray-400" size={24} />
                </div>
                <p className="text-gray-500">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredConversations.map((conv) => {
                  const other = getOtherUser(conv);
                  const isSelected = selectedConversation?.id === conv.id;
                  const isPending = conv.status === 'pending';

                  return (
                    <motion.button
                      key={conv.id}
                      whileHover={{ backgroundColor: 'rgba(16, 185, 129, 0.05)' }}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full p-4 flex items-start gap-3 text-left transition-colors ${
                        isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden">
                          {other?.photo_url ? (
                            <img src={other.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-emerald-600 font-semibold text-lg">
                              {other?.first_name?.[0] || '?'}
                            </span>
                          )}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-semibold text-gray-800 truncate">
                            {other?.first_name} {other?.last_name}
                          </h3>
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                            {conv.last_message_date && format(new Date(conv.last_message_date), 'HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate mb-1">
                          {conv.last_message || 'Sem mensagens'}
                        </p>
                        {isPending && (
                          <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                            Pendente
                          </span>
                        )}
                      </div>

                      {/* Unread Badge */}
                      {!isSelected && (
                        <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - Active Chat */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden">
                      {otherUser?.photo_url ? (
                        <img src={otherUser.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-emerald-600 font-semibold">
                          {otherUser?.first_name?.[0] || '?'}
                        </span>
                      )}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-800">
                      {otherUser?.first_name} {otherUser?.last_name}
                    </h2>
                    <p className="text-sm text-emerald-600 flex items-center gap-1">
                      <Circle className="fill-current" size={8} />
                      Online
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Phone size={20} className="text-gray-600" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Video size={20} className="text-gray-600" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <MoreVertical size={20} className="text-gray-600" />
                  </motion.button>
                </div>
              </div>

              {/* Accept Banner (Nutritionist Only) */}
              {isNutritionist && selectedConversation.status === 'pending' && (
                <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                  <p className="text-sm text-amber-800">Nova solicitação de conversa</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => acceptConversationMutation.mutate(selectedConversation)}
                      disabled={acceptConversationMutation.isPending}
                      className="bg-emerald-500 hover:bg-emerald-600 h-8"
                    >
                      {acceptConversationMutation.isPending ? 'Aceitando...' : 'Aceitar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectConversationMutation.mutate(selectedConversation)}
                      disabled={rejectConversationMutation.isPending}
                      className="h-8"
                    >
                      {rejectConversationMutation.isPending ? 'Recusando...' : 'Recusar'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Waiting Banner (Athlete Only) */}
              {!isNutritionist && selectedConversation.status === 'pending' && (
                <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Hourglass size={18} className="text-amber-600 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-900">Aguardando aceitação da nutricionista</p>
                    <p className="text-xs text-amber-700">Sua solicitação foi enviada. Você poderá conversar assim que a nutricionista aceitar.</p>
                  </div>
                </div>
              )}

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50/50 to-white">
                <AnimatePresence initial={false}>
                  {messages.map((msg, idx) => {
                    const isOwn = msg.sender_id === currentUser?.email;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                          <div className={`px-4 py-3 rounded-2xl ${
                            isOwn 
                              ? 'bg-emerald-500 text-white rounded-br-sm' 
                              : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
                          }`}>
                            <p className="text-sm leading-relaxed">{msg.message}</p>
                          </div>
                          <div className="flex items-center gap-1 px-2">
                            <span className="text-xs text-gray-400">
                              {format(new Date(msg.created_date), 'HH:mm', { locale: ptBR })}
                            </span>
                            {isOwn && (
                              msg.read ? (
                                <CheckCheck size={14} className="text-emerald-500" />
                              ) : (
                                <Check size={14} className="text-gray-400" />
                              )
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-6 border-t border-gray-100 bg-white">
                <div className="flex items-end gap-3">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder={
                      selectedConversation.status === 'pending'
                        ? (isNutritionist ? 'Aceite a conversa para responder' : 'Aguardando aceitação...')
                        : 'Digite sua mensagem...'
                    }
                    disabled={!canSendMessage()}
                    className="flex-1 resize-none rounded-2xl bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-emerald-500 px-4 py-3"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || !canSendMessage()}
                    className="px-6 py-3 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={20} />
                  </motion.button>
                </div>

                {/* Info Text */}
                <p className="text-xs text-gray-400 text-center mt-3">
                  {isNutritionist ? (
                    selectedConversation.status === 'pending'
                      ? 'Aceite a conversa para começar a responder'
                      : 'Você pode enviar mensagens ilimitadas'
                  ) : (
                    selectedConversation.status === 'pending'
                      ? 'Aguardando a nutricionista aceitar a conversa...'
                      : 'Plano Premium ativo ⬢ Mensagens ilimitadas'
                  )}
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Selecione uma conversa
                </h3>
                <p className="text-gray-500">
                  Escolha uma conversa para começar a conversar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
