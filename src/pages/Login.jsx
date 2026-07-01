import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { createPageUrl } from '@/utils';
import { translateAuthError } from '@/lib/authErrors';
import { PENDING_PROFILE_PREFIX } from '@/pages/Register';
import Logo from '@/components/ui/Logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fromUrlOverride = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const fromUrl = params.get('from_url');
    if (!fromUrl) return null;
    try {
      const parsed = new URL(fromUrl, window.location.origin);
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return null;
    }
  }, [location.search]);

  const resolveLandingPage = async (loginEmail) => {
    if (fromUrlOverride) return fromUrlOverride;
    try {
      const profiles = await appClient.entities.UserProfile.filter(
        { created_by: loginEmail },
        '-created_date',
        1
      );
      if (profiles?.[0]?.user_type === 'nutritionist') {
        return createPageUrl('NutritionistDashboard');
      }
    } catch {
      // fall through to Home
    }
    return createPageUrl('Home');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Preencha email e senha.');
      return;
    }

    setLoading(true);
    try {
      await appClient.auth.login(email, password);
      await finalizePendingProfileIfAny(email);
      const landing = await resolveLandingPage(email);
      navigate(landing, { replace: true });
    } catch (authError) {
      setError(translateAuthError(authError, 'Não foi possível autenticar.'));
    } finally {
      setLoading(false);
    }
  };

  const finalizePendingProfileIfAny = async (loginEmail) => {
    const pendingKey = `${PENDING_PROFILE_PREFIX}${loginEmail}`;
    const pendingRaw = typeof localStorage !== 'undefined' ? localStorage.getItem(pendingKey) : null;
    if (!pendingRaw) return;

    try {
      const pending = JSON.parse(pendingRaw);
      const user = await appClient.auth.me();
      const ownerKey = user.email || loginEmail;
      const profileData = { ...pending, auth_user_id: user.id, email: ownerKey, user_id: ownerKey, created_by: ownerKey };

      const existing = await appClient.entities.UserProfile.filter({ created_by: ownerKey }, '-created_date', 1);
      if (existing[0]) {
        await appClient.entities.UserProfile.update(existing[0].id, profileData);
      } else {
        await appClient.entities.UserProfile.create(profileData);
      }
    } catch (finalizeError) {
      console.warn('Failed to finalize pending profile after login', finalizeError);
    } finally {
      localStorage.removeItem(pendingKey);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Logo size="lg" />
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Entrar</h1>
            <p className="text-gray-500 mt-2">Use sua conta para acessar o app.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-gray-600">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-600">Senha</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="pl-10"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600 space-y-2">
            <p>
              <Link to={createPageUrl('ForgotPassword')} className="text-emerald-600 hover:underline">
                Esqueci minha senha
              </Link>
            </p>
            <p>
              Não tem conta?{' '}
              <Link to={createPageUrl('Register')} className="text-emerald-600 font-semibold hover:underline">
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
