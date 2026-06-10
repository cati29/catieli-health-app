import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function RoutineBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    days_per_week: 3,
    duration_minutes: 45
  });

  const createRoutineMutation = useMutation({
    mutationFn: async (payload) => {
      const user = await appClient.auth.me();
      return appClient.entities.WorkoutRoutine.create({
        user_id: user.email,
        created_by: user.email,
        ...payload,
        exercises: [],
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutRoutines'] });
      navigate(createPageUrl('WorkoutTracker'));
    },
    onError: (mutationError) => {
      setError(mutationError?.message || 'Não foi possível salvar a rotina.');
    }
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Informe o nome da rotina.');
      return;
    }
    createRoutineMutation.mutate({
      ...form,
      name: form.name.trim(),
      description: form.description.trim()
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50/40 p-6">
      <div className="max-w-2xl mx-auto">
        <Link to={createPageUrl('WorkoutTracker')} className="inline-flex items-center text-gray-600 hover:text-purple-600 mb-6">
          <ArrowLeft size={16} className="mr-2" />
          Voltar para Treinos
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-md p-6"
        >
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Nova rotina</h1>
          <p className="text-gray-500 mb-6">Crie uma rotina base para os próximos treinos.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex.: Treino A - Forca"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Objetivo, grupos musculares e observações."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dias por semana</Label>
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={form.days_per_week}
                  onChange={(e) => setForm((prev) => ({ ...prev, days_per_week: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  min={5}
                  max={180}
                  value={form.duration_minutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, duration_minutes: Number(e.target.value) }))}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              type="submit"
              disabled={createRoutineMutation.isPending}
              className="w-full bg-purple-500 hover:bg-purple-600"
            >
              <Save size={16} className="mr-2" />
              {createRoutineMutation.isPending ? 'Salvando...' : 'Salvar rotina'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
