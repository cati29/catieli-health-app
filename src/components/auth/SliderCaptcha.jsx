import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';

export default function SliderCaptcha({ onVerified }) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(0);
  const [verified, setVerified] = useState(false);
  const containerRef = useRef(null);

  const handleDrag = (e, info) => {
    if (verified) return;
    const containerWidth = containerRef.current?.offsetWidth || 300;
    const maxPosition = containerWidth - 56;
    const newPosition = Math.max(0, Math.min(info.point.x - 28, maxPosition));
    setPosition(newPosition);

    if (newPosition >= maxPosition - 10) {
      setVerified(true);
      setPosition(maxPosition);
      onVerified(true);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (!verified) {
      setPosition(0);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative h-14 rounded-xl overflow-hidden transition-colors ${
        verified ? 'bg-emerald-100' : 'bg-gray-100'
      }`}
    >
      {/* Track */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-medium ${verified ? 'text-emerald-600' : 'text-gray-400'}`}>
          {verified ? 'Verificado!' : 'Arraste para verificar'}
        </span>
      </div>

      {/* Progress Fill */}
      <motion.div
        className={`absolute left-0 top-0 bottom-0 ${verified ? 'bg-emerald-200' : 'bg-emerald-100'}`}
        style={{ width: position + 56 }}
      />

      {/* Slider Button */}
      <motion.div
        drag={verified ? false : 'x'}
        dragConstraints={containerRef}
        dragElastic={0}
        dragMomentum={false}
        onDrag={handleDrag}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        animate={{ x: position }}
        className={`absolute left-0 top-0 bottom-0 w-14 flex items-center justify-center cursor-grab active:cursor-grabbing rounded-xl transition-colors ${
          verified 
            ? 'bg-emerald-500' 
            : isDragging 
              ? 'bg-emerald-600' 
              : 'bg-emerald-500 hover:bg-emerald-600'
        }`}
      >
        {verified ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          >
            <Check className="text-white" size={24} />
          </motion.div>
        ) : (
          <ArrowRight className="text-white" size={24} />
        )}
      </motion.div>
    </div>
  );
}