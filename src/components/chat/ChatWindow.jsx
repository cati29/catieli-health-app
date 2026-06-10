import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, MoreVertical, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ChatWindow({ 
  conversation, 
  messages = [], 
  currentUserId,
  otherUser,
  onSendMessage, 
  onBack,
  canSendMessage = true,
  messageLimit 
}) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim() || !canSendMessage) return;
    onSendMessage(newMessage.trim());
    setNewMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-white border-b shadow-sm">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
          {otherUser?.photo_url ? (
            <img src={otherUser.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-emerald-600 font-semibold">
              {otherUser?.first_name?.[0] || '?'}
            </span>
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">
            {otherUser?.first_name} {otherUser?.last_name}
          </h3>
          {otherUser?.user_type === 'nutritionist' && (
            <p className="text-xs text-emerald-600">Nutricionista</p>
          )}
        </div>
        
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <MoreVertical size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            const isOwn = msg.sender_id === currentUserId;
            return (
              <motion.div
                key={msg.id || idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                    isOwn
                      ? 'bg-emerald-500 text-white rounded-br-md'
                      : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <span className={`text-xs ${isOwn ? 'text-emerald-100' : 'text-gray-400'}`}>
                      {msg.created_date && format(new Date(msg.created_date), 'HH:mm', { locale: ptBR })}
                    </span>
                    {isOwn && (
                      msg.read ? (
                        <CheckCheck size={14} className="text-emerald-100" />
                      ) : (
                        <Check size={14} className="text-emerald-100" />
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

      {/* Message Limit Warning */}
      {!canSendMessage && (
        <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200">
          <p className="text-sm text-yellow-700 text-center">
            {messageLimit === 'waiting_acceptance' 
              ? 'Aguardando o nutricionista aceitar a conversa...'
              : 'Você atingiu o limite de mensagens gratuitas. Contrate um plano para continuar.'}
          </p>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-white border-t">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={canSendMessage ? "Digite sua mensagem..." : "Não é possível enviar mensagens"}
            disabled={!canSendMessage}
            className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!newMessage.trim() || !canSendMessage}
            className="p-3 bg-emerald-500 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors"
          >
            <Send size={20} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}