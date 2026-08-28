import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, MapPin, FileText, MessageCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatPrice, formatDate, formatTime } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';

const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customers, orders } = useStore();
  const customer = customers.find(c => c.id === Number(id));

  if (!customer) return (
    <div className="text-center py-16">
      <span className="text-5xl block mb-3">🔍</span>
      <p className="text-muted-foreground">Cliente no encontrado</p>
      <button onClick={() => navigate('/customers')} className="mt-3 text-sm text-primary font-medium">← Volver</button>
    </div>
  );

  const customerOrders = orders.filter(o => o.customer.phone === customer.phone);

  // Calculate stats from live orders (not cached customer data)
  const liveOrderCount = customerOrders.length;
  const liveSpent = customerOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const lastOrderDate = customerOrders.length > 0 ? customerOrders[0].createdAt : '';
  const liveTag = liveOrderCount > 5 ? 'frequent' : liveOrderCount > 0 ? 'regular' : 'new';

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/customers')} className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"><ArrowLeft size={18} /></button>
        <h1 className="font-display font-bold text-lg">Perfil del cliente</h1>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-display font-bold text-primary">{customer.name[0]}</div>
          <div>
            <p className="font-display font-bold text-lg">{customer.name}</p>
            {liveTag === 'frequent' && <span className="px-2 py-0.5 rounded-full bg-warning/15 text-warning text-xs font-semibold">⭐ FRECUENTE</span>}
          </div>
        </div>
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2"><Phone size={14} />{customer.phone}</p>
          <p className="flex items-center gap-2"><MapPin size={14} />{customer.address}</p>
          {customer.notes && <p className="flex items-center gap-2"><FileText size={14} />📝 {customer.notes}</p>}
        </div>
        {customer.phone && (
          <a href={`https://wa.me/57${customer.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
            className="mt-3 w-full py-2.5 rounded-lg bg-[#25D366] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <MessageCircle size={16} /> Escribir por WhatsApp
          </a>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card rounded-xl border border-border p-3 text-center shadow-card">
          <p className="font-display font-bold text-lg">{liveOrderCount}</p>
          <p className="text-xs text-muted-foreground">{liveOrderCount === 1 ? 'pedido' : 'pedidos'}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center shadow-card">
          <p className="font-display font-bold text-lg">{formatPrice(liveSpent)}</p>
          <p className="text-xs text-muted-foreground">total</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center shadow-card">
          <p className="font-display font-bold text-lg">{lastOrderDate ? formatDate(lastOrderDate) : '-'}</p>
          <p className="text-xs text-muted-foreground">último</p>
        </div>
      </div>

      <div>
        <h3 className="font-display font-semibold text-sm mb-2">Historial de pedidos</h3>
        {customerOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sin pedidos registrados</p>
        ) : (
          <div className="space-y-2">
            {customerOrders.map(o => (
              <button key={o.id} onClick={() => navigate(`/orders/${o.id}`)}
                className="w-full bg-card rounded-xl border border-border shadow-card p-3 text-left hover:shadow-elevated transition-shadow">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-display font-semibold text-sm">#{o.id}</span>
                  <StatusBadge status={o.status} orderType={o.type} />
                  <span className="ml-auto text-xs text-muted-foreground">{formatDate(o.createdAt)} {formatTime(o.createdAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</p>
                <p className="font-display font-semibold text-sm mt-1">{formatPrice(o.total)}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetailPage;
