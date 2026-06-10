import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Play, Dumbbell, Heart, Activity } from 'lucide-react';

export default function ExerciseCatalog() {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMuscle, setSelectedMuscle] = useState('all');
  const [selectedExercise, setSelectedExercise] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await appClient.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: exercises } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const user = await appClient.auth.me();
      const allExercises = await appClient.entities.Exercise.list();
      return allExercises.filter(
        (exercise) =>
          !exercise.personalized_for_user || exercise.personalized_for_user === user.email
      );
    },
    enabled: !!currentUser,
    initialData: []
  });

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = searchQuery === '' || 
      ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || ex.category === selectedCategory;
    const matchesMuscle = selectedMuscle === 'all' || ex.muscle_group === selectedMuscle;
    return matchesSearch && matchesCategory && matchesMuscle;
  });

  const difficultyColors = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-orange-100 text-orange-700',
    advanced: 'bg-red-100 text-red-700'
  };

  const difficultyLabels = {
    beginner: 'Iniciante',
    intermediate: 'Intermediário',
    advanced: 'Avançado'
  };

  const categoryIcons = {
    strength: Dumbbell,
    cardio: Heart,
    flexibility: Activity,
    balance: Activity,
    hiit: Activity
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/20 pb-20 md:pb-8">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold mb-2">Catálogo de Exercícios</h1>
            <p className="text-blue-100">Biblioteca completa com demonstrações</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar exercício..."
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas Categorias</option>
              <option value="strength">Força</option>
              <option value="cardio">Cardio</option>
              <option value="flexibility">Flexibilidade</option>
              <option value="balance">Equilíbrio</option>
              <option value="hiit">HIIT</option>
            </select>
            <select
              value={selectedMuscle}
              onChange={(e) => setSelectedMuscle(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos Músculos</option>
              <option value="chest">Peito</option>
              <option value="back">Costas</option>
              <option value="shoulders">Ombros</option>
              <option value="arms">Braços</option>
              <option value="legs">Pernas</option>
              <option value="core">Core</option>
              <option value="full_body">Corpo Inteiro</option>
            </select>
          </div>
        </div>

        {/* Exercise Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {filteredExercises.map((exercise, idx) => {
            const Icon = categoryIcons[exercise.category] || Dumbbell;
            return (
              <motion.div
                key={exercise.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setSelectedExercise(exercise)}
                className="bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-all"
              >
                <div className="relative h-48 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  {exercise.thumbnail_url ? (
                    <img src={exercise.thumbnail_url} alt={exercise.name} className="w-full h-full object-cover" />
                  ) : (
                    <Icon className="text-white" size={64} />
                  )}
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyColors[exercise.difficulty]}`}>
                      {difficultyLabels[exercise.difficulty]}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">{exercise.name}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{exercise.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 capitalize">{exercise.muscle_group}</span>
                    <Play className="text-blue-500" size={20} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredExercises.length === 0 && (
          <div className="text-center py-20">
            <Search className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-500">Nenhum exercício encontrado</p>
          </div>
        )}
      </div>

      {/* Exercise Detail Dialog */}
      <Dialog open={!!selectedExercise} onOpenChange={() => setSelectedExercise(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedExercise && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedExercise.name}</DialogTitle>
              </DialogHeader>

              {selectedExercise.video_url && (
                <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden">
                  <iframe
                    src={selectedExercise.video_url}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              )}

              <div className="space-y-4">
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyColors[selectedExercise.difficulty]}`}>
                    {difficultyLabels[selectedExercise.difficulty]}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                    {selectedExercise.category}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 capitalize">
                    {selectedExercise.muscle_group}
                  </span>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Descrição</h4>
                  <p className="text-gray-600">{selectedExercise.description}</p>
                </div>

                {selectedExercise.equipment && selectedExercise.equipment.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Equipamento</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedExercise.equipment.map((eq, i) => (
                        <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                          {eq}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedExercise.instructions && selectedExercise.instructions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Instruções</h4>
                    <ol className="space-y-2">
                      {selectedExercise.instructions.map((instruction, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {i + 1}
                          </span>
                          <span className="text-gray-600">{instruction}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {selectedExercise.calories_per_minute && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <p className="text-sm text-orange-800">
                      x Aproximadamente <strong>{selectedExercise.calories_per_minute} calorias/minuto</strong>
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
