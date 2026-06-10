import React from 'react';
import { Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PasswordStrength({ password }) {
  const rules = [
    { label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
    { label: '1 letra maiúscula', test: (p) => /[A-Z]/.test(p) },
    { label: '1 letra minúscula', test: (p) => /[a-z]/.test(p) },
    { label: '1 número', test: (p) => /[0-9]/.test(p) },
    { label: '1 caractere especial', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
  ];

  const passedRules = rules.filter(rule => rule.test(password)).length;
  const strength = (passedRules / rules.length) * 100;

  const getStrengthColor = () => {
    if (strength <= 20) return 'bg-red-500';
    if (strength <= 40) return 'bg-orange-500';
    if (strength <= 60) return 'bg-yellow-500';
    if (strength <= 80) return 'bg-lime-500';
    return 'bg-emerald-500';
  };

  const getStrengthText = () => {
    if (strength <= 20) return 'Muito fraca';
    if (strength <= 40) return 'Fraca';
    if (strength <= 60) return 'Média';
    if (strength <= 80) return 'Forte';
    return 'Muito forte';
  };

  return (
    <div className="space-y-3 mt-2">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${getStrengthColor()} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${strength}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className={`text-xs font-medium ${getStrengthColor().replace('bg-', 'text-')}`}>
          {password ? getStrengthText() : ''}
        </p>
      </div>

      {/* Rules Checklist */}
      <div className="space-y-1.5">
        {rules.map((rule, idx) => {
          const passed = rule.test(password);
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`flex items-center gap-2 text-sm ${passed ? 'text-emerald-600' : 'text-gray-400'}`}
            >
              {passed ? (
                <Check size={16} className="text-emerald-500" />
              ) : (
                <X size={16} className="text-gray-300" />
              )}
              <span>{rule.label}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}