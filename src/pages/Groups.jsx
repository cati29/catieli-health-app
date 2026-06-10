import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Users, Search, TrendingDown, Activity, Dumbbell, Apple, Heart, MessageCircle } from 'lucide-react';

export default function Groups() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const suggestedGroups = [
    { id: 'suggest-1', name: 'Desafio 10k passos', category: 'running', member_count: 238, description: 'Rotina diária com ranking semanal de passos.' },
    { id: 'suggest-2', name: 'Receitas Fit Brasil', category: 'nutrition', member_count: 154, description: 'Troca de receitas práticas para rotina saudável.' },
    { id: 'suggest-3', name: 'Força em Casa', category: 'strength', member_count: 97, description: 'Treinos com peso corporal para todos os níveis.' }
  ];

  useEffect(() => {
    const fetchUser = async () => {
      const user = await appClient.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => appClient.entities.Group.list('-created_date'),
    enabled: !!currentUser,
    initialData: []
  });

  const { data: myMemberships } = useQuery({
    queryKey: ['myMemberships'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.GroupMember.filter({ user_id: user.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (group) => {
      const user = await appClient.auth.me();
      await appClient.entities.GroupMember.create({
        group_id: group.id,
        user_id: user.email,
        role: 'member',
        joined_date: new Date().toISOString()
      });
      await appClient.entities.Group.update(group.id, {
        member_count: (group.member_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['myMemberships'] });
    }
  });

  const filteredGroups = groups.filter(g => {
    const matchesSearch = searchQuery === '' || 
      g.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || g.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const myGroupIds = myMemberships.map(m => m.group_id);

  const categoryIcons = {
    weight_loss: TrendingDown,
    running: Activity,
    strength: Dumbbell,
    nutrition: Apple,
    motivation: Heart,
    general: MessageCircle
  };

  const categoryLabels = {
    weight_loss: 'Perda de Peso',
    running: 'Corrida',
    strength: 'Força',
    nutrition: 'Nutrição',
    motivation: 'Motivação',
    general: 'Geral'
  };

  return (
    <div className="app-shell bg-gradient-to-b from-slate-50 to-[#f4f7f8]">
      <div className="module-header">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Users size={32} />
                </div>
                <div>
                  <h1 className="text-4xl font-bold">Grupos de Apoio</h1>
                  <p className="text-indigo-100">Conecte-se com pessoas como você</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="surface-card p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar grupo..."
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todas Categorias</option>
              <option value="weight_loss">Perda de Peso</option>
              <option value="running">Corrida</option>
              <option value="strength">Força</option>
              <option value="nutrition">Nutrição</option>
              <option value="motivation">Motivação</option>
              <option value="general">Geral</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {filteredGroups.map((group, idx) => {
            const Icon = categoryIcons[group.category] || Users;
            const isMember = myGroupIds.includes(group.id);
            
            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="surface-card overflow-hidden hover:shadow-md transition-all"
              >
                <div className="relative h-32 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  {group.cover_image ? (
                    <img src={group.cover_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Icon className="text-white" size={48} />
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">{group.name}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{group.description}</p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{group.member_count || 0} membros</span>
                    <span className="capitalize">{categoryLabels[group.category]}</span>
                  </div>

                  {isMember ? (
                    <Link to={createPageUrl(`GroupDetail?groupId=${group.id}`)}>
                      <Button className="w-full bg-indigo-500 hover:bg-indigo-600">
                        Ver Grupo
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      onClick={() => joinGroupMutation.mutate(group)}
                      disabled={joinGroupMutation.isPending}
                      variant="outline"
                      className="w-full"
                    >
                      {joinGroupMutation.isPending ? 'Entrando...' : 'Entrar no Grupo'}
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredGroups.length === 0 && (
          <div className="empty-state py-10 px-6">
            <div className="text-center mb-8">
              <Users className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-500">Nenhum grupo encontrado nesse filtro.</p>
            </div>

            <h3 className="text-lg font-semibold text-slate-800 mb-4">Grupos sugeridos</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {suggestedGroups.map((group) => {
                const Icon = categoryIcons[group.category] || Users;
                return (
                  <div key={group.id} className="surface-card-soft p-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
                      <Icon size={20} />
                    </div>
                    <p className="font-semibold text-slate-800">{group.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{group.member_count} membros</p>
                    <p className="text-sm text-slate-600 mt-2">{group.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
