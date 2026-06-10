import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useQuery } from '@tanstack/react-query';
import BadgeCard from '@/components/gamification/BadgeCard';
import { Trophy, Star, Award, Filter, Droplets, Dumbbell, Apple, Flame } from 'lucide-react';

export default function Achievements() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const fetchUser = async () => {
      const user = await appClient.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // Fetch all badges
  const { data: allBadges } = useQuery({
    queryKey: ['badges'],
    queryFn: () => appClient.entities.Badge.list(),
    initialData: []
  });

  // Fetch user's unlocked badges
  const { data: userBadges } = useQuery({
    queryKey: ['userBadges'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.UserBadge.filter({ user_id: user.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  // Fetch user profile for progress calculation
  const { data: profiles } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.UserProfile.filter({ created_by: user.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const profile = profiles?.[0];
  const unlockedBadgeIds = new Set(userBadges.map(ub => ub.badge_id));

  // Calculate progress for each badge
  const getBadgeProgress = (badge) => {
    if (!profile) return 0;
    
    switch(badge.requirement_type) {
      case 'level_reached':
        return profile.level || 0;
      case 'xp_earned':
        return profile.xp || 0;
      case 'streak_days':
        return 7; // Simplified - would need streak calculation
      default:
        return 0;
    }
  };

  const categories = [
    { value: 'all', label: 'Todos', icon: Trophy },
    { value: 'water', label: 'Hidratação', icon: Droplets },
    { value: 'exercise', label: 'Exercício', icon: Dumbbell },
    { value: 'nutrition', label: 'Nutrição', icon: Apple },
    { value: 'streak', label: 'Sequência', icon: Flame },
    { value: 'level', label: 'Nível', icon: Star }
  ];

  const filteredBadges = selectedCategory === 'all' 
    ? allBadges 
    : allBadges.filter(b => b.category === selectedCategory);

  const unlockedCount = filteredBadges.filter(b => unlockedBadgeIds.has(b.id)).length;
  const totalCount = filteredBadges.length;
  const completionPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;
  const categoryCounts = allBadges.reduce((acc, badge) => {
    acc[badge.category] = (acc[badge.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="app-shell bg-gradient-to-b from-slate-50 to-[#f4f7f8]">
      {/* Header */}
      <div className="module-header">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Trophy size={32} />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Conquistas</h1>
                <p className="text-amber-100">Desbloqueie badges e celebre seu progresso</p>
              </div>
            </div>

            {/* Progress Card */}
            <div className="bg-white/15 border border-white/25 backdrop-blur-sm rounded-2xl p-6 mt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="relative w-24 h-24 rounded-full grid place-items-center text-slate-900 font-bold"
                    style={{
                      background: `conic-gradient(#ffffff ${completionPercent}%, rgba(255,255,255,0.2) ${completionPercent}% 100%)`
                    }}
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-700 text-white grid place-items-center text-sm">
                      {completionPercent.toFixed(0)}%
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Award size={24} />
                      <span className="font-semibold text-lg">Progresso Geral</span>
                    </div>
                    <p className="text-sm text-amber-100 mt-1">Continue: sua consistência está evoluindo.</p>
                  </div>
                </div>
                <span className="text-2xl font-bold">{unlockedCount}/{totalCount}</span>
              </div>

              <div className="h-3 bg-white/20 rounded-full overflow-hidden mt-4">
                <motion.div
                  className="h-full bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercent}%` }}
                  transition={{ duration: 1 }}
                />
              </div>

              <p className="text-sm text-amber-100 mt-2">
                {completionPercent.toFixed(0)}% das conquistas desbloqueadas
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Category Filter */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          <Filter className="text-gray-400 flex-shrink-0" size={20} />
          {categories.map((cat) => (
            <motion.button
              key={cat.value}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-emerald-400'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <cat.icon size={16} />
                {cat.label}
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                  selectedCategory === cat.value ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
                }`}
                >
                  {cat.value === 'all' ? allBadges.length : (categoryCounts[cat.value] || 0)}
                </span>
              </span>
            </motion.button>
          ))}
        </div>

        {/* Badges Grid */}
        {filteredBadges.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredBadges.map((badge, idx) => {
              const isUnlocked = unlockedBadgeIds.has(badge.id);
              const progress = getBadgeProgress(badge);
              
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <BadgeCard
                    badge={badge}
                    isUnlocked={isUnlocked}
                    progress={progress}
                  />
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <Trophy className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-600 mb-2">
              Nenhuma conquista encontrada
            </h3>
            <p className="text-gray-500">
              Comece a completar suas metas para desbloquear badges!
            </p>
          </div>
        )}

        {/* Stats Section */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="surface-card p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center">
                <Trophy className="text-white" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{unlockedCount}</p>
                <p className="text-sm text-gray-500">Badges Desbloqueados</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="surface-card p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl flex items-center justify-center">
                <Star className="text-white" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {allBadges.filter(b => unlockedBadgeIds.has(b.id) && b.rarity !== 'common').length}
                </p>
                <p className="text-sm text-gray-500">Badges Raros</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="surface-card p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-xl flex items-center justify-center">
                <Award className="text-white" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {completionPercent.toFixed(0)}%
                </p>
                <p className="text-sm text-gray-500">Conclusão</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
