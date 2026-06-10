
-- Tenants: campos WhatsApp Gratuito
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS wa_free_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wa_free_confirm_template text NOT NULL DEFAULT 'Olá {cliente}! Seu agendamento de *{servico}* foi confirmado para *{data} às {hora}* com {profissional}. Qualquer dúvida estamos à disposição. — {negocio}',
  ADD COLUMN IF NOT EXISTS wa_free_reminder_template text NOT NULL DEFAULT 'Oi {cliente}! Passando para lembrar do seu horário hoje às *{hora}* ({servico}) com {profissional}. Te esperamos! — {negocio}',
  ADD COLUMN IF NOT EXISTS wa_free_reminder_minutes_before integer NOT NULL DEFAULT 40;

-- Bookings: marcar quando lembrete já foi gerado
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS wa_free_reminder_sent_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_wa_free_reminder
  ON public.bookings (tenant_id, date, time)
  WHERE wa_free_reminder_sent_at IS NULL AND status = 'confirmed';
