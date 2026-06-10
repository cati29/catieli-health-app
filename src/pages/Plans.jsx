import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PlanCard from '@/components/plans/PlanCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CreditCard, Shield, Check, Crown, Zap
} from 'lucide-react';

export default function Plans() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    cardName: '',
    expiry: '',
    cvv: ''
  });

  // Fetch user profile
  const { data: profiles } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.UserProfile.filter({ created_by: user.email });
    }
  });

  const profile = profiles?.[0];

  // Static plans
  const plans = [
    {
      id: 1,
      name: 'Gratuito',
      type: 'free',
      price: 0,
      features: [
        'Registro de água e alimentação',
        'Sistema de XP e níveis',
        'Avatar evolutivo',
        '1 mensagem gratuita para nutricionista',
        'Calculadora de IMC'
      ]
    },
    {
      id: 2,
      name: 'Básico',
      type: 'basic',
      price: 29.90,
      features: [
        'Tudo do plano gratuito',
        'Chat ilimitado com 1 nutricionista',
        'Metas personalizadas',
        'Histórico completo',
        'Suporte por email'
      ]
    },
    {
      id: 3,
      name: 'Premium',
      type: 'premium',
      price: 59.90,
      features: [
        'Tudo do plano básico',
        'Chat com nutricionistas ilimitados',
        'Plano alimentar personalizado',
        'Acompanhamento semanal',
        'Suporte prioritário',
        'Conteúdos exclusivos'
      ]
    }
  ];

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: async (planType) => {
      const user = await appClient.auth.me();
      
      // Create subscription record
      await appClient.entities.Subscription.create({
        user_id: user.email,
        plan_type: planType,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        amount_paid: plans.find(p => p.type === planType)?.price || 0
      });

      // Update profile
      return appClient.entities.UserProfile.update(profile.id, { plan_type: planType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setShowPaymentDialog(false);
      setSelectedPlan(null);
    }
  });

  const handleSelectPlan = (plan) => {
    if (plan.type === 'free') {
      updatePlanMutation.mutate('free');
    } else {
      setSelectedPlan(plan);
      setShowPaymentDialog(true);
    }
  };

  const handlePayment = () => {
    // Simulate payment
    updatePlanMutation.mutate(selectedPlan.type);
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.slice(0, 2) + '/' + v.slice(2, 4);
    }
    return v;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-amber-50/30 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 pt-8 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Crown className="text-white" size={32} />
          </motion.div>
          <h1 className="text-white text-2xl font-bold mb-2">Escolha seu plano</h1>
          <p className="text-amber-100">
            Desbloqueie todo o potencial da sua jornada de saúde
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-8">
        {/* Current Plan Badge */}
        {profile?.plan_type && profile.plan_type !== 'free' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-100 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
              <Check className="text-white" size={20} />
            </div>
            <div>
              <p className="font-semibold text-emerald-800">
                Você está no plano {profile.plan_type === 'basic' ? 'Básico' : 'Premium'}
              </p>
              <p className="text-sm text-emerald-600">
                Aproveite todos os benefícios!
              </p>
            </div>
          </motion.div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <PlanCard
                plan={plan}
                isCurrentPlan={profile?.plan_type === plan.type}
                onSelect={handleSelectPlan}
              />
            </motion.div>
          ))}
        </div>

        {/* Features Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 bg-white rounded-2xl shadow-lg p-6"
        >
          <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
            <Shield className="text-emerald-500" size={20} />
            Por que escolher um plano pago?
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Check className="text-emerald-500" size={16} />
              </div>
              <div>
                <p className="font-medium text-gray-800">Acompanhamento profissional</p>
                <p className="text-sm text-gray-500">Converse diretamente com nutricionistas certificados</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Check className="text-emerald-500" size={16} />
              </div>
              <div>
                <p className="font-medium text-gray-800">Resultados comprovados</p>
                <p className="text-sm text-gray-500">Planos personalizados para seus objetivos</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Check className="text-emerald-500" size={16} />
              </div>
              <div>
                <p className="font-medium text-gray-800">Suporte dedicado</p>
                <p className="text-sm text-gray-500">Tire suas dúvidas a qualquer momento</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Check className="text-emerald-500" size={16} />
              </div>
              <div>
                <p className="font-medium text-gray-800">Sem compromisso</p>
                <p className="text-sm text-gray-500">Cancele quando quiser, sem multas</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar assinatura</DialogTitle>
          </DialogHeader>
          
          {selectedPlan && (
            <div className="space-y-6">
              {/* Plan Summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedPlan.type === 'basic' ? (
                      <Zap className="text-blue-500" size={24} />
                    ) : (
                      <Crown className="text-amber-500" size={24} />
                    )}
                    <div>
                      <p className="font-bold text-gray-800">{selectedPlan.name}</p>
                      <p className="text-sm text-gray-500">Mensal</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">
                    R$ {selectedPlan.price.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-600">Número do cartão</Label>
                  <div className="relative mt-1">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      value={paymentForm.cardNumber}
                      onChange={(e) => setPaymentForm({ 
                        ...paymentForm, 
                        cardNumber: formatCardNumber(e.target.value) 
                      })}
                      placeholder="0000 0000 0000 0000"
                      className="pl-10"
                      maxLength={19}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-600">Nome no cartão</Label>
                  <Input
                    value={paymentForm.cardName}
                    onChange={(e) => setPaymentForm({ ...paymentForm, cardName: e.target.value.toUpperCase() })}
                    placeholder="NOME COMPLETO"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">Validade</Label>
                    <Input
                      value={paymentForm.expiry}
                      onChange={(e) => setPaymentForm({ 
                        ...paymentForm, 
                        expiry: formatExpiry(e.target.value) 
                      })}
                      placeholder="MM/AA"
                      className="mt-1"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-600">CVV</Label>
                    <Input
                      type="password"
                      value={paymentForm.cvv}
                      onChange={(e) => setPaymentForm({ 
                        ...paymentForm, 
                        cvv: e.target.value.replace(/\D/g, '').slice(0, 3) 
                      })}
                      placeholder="⬢⬢⬢"
                      className="mt-1"
                      maxLength={3}
                    />
                  </div>
                </div>
              </div>

              {/* Security Badge */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Shield size={16} className="text-emerald-500" />
                <span>Pagamento seguro e criptografado</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentDialog(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handlePayment}
                  disabled={updatePlanMutation.isPending}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                >
                  {updatePlanMutation.isPending ? 'Processando...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
