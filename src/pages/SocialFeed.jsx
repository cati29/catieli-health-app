import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Heart, MessageCircle, Send, TrendingUp, Trophy, Dumbbell, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SocialFeed() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState('general');
  const [commentText, setCommentText] = useState({});
  const [feedFilter, setFeedFilter] = useState('all');

  useEffect(() => {
    const fetchUser = async () => {
      const user = await appClient.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: profile } = useQuery({
    queryKey: ['userProfile', 'socialFeed'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      const profiles = await appClient.entities.UserProfile.filter({ created_by: user.email });
      return profiles[0] || null;
    },
    enabled: !!currentUser,
    initialData: null
  });

  const { data: posts } = useQuery({
    queryKey: ['socialPosts'],
    queryFn: () => appClient.entities.Post.list('-created_date', 50),
    enabled: !!currentUser,
    initialData: []
  });

  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      if (!profile) {
        throw new Error('Perfil do usuário não encontrado.');
      }
      const user = await appClient.auth.me();
      return appClient.entities.Post.create({
        user_id: user.email,
        user_name: `${profile.first_name} ${profile.last_name}`,
        user_photo: profile.photo_url,
        content: postData.content,
        type: postData.type,
        likes: [],
        comments: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialPosts'] });
      setShowCreatePost(false);
      setNewPost('');
    }
  });

  const likePostMutation = useMutation({
    mutationFn: async (post) => {
      const user = await appClient.auth.me();
      const hasLiked = post.likes?.includes(user.email);
      const updatedLikes = hasLiked
        ? post.likes.filter(id => id !== user.email)
        : [...(post.likes || []), user.email];
      
      return appClient.entities.Post.update(post.id, {
        likes: updatedLikes,
        __expected_updated_date: post.updated_date
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialPosts'] });
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ post, comment }) => {
      const user = await appClient.auth.me();
      const newComment = {
        user_id: user.email,
        user_name: `${profile.first_name} ${profile.last_name}`,
        comment,
        date: new Date().toISOString()
      };
      
      return appClient.entities.Post.update(post.id, {
        comments: [...(post.comments || []), newComment],
        __expected_updated_date: post.updated_date
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialPosts'] });
      setCommentText({});
    }
  });

  const handleCreatePost = () => {
    if (!newPost.trim()) return;
    createPostMutation.mutate({ content: newPost, type: postType });
  };

  const postTypeIcons = {
    achievement: Trophy,
    progress: TrendingUp,
    workout: Dumbbell,
    general: MessageCircle
  };

  const postTypeColors = {
    achievement: 'bg-amber-100 text-amber-700',
    progress: 'bg-emerald-100 text-emerald-700',
    workout: 'bg-purple-100 text-purple-700',
    general: 'bg-blue-100 text-blue-700'
  };

  const feedFilters = [
    { key: 'all', label: 'Todos' },
    { key: 'friends', label: 'Amigos' },
    { key: 'trending', label: 'Tendências' },
    { key: 'groups', label: 'Grupos' }
  ];

  const filteredPosts = posts.filter((post) => {
    if (feedFilter === 'all') return true;
    if (feedFilter === 'friends') return ['achievement', 'progress'].includes(post.type);
    if (feedFilter === 'trending') return (post.likes?.length || 0) >= 2;
    if (feedFilter === 'groups') return Boolean(post.group_id);
    return true;
  });

  return (
    <div className="app-shell bg-gradient-to-b from-slate-50 to-[#f4f7f8]">
      <div className="module-header">
        <div className="max-w-4xl mx-auto px-6 py-12">
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
                  <h1 className="text-4xl font-bold">Feed Social</h1>
                  <p className="text-pink-100">Compartilhe sua jornada</p>
                </div>
              </div>
              <Button
                onClick={() => setShowCreatePost(true)}
                className="bg-white text-emerald-700 hover:bg-emerald-50 shadow-sm h-11 px-5"
              >
                <motion.span
                  className="mr-2 inline-flex"
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                >
                  <Send size={18} />
                </motion.span>
                Criar Post
              </Button>
            </div>

            <div className="segmented-control mt-5">
              {feedFilters.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setFeedFilter(filter.key)}
                  className={`segmented-item ${feedFilter === filter.key ? 'is-active' : ''}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {filteredPosts.map((post, idx) => {
          const Icon = postTypeIcons[post.type] || MessageCircle;
          const hasLiked = post.likes?.includes(currentUser?.email);
          
          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="surface-card p-6"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {post.user_photo ? (
                    <img src={post.user_photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-pink-600 font-semibold">
                      {post.user_name?.[0] || '?'}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-800">{post.user_name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${postTypeColors[post.type]}`}>
                      <Icon size={12} className="inline mr-1" />
                      {post.type === 'achievement' ? 'Conquista' :
                       post.type === 'progress' ? 'Progresso' :
                       post.type === 'workout' ? 'Treino' : 'Geral'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {format(new Date(post.created_date), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>

              {post.image_url && (
                <img src={post.image_url} alt="" className="w-full rounded-xl mb-4" />
              )}

              <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => likePostMutation.mutate(post)}
                  className={`flex items-center gap-2 transition-colors ${
                    hasLiked ? 'text-pink-600' : 'text-gray-500 hover:text-pink-600'
                  }`}
                >
                  <Heart size={20} fill={hasLiked ? 'currentColor' : 'none'} />
                  <span className="text-sm font-medium">{post.likes?.length || 0}</span>
                </button>
                <div className="flex items-center gap-2 text-gray-500">
                  <MessageCircle size={20} />
                  <span className="text-sm font-medium">{post.comments?.length || 0}</span>
                </div>
              </div>

              {post.comments && post.comments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  {post.comments.map((comment, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-gray-600">
                          {comment.user_name?.[0] || '?'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-semibold text-gray-800">{comment.user_name}</span>
                          {' '}
                          <span className="text-gray-600">{comment.comment}</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(comment.date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={commentText[post.id] || ''}
                  onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                  placeholder="Adicionar comentário..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && commentText[post.id]?.trim()) {
                      addCommentMutation.mutate({ post, comment: commentText[post.id] });
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (commentText[post.id]?.trim()) {
                      addCommentMutation.mutate({ post, comment: commentText[post.id] });
                    }
                  }}
                  disabled={!commentText[post.id]?.trim()}
                  className="bg-pink-500 hover:bg-pink-600"
                >
                  <Send size={16} />
                </Button>
              </div>
            </motion.div>
          );
        })}

        {filteredPosts.length === 0 && (
          <div className="empty-state py-16 px-6">
            <div className="text-center mb-8">
              <Users className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Feed sem públicações neste filtro
              </h3>
              <p className="text-gray-500 mb-6">
                Compartilhe sua evolução para inspirar sua comunidade.
              </p>
              <Button
                onClick={() => setShowCreatePost(true)}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                Criar Post
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {[
                'Meta semanal concluída. Foco mantido!',
                'Treino de hoje finalizado com sucesso.'
              ].map((mock) => (
                <div key={mock} className="surface-card-soft p-4">
                  <p className="text-sm text-slate-700">{mock}</p>
                  <p className="text-xs text-slate-500 mt-2">Exemplo de post em destaque</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar Post</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo de Post</label>
              <select
                value={postType}
                onChange={(e) => setPostType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="general">Geral</option>
                <option value="achievement">Conquista</option>
                <option value="progress">Progresso</option>
                <option value="workout">Treino</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Mensagem</label>
              <Textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Compartilhe sua jornada..."
                className="h-32"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCreatePost(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreatePost}
                disabled={!newPost.trim() || createPostMutation.isPending || !profile}
                className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
              >
                {createPostMutation.isPending ? 'Publicando...' : 'Publicar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
