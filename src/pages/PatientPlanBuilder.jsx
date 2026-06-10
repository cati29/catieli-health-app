import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Apple,
  Calendar,
  Dumbbell,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Utensils
} from 'lucide-react';
import { appClient } from '@/api/appClient';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { AssistedPlanGenerator } from '@/components/services/AssistedPlanGenerator';

export default function PatientPlanBuilder() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(location.search);
  const patientId = params.get('patientId');

  const [activeTab, setActiveTab] = useState('workouts');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [mealNotes, setMealNotes] = useState('');
  const [mealRestrictions, setMealRestrictions] = useState('');

  const { data: currentProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const me = await appClient.auth.me();
      const rows = await appClient.entities.UserProfile.filter({ created_by: me.email }, '-created_date', 1);
      return rows[0] || null;
    }
  });

  const nutritionistEmail = currentProfile?.email;
  const isNutritionist = currentProfile?.user_type === 'nutritionist';

  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const rows = await appClient.entities.UserProfile.filter({ id: patientId }, null, 1);
      return rows[0] || null;
    },
    enabled: Boolean(patientId)
  });

  const patientEmail = patient?.email || patient?.created_by;

  const workoutsQuery = useQuery({
    queryKey: ['patientWorkouts', patientEmail, nutritionistEmail],
    queryFn: () =>
      AssistedPlanGenerator.listPatientWorkouts({
        patientEmail,
        nutritionistEmail
      }),
    enabled: Boolean(patientEmail && nutritionistEmail),
    initialData: []
  });

  const mealPlansQuery = useQuery({
    queryKey: ['patientMealPlans', patientEmail, nutritionistEmail],
    queryFn: () =>
      AssistedPlanGenerator.listPatientMealPlans({
        patientEmail,
        nutritionistEmail
      }),
    enabled: Boolean(patientEmail && nutritionistEmail),
    initialData: []
  });

  const generateWorkoutMutation = useMutation({
    mutationFn: () =>
      AssistedPlanGenerator.generateWorkoutPlan({
        targetProfile: patient,
        targetEmail: patientEmail,
        nutritionistEmail,
        notes: workoutNotes
      }),
    onSuccess: ({ created, planTitle }) => {
      toast({
        title: 'Plano de treino criado',
        description: `${planTitle} — ${created.length} rotina(s) salva(s) na conta do paciente.`
      });
      setWorkoutNotes('');
      queryClient.invalidateQueries({ queryKey: ['patientWorkouts'] });
      queryClient.invalidateQueries({ queryKey: ['workoutRoutines'] });
      queryClient.invalidateQueries({ queryKey: ['assignedWorkouts'] });
    },
    onError: (err) => {
      toast({
        title: 'Falha ao gerar treino',
        description: err?.message || 'Erro inesperado',
        variant: 'destructive'
      });
    }
  });

  const generateMealPlanMutation = useMutation({
    mutationFn: () =>
      AssistedPlanGenerator.generateMealPlan({
        targetProfile: patient,
        targetEmail: patientEmail,
        nutritionistEmail,
        restrictions: mealRestrictions,
        notes: mealNotes
      }),
    onSuccess: ({ title, daysCreated }) => {
      toast({
        title: 'Plano alimentar criado',
        description: `${title} — ${daysCreated} dia(s) de refeições salvos.`
      });
      setMealNotes('');
      setMealRestrictions('');
      queryClient.invalidateQueries({ queryKey: ['patientMealPlans'] });
      queryClient.invalidateQueries({ queryKey: ['mealPlans'] });
    },
    onError: (err) => {
      toast({
        title: 'Falha ao gerar dieta',
        description: err?.message || 'Erro inesperado',
        variant: 'destructive'
      });
    }
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: (id) => appClient.entities.WorkoutRoutine.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientWorkouts'] });
      toast({ title: 'Treino removido' });
    },
    onError: (err) => {
      toast({
        title: 'Falha ao remover treino',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive'
      });
    }
  });

  const deleteMealPlanMutation = useMutation({
    mutationFn: async (planId) => {
      const meals = await appClient.entities.Meal.filter({ meal_plan_id: planId });
      const results = await Promise.allSettled(meals.map((m) => appClient.entities.Meal.delete(m.id)));
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        throw new Error(`${failed.length} refeição(ões) não puderam ser removidas. Plano mantido.`);
      }
      await appClient.entities.MealPlan.delete(planId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientMealPlans'] });
      toast({ title: 'Plano alimentar removido' });
    },
    onError: (err) => {
      toast({
        title: 'Falha ao remover plano',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive'
      });
    }
  });

  const backUrl = useMemo(
    () => (patientId ? `${createPageUrl('PatientDetails')}?patientId=${encodeURIComponent(patientId)}` : createPageUrl('NutritionistDashboard')),
    [patientId]
  );

  useEffect(() => {
    if (!patientId) navigate(createPageUrl('NutritionistDashboard'), { replace: true });
  }, [patientId, navigate]);

  if (!patientId) return null;

  if (patientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen p-6">
        <Link to={createPageUrl('NutritionistDashboard')} className="inline-flex items-center text-gray-600 hover:text-emerald-600 mb-4">
          <ArrowLeft size={16} className="mr-2" />
          Voltar
        </Link>
        <p className="text-red-500">Paciente não encontrado.</p>
      </div>
    );
  }

  if (!isNutritionist) {
    return (
      <div className="min-h-screen p-6">
        <p className="text-red-500">Acesso restrito a nutricionistas.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link to={backUrl} className="inline-flex items-center text-gray-600 hover:text-emerald-600">
          <ArrowLeft size={16} className="mr-2" />
          Voltar ao paciente
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-md p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden">
              {patient.photo_url ? (
                <img src={patient.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-emerald-500">
                  {patient.first_name?.[0]}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-800">
                {patient.first_name} {patient.last_name}
              </h1>
              <p className="text-sm text-gray-500">{patient.email || patient.created_by}</p>
              <p className="text-xs text-emerald-600 mt-1">
                Objetivo: {patient.goal || 'não definido'} • Peso: {patient.weight || '?'} kg • Altura: {patient.height || '?'} cm
              </p>
            </div>
          </div>
        </motion.div>

        <div className="flex gap-2 bg-white rounded-2xl shadow-sm p-2">
          <button
            type="button"
            onClick={() => setActiveTab('workouts')}
            className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'workouts'
                ? 'bg-indigo-500 text-white shadow'
                : 'text-gray-600 hover:bg-indigo-50'
            }`}
          >
            <Dumbbell size={16} />
            Treinos ({workoutsQuery.data.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('meals')}
            className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'meals'
                ? 'bg-emerald-500 text-white shadow'
                : 'text-gray-600 hover:bg-emerald-50'
            }`}
          >
            <Apple size={16} />
            Refeições ({mealPlansQuery.data.length})
          </button>
        </div>

        {activeTab === 'workouts' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Sparkles className="text-amber-500" size={20} />
                Gerar plano de treino com IA
              </h2>
              <p className="text-sm text-gray-500">
                A IA DeepSeek criará rotinas semanais personalizadas com base no perfil do paciente.
                As rotinas serão salvas diretamente na conta dele.
              </p>

              <div>
                <Label>Observações clínicas para a IA (opcional)</Label>
                <Textarea
                  value={workoutNotes}
                  onChange={(e) => setWorkoutNotes(e.target.value)}
                  placeholder="Ex: paciente com dor lombar leve, evitar agachamento livre. Foco em estabilização de core."
                  rows={3}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => generateWorkoutMutation.mutate()}
                  disabled={generateWorkoutMutation.isPending}
                  className="bg-indigo-500 hover:bg-indigo-600"
                >
                  {generateWorkoutMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} className="mr-2" />
                      Gerar com IA
                    </>
                  )}
                </Button>
                <Link
                  to={`${createPageUrl('RoutineBuilder')}?patient_id=${encodeURIComponent(patientEmail)}`}
                >
                  <Button type="button" variant="outline">
                    <Plus size={16} className="mr-2" />
                    Criar manualmente
                  </Button>
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="font-bold text-gray-800 mb-4">Treinos atribuídos ao paciente</h3>

              {workoutsQuery.isLoading ? (
                <p className="text-sm text-gray-500">Carregando...</p>
              ) : workoutsQuery.data.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Este paciente ainda não tem treinos. Gere um plano com IA ou crie manualmente.
                </p>
              ) : (
                <ul className="space-y-3">
                  {workoutsQuery.data.map((routine) => (
                    <li key={routine.id} className="border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{routine.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {routine.exercises?.length || 0} exercícios • {routine.duration_minutes || 0} min
                        </p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {routine.created_by_ai && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full inline-flex items-center gap-1">
                              <Sparkles size={11} /> IA
                            </span>
                          )}
                          {routine.nutritionist_id && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                              Atribuído por você
                            </span>
                          )}
                          {!routine.nutritionist_id && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                              Criado pelo paciente
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Link to={`${createPageUrl('RoutineDetail')}?routineId=${routine.id}`}>
                          <Button size="sm" variant="outline">
                            <Pencil size={14} className="mr-1" />
                            {routine.nutritionist_id === nutritionistEmail ? 'Editar' : 'Ver'}
                          </Button>
                        </Link>
                        {routine.nutritionist_id === nutritionistEmail && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Remover "${routine.name}"?`)) deleteWorkoutMutation.mutate(routine.id);
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            aria-label="Remover treino"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'meals' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Sparkles className="text-amber-500" size={20} />
                Gerar plano alimentar com IA
              </h2>
              <p className="text-sm text-gray-500">
                Cardápio semanal de 7 dias com 4 refeições por dia, baseado no perfil e objetivo do paciente.
              </p>

              <div>
                <Label>Restrições alimentares (separadas por vírgula)</Label>
                <Input
                  value={mealRestrictions}
                  onChange={(e) => setMealRestrictions(e.target.value)}
                  placeholder="Ex: lactose, glúten, frutos do mar"
                />
              </div>

              <div>
                <Label>Observações clínicas (opcional)</Label>
                <Textarea
                  value={mealNotes}
                  onChange={(e) => setMealNotes(e.target.value)}
                  placeholder="Ex: paciente com colesterol alto, reduzir gordura saturada. Vegetariana com ovos."
                  rows={3}
                />
              </div>

              <Button
                type="button"
                onClick={() => generateMealPlanMutation.mutate()}
                disabled={generateMealPlanMutation.isPending}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                {generateMealPlanMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="mr-2" />
                    Gerar com IA
                  </>
                )}
              </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="font-bold text-gray-800 mb-4">Planos alimentares do paciente</h3>

              {mealPlansQuery.isLoading ? (
                <p className="text-sm text-gray-500">Carregando...</p>
              ) : mealPlansQuery.data.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Este paciente ainda não tem plano alimentar. Gere um com IA.
                </p>
              ) : (
                <ul className="space-y-3">
                  {mealPlansQuery.data.map((plan) => (
                    <li key={plan.id} className="border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{plan.title}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                          <Calendar size={12} />
                          {plan.duration_days || 7} dias • {plan.total_calories_per_day || '?'} kcal/dia
                        </p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {plan.created_by_ai && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full inline-flex items-center gap-1">
                              <Sparkles size={11} /> IA
                            </span>
                          )}
                          {plan.nutritionist_id && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                              Atribuído por você
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Link to={`${createPageUrl('MealPlanEditor')}?planId=${plan.id}&from=patient:${encodeURIComponent(patientId)}`}>
                          <Button size="sm" variant="outline">
                            <Utensils size={14} className="mr-1" />
                            {plan.nutritionist_id === nutritionistEmail ? 'Editar' : 'Ver'}
                          </Button>
                        </Link>
                        {plan.nutritionist_id === nutritionistEmail && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Remover "${plan.title}"?`)) deleteMealPlanMutation.mutate(plan.id);
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            aria-label="Remover plano"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
