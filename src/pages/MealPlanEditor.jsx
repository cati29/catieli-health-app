import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Coffee, Loader2, Moon, Pencil, Plus, Save, Trash2, UtensilsCrossed, X } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';

const MEAL_LABELS = {
  breakfast: 'Café da manhã',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Lanche'
};

const MEAL_ICONS = {
  breakfast: Coffee,
  lunch: UtensilsCrossed,
  dinner: Moon,
  snack: Coffee
};

const emptyMeal = (dayNumber) => ({
  day_number: dayNumber,
  meal_type: 'lunch',
  name: '',
  recipe: '',
  ingredients: [],
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  prep_time_minutes: 30
});

export default function MealPlanEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const planId = useMemo(() => new URLSearchParams(location.search).get('planId'), [location.search]);

  const [editingMealId, setEditingMealId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [creatingDay, setCreatingDay] = useState(null);

  const { data: currentProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const me = await appClient.auth.me();
      const rows = await appClient.entities.UserProfile.filter({ created_by: me.email }, '-created_date', 1);
      return rows[0] || null;
    }
  });

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ['mealPlan', planId],
    queryFn: async () => {
      const rows = await appClient.entities.MealPlan.filter({ id: planId }, null, 1);
      return rows[0] || null;
    },
    enabled: Boolean(planId)
  });

  const { data: meals = [], isLoading: mealsLoading } = useQuery({
    queryKey: ['meals', planId],
    queryFn: async () => {
      const rows = await appClient.entities.Meal.filter({ meal_plan_id: planId });
      return rows.sort((a, b) =>
        (a.day_number || 1) - (b.day_number || 1) ||
        String(a.meal_type).localeCompare(String(b.meal_type))
      );
    },
    enabled: Boolean(planId),
    initialData: []
  });

  const isNutritionistOwner = Boolean(
    currentProfile?.user_type === 'nutritionist' &&
    plan?.nutritionist_id &&
    plan.nutritionist_id === currentProfile?.email
  );
  const isPatientOwner = Boolean(
    plan?.user_id &&
    currentProfile?.email &&
    plan.user_id === currentProfile.email
  );
  const canEdit = isNutritionistOwner || (isPatientOwner && !plan?.nutritionist_id);

  const updateMealMutation = useMutation({
    mutationFn: async ({ id, patch }) => appClient.entities.Meal.update(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', planId] });
      setEditingMealId(null);
      setDraft(null);
      toast({ title: 'Refeição atualizada' });
    }
  });

  const createMealMutation = useMutation({
    mutationFn: async (newMeal) => {
      const ownership = plan.nutritionist_id
        ? {
            user_id: plan.user_id,
            patient_id: plan.user_id,
            nutritionist_id: plan.nutritionist_id,
            created_by: plan.nutritionist_id
          }
        : {
            user_id: plan.user_id,
            created_by: plan.user_id
          };
      return appClient.entities.Meal.create({
        ...ownership,
        meal_plan_id: plan.id,
        ...newMeal
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', planId] });
      setCreatingDay(null);
      setDraft(null);
      toast({ title: 'Refeição adicionada' });
    }
  });

  const deleteMealMutation = useMutation({
    mutationFn: (id) => appClient.entities.Meal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', planId] });
      toast({ title: 'Refeição removida' });
    }
  });

  const updatePlanMutation = useMutation({
    mutationFn: (patch) => appClient.entities.MealPlan.update(plan.id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPlan', planId] });
      toast({ title: 'Plano atualizado' });
    }
  });

  const startEditing = (meal) => {
    setEditingMealId(meal.id);
    setCreatingDay(null);
    setDraft({
      name: meal.name || '',
      recipe: meal.recipe || '',
      ingredients: Array.isArray(meal.ingredients) ? meal.ingredients.join(', ') : '',
      meal_type: meal.meal_type || 'lunch',
      calories: meal.calories || 0,
      protein_g: meal.protein_g || 0,
      carbs_g: meal.carbs_g || 0,
      fat_g: meal.fat_g || 0,
      prep_time_minutes: meal.prep_time_minutes || 30
    });
  };

  const startCreating = (dayNumber) => {
    setCreatingDay(dayNumber);
    setEditingMealId(null);
    setDraft({
      name: '',
      recipe: '',
      ingredients: '',
      meal_type: 'lunch',
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      prep_time_minutes: 30
    });
  };

  const cancelDraft = () => {
    setEditingMealId(null);
    setCreatingDay(null);
    setDraft(null);
  };

  const handleSaveDraft = () => {
    const payload = {
      name: draft.name.trim() || 'Refeição',
      recipe: draft.recipe.trim(),
      ingredients: draft.ingredients
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean),
      meal_type: draft.meal_type,
      calories: Number(draft.calories) || 0,
      protein_g: Number(draft.protein_g) || 0,
      carbs_g: Number(draft.carbs_g) || 0,
      fat_g: Number(draft.fat_g) || 0,
      prep_time_minutes: Number(draft.prep_time_minutes) || 30
    };

    if (editingMealId) {
      updateMealMutation.mutate({ id: editingMealId, patch: payload });
    } else if (creatingDay) {
      createMealMutation.mutate({ ...payload, day_number: creatingDay });
    }
  };

  useEffect(() => {
    if (!planId) navigate(createPageUrl('NutritionistDashboard'), { replace: true });
  }, [planId, navigate]);

  if (!planId) return null;

  if (planLoading || mealsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen p-6">
        <Link to={createPageUrl('NutritionistDashboard')} className="inline-flex items-center text-gray-600 hover:text-emerald-600 mb-4">
          <ArrowLeft size={16} className="mr-2" />
          Voltar
        </Link>
        <p className="text-red-500">Plano alimentar não encontrado.</p>
      </div>
    );
  }

  const backUrl = isNutritionistOwner && plan.patient_id
    ? `${createPageUrl('PatientPlanBuilder')}?patientId=${encodeURIComponent(
        plan.patient_profile_id || ''
      )}`
    : createPageUrl('MealPlans');

  const days = Array.from({ length: plan.duration_days || 7 }, (_, i) => i + 1);
  const mealsByDay = days.reduce((acc, day) => {
    acc[day] = meals.filter((m) => (m.day_number || 1) === day);
    return acc;
  }, {});

  const isEditingDraft = Boolean(editingMealId) || creatingDay !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link to={backUrl} className="inline-flex items-center text-gray-600 hover:text-emerald-600">
          <ArrowLeft size={16} className="mr-2" />
          Voltar
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-md p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-800">{plan.title}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {plan.duration_days || 7} dias • {plan.total_calories_per_day || 0} kcal/dia • Objetivo: {plan.goal || '—'}
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {plan.created_by_ai && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                    Gerado por IA
                  </span>
                )}
                {plan.nutritionist_id && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                    Atribuído pela nutricionista
                  </span>
                )}
              </div>
              {plan.assisted_notes && (
                <p className="text-xs text-gray-600 mt-3 p-2 bg-gray-50 rounded">
                  <strong>Observações:</strong> {plan.assisted_notes}
                </p>
              )}
            </div>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const newTitle = window.prompt('Novo título do plano', plan.title);
                  if (newTitle && newTitle.trim()) {
                    updatePlanMutation.mutate({ title: newTitle.trim() });
                  }
                }}
              >
                <Pencil size={14} className="mr-1" />
                Renomear
              </Button>
            )}
          </div>
        </motion.div>

        {days.map((day) => (
          <motion.div
            key={day}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-md p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Dia {day}</h2>
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startCreating(day)}
                  disabled={isEditingDraft}
                >
                  <Plus size={14} className="mr-1" />
                  Adicionar refeição
                </Button>
              )}
            </div>

            {mealsByDay[day].length === 0 && creatingDay !== day && (
              <p className="text-sm text-gray-500">Nenhuma refeição para este dia.</p>
            )}

            <div className="space-y-3">
              {mealsByDay[day].map((meal) => {
                const Icon = MEAL_ICONS[meal.meal_type] || UtensilsCrossed;
                const isEditingThisMeal = editingMealId === meal.id;
                return (
                  <div key={meal.id} className="border border-slate-200 rounded-xl p-4">
                    {!isEditingThisMeal ? (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-800 flex items-center gap-2">
                            <Icon size={16} className="text-emerald-600" />
                            {MEAL_LABELS[meal.meal_type] || meal.meal_type}: {meal.name}
                          </p>
                          {meal.recipe && <p className="text-sm text-gray-600 mt-1">{meal.recipe}</p>}
                          {Array.isArray(meal.ingredients) && meal.ingredients.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              <strong>Ingredientes:</strong> {meal.ingredients.join(', ')}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {meal.calories || 0} kcal • P: {meal.protein_g || 0}g • C: {meal.carbs_g || 0}g • G: {meal.fat_g || 0}g • {meal.prep_time_minutes || 0} min
                          </p>
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditing(meal)}
                              disabled={isEditingDraft}
                            >
                              <Pencil size={14} />
                            </Button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Remover "${meal.name}"?`)) deleteMealMutation.mutate(meal.id);
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                              aria-label={`Remover ${meal.name}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <MealForm
                        draft={draft}
                        setDraft={setDraft}
                        onSave={handleSaveDraft}
                        onCancel={cancelDraft}
                        isSaving={updateMealMutation.isPending}
                      />
                    )}
                  </div>
                );
              })}

              {creatingDay === day && (
                <div className="border-2 border-dashed border-emerald-200 rounded-xl p-4">
                  <MealForm
                    draft={draft}
                    setDraft={setDraft}
                    onSave={handleSaveDraft}
                    onCancel={cancelDraft}
                    isSaving={createMealMutation.isPending}
                  />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function MealForm({ draft, setDraft, onSave, onCancel, isSaving }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-800">Refeição</p>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Cancelar"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Tipo</Label>
          <select
            value={draft.meal_type}
            onChange={(e) => setDraft((prev) => ({ ...prev, meal_type: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          >
            <option value="breakfast">Café da manhã</option>
            <option value="lunch">Almoço</option>
            <option value="dinner">Jantar</option>
            <option value="snack">Lanche</option>
          </select>
        </div>
        <div>
          <Label>Nome do prato</Label>
          <Input
            value={draft.name}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Frango grelhado com arroz"
          />
        </div>
      </div>

      <div>
        <Label>Ingredientes (separados por vírgula)</Label>
        <Input
          value={draft.ingredients}
          onChange={(e) => setDraft((prev) => ({ ...prev, ingredients: e.target.value }))}
          placeholder="frango, arroz integral, brócolis"
        />
      </div>

      <div>
        <Label>Modo de preparo</Label>
        <Textarea
          value={draft.recipe}
          onChange={(e) => setDraft((prev) => ({ ...prev, recipe: e.target.value }))}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div>
          <Label className="text-xs">Calorias</Label>
          <Input type="number" min={0} value={draft.calories} onChange={(e) => setDraft((prev) => ({ ...prev, calories: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Proteína (g)</Label>
          <Input type="number" min={0} value={draft.protein_g} onChange={(e) => setDraft((prev) => ({ ...prev, protein_g: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Carb (g)</Label>
          <Input type="number" min={0} value={draft.carbs_g} onChange={(e) => setDraft((prev) => ({ ...prev, carbs_g: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Gordura (g)</Label>
          <Input type="number" min={0} value={draft.fat_g} onChange={(e) => setDraft((prev) => ({ ...prev, fat_g: e.target.value }))} />
        </div>
      </div>

      <div>
        <Label className="text-xs">Preparo (min)</Label>
        <Input
          type="number"
          min={0}
          value={draft.prep_time_minutes}
          onChange={(e) => setDraft((prev) => ({ ...prev, prep_time_minutes: e.target.value }))}
        />
      </div>

      <Button onClick={onSave} disabled={isSaving} className="w-full bg-emerald-500 hover:bg-emerald-600">
        <Save size={14} className="mr-2" />
        {isSaving ? 'Salvando...' : 'Salvar refeição'}
      </Button>
    </div>
  );
}
