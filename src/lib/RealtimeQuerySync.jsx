import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { hasSupabase, supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

export default function RealtimeQuerySync() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!hasSupabase || !supabase || !isAuthenticated) {
      return undefined;
    }

    const channel = supabase
      .channel(`health-app-realtime-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        () => {
          queryClient.invalidateQueries();
        }
      );

    channel.subscribe((status) => {
      if (import.meta.env.DEV && status === 'CHANNEL_ERROR') {
        console.warn('Supabase realtime channel failed');
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAuthenticated, queryClient]);

  return null;
}
