import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { supabase } from '@/lib/supabaseClient';
import { createPageUrl } from '@/utils';
import Logo from '@/components/ui/Logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import PasswordStrength from '@/components/auth/PasswordStrength';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [tokenStatus, setTokenStatus] = useState('checking'); // checking | valid | invalid

  useEffect(() => {
    if (!supabase) {
      setTokenStatus('invalid');
      return;
    }

    let cancelled = false;

    const evaluate = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data?.session?.user) {
        setTokenStatus('valid');
      }
    };

    // Supabase emits PASSWORD_RECOVERY when the recovery hash is parsed.
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setTokenStatus('valid');
      }
    });

    evaluate();

    const timeout = setTimeout(() => {
      if (!cancelled) {
        setTokenStatus((current) => (current === 'checking' ? 'invalid' : current));
      }
    }, 2500);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Preencha a nova senha e a confirmação.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      setError('A senha precisa ter ao menos 8 caracteres, uma maiuscula, uma minuscula, um número e um caractere especial.');
      return;
    }

    setLoading(true);
    try {
      await appClient.auth.updatePassword(password);
      setDone(true);
      setTimeout(() => navigate(createPageUrl('Login'), { replace: true }), 1800);
    } catch (updateError) {
      setError(updateError?.message || 'Não foi possível atualizar a senha.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-emerald-500" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Senha atualizada</h2>
            <p className="text-gray-500">Redirecionando para o login...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (tokenStatus === 'invalid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <div className="text-center mb-8"><Logo size="lg" /></div>
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Link invalido ou expirado</h2>
            <p className="text-gray-500 mb-6">
              O link de recuperação não e valido. Solicite um novo email de redefinição.
            </p>
            <Button
              onClick={() => navigate(createPageUrl('ForgotPassword'), { replace: true })}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              Solicitar novo link
            </Button>
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
        <div className="text-center mb-8"><Logo size="lg" /></div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Definir nova senha</h1>
            <p className="text-gray-500 mt-2">Escolha uma senha forte para sua conta.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-gray-600">Nova senha</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="pl-10 pr-10"
                  placeholder="********"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            <div>
              <Label className="text-gray-600">Confirmar nova senha</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  className="pl-10"
                  placeholder="********"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <Button
              type="submit"
              disabled={loading || tokenStatus !== 'valid'}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              {loading ? 'Salvando...' : tokenStatus === 'checking' ? 'Validando link...' : 'Salvar nova senha'}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
