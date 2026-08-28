import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { Save, Check, Plus, X, Edit2, Trash2 } from 'lucide-react';

const SettingsPage = () => {
  const { deliveryFee, tableCount, categories, user, addCategory, updateCategory, deleteCategory } = useStore();
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [editDeliveryFee, setEditDeliveryFee] = useState('');
  const [editTableCount, setEditTableCount] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Category form
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catName, setCatName] = useState('');
  const [catEmoji, setCatEmoji] = useState('');
  const [catColor, setCatColor] = useState('#6B7280');

  useEffect(() => {
    api.getSettings().then(s => {
      setBusinessName(s.businessName || 'Gia Gelatería');
      setBusinessPhone(s.businessPhone || '');
      setBusinessAddress(s.businessAddress || '');
      setEditDeliveryFee(String(s.deliveryFee || deliveryFee));
      setEditTableCount(String(s.tableCount || tableCount));
    }).catch(() => {
      setEditDeliveryFee(String(deliveryFee));
      setEditTableCount(String(tableCount));
    });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.updateSettings({
        businessName,
        businessPhone,
        businessAddress,
        deliveryFee: Number(editDeliveryFee),
        tableCount: Number(editTableCount),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Error saving settings:', err);
    }
    setLoading(false);
  };

  const openEditCat = (id: number) => {
    const c = categories.find(cat => cat.id === id);
    if (!c) return;
    setCatName(c.name);
    setCatEmoji(c.emoji);
    setCatColor(c.color);
    setEditingCatId(id);
    setShowCatForm(true);
  };

  const handleSaveCat = () => {
    if (!catName || !catEmoji) return;
    if (editingCatId) {
      updateCategory(editingCatId, { name: catName, emoji: catEmoji, color: catColor });
    } else {
      addCategory({ name: catName, emoji: catEmoji, color: catColor });
    }
    setShowCatForm(false);
    setEditingCatId(null);
    setCatName('');
    setCatEmoji('');
    setCatColor('#6B7280');
  };

  const handleDeleteCat = (id: number, name: string) => {
    if (window.confirm(`¿Eliminar categoría "${name}"? Los productos de esta categoría podrían quedar sin categoría.`)) {
      deleteCategory(id);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 font-sans">
      {/* Business */}
      <section className="bg-card rounded-xl border border-border p-4 shadow-card space-y-3">
        <h3 className="font-sans font-bold text-sm">🏪 Negocio</h3>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre del negocio / evento</label>
          <input value={businessName} onChange={e => setBusinessName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm font-sans outline-none focus:ring-2 focus:ring-primary/20" />
          <p className="text-[10px] text-muted-foreground mt-1 font-sans">Este nombre aparece en el header y en los recibos</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Teléfono</label>
          <input value={businessPhone} onChange={e => setBusinessPhone(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm font-sans outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Dirección</label>
          <input value={businessAddress} onChange={e => setBusinessAddress(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm font-sans outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
      </section>

      {/* Categories */}
      <section className="bg-card rounded-xl border border-border p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-sans font-bold text-sm">📂 Categorías</h3>
          <button onClick={() => { setEditingCatId(null); setCatName(''); setCatEmoji(''); setCatColor('#6B7280'); setShowCatForm(true); }}
            className="text-xs text-primary font-medium flex items-center gap-1 font-sans">
            <Plus size={14} /> Agregar
          </button>
        </div>
        <div className="space-y-2">
          {categories.map(c => (
            <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <span className="text-lg">{c.emoji}</span>
              <span className="text-sm font-medium flex-1 font-sans">{c.name}</span>
              <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              <button onClick={() => openEditCat(c.id)} className="text-muted-foreground hover:text-primary"><Edit2 size={14} /></button>
              <button onClick={() => handleDeleteCat(c.id, c.name)} className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        {/* Category form */}
        {showCatForm && (
          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2 font-sans">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">{editingCatId ? 'Editar' : 'Nueva'} categoría</p>
              <button onClick={() => setShowCatForm(false)}><X size={14} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-0.5 block">Emoji</label>
                <input value={catEmoji} onChange={e => setCatEmoji(e.target.value)} placeholder="🍨"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-center outline-none font-sans" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-muted-foreground mb-0.5 block">Nombre</label>
                <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Nombre"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm outline-none font-sans" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">Color</label>
              <input type="color" value={catColor} onChange={e => setCatColor(e.target.value)}
                className="w-full h-8 rounded-lg border border-input cursor-pointer" />
            </div>
            <button onClick={handleSaveCat} disabled={!catName || !catEmoji}
              className="w-full py-2 rounded-lg gradient-primary text-primary-foreground text-xs font-semibold disabled:opacity-40 font-sans">
              {editingCatId ? 'Guardar cambios' : 'Crear categoría'}
            </button>
          </div>
        )}
      </section>

      {/* User */}
      <section className="bg-card rounded-xl border border-border p-4 shadow-card font-sans">
        <h3 className="font-sans font-bold text-sm mb-2">👤 Usuario actual</h3>
        <p className="text-sm">{user?.name} <span className="text-xs text-muted-foreground capitalize">({user?.role})</span></p>
      </section>

      {/* Save button */}
      <button onClick={handleSave} disabled={loading}
        className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-sans font-bold text-sm shadow-fab hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
        {saved ? <><Check size={16} /> Guardado</> : loading ? 'Guardando...' : <><Save size={16} /> Guardar configuración</>}
      </button>

      <p className="text-center text-xs text-muted-foreground font-sans">Gia Gelatería POS v1.0</p>
    </div>
  );
};

export default SettingsPage;
