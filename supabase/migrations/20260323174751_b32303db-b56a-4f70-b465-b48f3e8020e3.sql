
-- Novas colunas na tabela tickets conforme especificação
ALTER TABLE public.tickets 
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS order_id text,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS extracted_code text;

-- Tabela ticket_hashes para anti-duplicidade
CREATE TABLE IF NOT EXISTS public.ticket_hashes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hash text UNIQUE NOT NULL,
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: somente service_role pode acessar (nunca exposto ao frontend)
ALTER TABLE public.ticket_hashes ENABLE ROW LEVEL SECURITY;

-- Tabela buyer_access para tokens temporários
CREATE TABLE IF NOT EXISTS public.buyer_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  buyer_id uuid NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  invalidated_at timestamptz
);

ALTER TABLE public.buyer_access ENABLE ROW LEVEL SECURITY;

-- RLS: comprador só vê seus próprios registros
CREATE POLICY "Buyers can view own access" ON public.buyer_access
  FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id);

-- Criar bucket privado para custódia de ingressos
INSERT INTO storage.buckets (id, name, public)
VALUES ('tickets-custody', 'tickets-custody', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: apenas service_role pode manipular (via edge functions)
CREATE POLICY "Service role only upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tickets-custody' AND auth.uid() IS NOT NULL);

CREATE POLICY "Service role only read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'tickets-custody' AND auth.uid() IS NOT NULL);
