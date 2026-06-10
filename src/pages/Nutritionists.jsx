import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Search, Filter, Star, Award, MapPin,
  Users, MessageCircle
} from 'lucide-react';
import { createNotification, NotificationTemplates } from '@/components/notifications/NotificationHelper';

export default function Nutritionists() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedNutritionist, setSelectedNutritionist] = useState(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [initialMessage, setInitialMessage] = useState('');

  const { data: currentProfiles = [] } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const me = await appClient.auth.me();
      return appClient.entities.UserProfile.filter({ created_by: me.email }, '-created_date', 1);
    },
    initialData: []
  });
  const currentProfile = currentProfiles?.[0];
  const isNutritionist = currentProfile?.user_type === 'nutritionist';

  useEffect(() => {
    if (isNutritionist) {
      navigate(createPageUrl('NutritionistDashboard'), { replace: true });
    }
  }, [isNutritionist, navigate]);

  // Fetch nutritionists
  const { data: nutritionists, isLoading } = useQuery({
    queryKey: ['nutritionists'],
    queryFn: () => appClient.entities.UserProfile.filter({ user_type: 'nutritionist' }),
    initialData: [],
    enabled: !isNutritionist
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async ({ nutritionistId, message }) => {
      const user = await appClient.auth.me();

      const conversation = await appClient.entities.Conversation.create({
        user_id: user.email,
        nutritionist_id: nutritionistId,
        status: 'pending',
        last_message: message,
        last_message_date: new Date().toISOString(),
        user_messages_count: 1
      });

      await appClient.entities.ChatMessage.create({
        conversation_id: conversation.id,
        sender_id: user.email,
        receiver_id: nutritionistId,
        message: message
      });

      // Notifica nutricionista do novo pedido.
      try {
        const me = currentProfile;
        const patientName = me ? `${me.first_name || ''} ${me.last_name || ''}`.trim() : user.email;
        const tpl = NotificationTemplates.newPatientRequest(patientName);
        await createNotification(nutritionistId, tpl.type, tpl.title, tpl.message, tpl.actionUrl, { conversation_id: conversation.id });
      } catch (notifyError) {
        console.warn('Falha ao notificar nutricionista', notifyError);
      }

      return conversation;
    },
    onSuccess: () => {
      setShowContactDialog(false);
      setSelectedNutritionist(null);
      setInitialMessage('');
      window.location.href = createPageUrl('Chat');
    }
  });

  if (isNutritionist) return null;

  const categories = [
    { value: 'all', label: 'Todos' },
    { value: 'weight_loss', label: 'Emagrecimento' },
    { value: 'sports', label: 'Esportiva' },
    { value: 'clinical', label: 'Clínica' },
    { value: 'health', label: 'Funcional' },
    { value: 'other', label: 'Vegetariana' }
  ];

  const specialtyLabels = {
    weight_loss: 'Emagrecimento',
    health: 'Saúde Geral',
    weight_gain: 'Ganho de Massa',
    sports: 'Esportiva',
    clinical: 'Clínica',
    other: 'Geral'
  };

  const filteredNutritionists = nutritionists.filter(n => {
    const matchesSearch = searchQuery === '' || 
      n.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.specialty?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || n.specialty === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleContactClick = (nutritionist) => {
    setSelectedNutritionist(nutritionist);
    setShowContactDialog(true);
  };

  const handleSendMessage = () => {
    if (!initialMessage.trim()) return;
    createConversationMutation.mutate({
      nutritionistId: selectedNutritionist.created_by,
      message: initialMessage
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold text-gray-800 mb-3">
              Encontre seu Nutricionista
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Profissionais qualificados para ajudar na sua jornada de saúde
            </p>
          </motion.div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 max-w-3xl mx-auto">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou especialidade..."
                className="pl-12 h-14 text-base bg-white border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 h-14 bg-white border border-gray-200 rounded-2xl flex items-center gap-2 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Filter size={20} />
              Filtros
            </motion.button>
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap gap-2 justify-center mt-6">
            {categories.map((cat) => (
              <motion.button
                key={cat.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-emerald-500'
                }`}
              >
                {cat.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Result Count */}
        <p className="text-gray-600 mb-6 font-medium">
          <span className="text-emerald-600 font-bold">{filteredNutritionists.length}</span> nutricionistas encontrados
        </p>

        {/* Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-96 animate-pulse" />
            ))}
          </div>
        ) : filteredNutritionists.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredNutritionists.map((nutritionist, idx) => (
                <motion.div
                  key={nutritionist.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -8, transition: { duration: 0.2 } }}
                  className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden border border-gray-100"
                >
                  {/* Card Header */}
                  <div className="relative h-32 bg-gradient-to-br from-emerald-400 to-teal-500 p-6">
                    <div className="absolute -bottom-12 left-6">
                      <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg">
                        <div className="w-full h-full rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden">
                          {nutritionist.photo_url ? (
                            <img src={nutritionist.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-3xl font-bold text-emerald-600">
                              {nutritionist.first_name?.[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* CRN Badge */}
                    <div className="absolute top-4 right-4 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full flex items-center gap-1">
                      <Award className="text-white" size={14} />
                      <span className="text-white text-xs font-medium">CRN</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="pt-16 px-6 pb-6">
                    {/* Name */}
                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                      {nutritionist.first_name} {nutritionist.last_name}
                    </h3>

                    {/* Specialty Badge */}
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 mb-3">
                      {specialtyLabels[nutritionist.specialty] || 'Nutricionista'}
                    </Badge>

                    {/* Bio */}
                    <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-3">
                      {nutritionist.bio || 'Profissional qualificado em nutrição e saúde.'}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-gray-100">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
                          <Star className="fill-current" size={14} />
                          <span className="font-bold text-gray-800">4.9</span>
                        </div>
                        <p className="text-xs text-gray-500">Avaliação</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-emerald-500 mb-1">
                          <Users size={14} />
                          <span className="font-bold text-gray-800">50+</span>
                        </div>
                        <p className="text-xs text-gray-500">Pacientes</p>
                      </div>
                    </div>

                    {/* Location */}
                    {nutritionist.city && (
                      <div className="flex items-center gap-1 text-gray-500 mb-4">
                        <MapPin size={14} />
                        <span className="text-sm">{nutritionist.city}</span>
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      onClick={() => handleContactClick(nutritionist)}
                      className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                      <MessageCircle size={18} className="mr-2" />
                      Iniciar Conversa
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-gray-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Nenhum resultado encontrado
            </h3>
            <p className="text-gray-500">
              Tente ajustar seus filtros de busca
            </p>
          </div>
        )}
      </div>

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Iniciar Conversa</DialogTitle>
          </DialogHeader>
          
          {selectedNutritionist && (
            <div className="space-y-5">
              {/* Nutritionist Info */}
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {selectedNutritionist.photo_url ? (
                    <img src={selectedNutritionist.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-emerald-600">
                      {selectedNutritionist.first_name?.[0]}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">
                    {selectedNutritionist.first_name} {selectedNutritionist.last_name}
                  </h4>
                  <p className="text-sm text-emerald-600 font-medium">
                    {specialtyLabels[selectedNutritionist.specialty]}
                  </p>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-800 leading-relaxed">
                  <strong className="font-bold">Sua primeira mensagem é gratuita!</strong> Após o nutricionista aceitar a conversa, você poderá continuar o chat ou contratar um plano para acompanhamento completo.
                </p>
              </div>

              {/* Message Input */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Escreva sua mensagem inicial
                </label>
                <textarea
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  placeholder="Olá! Gostaria de saber mais sobre seu acompanhamento nutricional..."
                  className="w-full p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  rows={4}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowContactDialog(false)}
                  className="flex-1 h-11 rounded-xl border-gray-200"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!initialMessage.trim() || createConversationMutation.isPending}
                  className="flex-1 h-11 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl"
                >
                  <MessageCircle size={18} className="mr-2" />
                  {createConversationMutation.isPending ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
