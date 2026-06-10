import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle,
  Apple,
  Coffee,
  Cookie,
  Moon,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed
} from 'lucide-react';
import { appClient } from '@/api/appClient';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function NutritionTracker() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState(100);
  const [mealType, setMealType] = useState('breakfast');

  useEffect(() => {
    const fetchUser = async () => {
      const user = await appClient.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: foodDatabase = [] } = useQuery({
    queryKey: ['foodDatabase', searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const allFoods = await appClient.entities.FoodDatabase.list();
      return allFoods
        .filter((food) => food.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 10);
    },
    enabled: !!currentUser && searchQuery.length >= 2
  });

  const { data: foodEntries = [] } = useQuery({
    queryKey: ['foodEntries', selectedDate],
    queryFn: async () => {
      const user = await appClient.auth.me();
      return appClient.entities.FoodEntry.filter({
        user_id: user.email,
        date: selectedDate
      });
    },
    enabled: !!currentUser
  });

  const { data: dailyNutrition } = useQuery({
    queryKey: ['dailyNutrition', selectedDate],
    queryFn: async () => {
      const user = await appClient.auth.me();
      const result = await appClient.entities.DailyNutrition.filter({
        user_id: user.email,
        date: selectedDate
      });
      return result[0] || null;
    },
    enabled: !!currentUser,
    initialData: null
  });

  const syncDailyGoalCalories = async (userEmail, delta) => {
    const existing = await appClient.entities.DailyGoal.filter({
      created_by: userEmail,
      date: selectedDate
    });

    if (existing[0]) {
      const next = Math.max(0, (existing[0].calories_consumed || 0) + delta);
      await appClient.entities.DailyGoal.update(existing[0].id, { calories_consumed: next });
    } else if (delta > 0) {
      await appClient.entities.DailyGoal.create({
        user_id: userEmail,
        date: selectedDate,
        calories_consumed: delta,
        water_goal_ml: 2000,
        calorie_goal: 2000,
        exercise_minutes_goal: 30
      });
    }
  };

  const addFoodMutation = useMutation({
    mutationFn: async ({ food, qty, meal }) => {
      const user = await appClient.auth.me();
      const multiplier = qty / 100;

      const entry = await appClient.entities.FoodEntry.create({
        user_id: user.email,
        date: selectedDate,
        food_name: food.name,
        food_id: food.id,
        quantity_grams: qty,
        meal_type: meal,
        calories: Math.round((food.calories_per_100g || 0) * multiplier),
        protein_g: Number(((food.protein_g || 0) * multiplier).toFixed(1)),
        carbs_g: Number(((food.carbs_g || 0) * multiplier).toFixed(1)),
        fat_g: Number(((food.fat_g || 0) * multiplier).toFixed(1)),
        fiber_g: Number(((food.fiber_g || 0) * multiplier).toFixed(1)),
        sugar_g: Number(((food.sugar_g || 0) * multiplier).toFixed(1)),
        sodium_mg: Number(((food.sodium_mg || 0) * multiplier).toFixed(1)),
        calcium_mg: Number(((food.calcium_mg || 0) * multiplier).toFixed(1)),
        iron_mg: Number(((food.iron_mg || 0) * multiplier).toFixed(2)),
        vitamin_a_mcg: Number(((food.vitamin_a_mcg || 0) * multiplier).toFixed(1)),
        vitamin_c_mg: Number(((food.vitamin_c_mg || 0) * multiplier).toFixed(1)),
        vitamin_d_mcg: Number(((food.vitamin_d_mcg || 0) * multiplier).toFixed(2)),
        vitamin_b12_mcg: Number(((food.vitamin_b12_mcg || 0) * multiplier).toFixed(2)),
        potassium_mg: Number(((food.potassium_mg || 0) * multiplier).toFixed(1)),
        magnesium_mg: Number(((food.magnesium_mg || 0) * multiplier).toFixed(1)),
        zinc_mg: Number(((food.zinc_mg || 0) * multiplier).toFixed(2))
      });

      const existing = await appClient.entities.DailyNutrition.filter({
        user_id: user.email,
        date: selectedDate
      });

      const newTotals = {
        calories: (existing[0]?.calories || 0) + entry.calories,
        protein_g: Number(((existing[0]?.protein_g || 0) + entry.protein_g).toFixed(1)),
        carbs_g: Number(((existing[0]?.carbs_g || 0) + entry.carbs_g).toFixed(1)),
        fat_g: Number(((existing[0]?.fat_g || 0) + entry.fat_g).toFixed(1)),
        fiber_g: Number(((existing[0]?.fiber_g || 0) + entry.fiber_g).toFixed(1)),
        sugar_g: Number(((existing[0]?.sugar_g || 0) + entry.sugar_g).toFixed(1)),
        sodium_mg: Number(((existing[0]?.sodium_mg || 0) + entry.sodium_mg).toFixed(1)),
        calcium_mg: Number(((existing[0]?.calcium_mg || 0) + entry.calcium_mg).toFixed(1)),
        iron_mg: Number(((existing[0]?.iron_mg || 0) + entry.iron_mg).toFixed(2)),
        vitamin_a_mcg: Number(((existing[0]?.vitamin_a_mcg || 0) + entry.vitamin_a_mcg).toFixed(1)),
        vitamin_c_mg: Number(((existing[0]?.vitamin_c_mg || 0) + entry.vitamin_c_mg).toFixed(1)),
        vitamin_d_mcg: Number(((existing[0]?.vitamin_d_mcg || 0) + entry.vitamin_d_mcg).toFixed(2)),
        vitamin_b12_mcg: Number(((existing[0]?.vitamin_b12_mcg || 0) + entry.vitamin_b12_mcg).toFixed(2)),
        potassium_mg: Number(((existing[0]?.potassium_mg || 0) + entry.potassium_mg).toFixed(1)),
        magnesium_mg: Number(((existing[0]?.magnesium_mg || 0) + entry.magnesium_mg).toFixed(1)),
        zinc_mg: Number(((existing[0]?.zinc_mg || 0) + entry.zinc_mg).toFixed(2))
      };

      if (existing.length > 0) {
        await appClient.entities.DailyNutrition.update(existing[0].id, newTotals);
      } else {
        await appClient.entities.DailyNutrition.create({
          user_id: user.email,
          date: selectedDate,
          ...newTotals
        });
      }

      await syncDailyGoalCalories(user.email, entry.calories);

      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foodEntries', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['dailyNutrition', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['dailyGoal', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['dailyGoal'] });
      setShowAddDialog(false);
      setSelectedFood(null);
      setQuantity(100);
      setSearchQuery('');
    }
  });

  const deleteFoodMutation = useMutation({
    mutationFn: async (entry) => {
      await appClient.entities.FoodEntry.delete(entry.id);

      const user = await appClient.auth.me();
      const existing = await appClient.entities.DailyNutrition.filter({
        user_id: user.email,
        date: selectedDate
      });

      if (existing.length > 0) {
        await appClient.entities.DailyNutrition.update(existing[0].id, {
          calories: Math.max(0, (existing[0].calories || 0) - entry.calories),
          protein_g: Math.max(0, Number(((existing[0].protein_g || 0) - entry.protein_g).toFixed(1))),
          carbs_g: Math.max(0, Number(((existing[0].carbs_g || 0) - entry.carbs_g).toFixed(1))),
          fat_g: Math.max(0, Number(((existing[0].fat_g || 0) - entry.fat_g).toFixed(1))),
          fiber_g: Math.max(0, Number(((existing[0].fiber_g || 0) - entry.fiber_g).toFixed(1))),
          sugar_g: Math.max(0, Number(((existing[0].sugar_g || 0) - entry.sugar_g).toFixed(1))),
          sodium_mg: Math.max(0, Number(((existing[0].sodium_mg || 0) - entry.sodium_mg).toFixed(1))),
          calcium_mg: Math.max(0, Number(((existing[0].calcium_mg || 0) - entry.calcium_mg).toFixed(1))),
          iron_mg: Math.max(0, Number(((existing[0].iron_mg || 0) - entry.iron_mg).toFixed(2))),
          vitamin_a_mcg: Math.max(0, Number(((existing[0].vitamin_a_mcg || 0) - entry.vitamin_a_mcg).toFixed(1))),
          vitamin_c_mg: Math.max(0, Number(((existing[0].vitamin_c_mg || 0) - entry.vitamin_c_mg).toFixed(1))),
          vitamin_d_mcg: Math.max(0, Number(((existing[0].vitamin_d_mcg || 0) - entry.vitamin_d_mcg).toFixed(2))),
          vitamin_b12_mcg: Math.max(0, Number(((existing[0].vitamin_b12_mcg || 0) - entry.vitamin_b12_mcg).toFixed(2))),
          potassium_mg: Math.max(0, Number(((existing[0].potassium_mg || 0) - entry.potassium_mg).toFixed(1))),
          magnesium_mg: Math.max(0, Number(((existing[0].magnesium_mg || 0) - entry.magnesium_mg).toFixed(1))),
          zinc_mg: Math.max(0, Number(((existing[0].zinc_mg || 0) - entry.zinc_mg).toFixed(2)))
        });
      }

      await syncDailyGoalCalories(user.email, -entry.calories);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foodEntries', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['dailyNutrition', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['dailyGoal', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['dailyGoal'] });
    }
  });

  const rdi = {
    protein_g: 50,
    carbs_g: 300,
    fat_g: 70,
    fiber_g: 25,
    calcium_mg: 1000,
    iron_mg: 18,
    vitamin_a_mcg: 900,
    vitamin_c_mg: 90,
    vitamin_d_mcg: 15,
    vitamin_b12_mcg: 2.4,
    potassium_mg: 3500,
    magnesium_mg: 400,
    zinc_mg: 11
  };

  const deficiencies = useMemo(() => {
    if (!dailyNutrition) return [];
    const list = [];
    Object.keys(rdi).forEach((key) => {
      const current = dailyNutrition[key] || 0;
      const target = rdi[key];
      const percentage = (current / target) * 100;
      if (percentage < 50) {
        list.push({
          nutrient: key,
          current,
          target,
          percentage: Math.round(percentage)
        });
      }
    });
    return list;
  }, [dailyNutrition, rdi]);

  const macrosData = [
    { name: 'Proteína', value: dailyNutrition?.protein_g || 0, color: '#ef4444' },
    { name: 'Carboidratos', value: dailyNutrition?.carbs_g || 0, color: '#3b82f6' },
    { name: 'Gordura', value: dailyNutrition?.fat_g || 0, color: '#f59e0b' }
  ];

  const vitaminsData = [
    {
      name: 'Vit A',
      value: ((dailyNutrition?.vitamin_a_mcg || 0) / rdi.vitamin_a_mcg) * 100,
      label: `${dailyNutrition?.vitamin_a_mcg || 0}/${rdi.vitamin_a_mcg} mcg`
    },
    {
      name: 'Vit C',
      value: ((dailyNutrition?.vitamin_c_mg || 0) / rdi.vitamin_c_mg) * 100,
      label: `${dailyNutrition?.vitamin_c_mg || 0}/${rdi.vitamin_c_mg} mg`
    },
    {
      name: 'Vit D',
      value: ((dailyNutrition?.vitamin_d_mcg || 0) / rdi.vitamin_d_mcg) * 100,
      label: `${dailyNutrition?.vitamin_d_mcg || 0}/${rdi.vitamin_d_mcg} mcg`
    },
    {
      name: 'B12',
      value: ((dailyNutrition?.vitamin_b12_mcg || 0) / rdi.vitamin_b12_mcg) * 100,
      label: `${dailyNutrition?.vitamin_b12_mcg || 0}/${rdi.vitamin_b12_mcg} mcg`
    }
  ];

  const mineralsData = [
    {
      name: 'Calcio',
      value: ((dailyNutrition?.calcium_mg || 0) / rdi.calcium_mg) * 100,
      label: `${dailyNutrition?.calcium_mg || 0}/${rdi.calcium_mg} mg`
    },
    {
      name: 'Ferro',
      value: ((dailyNutrition?.iron_mg || 0) / rdi.iron_mg) * 100,
      label: `${dailyNutrition?.iron_mg || 0}/${rdi.iron_mg} mg`
    },
    {
      name: 'Potassio',
      value: ((dailyNutrition?.potassium_mg || 0) / rdi.potassium_mg) * 100,
      label: `${dailyNutrition?.potassium_mg || 0}/${rdi.potassium_mg} mg`
    },
    {
      name: 'Magnesio',
      value: ((dailyNutrition?.magnesium_mg || 0) / rdi.magnesium_mg) * 100,
      label: `${dailyNutrition?.magnesium_mg || 0}/${rdi.magnesium_mg} mg`
    },
    {
      name: 'Zinco',
      value: ((dailyNutrition?.zinc_mg || 0) / rdi.zinc_mg) * 100,
      label: `${dailyNutrition?.zinc_mg || 0}/${rdi.zinc_mg} mg`
    }
  ];

  const mealIcons = {
    breakfast: Coffee,
    lunch: UtensilsCrossed,
    dinner: Moon,
    snack: Cookie
  };

  const mealLabels = {
    breakfast: 'Cafe da manha',
    lunch: 'Almoco',
    dinner: 'Jantar',
    snack: 'Lanche'
  };

  const groupedEntries = {
    breakfast: foodEntries.filter((entry) => entry.meal_type === 'breakfast'),
    lunch: foodEntries.filter((entry) => entry.meal_type === 'lunch'),
    dinner: foodEntries.filter((entry) => entry.meal_type === 'dinner'),
    snack: foodEntries.filter((entry) => entry.meal_type === 'snack')
  };

  return (
    <div className="app-shell">
      <div className="module-header">
        <div className="app-page !py-8 md:!py-10">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Apple size={30} />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white">Nutrição detalhada</h1>
                  <p className="text-emerald-50/90 text-sm">Rastreie macro e micronutrientes com cards unificados</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setShowAddDialog(true)}
                className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold"
              >
                <Plus size={18} className="mr-2" />
                Adicionar alimento
              </Button>
            </div>

            <label htmlFor="nutrition-date" className="sr-only">Data da análise nutricional</label>
            <Input
              id="nutrition-date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-56 bg-white/20 border-white/35 text-white placeholder:text-emerald-100/80"
            />
          </motion.div>
        </div>
      </div>

      <div className="app-page">
        {deficiencies.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="saas-gamified-banner p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={20} />
              <h3 className="font-bold text-base">Alertas de deficiência</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {deficiencies.map((deficiency) => (
                <div key={deficiency.nutrient} className="saas-panel-soft p-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[var(--app-ink)]">
                    {deficiency.nutrient.replaceAll('_', ' ')}
                  </span>
                  <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                    {deficiency.percentage}% do recomendado
                  </span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="saas-panel p-6"
        >
          <div className="grid md:grid-cols-4 gap-5 items-center">
            <div className="md:border-r md:border-[var(--app-line)] md:pr-4">
              <p className="text-sm text-[var(--app-subtle)] mb-1">Calorias</p>
              <p className="metric-value">{dailyNutrition?.calories || 0}</p>
              <p className="text-xs text-[var(--app-subtle)] mt-1">kcal no dia</p>
            </div>

            {[
              { label: 'Proteína', value: dailyNutrition?.protein_g || 0, target: rdi.protein_g, tone: 'from-red-400 to-rose-500' },
              { label: 'Carboidratos', value: dailyNutrition?.carbs_g || 0, target: rdi.carbs_g, tone: 'from-blue-400 to-indigo-500' },
              { label: 'Gorduras', value: dailyNutrition?.fat_g || 0, target: rdi.fat_g, tone: 'from-amber-400 to-orange-500' }
            ].map((macro) => {
              const percent = Math.min(100, Math.round((macro.value / macro.target) * 100));
              return (
                <div key={macro.label}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-[var(--app-ink)]">{macro.label}</p>
                    <p className="text-xs text-[var(--app-subtle)]">{macro.value}g • {percent}%</p>
                  </div>
                  <div className="saas-progress-track">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${macro.tone}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="saas-panel p-6"
          >
            <h3 className="text-lg font-bold text-[var(--app-ink)] mb-4">Distribuição de macronutrientes</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={macrosData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}g`}
                  outerRadius={84}
                  dataKey="value"
                >
                  {macrosData.map((entry, index) => (
                    <Cell key={`macro-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid var(--app-line)',
                    boxShadow: 'var(--app-shadow-1)',
                    backgroundColor: 'var(--app-surface)',
                    color: 'var(--app-ink)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="saas-panel p-6"
          >
            <h3 className="text-lg font-bold text-[var(--app-ink)] mb-4">Vitaminas (% RDI)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={vitaminsData}>
                <CartesianGrid strokeDasharray="2 6" stroke="#d8e3ec" />
                <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip
                  content={({ payload }) => {
                    if (payload && payload[0]) {
                      return (
                        <div className="saas-panel-soft px-3 py-2">
                          <p className="text-sm font-semibold text-[var(--app-ink)]">{payload[0].payload.label}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.section>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="saas-panel p-6"
        >
          <h3 className="text-lg font-bold text-[var(--app-ink)] mb-4">Minerais (% RDI)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={mineralsData}>
              <CartesianGrid strokeDasharray="2 6" stroke="#d8e3ec" />
              <XAxis dataKey="name" style={{ fontSize: '12px' }} />
              <YAxis style={{ fontSize: '12px' }} />
              <Tooltip
                content={({ payload }) => {
                  if (payload && payload[0]) {
                    return (
                      <div className="saas-panel-soft px-3 py-2">
                        <p className="text-sm font-semibold text-[var(--app-ink)]">{payload[0].payload.label}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.section>

        <section className="space-y-4">
          {Object.entries(groupedEntries).map(([meal, entries]) => {
            const MealIcon = mealIcons[meal];
            return (
              <motion.article
                key={meal}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="saas-panel p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <MealIcon className="text-emerald-600 dark:text-emerald-300" size={19} />
                  <h3 className="text-lg font-bold text-[var(--app-ink)]">{mealLabels[meal]}</h3>
                  <span className="text-sm text-[var(--app-subtle)]">
                    ({entries.reduce((sum, entry) => sum + entry.calories, 0)} kcal)
                  </span>
                </div>

                {entries.length === 0 ? (
                  <p className="text-sm text-[var(--app-subtle)] italic">Nenhum alimento registrado</p>
                ) : (
                  <div className="space-y-2">
                    {entries.map((entry) => (
                      <div key={entry.id} className="saas-panel-soft p-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[var(--app-ink)] truncate">{entry.food_name}</p>
                          <p className="text-xs text-[var(--app-subtle)]">
                            {entry.quantity_grams}g • {entry.calories} kcal • P: {entry.protein_g}g C: {entry.carbs_g}g G: {entry.fat_g}g
                          </p>
                        </div>
                        <Button
                          size="sm"
                          type="button"
                          variant="ghost"
                          onClick={() => deleteFoodMutation.mutate(entry)}
                          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-500/20"
                          aria-label={`Remover ${entry.food_name}`}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.article>
            );
          })}
        </section>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[var(--app-surface)] border-[var(--app-line)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--app-ink)]">Adicionar alimento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!selectedFood ? (
              <>
                <div className="relative">
                  <label htmlFor="food-search" className="sr-only">Buscar alimento</label>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-subtle)]" size={18} />
                  <Input
                    id="food-search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar alimento..."
                    className="pl-10 border-[var(--app-line)]"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {foodDatabase.map((food) => (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => setSelectedFood(food)}
                      className="w-full p-4 saas-panel-soft text-left transition-colors hover:brightness-95"
                    >
                      <p className="font-semibold text-[var(--app-ink)]">{food.name}</p>
                      <p className="text-sm text-[var(--app-subtle)]">
                        {food.calories_per_100g} kcal/100g • P: {food.protein_g}g C: {food.carbs_g}g G: {food.fat_g}g
                      </p>
                    </button>
                  ))}
                  {searchQuery.length >= 2 && foodDatabase.length === 0 && (
                    <p className="text-sm text-[var(--app-subtle)]">Nenhum alimento encontrado.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="saas-panel-soft p-4">
                  <p className="font-bold text-lg text-[var(--app-ink)] mb-1">{selectedFood.name}</p>
                  <p className="text-sm text-[var(--app-subtle)]">
                    Por 100g: {selectedFood.calories_per_100g} kcal
                  </p>
                </div>

                <div>
                  <label htmlFor="food-quantity" className="text-sm font-medium text-[var(--app-subtle)] mb-2 block">
                    Quantidade (gramas)
                  </label>
                  <Input
                    id="food-quantity"
                    type="number"
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                    min="1"
                  />
                </div>

                <div>
                  <label htmlFor="food-meal" className="text-sm font-medium text-[var(--app-subtle)] mb-2 block">
                    Refeição
                  </label>
                  <select
                    id="food-meal"
                    value={mealType}
                    onChange={(event) => setMealType(event.target.value)}
                    className="w-full px-3 py-2 border border-[var(--app-line)] rounded-lg bg-[var(--app-surface)] text-[var(--app-ink)]"
                  >
                    <option value="breakfast">Cafe da manha</option>
                    <option value="lunch">Almoco</option>
                    <option value="dinner">Jantar</option>
                    <option value="snack">Lanche</option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedFood(null);
                      setQuantity(100);
                    }}
                    className="flex-1 border-[var(--app-line)]"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => addFoodMutation.mutate({ food: selectedFood, qty: quantity, meal: mealType })}
                    disabled={addFoodMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95"
                  >
                    {addFoodMutation.isPending ? 'Adicionando...' : 'Adicionar'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
