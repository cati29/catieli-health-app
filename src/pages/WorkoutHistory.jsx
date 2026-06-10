import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Flame, Timer } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function WorkoutHistory() {
  const [days, setDays] = useState(30);
  const dateFrom = useMemo(() => format(subDays(new Date(), Number(days) || 30), 'yyyy-MM-dd'), [days]);
  const dateTo = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const { data: sessions = [], isLoading, error } = useQuery({
    queryKey: ['workoutHistory', days],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.WorkoutSession.filter(
        {
          user_id: user.email,
          date: { gte: dateFrom, lte: dateTo }
        },
        '-date',
        120
      );
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link to={createPageUrl('WorkoutTracker')} className="inline-flex items-center text-gray-600 hover:text-emerald-600">
          <ArrowLeft size={16} className="mr-2" />
          Voltar para Treinos
        </Link>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Histórico de treinos</h1>
              <p className="text-gray-500">Sessões registradas no período selecionado.</p>
            </div>
            <div className="w-40">
              <Label>Dias</Label>
              <Input
                type="number"
                min={7}
                max={180}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
            </div>
          </div>

          {isLoading && <p className="text-gray-500">Carregando histórico...</p>}
          {error && <p className="text-red-500 text-sm">{error.message}</p>}

          {!isLoading && sessions.length === 0 && (
            <p className="text-gray-500">Nenhuma sessão encontrada para este período.</p>
          )}

          <div className="space-y-3">
            {sessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="p-4 border border-gray-100 rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{session.routine_name || 'Treino'}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(session.date), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p className="flex items-center gap-2"><Timer size={14} /> {session.duration_minutes || 0} min</p>
                    <p className="flex items-center gap-2"><Flame size={14} /> {session.calories_burned || 0} kcal</p>
                    <p className="flex items-center gap-2"><CalendarDays size={14} /> {session.date}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
