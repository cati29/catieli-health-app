import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Award, Crown, Medal, TrendingUp, Trophy, Zap } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { LeaderboardSeasonService } from '@/components/services';

export default function Leaderboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [timeframe, setTimeframe] = useState('all');

  useEffect(() => {
    const fetchUser = async () => {
      const user = await appClient.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: leaderboardData } = useQuery({
    queryKey: ['leaderboard', timeframe],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return LeaderboardSeasonService.buildLeaderboard({
        timeframe,
        userEmail: user.email
      });
    },
    enabled: !!currentUser,
    initialData: {
      season: null,
      leaderboard: [],
      currentUserEntry: null,
      currentUserRank: 0
    }
  });

  const profiles = leaderboardData?.leaderboard || [];
  const season = leaderboardData?.season || null;
  const currentUserProfile = leaderboardData?.currentUserEntry || null;
  const currentUserRank = leaderboardData?.currentUserRank || 0;

  const leagueLabels = {
    bronze: 'Bronze',
    silver: 'Prata',
    gold: 'Ouro',
    platinum: 'Platina',
    diamond: 'Diamante'
  };

  const leagueTone = {
    bronze: 'text-amber-700',
    silver: 'text-slate-600',
    gold: 'text-yellow-600',
    platinum: 'text-cyan-600',
    diamond: 'text-indigo-600'
  };

  const displayXP = (profile) => (
    timeframe === 'all'
      ? Number(profile?.xp || 0)
      : Number(profile?.period_xp || 0)
  );

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="text-amber-500" size={24} />;
    if (rank === 2) return <Medal className="text-gray-400" size={24} />;
    if (rank === 3) return <Medal className="text-orange-500" size={24} />;
    return null;
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-amber-400 to-amber-500 text-white';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400 text-white';
    if (rank === 3) return 'bg-gradient-to-r from-orange-400 to-orange-500 text-white';
    return 'bg-gray-100 text-gray-600';
  };

  const topThreeOrder = [2, 1, 3];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/20 pb-20 md:pb-8">
      <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <TrendingUp size={32} />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Ranking</h1>
                <p className="text-purple-100">
                  {season?.label || 'Temporada atual'} com ligas e elo balanceados
                </p>
              </div>
            </div>

            {currentUserProfile && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white/20 backdrop-blur-sm rounded-2xl p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-white/30 flex items-center justify-center overflow-hidden">
                        {currentUserProfile.photo_url ? (
                          <img src={currentUserProfile.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl font-bold text-white">
                            {currentUserProfile.first_name?.[0]}
                          </span>
                        )}
                      </div>
                      {currentUserRank <= 3 && (
                        <div className="absolute -top-1 -right-1">{getRankIcon(currentUserRank)}</div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-lg">Sua posição</p>
                      <p className="text-purple-100">
                        {currentUserProfile.first_name} {currentUserProfile.last_name}
                      </p>
                      <p className="text-xs text-purple-100/90 mt-1">
                        Liga {leagueLabels[currentUserProfile.league] || 'Bronze'} | Elo {currentUserProfile.elo_rating || 0}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-3xl font-bold">#{currentUserRank}</p>
                    <div className="flex items-center gap-1 justify-end text-purple-100">
                      <Zap size={16} />
                      <span>{displayXP(currentUserProfile)} XP</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { value: 'all', label: 'Todo Tempo' },
            { value: 'month', label: 'Este Mês' },
            { value: 'week', label: 'Esta Semana' }
          ].map((option) => (
            <motion.button
              key={option.value}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTimeframe(option.value)}
              className={`px-6 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                timeframe === option.value
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-400'
              }`}
            >
              {option.label}
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
          {topThreeOrder.map((position, idx) => {
            const profile = profiles[position - 1];
            if (!profile) return null;

            const heights = { 1: 'h-40', 2: 'h-32', 3: 'h-28' };

            return (
              <motion.div
                key={position}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`${heights[position]} flex flex-col justify-end`}
              >
                <div className="text-center mb-3">
                  <div className="relative inline-block mb-2">
                    <div
                      className={`w-20 h-20 rounded-full border-4 ${
                        position === 1
                          ? 'border-amber-400 shadow-lg'
                          : position === 2
                            ? 'border-gray-300'
                            : 'border-orange-400'
                      } bg-white flex items-center justify-center overflow-hidden`}
                    >
                      {profile.photo_url ? (
                        <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-gray-600">
                          {profile.first_name?.[0]}
                        </span>
                      )}
                    </div>
                    <div className="absolute -top-2 -right-2">{getRankIcon(position)}</div>
                  </div>
                  <p className="font-bold text-sm text-gray-800 truncate">{profile.first_name}</p>
                  <p className={`text-[11px] font-semibold ${leagueTone[profile.league] || 'text-slate-600'}`}>
                    {leagueLabels[profile.league] || 'Bronze'}
                  </p>
                  <div className="flex items-center justify-center gap-1 text-emerald-600">
                    <Zap size={12} />
                    <span className="text-xs font-bold">{displayXP(profile)}</span>
                  </div>
                </div>

                <div
                  className={`bg-gradient-to-br ${
                    position === 1
                      ? 'from-amber-400 to-amber-500'
                      : position === 2
                        ? 'from-gray-300 to-gray-400'
                        : 'from-orange-400 to-orange-500'
                  } rounded-t-xl flex items-center justify-center text-white font-bold text-2xl ${heights[position]}`}
                >
                  {position}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Trophy className="text-purple-500" size={24} />
              Ranking completo
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            {profiles.slice(3).map((profile, idx) => {
              const rank = idx + 4;
              const isCurrentUser = profile.created_by === currentUser?.email;

              return (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`p-4 hover:bg-gray-50 transition-colors ${isCurrentUser ? 'bg-purple-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getRankBadge(rank)}`}>
                        {rank}
                      </div>

                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                        {profile.photo_url ? (
                          <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-gray-600">{profile.first_name?.[0]}</span>
                        )}
                      </div>

                      <div>
                        <p className="font-semibold text-gray-800">
                          {profile.first_name} {profile.last_name}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                              Você
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          Nível {profile.level || 1} | Elo {profile.elo_rating || 0}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-xs font-semibold ${leagueTone[profile.league] || 'text-slate-600'}`}>
                        {leagueLabels[profile.league] || 'Bronze'} #{profile.league_rank || 0}
                      </p>
                      <div className="flex items-center gap-1 text-emerald-600 font-bold">
                        <Zap size={18} />
                        <span>{displayXP(profile)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {timeframe === 'all' ? 'XP total' : 'XP no período'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <Award className="w-12 h-12 text-purple-500 mx-auto mb-3" />
            <p className="text-3xl font-bold text-gray-800">{profiles.length}</p>
            <p className="text-sm text-gray-500">Usuários ativos</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <Zap className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-3xl font-bold text-gray-800">
              {profiles.reduce((sum, profile) => sum + Number(profile.xp || 0), 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">XP total da comunidade</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <Trophy className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <p className="text-3xl font-bold text-gray-800">
              {Math.round(
                profiles.reduce((sum, profile) => sum + Number(profile.elo_rating || 0), 0) /
                (profiles.length || 1)
              )}
            </p>
            <p className="text-sm text-gray-500">Elo médio</p>
          </div>
        </div>
      </div>
    </div>
  );
}
