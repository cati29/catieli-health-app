import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Dumbbell, Plus, Save, Search, Trash2 } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function RoutineBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    days_per_week: 3,
    duration_minutes: 45
  });
  const [exercises, setExercises] = useState([]);

  const { data: exerciseCatalog = [] } = useQuery({
    queryKey: ['exerciseCatalog'],
    queryFn: async () => appClient.entities.Exercise.list(),
    staleTime: 60_000
  });

  const filteredCatalog = exerciseCatalog
    .filter((item) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.name?.toLowerCase().includes(q) ||
        item.muscle_group?.toLowerCase().includes(q) ||
        item.equipment?.toLowerCase().includes(q)
      );
    })
    .slice(0, 30);

  const alreadyAdded = (id) => exercises.some((ex) => ex.exercise_id === id);

  const addExercise = (exercise) => {
    if (alreadyAdded(exercise.id)) return;
    setExercises((prev) => [
      ...prev,
      {
        exercise_id: exercise.id,
        name: exercise.name,
        muscle_group: exercise.muscle_group,
        equipment: exercise.equipment,
        sets: 3,
        reps: 10,
        rest_seconds: 60
      }
    ]);
  };

  const removeExercise = (index) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const moveExercise = (index, direction) => {
    setExercises((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const updateExerciseField = (index, field, value) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: Number(value) || 0 } : ex))
    );
  };

  const createRoutineMutation = useMutation({
    mutationFn: async (payload) => {
      const user = await appClient.auth.me();
      return appClient.entities.WorkoutRoutine.create({
        user_id: user.email,
        created_by: user.email,
        ...payload,
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
    if (exercises.length === 0) {
      setError('Adicione pelo menos um exercício à rotina.');
      return;
    }
    createRoutineMutation.mutate({
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      exercises
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

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Exercícios ({exercises.length})</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowPicker(true)}>
                  <Plus size={14} className="mr-1" />
                  Adicionar exercício
                </Button>
              </div>

              {exercises.length === 0 ? (
                <div className="border-2 border-dashed border-purple-200 rounded-xl p-6 text-center text-sm text-gray-500">
                  <Dumbbell size={24} className="mx-auto mb-2 text-purple-400" />
                  Nenhum exercício adicionado ainda. Clique em <strong>Adicionar exercício</strong>.
                </div>
              ) : (
                <ul className="space-y-2">
                  {exercises.map((ex, index) => (
                    <li
                      key={`${ex.exercise_id}_${index}`}
                      className="border border-slate-200 rounded-lg p-3 bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{ex.name}</p>
                          <p className="text-xs text-gray-500">
                            {ex.muscle_group || '—'} {ex.equipment ? `• ${ex.equipment}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveExercise(index, -1)}
                            disabled={index === 0}
                            className="p-1 text-gray-500 hover:text-purple-600 disabled:opacity-30"
                            aria-label="Mover para cima"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveExercise(index, 1)}
                            disabled={index === exercises.length - 1}
                            className="p-1 text-gray-500 hover:text-purple-600 disabled:opacity-30"
                            aria-label="Mover para baixo"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeExercise(index)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                            aria-label={`Remover ${ex.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Séries</Label>
                          <Input
                            type="number"
                            min={1}
                            value={ex.sets}
                            onChange={(e) => updateExerciseField(index, 'sets', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Reps</Label>
                          <Input
                            type="number"
                            min={1}
                            value={ex.reps}
                            onChange={(e) => updateExerciseField(index, 'reps', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Descanso (s)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={ex.rest_seconds}
                            onChange={(e) => updateExerciseField(index, 'rest_seconds', e.target.value)}
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
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

      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar exercício</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, grupo muscular ou equipamento"
                className="pl-10"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredCatalog.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  {exerciseCatalog.length === 0
                    ? 'Catálogo de exercícios vazio. Crie exercícios em Catálogo primeiro.'
                    : 'Nenhum resultado.'}
                </p>
              ) : (
                filteredCatalog.map((exercise) => {
                  const added = alreadyAdded(exercise.id);
                  return (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() => addExercise(exercise)}
                      disabled={added}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        added
                          ? 'border-emerald-200 bg-emerald-50 cursor-not-allowed'
                          : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{exercise.name}</p>
                          <p className="text-xs text-gray-500">
                            {exercise.muscle_group || '—'} {exercise.equipment ? `• ${exercise.equipment}` : ''}
                          </p>
                        </div>
                        {added ? (
                          <span className="text-xs font-medium text-emerald-600">Adicionado</span>
                        ) : (
                          <Plus size={16} className="text-purple-500 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowPicker(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
