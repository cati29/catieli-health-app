import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  TrendingUp, TrendingDown, Droplet, Dumbbell, 
  Target, Calendar, Award, BarChart3, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Progress() {
  const [currentUser, setCurrentUser] = useState(null);
  const [timeRange, setTimeRange] = useState(30); // days

  useEffect(() => {
    const fetchUser = async () => {
      const user = await appClient.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // Fetch user profile
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

  // Fetch daily goals for the time range
  const { data: dailyGoals } = useQuery({
    queryKey: ['dailyGoals', timeRange],
    queryFn: async () => {
      const user = await appClient.auth.me();
      const startDate = format(subDays(new Date(), timeRange), 'yyyy-MM-dd');
      const allGoals = await appClient.entities.DailyGoal.filter({ created_by: user.email });
      return allGoals.filter(g => g.date >= startDate).sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!currentUser,
    initialData: []
  });

  // Fetch user badges
  const { data: userBadges } = useQuery({
    queryKey: ['userBadges'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.UserBadge.filter({ user_id: user.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  // Fetch completed challenges
  const { data: userChallenges } = useQuery({
    queryKey: ['userChallenges'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.UserChallenge.filter({ user_id: user.email, completed: true });
    },
    enabled: !!currentUser,
    initialData: []
  });

  // Prepare weight history data
  const weightData = profile?.weight_history?.slice(-timeRange).map(entry => ({
    date: format(new Date(entry.date), 'dd/MM', { locale: ptBR }),
    weight: entry.weight
  })) || [];

  // Prepare water intake data
  const waterData = dailyGoals.map(goal => ({
    date: format(new Date(goal.date), 'dd/MM', { locale: ptBR }),
    consumed: (goal.water_consumed_ml || 0) / 1000,
    goal: (goal.water_goal_ml || 3000) / 1000
  }));

  // Prepare exercise data
  const exerciseData = dailyGoals.map(goal => ({
    date: format(new Date(goal.date), 'dd/MM', { locale: ptBR }),
    minutes: goal.exercise_minutes_done || 0,
    goal: goal.exercise_minutes_goal || 30
  }));

  // Prepare calorie data
  const calorieData = dailyGoals.map(goal => ({
    date: format(new Date(goal.date), 'dd/MM', { locale: ptBR }),
    consumed: goal.calories_consumed || 0,
    goal: goal.calorie_goal || 2000
  }));

  // Calculate statistics
  const totalWaterConsumed = dailyGoals.reduce((sum, g) => sum + (g.water_consumed_ml || 0), 0) / 1000;
  const avgWaterPerDay = dailyGoals.length > 0 ? (totalWaterConsumed / dailyGoals.length).toFixed(1) : 0;
  
  const totalExerciseMinutes = dailyGoals.reduce((sum, g) => sum + (g.exercise_minutes_done || 0), 0);
  const avgExercisePerDay = dailyGoals.length > 0 ? Math.round(totalExerciseMinutes / dailyGoals.length) : 0;
  
  const goalsCompleted = dailyGoals.filter(g => g.completed).length;
  const completionRate = dailyGoals.length > 0 ? Math.round((goalsCompleted / dailyGoals.length) * 100) : 0;

  // Weight trend
  const weightTrend = weightData.length >= 2 
    ? weightData[weightData.length - 1].weight - weightData[0].weight 
    : 0;

  // Generate report
  const downloadReport = () => {
    const reportContent = `
RELAT\u00d3RIO DE PROGRESSO - HEALTH APP
Data: ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}
Per\u00edodo: \u00daltimos ${timeRange} dias

=======================================

RESUMO GERAL
- Taxa de Conclus\u00e3o: ${completionRate}%
- Metas Completas: ${goalsCompleted}/${dailyGoals.length}
- Badges Conquistados: ${userBadges.length}
- Desafios Completos: ${userChallenges.length}

HIDRATA\u00c7\u00c3O
- Total Consumido: ${totalWaterConsumed.toFixed(1)}L
- M\u00e9dia por Dia: ${avgWaterPerDay}L

EXERC\u00cdCIO
- Total de Minutos: ${totalExerciseMinutes}
- M\u00e9dia por Dia: ${avgExercisePerDay} min

PESO
- Peso Inicial: ${weightData[0]?.weight || '-'} kg
- Peso Atual: ${weightData[weightData.length - 1]?.weight || '-'} kg
- Varia\u00e7\u00e3o: ${weightTrend > 0 ? '+' : ''}${weightTrend.toFixed(1)} kg

=======================================

Continue seu \u00f3timo trabalho!
    `;
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatório-progresso-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
  };

  return (
    <div className="app-shell bg-gradient-to-b from-slate-50 to-[#f4f7f8]">
      {/* Header */}
      <div className="module-header">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <BarChart3 size={32} />
                </div>
                <div>
                  <h1 className="text-4xl font-bold">Progresso</h1>
                  <p className="text-blue-100">Análise detalhada da sua evolução</p>
                </div>
              </div>

              <Button
                onClick={downloadReport}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30"
              >
                <Download size={18} className="mr-2" />
                Relatório
              </Button>
            </div>

            {/* Time Range Selector */}
            <div className="segmented-control overflow-x-auto pb-1">
              {[7, 14, 30, 90].map((days) => (
                <motion.button
                  key={days}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTimeRange(days)}
                  className={`segmented-item whitespace-nowrap ${timeRange === days ? 'is-active' : ''}`}
                >
                  {days} dias
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface-card p-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <Target className="text-emerald-500" size={24} />
              <span className="text-sm text-gray-600">Taxa de Conclusão</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{completionRate}%</p>
            <p className="text-xs text-gray-500 mt-1">{goalsCompleted} de {dailyGoals.length} metas</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="surface-card p-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <Droplet className="text-blue-500" size={24} />
              <span className="text-sm text-gray-600">Água Média</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{avgWaterPerDay}L</p>
            <p className="text-xs text-gray-500 mt-1">por dia</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="surface-card p-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell className="text-orange-500" size={24} />
              <span className="text-sm text-gray-600">Exercício Médio</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{avgExercisePerDay}</p>
            <p className="text-xs text-gray-500 mt-1">minutos/dia</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="surface-card p-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <Award className="text-amber-500" size={24} />
              <span className="text-sm text-gray-600">Conquistas</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{userBadges.length}</p>
            <p className="text-xs text-gray-500 mt-1">badges desbloqueados</p>
          </motion.div>
        </div>

        {/* Weight Progress */}
        {weightData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface-card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">Histórico de Peso</h2>
                <div className="flex items-center gap-2">
                  {weightTrend < 0 ? (
                    <TrendingDown className="text-emerald-500" size={20} />
                  ) : (
                    <TrendingUp className="text-orange-500" size={20} />
                  )}
                  <span className={`font-semibold ${weightTrend < 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {weightTrend > 0 ? '+' : ''}{weightTrend.toFixed(1)} kg
                  </span>
                  <span className="text-sm text-gray-500">no período</span>
                </div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weightData}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="weight" stroke="#8b5cf6" strokeWidth={3} fill="url(#colorWeight)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Water Intake Progress */}
        {waterData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface-card p-6"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-1">Tendência de Hidratação</h2>
            <p className="text-sm text-gray-500 mb-6">Consumo diário vs meta (litros)</p>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={waterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="consumed" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Consumido" />
                <Bar dataKey="goal" fill="#e5e7eb" radius={[8, 8, 0, 0]} name="Meta" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Exercise Progress */}
        {exerciseData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface-card p-6"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-1">Evolução de Exercícios</h2>
            <p className="text-sm text-gray-500 mb-6">Minutos de exercício diário</p>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={exerciseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="minutes" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} name="Minutos" />
                <Line type="monotone" dataKey="goal" stroke="#d1d5db" strokeWidth={2} strokeDasharray="5 5" name="Meta" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Calorie Tracking */}
        {calorieData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface-card p-6"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-1">Balanço Calórico</h2>
            <p className="text-sm text-gray-500 mb-6">Calorias consumidas vs meta</p>

            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={calorieData}>
                <defs>
                  <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="consumed" stroke="#10b981" strokeWidth={3} fill="url(#colorCalories)" name="Consumido" />
                <Line type="monotone" dataKey="goal" stroke="#d1d5db" strokeWidth={2} strokeDasharray="5 5" name="Meta" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Weekly Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-6 text-white border border-white/20"
            style={{
              background: 'linear-gradient(135deg, #138f70 0%, #0f7a6d 100%)',
              boxShadow: '0 10px 24px rgba(15, 122, 109, 0.22)'
            }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Calendar size={30} />
            <h2 className="text-2xl font-bold">Resumo da Semana</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-white/20">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4">
              <p className="text-sm text-emerald-100 mb-1">Metas Completas</p>
              <p className="text-3xl font-bold">{dailyGoals.slice(-7).filter(g => g.completed).length}/7</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4">
              <p className="text-sm text-emerald-100 mb-1">Água Total</p>
              <p className="text-3xl font-bold">
                {(dailyGoals.slice(-7).reduce((sum, g) => sum + (g.water_consumed_ml || 0), 0) / 1000).toFixed(1)}L
              </p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4">
              <p className="text-sm text-emerald-100 mb-1">Exercício Total</p>
              <p className="text-3xl font-bold">
                {dailyGoals.slice(-7).reduce((sum, g) => sum + (g.exercise_minutes_done || 0), 0)} min
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
