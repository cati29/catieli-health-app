import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Heart, Moon, Flame } from 'lucide-react';

export default function HealthDataWidget({ healthData, compact = false }) {
  if (!healthData) return null;

  const metrics = [
    {
      icon: Activity,
      label: 'Passos',
      value: healthData.steps?.toLocaleString() || '0',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      target: 10000,
      current: healthData.steps
    },
    {
      icon: Heart,
      label: 'BPM Médio',
      value: healthData.heart_rate_avg || '-',
      color: 'text-red-600',
      bg: 'bg-red-50',
      subtitle: healthData.heart_rate_min && healthData.heart_rate_max 
        ? `${healthData.heart_rate_min}-${healthData.heart_rate_max}`
        : null
    },
    {
      icon: Moon,
      label: 'Sono',
      value: healthData.sleep_hours ? `${healthData.sleep_hours}h` : '-',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      subtitle: healthData.sleep_quality 
        ? healthData.sleep_quality === 'excellent' ? 'Excelente' :
          healthData.sleep_quality === 'good' ? 'Bom' : 'Regular'
        : null
    },
    {
      icon: Flame,
      label: 'Calorias',
      value: healthData.calories_burned || '0',
      color: 'text-orange-600',
      bg: 'bg-orange-50'
    }
  ];

  if (compact) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className={`${metric.bg} rounded-xl p-3 text-center`}
            >
              <Icon className={`${metric.color} mx-auto mb-1`} size={20} />
              <p className="text-lg font-bold text-gray-800">{metric.value}</p>
              <p className="text-xs text-gray-600">{metric.label}</p>
            </motion.div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {metrics.map((metric, idx) => {
        const Icon = metric.icon;
        const progress = metric.target ? Math.min((metric.current / metric.target) * 100, 100) : null;
        
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-xl shadow-md p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-12 h-12 ${metric.bg} rounded-xl flex items-center justify-center`}>
                <Icon className={metric.color} size={24} />
              </div>
              {progress !== null && (
                <span className="text-xs font-medium text-gray-500">
                  {Math.round(progress)}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-800 mb-1">{metric.value}</p>
            <p className="text-sm text-gray-600">{metric.label}</p>
            {metric.subtitle && (
              <p className="text-xs text-gray-400 mt-1">{metric.subtitle}</p>
            )}
            {progress !== null && (
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}