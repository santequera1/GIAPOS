import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Check,
  CreditCard,
  Banknote,
  QrCode,
  Sparkles,
  User,
  Search,
  X,
  ArrowRight,
  ArrowLeft,
  EyeOff,
  Eye,
  Shuffle,
  Layers,
  Percent,
  Tag,
} from 'lucide-react';
import { useStore, type OrderItem, type PaymentMethod, type Product, type PaymentSplit } from '@/store/useStore';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { PrintModal } from '@/components/PrintModal';

export interface GelatoFormat {
  id: string;
  name: string;
  container: 'Vaso' | 'Cono' | 'Familiar';
  capacity: string;
  scoops: number;
  price: number;
  desc: string;
  emoji: string;
}

const GELATO_FORMATS: GelatoFormat[] = [
  { id: 'vaso_pequeno', name: 'Vaso Pequeño', container: 'Vaso', capacity: '4 oz', scoops: 1, price: 15000, desc: '1 sabor (4 oz)', emoji: '🍨' },
  { id: 'vaso_grande',  name: 'Vaso Grande',  container: 'Vaso', capacity: '6 oz', scoops: 2, price: 21000, desc: '2 sabores (6 oz)', emoji: '🍨' },
  { id: 'cono_pequeno', name: 'Cono Pequeño', container: 'Cono', capacity: 'Cono', scoops: 1, price: 15000, desc: '1 sabor en cono', emoji: '🍦' },
  { id: 'cono_grande',  name: 'Cono Grande',  container: 'Cono', capacity: 'Cono', scoops: 2, price: 21000, desc: '2 sabores en cono', emoji: '🍦' },
  { id: 'litro',        name: 'Litro',        container: 'Familiar', capacity: '1000 ml', scoops: 2, price: 70000, desc: '2 sabores (familiar)', emoji: '🧊' },
];

const QUICK_CASH_AMOUNTS = [15000, 20000, 50000, 100000];

interface TabOrder {
  id: string;
  name: string;
  cart: OrderItem[];
  customer: {
    name: string;
    doc: string;
    email: string;
    phone: string;
    isElectronicInvoice: boolean;
  };
  notes: string;
  paymentMethod: PaymentMethod;
  paymentSplit?: PaymentSplit;
  cashReceived: string;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
}

const DEFAULT_CUSTOMER = {
  name: 'Consumidor Final',
  doc: '222222222222',
  email: '',
  phone: '3000000000',
  isElectronicInvoice: false,
};

const STORAGE_TABS_KEY = 'giapos_held_tabs_v1';

