import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { createPageUrl } from '@/utils';
import Logo from '@/components/ui/Logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const maskEmail = (rawEmail) => {
    const [user, domain] = rawEmail.split('@');
    if (!user || !domain) return rawEmail;
    const maskedUser = user.slice(0, 3) + '***' + user.slice(-1);
    return `${maskedUser}@${domain}`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email) {
      setError('Digite seu email.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email invalido.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await appClient.auth.requestPasswordReset(email);
      setSent(true);
    } catch (resetError) {
      setError(resetError?.message || 'Não foi possível enviar o email de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="text-emerald-500" size={40} />
            </motion.div>

            <h2 className="text-2xl font-bold text-gray-800 mb-3">Email enviado</h2>
            <p className="text-gray-500 mb-6">
              Enviamos um link de recuperação para
              <br />
              <span className="font-medium text-gray-700">{maskEmail(email)}</span>
            </p>

            <Link to={createPageUrl('Login')}>
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600">
                Voltar ao login
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
        <Link
          to={createPageUrl('Login')}
          className="inline-flex items-center text-gray-600 hover:text-emerald-600 mb-6 transition-colors"
        >
          <ArrowLeft size={18} className="mr-2" />
          Voltar ao login
        </Link>

        <div className="text-center mb-8">
          <Logo size="lg" />
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Recuperar senha</h2>
            <p className="text-gray-500 mt-2">
              Digite seu email e enviaremos o link para redefinir sua senha.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="text-gray-600">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  className="pl-10"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-sm text-center"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
