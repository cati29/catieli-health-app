import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Play, Plus, Save, Search, Sparkles, Timer, Trash2, X } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';

export default function RoutineDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const routineId = useMemo(() => new URLSearchParams(location.search).get('routineId'), [location.search]);
  const autoStart = useMemo(() => new URLSearchParams(location.search).get('start') === '1', [location.search]);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const autoStartedRef = useRef(false);
  const [authEmail, setAuthEmail] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await appClient.auth.me();
        if (active) setAuthEmail(me?.email || null);
      } catch {
        if (active) setAuthEmail(null);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const { data: routine, isLoading } = useQuery({
    queryKey: ['routineDetail', routineId],
    queryFn: async () => {
      const rows = await appClient.entities.WorkoutRoutine.filter({ id: routineId }, null, 1);
      return rows[0] || null;
    },
    enabled: Boolean(routineId)
  });

  const { data: currentProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const me = await appClient.auth.me();
      const rows = await appClient.entities.UserProfile.filter({ created_by: me.email }, '-created_date', 1);
      return rows[0] || null;
    }
  });

  const { data: exerciseCatalog = [] } = useQuery({
    queryKey: ['exerciseCatalog'],
    queryFn: async () => appClient.entities.Exercise.list(),
    staleTime: 60_000
  });

  useEffect(() => {
    if (routine && !draft) {
      setDraft({
        name: routine.name || '',
        description: routine.description || '',
        duration_minutes: routine.duration_minutes || 45,
        days_per_week: routine.days_per_week || 3,
        exercises: Array.isArray(routine.exercises) ? routine.exercises : []
      });
    }
  }, [routine, draft]);

  const isNutritionistOwner = Boolean(
    currentProfile?.user_type === 'nutritionist' &&
    routine?.nutritionist_id &&
    authEmail &&
    routine.nutritionist_id === authEmail
  );
  const isPatientOwner = Boolean(
    routine?.user_id &&
    authEmail &&
    routine.user_id === authEmail
  );
  const canEdit = isNutritionistOwner || (isPatientOwner && !routine?.nutritionist_id);

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
    },
    onError: (err) => {
      toast({
        title: 'Falha ao iniciar treino',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive'
      });
    }
  });

  useEffect(() => {
    if (!autoStart || !routine || isEditing) return;
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    startSessionMutation.mutate();
  }, [autoStart, routine, isEditing, startSessionMutation]);

  const updateMutation = useMutation({
    mutationFn: async (patch) => appClient.entities.WorkoutRoutine.update(routine.id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routineDetail', routineId] });
      queryClient.invalidateQueries({ queryKey: ['workoutRoutines'] });
      queryClient.invalidateQueries({ queryKey: ['assignedWorkouts'] });
      setIsEditing(false);
      toast({ title: 'Rotina atualizada', description: 'As alterações foram salvas.' });
    },
    onError: (err) => {
      toast({ title: 'Falha ao salvar', description: err?.message || 'Erro desconhecido', variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => appClient.entities.WorkoutRoutine.delete(routine.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutRoutines'] });
      queryClient.invalidateQueries({ queryKey: ['assignedWorkouts'] });
      toast({ title: 'Rotina removida' });
      navigate(routine?.patient_id
        ? `${createPageUrl('PatientDetails')}?patientId=${encodeURIComponent(routine.patient_id)}`
        : createPageUrl('WorkoutTracker'));
    }
  });

  const handleSave = () => {
    updateMutation.mutate({
      name: draft.name.trim() || routine.name,
      description: draft.description.trim(),
      duration_minutes: Number(draft.duration_minutes) || 45,
      days_per_week: Number(draft.days_per_week) || 3,
      exercises: draft.exercises
    });
  };

  const addExerciseFromCatalog = (exercise) => {
    setDraft((prev) => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        {
          exercise_id: exercise.id,
          exercise_name: exercise.name,
          name: exercise.name,
          muscle_group: exercise.muscle_group || '',
          equipment: exercise.equipment || '',
          sets: 3,
          reps: 10,
          rest_seconds: 60,
          notes: ''
        }
      ]
    }));
  };

  const removeExerciseAt = (index) => {
    setDraft((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  const updateExerciseField = (index, field, value) => {
    setDraft((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) =>
        i === index ? { ...ex, [field]: field === 'notes' ? value : Number(value) || 0 } : ex
      )
    }));
  };

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

  if (!routineId) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-red-500">Parametro routineId ausente.</p>
      </div>
    );
  }

  const backUrl = routine?.patient_id && isNutritionistOwner
    ? `${createPageUrl('PatientDetails')}?patientId=${encodeURIComponent(routine.patient_id)}`
    : createPageUrl('WorkoutTracker');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link to={backUrl} className="inline-flex items-center text-gray-600 hover:text-indigo-600">
          <ArrowLeft size={16} className="mr-2" />
          Voltar
        </Link>

        {isLoading && <p className="text-gray-500">Carregando rotina...</p>}

        {!isLoading && !routine && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <p className="text-gray-600">Rotina não encontrada ou sem permissão de acesso.</p>
          </div>
        )}

        {routine && draft && !isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-md p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-800">{routine.name}</h1>
                <p className="text-gray-500 mt-1">{routine.description || 'Sem descrição cadastrada.'}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {routine.created_by_ai && (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                      <Sparkles size={12} />
                      Gerado por IA
                    </span>
                  )}
                  {routine.nutritionist_id && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                      Atribuído pela nutricionista
                    </span>
                  )}
                </div>
              </div>
              {canEdit && (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Pencil size={14} className="mr-1" />
                  Editar
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
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

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                Exercícios ({draft.exercises.length})
              </h2>
              {draft.exercises.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum exercício nesta rotina.</p>
              ) : (
                <ul className="space-y-2">
                  {draft.exercises.map((ex, index) => (
                    <li key={`${ex.exercise_id || ex.exercise_name}_${index}`} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                      <p className="font-semibold text-gray-800">{ex.exercise_name || ex.name}</p>
                      <p className="text-xs text-gray-500">
                        {ex.muscle_group || '—'} {ex.equipment ? `• ${ex.equipment}` : ''}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        {ex.sets || 3} séries × {ex.reps || 10} reps • descanso {ex.rest_seconds || 60}s
                      </p>
                      {ex.notes && <p className="text-xs text-indigo-600 mt-1">{ex.notes}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {isPatientOwner && (
              <Button
                onClick={() => startSessionMutation.mutate()}
                disabled={startSessionMutation.isPending}
                className="w-full bg-indigo-500 hover:bg-indigo-600"
              >
                <Play size={16} className="mr-2" />
                {startSessionMutation.isPending ? 'Iniciando...' : 'Iniciar treino'}
              </Button>
            )}
          </motion.div>
        )}

        {routine && draft && isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Editando rotina</h2>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setDraft({
                    name: routine.name || '',
                    description: routine.description || '',
                    duration_minutes: routine.duration_minutes || 45,
                    days_per_week: routine.days_per_week || 3,
                    exercises: Array.isArray(routine.exercises) ? routine.exercises : []
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Cancelar edição"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <Label>Nome</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  min={5}
                  max={180}
                  value={draft.duration_minutes}
                  onChange={(e) => setDraft((prev) => ({ ...prev, duration_minutes: e.target.value }))}
                />
              </div>
              <div>
                <Label>Dias/semana</Label>
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={draft.days_per_week}
                  onChange={(e) => setDraft((prev) => ({ ...prev, days_per_week: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Exercícios ({draft.exercises.length})</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowPicker(true)}>
                  <Plus size={14} className="mr-1" />
                  Adicionar
                </Button>
              </div>

              {draft.exercises.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum exercício. Clique em "Adicionar".</p>
              ) : (
                <ul className="space-y-2">
                  {draft.exercises.map((ex, index) => (
                    <li key={`edit_${ex.exercise_id || ex.exercise_name}_${index}`} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{ex.exercise_name || ex.name}</p>
                          <p className="text-xs text-gray-500">
                            {ex.muscle_group || '—'} {ex.equipment ? `• ${ex.equipment}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExerciseAt(index)}
                          className="text-red-500 hover:bg-red-50 p-1 rounded"
                          aria-label={`Remover ${ex.exercise_name || ex.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Séries</Label>
                          <Input type="number" min={1} value={ex.sets || 3} onChange={(e) => updateExerciseField(index, 'sets', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Reps</Label>
                          <Input type="number" min={1} value={ex.reps || 10} onChange={(e) => updateExerciseField(index, 'reps', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Descanso (s)</Label>
                          <Input type="number" min={0} value={ex.rest_seconds || 60} onChange={(e) => updateExerciseField(index, 'rest_seconds', e.target.value)} />
                        </div>
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs">Nota (opcional)</Label>
                        <Input value={ex.notes || ''} onChange={(e) => updateExerciseField(index, 'notes', e.target.value)} placeholder="Ex: foco em técnica" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
              >
                <Save size={16} className="mr-2" />
                {updateMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
              </Button>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  aria-label="Remover rotina"
                  onClick={() => {
                    if (window.confirm('Remover esta rotina permanentemente?')) deleteMutation.mutate();
                  }}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar exercício</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, grupo ou equipamento"
                className="pl-10"
              />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredCatalog.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  {exerciseCatalog.length === 0 ? 'Catálogo vazio.' : 'Nenhum resultado.'}
                </p>
              ) : (
                filteredCatalog.map((exercise) => (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => {
                      addExerciseFromCatalog(exercise);
                      setShowPicker(false);
                    }}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <p className="font-semibold text-gray-800">{exercise.name}</p>
                    <p className="text-xs text-gray-500">
                      {exercise.muscle_group || '—'} {exercise.equipment ? `• ${exercise.equipment}` : ''}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
