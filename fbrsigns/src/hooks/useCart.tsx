import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  unit?: string;
  size?: string;
  color?: string;
}

interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartItem[] };

interface CartContextType {
  state: CartState;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
};

const calculateItemCount = (items: CartItem[]): number => {
  return items.reduce((count, item) => count + item.quantity, 0);
};

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.id === action.payload.id);

      if (existingItem) {
        const updatedItems = state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
        return {
          ...state,
          items: updatedItems,
          total: calculateTotal(updatedItems),
          itemCount: calculateItemCount(updatedItems)
        };
      }

      const newItems = [...state.items, { ...action.payload, quantity: 1 }];
      return {
        ...state,
        items: newItems,
        total: calculateTotal(newItems),
        itemCount: calculateItemCount(newItems)
      };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.payload);
      return {
        ...state,
        items: newItems,
        total: calculateTotal(newItems),
        itemCount: calculateItemCount(newItems)
      };
    }

    case 'UPDATE_QUANTITY': {
      const { id, quantity } = action.payload;

      if (quantity <= 0) {
        const newItems = state.items.filter(item => item.id !== id);
        return {
          ...state,
          items: newItems,
          total: calculateTotal(newItems),
          itemCount: calculateItemCount(newItems)
        };
      }

      const updatedItems = state.items.map(item =>
        item.id === id ? { ...item, quantity } : item
      );

      return {
        ...state,
        items: updatedItems,
        total: calculateTotal(updatedItems),
        itemCount: calculateItemCount(updatedItems)
      };
    }

    case 'CLEAR_CART':
      return {
        items: [],
        total: 0,
        itemCount: 0
      };

    case 'LOAD_CART':
      return {
        items: action.payload,
        total: calculateTotal(action.payload),
        itemCount: calculateItemCount(action.payload)
      };

    default:
      return state;
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    total: 0,
    itemCount: 0
  });

  // Load cart from localStorage and Supabase on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        // First, load from localStorage for immediate display
        const savedCart = localStorage.getItem('fbr-cart');
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          dispatch({ type: 'LOAD_CART', payload: parsedCart });
        }

        // Then check if user is logged in and load from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: cartSession, error: sessionError } = await supabase
            .from('cart_sessions' as any)
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle();

          if (sessionError) {
            console.error('Failed to load cart session:', sessionError);
            return;
          }

          if (cartSession) {
            const { data: cartItems, error: itemsError } = await supabase
              .from('cart_items' as any)
              .select('*')
              .eq('cart_session_id', (cartSession as any).id);

            if (itemsError) {
              console.error('Failed to load cart items:', itemsError);
              return;
            }

            if (cartItems && cartItems.length > 0) {
              // Convert DB format to cart format
              const dbCartItems = cartItems.map((item: any) => ({
                id: item.product_id,
                name: item.product_name,
                price: Number(item.price),
                quantity: item.quantity,
                image_url: item.image_url,
                size: item.size,
                color: item.color,
              }));

              // Merge with localStorage cart (DB takes precedence)
              dispatch({ type: 'LOAD_CART', payload: dbCartItems });
            }
          }
        }
      } catch (error) {
        console.error('Failed to load cart:', error);
      }
    };

    loadCart();
  }, []);

  // Save cart to localStorage and Supabase whenever it changes
  useEffect(() => {
    const saveCart = async () => {
      try {
        // Always save to localStorage
        localStorage.setItem('fbr-cart', JSON.stringify(state.items));

        // Save to Supabase if user is logged in
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Get or create cart session
          let { data: cartSession, error: sessionError } = await supabase
            .from('cart_sessions' as any)
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle();

          if (sessionError) {
            console.error('Failed to get cart session:', sessionError);
            return;
          }

          if (!cartSession) {
            // Create new cart session
            const { data: newSession, error: createError } = await supabase
              .from('cart_sessions' as any)
              .insert({
                user_id: user.id,
                status: 'active',
                total_amount: state.total,
                item_count: state.itemCount,
              })
              .select()
              .single();

            if (createError) {
              console.error('Failed to create cart session:', createError);
              return;
            }

            cartSession = newSession;
          } else {
            // Update existing cart session
            await supabase
              .from('cart_sessions' as any)
              .update({
                total_amount: state.total,
                item_count: state.itemCount,
                last_activity_at: new Date().toISOString(),
              })
              .eq('id', (cartSession as any).id);
          }

          // Delete existing cart items
          await supabase
            .from('cart_items' as any)
            .delete()
            .eq('cart_session_id', (cartSession as any).id);

          // Insert new cart items
          if (state.items.length > 0) {
            const cartItemsToInsert = state.items.map(item => ({
              cart_session_id: (cartSession as any).id,
              product_id: item.id,
              product_name: item.name,
              price: item.price,
              quantity: item.quantity,
              size: item.size,
              color: item.color,
              image_url: item.image_url,
            }));

            await supabase
              .from('cart_items' as any)
              .insert(cartItemsToInsert);
          }
        }
      } catch (error) {
        console.error('Failed to save cart:', error);
      }
    };

    saveCart();
  }, [state.items, state.total, state.itemCount]);

  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
    toast({
      title: "Item adicionado ao carrinho",
      description: `${item.name} foi adicionado ao seu carrinho.`,
    });
  };

  const removeItem = (id: string) => {
    const item = state.items.find(item => item.id === id);
    dispatch({ type: 'REMOVE_ITEM', payload: id });
    if (item) {
      toast({
        title: "Item removido",
        description: `${item.name} foi removido do seu carrinho.`,
      });
    }
  };

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
    toast({
      title: "Carrinho limpo",
      description: "Todos os itens foram removidos do seu carrinho.",
    });
  };

  return (
    <CartContext.Provider value={{
      state,
      addItem,
      removeItem,
      updateQuantity,
      clearCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};