
-- Timestamp updater
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  firm_name TEXT,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, firm_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'firm_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Attorney')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Matters
CREATE TABLE public.matters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  client TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matters select own" ON public.matters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "matters insert own" ON public.matters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "matters update own" ON public.matters FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "matters delete own" ON public.matters FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_matters_updated BEFORE UPDATE ON public.matters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_matters_user ON public.matters(user_id, updated_at DESC);

-- Messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages select own" ON public.messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "messages insert own" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "messages delete own" ON public.messages FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_messages_matter ON public.messages(matter_id, created_at ASC);

-- Documents
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'draft',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents select own" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "documents insert own" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "documents update own" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "documents delete own" ON public.documents FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_documents_matter ON public.documents(matter_id, updated_at DESC);
