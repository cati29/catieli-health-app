import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Dumbbell, Plus, Calendar, TrendingUp, Zap, Play,
  Clock, Flame
} from 'lucide-react';

export default function WorkoutTracker() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await appClient.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: routines = [] } = useQuery({
    queryKey: ['workoutRoutines'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.WorkoutRoutine.filter({ user_id: user.email, is_active: true });
    },
    enabled: !!currentUser
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['workoutSessions'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.WorkoutSession.filter({ user_id: user.email }, '-date', 7);
    },
    enabled: !!currentUser
  });

  const totalWorkouts = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const totalCalories = sessions.reduce((sum, s) => sum + (s.calories_burned || 0), 0);
  const ratedSessions = sessions.filter((s) => Number.isFinite(s.rating) && s.rating > 0);
  const avgRating = ratedSessions.length > 0
    ? (ratedSessions.reduce((sum, s) => sum + s.rating, 0) / ratedSessions.length).toFixed(1)
    : '-';

  return (
    <div className="app-shell bg-gradient-to-b from-slate-50 to-[#f4f7f8]">
      <div className="module-header">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/25 flex items-center justify-center">
                  <Dumbbell size={32} />
                </div>
                <div>
                  <h1 className="text-4xl font-bold">Treinos</h1>
                  <p className="text-emerald-100">Seu centro de treinamento personalizado</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur-sm">
                <Calendar className="mb-2" size={20} />
                <p className="text-2xl font-bold">{totalWorkouts}</p>
                <p className="text-xs text-emerald-100">Treinos (7 dias)</p>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur-sm">
                <Clock className="mb-2" size={20} />
                <p className="text-2xl font-bold">{totalMinutes}</p>
                <p className="text-xs text-emerald-100">Minutos</p>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur-sm">
                <Flame className="mb-2" size={20} />
                <p className="text-2xl font-bold">{totalCalories}</p>
                <p className="text-xs text-emerald-100">Calorias</p>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur-sm">
                <TrendingUp className="mb-2" size={20} />
                <p className="text-2xl font-bold">{avgRating}</p>
                <p className="text-xs text-emerald-100">Avaliação média</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="grid md:grid-cols-4 gap-4">
          <Link to={createPageUrl('ExerciseCatalog')}>
            <motion.div whileHover={{ scale: 1.02 }} className="surface-card p-6 text-slate-800 cursor-pointer">
              <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                <Dumbbell size={24} />
              </div>
              <h3 className="font-bold text-lg mb-1">Catálogo</h3>
              <p className="text-sm text-slate-500">Exercícios e vídeos</p>
            </motion.div>
          </Link>

          <Link to={createPageUrl('RoutineBuilder')}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="rounded-2xl p-6 text-white cursor-pointer border border-white/20"
              style={{
                background: 'linear-gradient(135deg, #6448f5 0%, #4f46e5 100%)',
                boxShadow: '0 12px 30px rgba(79, 70, 229, 0.28)'
              }}
            >
              <Plus className="mb-3" size={28} />
              <h3 className="font-bold text-lg mb-1">Nova Rotina</h3>
              <p className="text-sm text-indigo-100">Criar treino</p>
            </motion.div>
          </Link>

          <Link to={createPageUrl('WorkoutHistory')}>
            <motion.div whileHover={{ scale: 1.02 }} className="surface-card p-6 text-slate-800 cursor-pointer">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <TrendingUp size={24} />
              </div>
              <h3 className="font-bold text-lg mb-1">Histórico</h3>
              <p className="text-sm text-slate-500">Progresso e gráficos</p>
            </motion.div>
          </Link>

          <Link to={createPageUrl('AIWorkoutSuggestions')}>
            <motion.div whileHover={{ scale: 1.02 }} className="surface-card p-6 text-slate-800 cursor-pointer">
              <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                <Zap size={24} />
              </div>
              <h3 className="font-bold text-lg mb-1">IA Treinos</h3>
              <p className="text-sm text-slate-500">Sugestões inteligentes</p>
            </motion.div>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title">Minhas Rotinas</h2>
            <Link to={createPageUrl('RoutineBuilder')}>
              <Button size="sm" className="bg-indigo-500 hover:bg-indigo-600">
                <Plus size={16} className="mr-2" />
                Nova Rotina
              </Button>
            </Link>
          </div>

          {routines.length === 0 ? (
            <div className="empty-state text-center py-12 px-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Dumbbell size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhuma rotina criada</h3>
              <p className="text-gray-500 mb-1">Seu corpo está esperando o próximo movimento.</p>
              <p className="text-gray-500 mb-6">Crie uma rotina agora ou use IA para começar mais rápido.</p>
              <div className="flex gap-3 justify-center">
                <Link to={createPageUrl('RoutineBuilder')}>
                  <Button className="bg-indigo-500 hover:bg-indigo-600">
                    Criar Rotina
                  </Button>
                </Link>
                <Link to={createPageUrl('AIWorkoutSuggestions')}>
                  <Button variant="outline">
                    <Zap size={16} className="mr-2" />
                    Sugestão IA
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {routines.map((routine) => {
                const detailUrl = createPageUrl(`RoutineDetail?routineId=${routine.id}`);
                return (
                  <motion.div
                    key={routine.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => navigate(detailUrl)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(detailUrl);
                      }
                    }}
                    className="p-5 border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer bg-white"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">{routine.name}</h3>
                        <p className="text-sm text-gray-500">{routine.description}</p>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {routine.created_by_ai && (
                          <div className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium">
                            IA
                          </div>
                        )}
                        {routine.nutritionist_id && (
                          <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                            Nutricionista
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{routine.exercises?.length || 0} exercícios</span>
                      <span>•</span>
                      <span>{routine.duration_minutes || 0} min</span>
                      <span>•</span>
                      <span>{routine.days_per_week || 0}x/semana</span>
                    </div>
                    <div className="mt-3">
                      <Button
                        size="sm"
                        type="button"
                        className="w-full bg-indigo-500 hover:bg-indigo-600"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`${detailUrl}&start=1`);
                        }}
                      >
                        <Play size={14} className="mr-2" />
                        Iniciar Treino
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-6"
        >
          <h2 className="section-title mb-6">Treinos Recentes</h2>

          {sessions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhum treino registrado ainda</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 surface-card-soft">
                  <div>
                    <p className="font-semibold text-gray-800">{session.routine_name || 'Treino'}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(session.date).toLocaleDateString('pt-BR')} • {session.duration_minutes} min • {session.calories_burned} kcal
                    </p>
                  </div>
                  {session.rating && (
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < session.rating ? 'text-amber-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
