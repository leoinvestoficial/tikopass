-- ============================================================
-- 1. TICKETEIRA CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ticketeira_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  display_name text NOT NULL,
  transfer_level text NOT NULL CHECK (transfer_level IN ('verde','amarelo','laranja')),
  transfer_type text NOT NULL CHECK (transfer_type IN ('digital_native','pdf_custody','unique_transfer')),
  release_rule text NOT NULL CHECK (release_rule IN ('immediate','48h_buffer','post_event_24h')),
  requires_buyer_account boolean DEFAULT false,
  max_transfer_hours_before_event integer,
  ocr_patterns jsonb NOT NULL DEFAULT '{}'::jsonb,
  buyer_message_before text NOT NULL,
  buyer_message_after text NOT NULL,
  seller_instructions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticketeira_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticketeira config is public"
ON public.ticketeira_config FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage ticketeira config"
ON public.ticketeira_config FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 2. NOVAS COLUNAS EM TICKETS
-- ============================================================
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS detected_ticketeira text,
  ADD COLUMN IF NOT EXISTS transfer_level text DEFAULT 'amarelo',
  ADD COLUMN IF NOT EXISTS transfer_status text DEFAULT 'pending'
    CHECK (transfer_status IN ('pending','seller_notified','transfer_sent','buyer_confirmed','disputed','released')),
  ADD COLUMN IF NOT EXISTS transfer_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS transfer_proof_url text,
  ADD COLUMN IF NOT EXISTS buyer_email_for_transfer text;

-- ============================================================
-- 3. ORDERS (vinculada a negotiations)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id uuid NOT NULL REFERENCES public.negotiations(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','transferred','completed','refunded','disputed')),
  payment_released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(negotiation_id)
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_ticket ON public.orders(ticket_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view own orders"
ON public.orders FOR SELECT TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Admins can view all orders"
ON public.orders FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = ANY (ARRAY['matheus@tikopass.com','admin@tikopass.com','leonardo@bebaflow.com']));

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. TRANSFER NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transfer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL,
  recipient_type text NOT NULL CHECK (recipient_type IN ('seller','buyer')),
  channel text NOT NULL CHECK (channel IN ('push','email','in_app')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','read')),
  message_text text,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tn_recipient ON public.transfer_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_tn_order ON public.transfer_notifications(order_id);

ALTER TABLE public.transfer_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipients can view own notifications"
ON public.transfer_notifications FOR SELECT TO authenticated
USING (auth.uid() = recipient_id);

CREATE POLICY "Recipients can mark notifications as read"
ON public.transfer_notifications FOR UPDATE TO authenticated
USING (auth.uid() = recipient_id);

-- ============================================================
-- 5. TRANSFER STATUS LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transfer_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  changed_by text,
  changed_by_user uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tsl_order ON public.transfer_status_log(order_id);

ALTER TABLE public.transfer_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view own status log"
ON public.transfer_status_log FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = transfer_status_log.order_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
  )
);

CREATE POLICY "Admins can view all status logs"
ON public.transfer_status_log FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = ANY (ARRAY['matheus@tikopass.com','admin@tikopass.com','leonardo@bebaflow.com']));

-- ============================================================
-- 6. SEED: 10 TICKETEIRAS
-- ============================================================
INSERT INTO public.ticketeira_config
(slug, display_name, transfer_level, transfer_type, release_rule, requires_buyer_account, max_transfer_hours_before_event, ocr_patterns, buyer_message_before, buyer_message_after, seller_instructions)
VALUES
-- TICKET MAKER
('ticket_maker','Ticket Maker','laranja','unique_transfer','48h_buffer',true,48,
 '{"urls":["vendas.ticketmaker.com.br","ticketmaker.com.br"],"keywords":["Ticket Maker","TICKET MAKER","ticketmaker"],"metadata_hints":["ticketmaker"]}'::jsonb,
 'Seu ingresso é da Ticket Maker. Após a compra confirmada, o vendedor irá transferir o ingresso diretamente para o seu e-mail no site da Ticket Maker. Você precisa ter uma conta na Ticket Maker com o mesmo e-mail cadastrado aqui. Assim que o vendedor realizar a transferência e você confirmar o recebimento, o pagamento será liberado após 48 horas — prazo de segurança para garantir que tudo funcionou corretamente.',
 'O vendedor realizou a transferência do ingresso na Ticket Maker. Verifique seu e-mail (incluindo spam) e acesse o app ou site da Ticket Maker com o e-mail {buyer_email}. Confirme aqui quando o ingresso estiver na sua conta.',
 '{"steps":["Acesse vendas.ticketmaker.com.br e faça login com o e-mail da sua compra","Clique em Meus Ingressos no menu superior","Localize o ingresso do evento {event_name}","Clique em Transferir ou Alterar Titularidade","Insira o e-mail do comprador: {buyer_email}","Confirme — o ingresso original será invalidado automaticamente","Volte aqui e clique em Marquei como transferido"],"warning":"Atenção: a transferência na Ticket Maker só pode ser feita UMA VEZ e não pode ser revertida. Confirme o e-mail correto antes de prosseguir.","deadline_warning":"Prazo máximo: até 48 horas úteis antes do evento ({event_date})","support":"Problemas técnicos? Contate a Ticket Maker: atendimento@ticketmaker.com.br"}'::jsonb),
