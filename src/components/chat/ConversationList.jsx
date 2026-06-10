import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Check, Clock } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ConversationList({ conversations = [], profiles = {}, currentUserId, onSelect }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm', { locale: ptBR });
    if (isYesterday(date)) return 'Ontem';
    return format(date, 'dd/MM', { locale: ptBR });
  };

  const getOtherUser = (conv) => {
    const otherId = conv.user_id === currentUserId ? conv.nutritionist_id : conv.user_id;
    return profiles[otherId] || {};
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Clock size={14} className="text-yellow-500" />;
      case 'accepted':
        return <Check size={14} className="text-emerald-500" />;
      default:
        return null;
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <MessageCircle size={32} className="text-emerald-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Nenhuma conversa</h3>
        <p className="text-sm text-gray-500 text-center">
          Inicie uma conversa com um nutricionista para começar seu acompanhamento.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {conversations.map((conv, idx) => {
        const otherUser = getOtherUser(conv);
        return (
          <motion.div
            key={conv.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onSelect(conv)}
            className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            {/* Avatar */}
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden">
                {otherUser.photo_url ? (
                  <img src={otherUser.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-emerald-600 font-semibold text-lg">
                    {otherUser.first_name?.[0] || '?'}
                  </span>
                )}
              </div>
              {otherUser.user_type === 'nutritionist' && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                  <span className="text-white text-xs">N</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <h4 className="font-semibold text-gray-800 truncate">
                  {otherUser.first_name} {otherUser.last_name}
                </h4>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {formatDate(conv.last_message_date)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(conv.status)}
                <p className="text-sm text-gray-500 truncate">
                  {conv.last_message || 'Sem mensagens'}
                </p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}