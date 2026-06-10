import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, ThumbsUp, ThumbsDown, Target, TrendingUp } from 'lucide-react';

export default function FeedbackForm({ onSend, isLoading }) {
  const [feedback, setFeedback] = useState('');
  const [type, setType] = useState('general');
  const [sentiment, setSentiment] = useState('positive');

  const feedbackTypes = [
    { value: 'general', label: 'Geral', icon: MessageCircle },
    { value: 'nutrition', label: 'Nutrição', icon: Target },
    { value: 'exercise', label: 'Exercício', icon: TrendingUp }
  ];

  const handleSend = () => {
    if (!feedback.trim()) return;
    
    onSend({
      message: feedback,
      type,
      sentiment,
      timestamp: new Date().toISOString()
    });
    
    setFeedback('');
    setType('general');
    setSentiment('positive');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Tipo de Feedback
        </label>
        <div className="flex gap-2">
          {feedbackTypes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setType(value)}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                type === value
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <Icon size={18} className="mx-auto mb-1" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Tom do Feedback
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setSentiment('positive')}
            className={`flex-1 p-3 rounded-lg border-2 transition-all ${
              sentiment === 'positive'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <ThumbsUp size={18} className="mx-auto mb-1" />
            <span className="text-xs font-medium">Positivo</span>
          </button>
          <button
            onClick={() => setSentiment('constructive')}
            className={`flex-1 p-3 rounded-lg border-2 transition-all ${
              sentiment === 'constructive'
                ? 'border-amber-500 bg-amber-50 text-amber-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <ThumbsDown size={18} className="mx-auto mb-1" />
            <span className="text-xs font-medium">Construtivo</span>
          </button>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Mensagem
        </label>
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Escreva seu feedback detalhado..."
          className="h-32"
        />
      </div>

      <Button
        onClick={handleSend}
        disabled={!feedback.trim() || isLoading}
        className="w-full bg-emerald-500 hover:bg-emerald-600"
      >
        {isLoading ? 'Enviando...' : 'Enviar Feedback'}
      </Button>
    </div>
  );
}