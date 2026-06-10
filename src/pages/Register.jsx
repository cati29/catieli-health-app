import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { translateAuthError } from '@/lib/authErrors';
import { appClient } from '@/api/appClient';
import Logo from '@/components/ui/Logo';
import PasswordStrength from '@/components/auth/PasswordStrength';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  User, Mail, Lock, Phone, MapPin, Ruler, Scale,
  Flame, Heart, Dumbbell, Sparkles, ChevronRight, ChevronLeft, Eye, EyeOff,
  Stethoscope, Award, MailCheck
} from 'lucide-react';

export const PENDING_PROFILE_PREFIX = 'pending_profile_';

export default function Register() {
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState('user');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
  
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    age: '',
    height: '',
    weight: '',
    city: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    goal: 'health',
    crm_nutrition: '',
    specialty: '',
    bio: ''
  });

  const goals = [
    { value: 'weight_loss', label: 'Emagrecimento', Icon: Flame },
    { value: 'health', label: 'Saúde', Icon: Heart },
    { value: 'weight_gain', label: 'Ganho de peso', Icon: Dumbbell },
    { value: 'other', label: 'Outros', Icon: Sparkles }
  ];

  const specialties = [
    { value: 'weight_loss', label: 'Emagrecimento' },
    { value: 'health', label: 'Saúde Geral' },
    { value: 'weight_gain', label: 'Ganho de Massa' },
    { value: 'sports', label: 'Nutrição Esportiva' },
    { value: 'clinical', label: 'Nutrição Clínica' },
    { value: 'other', label: 'Outra' }
  ];

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep = () => {
    switch(step) {
      case 1:
        if (!form.first_name || !form.last_name) {
          setError('Preencha nome e sobrenome');
          return false;
        }
        break;
      case 2:
        if (!form.email || !form.phone) {
          setError('Preencha email e telefone');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
          setError('Email inválido');
          return false;
        }
        break;
      case 3:
        if (!form.age || !form.height || !form.weight || !form.city) {
          setError('Preencha todos os campos');
          return false;
        }
        break;
      case 4:
        if (!form.password || form.password !== form.confirmPassword) {
          setError('As senhas não coincidem');
          return false;
        }
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
        if (!passwordRegex.test(form.password)) {
          setError('A senha não atende todos os requisitos');
          return false;
        }
        break;
      case 5:
        if (userType === 'nutritionist' && !form.crm_nutrition) {
          setError('CRN é obrigatório para nutricionistas');
          return false;
        }
        break;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = async () => {
    if (!validateStep()) return;
    
    setLoading(true);
    setError('');

    try {
      const authResult = await appClient.auth.signUp({
        email: form.email,
        password: form.password,
        metadata: {
          full_name: `${form.first_name} ${form.last_name}`.trim(),
          role: userType
        }
      });

      const ownerKey = authResult.user?.email || form.email;
      const baseProfile = {
        first_name: form.first_name,
        last_name: form.last_name,
        age: Number(form.age),
        height: Number(form.height),
        weight: Number(form.weight),
        city: form.city,
        phone: form.phone,
        user_type: userType,
        goal: userType === 'user' ? form.goal : null,
        crm_nutrition: userType === 'nutritionist' ? form.crm_nutrition : null,
        specialty: userType === 'nutritionist' ? form.specialty : null,
        bio: userType === 'nutritionist' ? form.bio : null,
        xp: 0,
        level: 1,
        avatar_stage: 1,
        plan_type: 'free',
        email: ownerKey,
        user_id: ownerKey,
        created_by: ownerKey,
        email_verified: false,
        ai_exercises_generated: false,
        ai_exercises_generated_at: null,
        weight_history: [{ date: new Date().toISOString().split('T')[0], weight: Number(form.weight) }]
      };

      if (!authResult.session) {
        // Email confirmation required: stash profile and prompt user to verify email.
        // Login.jsx finalizes the profile after the user confirms and signs in.
        const pending = { ...baseProfile, auth_user_id: authResult.user?.id ?? null };
        localStorage.setItem(`${PENDING_PROFILE_PREFIX}${ownerKey}`, JSON.stringify(pending));
        setAwaitingEmailConfirmation(true);
        return;
      }

      const user = await appClient.auth.me();
      const profileData = { ...baseProfile, auth_user_id: user.id };

      const existing = await appClient.entities.UserProfile.filter({ created_by: ownerKey }, '-created_date', 1);
      if (existing[0]) {
        await appClient.entities.UserProfile.update(existing[0].id, profileData);
      } else {
        await appClient.entities.UserProfile.create(profileData);
      }

      window.location.href = createPageUrl('Home');
    } catch (submitError) {
      setError(translateAuthError(submitError, 'Não foi possível concluir o cadastro.'));
    } finally {
      setLoading(false);
    }
  };

  const handleExitPlatform = async () => {
    try {
      await appClient.auth.logout();
    } catch {
      // no-op
    }

    if (typeof window === 'undefined') return;

    if (window.opener) {
      window.close();
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = 'about:blank';
  };

  const totalSteps = userType === 'nutritionist' ? 6 : 5;

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">Vamos começar!</h2>
              <p className="text-gray-500 mt-2">Qual é o seu nome?</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-gray-600">Nome</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    value={form.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    className="pl-10"
                    placeholder="Seu nome"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-gray-600">Sobrenome</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    value={form.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    className="pl-10"
                    placeholder="Seu sobrenome"
                  />
                </div>
              </div>
            </div>

            {/* User Type Selection */}
            <div className="pt-4">
              <Label className="text-gray-600 mb-3 block">Você é:</Label>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setUserType('user')}
                  className={`p-4 rounded-xl border-2 transition-colors ${
                    userType === 'user' 
                      ? 'border-emerald-500 bg-emerald-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <User className={`mx-auto mb-2 ${userType === 'user' ? 'text-emerald-500' : 'text-gray-400'}`} size={24} />
                  <span className={`text-sm font-medium ${userType === 'user' ? 'text-emerald-700' : 'text-gray-600'}`}>
                    Usuário
                  </span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setUserType('nutritionist')}
                  className={`p-4 rounded-xl border-2 transition-colors ${
                    userType === 'nutritionist' 
                      ? 'border-emerald-500 bg-emerald-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Stethoscope className={`mx-auto mb-2 ${userType === 'nutritionist' ? 'text-emerald-500' : 'text-gray-400'}`} size={24} />
                  <span className={`text-sm font-medium ${userType === 'nutritionist' ? 'text-emerald-700' : 'text-gray-600'}`}>
                    Nutricionista
                  </span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">Contato</h2>
              <p className="text-gray-500 mt-2">Como podemos te alcançar?</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-gray-600">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="pl-10"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-gray-600">Telefone</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="pl-10"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">Seus dados</h2>
              <p className="text-gray-500 mt-2">Informações para personalizar sua experiência</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600">Idade</Label>
                <Input
                  type="number"
                  value={form.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                  placeholder="25"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label className="text-gray-600">Cidade</Label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    value={form.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    className="pl-10"
                    placeholder="Sua cidade"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-gray-600">Altura (cm)</Label>
                <div className="relative mt-1">
                  <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    type="number"
                    value={form.height}
                    onChange={(e) => handleChange('height', e.target.value)}
                    className="pl-10"
                    placeholder="170"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-gray-600">Peso (kg)</Label>
                <div className="relative mt-1">
                  <Scale className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    type="number"
                    value={form.weight}
                    onChange={(e) => handleChange('weight', e.target.value)}
                    className="pl-10"
                    placeholder="70"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">Crie sua senha</h2>
              <p className="text-gray-500 mt-2">Proteja sua conta</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-gray-600">Senha</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="********"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <PasswordStrength password={form.password} />
              </div>
              
              <div>
                <Label className="text-gray-600">Confirmar senha</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    className="pl-10"
                    placeholder="********"
                  />
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">As senhas não coincidem</p>
                )}
              </div>
            </div>
          </motion.div>
        );

      case 5:
        if (userType === 'user') {
          return (
            <motion.div
              key="step5-user"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Seu objetivo</h2>
                <p className="text-gray-500 mt-2">O que você busca alcançar?</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {goals.map((goal) => (
                  <motion.button
                    key={goal.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleChange('goal', goal.value)}
                    className={`p-4 rounded-xl border-2 transition-colors ${
                      form.goal === goal.value 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <goal.Icon className="mx-auto mb-2" size={22} />
                    <span className={`text-sm font-medium ${
                      form.goal === goal.value ? 'text-emerald-700' : 'text-gray-600'
                    }`}>
                      {goal.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          );
        } else {
          return (
            <motion.div
              key="step5-nutri"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Dados profissionais</h2>
                <p className="text-gray-500 mt-2">Informe seu registro profissional</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-gray-600">CRN (Conselho Regional de Nutrição)</Label>
                  <div className="relative mt-1">
                    <Award className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      value={form.crm_nutrition}
                      onChange={(e) => handleChange('crm_nutrition', e.target.value)}
                      className="pl-10"
                      placeholder="CRN-0 00000"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-600">Especialidade</Label>
                  <Select value={form.specialty} onValueChange={(v) => handleChange('specialty', v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione sua especialidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialties.map((spec) => (
                        <SelectItem key={spec.value} value={spec.value}>
                          {spec.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          );
        }

      case 6:
        return (
          <motion.div
            key="step6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">Sua bio</h2>
              <p className="text-gray-500 mt-2">Conte um pouco sobre você</p>
            </div>

            <div>
              <Label className="text-gray-600">Bio profissional</Label>
              <textarea
                value={form.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="Descreva sua experiência e especialidades..."
              />
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  if (awaitingEmailConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <Logo size="lg" />
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
              <MailCheck className="text-emerald-500" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Confirme seu email</h2>
            <p className="text-gray-500 mt-3">
              Enviamos um link de confirmação para <span className="font-semibold text-gray-700">{form.email}</span>.
              Clique no link para ativar sua conta e depois faça login para concluir seu cadastro.
            </p>

            <Link to={createPageUrl('Login')} className="block mt-8">
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600">
                Ir para o login
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <motion.div
              key={idx}
              className={`h-1.5 flex-1 rounded-full ${
                idx + 1 <= step ? 'bg-emerald-500' : 'bg-gray-200'
              }`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: idx * 0.1 }}
            />
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          {/* Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-sm text-center mt-4"
            >
              {error}
            </motion.p>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={prevStep}
                className="flex-1"
              >
                <ChevronLeft size={18} className="mr-1" />
                Voltar
              </Button>
            )}
            
            {step < totalSteps ? (
              <Button
                onClick={nextStep}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
              >
                Continuar
                <ChevronRight size={18} className="ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
              >
                {loading ? 'Criando conta...' : 'Criar conta'}
              </Button>
            )}
          </div>
        </div>

        {/* Login Link */}
        <p className="text-center mt-6 text-gray-600">
          Já tem uma conta?{' '}
          <Link to={createPageUrl('Login')} className="text-emerald-600 font-semibold hover:underline">
            Entrar
          </Link>
        </p>

        <Button
          type="button"
          variant="outline"
          onClick={handleExitPlatform}
          className="w-full mt-4"
        >
          Sair da plataforma
        </Button>
      </motion.div>
    </div>
  );
}
