import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createNotification } from '@/components/notifications/NotificationHelper';
import { 
  Target, Plus, Trash2, CheckCircle2
} from 'lucide-react';

export default function PatientGoalManager() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [goalForm, setGoalForm] = useState({
    goal_title: '',
    goal_description: '',
    goal_type: 'custom',
    target_value: '',
    unit: '',
    end_date: ''
  });

  useEffect(() => {
    const fetchUser = async () => {
      const user = await appClient.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // Fetch all patients
  const { data: allProfiles } = useQuery({
    queryKey: ['allProfiles'],
    queryFn: () => appClient.entities.UserProfile.list(),
    enabled: !!currentUser,
    initialData: []
  });

  // Fetch conversations
  const { data: conversations } = useQuery({
    queryKey: ['nutriConversations'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.Conversation.filter({ nutritionist_id: user.email, status: 'accepted' });
    },
    enabled: !!currentUser,
    initialData: []
  });

  // Fetch assigned goals
  const { data: assignedGoals } = useQuery({
    queryKey: ['assignedGoals'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.PatientGoalAssignment.filter({ nutritionist_id: user.email }, '-created_date');
    },
    enabled: !!currentUser,
    initialData: []
  });

  const myPatients = allProfiles.filter(p => 
    conversations.some(c => c.user_id === p.created_by)
  );

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async (goalData) => {
      const user = await appClient.auth.me();
      const goal = await appClient.entities.PatientGoalAssignment.create({
        nutritionist_id: user.email,
        patient_id: selectedPatient,
        ...goalData,
        start_date: new Date().toISOString().split('T')[0],
        status: 'active',
        progress: 0
      });

      // Send notification to patient
      await createNotification(
        selectedPatient,
        'achievement',
        '🎯 Nova Meta Atribuída!',
        `Seu nutricionista atribuiu uma nova meta: ${goalData.goal_title}`,
        '/Goals',
        null,
        true
      );

      return goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignedGoals'] });
      setShowCreateDialog(false);
      setGoalForm({
        goal_title: '',
        goal_description: '',
        goal_type: 'custom',
        target_value: '',
        unit: '',
        end_date: ''
      });
      setSelectedPatient('');
    }
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: (goalId) => appClient.entities.PatientGoalAssignment.delete(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignedGoals'] });
    }
  });

  // Update goal status
  const updateGoalMutation = useMutation({
    mutationFn: ({ goalId, status }) => 
      appClient.entities.PatientGoalAssignment.update(goalId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignedGoals'] });
    }
  });

  const handleCreateGoal = () => {
    createGoalMutation.mutate(goalForm);
  };

  const getPatientName = (patientId) => {
    const patient = allProfiles.find(p => p.created_by === patientId);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Desconhecido';
  };

  const goalTypeLabels = {
    water: 'Hidratação',
    exercise: 'Exercício',
    calories: 'Calorias',
    weight: 'Peso',
    custom: 'Personalizada'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-teal-50/20 pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Target size={32} />
                </div>
                <div>
                  <h1 className="text-4xl font-bold">Gerenciar Metas</h1>
                  <p className="text-teal-100">Atribua metas personalizadas aos pacientes</p>
                </div>
              </div>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-white text-teal-600 hover:bg-teal-50"
              >
                <Plus size={18} className="mr-2" />
                Nova Meta
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid gap-6">
          {assignedGoals.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="text-teal-500" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Nenhuma meta atribuída ainda
              </h3>
              <p className="text-gray-500 mb-6">
                Comece atribuindo metas personalizadas aos seus pacientes
              </p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
              >
                <Plus size={18} className="mr-2" />
                Criar Primeira Meta
              </Button>
            </div>
          ) : (
            assignedGoals.map((goal) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl shadow-md p-6 border-l-4 ${
                  goal.status === 'completed' ? 'border-green-500' :
                  goal.status === 'cancelled' ? 'border-red-500' :
                  'border-teal-500'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">{goal.goal_title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        goal.status === 'completed' ? 'bg-green-100 text-green-700' :
                        goal.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-teal-100 text-teal-700'
                      }`}>
                        {goal.status === 'completed' ? 'Completa' :
                         goal.status === 'cancelled' ? 'Cancelada' : 'Ativa'}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{goal.goal_description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">
                        Paciente: {getPatientName(goal.patient_id)}
                      </span>
                      <span>⬢</span>
                      <span>Tipo: {goalTypeLabels[goal.goal_type]}</span>
                      <span>⬢</span>
                      <span>Meta: {goal.target_value} {goal.unit}</span>
                      {goal.end_date && (
                        <>
                          <span>⬢</span>
                          <span>Até: {new Date(goal.end_date).toLocaleDateString('pt-BR')}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {goal.status === 'active' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateGoalMutation.mutate({ goalId: goal.id, status: 'completed' })}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <CheckCircle2 size={16} className="mr-1" />
                          Concluir
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateGoalMutation.mutate({ goalId: goal.id, status: 'cancelled' })}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {goal.status === 'active' && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Progresso</span>
                      <span className="font-semibold text-teal-600">{goal.progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-600 transition-all"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Create Goal Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atribuir Nova Meta</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Selecione o Paciente</Label>
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Escolha um paciente</option>
                {myPatients.map((patient) => (
                  <option key={patient.id} value={patient.created_by}>
                    {patient.first_name} {patient.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Tipo de Meta</Label>
              <select
                value={goalForm.goal_type}
                onChange={(e) => setGoalForm({ ...goalForm, goal_type: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="water">Hidratação</option>
                <option value="exercise">Exercício</option>
                <option value="calories">Calorias</option>
                <option value="weight">Peso</option>
                <option value="custom">Personalizada</option>
              </select>
            </div>

            <div>
              <Label>Título da Meta</Label>
              <Input
                value={goalForm.goal_title}
                onChange={(e) => setGoalForm({ ...goalForm, goal_title: e.target.value })}
                placeholder="Ex: Aumentar consumo de água"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={goalForm.goal_description}
                onChange={(e) => setGoalForm({ ...goalForm, goal_description: e.target.value })}
                placeholder="Descreva a meta em detalhes..."
                className="mt-1 h-24"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor Alvo</Label>
                <Input
                  type="number"
                  value={goalForm.target_value}
                  onChange={(e) => setGoalForm({ ...goalForm, target_value: e.target.value })}
                  placeholder="Ex: 3"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Unidade</Label>
                <Input
                  value={goalForm.unit}
                  onChange={(e) => setGoalForm({ ...goalForm, unit: e.target.value })}
                  placeholder="Ex: litros"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Data Limite</Label>
              <Input
                type="date"
                value={goalForm.end_date}
                onChange={(e) => setGoalForm({ ...goalForm, end_date: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateGoal}
                disabled={!selectedPatient || !goalForm.goal_title || !goalForm.target_value || createGoalMutation.isPending}
                className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700"
              >
                {createGoalMutation.isPending ? 'Criando...' : 'Criar Meta'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