-- SYMPLA
('sympla','Sympla','verde','digital_native','immediate',false,24,
 '{"urls":["sympla.com.br","app.sympla.com.br"],"keywords":["Sympla","SYMPLA","participante"],"metadata_hints":["sympla"]}'::jsonb,
 'Seu ingresso é da Sympla. Após a compra confirmada, o vendedor irá alterar os dados do participante no site da Sympla para o seu nome e e-mail. O QR Code antigo é cancelado automaticamente e você receberá um novo ingresso. Assim que você confirmar o recebimento aqui, o pagamento ao vendedor é liberado imediatamente — sem precisar esperar o evento.',
 'O vendedor atualizou os dados do participante na Sympla. Você deve receber o ingresso no e-mail {buyer_email}. Acesse sympla.com.br > Meus Ingressos para confirmar. Clique em Confirmar recebimento abaixo quando o ingresso aparecer.',
 '{"steps":["Acesse sympla.com.br e faça login com o e-mail da sua compra","Clique em Meus Ingressos no menu superior","Encontre o ingresso de {event_name}","Clique em Transferir ingresso > Editar participante","Substitua seus dados pelos do comprador — Nome: {buyer_name}, E-mail: {buyer_email}","Clique em Salvar mudanças e confirme","O QR Code anterior é cancelado automaticamente","Volte aqui e clique em Marquei como transferido"],"warning":"A titularidade da compra continua no seu nome — apenas o participante muda. Não é necessário que o comprador tenha conta na Sympla.","deadline_warning":"Prazo máximo: até 24 horas antes do evento ({event_date})"}'::jsonb),
-- TICKETMASTER
('ticketmaster','Ticketmaster (Quentro)','verde','digital_native','immediate',true,NULL,
 '{"urls":["ticketmaster.com.br","quentro.com"],"keywords":["Ticketmaster","TICKETMASTER","Quentro","SafeTix"],"metadata_hints":["ticketmaster","quentro"]}'::jsonb,
 'Seu ingresso é da Ticketmaster e a transferência é feita pelo app Quentro. Baixe o app Quentro (Android ou iOS) e crie uma conta com o e-mail {buyer_email}. Atenção: ingressos da Ticketmaster podem demorar entre 7 e 30 dias para ficarem disponíveis para transferência — isso é uma política da própria Ticketmaster e não depende do vendedor nem da Tiko Pass. Você receberá uma notificação por e-mail e aqui na plataforma assim que o ingresso for transferido.',
 'O vendedor realizou a transferência pelo app Quentro para o e-mail {buyer_email}. Abra o app Quentro, localize o ingresso de {event_name} e toque em Aceitar. O QR Code do vendedor foi automaticamente cancelado. Confirme aqui após aceitar.',
 '{"steps":["Baixe o app Quentro (Android ou iOS) se ainda não tiver","Faça login no Quentro com o e-mail da sua compra na Ticketmaster","Localize o ingresso de {event_name} no app","Toque no ingresso e selecione Transferir","Insira o e-mail do comprador: {buyer_email}","Confirme a transferência","Não é exibida tela de confirmação no Quentro — isso é normal","Volte aqui e clique em Marquei como transferido"],"warning":"O ingresso só fica disponível para transferência entre 7 e 30 dias antes do evento, conforme política da Ticketmaster. Se ainda não estiver disponível, aguarde — a Tiko Pass notificará o comprador sobre esse prazo.","deadline_warning":"A transferência pode ser feita até o momento de entrada no evento"}'::jsonb),
