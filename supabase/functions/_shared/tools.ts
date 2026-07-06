import { getAvailableSlots, type BookingInterval } from './availability.ts';
import { shopDayRangeUtc, shopLocalDateStr } from './datetime.ts';
import type { ToolSchema } from './llm.ts';

export interface ServiceRow {
  id: string;
  name: string;
  duration_min: number;
  price: number;
}

export interface BookingRepo {
  listServices(): Promise<ServiceRow[]>;
  getServiceById(id: string): Promise<ServiceRow | null>;
  getBookingsForRange(fromUtc: Date, toUtc: Date): Promise<BookingInterval[]>;
  upsertClientByPhone(name: string, phone: string): Promise<string>;
  createBooking(input: { clientId: string; serviceId: string; startAt: Date; endAt: Date }): Promise<string>;
}

export const TOOL_SCHEMAS: ToolSchema[] = [
  {
    type: 'function',
    function: {
      name: 'list_services',
      description: 'Вернуть список услуг шиномонтажа с ценами и длительностью.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_available_slots',
      description: 'Вернуть свободные слоты на выбранную дату для выбранной услуги.',
      parameters: {
        type: 'object',
        properties: {
          service_id: { type: 'string', description: 'id услуги из list_services' },
          date: { type: 'string', description: 'дата в формате YYYY-MM-DD' },
        },
        required: ['service_id', 'date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_booking',
      description:
        'Создать запись клиента на слот. Вызывать только после того, как клиент подтвердил имя, телефон, услугу и время.',
      parameters: {
        type: 'object',
        properties: {
          client_name: { type: 'string' },
          phone: { type: 'string' },
          service_id: { type: 'string' },
          start_at: { type: 'string', description: 'ISO-8601 время начала (значение start_at из get_available_slots)' },
        },
        required: ['client_name', 'phone', 'service_id', 'start_at'],
      },
    },
  },
];

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export async function runTool(name: string, argsJson: string, repo: BookingRepo): Promise<ToolResult> {
  let args: any = {};
  try {
    args = argsJson ? JSON.parse(argsJson) : {};
  } catch {
    return { ok: false, error: 'invalid_arguments_json' };
  }

  switch (name) {
    case 'list_services': {
      const services = await repo.listServices();
      return {
        ok: true,
        data: services.map((s) => ({ id: s.id, name: s.name, duration_min: s.duration_min, price: s.price })),
      };
    }

    case 'get_available_slots': {
      const svc = await repo.getServiceById(String(args.service_id ?? ''));
      if (!svc) return { ok: false, error: 'service_not_found' };
      const { fromUtc, toUtc } = shopDayRangeUtc(String(args.date));
      const bookings = await repo.getBookingsForRange(fromUtc, toUtc);
      const slots = getAvailableSlots(String(args.date), svc.duration_min, bookings);
      return {
        ok: true,
        data: {
          date: args.date,
          service: svc.name,
          slots: slots.map((s) => ({ start_at: s.startAt.toISOString(), label: s.label })),
        },
      };
    }

    case 'create_booking': {
      const svc = await repo.getServiceById(String(args.service_id ?? ''));
      if (!svc) return { ok: false, error: 'service_not_found' };
      const startAt = new Date(String(args.start_at));
      if (isNaN(startAt.getTime())) return { ok: false, error: 'invalid_start_at' };
      const endAt = new Date(startAt.getTime() + svc.duration_min * 60_000);

      // Conflict re-check: confirm this exact slot is still free at booking time.
      const dateStr = shopLocalDateStr(startAt);
      const { fromUtc, toUtc } = shopDayRangeUtc(dateStr);
      const bookings = await repo.getBookingsForRange(fromUtc, toUtc);
      const stillFree = getAvailableSlots(dateStr, svc.duration_min, bookings).some(
        (s) => s.startAt.getTime() === startAt.getTime(),
      );
      if (!stillFree) return { ok: false, error: 'slot_taken' };

      const clientId = await repo.upsertClientByPhone(String(args.client_name ?? ''), String(args.phone ?? ''));
      const bookingId = await repo.createBooking({ clientId, serviceId: svc.id, startAt, endAt });
      return { ok: true, data: { booking_id: bookingId, service: svc.name, start_at: startAt.toISOString() } };
    }

    default:
      return { ok: false, error: 'unknown_tool' };
  }
}
