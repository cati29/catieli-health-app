import React from 'react';
import { motion } from 'framer-motion';
import { appClient } from '@/api/appClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';

export default function WearableConnection({ profile, onConnect }) {
  const queryClient = useQueryClient();

  const connectMutation = useMutation({
    mutationFn: async (deviceType) => {
      // Simulate connection and data sync
      const user = await appClient.auth.me();
      
      // Update profile with wearable info
      await appClient.entities.UserProfile.update(profile.id, {
        wearable_data: {
          connected: true,
          device_type: deviceType,
          last_sync: new Date().toISOString()
        }
      });

      // Create sample health data for last 7 days
      const today = new Date();
      const healthDataPromises = [];
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Check if data already exists
        const existing = await appClient.entities.HealthData.filter({
          user_id: user.email,
          date: dateStr
        });

        if (existing.length === 0) {
          healthDataPromises.push(
            appClient.entities.HealthData.create({
              user_id: user.email,
              date: dateStr,
              steps: Math.floor(Math.random() * 5000) + 5000,
              distance_km: Number((Math.random() * 5 + 3).toFixed(2)),
              calories_burned: Math.floor(Math.random() * 300) + 200,
              heart_rate_avg: Math.floor(Math.random() * 20) + 70,
              heart_rate_min: Math.floor(Math.random() * 10) + 55,
              heart_rate_max: Math.floor(Math.random() * 30) + 120,
              sleep_hours: Number((Math.random() * 3 + 6).toFixed(1)),
              sleep_quality: ['poor', 'fair', 'good', 'excellent'][Math.floor(Math.random() * 4)],
              active_minutes: Math.floor(Math.random() * 60) + 30,
              floors_climbed: Math.floor(Math.random() * 10) + 5,
              source: deviceType.toLowerCase().replace(' ', '_')
            })
          );
        }
      }

      await Promise.all(healthDataPromises);
      
      if (onConnect) onConnect(deviceType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['healthData'] });
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: () => appClient.entities.UserProfile.update(profile.id, {
      wearable_data: { connected: false }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    }
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const user = await appClient.auth.me();
      const today = new Date().toISOString().split('T')[0];
      
      // Create/update today's data
      const existing = await appClient.entities.HealthData.filter({
        user_id: user.email,
        date: today
      });

      if (existing.length > 0) {
        await appClient.entities.HealthData.update(existing[0].id, {
          steps: Math.floor(Math.random() * 5000) + 5000,
          distance_km: Number((Math.random() * 5 + 3).toFixed(2)),
          calories_burned: Math.floor(Math.random() * 300) + 200,
          heart_rate_avg: Math.floor(Math.random() * 20) + 70,
          active_minutes: Math.floor(Math.random() * 60) + 30
        });
      } else {
        await appClient.entities.HealthData.create({
          user_id: user.email,
          date: today,
          steps: Math.floor(Math.random() * 5000) + 5000,
          distance_km: Number((Math.random() * 5 + 3).toFixed(2)),
          calories_burned: Math.floor(Math.random() * 300) + 200,
          heart_rate_avg: Math.floor(Math.random() * 20) + 70,
          heart_rate_min: Math.floor(Math.random() * 10) + 55,
          heart_rate_max: Math.floor(Math.random() * 30) + 120,
          sleep_hours: Number((Math.random() * 3 + 6).toFixed(1)),
          sleep_quality: ['fair', 'good', 'excellent'][Math.floor(Math.random() * 3)],
          active_minutes: Math.floor(Math.random() * 60) + 30,
          floors_climbed: Math.floor(Math.random() * 10) + 5,
          source: profile.wearable_data?.device_type?.toLowerCase().replace(' ', '_') || 'manual'
        });
      }

      await appClient.entities.UserProfile.update(profile.id, {
        wearable_data: {
          ...(profile.wearable_data || {}),
          last_sync: new Date().toISOString()
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['healthData'] });
    }
  });

  const devices = [
    { name: 'Apple Health', short: 'AH', color: 'from-gray-700 to-gray-900' },
    { name: 'Google Fit', short: 'GF', color: 'from-blue-500 to-blue-700' },
    { name: 'Fitbit', short: 'FB', color: 'from-teal-500 to-teal-700' },
    { name: 'Garmin', short: 'GA', color: 'from-blue-600 to-indigo-700' },
    { name: 'Samsung Health', short: 'SH', color: 'from-blue-400 to-blue-600' },
    { name: 'Xiaomi Mi Fit', short: 'XM', color: 'from-orange-500 to-red-600' }
  ];

  if (profile?.wearable_data?.connected) {
    const device = devices.find(d => d.name === profile.wearable_data.device_type);
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-2xl">
              {device?.short || 'WT'}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{profile.wearable_data.device_type}</p>
              <p className="text-xs text-gray-500">
                Última sinc: {new Date(profile.wearable_data.last_sync).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            <Check size={14} />
            Conectado
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex-1 bg-blue-500 hover:bg-blue-600"
          >
            {syncMutation.isPending ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              'Sincronizar Agora'
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => disconnectMutation.mutate()}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            Desconectar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 mb-3">
        Conecte seu dispositivo para sincronizar dados automaticamente
      </p>
      <div className="grid grid-cols-2 gap-3">
        {devices.map((device) => (
          <motion.button
            key={device.name}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => connectMutation.mutate(device.name)}
            disabled={connectMutation.isPending}
            className={`p-3 rounded-xl bg-gradient-to-r ${device.color} text-white text-left transition-all hover:shadow-lg disabled:opacity-50`}
          >
            <div className="text-2xl mb-1">{device.short}</div>
            <p className="text-sm font-medium">{device.name}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
