import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Phone, MapPin, Plus, Edit2, Trash2, X, LayoutGrid, List, MessageCircle } from 'lucide-react';
import { useStore, type Customer } from '@/store/useStore';
import { formatPrice, plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type ViewMode = 'list' | 'cards';

const CustomersPage = () => {
  const navigate = useNavigate();
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useStore();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const filtered = customers.filter(c =>
    !search || `${c.name} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditingCustomer(null);
    setFormName(''); setFormPhone(''); setFormAddress(''); setFormNotes('');
    setShowModal(true);
  };

  const openEdit = (c: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(c);
    setFormName(c.name); setFormPhone(c.phone); setFormAddress(c.address); setFormNotes(c.notes);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formName || !formPhone) return;
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, { name: formName, phone: formPhone, address: formAddress, notes: formNotes });
    } else {
      addCustomer({ name: formName, phone: formPhone, address: formAddress, notes: formNotes });
    }
    setShowModal(false);
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete === id) {
      deleteCustomer(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o teléfono..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <button onClick={() => setViewMode('list')} className={cn('p-2 rounded-md transition-colors', viewMode === 'list' ? 'bg-card shadow-sm' : '')} title="Lista">
            <List size={16} className={viewMode === 'list' ? 'text-primary' : 'text-muted-foreground'} />
          </button>
          <button onClick={() => setViewMode('cards')} className={cn('p-2 rounded-md transition-colors', viewMode === 'cards' ? 'bg-card shadow-sm' : '')} title="Tarjetas">
            <LayoutGrid size={16} className={viewMode === 'cards' ? 'text-primary' : 'text-muted-foreground'} />
          </button>
        </div>
        <button onClick={openAdd}
          className="px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold shadow-fab hover:opacity-90 flex items-center gap-2">
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} onClick={() => navigate(`/customers/${c.id}`)}
              className="w-full bg-card rounded-xl border border-border shadow-card p-3 text-left hover:shadow-elevated transition-shadow cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-sans font-bold text-primary shrink-0">
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-sans font-semibold text-sm truncate">{c.name}</p>
                    {c.tag === 'frequent' && <span className="px-1.5 py-0.5 rounded-full bg-warning/15 text-warning text-[9px] font-semibold shrink-0">⭐</span>}
                    {c.tag === 'new' && <span className="px-1.5 py-0.5 rounded-full bg-info/15 text-info text-[9px] font-semibold shrink-0">🆕</span>}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 font-sans"><Phone size={11} />{c.phone}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-sans font-bold text-xs">{formatPrice(c.totalSpent)}</p>
                  <p className="text-[10px] text-muted-foreground font-sans">{plural(c.totalOrders, 'pedido')}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                  {c.phone && (
                    <a href={`https://wa.me/57${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg hover:bg-[#25D366]/10 flex items-center justify-center text-[#25D366] transition-colors">
                      <MessageCircle size={14} />
                    </a>
                  )}
                  <button onClick={(e) => openEdit(c, e)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={(e) => handleDelete(c.id, e)}
                    className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                      confirmDelete === c.id ? 'bg-destructive text-destructive-foreground' : 'hover:bg-muted text-muted-foreground hover:text-destructive')}>
                    <Trash2 size={14} />
                  </button>
                </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(c => (
            <div key={c.id} onClick={() => navigate(`/customers/${c.id}`)}
              className="bg-card rounded-xl border border-border shadow-card p-4 text-center hover:shadow-elevated transition-shadow cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-sans font-bold text-primary mx-auto mb-2">
                {c.name[0]}
              </div>
              <p className="font-sans font-semibold text-sm truncate">{c.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-sans">{c.phone}</p>
              {c.tag === 'frequent' && <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-warning/15 text-warning text-[10px] font-semibold">⭐ Frecuente</span>}
              <div className="mt-2 pt-2 border-t border-border">
                <p className="font-sans font-bold text-sm text-primary">{formatPrice(c.totalSpent)}</p>
                <p className="text-[10px] text-muted-foreground font-sans">{plural(c.totalOrders, 'pedido')}</p>
              </div>
              <div className="flex justify-center gap-1 mt-2" onClick={e => e.stopPropagation()}>
                {c.phone && (
                  <a href={`https://wa.me/57${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="w-7 h-7 rounded-lg hover:bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
                    <MessageCircle size={13} />
                  </a>
                )}
                <button onClick={(e) => openEdit(c, e)} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground">
                  <Edit2 size={13} />
                </button>
                <button onClick={(e) => handleDelete(c.id, e)}
                  className={cn('w-7 h-7 rounded-lg flex items-center justify-center',
                    confirmDelete === c.id ? 'bg-destructive text-destructive-foreground' : 'hover:bg-muted text-muted-foreground hover:text-destructive')}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <span className="text-4xl block mb-2">👥</span>
          <p className="text-sm text-muted-foreground">No se encontraron clientes</p>
        </div>
      )}

      {/* Modal add/edit */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl w-full max-w-sm p-5 shadow-elevated" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg">{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X size={16} /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Nombre</label>
                  <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nombre completo"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Teléfono</label>
                  <input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="300 123 4567"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Dirección</label>
                  <input value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="Dirección"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Notas</label>
                  <input value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Ej: sin cebolla, alérgico..."
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <button onClick={handleSave} disabled={!formName || !formPhone}
                  className="w-full py-2.5 rounded-lg gradient-primary text-primary-foreground font-display font-semibold text-sm shadow-fab disabled:opacity-40 hover:opacity-90">
                  {editingCustomer ? 'Guardar cambios' : 'Crear cliente'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomersPage;
