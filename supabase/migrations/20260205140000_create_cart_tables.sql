-- Create cart_sessions table to track customer carts
CREATE TABLE public.cart_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT, -- For anonymous users (browser fingerprint or similar)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'abandoned', 'converted')),
  total_amount DECIMAL(10,2) DEFAULT 0,
  item_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cart_items table to store individual items in each cart
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_session_id UUID REFERENCES public.cart_sessions(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  size TEXT,
  color TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_cart_sessions_user_id ON public.cart_sessions(user_id);
CREATE INDEX idx_cart_sessions_status ON public.cart_sessions(status);
CREATE INDEX idx_cart_sessions_last_activity ON public.cart_sessions(last_activity_at);
CREATE INDEX idx_cart_items_cart_session_id ON public.cart_items(cart_session_id);

-- Enable Row Level Security
ALTER TABLE public.cart_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cart_sessions
CREATE POLICY "Users can view their own cart sessions"
  ON public.cart_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart sessions"
  ON public.cart_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart sessions"
  ON public.cart_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart sessions"
  ON public.cart_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for cart_items
CREATE POLICY "Users can view their own cart items"
  ON public.cart_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cart_sessions
      WHERE cart_sessions.id = cart_items.cart_session_id
      AND cart_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own cart items"
  ON public.cart_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cart_sessions
      WHERE cart_sessions.id = cart_items.cart_session_id
      AND cart_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own cart items"
  ON public.cart_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.cart_sessions
      WHERE cart_sessions.id = cart_items.cart_session_id
      AND cart_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own cart items"
  ON public.cart_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.cart_sessions
      WHERE cart_sessions.id = cart_items.cart_session_id
      AND cart_sessions.user_id = auth.uid()
    )
  );

-- Create a view to easily get cart info with customer details
CREATE VIEW public.carts_with_customer_info AS
SELECT 
  cs.id as cart_id,
  cs.user_id,
  cs.status,
  cs.total_amount,
  cs.item_count,
  cs.last_activity_at,
  cs.created_at,
  c.email as customer_email,
  c.full_name as customer_name,
  c.phone_number as customer_phone
FROM public.cart_sessions cs
LEFT JOIN public.customers c ON c.user_id = cs.user_id
WHERE cs.status = 'active' AND cs.item_count > 0;
