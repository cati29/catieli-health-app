import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ArrowLeft, Award, MapPin, Star, MessageCircle,
  Users, Calendar, Heart
} from 'lucide-react';

export default function NutritionistProfile() {
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [initialMessage, setInitialMessage] = useState('');

  // Get nutritionist ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const nutritionistId = urlParams.get('id');

  // Fetch nutritionist profile
  const { data: nutritionist, isLoading } = useQuery({
    queryKey: ['nutritionist', nutritionistId],
    queryFn: async () => {
      const profiles = await appClient.entities.UserProfile.filter({ id: nutritionistId });
      return profiles[0] || null;
    },
    enabled: !!nutritionistId,
    initialData: null
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (message) => {
      const user = await appClient.auth.me();
      
      const conversation = await appClient.entities.Conversation.create({
        user_id: user.email,
        nutritionist_id: nutritionist.created_by,
        status: 'pending',
        last_message: message,
        last_message_date: new Date().toISOString(),
        user_messages_count: 1
      });

      await appClient.entities.ChatMessage.create({
        conversation_id: conversation.id,
        sender_id: user.email,
        receiver_id: nutritionist.created_by,
        message: message
      });

      return conversation;
    },
    onSuccess: () => {
      window.location.href = createPageUrl('Chat');
    }
  });

  const specialtyLabels = {
    weight_loss: 'Emagrecimento',
    health: 'Saúde Geral',
    weight_gain: 'Ganho de Massa',
    sports: 'Nutrição Esportiva',
    clinical: 'Nutrição Clínica',
    other: 'Geral'
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!nutritionist) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Nutricionista não encontrado</h2>
        <Link to={createPageUrl('Nutritionists')}>
          <Button className="bg-emerald-500 hover:bg-emerald-600">
            Voltar para lista
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 pt-8 pb-32 px-6 relative">
        <div className="max-w-lg mx-auto">
          <Link 
            to={createPageUrl('Nutritionists')}
            className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Voltar
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-24">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          {/* Photo */}
          <div className="flex justify-center pt-6">
            <div className="w-28 h-28 rounded-full bg-emerald-100 border-4 border-white shadow-lg overflow-hidden">
              {nutritionist.photo_url ? (
                <img src={nutritionist.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-4xl font-bold text-emerald-500">
                    {nutritionist.first_name?.[0]}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              {nutritionist.first_name} {nutritionist.last_name}
            </h1>
            
            <div className="flex items-center justify-center gap-2 mb-4">
              <Award className="text-emerald-500" size={16} />
              <span className="text-emerald-600 font-medium">CRN: {nutritionist.crm_nutrition}</span>
            </div>

            {/* Specialty Badge */}
            <div className="inline-flex px-4 py-2 bg-emerald-100 rounded-full mb-4">
              <span className="text-emerald-700 font-medium">
                {specialtyLabels[nutritionist.specialty] || 'Nutricionista'}
              </span>
            </div>

            {/* Location */}
            {nutritionist.city && (
              <div className="flex items-center justify-center gap-1 text-gray-500 mb-4">
                <MapPin size={16} />
                <span>{nutritionist.city}</span>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-100 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">50+</p>
                <p className="text-xs text-gray-500">Pacientes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">4.9</p>
                <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                  <Star className="text-amber-400 fill-amber-400" size={12} />
                  Avaliação
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">5</p>
                <p className="text-xs text-gray-500">Anos exp.</p>
              </div>
            </div>

            {/* Bio */}
            {nutritionist.bio && (
              <div className="text-left mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">Sobre</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {nutritionist.bio}
                </p>
              </div>
            )}

            {/* Specialties */}
            <div className="text-left mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Especialidades</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  {specialtyLabels[nutritionist.specialty]}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  Reeducação Alimentar
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  Dieta Personalizada
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => setShowContactDialog(true)}
                className="w-full bg-emerald-500 hover:bg-emerald-600"
              >
                <MessageCircle size={18} className="mr-2" />
                Iniciar Conversa
              </Button>
              <Button
                variant="outline"
                className="w-full border-emerald-200 text-emerald-600 hover:bg-emerald-50"
              >
                <Heart size={18} className="mr-2" />
                Salvar Perfil
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-4 shadow-sm"
          >
            <Calendar className="text-emerald-500 mb-2" size={24} />
            <p className="font-semibold text-gray-800">Disponibilidade</p>
            <p className="text-sm text-gray-500">Seg a Sex, 8h-18h</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-4 shadow-sm"
          >
            <Users className="text-emerald-500 mb-2" size={24} />
            <p className="font-semibold text-gray-800">Atendimento</p>
            <p className="text-sm text-gray-500">Online e Presencial</p>
          </motion.div>
        </div>
      </div>

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar mensagem</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-sm text-blue-700">
                <strong>Primeira mensagem gratuita!</strong> O nutricionista receberá sua mensagem e poderá aceitar para iniciar o acompanhamento.
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-2 block">
                Sua mensagem
              </label>
              <textarea
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="Olá! Gostaria de saber mais sobre seu acompanhamento nutricional..."
                className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowContactDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => createConversationMutation.mutate(initialMessage)}
                disabled={!initialMessage.trim() || createConversationMutation.isPending}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
              >
                Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
