import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/components/ui/use-toast';
import {
  Heart, MessageCircle, Send, TrendingUp, Trophy, Dumbbell,
  Users, Image as ImageIcon, Trash2, MoreVertical, ChevronLeft,
  ChevronRight, Flame, Pencil, X, Sparkles
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const POSTS_PER_PAGE = 6;
const FEED_FETCH_LIMIT = 200;

const POST_TYPES = [
  { value: 'general',     label: 'Geral',     icon: MessageCircle, accent: 'sky' },
  { value: 'achievement', label: 'Conquista', icon: Trophy,        accent: 'amber' },
  { value: 'progress',    label: 'Progresso', icon: TrendingUp,    accent: 'emerald' },
  { value: 'workout',     label: 'Treino',    icon: Dumbbell,      accent: 'violet' }
];

const TYPE_META = POST_TYPES.reduce((acc, t) => { acc[t.value] = t; return acc; }, {});

const ACCENT_CLASSES = {
  sky:     { chip: 'bg-sky-50 text-sky-700 ring-sky-200',         dot: 'bg-sky-500' },
  amber:   { chip: 'bg-amber-50 text-amber-700 ring-amber-200',   dot: 'bg-amber-500' },
  emerald: { chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  violet:  { chip: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500' }
};

const FEED_FILTERS = [
  { key: 'all',         label: 'Todos' },
  { key: 'achievement', label: 'Conquistas' },
  { key: 'progress',    label: 'Progresso' },
  { key: 'workout',     label: 'Treinos' },
  { key: 'trending',    label: 'Em alta' },
  { key: 'mine',        label: 'Meus posts' }
];

const initials = (name) =>
  String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('') || '?';

const safeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const relativeTime = (value) => {
  const d = safeDate(value);
  if (!d) return '';
  try {
    return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
  } catch {
    return '';
  }
};

const absoluteTime = (value) => {
  const d = safeDate(value);
  if (!d) return '';
  try {
    return format(d, "dd 'de' MMM 'às' HH:mm", { locale: ptBR });
  } catch {
    return '';
  }
};

export default function SocialFeed() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [draft, setDraft] = useState({ content: '', type: 'general', image_url: '' });
  const [commentDrafts, setCommentDrafts] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [feedFilter, setFeedFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [menuOpenFor, setMenuOpenFor] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await appClient.auth.me();
        if (active) setCurrentUser(user);
      } catch {
        if (active) setCurrentUser(null);
      }
    })();
    return () => { active = false; };
  }, []);

  const { data: profiles } = useQuery({
    queryKey: ['userProfile', 'socialFeed', currentUser?.email],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.UserProfile.filter({ created_by: user.email });
    },
    enabled: !!currentUser,
    initialData: []
  });

  const profile = profiles?.[0] || null;
  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || currentUser?.email
    : currentUser?.email || 'Você';

  const { data: posts, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['socialPosts'],
    queryFn: () => appClient.entities.Post.list('-created_date', FEED_FETCH_LIMIT),
    enabled: !!currentUser,
    initialData: [],
    staleTime: 15_000
  });

  // Reset page sempre que o filtro muda
  useEffect(() => { setPage(1); }, [feedFilter]);

  const createPostMutation = useMutation({
    mutationFn: async ({ content, type, image_url }) => {
      if (!currentUser) throw new Error('Sessão não encontrada. Entre novamente.');
      return appClient.entities.Post.create({
        user_id: currentUser.email,
        user_name: displayName,
        user_photo: profile?.photo_url || '',
        content: content.trim(),
        type,
        image_url: image_url?.trim() || '',
        likes: [],
        comments: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialPosts'] });
      setShowCreatePost(false);
      setDraft({ content: '', type: 'general', image_url: '' });
      setPage(1);
      toast({ title: 'Post publicado', description: 'Seu post já está no topo do feed.' });
    },
    onError: (err) => {
      toast({
        title: 'Falha ao publicar',
        description: err?.message || 'Não foi possível criar seu post agora.',
        variant: 'destructive'
      });
    }
  });

  const updatePostMutation = useMutation({
    mutationFn: async ({ post, patch }) =>
      appClient.entities.Post.update(post.id, {
        ...patch,
        __expected_updated_date: post.updated_date
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialPosts'] });
      setEditingPost(null);
      setDraft({ content: '', type: 'general', image_url: '' });
      toast({ title: 'Post atualizado' });
    },
    onError: (err) => {
      toast({
        title: 'Falha ao atualizar',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive'
      });
    }
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId) => appClient.entities.Post.delete(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialPosts'] });
      toast({ title: 'Post removido' });
    },
    onError: (err) => {
      toast({
        title: 'Falha ao remover',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive'
      });
    }
  });

  const likePostMutation = useMutation({
    mutationFn: async (post) => {
      if (!currentUser) throw new Error('Sessão necessária.');
      const userKey = currentUser.email;
      const currentLikes = Array.isArray(post.likes) ? post.likes : [];
      const hasLiked = currentLikes.includes(userKey);
      const nextLikes = hasLiked
        ? currentLikes.filter((id) => id !== userKey)
        : [...currentLikes, userKey];
      return appClient.entities.Post.update(post.id, {
        likes: nextLikes,
        __expected_updated_date: post.updated_date
      });
    },
    onMutate: async (post) => {
      await queryClient.cancelQueries({ queryKey: ['socialPosts'] });
      const previous = queryClient.getQueryData(['socialPosts']);
      queryClient.setQueryData(['socialPosts'], (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((p) => {
          if (p.id !== post.id) return p;
          const likes = Array.isArray(p.likes) ? p.likes : [];
          const hasLiked = likes.includes(currentUser.email);
          return {
            ...p,
            likes: hasLiked
              ? likes.filter((id) => id !== currentUser.email)
              : [...likes, currentUser.email]
          };
        });
      });
      return { previous };
    },
    onError: (_err, _post, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['socialPosts'], ctx.previous);
      toast({ title: 'Falha ao curtir', variant: 'destructive' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['socialPosts'] });
    }
  });

  const commentMutation = useMutation({
    mutationFn: async ({ post, comment }) => {
      if (!currentUser) throw new Error('Sessão necessária.');
      const newComment = {
        user_id: currentUser.email,
        user_name: displayName,
        user_photo: profile?.photo_url || '',
        comment: comment.trim(),
        date: new Date().toISOString()
      };
      const next = [...(post.comments || []), newComment];
      return appClient.entities.Post.update(post.id, {
        comments: next,
        __expected_updated_date: post.updated_date
      });
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['socialPosts'] });
      setCommentDrafts((prev) => ({ ...prev, [vars.post.id]: '' }));
    },
    onError: (err) => {
      toast({
        title: 'Falha ao comentar',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive'
      });
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async ({ post, index }) => {
      const next = (post.comments || []).filter((_, i) => i !== index);
      return appClient.entities.Post.update(post.id, {
        comments: next,
        __expected_updated_date: post.updated_date
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialPosts'] });
      toast({ title: 'Comentário removido' });
    },
    onError: (err) => {
      toast({
        title: 'Falha ao remover comentário',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive'
      });
    }
  });

  const filteredPosts = useMemo(() => {
    const list = Array.isArray(posts) ? posts : [];
    return list.filter((p) => {
      if (!p) return false;
      switch (feedFilter) {
        case 'achievement': return p.type === 'achievement';
        case 'progress':    return p.type === 'progress';
        case 'workout':     return p.type === 'workout';
        case 'trending':    return (p.likes?.length || 0) >= 3;
        case 'mine':        return p.user_id === currentUser?.email;
        default:            return true;
      }
    });
  }, [posts, feedFilter, currentUser?.email]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * POSTS_PER_PAGE;
  const pageEnd = pageStart + POSTS_PER_PAGE;
  const pagePosts = filteredPosts.slice(pageStart, pageEnd);
  const [featuredPost, ...restPosts] = pagePosts;

  const openCreate = () => {
    setEditingPost(null);
    setDraft({ content: '', type: 'general', image_url: '' });
    setShowCreatePost(true);
  };

  const openEdit = (post) => {
    setEditingPost(post);
    setDraft({
      content: post.content || '',
      type: post.type || 'general',
      image_url: post.image_url || ''
    });
    setShowCreatePost(true);
    setMenuOpenFor(null);
  };

  const submitDraft = () => {
    const content = draft.content?.trim();
    if (!content) {
      toast({ title: 'Escreva algo antes de publicar', variant: 'destructive' });
      return;
    }
    if (editingPost) {
      updatePostMutation.mutate({
        post: editingPost,
        patch: {
          content,
          type: draft.type,
          image_url: draft.image_url?.trim() || ''
        }
      });
    } else {
      createPostMutation.mutate(draft);
    }
  };

  const totalPosts = filteredPosts.length;
  const showSkeleton = isLoading && totalPosts === 0;

  return (
    <div className="app-shell bg-gradient-to-b from-slate-50 via-white to-[#f4f7f8] min-h-screen pb-24 md:pb-12">
      {/* Hero / Header */}
      <div className="module-header">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center ring-1 ring-white/30 shadow-lg">
                <Users size={30} />
              </div>
              <div>
                <p className="uppercase tracking-[0.18em] text-xs font-semibold text-white/70 mb-1">
                  Comunidade
                </p>
                <h1 className="text-4xl md:text-5xl font-bold leading-tight">Feed Social</h1>
                <p className="text-white/80 mt-2 max-w-md">
                  Compartilhe conquistas, treinos e progressos. As publicações mais recentes aparecem primeiro.
                </p>
              </div>
            </div>

            <Button
              onClick={openCreate}
              size="lg"
              disabled={!currentUser}
              className="bg-white text-emerald-700 hover:bg-emerald-50 shadow-md h-12 px-6 self-start md:self-auto"
            >
              <Sparkles size={18} className="mr-2" />
              Novo post
            </Button>
          </motion.div>

          <div className="mt-8 -mx-1 overflow-x-auto">
            <div className="segmented-control flex-nowrap">
              {FEED_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFeedFilter(f.key)}
                  className={`segmented-item whitespace-nowrap ${feedFilter === f.key ? 'is-active' : ''}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Counter / refresh */}
        <div className="flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            <span>
              {totalPosts === 0
                ? 'Nenhum post neste filtro'
                : `${totalPosts} post${totalPosts === 1 ? '' : 's'} • página ${currentPage} de ${totalPages}`}
            </span>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-emerald-700 hover:text-emerald-800 font-medium disabled:opacity-50"
          >
            {isFetching ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>

        {showSkeleton && (
          <div className="space-y-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="surface-card p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 bg-slate-200 rounded" />
                    <div className="h-3 w-24 bg-slate-200 rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-slate-200 rounded" />
                  <div className="h-4 w-3/4 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Featured (primeiro post da página, destaque tipo blog) */}
        {!showSkeleton && featuredPost && (
          <FeaturedPostCard
            post={featuredPost}
            currentUser={currentUser}
            onLike={() => likePostMutation.mutate(featuredPost)}
            onToggleComments={() =>
              setOpenComments((prev) => ({ ...prev, [featuredPost.id]: !prev[featuredPost.id] }))
            }
            commentsOpen={!!openComments[featuredPost.id]}
            commentDraft={commentDrafts[featuredPost.id] || ''}
            onCommentChange={(value) =>
              setCommentDrafts((prev) => ({ ...prev, [featuredPost.id]: value }))
            }
            onSubmitComment={() => {
              const text = (commentDrafts[featuredPost.id] || '').trim();
              if (!text) return;
              commentMutation.mutate({ post: featuredPost, comment: text });
            }}
            onDeleteComment={(index) =>
              deleteCommentMutation.mutate({ post: featuredPost, index })
            }
            onEdit={() => openEdit(featuredPost)}
            onDelete={() => deletePostMutation.mutate(featuredPost.id)}
            menuOpen={menuOpenFor === featuredPost.id}
            onMenuToggle={() =>
              setMenuOpenFor((prev) => (prev === featuredPost.id ? null : featuredPost.id))
            }
          />
        )}

        {/* Posts regulares */}
        {!showSkeleton && restPosts.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {restPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                onLike={() => likePostMutation.mutate(post)}
                onToggleComments={() =>
                  setOpenComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                }
                commentsOpen={!!openComments[post.id]}
                commentDraft={commentDrafts[post.id] || ''}
                onCommentChange={(value) =>
                  setCommentDrafts((prev) => ({ ...prev, [post.id]: value }))
                }
                onSubmitComment={() => {
                  const text = (commentDrafts[post.id] || '').trim();
                  if (!text) return;
                  commentMutation.mutate({ post, comment: text });
                }}
                onDeleteComment={(index) =>
                  deleteCommentMutation.mutate({ post, index })
                }
                onEdit={() => openEdit(post)}
                onDelete={() => deletePostMutation.mutate(post.id)}
                menuOpen={menuOpenFor === post.id}
                onMenuToggle={() =>
                  setMenuOpenFor((prev) => (prev === post.id ? null : post.id))
                }
              />
            ))}
          </div>
        )}

        {/* Empty */}
        {!showSkeleton && totalPosts === 0 && (
          <div className="empty-state py-16 px-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Users size={32} />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Nada por aqui ainda</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              {feedFilter === 'mine'
                ? 'Você ainda não publicou nada. Que tal compartilhar uma conquista de hoje?'
                : 'Seja a primeira pessoa a inspirar a comunidade com uma publicação.'}
            </p>
            <Button
              onClick={openCreate}
              disabled={!currentUser}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 h-11 px-6"
            >
              <Sparkles size={16} className="mr-2" />
              Criar primeiro post
            </Button>
          </div>
        )}

        {/* Pagination */}
        {!showSkeleton && totalPages > 1 && (
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={(p) => {
              setPage(p);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </div>

      {/* Composer Dialog */}
      <Dialog
        open={showCreatePost}
        onOpenChange={(open) => {
          setShowCreatePost(open);
          if (!open) {
            setEditingPost(null);
            setDraft({ content: '', type: 'general', image_url: '' });
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Editar post' : 'Criar novo post'}</DialogTitle>
            <DialogDescription>
              {editingPost
                ? 'Atualize seu post. Curtidas e comentários são preservados.'
                : 'Compartilhe sua jornada com a comunidade.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Categoria</label>
              <div className="grid grid-cols-2 gap-2">
                {POST_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isActive = draft.type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, type: t.value }))}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Icon size={16} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Mensagem</label>
              <Textarea
                value={draft.content}
                onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                placeholder="O que você quer compartilhar hoje?"
                className="h-32 resize-none"
                maxLength={1500}
              />
              <p className="text-xs text-slate-400 mt-1 text-right">
                {draft.content.length}/1500
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                <ImageIcon size={14} />
                Imagem (opcional, URL pública)
              </label>
              <Input
                value={draft.image_url}
                onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))}
                placeholder="https://…"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCreatePost(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={submitDraft}
                disabled={
                  !draft.content.trim() ||
                  createPostMutation.isPending ||
                  updatePostMutation.isPending
                }
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                {createPostMutation.isPending || updatePostMutation.isPending
                  ? 'Salvando…'
                  : editingPost ? 'Salvar alterações' : 'Publicar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------- Sub-components ------------------------- */

function TypeBadge({ type }) {
  const meta = TYPE_META[type] || TYPE_META.general;
  const accent = ACCENT_CLASSES[meta.accent] || ACCENT_CLASSES.sky;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${accent.chip}`}>
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

function AuthorBlock({ post, size = 'md' }) {
  const avatarSize = size === 'lg' ? 'w-14 h-14' : 'w-11 h-11';
  return (
    <div className="flex items-center gap-3">
      <Avatar className={`${avatarSize} ring-2 ring-white shadow-sm`}>
        {post.user_photo ? <AvatarImage src={post.user_photo} alt={post.user_name || ''} /> : null}
        <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 font-semibold">
          {initials(post.user_name || post.user_id)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="font-semibold text-slate-800 truncate">
          {post.user_name || post.user_id || 'Usuário'}
        </p>
        <p className="text-xs text-slate-500" title={absoluteTime(post.created_date)}>
          {relativeTime(post.created_date) || absoluteTime(post.created_date)}
          {post.updated_date && safeDate(post.updated_date) > safeDate(post.created_date) && (
            <span className="ml-1 text-slate-400">· editado</span>
          )}
        </p>
      </div>
    </div>
  );
}

function PostActions({
  post, currentUser, onLike, onToggleComments, commentsOpen, isMine, menuOpen,
  onMenuToggle, onEdit, onDelete
}) {
  const likes = Array.isArray(post.likes) ? post.likes : [];
  const hasLiked = currentUser?.email ? likes.includes(currentUser.email) : false;
  const commentsCount = Array.isArray(post.comments) ? post.comments.length : 0;
  const isTrending = likes.length >= 3;

  return (
    <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
      <button
        type="button"
        onClick={onLike}
        disabled={!currentUser}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
          hasLiked
            ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <Heart size={16} fill={hasLiked ? 'currentColor' : 'none'} />
        {likes.length}
      </button>

      <button
        type="button"
        onClick={onToggleComments}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
          commentsOpen ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <MessageCircle size={16} />
        {commentsCount}
      </button>

      {isTrending && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
          <Flame size={12} />
          Em alta
        </span>
      )}

      <div className="flex-1" />

      {isMine && (
        <div className="relative">
          <button
            type="button"
            onClick={onMenuToggle}
            className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100"
            aria-label="Mais opções"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 mt-1 w-40 rounded-xl border border-slate-200 bg-white shadow-lg z-10 overflow-hidden"
              onMouseLeave={onMenuToggle}
            >
              <button
                onClick={onEdit}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
              >
                <Pencil size={14} /> Editar
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Remover este post?')) onDelete();
                }}
                className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
              >
                <Trash2 size={14} /> Apagar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CommentsSection({
  post, currentUser, commentDraft, onCommentChange, onSubmitComment, onDeleteComment
}) {
  const comments = Array.isArray(post.comments) ? post.comments : [];
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="mt-4 pt-4 border-t border-slate-100 space-y-3 overflow-hidden"
    >
      {comments.length === 0 && (
        <p className="text-sm text-slate-400 italic">
          Seja o primeiro a comentar.
        </p>
      )}

      {comments.map((c, i) => {
        const mine = c.user_id === currentUser?.email;
        return (
          <div key={i} className="flex gap-3 group">
            <Avatar className="w-8 h-8 flex-shrink-0">
              {c.user_photo ? <AvatarImage src={c.user_photo} alt="" /> : null}
              <AvatarFallback className="text-xs bg-slate-100 text-slate-600">
                {initials(c.user_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-3 py-2">
                <p className="font-semibold text-sm text-slate-800">
                  {c.user_name || c.user_id || 'Usuário'}
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                  {c.comment}
                </p>
              </div>
              <p className="text-xs text-slate-400 mt-1 ml-3">
                {relativeTime(c.date) || absoluteTime(c.date)}
              </p>
            </div>
            {mine && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Remover comentário?')) onDeleteComment(i);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-600 self-start"
                aria-label="Remover comentário"
              >
                <X size={14} />
              </button>
            )}
          </div>
        );
      })}

      <div className="flex gap-2 pt-1">
        <Input
          value={commentDraft}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="Escreva um comentário…"
          disabled={!currentUser}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && commentDraft.trim()) {
              e.preventDefault();
              onSubmitComment();
            }
          }}
          className="flex-1"
          maxLength={500}
        />
        <Button
          size="sm"
          onClick={onSubmitComment}
          disabled={!commentDraft.trim() || !currentUser}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Send size={16} />
        </Button>
      </div>
    </motion.div>
  );
}

function PostCard(props) {
  const {
    post, currentUser, onLike, onToggleComments, commentsOpen,
    commentDraft, onCommentChange, onSubmitComment, onDeleteComment,
    onEdit, onDelete, menuOpen, onMenuToggle
  } = props;

  const isMine = post.user_id === currentUser?.email;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card p-5 sm:p-6 flex flex-col"
    >
      <header className="flex items-start justify-between gap-3 mb-3">
        <AuthorBlock post={post} />
        <TypeBadge type={post.type} />
      </header>

      <p className="text-slate-800 whitespace-pre-wrap break-words leading-relaxed mb-4">
        {post.content}
      </p>

      {post.image_url && (
        <div className="rounded-xl overflow-hidden mb-4 border border-slate-100 bg-slate-50">
          <img
            src={post.image_url}
            alt=""
            loading="lazy"
            className="w-full max-h-80 object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
      )}

      <PostActions
        post={post}
        currentUser={currentUser}
        onLike={onLike}
        onToggleComments={onToggleComments}
        commentsOpen={commentsOpen}
        isMine={isMine}
        menuOpen={menuOpen}
        onMenuToggle={onMenuToggle}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <AnimatePresence>
        {commentsOpen && (
          <CommentsSection
            post={post}
            currentUser={currentUser}
            commentDraft={commentDraft}
            onCommentChange={onCommentChange}
            onSubmitComment={onSubmitComment}
            onDeleteComment={onDeleteComment}
          />
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function FeaturedPostCard(props) {
  const {
    post, currentUser, onLike, onToggleComments, commentsOpen,
    commentDraft, onCommentChange, onSubmitComment, onDeleteComment,
    onEdit, onDelete, menuOpen, onMenuToggle
  } = props;

  const isMine = post.user_id === currentUser?.email;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card overflow-hidden border-emerald-200/70"
      style={{ boxShadow: '0 12px 32px rgba(15, 122, 109, 0.08)' }}
    >
      <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
            <Sparkles size={12} />
            Destaque
          </span>
          <TypeBadge type={post.type} />
        </div>

        <header className="flex items-start justify-between gap-3 mb-5">
          <AuthorBlock post={post} size="lg" />
        </header>

        <p className="text-lg sm:text-xl text-slate-800 whitespace-pre-wrap break-words leading-relaxed mb-5 font-medium">
          {post.content}
        </p>

        {post.image_url && (
          <div className="rounded-2xl overflow-hidden mb-5 border border-slate-100 bg-slate-50">
            <img
              src={post.image_url}
              alt=""
              loading="lazy"
              className="w-full max-h-[480px] object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}

        <PostActions
          post={post}
          currentUser={currentUser}
          onLike={onLike}
          onToggleComments={onToggleComments}
          commentsOpen={commentsOpen}
          isMine={isMine}
          menuOpen={menuOpen}
          onMenuToggle={onMenuToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />

        <AnimatePresence>
          {commentsOpen && (
            <CommentsSection
              post={post}
              currentUser={currentUser}
              commentDraft={commentDraft}
              onCommentChange={onCommentChange}
              onSubmitComment={onSubmitComment}
              onDeleteComment={onDeleteComment}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

function Pagination({ page, totalPages, onChange }) {
  const pages = useMemo(() => {
    const list = [];
    const window = 1;
    const start = Math.max(1, page - window);
    const end = Math.min(totalPages, page + window);

    if (start > 1) list.push(1);
    if (start > 2) list.push('…');
    for (let i = start; i <= end; i += 1) list.push(i);
    if (end < totalPages - 1) list.push('…');
    if (end < totalPages) list.push(totalPages);
    return list;
  }, [page, totalPages]);

  return (
    <nav className="flex items-center justify-center gap-2 pt-4" aria-label="Paginação">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={16} />
        Anterior
      </button>

      {pages.map((p, idx) =>
        p === '…' ? (
          <span key={`dots-${idx}`} className="px-2 text-slate-400">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
              p === page
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Próxima
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
