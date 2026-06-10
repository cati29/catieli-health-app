import React from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PlanCard({ plan, isCurrentPlan, onSelect }) {
  const planStyles = {
    free: {
      gradient: 'from-gray-100 to-gray-50',
      accent: 'bg-gray-500',
      icon: Star,
      badge: null
    },
    basic: {
      gradient: 'from-blue-100 to-blue-50',
      accent: 'bg-blue-500',
      icon: Zap,
      badge: 'Popular'
    },
    premium: {
      gradient: 'from-amber-100 to-amber-50',
      accent: 'bg-amber-500',
      icon: Crown,
      badge: 'Melhor'
    }
  };

  const style = planStyles[plan.type] || planStyles.free;
  const Icon = style.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`relative bg-gradient-to-br ${style.gradient} rounded-2xl p-6 border-2 ${
        isCurrentPlan ? 'border-emerald-500' : 'border-transparent'
      }`}
    >
      {/* Badge */}
      {style.badge && (
        <div className={`absolute -top-3 right-4 ${style.accent} text-white text-xs font-bold px-3 py-1 rounded-full`}>
          {style.badge}
        </div>
      )}

      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute -top-3 left-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
          Seu Plano
        </div>
      )}

      {/* Icon */}
      <div className={`w-12 h-12 ${style.accent} rounded-xl flex items-center justify-center mb-4`}>
        <Icon size={24} className="text-white" />
      </div>

      {/* Plan Name */}
      <h3 className="text-xl font-bold text-gray-800 mb-1">{plan.name}</h3>
      
      {/* Price */}
      <div className="mb-4">
        <span className="text-3xl font-bold text-gray-800">
          {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2)}`}
        </span>
        {plan.price > 0 && (
          <span className="text-gray-500 text-sm">/mês</span>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-6">
        {plan.features?.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <Check size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-600">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <Button
        onClick={() => onSelect(plan)}
        disabled={isCurrentPlan}
        className={`w-full ${
          isCurrentPlan 
            ? 'bg-gray-300 cursor-not-allowed' 
            : plan.type === 'premium'
              ? 'bg-amber-500 hover:bg-amber-600'
              : plan.type === 'basic'
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-gray-600 hover:bg-gray-700'
        } text-white`}
      >
        {isCurrentPlan ? 'Plano Atual' : plan.price === 0 ? 'Começar Grátis' : 'Assinar Agora'}
      </Button>
    </motion.div>
  );
}