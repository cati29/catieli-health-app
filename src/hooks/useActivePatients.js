import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';

/**
 * Lista os pacientes (atletas) com conversa ACEITA pela nutricionista logada.
 * Fonte unica de verdade do vinculo nutricionista->paciente.
 */
export function useActivePatients(enabled = true) {
  return useQuery({
    queryKey: ['activePatients'],
    enabled,
    initialData: [],
    queryFn: async () => {
      const me = await appClient.auth.me();
      const accepted = await appClient.entities.Conversation.filter({
        nutritionist_id: me.email,
        status: 'accepted'
      });
      const emails = Array.from(new Set(accepted.map((c) => c.user_id).filter(Boolean)));
      if (emails.length === 0) return [];
      const profiles = await appClient.entities.UserProfile.filter({
        created_by: emails
      });
      return profiles;
    }
  });
}

/**
 * Lista os pedidos pendentes (conversas em status pending) destinados a nutri.
 */
export function usePendingPatientRequests(enabled = true) {
  return useQuery({
    queryKey: ['pendingPatientRequests'],
    enabled,
    initialData: [],
    queryFn: async () => {
      const me = await appClient.auth.me();
      const pending = await appClient.entities.Conversation.filter({
        nutritionist_id: me.email,
        status: 'pending'
      });
      if (pending.length === 0) return [];
      const emails = Array.from(new Set(pending.map((c) => c.user_id).filter(Boolean)));
      const profiles = emails.length
        ? await appClient.entities.UserProfile.filter({ created_by: emails })
        : [];
      const profileByEmail = new Map(profiles.map((p) => [p.email || p.created_by, p]));
      return pending.map((conv) => ({
        conversation: conv,
        patient: profileByEmail.get(conv.user_id) || null
      }));
    }
  });
}
