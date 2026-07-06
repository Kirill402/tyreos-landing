import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { BookingRepo, ServiceRow } from './tools.ts';
import type { BookingInterval } from './availability.ts';

// Live BookingRepo backed by Supabase, using the service-role client (bypasses RLS).
// Only 'booked' bookings occupy a bay, so availability queries filter on status='booked'.
export function createSupabaseRepo(sb: SupabaseClient): BookingRepo {
  return {
    async listServices(): Promise<ServiceRow[]> {
      const { data, error } = await sb.from('services').select('id,name,duration_min,price').order('sort_order');
      if (error) throw error;
      return (data ?? []) as ServiceRow[];
    },

    async getServiceById(id: string): Promise<ServiceRow | null> {
      const { data, error } = await sb.from('services').select('id,name,duration_min,price').eq('id', id).maybeSingle();
      if (error) throw error;
      return (data as ServiceRow) ?? null;
    },

    async getBookingsForRange(fromUtc: Date, toUtc: Date): Promise<BookingInterval[]> {
      const { data, error } = await sb
        .from('bookings')
        .select('start_at,end_at')
        .eq('status', 'booked')
        .lt('start_at', toUtc.toISOString())
        .gt('end_at', fromUtc.toISOString());
      if (error) throw error;
      return (data ?? []).map((b: any) => ({ startAt: new Date(b.start_at), endAt: new Date(b.end_at) }));
    },

    async upsertClientByPhone(name: string, phone: string): Promise<string> {
      const { data: existing, error: selErr } = await sb.from('clients').select('id').eq('phone', phone).maybeSingle();
      if (selErr) throw selErr;
      if (existing) return (existing as any).id;
      const { data, error } = await sb.from('clients').insert({ name, phone }).select('id').single();
      if (error) throw error;
      return (data as any).id;
    },

    async createBooking(input): Promise<string> {
      const { data, error } = await sb
        .from('bookings')
        .insert({
          client_id: input.clientId,
          service_id: input.serviceId,
          start_at: input.startAt.toISOString(),
          end_at: input.endAt.toISOString(),
          status: 'booked',
          source: 'ai_chat',
        })
        .select('id')
        .single();
      if (error) throw error;
      return (data as any).id;
    },
  };
}
