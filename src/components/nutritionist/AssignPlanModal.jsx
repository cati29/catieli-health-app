import React, { useState } from 'react';
import { appClient } from '@/api/appClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Target, Dumbbell, Utensils } from 'lucide-react';

export default function AssignPlanModal({ isOpen, onClose, patient, nutritionistId, onSuccess }) {
  const [planType, setPlanType] = useState('workout');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: workoutRoutines } = useQuery({
    queryKey: ['workoutRoutines'],
    queryFn: () => appClient.entities.WorkoutRoutine.filter({ is_active: true }),
    enabled: isOpen && planType === 'workout',
    initialData: []
  });

  const { data: mealPlans } = useQuery({
    queryKey: ['mealPlans'],
    queryFn: () => appClient.entities.MealPlan.filter({ is_active: true }),
    enabled: isOpen && planType === 'nutrition',
    initialData: []
  });

  const handleAssign = async () => {
    if (planType === 'custom') {
      await appClient.entities.PatientGoalAssignment.create({
        nutritionist_id: nutritionistId,
        patient_id: patient.created_by,
        goal_type: 'custom',
        goal_title: customTitle,
        goal_description: customDescription,
        target_value: parseFloat(targetValue) || 0,
        unit: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: endDate,
        status: 'active',
        progress: 0
      });
    }
    
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Atribuir Plano - {patient?.first_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              Tipo de Plano
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setPlanType('workout')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  planType === 'workout'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Dumbbell className="mx-auto mb-2 text-purple-600" size={24} />
                <p className="text-sm font-medium">Treino</p>
              </button>
              <button
                onClick={() => setPlanType('nutrition')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  planType === 'nutrition'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Utensils className="mx-auto mb-2 text-orange-600" size={24} />
                <p className="text-sm font-medium">Nutrição</p>
              </button>
              <button
                onClick={() => setPlanType('custom')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  planType === 'custom'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Target className="mx-auto mb-2 text-emerald-600" size={24} />
                <p className="text-sm font-medium">Meta</p>
              </button>
            </div>
          </div>

          {planType === 'workout' && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Selecionar Rotina de Treino
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {workoutRoutines.map((routine) => (
                  <button
                    key={routine.id}
                    onClick={() => setSelectedPlan(routine)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      selectedPlan?.id === routine.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold text-gray-800">{routine.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{routine.description}</p>
                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                      <span>{routine.exercises?.length} exercícios</span>
                      <span>⬢</span>
                      <span>{routine.duration_minutes} min</span>
                      <span>⬢</span>
                      <span>{routine.days_per_week}x/semana</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {planType === 'nutrition' && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Selecionar Plano Alimentar
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {mealPlans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      selectedPlan?.id === plan.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold text-gray-800">{plan.title}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {plan.total_calories_per_day} calorias/dia ⬢ {plan.duration_days} dias
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {planType === 'custom' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Título da Meta
                </label>
                <Input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Ex: Perder 5kg em 30 dias"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Descrição
                </label>
                <Textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Descreva os detalhes da meta..."
                  className="h-24"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Valor Alvo
                  </label>
                  <Input
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="Ex: 5"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Data Final
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleAssign}
              disabled={
                (planType !== 'custom' && !selectedPlan) ||
                (planType === 'custom' && (!customTitle || !targetValue || !endDate))
              }
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
            >
              Atribuir Plano
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
