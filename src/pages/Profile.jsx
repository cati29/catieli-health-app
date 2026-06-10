import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createPageUrl } from '@/utils';
import AvatarEvolution from '@/components/avatar/AvatarEvolution';
import IMCCalculator from '@/components/imc/IMCCalculator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import AvatarCustomization from '@/components/avatar/AvatarCustomization';
import { supabase } from '@/lib/supabaseClient';
import {
  User, Camera, Scale, Ruler, MapPin, Phone,
  Calendar, Target, TrendingUp, Edit2, Save, Mail, Lock, Palette,
  ChevronRight, LogOut, Watch, Shield, Eye, EyeOff, Users, Bell
} from 'lucide-react';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

export default function Profile() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [newWeight, setNewWeight] = useState('');
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Fetch profile
  const { data: profiles, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.UserProfile.filter({ created_by: user.email });
    }
  });

  const profile = profiles?.[0];
  const profileId = profile?.id;
  const isNutritionist = profile?.user_type === 'nutritionist';
  const weightHistory = Array.isArray(profile?.weight_history) ? profile.weight_history : [];
  const parseWeightInput = (value) => Number(String(value || '').replace(',', '.'));
  const parsedNewWeight = parseWeightInput(newWeight);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data) => {
      if (!profileId) {
        throw new Error('Perfil não encontrado.');
      }
      return appClient.entities.UserProfile.update(profileId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setIsEditing(false);
      toast({
        title: 'Perfil atualizado',
        description: 'Seus dados foram salvos com sucesso.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Falha ao salvar perfil',
        description: error?.message || 'Não foi possível salvar agora.',
        variant: 'destructive'
      });
    }
  });

  // Update weight mutation
  const updateWeightMutation = useMutation({
    mutationFn: async (weight) => {
      if (!profileId) {
        throw new Error('Perfil não encontrado.');
      }
      const parsedWeight = parseWeightInput(weight);
      if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
        throw new Error('Informe um peso valido em kg.');
      }
      const newHistory = [
        ...weightHistory,
        { date: format(new Date(), 'yyyy-MM-dd'), weight: parsedWeight }
      ];
      return appClient.entities.UserProfile.update(profileId, {
        weight: parsedWeight,
        weight_history: newHistory
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setNewWeight('');
      setShowWeightForm(false);
      toast({
        title: 'Peso atualizado',
        description: 'Seu histórico foi salvo com sucesso.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Falha ao salvar peso',
        description: error?.message || 'Tente novamente.',
        variant: 'destructive'
      });
    }
  });

  // Upload photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file) => {
      if (!profileId) {
        throw new Error('Perfil não encontrado.');
      }
      const { file_url } = await appClient.integrations.Core.UploadFile({ file });
      return appClient.entities.UserProfile.update(profileId, { photo_url: file_url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      toast({
        title: 'Foto atualizada',
        description: 'Sua foto de perfil foi salva.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Falha ao enviar foto',
        description: error?.message || 'Tente novamente.',
        variant: 'destructive'
      });
    }
  });

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadPhotoMutation.mutate(file);
    }
  };

  const handleEditSave = () => {
    updateProfileMutation.mutate(editForm);
  };

  const handlePasswordSubmit = async () => {
    setPasswordError('');
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      setPasswordError('Preencha todos os campos.');
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError('A confirmação não bate com a nova senha.');
      return;
    }
    if (!PASSWORD_REGEX.test(passwordForm.next)) {
      setPasswordError('Nova senha precisa de 8+ caracteres, com maiúscula, minúscula, número e símbolo.');
      return;
    }
    if (!supabase) {
      setPasswordError('Serviço de autenticação indisponível.');
      return;
    }
    setPasswordLoading(true);
    try {
      // Verifica a senha atual reautenticando.
      const email = profile?.email || profile?.created_by;
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: passwordForm.current
      });
      if (reauthError) {
        setPasswordError('Senha atual incorreta.');
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: passwordForm.next });
      if (updateError) {
        setPasswordError(updateError.message || 'Falha ao atualizar a senha.');
        return;
      }
      toast({ title: 'Senha atualizada', description: 'Sua nova senha já está valendo.' });
      setShowPasswordDialog(false);
      setPasswordForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPasswordError(err?.message || 'Erro inesperado.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleConnectWearable = async (deviceType) => {
    // Simulação de conexão com wearable
    await updateProfileMutation.mutateAsync({
      wearable_data: {
        connected: true,
        device_type: deviceType,
        last_sync: new Date().toISOString()
      }
    });
  };

  const handlePrivacyChange = (setting, value) => {
    const newPrivacySettings = {
      ...(profile?.privacy_settings || {}),
      [setting]: value
    };
    updateProfileMutation.mutate({ privacy_settings: newPrivacySettings });
  };

  const goalLabels = {
    weight_loss: 'Emagrecimento',
    health: 'Saúde',
    weight_gain: 'Ganho de peso',
    muscle_gain: 'Ganho de massa',
    other: 'Outros'
  };

  const genderLabels = {
    male: 'Masculino',
    female: 'Feminino',
    other: 'Outro',
    prefer_not_say: 'Prefiro não dizer'
  };

  const handleLogout = () => {
    appClient.auth.logout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 pt-8 pb-24 px-6">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-white text-2xl font-bold">Meu Perfil</h1>
          <button
            onClick={() => {
              if (isEditing) {
                handleEditSave();
              } else {
                setEditForm({
                  first_name: profile?.first_name,
                  last_name: profile?.last_name,
                  city: profile?.city,
                  phone: profile?.phone,
                  date_of_birth: profile?.date_of_birth || '',
                  gender: profile?.gender || '',
                  height: profile?.height || '',
                  age: profile?.age || ''
                });
                setIsEditing(true);
              }
            }}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            {isEditing ? <Save className="text-white" size={20} /> : <Edit2 className="text-white" size={20} />}
          </button>
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
          {/* Photo */}
          <div className="flex justify-center -mt-16 mb-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-emerald-100 border-4 border-white shadow-lg overflow-hidden">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="text-emerald-500" size={40} />
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-emerald-600 transition-colors shadow-lg">
                <Camera className="text-white" size={16} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Name */}
          {isEditing ? (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Input
                value={editForm.first_name}
                onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                placeholder="Nome"
              />
              <Input
                value={editForm.last_name}
                onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                placeholder="Sobrenome"
              />
            </div>
          ) : (
            <h2 className="text-xl font-bold text-gray-800 text-center mb-1">
              {profile?.first_name} {profile?.last_name}
            </h2>
          )}

          {/* Level / Role Badge */}
          <div className="flex justify-center mb-4">
            {isNutritionist ? (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                Nutricionista {profile?.crm_nutrition ? `• ${profile.crm_nutrition}` : ''}
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                Nível {profile?.level || 1} ⬢ {profile?.xp || 0} XP
              </span>
            )}
          </div>

          {/* Avatar (gamificacao - somente atleta) */}
          {!isNutritionist && (
            <div className="flex flex-col items-center mb-6 gap-3">
              <AvatarEvolution
                level={profile?.level || 1}
                xp={profile?.xp || 0}
                size="lg"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAvatarDialog(true)}
                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              >
                <Palette size={14} className="mr-2" />
                Customizar avatar
              </Button>
            </div>
          )}

          {/* Email (read-only) */}
          <div className="mb-4">
            <Label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
              <Mail size={12} /> Email
            </Label>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-700 truncate">{profile?.email || profile?.created_by || '—'}</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">O email não pode ser alterado.</p>
          </div>

          {/* Info Grid */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin size={18} className="text-gray-400 flex-shrink-0" />
                {isEditing ? (
                  <Input
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    placeholder="Cidade"
                    className="h-8 text-sm"
                  />
                ) : (
                  <span className="text-sm">{profile?.city || 'Não informado'}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={18} className="text-gray-400 flex-shrink-0" />
                {isEditing ? (
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="Telefone"
                    className="h-8 text-sm"
                  />
                ) : (
                  <span className="text-sm">{profile?.phone || 'Não informado'}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar size={18} className="text-gray-400 flex-shrink-0" />
                {isEditing ? (
                  <Input
                    type="date"
                    value={editForm.date_of_birth}
                    onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                    className="h-8 text-sm"
                  />
                ) : (
                  <span className="text-sm">
                    {profile?.date_of_birth 
                      ? format(new Date(profile.date_of_birth), "dd/MM/yyyy", { locale: ptBR })
                      : profile?.age ? `${profile.age} anos` : 'Não informado'
                    }
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <User size={18} className="text-gray-400 flex-shrink-0" />
                {isEditing ? (
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    className="h-8 text-sm border rounded px-2 flex-1"
                  >
                    <option value="">Selecione</option>
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                    <option value="other">Outro</option>
                    <option value="prefer_not_say">Prefiro não dizer</option>
                  </select>
                ) : (
                  <span className="text-sm">{genderLabels[profile?.gender] || 'Não informado'}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Ruler size={18} className="text-gray-400 flex-shrink-0" />
                {isEditing ? (
                  <Input
                    type="number"
                    value={editForm.height}
                    onChange={(e) => setEditForm({ ...editForm, height: e.target.value })}
                    placeholder="Altura (cm)"
                    className="h-8 text-sm"
                  />
                ) : (
                  <span className="text-sm">{profile?.height ? `${profile.height} cm` : 'Não informado'}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Target size={18} className="text-gray-400 flex-shrink-0" />
                <span className="text-sm">{goalLabels[profile?.goal] || 'Saúde'}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Weight Update Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Scale className="text-emerald-500" size={20} />
              <h3 className="font-bold text-gray-800">Atualizar Peso</h3>
            </div>
            <span className="text-2xl font-bold text-emerald-600">{profile?.weight} kg</span>
          </div>

          <AnimatePresence>
            {showWeightForm ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <div>
                  <Label className="text-gray-600 text-sm">Novo peso (kg)</Label>
                  <Input
                    type="number"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder={profile?.weight}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowWeightForm(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateWeightMutation.mutate(newWeight)}
                    disabled={
                      !newWeight ||
                      !Number.isFinite(parsedNewWeight) ||
                      parsedNewWeight <= 0 ||
                      updateWeightMutation.isPending
                    }
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                  >
                    Salvar
                  </Button>
                </div>
              </motion.div>
            ) : (
              <Button
                onClick={() => setShowWeightForm(true)}
                className="w-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              >
                <TrendingUp size={18} className="mr-2" />
                Registrar novo peso
              </Button>
            )}
          </AnimatePresence>
        </motion.div>

        {/* IMC Calculator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <IMCCalculator 
            weight={profile?.weight} 
            height={profile?.height}
          />
        </motion.div>

        {/* Wearable Integration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Watch className="text-blue-500" size={20} />
              <h3 className="font-bold text-gray-800">Wearables & Dados de Saúde</h3>
            </div>
            {profile?.wearable_data?.connected && (
              <Link to={createPageUrl('HealthData')}>
                <Button size="sm" variant="outline">
                  Ver Dados
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              </Link>
            )}
          </div>

          {profile?.wearable_data?.connected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <Watch className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{profile.wearable_data.device_type}</p>
                    <p className="text-xs text-gray-500">
                      altima sinc: {format(new Date(profile.wearable_data.last_sync), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  Conectado
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateProfileMutation.mutate({ wearable_data: { connected: false } })}
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
              >
                Desconectar
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-3">
                Conecte seu dispositivo para sincronizar dados automaticamente
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConnectWearable('Apple Watch')}
                  className="justify-start"
                >
                  <Watch size={16} className="mr-2" />
                  Apple Watch
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConnectWearable('Fitbit')}
                  className="justify-start"
                >
                  <Watch size={16} className="mr-2" />
                  Fitbit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConnectWearable('Garmin')}
                  className="justify-start"
                >
                  <Watch size={16} className="mr-2" />
                  Garmin
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConnectWearable('Samsung')}
                  className="justify-start"
                >
                  <Watch size={16} className="mr-2" />
                  Samsung
                </Button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Notification Settings Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Bell className="text-purple-500" size={20} />
            <h3 className="font-bold text-gray-800">Notificações</h3>
          </div>
          <Link to={createPageUrl('NotificationSettings')}>
            <button className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Bell className="text-white" size={20} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">Configurar Notificações</p>
                  <p className="text-xs text-gray-500">Personalize seus alertas e lembretes</p>
                </div>
              </div>
              <ChevronRight className="text-gray-400" size={20} />
            </button>
          </Link>
        </motion.div>

        {/* Privacy Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
        >
          <button
            onClick={() => setShowPrivacySettings(!showPrivacySettings)}
            className="w-full flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-2">
              <Shield className="text-purple-500" size={20} />
              <h3 className="font-bold text-gray-800">Privacidade</h3>
            </div>
            <ChevronRight 
              className={`text-gray-400 transition-transform ${showPrivacySettings ? 'rotate-90' : ''}`} 
              size={20} 
            />
          </button>

          <AnimatePresence>
            {showPrivacySettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Eye size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-700">Mostrar peso</span>
                  </div>
                  <button
                    onClick={() => handlePrivacyChange('show_weight', !(profile?.privacy_settings?.show_weight ?? true))}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      profile?.privacy_settings?.show_weight ?? true ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      profile?.privacy_settings?.show_weight ?? true ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-700">Mostrar progresso</span>
                  </div>
                  <button
                    onClick={() => handlePrivacyChange('show_progress', !(profile?.privacy_settings?.show_progress ?? true))}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      profile?.privacy_settings?.show_progress ?? true ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      profile?.privacy_settings?.show_progress ?? true ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Target size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-700">Mostrar metas</span>
                  </div>
                  <button
                    onClick={() => handlePrivacyChange('show_goals', !(profile?.privacy_settings?.show_goals ?? true))}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      profile?.privacy_settings?.show_goals ?? true ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      profile?.privacy_settings?.show_goals ?? true ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Camera size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-700">Mostrar foto de perfil</span>
                  </div>
                  <button
                    onClick={() => handlePrivacyChange('show_profile_photo', !(profile?.privacy_settings?.show_profile_photo ?? true))}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      profile?.privacy_settings?.show_profile_photo ?? true ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      profile?.privacy_settings?.show_profile_photo ?? true ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-700">Visível para nutricionistas</span>
                  </div>
                  <button
                    onClick={() => handlePrivacyChange('visible_to_nutritionists', !(profile?.privacy_settings?.visible_to_nutritionists ?? true))}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      profile?.privacy_settings?.visible_to_nutritionists ?? true ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      profile?.privacy_settings?.visible_to_nutritionists ?? true ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="mt-4 p-3 bg-purple-50 rounded-xl">
                  <p className="text-xs text-purple-800">
                    <strong>Nota:</strong> Suas configurações de privacidade controlam quais informações são compartilhadas com nutricionistas e outros usuários.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Weight History */}
        {weightHistory.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-emerald-500" size={20} />
              <h3 className="font-bold text-gray-800">Histórico de Peso</h3>
            </div>

            <div className="space-y-2">
              {weightHistory.slice(-5).reverse().map((entry, idx) => (
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

        {/* Trocar senha */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mb-3"
        >
          <Button
            variant="outline"
            onClick={() => { setPasswordError(''); setShowPasswordDialog(true); }}
            className="w-full"
          >
            <Lock size={18} className="mr-2" />
            Trocar senha
          </Button>
        </motion.div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full border-red-200 text-red-600 hover:bg-red-50"
          >
            <LogOut size={18} className="mr-2" />
            Sair da conta
          </Button>
        </motion.div>
      </div>

      {/* Avatar Customization Dialog */}
      {!isNutritionist && (
        <AvatarCustomization
          profile={profile}
          isOpen={showAvatarDialog}
          onClose={() => setShowAvatarDialog(false)}
        />
      )}

      {/* Trocar senha dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Trocar senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Senha atual</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordForm.current}
                  onChange={(e) => { setPasswordForm({ ...passwordForm, current: e.target.value }); setPasswordError(''); }}
                  className="pl-10 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Mostrar/ocultar senhas"
                >
                  {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm">Nova senha</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordForm.next}
                  onChange={(e) => { setPasswordForm({ ...passwordForm, next: e.target.value }); setPasswordError(''); }}
                  className="pl-10"
                  autoComplete="new-password"
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo.
              </p>
            </div>
            <div>
              <Label className="text-sm">Confirme a nova senha</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordForm.confirm}
                  onChange={(e) => { setPasswordForm({ ...passwordForm, confirm: e.target.value }); setPasswordError(''); }}
                  className="pl-10"
                  autoComplete="new-password"
                />
              </div>
            </div>
            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)} disabled={passwordLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handlePasswordSubmit}
              disabled={passwordLoading}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {passwordLoading ? 'Salvando...' : 'Salvar senha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
