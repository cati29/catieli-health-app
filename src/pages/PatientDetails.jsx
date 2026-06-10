import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AvatarEvolution from '@/components/avatar/AvatarEvolution';
import IMCCalculator from '@/components/imc/IMCCalculator';
import FeedbackForm from '@/components/nutritionist/FeedbackForm';
import AssignPlanModal from '@/components/nutritionist/AssignPlanModal';
import HealthDataWidget from '@/components/health/HealthDataWidget';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  ArrowLeft, Target, Droplets, Flame, Dumbbell,
  TrendingUp, Calendar, MessageCircle, Scale, Plus,
  Activity, Apple, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function PatientDetails() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const patientId = urlParams.get('patientId');
  const [currentUser, setCurrentUser] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showAssignPlan, setShowAssignPlan] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await appClient.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // Fetch patient profile
  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const profiles = await appClient.entities.UserProfile.filter({ id: patientId });
      return profiles[0] || null;
    },
    enabled: !!patientId,
    initialData: null
  });

  // Fetch patient's daily goals (last 30 days for charts)
  const { data: goals } = useQuery({
    queryKey: ['patientGoals', patient?.created_by],
    queryFn: () => appClient.entities.DailyGoal.filter({ created_by: patient.created_by }, '-date', 30),
    enabled: !!patient,
    initialData: []
  });

  // Fetch workout sessions
  const { data: workoutSessions } = useQuery({
    queryKey: ['workoutSessions', patient?.created_by],
    queryFn: () => appClient.entities.WorkoutSession.filter({ user_id: patient.created_by }, '-date', 14),
    enabled: !!patient,
    initialData: []
  });

  // Fetch nutrition data
  const { data: nutritionData } = useQuery({
    queryKey: ['nutritionData', patient?.created_by],
    queryFn: () => appClient.entities.DailyNutrition.filter({ user_id: patient.created_by }, '-date', 14),
    enabled: !!patient,
    initialData: []
  });

  // Fetch health data
  const { data: healthData } = useQuery({
    queryKey: ['healthData', patient?.created_by],
    queryFn: () => appClient.entities.HealthData.filter({ user_id: patient.created_by }, '-date', 14),
    enabled: !!patient,
    initialData: []
  });

  // Fetch assigned goals
  const { data: assignedGoals } = useQuery({
    queryKey: ['assignedGoals', patient?.created_by],
    queryFn: async () => {
      return appClient.entities.PatientGoalAssignment.filter({ 
        patient_id: patient.created_by,
        nutritionist_id: currentUser.email 
      });
    },
    enabled: !!patient && !!currentUser,
    initialData: []
  });

  // Send feedback mutation
  const sendFeedbackMutation = useMutation({
    mutationFn: async (feedbackData) => {
      const conversation = await appClient.entities.Conversation.filter({
        nutritionist_id: currentUser.email,
        user_id: patient.created_by
      });

      if (conversation[0]) {
        const feedbackMessage = `
x9 FEEDBACK DO NUTRICIONISTA

Tipo: ${feedbackData.type === 'nutrition' ? 'Nutrição' : feedbackData.type === 'exercise' ? 'Exercício' : 'Geral'}
Tom: ${feedbackData.sentiment === 'positive' ? 'x Positivo' : 'x Construtivo'}

${feedbackData.message}

---
Enviado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
        `;

        await appClient.entities.ChatMessage.create({
          conversation_id: conversation[0].id,
          sender_id: currentUser.email,
          receiver_id: patient.created_by,
          message: feedbackMessage
        });

        await appClient.entities.Conversation.update(conversation[0].id, {
          last_message: feedbackMessage.substring(0, 100) + '...',
          last_message_date: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      setShowFeedback(false);
    }
  });

  const goalLabels = {
    weight_loss: 'Emagrecimento',
    health: 'Saúde',
    weight_gain: 'Ganho de peso',
    other: 'Outros'
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Paciente não encontrado</h2>
        <Link to={createPageUrl('NutritionistDashboard')}>
          <Button className="bg-emerald-500 hover:bg-emerald-600">
            Voltar ao dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const todayGoal = goals[0];

  // Prepare chart data
  const weightChartData = patient?.weight_history?.slice(-14).map(entry => ({
    date: format(new Date(entry.date), 'dd/MM'),
    peso: entry.weight
  })) || [];

  const activityChartData = healthData.slice(-7).reverse().map(d => ({
    date: format(new Date(d.date), 'dd/MM'),
    passos: d.steps || 0,
    calorias: d.calories_burned || 0
  }));

  const nutritionChartData = nutritionData.slice(-7).reverse().map(d => ({
    date: format(new Date(d.date), 'dd/MM'),
    calorias: d.calories || 0,
    proteina: d.protein_g || 0
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 pt-8 pb-24 px-6">
        <div className="max-w-lg mx-auto">
          <Link 
            to={createPageUrl('NutritionistDashboard')}
            className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Voltar
          </Link>
          <h1 className="text-white text-2xl font-bold">Detalhes do Paciente</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-16">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden">
              {patient.photo_url ? (
                <img src={patient.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-emerald-500">
                  {patient.first_name?.[0]}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {patient.first_name} {patient.last_name}
              </h2>
              <p className="text-emerald-600 font-medium">
                {goalLabels[patient.goal]}
              </p>
            </div>
          </div>

          {/* Avatar & Level */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <AvatarEvolution 
              level={patient.level || 1} 
              xp={patient.xp || 0}
              size="sm"
              showStats={false}
            />
            <div className="text-right">
              <p className="text-sm text-gray-500">Nível</p>
              <p className="text-2xl font-bold text-gray-800">{patient.level || 1}</p>
              <p className="text-xs text-emerald-600">{patient.xp || 0} XP</p>
            </div>
          </div>
        </motion.div>

        {/* Wearable Data */}
        {patient?.wearable_data?.connected && healthData[0] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Activity className="text-blue-500" size={20} />
                Dados de Saúde Sincronizados
              </h3>
              <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
                {patient.wearable_data.device_type}
              </span>
            </div>
            <HealthDataWidget healthData={healthData[0]} compact />
          </motion.div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-blue-50 rounded-xl p-4 text-center"
          >
            <Droplets className="text-blue-500 mx-auto mb-2" size={24} />
            <p className="text-xl font-bold text-gray-800">
              {todayGoal?.water_consumed_ml || 0}ml
            </p>
            <p className="text-xs text-gray-500">Água hoje</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-orange-50 rounded-xl p-4 text-center"
          >
            <Flame className="text-orange-500 mx-auto mb-2" size={24} />
            <p className="text-xl font-bold text-gray-800">
              {todayGoal?.calories_consumed || 0}
            </p>
            <p className="text-xs text-gray-500">Calorias hoje</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-purple-50 rounded-xl p-4 text-center"
          >
            <Dumbbell className="text-purple-500 mx-auto mb-2" size={24} />
            <p className="text-xl font-bold text-gray-800">
              {todayGoal?.exercise_minutes_done || 0}
            </p>
            <p className="text-xs text-gray-500">Min exercício</p>
          </motion.div>
        </div>

        {/* Patient Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
        >
          <h3 className="font-bold text-gray-800 mb-4">Informações</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Idade</p>
              <p className="font-semibold text-gray-800">{patient.age} anos</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cidade</p>
              <p className="font-semibold text-gray-800">{patient.city || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Altura</p>
              <p className="font-semibold text-gray-800">{patient.height} cm</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Peso atual</p>
              <p className="font-semibold text-gray-800">{patient.weight} kg</p>
            </div>
          </div>
        </motion.div>

        {/* IMC */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <IMCCalculator 
            weight={patient.weight} 
            height={patient.height}
          />
        </motion.div>

        {/* Weight History */}
        {patient.weight_history?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-emerald-500" size={20} />
              <h3 className="font-bold text-gray-800">Evolução do Peso</h3>
            </div>

            <div className="space-y-2">
              {patient.weight_history.slice(-5).reverse().map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-500">
                    {format(new Date(entry.date), "d 'de' MMM", { locale: ptBR })}
                  </span>
                  <span className="font-semibold text-gray-800">{entry.weight} kg</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Goals History */}
        {goals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="text-emerald-500" size={20} />
              <h3 className="font-bold text-gray-800">altimos 7 dias</h3>
            </div>

            <div className="space-y-3">
              {goals.map((goal, idx) => (
                <div key={goal.id} className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {format(new Date(goal.date), "EEEE, d/MM", { locale: ptBR })}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="text-gray-400">Água</p>
                      <p className="font-semibold text-blue-600">{goal.water_consumed_ml || 0}ml</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Calorias</p>
                      <p className="font-semibold text-orange-600">{goal.calories_consumed || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Exercício</p>
                      <p className="font-semibold text-purple-600">{goal.exercise_minutes_done || 0}min</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Assigned Goals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Target className="text-emerald-500" size={20} />
              Metas Atribuídas
            </h3>
            <Button
              size="sm"
              onClick={() => setShowAssignPlan(true)}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              <Plus size={16} className="mr-1" />
              Atribuir
            </Button>
          </div>

          {assignedGoals.length === 0 ? (
            <p className="text-center text-gray-400 py-4">Nenhuma meta atribuída</p>
          ) : (
            <div className="space-y-3">
              {assignedGoals.map((goal) => (
                <div key={goal.id} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">{goal.goal_title}</p>
                      <p className="text-sm text-gray-600 mt-1">{goal.goal_description}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      goal.status === 'active' ? 'bg-green-100 text-green-700' :
                      goal.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {goal.status === 'active' ? 'Ativa' : 
                       goal.status === 'completed' ? 'Completa' : 'Cancelada'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Meta: {goal.target_value}</span>
                    <span>|</span>
                    <span>Progresso: {goal.progress}%</span>
                    {goal.end_date && (
                      <>
                        <span>|</span>
                        <span>Até: {new Date(goal.end_date).toLocaleDateString('pt-BR')}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Workout Sessions */}
        {workoutSessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          >
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Dumbbell className="text-purple-500" size={20} />
              Treinos Recentes
            </h3>
            <div className="space-y-2">
              {workoutSessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">{session.routine_name || 'Treino'}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(session.date), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-purple-600">{session.duration_minutes}min</p>
                    <p className="text-xs text-gray-500">{session.calories_burned} cal</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Charts */}
        {weightChartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          >
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Scale className="text-emerald-500" size={20} />
              Evolução do Peso
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weightChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip />
                <Line type="monotone" dataKey="peso" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {activityChartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          >
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Activity className="text-blue-500" size={20} />
              Atividade Física
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={activityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip />
                <Line type="monotone" dataKey="passos" stroke="#3b82f6" strokeWidth={2} name="Passos" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {nutritionChartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          >
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Apple className="text-orange-500" size={20} />
              Nutrição
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={nutritionChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip />
                <Line type="monotone" dataKey="calorias" stroke="#f97316" strokeWidth={2} name="Calorias" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button
            onClick={() => setShowFeedback(true)}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            <Send size={18} className="mr-2" />
            Enviar Feedback
          </Button>
          <Link to={createPageUrl('Chat')} className="block">
            <Button className="w-full bg-indigo-500 hover:bg-indigo-600">
              <MessageCircle size={18} className="mr-2" />
              Chat
            </Button>
          </Link>
        </div>

        {/* Feedback Modal */}
        <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Enviar Feedback - {patient?.first_name}</DialogTitle>
            </DialogHeader>
            <FeedbackForm
              onSend={(data) => sendFeedbackMutation.mutate(data)}
              isLoading={sendFeedbackMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Assign Plan Modal */}
        <AssignPlanModal
          isOpen={showAssignPlan}
          onClose={() => setShowAssignPlan(false)}
          patient={patient}
          nutritionistId={currentUser?.email}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['assignedGoals'] });
            setShowAssignPlan(false);
          }}
        />
      </div>
    </div>
  );
}

