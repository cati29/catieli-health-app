import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  Users, MessageCircle, TrendingUp, Search,
  Target, Clock, CheckCircle2,
  Award, Download, BarChart3, Inbox, X, Check
} from 'lucide-react';
import { usePendingPatientRequests } from '@/hooks/useActivePatients';

export default function NutritionistDashboard() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGoal, setFilterGoal] = useState('all');

  useEffect(() => {
    const fetchUser = async () => {
      const user = await appClient.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: pendingRequestsFull = [] } = usePendingPatientRequests(!!currentUser);

  const respondToRequestMutation = useMutation({
    mutationFn: async ({ conversationId, accept }) => {
      return appClient.entities.Conversation.update(conversationId, {
        status: accept ? 'accepted' : 'closed'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingPatientRequests'] });
      queryClient.invalidateQueries({ queryKey: ['activePatients'] });
      queryClient.invalidateQueries({ queryKey: ['nutriConversations'] });
    }
  });

  // Fetch nutritionist profile
  const { data: profiles } = useQuery({
    queryKey: ['nutriProfile'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.UserProfile.filter({ created_by: user.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const nutriProfile = profiles?.[0];

  // Fetch all user profiles (patients)
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
      return appClient.entities.Conversation.filter({ nutritionist_id: user.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  // Fetch subscriptions
  const { data: subscriptions } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.Subscription.filter({ nutritionist_id: user.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  // Fetch daily goals for all patients
  const { data: allDailyGoals } = useQuery({
    queryKey: ['allDailyGoals'],
    queryFn: () => appClient.entities.DailyGoal.list(),
    enabled: !!currentUser,
    initialData: []
  });

  // Fetch patient goal assignments
  const { data: patientGoals } = useQuery({
    queryKey: ['patientGoals'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.PatientGoalAssignment.filter({ nutritionist_id: user.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const userProfiles = allProfiles.filter(p => p.user_type === 'user');
  const activePatients = conversations.filter(c => c.status === 'accepted').map(c => c.user_id);
  const pendingRequests = conversations.filter(c => c.status === 'pending');

  // Calculate aggregate statistics
  const totalPatients = activePatients.length;
  const activeGoals = patientGoals.filter(g => g.status === 'active').length;
  const completedGoals = patientGoals.filter(g => g.status === 'completed').length;
  
  // Goal distribution
  const goalDistribution = [
    { name: 'Emagrecimento', value: userProfiles.filter(p => activePatients.includes(p.created_by) && p.goal === 'weight_loss').length },
    { name: 'Ganho de Peso', value: userProfiles.filter(p => activePatients.includes(p.created_by) && p.goal === 'weight_gain').length },
    { name: 'Saúde', value: userProfiles.filter(p => activePatients.includes(p.created_by) && p.goal === 'health').length },
    { name: 'Ganho de Massa', value: userProfiles.filter(p => activePatients.includes(p.created_by) && p.goal === 'muscle_gain').length }
  ].filter(item => item.value > 0);

  const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];

  // Patient progress over last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const progressData = last7Days.map(date => {
    const dayGoals = allDailyGoals.filter(g => 
      g.date === date && activePatients.includes(g.created_by)
    );
    const completed = dayGoals.filter(g => g.completed).length;
    const total = dayGoals.length;
    
    return {
      date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      taxa: total > 0 ? Math.round((completed / total) * 100) : 0,
      pacientes: dayGoals.length
    };
  });

  // Filter patients
  const filteredPatients = userProfiles.filter(patient => {
    if (!activePatients.includes(patient.created_by)) return false;
    
    const matchesSearch = searchQuery === '' || 
      patient.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.last_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGoal = filterGoal === 'all' || patient.goal === filterGoal;
    
    return matchesSearch && matchesGoal;
  });

  const downloadReport = () => {
    const report = `
RELAT\u00d3RIO NUTRICIONISTA - HEALTH APP
Data: ${new Date().toLocaleDateString('pt-BR')}
Nutricionista: ${nutriProfile?.first_name} ${nutriProfile?.last_name}

=======================================

RESUMO GERAL
- Total de Pacientes: ${totalPatients}
- Metas Ativas: ${activeGoals}
- Metas Completadas: ${completedGoals}
- Solicita\u00e7\u00f5es Pendentes: ${pendingRequests.length}

DISTRIBUI\u00c7\u00c3O DE OBJETIVOS
${goalDistribution.map(g => `- ${g.name}: ${g.value} pacientes`).join('\n')}

LISTA DE PACIENTES
${filteredPatients.map(p => `
- ${p.first_name} ${p.last_name}
  Objetivo: ${p.goal}
  Idade: ${p.age} anos
  Peso: ${p.weight} kg
  N\u00edvel: ${p.level}
`).join('\n')}

=======================================
    `;
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatório-nutricionista-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/20 pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold mb-2">Dashboard Nutricionista</h1>
                <p className="text-indigo-100">
                  Olá, {nutriProfile?.first_name}
                </p>
              </div>
              <Button
                onClick={downloadReport}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm"
              >
                <Download size={18} className="mr-2" />
                Exportar Relatório
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <Users className="mb-2" size={24} />
                <p className="text-3xl font-bold">{totalPatients}</p>
                <p className="text-sm text-indigo-100">Pacientes Ativos</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <Target className="mb-2" size={24} />
                <p className="text-3xl font-bold">{activeGoals}</p>
                <p className="text-sm text-indigo-100">Metas Ativas</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <CheckCircle2 className="mb-2" size={24} />
                <p className="text-3xl font-bold">{completedGoals}</p>
                <p className="text-sm text-indigo-100">Metas Completas</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <Clock className="mb-2" size={24} />
                <p className="text-3xl font-bold">{pendingRequests.length}</p>
                <p className="text-sm text-indigo-100">Pendentes</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Progress Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="text-indigo-500" size={20} />
              Taxa de Conclusão (7 dias)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="taxa" stroke="#6366f1" strokeWidth={3} name="Taxa %" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Goal Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="text-indigo-500" size={20} />
              Distribuição de Objetivos
            </h3>
            {goalDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={goalDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {goalDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-gray-400">
                Sem dados ainda
              </div>
            )}
          </motion.div>
        </div>

        {/* Pending Requests */}
        {pendingRequestsFull.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl shadow-lg p-6 border-2 border-amber-200"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Inbox className="text-amber-500" size={24} />
                Pedidos Pendentes
                <span className="px-2 py-0.5 text-sm bg-amber-100 text-amber-700 rounded-full">
                  {pendingRequestsFull.length}
                </span>
              </h3>
            </div>

            <div className="space-y-3">
              {pendingRequestsFull.map(({ conversation, patient }) => (
                <div
                  key={conversation.id}
                  className="p-4 border border-amber-100 bg-amber-50/30 rounded-xl flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-700 font-semibold">
                      {patient?.first_name?.[0] || '?'}{patient?.last_name?.[0] || ''}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-800">
                      {patient ? `${patient.first_name} ${patient.last_name}` : conversation.user_id}
                    </h4>
                    <p className="text-sm text-gray-500 truncate">
                      {conversation.last_message || 'Sem mensagem inicial'}
                    </p>
                    {patient?.goal && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                        {patient.goal === 'weight_loss' ? 'Emagrecimento'
                          : patient.goal === 'weight_gain' ? 'Ganho de peso'
                          : patient.goal === 'muscle_gain' ? 'Ganho de massa' : 'Saúde'}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => respondToRequestMutation.mutate({ conversationId: conversation.id, accept: true })}
                      disabled={respondToRequestMutation.isPending}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      <Check size={16} className="mr-1" />
                      Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => respondToRequestMutation.mutate({ conversationId: conversation.id, accept: false })}
                      disabled={respondToRequestMutation.isPending}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <X size={16} className="mr-1" />
                      Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Patient Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="text-indigo-500" size={24} />
              Meus Pacientes
            </h3>
            <Link to={createPageUrl('Chat')}>
              <Button size="sm" className="bg-indigo-500 hover:bg-indigo-600">
                <MessageCircle size={16} className="mr-2" />
                Mensagens
              </Button>
            </Link>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar paciente..."
                className="pl-10"
              />
            </div>
            <select
              value={filterGoal}
              onChange={(e) => setFilterGoal(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos os Objetivos</option>
              <option value="weight_loss">Emagrecimento</option>
              <option value="weight_gain">Ganho de Peso</option>
              <option value="health">Saúde</option>
              <option value="muscle_gain">Ganho de Massa</option>
            </select>
          </div>

          {/* Patients List */}
          <div className="space-y-3">
            {filteredPatients.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="mx-auto mb-4 text-gray-400" size={48} />
                <p>Nenhum paciente encontrado</p>
              </div>
            ) : (
              filteredPatients.map((patient) => {
                const patientGoals = allDailyGoals.filter(g => g.created_by === patient.created_by);
                const recentGoals = patientGoals.slice(-7);
                const completionRate = recentGoals.length > 0 
                  ? Math.round((recentGoals.filter(g => g.completed).length / recentGoals.length) * 100)
                  : 0;

                return (
                  <Link
                    key={patient.id}
                    to={createPageUrl(`PatientDetails?patientId=${patient.id}`)}
                  >
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className="p-4 border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {patient.photo_url ? (
                            <img src={patient.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-indigo-600 font-semibold text-lg">
                              {patient.first_name?.[0]}{patient.last_name?.[0]}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-800">
                            {patient.first_name} {patient.last_name}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            <span>{patient.age} anos</span>
                            <span>•</span>
                            <span>{patient.weight} kg</span>
                            <span>•</span>
                            <span className="capitalize">
                              {patient.goal === 'weight_loss' ? 'Emagrecimento' :
                               patient.goal === 'weight_gain' ? 'Ganho de peso' :
                               patient.goal === 'muscle_gain' ? 'Ganho de massa' : 'Saúde'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <Award size={16} className="text-amber-500" />
                            <span className="text-sm font-medium text-gray-700">Nível {patient.level}</span>
                          </div>
                          <div className={`text-sm font-semibold ${
                            completionRate >= 70 ? 'text-green-600' : 
                            completionRate >= 40 ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {completionRate}% conclusão
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
