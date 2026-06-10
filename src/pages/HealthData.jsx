import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import WearableConnection from '@/components/wearables/WearableConnection';
import { 
  Activity, Heart, Moon, Footprints, Flame, 
  TrendingUp, Watch
} from 'lucide-react';

export default function HealthData() {
  const [currentUser, setCurrentUser] = useState(null);
  const [timeRange, setTimeRange] = useState(7);

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

  // Fetch health data
  const { data: healthData } = useQuery({
    queryKey: ['healthData', timeRange],
    queryFn: async () => {
      const user = await appClient.auth.me();
      const startDate = format(subDays(new Date(), timeRange), 'yyyy-MM-dd');
      const allData = await appClient.entities.HealthData.filter({ user_id: user.email });
      return allData.filter(d => d.date >= startDate).sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!currentUser,
    initialData: []
  });

  // Prepare chart data
  const chartData = healthData.map(d => ({
    date: format(new Date(d.date), 'dd/MM', { locale: ptBR }),
    steps: d.steps || 0,
    heart_rate: d.heart_rate_avg || 0,
    sleep: d.sleep_hours || 0,
    active: d.active_minutes || 0,
    calories: d.calories_burned || 0
  }));

  // Calculate averages
  const avgSteps = healthData.length > 0 
    ? Math.round(healthData.reduce((sum, d) => sum + (d.steps || 0), 0) / healthData.length)
    : 0;
  const avgHeartRate = healthData.length > 0
    ? Math.round(healthData.reduce((sum, d) => sum + (d.heart_rate_avg || 0), 0) / healthData.length)
    : 0;
  const avgSleep = healthData.length > 0
    ? (healthData.reduce((sum, d) => sum + (d.sleep_hours || 0), 0) / healthData.length).toFixed(1)
    : 0;
  const totalDistance = healthData.reduce((sum, d) => sum + (d.distance_km || 0), 0).toFixed(1);

  // Today's data
  const today = healthData.find(d => d.date === format(new Date(), 'yyyy-MM-dd'));

  const sleepQualityColors = {
    poor: 'text-red-600 bg-red-100',
    fair: 'text-orange-600 bg-orange-100',
    good: 'text-green-600 bg-green-100',
    excellent: 'text-emerald-600 bg-emerald-100'
  };

  const sleepQualityLabels = {
    poor: 'Ruim',
    fair: 'Regular',
    good: 'Bom',
    excellent: 'Excelente'
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
            <div className="flex items-center gap-3 mb-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Activity size={32} />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Dados de Saúde</h1>
                <p className="text-blue-100">Sincronizado do seu wearable</p>
              </div>
            </div>

            {/* Time Range Selector */}
            <div className="segmented-control overflow-x-auto pb-1">
              {[7, 14, 30].map((days) => (
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
        {/* Wearable Connection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Watch className="text-blue-500" size={24} />
            <h2 className="text-xl font-bold text-gray-800">Dispositivo Conectado</h2>
          </div>
          <WearableConnection profile={profile} />
        </motion.div>

        {/* Today's Stats */}
        {today && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="surface-card p-6 hover:shadow-md transition-shadow"
            >
              <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                <Footprints size={22} />
              </div>
              <p className="text-3xl font-bold text-gray-800">{today.steps?.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Passos Hoje</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="surface-card p-6 hover:shadow-md transition-shadow"
            >
              <div className="w-11 h-11 rounded-full bg-red-100 text-red-700 flex items-center justify-center mb-3">
                <Heart size={22} />
              </div>
              <p className="text-3xl font-bold text-gray-800">{today.heart_rate_avg}</p>
              <p className="text-sm text-gray-500">BPM Médio</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="surface-card p-6 hover:shadow-md transition-shadow"
            >
              <div className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
                <Moon size={22} />
              </div>
              <p className="text-3xl font-bold text-gray-800">{today.sleep_hours}h</p>
              <p className="text-sm text-gray-500">Sono Hoje</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="surface-card p-6 hover:shadow-md transition-shadow"
            >
              <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                <Flame size={22} />
              </div>
              <p className="text-3xl font-bold text-gray-800">{today.calories_burned}</p>
              <p className="text-sm text-gray-500">Calorias</p>
            </motion.div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface-card p-6"
          >
            <Footprints className="text-blue-600 mb-3" size={28} />
            <p className="text-3xl font-bold text-slate-800 mb-1">{avgSteps.toLocaleString()}</p>
            <p className="text-sm text-slate-500">Média de Passos/Dia</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="surface-card p-6"
          >
            <Heart className="text-red-600 mb-3" size={28} />
            <p className="text-3xl font-bold text-slate-800 mb-1">{avgHeartRate} BPM</p>
            <p className="text-sm text-slate-500">FC Média</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="surface-card p-6"
          >
            <Moon className="text-indigo-600 mb-3" size={28} />
            <p className="text-3xl font-bold text-slate-800 mb-1">{avgSleep}h</p>
            <p className="text-sm text-slate-500">Sono Médio</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="surface-card p-6"
          >
            <TrendingUp className="text-emerald-600 mb-3" size={28} />
            <p className="text-3xl font-bold text-slate-800 mb-1">{totalDistance} km</p>
            <p className="text-sm text-slate-500">Distância Total</p>
          </motion.div>
        </div>

        {/* Steps Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-6"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Footprints className="text-blue-500" size={20} />
            Histórico de Passos
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Bar dataKey="steps" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Passos" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Heart Rate Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-6"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Heart className="text-red-500" size={20} />
            Frequência Cardíaca
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Line type="monotone" dataKey="heart_rate" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} name="BPM" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Sleep Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-6"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Moon className="text-indigo-500" size={20} />
            Qualidade do Sono
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Bar dataKey="sleep" fill="#6366f1" radius={[8, 8, 0, 0]} name="Horas" />
            </BarChart>
          </ResponsiveContainer>

          {/* Sleep Quality List */}
          <div className="mt-6 space-y-2">
            {healthData.slice(-7).reverse().map((d, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600">
                  {format(new Date(d.date), "dd 'de' MMM", { locale: ptBR })}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">{d.sleep_hours}h</span>
                  {d.sleep_quality && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${sleepQualityColors[d.sleep_quality]}`}>
                      {sleepQualityLabels[d.sleep_quality]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
