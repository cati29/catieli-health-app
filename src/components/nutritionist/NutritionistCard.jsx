import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Award, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NutritionistCard({ nutritionist, onContact, onViewProfile }) {
  const specialties = {
    weight_loss: 'Emagrecimento',
    health: 'Saúde',
    weight_gain: 'Ganho de peso',
    sports: 'Nutrição Esportiva',
    clinical: 'Nutrição Clínica',
    other: 'Geral'
  };

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}
      className="bg-white rounded-2xl overflow-hidden border border-gray-100 transition-shadow"
    >
      {/* Header with gradient */}
      <div className="h-20 bg-gradient-to-r from-emerald-400 to-teal-500 relative">
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
          <div className="w-20 h-20 rounded-full bg-white p-1 shadow-lg">
            {nutritionist.photo_url ? (
              <img 
                src={nutritionist.photo_url} 
                alt={nutritionist.first_name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-2xl font-bold text-emerald-600">
                  {nutritionist.first_name?.[0]}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-12 pb-6 px-6">
        <div className="text-center mb-4">
          <h3 className="font-bold text-lg text-gray-800">
            {nutritionist.first_name} {nutritionist.last_name}
          </h3>
          <div className="flex items-center justify-center gap-1 mt-1 text-sm text-gray-500">
            <Award size={14} className="text-emerald-500" />
            <span>CRN: {nutritionist.crm_nutrition}</span>
          </div>
        </div>

        {/* Specialty Badge */}
        {nutritionist.specialty && (
          <div className="flex justify-center mb-4">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
              {specialties[nutritionist.specialty] || nutritionist.specialty}
            </span>
          </div>
        )}

        {/* Bio */}
        {nutritionist.bio && (
          <p className="text-sm text-gray-600 text-center mb-4 line-clamp-3">
            {nutritionist.bio}
          </p>
        )}

        {/* Location */}
        {nutritionist.city && (
          <div className="flex items-center justify-center gap-1 text-sm text-gray-500 mb-4">
            <MapPin size={14} />
            <span>{nutritionist.city}</span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={() => onContact(nutritionist)}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <MessageCircle size={18} className="mr-2" />
            Iniciar Conversa
          </Button>
          <Button
            variant="outline"
            onClick={() => onViewProfile(nutritionist)}
            className="w-full border-emerald-200 text-emerald-600 hover:bg-emerald-50"
          >
            Ver Perfil
          </Button>
        </div>
      </div>
    </motion.div>
  );
}