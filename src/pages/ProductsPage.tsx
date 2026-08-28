import { useState } from 'react';
import { Search, Plus, Grid3X3, List, X, Trash2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

const ProductsPage = () => {
  const { categories, products, toggleProductAvailability, addProduct, updateProduct, deleteProduct, addCategory } = useStore();
  const [showCatForm, setShowCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6B7280');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', price: '', categoryId: 1, available: true, sizes: [] as { name: string; price: number }[] });

  const filtered = products.filter(p => {
    if (selectedCategory && p.categoryId !== selectedCategory) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openEdit = (id: number) => {
    const p = products.find(pr => pr.id === id)!;
    setFormData({ name: p.name, description: p.description || '', price: String(p.price), categoryId: p.categoryId, available: p.available, sizes: p.sizes ? [...p.sizes] : [] });
    setEditingId(id);
    setShowForm(true);
  };

  const handleSave = () => {
    const data: any = { name: formData.name, description: formData.description, price: Number(formData.price), categoryId: formData.categoryId, available: formData.available };
    data.sizes = formData.sizes.length > 0 ? formData.sizes : null;
    if (editingId) {
      updateProduct(editingId, data);
    } else {
      addProduct(data);
    }
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', description: '', price: '', categoryId: 1, available: true, sizes: [] });
  };

  const addSize = () => {
    setFormData({ ...formData, sizes: [...formData.sizes, { name: '', price: 0 }] });
  };
  const updateSize = (idx: number, field: 'name' | 'price', value: string) => {
    const newSizes = [...formData.sizes];
    if (field === 'price') newSizes[idx] = { ...newSizes[idx], price: Number(value) };
    else newSizes[idx] = { ...newSizes[idx], name: value };
    setFormData({ ...formData, sizes: newSizes, price: newSizes.length > 0 ? String(Math.min(...newSizes.map(s => s.price).filter(p => p > 0))) : formData.price });
  };
  const removeSize = (idx: number) => {
    const newSizes = formData.sizes.filter((_, i) => i !== idx);
    setFormData({ ...formData, sizes: newSizes, price: newSizes.length > 0 ? String(Math.min(...newSizes.map(s => s.price).filter(p => p > 0))) : formData.price });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="w-10 h-10 rounded-lg border border-border bg-card flex items-center justify-center">
          {viewMode === 'grid' ? <List size={18} /> : <Grid3X3 size={18} />}
        </button>
        <button onClick={() => { setEditingId(null); setFormData({ name: '', description: '', price: '', categoryId: 1, available: true, sizes: [] }); setShowForm(true); }}
          className="h-10 px-4 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5 shadow-fab">
          <Plus size={16} /> Agregar
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setSelectedCategory(null)} className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap', !selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>Todas</button>
        {categories.map(c => (
          <button key={c.id} onClick={() => setSelectedCategory(c.id)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap', selectedCategory === c.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
            {c.emoji} {c.name}
          </button>
        ))}
        <button onClick={() => setShowCatForm(!showCatForm)}
          className="px-2 py-1.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground hover:text-primary shrink-0">
          <Plus size={14} />
        </button>
      </div>

      {showCatForm && (
        <div className="flex gap-2 items-end flex-wrap bg-card rounded-lg border border-border p-3">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">Emoji</label>
            <input value={newCatEmoji} onChange={e => setNewCatEmoji(e.target.value)} placeholder="🍔"
              className="w-14 px-2 py-1.5 rounded-lg border border-input bg-card text-sm text-center outline-none" />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-[10px] text-muted-foreground block mb-0.5">Nombre</label>
            <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Nueva categoría"
              className="w-full px-3 py-1.5 rounded-lg border border-input bg-card text-sm outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-0.5">Color</label>
            <input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)}
              className="w-10 h-8 rounded border border-input cursor-pointer" />
          </div>
          <button onClick={() => {
            if (newCatName && newCatEmoji) {
              addCategory({ name: newCatName, emoji: newCatEmoji, color: newCatColor });
              setNewCatName(''); setNewCatEmoji(''); setNewCatColor('#6B7280'); setShowCatForm(false);
            }
          }} disabled={!newCatName || !newCatEmoji}
            className="px-4 py-1.5 rounded-lg gradient-primary text-primary-foreground text-xs font-semibold disabled:opacity-40">
            Crear
          </button>
          <button onClick={() => setShowCatForm(false)} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted">
            <X size={14} />
          </button>
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {filtered.map(p => {
            const cat = categories.find(c => c.id === p.categoryId);
            return (
              <div key={p.id} className={cn('bg-card rounded-xl border border-border shadow-card p-3', !p.available && 'opacity-50')}>
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-full aspect-square rounded-lg mb-2 object-cover" />
                ) : (
                  <div className="w-full h-20 rounded-lg mb-2 flex items-center justify-center text-3xl" style={{ backgroundColor: (cat?.color || '#6B7280') + '15' }}>
                    {cat?.emoji}
                  </div>
                )}
                <p className="text-xs font-medium truncate">{p.name}</p>
                <p className="text-sm font-sans font-bold text-primary">{p.sizes ? `Desde ${formatPrice(p.price)}` : formatPrice(p.price)}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p.id)} className="text-xs text-primary font-medium font-sans">Editar</button>
                    <button onClick={() => { if (window.confirm(`¿Eliminar "${p.name}"?`)) deleteProduct(p.id); }}
                      className="text-xs text-destructive font-medium font-sans">Eliminar</button>
                  </div>
                  <button onClick={() => toggleProductAvailability(p.id)}
                    className={cn('w-8 h-4 rounded-full relative transition-colors', p.available ? 'bg-success' : 'bg-muted')}>
                    <div className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-card shadow transition-transform', p.available ? 'left-4' : 'left-0.5')} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const cat = categories.find(c => c.id === p.categoryId);
            return (
              <div key={p.id} className={cn('bg-card rounded-xl border border-border shadow-card p-3 flex items-center gap-3', !p.available && 'opacity-50')}>
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: (cat?.color || '#6B7280') + '15' }}>
                    {cat?.emoji}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate font-sans">{p.name}</p>
                  <p className="text-xs text-muted-foreground font-sans">{cat?.name}</p>
                </div>
                <span className="font-sans font-bold text-sm">{p.sizes ? `Desde ${formatPrice(p.price)}` : formatPrice(p.price)}</span>
                <button onClick={() => openEdit(p.id)} className="text-xs text-primary font-medium font-sans">Editar</button>
                <button onClick={() => { if (window.confirm(`¿Eliminar "${p.name}"?`)) deleteProduct(p.id); }}
                  className="text-destructive"><Trash2 size={14} /></button>
                <button onClick={() => toggleProductAvailability(p.id)}
                  className={cn('w-8 h-4 rounded-full relative transition-colors shrink-0', p.available ? 'bg-success' : 'bg-muted')}>
                  <div className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-card shadow transition-transform', p.available ? 'left-4' : 'left-0.5')} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 z-50 flex items-end md:items-center justify-center font-sans" onClick={() => setShowForm(false)}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="bg-card rounded-t-2xl md:rounded-2xl w-full max-w-md p-5 max-h-[80vh] overflow-y-auto font-sans" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-sans font-bold text-lg">{editingId ? 'Editar' : 'Nuevo'} Producto</h2>
                <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X size={16} /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Nombre</label>
                  <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Descripción</label>
                  <input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                {formData.sizes.length === 0 && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Precio</label>
                    <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                )}
                {/* Sizes editor */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium">Tamaños / Variantes</label>
                    <button type="button" onClick={addSize} className="text-xs text-primary font-medium flex items-center gap-1">
                      <Plus size={12} /> Agregar
                    </button>
                  </div>
                  {formData.sizes.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground">Sin tamaños — precio único. Agrega tamaños si el producto tiene varias presentaciones.</p>
                  ) : (
                    <div className="space-y-2">
                      {formData.sizes.map((s, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input value={s.name} onChange={e => updateSize(i, 'name', e.target.value)} placeholder="Ej: Mediana"
                            className="flex-1 px-3 py-2 rounded-lg border border-input bg-card text-sm outline-none" />
                          <input type="number" value={s.price || ''} onChange={e => updateSize(i, 'price', e.target.value)} placeholder="Precio"
                            className="w-24 px-3 py-2 rounded-lg border border-input bg-card text-sm outline-none font-display" />
                          <button type="button" onClick={() => removeSize(i)} className="text-destructive shrink-0"><Trash2 size={14} /></button>
                        </div>
                      ))}
                      <p className="text-[10px] text-muted-foreground">El precio base será el menor de los tamaños.</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Categoría</label>
                  <select value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                  </select>
                </div>
                <button onClick={handleSave} disabled={!formData.name || !formData.price}
                  className="w-full py-2.5 rounded-lg gradient-primary text-primary-foreground font-display font-semibold text-sm disabled:opacity-40">
                  {editingId ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductsPage;