-- EVENTIM
('eventim','Eventim','verde','digital_native','immediate',false,NULL,
 '{"urls":["eventim.com.br"],"keywords":["Eventim","EVENTIM","TicketDirect"],"metadata_hints":["eventim"]}'::jsonb,
 'Seu ingresso é da Eventim. O vendedor irá gerar um link de transferência no site da Eventim e enviará por aqui. Clique no link usando o e-mail {buyer_email} para aceitar o ingresso. O pagamento ao vendedor é liberado assim que você confirmar.',
 'O vendedor gerou o link de transferência da Eventim. Clique no link enviado no chat, acesse com o e-mail {buyer_email} e confirme o recebimento no site da Eventim. Depois, confirme aqui também.',
 '{"steps":["Acesse eventim.com.br e faça login","Vá em Minha conta > Meus ingressos","Localize o ingresso de {event_name}","Clique em Transferir ingresso ou Gerar link de transferência","Copie o link gerado","Cole o link no chat desta ordem na Tiko Pass (o comprador receberá)","Volte aqui e clique em Marquei como transferido"],"note":"Para ingressos Eventim em formato PDF (TicketDirect): envie o arquivo PDF diretamente pelo chat desta ordem. O nível de garantia será Amarelo e o pagamento liberado 24h após o evento."}'::jsonb),
-- BILHETERIA DIGITAL
('bilheteria_digital','Bilheteria Digital','verde','digital_native','immediate',true,NULL,
 '{"urls":["bilheteriadigital.com.br"],"keywords":["Bilheteria Digital","BILHETERIA DIGITAL","e-ticket"],"metadata_hints":["bilheteriadigital"]}'::jsonb,
 'Seu ingresso é da Bilheteria Digital. Você precisará ter uma conta na Bilheteria Digital com o e-mail {buyer_email} para receber. Após a compra confirmada, o vendedor fará a transferência pelo app. Você receberá uma notificação para aceitar o ingresso. Atenção: o link de aceitação expira em 10 minutos — fique atento ao e-mail. O pagamento ao vendedor é liberado assim que você confirmar aqui.',
 'O vendedor transferiu o ingresso pelo app da Bilheteria Digital para o e-mail {buyer_email}. Abra o app > Meus Pedidos, localize {event_name} e aceite a transferência. O link expira em 10 minutos — acesse logo. Confirme aqui depois.',
 '{"steps":["Abra o app da Bilheteria Digital (iOS ou Android) — não funciona pelo site","Faça login com o e-mail da sua compra","Vá em Meus Pedidos","Selecione o ingresso de {event_name}","Toque na seta no canto inferior direito do ingresso","Insira o e-mail do comprador: {buyer_email}","Confirme — você receberá um link por e-mail","Acesse o link no seu e-mail em até 10 minutos para validar","Volte aqui e clique em Marquei como transferido"],"warning":"O link de confirmação expira em 10 minutos — se expirar, repita o processo do início. Após o comprador aceitar, a transferência não pode ser revertida."}'::jsonb),
-- INGRESSE
('ingresse','Ingresse','verde','digital_native','immediate',true,NULL,
 '{"urls":["ingresse.com","app.ingresse.com"],"keywords":["Ingresse","INGRESSE"],"metadata_hints":["ingresse"]}'::jsonb,
 'Seu ingresso é da Ingresse. Você precisará ter uma conta na Ingresse com o e-mail {buyer_email}. Se não tiver, você criará no momento de aceitar o convite — use exatamente o mesmo e-mail. O vendedor enviará o convite de transferência. O pagamento ao vendedor é liberado assim que você confirmar aqui.',
 'O vendedor enviou o ingresso pelo site da Ingresse para {buyer_email}. Verifique seu e-mail e clique em Aceitar ingresso. Se não tiver conta, crie uma com exatamente esse e-mail. Confirme aqui após aceitar.',
 '{"steps":["Acesse ingresse.com e faça login","Vá em Meus Ingressos","Localize o ingresso de {event_name}","Clique em Transferir ingresso","Insira o e-mail do comprador: {buyer_email}","Clique em Confirmar — o comprador receberá o convite por e-mail","Você pode cancelar enquanto o comprador não aceitar","Após aceito, não é possível reverter","Volte aqui e clique em Marquei como transferido"]}'::jsonb),
