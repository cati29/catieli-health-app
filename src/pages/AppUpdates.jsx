import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Sparkles, Megaphone, Bug, Star, CheckCircle
} from 'lucide-react';

export default function AppUpdates() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await appClient.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // Fetch app updates
  const { data: updates } = useQuery({
    queryKey: ['appUpdates'],
    queryFn: () => appClient.entities.AppUpdate.filter({ is_active: true }, '-publish_date'),
    enabled: !!currentUser,
    initialData: []
  });

  const typeIcons = {
    major: { icon: Star, color: 'text-amber-500', bg: 'bg-amber-100' },
    minor: { icon: Sparkles, color: 'text-blue-500', bg: 'bg-blue-100' },
    patch: { icon: Bug, color: 'text-green-500', bg: 'bg-green-100' },
    announcement: { icon: Megaphone, color: 'text-purple-500', bg: 'bg-purple-100' }
  };

  const typeLabels = {
    major: 'Grande Atualização',
    minor: 'Nova Funcionalidade',
    patch: 'Correções',
    announcement: 'Anúncio'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/20 pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Sparkles size={32} />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Novidades</h1>
                <p className="text-indigo-100">Atualizações e melhorias do app</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {updates.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="text-indigo-500" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Nenhuma atualização ainda
            </h3>
            <p className="text-gray-500">
              Fique atento! Novas funcionalidades em breve.
            </p>
          </div>
        ) : (
          updates.map((update, idx) => {
            const typeInfo = typeIcons[update.type] || typeIcons.minor;
            const Icon = typeInfo.icon;

            return (
              <motion.div
                key={update.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-2xl shadow-md overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-14 h-14 rounded-xl ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={typeInfo.color} size={28} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${typeInfo.bg} ${typeInfo.color}`}>
                          {typeLabels[update.type]}
                        </span>
                        <span className="text-xs text-gray-500">
                          Versão {update.version}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-1">
                        {update.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {format(new Date(update.publish_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4 leading-relaxed">
                    {update.description}
                  </p>

                  {update.features && update.features.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-700 mb-3">
                        O que há de novo:
                      </p>
                      <div className="space-y-2">
                        {update.features.map((feature, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-600">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
