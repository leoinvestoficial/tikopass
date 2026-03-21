
-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Events table (AI-validated events)
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  venue TEXT NOT NULL,
  city TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  source TEXT, -- 'ai_search' or 'manual'
  external_id TEXT, -- to avoid duplicates
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_events_city ON public.events(city);
CREATE INDEX idx_events_date ON public.events(date);
CREATE INDEX idx_events_name ON public.events USING gin(to_tsvector('portuguese', name));
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tickets table
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sector TEXT NOT NULL,
  row TEXT,
  seat TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price > 0),
  original_price NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'negotiating', 'sold')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tickets are viewable by everyone" ON public.tickets FOR SELECT USING (true);
CREATE POLICY "Users can insert their own tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Users can update their own tickets" ON public.tickets FOR UPDATE TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Users can delete their own tickets" ON public.tickets FOR DELETE TO authenticated USING (auth.uid() = seller_id);
CREATE INDEX idx_tickets_event ON public.tickets(event_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Negotiations table
CREATE TABLE public.negotiations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_price NUMERIC(10,2) NOT NULL CHECK (offer_price > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.negotiations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own negotiations" ON public.negotiations FOR SELECT TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Authenticated users can create negotiations" ON public.negotiations FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants can update negotiations" ON public.negotiations FOR UPDATE TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE TRIGGER update_negotiations_updated_at BEFORE UPDATE ON public.negotiations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Negotiation messages
CREATE TABLE public.negotiation_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  negotiation_id UUID NOT NULL REFERENCES public.negotiations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.negotiation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view messages" ON public.negotiation_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.negotiations n
    WHERE n.id = negotiation_id AND (n.buyer_id = auth.uid() OR n.seller_id = auth.uid())
  ));
CREATE POLICY "Participants can send messages" ON public.negotiation_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM public.negotiations n
    WHERE n.id = negotiation_id AND (n.buyer_id = auth.uid() OR n.seller_id = auth.uid())
  ));
CREATE INDEX idx_messages_negotiation ON public.negotiation_messages(negotiation_id);