-- TICKET360
('ticket360','Ticket360','verde','digital_native','immediate',true,NULL,
 '{"urls":["ticket360.com.br"],"keywords":["Ticket360","TICKET360","ticket 360"],"metadata_hints":["ticket360"]}'::jsonb,
 'Seu ingresso é do Ticket360. O QR Code geralmente é liberado entre algumas horas antes e no dia do evento — isso é normal no Ticket360. O vendedor transferirá o ingresso para sua conta assim que estiver disponível. Você receberá uma notificação quando a transferência for feita.',
 'O vendedor transferiu o ingresso no Ticket360 para o e-mail {buyer_email}. Acesse o app ou site do Ticket360 e confirme o recebimento. Confirme também aqui.',
 '{"steps":["Acesse ticket360.com.br ou o app do Ticket360","Faça login (e-mail e telefone devem estar confirmados no seu cadastro)","Localize o ingresso de {event_name}","Selecione Transferir ingresso","Insira o e-mail do comprador: {buyer_email}","Confirme a transferência","Se solicitado, valide com o PIN enviado por SMS ou na fatura do cartão","Volte aqui e clique em Marquei como transferido"],"warning":"O QR Code do Ticket360 pode ser liberado apenas algumas horas antes do evento. Se ainda não estiver disponível, aguarde e repita quando liberado."}'::jsonb),
-- LIVEPASS
('livepass','Livepass','amarelo','pdf_custody','post_event_24h',false,NULL,
 '{"urls":["livepass.com.br"],"keywords":["Livepass","LIVEPASS","easyPASS","live pass"],"metadata_hints":["livepass"]}'::jsonb,
 'Seu ingresso é da Livepass em formato PDF. Este ingresso não é nominal — qualquer pessoa com o arquivo pode entrar no evento. O arquivo ficou em custódia segura na Tiko Pass desde o momento do anúncio. Você receberá o PDF para download assim que a compra for confirmada. Guarde com segurança e não compartilhe. O pagamento ao vendedor é liberado 24 horas após o evento.',
 'O arquivo PDF do seu ingresso está disponível abaixo para download. Faça o download agora e guarde em lugar seguro. Não é necessário nenhuma ação adicional — o ingresso já é seu.',
 '{"steps":["O ingresso da Livepass é um PDF que ficou em custódia na Tiko Pass desde o upload.","Nenhuma ação é necessária da sua parte — o comprador recebe o arquivo automaticamente.","O pagamento será liberado 24 horas após o evento."],"info":"Como o Livepass não possui transferência digital rastreável, o pagamento segue o protocolo de segurança pós-evento."}'::jsonb),
-- T4F
('t4f','Tickets For Fun (T4F)','amarelo','pdf_custody','post_event_24h',false,NULL,
 '{"urls":["ticketsforfun.com.br","t4f.com.br"],"keywords":["Tickets For Fun","T4F","Time for Fun","TICKETS FOR FUN"],"metadata_hints":["t4f","ticketsforfun"]}'::jsonb,
 'Seu ingresso é da Tickets For Fun (T4F). O vendedor irá enviar o QR Code ou PDF do ingresso diretamente pelo chat desta ordem. Você receberá o arquivo assim que a venda for confirmada. Se for meia-entrada, você precisará apresentar o comprovante do benefício na portaria. O pagamento ao vendedor é liberado 24 horas após o evento.',
 'O vendedor enviou o QR Code ou PDF pelo chat desta ordem. Verifique o chat, salve o arquivo e guarde com segurança. Para meia-entrada, lembre de levar o comprovante. Não compartilhe o QR Code com ninguém.',
 '{"steps":["Acesse sua conta em ticketsforfun.com.br","Localize o ingresso de {event_name}","Abra o QR Code do ingresso na tela","Tire um print NÍTIDO e legível do QR Code","Envie o print pelo chat desta ordem na Tiko Pass","OU: se tiver o PDF completo, envie o arquivo pelo chat","Volte aqui e clique em Marquei como transferido","IMPORTANTE: não cancele a compra original na T4F"],"warning":"Para ingresso de meia-entrada: avise no chat que o comprador deve apresentar comprovante do benefício na portaria. Não cancele a compra original na T4F.","info":"O pagamento será liberado 24 horas após o evento."}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  transfer_level = EXCLUDED.transfer_level,
  transfer_type = EXCLUDED.transfer_type,
  release_rule = EXCLUDED.release_rule,
  requires_buyer_account = EXCLUDED.requires_buyer_account,
  max_transfer_hours_before_event = EXCLUDED.max_transfer_hours_before_event,
  ocr_patterns = EXCLUDED.ocr_patterns,
  buyer_message_before = EXCLUDED.buyer_message_before,
  buyer_message_after = EXCLUDED.buyer_message_after,
  seller_instructions = EXCLUDED.seller_instructions;