import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Timer } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';

export default function RoutineDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const routineId = useMemo(() => new URLSearchParams(location.search).get('routineId'), [location.search]);

  const { data: routine, isLoading } = useQuery({
    queryKey: ['routineDetail', routineId],
    queryFn: async () => {
      const rows = await appClient.entities.WorkoutRoutine.filter({ id: routineId }, null, 1);
      return rows[0] || null;
    },
    enabled: Boolean(routineId)
  });

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.WorkoutSession.create({
        user_id: user.email,
        created_by: user.email,
        routine_id: routine.id,
        routine_name: routine.name,
        date: format(new Date(), 'yyyy-MM-dd'),
        duration_minutes: routine.duration_minutes || 45,
        calories_burned: Math.round((routine.duration_minutes || 45) * 7),
        completed: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutSessions'] });
      queryClient.invalidateQueries({ queryKey: ['workoutHistory'] });
      navigate(createPageUrl('WorkoutHistory'));
    }
  });

  if (!routineId) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-red-500">Parametro routineId ausente.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link to={createPageUrl('WorkoutTracker')} className="inline-flex items-center text-gray-600 hover:text-indigo-600">
          <ArrowLeft size={16} className="mr-2" />
          Voltar para Treinos
        </Link>

        {isLoading && <p className="text-gray-500">Carregando rotina...</p>}

        {!isLoading && !routine && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <p className="text-gray-600">Rotina não encontrada ou sem permissão de acesso.</p>
          </div>
        )}

        {routine && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-md p-6"
          >
            <h1 className="text-2xl font-bold text-gray-800">{routine.name}</h1>
            <p className="text-gray-500 mt-2">{routine.description || 'Sem descrição cadastrada.'}</p>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500">Duração estimada</p>
                <p className="font-semibold text-gray-800 flex items-center gap-2">
                  <Timer size={14} />
                  {routine.duration_minutes || 45} min
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500">Dias por semana</p>
                <p className="font-semibold text-gray-800">{routine.days_per_week || 3}</p>
              </div>
            </div>

            <Button
              onClick={() => startSessionMutation.mutate()}
              disabled={startSessionMutation.isPending}
              className="mt-6 w-full bg-indigo-500 hover:bg-indigo-600"
            >
              <Play size={16} className="mr-2" />
              {startSessionMutation.isPending ? 'Iniciando...' : 'Iniciar treino'}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