export const POSPage: React.FC = () => {
  const {
    products,
    categories,
    customers,
    addOrder,
    currentShift,
    toggleProductAvailability,
  } = useStore();

  // Tabs / Precuentas State
  const [tabs, setTabs] = useState<TabOrder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TABS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      {
        id: 'tab-1',
        name: 'Cuenta 1',
        cart: [],
        customer: { ...DEFAULT_CUSTOMER },
        notes: '',
        paymentMethod: 'cash',
        cashReceived: '',
        discountType: 'percent',
        discountValue: 0,
      },
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id || 'tab-1');
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  // Active Tab Data
  const currentTab = useMemo(() => {
    return tabs.find(t => t.id === activeTabId) || tabs[0];
  }, [tabs, activeTabId]);

  const cart = currentTab.cart;
  const customer = currentTab.customer;
  const paymentMethod = currentTab.paymentMethod;
  const paymentSplit = currentTab.paymentSplit || {
    method1: 'cash',
    amount1: 0,
    method2: 'card_debit',
    amount2: 0,
  };
  const cashReceived = currentTab.cashReceived;
  const orderNotes = currentTab.notes;
  const discountType = currentTab.discountType || 'percent';
  const discountValue = currentTab.discountValue || 0;

  // Persist tabs
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TABS_KEY, JSON.stringify(tabs));
    } catch (e) {}
  }, [tabs]);

  // POS State
  const [catalogTab, setCatalogTab] = useState<'gelato' | number | 'custom'>('gelato');
  const [selectedFormat, setSelectedFormat] = useState<GelatoFormat>(GELATO_FORMATS[0]);
  const [firstFlavor, setFirstFlavor] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileView, setMobileView] = useState<'catalog' | 'cart'>('catalog');

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [custSearchQuery, setCustSearchQuery] = useState('');

  const [customItem, setCustomItem] = useState({ name: '', price: '' });
  const [lastOrder, setLastOrder] = useState<any | null>(null);
  const [countdown, setCountdown] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Totals Calculation with Discount
  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.price * item.quantity, 0), [cart]);

  const discountAmount = useMemo(() => {
    if (discountValue <= 0) return 0;
    if (discountType === 'percent') {
      return Math.round((subtotal * Math.min(100, discountValue)) / 100);
    }
    return Math.min(subtotal, discountValue);
  }, [subtotal, discountType, discountValue]);

  const total = Math.max(0, subtotal - discountAmount);
  const numericCash = Number(cashReceived) || 0;
  const change = paymentMethod === 'cash' && numericCash > 0 ? numericCash - total : 0;

  // Auto-sync split payment when total changes or split is selected
  useEffect(() => {
    if (paymentMethod === 'mixed') {
      const half = Math.round(total / 2);
      if (!currentTab.paymentSplit || currentTab.paymentSplit.amount1 + currentTab.paymentSplit.amount2 !== total) {
        updateActiveTab({
          paymentSplit: {
            method1: currentTab.paymentSplit?.method1 || 'cash',
            amount1: currentTab.paymentSplit?.amount1 || half,
            method2: currentTab.paymentSplit?.method2 || 'card_debit',
            amount2: total - (currentTab.paymentSplit?.amount1 || half),
          },
        });
      }
    }
  }, [total, paymentMethod]);

  // Tab Helper Mutators
  const updateActiveTab = (updates: Partial<TabOrder>) => {
    setTabs(prev =>
      prev.map(t => (t.id === activeTabId ? { ...t, ...updates } : t))
    );
  };

  const handleAddNewTab = () => {
    const nextNum = tabs.length + 1;
    const newTab: TabOrder = {
      id: `tab-${Date.now()}`,
      name: `Cuenta ${nextNum}`,
      cart: [],
      customer: { ...DEFAULT_CUSTOMER },
      notes: '',
      paymentMethod: 'cash',
      cashReceived: '',
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    toast.success(`Nueva cuenta abierta: ${newTab.name}`);
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tabToClose = tabs.find(t => t.id === tabId);
    if (!tabToClose) return;

    if (tabToClose.cart.length > 0) {
      if (!window.confirm(`¿Deseas descartar los ítems de "${tabToClose.name}"?`)) {
        return;
      }
    }

    if (tabs.length === 1) {
      // Reset the single tab
      const resetTab: TabOrder = {
        id: 'tab-1',
        name: 'Cuenta 1',
        cart: [],
        customer: { ...DEFAULT_CUSTOMER },
        notes: '',
        paymentMethod: 'cash',
        cashReceived: '',
      };
      setTabs([resetTab]);
      setActiveTabId('tab-1');
      return;
    }

    const remaining = tabs.filter(t => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining[0].id);
    }
  };

  // Products filtering
  const gelatoFlavors = useMemo(() => {
    return products.filter(p => {
      const isGelatoCat = p.categoryId === 1 || p.categoryId === 2 || p.categoryId === 3;
      if (!isGelatoCat) return false;
      if (searchQuery.trim()) {
        return (
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }
      return true;
    });
  }, [products, searchQuery]);

  const otherProducts = useMemo(() => {
    if (typeof catalogTab !== 'number') return [];
    return products.filter(p => {
      if (p.categoryId !== catalogTab) return false;
      if (searchQuery.trim()) {
        return p.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [products, catalogTab, searchQuery]);

  // Cart operations
  const addItemToCart = (item: OrderItem) => {
    const prevCart = currentTab.cart;
    const idx = prevCart.findIndex(i => i.name === item.name && i.price === item.price);
    let updatedCart: OrderItem[];
    if (idx >= 0) {
      updatedCart = [...prevCart];
      updatedCart[idx] = { ...updatedCart[idx], quantity: updatedCart[idx].quantity + 1 };
    } else {
      updatedCart = [...prevCart, item];
    }
    updateActiveTab({ cart: updatedCart });
  };

  const updateQuantity = (index: number, delta: number) => {
    const prevCart = currentTab.cart;
    const updated = [...prevCart];
    const newQty = updated[index].quantity + delta;
    let newCart: OrderItem[];
    if (newQty <= 0) {
      newCart = updated.filter((_, i) => i !== index);
    } else {
      updated[index] = { ...updated[index], quantity: newQty };
      newCart = updated;
    }
    updateActiveTab({ cart: newCart });
  };

  const removeItem = (index: number) => {
    updateActiveTab({ cart: currentTab.cart.filter((_, i) => i !== index) });
  };

  const clearCart = () => {
    updateActiveTab({
      cart: [],
      cashReceived: '',
      notes: '',
      paymentSplit: undefined,
    });
    setFirstFlavor(null);
  };

  // Gelato pricing helper (handles special prices like Pistacho Sin Azúcar)
  const getGelatoItemPrice = (format: GelatoFormat, f1: Product, f2?: Product | null) => {
    const isSpecialSA = f1.name.toLowerCase().includes('sin azúcar') || (f2 && f2.name.toLowerCase().includes('sin azúcar'));
    if (isSpecialSA) {
      if (format.id === 'vaso_pequeno' || format.id === 'cono_pequeno') return 17000;
      if (format.id === 'vaso_grande' || format.id === 'cono_grande') return 23000;
      if (format.id === 'litro') return 75000;
    }
    return format.price;
  };

  // Flavors Dispatch Logic
  const handleFlavorClick = (flavor: Product) => {
    if (!flavor.available) {
      toast.error(`${flavor.name} no está disponible actualmente`);
      return;
    }

    if (selectedFormat.scoops === 1) {
      const itemPrice = getGelatoItemPrice(selectedFormat, flavor);
      const containerLabel = selectedFormat.container === 'Cono' ? 'Cono' : 'Vaso';
      addItemToCart({
        productId: flavor.id,
        name: `Gelato en ${containerLabel} (${selectedFormat.capacity}) — ${flavor.name}`,
        size: `${selectedFormat.name} (${selectedFormat.capacity})`,
        flavors: flavor.name,
        quantity: 1,
        price: itemPrice,
        notes: '',
      });
      toast.success(`Agregado: ${selectedFormat.name} (${flavor.name})`);
    } else {
      if (!firstFlavor) {
        setFirstFlavor(flavor);
      } else {
        const isSame = firstFlavor.id === flavor.id;
        const itemPrice = getGelatoItemPrice(selectedFormat, firstFlavor, flavor);
        const containerLabel = selectedFormat.container === 'Cono' ? 'Cono' : selectedFormat.container === 'Familiar' ? 'Litro Familiar' : 'Vaso';
        const combinationName = isSame
          ? `Gelato en ${containerLabel} (${selectedFormat.capacity}) — ${flavor.name}`
          : `Gelato en ${containerLabel} (${selectedFormat.capacity}) — ${firstFlavor.name} + ${flavor.name}`;

        const flavorsList = isSame ? `${flavor.name}` : `${firstFlavor.name}, ${flavor.name}`;

        addItemToCart({
          productId: firstFlavor.id,
          name: combinationName,
          size: `${selectedFormat.name} (${selectedFormat.capacity})`,
          flavors: flavorsList,
          quantity: 1,
          price: itemPrice,
          notes: '',
        });

        toast.success(`Agregado: ${combinationName}`);
        setFirstFlavor(null);
      }
    }
  };

  const handleAddFirstFlavorSolo = () => {
    if (!firstFlavor) return;
    const itemPrice = getGelatoItemPrice(selectedFormat, firstFlavor);
    const containerLabel = selectedFormat.container === 'Cono' ? 'Cono' : selectedFormat.container === 'Familiar' ? 'Litro Familiar' : 'Vaso';
    addItemToCart({
      productId: firstFlavor.id,
      name: `Gelato en ${containerLabel} (${selectedFormat.capacity}) — ${firstFlavor.name}`,
      size: `${selectedFormat.name} (${selectedFormat.capacity})`,
      flavors: firstFlavor.name,
      quantity: 1,
      price: itemPrice,
      notes: '',
    });
    toast.success(`Agregado: ${selectedFormat.name} (${firstFlavor.name})`);
    setFirstFlavor(null);
  };

  const handleAddOtherProduct = (prod: Product) => {
    if (!prod.available) {
      toast.error(`${prod.name} no está disponible`);
      return;
    }
    addItemToCart({
      productId: prod.id,
      name: prod.name,
      size: undefined,
      flavors: undefined,
      quantity: 1,
      price: prod.price,
      notes: '',
    });
    toast.success(`Agregado: ${prod.name}`);
  };

  const handleAddCustomItem = () => {
    const priceNum = Number(customItem.price);
    if (!customItem.name.trim() || !priceNum || priceNum <= 0) {
      toast.error('Ingresa nombre y precio válido para el ítem');
      return;
    }
    addItemToCart({
      productId: 0,
      name: customItem.name.trim(),
      quantity: 1,
      price: priceNum,
      notes: 'Ítem personalizado',
    });
    setCustomItem({ name: '', price: '' });
    setCatalogTab('gelato');
    toast.success('Ítem agregado al carrito');
  };

  // Checkout Execution
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    if (paymentMethod === 'cash') {
      if (numericCash > 0 && numericCash < total) {
        toast.error(`El monto recibido (${formatPrice(numericCash)}) es menor al total (${formatPrice(total)})`);
        return;
      }
    }

    if (paymentMethod === 'mixed') {
      const sum = (paymentSplit?.amount1 || 0) + (paymentSplit?.amount2 || 0);
      if (sum !== total) {
        toast.error(`La suma de los métodos de pago (${formatPrice(sum)}) debe ser igual al total (${formatPrice(total)})`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        type: 'pickup' as const,
        status: 'delivered' as const,
        customer: {
          name: customer.name.trim() || 'Consumidor Final',
          doc: customer.doc.trim() || '222222222222',
          email: customer.email.trim() || undefined,
          phone: customer.phone.trim() || undefined,
          isElectronicInvoice: customer.isElectronicInvoice,
        },
        items: cart,
        subtotal,
        deliveryFee: 0,
        discount: discountAmount,
        total,
        paymentMethod,
        paymentSplit: paymentMethod === 'mixed' ? paymentSplit : undefined,
        paymentStatus: 'paid' as const,
        cashReceived: paymentMethod === 'cash' ? (numericCash || total) : paymentMethod === 'mixed' && paymentSplit.method1 === 'cash' ? paymentSplit.amount1 : 0,
        cashChange: paymentMethod === 'cash' ? Math.max(0, change) : 0,
        notes: orderNotes,
        shiftId: currentShift?.id || undefined,
      };

      const newId = await addOrder(orderPayload);

      if (newId > 0) {
        const completedOrder = {
          ...orderPayload,
          id: newId,
          createdAt: new Date().toISOString(),
        };

        setLastOrder(completedOrder);
        setCountdown(3);

        // Remove or reset completed tab
        if (tabs.length > 1) {
          const remaining = tabs.filter(t => t.id !== activeTabId);
          setTabs(remaining);
          setActiveTabId(remaining[0].id);
        } else {
          clearCart();
        }

        setMobileView('catalog');
        toast.success(`¡Venta #${newId} completada con éxito!`);
      } else {
        toast.error('No se pudo procesar la venta. Intenta nuevamente.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al registrar la venta');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!lastOrder) return;
    if (countdown <= 0) {
      setLastOrder(null);
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [lastOrder, countdown]);

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-[#FEF3DE] text-[#364266] overflow-hidden">
      {/* Mobile Top View Switcher */}
      <div className="lg:hidden flex bg-[#242D49] p-1.5 gap-1.5 shrink-0 shadow-md">
        <button
          onClick={() => setMobileView('catalog')}
          className={cn(
            'flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 font-sans',
            mobileView === 'catalog' ? 'bg-[#FAF8EA] text-[#242D49] shadow-sm' : 'text-[#FEF3DE]/80 hover:text-white'
          )}
        >
          <span>🍨 Sabores & Productos</span>
        </button>
        <button
          onClick={() => setMobileView('cart')}
          className={cn(
            'flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 font-sans',
            mobileView === 'cart' ? 'bg-[#FAF8EA] text-[#242D49] shadow-sm' : 'text-[#FEF3DE]/80 hover:text-white'
          )}
        >
          <ShoppingCart size={14} />
          <span>{currentTab.name} ({cart.reduce((a, b) => a + b.quantity, 0)}) • {formatPrice(total)}</span>
        </button>
      </div>

      {/* LEFT COLUMN: Catalog & Fast Gelato Builder */}
      <div className={cn('flex-1 flex-col h-full overflow-hidden border-r border-[#364266]/10', mobileView === 'catalog' ? 'flex' : 'hidden lg:flex')}>
        {/* Top Navigation & Size Switcher Bar */}
        <div className="p-2.5 lg:p-3 bg-white/80 backdrop-blur border-b border-[#364266]/10 shrink-0 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-[#FAF8EA] text-[#364266] border border-[#C6BF81]/50 font-sans">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                {currentShift ? `Turno #${currentShift.id} • ${currentShift.cashierName}` : 'Caja Activa'}
              </span>
            </div>

            {/* Quick Search */}
            <div className="relative w-44 sm:w-60">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar sabor o producto..."
                className="w-full pl-7 pr-3 py-1 rounded-xl text-xs bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#364266] font-sans"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => { setCatalogTab('gelato'); setFirstFlavor(null); }}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shadow-sm font-sans',
                catalogTab === 'gelato'
                  ? 'bg-[#364266] text-[#FEF3DE] shadow-md scale-[1.01]'
                  : 'bg-white hover:bg-[#FAF8EA] text-[#364266] border border-[#364266]/10'
              )}
            >
              <span>🍨</span>
              <span>Gelatos Artesanales</span>
            </button>

            {/* Affogatos, Bebidas & Aguas, Adicionales */}
            {categories.filter(c => c.id === 6 || c.id === 4 || c.id === 5).map(cat => (
              <button
                key={cat.id}
                onClick={() => { setCatalogTab(cat.id); setFirstFlavor(null); }}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all font-sans',
                  catalogTab === cat.id
                    ? 'bg-[#364266] text-[#FEF3DE] shadow-md scale-[1.01]'
                    : 'bg-white hover:bg-[#FAF8EA] text-[#364266] border border-[#364266]/10'
                )}
              >
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
              </button>
            ))}

            <button
              onClick={() => setCatalogTab('custom')}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all font-sans',
                catalogTab === 'custom'
                  ? 'bg-[#364266] text-[#FEF3DE] shadow-md'
                  : 'bg-white hover:bg-[#FAF8EA] text-[#364266] border border-[#364266]/10'
              )}
            >
              <Plus size={14} />
              <span>Personalizado</span>
            </button>
          </div>

          {/* Size & Container Formats Selector (5 presentations) */}
          {catalogTab === 'gelato' && (
            <div className="mt-2 pt-2 border-t border-[#364266]/10">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {GELATO_FORMATS.map((fmt) => {
                  const isSelected = selectedFormat.id === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      onClick={() => {
                        setSelectedFormat(fmt);
                        setFirstFlavor(null);
                      }}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-xl border transition-all text-left shadow-sm',
                        isSelected
                          ? 'bg-[#FAF8EA] border-[#364266] ring-2 ring-[#364266] font-bold scale-[1.01]'
                          : 'bg-white/90 border-gray-200 hover:border-[#C6BF81] hover:bg-white text-[#364266]'
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-base">{fmt.emoji}</span>
                        <div className="leading-tight truncate">
                          <p className="font-sans font-bold text-[11px] text-[#242D49] truncate">
                            {fmt.name}
                          </p>
                          <p className="font-sans font-bold text-[10.5px] text-[#344268]">
                            {formatPrice(fmt.price)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Helper Banner */}
              {selectedFormat.scoops === 2 && (
                <div className="mt-1.5 px-2.5 py-1.5 rounded-xl bg-[#FAF8EA] border border-[#C6BF81]/40 flex items-center justify-between text-xs font-medium text-[#364266]">
                  {firstFlavor ? (
                    <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                      <span className="font-bold text-emerald-700 flex items-center gap-1 shrink-0 font-sans">
                        <Check size={13} /> {firstFlavor.name}
                      </span>
                      <ArrowRight size={11} className="text-[#897863] shrink-0" />
                      <span className="text-[#344268] font-semibold truncate text-[11px] font-sans">
                        Toca el 2do sabor (o toca {firstFlavor.name} para 1 solo sabor)
                      </span>
                      <button
                        onClick={handleAddFirstFlavorSolo}
                        className="ml-1 px-2 py-0.5 rounded-lg bg-[#364266] text-[#FEF3DE] text-[10px] font-bold shrink-0 font-sans hover:bg-[#242D49]"
                        title="Agregar con 1 solo sabor"
                      >
                        ✓ Dejar 1 Sabor
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] font-sans">
                      Paso 1: <strong className="text-[#364266]">Toca el 1er sabor</strong> <span className="text-gray-500 font-normal">({selectedFormat.desc})</span>
                    </span>
                  )}

                  {firstFlavor && (
                    <button
                      onClick={() => setFirstFlavor(null)}
                      className="text-xs text-red-600 hover:underline flex items-center gap-0.5 ml-2 shrink-0 font-sans"
                    >
                      <X size={11} /> Cancelar
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Catalog Grid Area */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4">
          {catalogTab === 'gelato' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold tracking-wider uppercase text-[#897863]">
                  Sabores Gia Gelatería
                </span>
                <div className="relative w-48 lg:w-64">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#897863]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar sabor..."
                    className="w-full pl-8 pr-3 py-1 text-xs rounded-xl bg-white border border-[#364266]/15 focus:outline-none focus:ring-1 focus:ring-[#364266]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 lg:gap-3">
                {gelatoFlavors.map(flavor => {
                  const isFirstSelected = firstFlavor?.id === flavor.id;
                  const bgColor = flavor.color_bg || '#FAF8EA';
                  const isSinAzucar = flavor.name.toLowerCase().includes('sin azúcar');

                  return (
                    <div
                      key={flavor.id}
                      onClick={() => handleFlavorClick(flavor)}
                      className={cn(
                        'relative flex flex-col justify-between p-3 rounded-2xl cursor-pointer transition-all duration-200 select-none shadow-sm',
                        flavor.available
                          ? 'hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                          : 'opacity-50 grayscale cursor-not-allowed',
                        isFirstSelected && 'ring-4 ring-[#364266] shadow-lg scale-[1.03]'
                      )}
                      style={{ backgroundColor: bgColor }}
                    >
                      {/* Availability Quick Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProductAvailability(flavor.id);
                        }}
                        title={flavor.available ? 'Marcar como agotado' : 'Marcar como disponible'}
                        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-xs shadow-sm"
                      >
                        {flavor.available ? (
                          <Eye size={12} className="text-emerald-700" />
                        ) : (
                          <EyeOff size={12} className="text-red-600" />
                        )}
                      </button>

                      {/* Flavor Image */}
                      <div className="w-full h-24 lg:h-28 flex items-center justify-center my-1">
                        {flavor.image ? (
                          <img
                            src={flavor.image}
                            alt={flavor.name}
                            className="max-h-full max-w-full object-contain drop-shadow-md transition-transform hover:scale-105"
                          />
                        ) : (
                          <span className="text-4xl">🍨</span>
                        )}
                      </div>

                      {/* Details */}
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-sans font-bold text-sm lg:text-base text-[#242D49] leading-tight truncate">
                            {flavor.name}
                          </h3>
                        </div>
                        {isSinAzucar && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                            🌿 Sin Azúcar ($17k)
                          </span>
                        )}
                        <p className="font-sans text-[11px] text-[#6B5E4F] not-italic line-clamp-1 mt-0.5 font-normal">
                          {flavor.description || 'Gelato artesanal'}
                        </p>
                      </div>

                      {isFirstSelected && (
                        <div className="absolute inset-0 bg-[#364266]/20 rounded-2xl flex items-center justify-center">
                          <span className="bg-[#364266] text-[#FEF3DE] px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                            ✓ 1er Sabor
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Other Categories Grid (Affogatos, Bebidas & Aguas, Adicionales) */}
          {typeof catalogTab === 'number' && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {otherProducts.map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => handleAddOtherProduct(prod)}
                    className={cn(
                      'p-3.5 rounded-2xl bg-white border border-[#364266]/10 hover:border-[#C6BF81] hover:shadow-md cursor-pointer transition-all flex flex-col justify-between shadow-sm',
                      !prod.available && 'opacity-50 grayscale'
                    )}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-sans font-bold text-[#364266] text-base">{prod.name}</h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleProductAvailability(prod.id);
                          }}
                          className="p-1 rounded-md hover:bg-gray-100"
                        >
                          {prod.available ? <Eye size={14} className="text-emerald-600" /> : <EyeOff size={14} className="text-red-500" />}
                        </button>
                      </div>
                      <p className="font-sans text-xs text-[#897863] not-italic my-1">{prod.description || 'Producto Gia'}</p>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                      <span className="font-sans font-bold text-base text-[#344268]">{formatPrice(prod.price)}</span>
                      <span className="w-8 h-8 rounded-full bg-[#364266] text-[#FEF3DE] flex items-center justify-center text-sm font-bold shadow-sm">
                        +
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Item Form */}
          {catalogTab === 'custom' && (
            <div className="max-w-md mx-auto p-6 bg-white rounded-3xl border border-[#364266]/10 shadow-sm mt-4">
              <h3 className="font-sans font-bold text-lg text-[#364266] mb-4">Agregar Ítem Especial</h3>
              <div className="space-y-4">
                <div>
                  <label className="font-sans text-xs font-semibold text-[#897863]">Descripción / Nombre</label>
                  <input
                    type="text"
                    value={customItem.name}
                    onChange={(e) => setCustomItem(ci => ({ ...ci, name: e.target.value }))}
                    placeholder="Ej. Topping extra, Combo especial..."
                    className="w-full mt-1 p-2.5 rounded-xl border border-[#364266]/20 text-sm font-sans focus:ring-2 focus:ring-[#364266]"
                  />
                </div>
                <div>
                  <label className="font-sans text-xs font-semibold text-[#897863]">Precio (COP)</label>
                  <input
                    type="number"
                    value={customItem.price}
                    onChange={(e) => setCustomItem(ci => ({ ...ci, price: e.target.value }))}
                    placeholder="Ej. 10000"
                    className="w-full mt-1 p-2.5 rounded-xl border border-[#364266]/20 text-sm font-sans font-bold focus:ring-2 focus:ring-[#364266]"
                  />
                </div>
                <button
                  onClick={handleAddCustomItem}
                  className="w-full py-3 rounded-xl bg-[#364266] text-[#FEF3DE] font-sans font-semibold text-sm hover:bg-[#242D49] transition-all"
                >
                  Agregar al Carrito
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Floating Mobile Cart Bar */}
        {cart.length > 0 && (
          <div className="lg:hidden p-2.5 bg-white border-t border-[#364266]/15 shadow-xl shrink-0">
            <button
              onClick={() => setMobileView('cart')}
              className="w-full py-2.5 px-4 rounded-xl bg-[#364266] text-[#FEF3DE] font-bold text-xs flex items-center justify-between shadow-md active:scale-[0.99] font-sans"
            >
              <span className="flex items-center gap-2">
                <ShoppingCart size={15} />
                {currentTab.name} • {cart.reduce((a, b) => a + b.quantity, 0)} ítems
              </span>
              <span className="flex items-center gap-1 font-extrabold text-sm">
                Cobrar {formatPrice(total)} <ArrowRight size={15} />
              </span>
            </button>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Live Cart & Fast Checkout Panel */}
      <div className={cn('w-full lg:w-[410px] xl:w-[450px] bg-white flex-col h-full border-l border-[#364266]/10 shadow-xl shrink-0 font-sans', mobileView === 'cart' ? 'flex' : 'hidden lg:flex')}>
        {/* Precuentas / Multi-tabs Bar */}
        <div className="p-2 bg-[#242D49] text-white flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1 shrink-0 text-xs font-bold text-[#C6BF81] pl-1 pr-2">
            <Layers size={14} />
            <span className="hidden sm:inline">Cuentas:</span>
          </div>

          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const itemCount = tab.cart.reduce((a, b) => a + b.quantity, 0);
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={cn(
                  'px-2.5 py-1 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all select-none whitespace-nowrap',
                  isActive
                    ? 'bg-[#FEF3DE] text-[#242D49] font-bold shadow-md'
                    : 'bg-white/10 text-[#FEF3DE]/80 hover:bg-white/20'
                )}
              >
                <span>{tab.name}</span>
                {itemCount > 0 && (
                  <span className={cn(
                    'px-1.5 py-0.2 text-[10px] rounded-full font-bold',
                    isActive ? 'bg-[#364266] text-[#FEF3DE]' : 'bg-white/20 text-white'
                  )}>
                    {itemCount}
                  </span>
                )}
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="hover:text-red-400 p-0.5 rounded-md"
                    title="Cerrar esta cuenta"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={handleAddNewTab}
            className="p-1 px-2 rounded-xl bg-[#C6BF81] hover:bg-[#b8b070] text-[#242D49] text-xs font-bold flex items-center gap-0.5 shrink-0 shadow-sm"
            title="Abrir otra cuenta en espera"
          >
            <Plus size={13} />
            <span className="text-[11px]">Nueva</span>
          </button>
        </div>

        {/* Cart Header */}
        <div className="p-2.5 bg-[#FAF8EA] border-b border-[#364266]/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileView('catalog')}
              className="lg:hidden p-1 rounded-lg bg-white border border-[#364266]/20 text-[#364266] hover:bg-gray-50 flex items-center gap-1 text-xs font-bold font-sans"
              title="Volver al catálogo"
            >
              <ArrowLeft size={13} />
              <span>Sabores</span>
            </button>
            <ShoppingCart size={16} className="text-[#364266]" />
            <h2 className="font-sans font-bold text-sm text-[#364266]">
              {currentTab.name} ({cart.reduce((a, b) => a + b.quantity, 0)})
            </h2>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-600 hover:text-red-700 font-semibold font-sans flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-red-50"
            >
              <Trash2 size={13} /> Vaciar
            </button>
          )}
        </div>

        {/* Customer Fast Selector Bar */}
        <div className="p-2.5 bg-white border-b border-[#364266]/10 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <User size={15} className="text-[#C6BF81] shrink-0" />
            <div className="truncate">
              <span className="font-bold text-[#364266] font-sans">{customer.name}</span>
              <span className="text-[#897863] ml-1.5 font-mono">({customer.doc})</span>
            </div>
          </div>

          <button
            onClick={() => setShowCustomerModal(true)}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-[#FAF8EA] hover:bg-[#EFEDD8] text-[#364266] font-semibold text-[11px] border border-[#C6BF81]/50 font-sans"
          >
            {customer.isElectronicInvoice ? '⚡ F. Electrónica' : 'Cambiar / F.E.'}
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto min-h-0 p-2.5 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#897863]/70 p-4">
              <div className="w-12 h-12 rounded-full bg-[#FAF8EA] flex items-center justify-center text-2xl mb-2">
                🍨
              </div>
              <p className="font-sans font-bold text-sm text-[#364266]">Cuenta sin ítems</p>
              <p className="text-xs text-[#897863] max-w-xs mt-1 font-sans">
                Selecciona sabores o productos en el catálogo para agregarlos a {currentTab.name}.
              </p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-[#FAF8EA]/70 border border-[#364266]/10 flex items-center justify-between gap-2 shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-bold text-xs lg:text-sm text-[#242D49] truncate leading-tight">
                    {item.name}
                  </p>
                  {item.flavors && (
                    <p className="text-[11px] text-[#6B5E4F] font-sans truncate">
                      {item.flavors}
                    </p>
                  )}
                  <p className="text-xs font-sans font-bold text-[#344268] mt-0.5">
                    {formatPrice(item.price)}
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1 shrink-0 bg-white rounded-lg p-0.5 border border-[#364266]/15 shadow-sm">
                  <button
                    onClick={() => updateQuantity(idx, -1)}
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 text-[#364266]"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center font-bold text-xs text-[#364266] font-sans">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(idx, 1)}
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 text-[#364266]"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Subtotal */}
                <div className="text-right shrink-0 min-w-[65px]">
                  <p className="font-sans font-bold text-xs text-[#364266]">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeItem(idx)}
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Cart Totals & Fast Checkout Controls */}
        <div className="p-2.5 sm:p-3 bg-[#FAF8EA] border-t border-[#364266]/15 shrink-0 space-y-2">
          {/* Payment Method Selector (5 options including Mixed) */}
          <div>
            <label className="text-[10px] font-bold text-[#897863] uppercase tracking-wider block mb-1">
              Método de Pago
            </label>
            <div className="grid grid-cols-5 gap-1">
              <button
                onClick={() => updateActiveTab({ paymentMethod: 'cash' })}
                className={cn(
                  'py-1.5 px-0.5 rounded-xl text-[10px] sm:text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all',
                  paymentMethod === 'cash'
                    ? 'bg-[#364266] text-[#FEF3DE] shadow-md'
                    : 'bg-white text-[#364266] border border-[#364266]/15 hover:bg-gray-50'
                )}
              >
                <Banknote size={13} />
                <span>Efectivo</span>
              </button>

              <button
                onClick={() => updateActiveTab({ paymentMethod: 'card_debit' })}
                className={cn(
                  'py-1.5 px-0.5 rounded-xl text-[10px] sm:text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all',
                  paymentMethod === 'card_debit'
                    ? 'bg-[#364266] text-[#FEF3DE] shadow-md'
                    : 'bg-white text-[#364266] border border-[#364266]/15 hover:bg-gray-50'
                )}
              >
                <CreditCard size={13} />
                <span>T. Débito</span>
              </button>

              <button
                onClick={() => updateActiveTab({ paymentMethod: 'card_credit' })}
                className={cn(
                  'py-1.5 px-0.5 rounded-xl text-[10px] sm:text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all',
                  paymentMethod === 'card_credit'
                    ? 'bg-[#364266] text-[#FEF3DE] shadow-md'
                    : 'bg-white text-[#364266] border border-[#364266]/15 hover:bg-gray-50'
                )}
              >
                <CreditCard size={13} />
                <span>T. Crédito</span>
              </button>

              <button
                onClick={() => updateActiveTab({ paymentMethod: 'transfer' })}
                className={cn(
                  'py-1.5 px-0.5 rounded-xl text-[10px] sm:text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all',
                  paymentMethod === 'transfer'
                    ? 'bg-[#364266] text-[#FEF3DE] shadow-md'
                    : 'bg-white text-[#364266] border border-[#364266]/15 hover:bg-gray-50'
                )}
              >
                <QrCode size={13} />
                <span>QR/Transf</span>
              </button>

              <button
                onClick={() => updateActiveTab({ paymentMethod: 'mixed' })}
                className={cn(
                  'py-1.5 px-0.5 rounded-xl text-[10px] sm:text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all',
                  paymentMethod === 'mixed'
                    ? 'bg-[#242D49] text-[#C6BF81] ring-2 ring-[#C6BF81] shadow-md'
                    : 'bg-white text-[#364266] border border-[#364266]/15 hover:bg-gray-50'
                )}
              >
                <Shuffle size={13} />
                <span>Mixto</span>
              </button>
            </div>
          </div>

          {/* Cash Tender Buttons & Calculator */}
          {paymentMethod === 'cash' && (
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => updateActiveTab({ cashReceived: String(total) })}
                  className="px-2 py-0.5 rounded-lg bg-white border border-[#364266]/20 hover:bg-[#FAF8EA] text-[10px] font-bold text-[#364266] whitespace-nowrap shadow-sm"
                >
                  Exacto (${formatPrice(total)})
                </button>
                {QUICK_CASH_AMOUNTS.filter(a => a >= total).map(amt => (
                  <button
                    key={amt}
                    onClick={() => updateActiveTab({ cashReceived: String(amt) })}
                    className="px-2 py-0.5 rounded-lg bg-white border border-[#364266]/20 hover:bg-[#FAF8EA] text-[10px] font-bold text-[#364266] whitespace-nowrap shadow-sm"
                  >
                    ${formatPrice(amt)}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[9px] font-bold text-[#897863]">Efectivo Recibido</label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => updateActiveTab({ cashReceived: e.target.value })}
                    placeholder={String(total)}
                    className="w-full p-1.5 text-xs font-bold bg-white rounded-xl border border-[#364266]/20 focus:ring-2 focus:ring-[#364266]"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[#897863]">Cambio / Vueltos</label>
                  <div className={cn(
                    'p-1.5 text-xs font-bold rounded-xl border text-right truncate',
                    change >= 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-red-50 text-red-600 border-red-200'
                  )}>
                    {change >= 0 ? formatPrice(change) : 'Faltan ' + formatPrice(Math.abs(change))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Split Payment (Pago Combinado / Mixto) UI */}
          {paymentMethod === 'mixed' && (
            <div className="p-2.5 rounded-xl bg-white border border-[#C6BF81]/60 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#364266] pb-1 border-b border-gray-100">
                <span className="flex items-center gap-1">
                  <Shuffle size={13} className="text-[#C6BF81]" /> Desglose de Pago Mixto
                </span>
                <span className="text-[#344268]">{formatPrice(total)}</span>
              </div>

              {/* Method 1 */}
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[9px] text-[#897863] font-bold">1er Método</label>
                  <select
                    value={paymentSplit.method1}
                    onChange={(e) => updateActiveTab({
                      paymentSplit: { ...paymentSplit, method1: e.target.value as PaymentMethod }
                    })}
                    className="w-full p-1 text-xs rounded-lg border border-gray-200 bg-white"
                  >
                    <option value="cash">💵 Efectivo</option>
                    <option value="card_debit">💳 T. Débito</option>
                    <option value="card_credit">💳 T. Crédito</option>
                    <option value="transfer">📱 QR / Nequi</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-[#897863] font-bold">Monto 1</label>
                  <input
                    type="number"
                    value={paymentSplit.amount1 || ''}
                    onChange={(e) => {
                      const a1 = Number(e.target.value) || 0;
                      const a2 = Math.max(0, total - a1);
                      updateActiveTab({
                        paymentSplit: { ...paymentSplit, amount1: a1, amount2: a2 }
                      });
                    }}
                    placeholder="0"
                    className="w-full p-1 text-xs font-bold rounded-lg border border-gray-200"
                  />
                </div>
              </div>

              {/* Method 2 */}
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[9px] text-[#897863] font-bold">2do Método</label>
                  <select
                    value={paymentSplit.method2}
                    onChange={(e) => updateActiveTab({
                      paymentSplit: { ...paymentSplit, method2: e.target.value as PaymentMethod }
                    })}
                    className="w-full p-1 text-xs rounded-lg border border-gray-200 bg-white"
                  >
                    <option value="card_debit">💳 T. Débito</option>
                    <option value="card_credit">💳 T. Crédito</option>
                    <option value="transfer">📱 QR / Nequi</option>
                    <option value="cash">💵 Efectivo</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-[#897863] font-bold">Monto 2 (Restante)</label>
                  <input
                    type="number"
                    value={paymentSplit.amount2 || ''}
                    onChange={(e) => {
                      const a2 = Number(e.target.value) || 0;
                      const a1 = Math.max(0, total - a2);
                      updateActiveTab({
                        paymentSplit: { ...paymentSplit, amount1: a1, amount2: a2 }
                      });
                    }}
                    placeholder="0"
                    className="w-full p-1 text-xs font-bold rounded-lg border border-gray-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Discount / Promo Controls */}
          <div className="pt-1.5 border-t border-[#364266]/10">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowDiscountInput(!showDiscountInput)}
                className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all',
                  discountValue > 0
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-white text-[#364266] border border-[#364266]/15 hover:bg-[#FAF8EA]'
                )}
              >
                <Tag size={11} />
                <span>{discountValue > 0 ? `Descuento: ${discountType === 'percent' ? discountValue + '%' : formatPrice(discountValue)}` : '+ Aplicar Descuento'}</span>
              </button>

              {discountValue > 0 && (
                <button
                  type="button"
                  onClick={() => updateActiveTab({ discountValue: 0 })}
                  className="text-[10px] text-red-600 hover:underline flex items-center gap-0.5"
                >
                  <X size={10} /> Quitar
                </button>
              )}
            </div>

            {showDiscountInput && (
              <div className="mt-1.5 p-2 rounded-xl bg-white border border-[#C6BF81]/50 space-y-1.5 animate-in fade-in duration-150">
                <div className="flex gap-1">
                  {[5, 10, 15, 20, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        updateActiveTab({ discountType: 'percent', discountValue: pct });
                        setShowDiscountInput(false);
                      }}
                      className={cn(
                        'flex-1 py-1 text-[10px] font-bold rounded-lg border transition-all',
                        discountType === 'percent' && discountValue === pct
                          ? 'bg-[#364266] text-[#FEF3DE] border-[#364266]'
                          : 'bg-gray-50 hover:bg-[#FAF8EA] text-[#364266] border-gray-200'
                      )}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                <div className="flex gap-1.5 items-center pt-0.5">
                  <select
                    value={discountType}
                    onChange={(e) => updateActiveTab({ discountType: e.target.value as 'percent' | 'fixed' })}
                    className="p-1 text-[10px] font-bold rounded-lg border border-gray-200 bg-white"
                  >
                    <option value="percent">% Porc.</option>
                    <option value="fixed">$ COP</option>
                  </select>
                  <input
                    type="number"
                    value={discountValue || ''}
                    onChange={(e) => updateActiveTab({ discountValue: Number(e.target.value) || 0 })}
                    placeholder={discountType === 'percent' ? 'Ej. 10 (%)' : 'Ej. 5000 ($)'}
                    className="flex-1 p-1 text-xs font-bold rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDiscountInput(false)}
                    className="px-2 py-1 rounded-lg bg-[#364266] text-[#FEF3DE] text-[10px] font-bold"
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Totals Summary */}
          <div className="pt-1 border-t border-[#364266]/10 space-y-0.5 text-xs">
            {discountAmount > 0 && (
              <>
                <div className="flex justify-between text-[#897863] text-[11px]">
                  <span>Subtotal:</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-red-600 font-bold text-[11px]">
                  <span>Descuento ({discountType === 'percent' ? `${discountValue}%` : 'Monto'}):</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              </>
            )}
            <div className="flex items-baseline justify-between pt-0.5 text-sm sm:text-base font-sans font-bold text-[#364266]">
              <span>Total a Cobrar:</span>
              <span className="text-base sm:text-xl font-sans font-extrabold text-[#242D49]">{formatPrice(total)}</span>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isSubmitting || (paymentMethod === 'cash' && numericCash > 0 && numericCash < total)}
            className={cn(
              'w-full py-2.5 sm:py-3.5 px-4 rounded-xl font-sans font-bold text-sm sm:text-base text-[#FEF3DE] flex items-center justify-center gap-2 shadow-lg transition-all',
              cart.length > 0 && !isSubmitting
                ? 'bg-gradient-to-r from-[#364266] to-[#242D49] hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]'
                : 'bg-gray-400 cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <span>Procesando...</span>
            ) : (
              <>
                <Sparkles size={16} />
                <span>COBRAR {formatPrice(total)}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Customer Modal */}
      <AnimatePresence>
        {showCustomerModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#364266]/10"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-sans font-bold text-lg text-[#364266]">Datos del Cliente / Facturación</h3>
                <button onClick={() => setShowCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <button
                onClick={() => {
                  updateActiveTab({ customer: { ...DEFAULT_CUSTOMER } });
                  setShowCustomerModal(false);
                }}
                className="w-full mb-4 py-2.5 px-3 rounded-xl bg-[#FAF8EA] border border-[#C6BF81]/50 text-xs font-bold text-[#364266] hover:bg-[#EFEDD8] flex items-center justify-center gap-2"
              >
                <span>👤 Restablecer a Consumidor Final (222222222222)</span>
              </button>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-[#897863]">Buscar Cliente Registrado</label>
                  <input
                    type="text"
                    value={custSearchQuery}
                    onChange={(e) => setCustSearchQuery(e.target.value)}
                    placeholder="Buscar por cédula o nombre..."
                    className="w-full mt-1 p-2 rounded-xl border border-gray-200 text-xs"
                  />
                  {custSearchQuery.length >= 2 && (
                    <div className="max-h-28 overflow-y-auto mt-1 border rounded-lg divide-y bg-gray-50">
                      {customers
                        .filter(c => c.name.toLowerCase().includes(custSearchQuery.toLowerCase()) || (c.documentId && c.documentId.includes(custSearchQuery)))
                        .map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              updateActiveTab({
                                customer: {
                                  name: c.name,
                                  doc: c.documentId || '222222222222',
                                  email: c.email || '',
                                  phone: c.phone || '',
                                  isElectronicInvoice: true,
                                },
                              });
                              setCustSearchQuery('');
                              setShowCustomerModal(false);
                            }}
                            className="p-2 hover:bg-[#FAF8EA] cursor-pointer"
                          >
                            <p className="font-bold text-[#364266]">{c.name}</p>
                            <p className="text-[10px] text-[#897863]">{c.documentId} — {c.email || c.phone}</p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-[#897863]">Nombre o Razón Social</label>
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(e) => updateActiveTab({ customer: { ...customer, name: e.target.value } })}
                    className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-[#897863]">Cédula / NIT</label>
                    <input
                      type="text"
                      value={customer.doc}
                      onChange={(e) => updateActiveTab({ customer: { ...customer, doc: e.target.value } })}
                      className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#897863]">Celular</label>
                    <input
                      type="text"
                      value={customer.phone}
                      onChange={(e) => updateActiveTab({ customer: { ...customer, phone: e.target.value } })}
                      className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-[#897863]">Correo Electrónico (para Factura Electrónica)</label>
                  <input
                    type="email"
                    value={customer.email}
                    onChange={(e) => updateActiveTab({ customer: { ...customer, email: e.target.value } })}
                    placeholder="cliente@ejemplo.com"
                    className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 text-sm"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="fe-check"
                    checked={customer.isElectronicInvoice}
                    onChange={(e) => updateActiveTab({ customer: { ...customer, isElectronicInvoice: e.target.checked } })}
                    className="rounded border-gray-300 text-[#364266] focus:ring-[#364266]"
                  />
                  <label htmlFor="fe-check" className="font-semibold text-[#364266]">
                    Requiere Factura Electrónica formal
                  </label>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#364266] text-[#FEF3DE] font-semibold text-sm hover:bg-[#242D49]"
                >
                  Guardar Datos
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post-Payment Print Modal */}
      <PrintModal
        isOpen={!!lastOrder}
        onClose={() => setLastOrder(null)}
        order={lastOrder}
      />
    </div>
  );
};

export default POSPage;