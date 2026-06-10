import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trophy, Users, Send, Target } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GroupDetail() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [newPost, setNewPost] = useState('');
  const [activeTab, setActiveTab] = useState('feed');

  useEffect(() => {
    const fetchUser = async () => {
      const user = await appClient.auth.me();
      setCurrentUser(user);
    };
    fetchUser();

    const params = new URLSearchParams(window.location.search);
    setGroupId(params.get('groupId'));
  }, []);

  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const groups = await appClient.entities.Group.filter({ id: groupId });
      return groups[0] || null;
    },
    enabled: !!groupId,
    initialData: null
  });

  const { data: posts } = useQuery({
    queryKey: ['groupPosts', groupId],
    queryFn: () => appClient.entities.Post.filter({ group_id: groupId }, '-created_date'),
    enabled: !!groupId,
    initialData: []
  });

  const { data: challenges } = useQuery({
    queryKey: ['groupChallenges', groupId],
    queryFn: () => appClient.entities.GroupChallenge.filter({ group_id: groupId }),
    enabled: !!groupId,
    initialData: []
  });

  const { data: profile } = useQuery({
    queryKey: ['userProfile', 'groupDetail'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      const profiles = await appClient.entities.UserProfile.filter({ created_by: user.email });
      return profiles[0] || null;
    },
    enabled: !!currentUser,
    initialData: null
  });

  const createPostMutation = useMutation({
    mutationFn: async (content) => {
      if (!profile) {
        throw new Error('Perfil do usuário não encontrado.');
      }
      const user = await appClient.auth.me();
      await appClient.entities.Post.create({
        user_id: user.email,
        user_name: `${profile.first_name} ${profile.last_name}`,
        user_photo: profile.photo_url,
        content,
        type: 'general',
        group_id: groupId,
        likes: [],
        comments: []
      });
      await appClient.entities.Group.update(groupId, {
        post_count: (group.post_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupPosts'] });
      queryClient.invalidateQueries({ queryKey: ['group'] });
      setNewPost('');
    }
  });

  if (!group) return <div className="p-8">Carregando...</div>;

  return (
    <div className="app-shell min-h-screen bg-gradient-to-b from-slate-50 via-white to-[#f4f7f8] pb-20 md:pb-8">
      <div className="module-header">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold mb-2">{group.name}</h1>
            <p className="text-white/80 mb-4">{group.description}</p>
            <div className="flex items-center gap-4 text-sm">
              <span>{group.member_count || 0} membros</span>
              <span>|</span>
              <span>{group.post_count || 0} posts</span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => setActiveTab('feed')}
            variant={activeTab === 'feed' ? 'default' : 'outline'}
            className={activeTab === 'feed' ? 'bg-indigo-500' : ''}
          >
            Feed
          </Button>
          <Button
            onClick={() => setActiveTab('challenges')}
            variant={activeTab === 'challenges' ? 'default' : 'outline'}
            className={activeTab === 'challenges' ? 'bg-indigo-500' : ''}
          >
            <Trophy size={16} className="mr-2" />
            Desafios
          </Button>
        </div>

        {activeTab === 'feed' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-md p-6">
              <Textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Compartilhe com o grupo..."
                className="mb-4"
              />
              <Button
                onClick={() => createPostMutation.mutate(newPost)}
                disabled={!newPost.trim() || createPostMutation.isPending || !profile}
                className="bg-indigo-500 hover:bg-indigo-600"
              >
                <Send size={16} className="mr-2" />
                {createPostMutation.isPending ? 'Publicando...' : 'Publicar'}
              </Button>
            </div>

            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-2xl shadow-md p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-600 font-semibold">
                      {post.user_name?.[0] || '?'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{post.user_name}</h3>
                    <p className="text-sm text-gray-500">
                      {format(new Date(post.created_date), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
              </div>
            ))}

            {posts.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl">
                <Users className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-500">Nenhum post ainda. Seja o primeiro!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="space-y-6">
            {challenges.filter(c => c.is_active).map((challenge) => (
              <div key={challenge.id} className="bg-white rounded-2xl shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{challenge.name}</h3>
                    <p className="text-gray-600 mb-3">{challenge.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Meta: {challenge.target_value}</span>
                      <span>|</span>
                      <span>Até: {new Date(challenge.end_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <Trophy className="text-amber-500" size={32} />
                </div>

                {challenge.participants && challenge.participants.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="font-semibold text-gray-700 mb-3">Ranking</h4>
                    <div className="space-y-2">
                      {challenge.participants
                        .sort((a, b) => b.progress - a.progress)
                        .slice(0, 5)
                        .map((p, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
                                {i + 1}
                              </span>
                              <span className="font-medium text-gray-800">{p.user_name}</span>
                            </div>
                            <span className="font-bold text-indigo-600">{p.progress}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {challenges.filter(c => c.is_active).length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl">
                <Target className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-500">Nenhum desafio ativo no momento</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

