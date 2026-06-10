import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, Plus, Search, Check, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const commonFoods = [
  { name: 'Arroz branco', calories_per_100g: 130, category: 'carb' },
  { name: 'Feijão', calories_per_100g: 77, category: 'protein' },
  { name: 'Frango grelhado', calories_per_100g: 165, category: 'protein' },
  { name: 'Carne bovina', calories_per_100g: 250, category: 'protein' },
  { name: 'Ovo', calories_per_100g: 155, category: 'protein' },
  { name: 'Batata', calories_per_100g: 77, category: 'carb' },
  { name: 'Macarrão', calories_per_100g: 131, category: 'carb' },
  { name: 'Pão francês', calories_per_100g: 300, category: 'carb' },
  { name: 'Alface', calories_per_100g: 15, category: 'vegetable' },
  { name: 'Tomate', calories_per_100g: 18, category: 'vegetable' },
  { name: 'Brócolis', calories_per_100g: 34, category: 'vegetable' },
  { name: 'Espinafre', calories_per_100g: 23, category: 'vegetable' },
  { name: 'Banana', calories_per_100g: 89, category: 'fruit' },
  { name: 'Maçã', calories_per_100g: 52, category: 'fruit' },
  { name: 'Leite', calories_per_100g: 42, category: 'dairy' },
  { name: 'Queijo', calories_per_100g: 402, category: 'dairy' },
  { name: 'Pizza', calories_per_100g: 266, category: 'snack' },
  { name: 'Hambúrguer', calories_per_100g: 295, category: 'snack' },
];

export default function FoodTracker({ consumed = 0, goal = 2000, entries = [], onAddFood, customFoods = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState(100);
  const [mealType, setMealType] = useState('lunch');
  const [showXP, setShowXP] = useState(false);

  const allFoods = [...commonFoods, ...customFoods];
  const filteredFoods = allFoods.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const percentage = Math.min((consumed / goal) * 100, 100);

  const handleAddFood = () => {
    if (!selectedFood) return;
    
    const calories = Math.round((selectedFood.calories_per_100g * quantity) / 100);
    const xp = Math.round(calories / 10);
    
    setShowXP(true);
    setTimeout(() => setShowXP(false), 2000);
    
    onAddFood({
      food_name: selectedFood.name,
      quantity_grams: quantity,
      calories,
      meal_type: mealType
    }, xp);
    
    setIsOpen(false);
    setSelectedFood(null);
    setQuantity(100);
  };

  const mealTypes = {
    breakfast: 'Café da manhã',
    lunch: 'Almoço',
    dinner: 'Jantar',
    snack: 'Lanche'
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 relative overflow-hidden">
      {/* XP Popup */}
      <AnimatePresence>
        {showXP && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 right-4 bg-amber-400 text-white px-3 py-1 rounded-full font-bold flex items-center gap-1 shadow-lg z-10"
          >
            <Trophy size={16} />
            +XP
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 mb-4">
        <Utensils className="text-emerald-600" size={24} />
        <h3 className="font-semibold text-gray-800">Alimentação</h3>
      </div>

      {/* Calorie Circle */}
      <div className="flex justify-center mb-4">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="48"
              className="fill-none stroke-emerald-100"
              strokeWidth="12"
            />
            <motion.circle
              cx="56"
              cy="56"
              r="48"
              className="fill-none stroke-emerald-500"
              strokeWidth="12"
              strokeLinecap="round"
              initial={{ strokeDasharray: '0 301.59' }}
              animate={{ strokeDasharray: `${(percentage / 100) * 301.59} 301.59` }}
              transition={{ duration: 0.8 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-emerald-600">{consumed}</span>
            <span className="text-xs text-gray-500">kcal</span>
          </div>
        </div>
      </div>

      {/* Progress Info */}
      <div className="text-center mb-4">
        <p className="text-sm text-gray-500">Meta: {goal} kcal ({Math.round(percentage)}%)</p>
      </div>

      {/* Today's Entries */}
      {entries.length > 0 && (
        <div className="mb-4 space-y-2 max-h-32 overflow-y-auto">
          {entries.slice(-3).map((entry, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex justify-between items-center text-sm bg-white/50 rounded-lg p-2"
            >
              <span className="text-gray-700">{entry.food_name}</span>
              <span className="text-emerald-600 font-medium">{entry.calories} kcal</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Food Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
            <Plus size={18} className="mr-2" />
            Registrar Refeição
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Alimento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Buscar alimento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Food List */}
            <div className="max-h-48 overflow-y-auto space-y-2">
              {filteredFoods.map((food, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedFood(food)}
                  className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedFood?.name === food.name 
                      ? 'bg-emerald-100 border-2 border-emerald-500' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-800">{food.name}</p>
                    <p className="text-xs text-gray-500">{food.calories_per_100g} kcal/100g</p>
                  </div>
                  {selectedFood?.name === food.name && (
                    <Check className="text-emerald-500" size={20} />
                  )}
                </motion.div>
              ))}
            </div>

            {selectedFood && (
              <>
                {/* Quantity */}
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Quantidade (gramas)</label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    min={1}
                  />
                  <p className="text-sm text-emerald-600 mt-1">
                    = {Math.round((selectedFood.calories_per_100g * quantity) / 100)} kcal
                  </p>
                </div>

                {/* Meal Type */}
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Refeição</label>
                  <Select value={mealType} onValueChange={setMealType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(mealTypes).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleAddFood} className="w-full bg-emerald-500 hover:bg-emerald-600">
                  <Plus size={18} className="mr-2" />
                  Adicionar
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}