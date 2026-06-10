import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function IMCCalculator({ weight, height, showInput = false, onUpdate }) {
  const [localWeight, setLocalWeight] = useState(weight || 70);
  const [localHeight, setLocalHeight] = useState(height || 170);

  const w = showInput ? localWeight : weight;
  const h = showInput ? localHeight : height;

  const imc = w && h ? (w / Math.pow(h / 100, 2)).toFixed(1) : 0;

  const getIMCCategory = (imc) => {
    const numIMC = parseFloat(imc);
    if (numIMC < 16) return { label: 'Magreza acentuada', color: 'text-red-600', bg: 'bg-red-100', icon: TrendingDown };
    if (numIMC < 17) return { label: 'Magreza moderada', color: 'text-orange-600', bg: 'bg-orange-100', icon: TrendingDown };
    if (numIMC < 18.5) return { label: 'Abaixo do peso', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: TrendingDown };
    if (numIMC < 25) return { label: 'Peso ideal', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: Minus };
    if (numIMC < 30) return { label: 'Sobrepeso', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: TrendingUp };
    if (numIMC < 35) return { label: 'Obesidade grau I', color: 'text-orange-600', bg: 'bg-orange-100', icon: TrendingUp };
    if (numIMC < 40) return { label: 'Obesidade grau II', color: 'text-red-500', bg: 'bg-red-100', icon: TrendingUp };
    return { label: 'Obesidade grau III', color: 'text-red-700', bg: 'bg-red-200', icon: TrendingUp };
  };

  const category = getIMCCategory(imc);
  const CategoryIcon = category.icon;

  const getIMCPosition = (imc) => {
    const numIMC = parseFloat(imc);
    // Scale from 15 to 40 IMC -> 0 to 100%
    return Math.min(Math.max(((numIMC - 15) / 25) * 100, 0), 100);
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <Scale className="text-emerald-600" size={24} />
        <h3 className="font-semibold text-gray-800">Calculadora de IMC</h3>
      </div>

      {showInput && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-500">Peso (kg)</label>
            <input
              type="number"
              value={localWeight}
              onChange={(e) => setLocalWeight(Number(e.target.value))}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Altura (cm)</label>
            <input
              type="number"
              value={localHeight}
              onChange={(e) => setLocalHeight(Number(e.target.value))}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* IMC Display */}
      <div className="text-center mb-4">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${category.bg}`}
        >
          <CategoryIcon size={18} className={category.color} />
          <span className={`font-semibold ${category.color}`}>{category.label}</span>
        </motion.div>
      </div>

      {/* IMC Value */}
      <div className="text-center mb-4">
        <span className="text-5xl font-bold text-gray-800">{imc}</span>
        <span className="text-lg text-gray-500 ml-1">IMC</span>
      </div>

      {/* IMC Scale */}
      <div className="relative mt-6">
        <div className="h-3 rounded-full overflow-hidden flex">
          <div className="w-1/5 bg-red-400" />
          <div className="w-1/5 bg-yellow-400" />
          <div className="w-1/5 bg-emerald-400" />
          <div className="w-1/5 bg-yellow-400" />
          <div className="w-1/5 bg-red-400" />
        </div>
        
        {/* Indicator */}
        <motion.div
          className="absolute -top-1 w-5 h-5 bg-gray-800 rounded-full border-2 border-white shadow-lg"
          initial={{ left: '50%' }}
          animate={{ left: `${getIMCPosition(imc)}%` }}
          style={{ transform: 'translateX(-50%)' }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
        
        {/* Labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>15</span>
          <span>18.5</span>
          <span>25</span>
          <span>30</span>
          <span>40</span>
        </div>
      </div>

      {showInput && onUpdate && (
        <button
          onClick={() => onUpdate({ weight: localWeight, height: localHeight })}
          className="w-full mt-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
        >
          Atualizar Dados
        </button>
      )}
    </div>
  );
}