import React, { useState, useMemo } from 'react';
import { useStore, type Order } from '@/store/useStore';
import { formatPrice, getColombiaTodayStr, getColombiaYesterdayStr, getColombiaNow, getOrderDateStr } from '@/lib/format';
import {
  Search,
  Download,
  Printer,
  Calendar,
  Eye,
  CheckCircle2,
  X,
  FileText,
  BarChart3,
  Trash2,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { PrintModal } from '@/components/PrintModal';

type PeriodKey = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export const ReportsPage: React.FC = () => {
  const { orders, currentShift, user, deleteOrder } = useStore();

  const [activeTab, setActiveTab] = useState<'ventas' | 'graficas'>('ventas');
  const [period, setPeriod] = useState<PeriodKey>('today');
  const [search, setSearch] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    const todayStr = getColombiaTodayStr();
    const yesterdayStr = getColombiaYesterdayStr();
    const nowColombia = getColombiaNow();

    return orders.filter(o => {
      const orderDate = getOrderDateStr(o.createdAt);
      if (period === 'today' && orderDate !== todayStr) return false;
      if (period === 'yesterday' && orderDate !== yesterdayStr) return false;
      if (period === 'week') {
        const weekAgo = new Date(nowColombia);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const wStr = weekAgo.toISOString().split('T')[0];
        if (orderDate < wStr) return false;
      }
      if (period === 'month') {
        const monthAgo = new Date(nowColombia);
        monthAgo.setDate(monthAgo.getDate() - 30);
        const mStr = monthAgo.toISOString().split('T')[0];
        if (orderDate < mStr) return false;
      }
      if (period === 'custom') {
        if (customFrom && orderDate < customFrom) return false;
        if (customTo && orderDate > customTo) return false;
      }

      if (paymentFilter !== 'all' && o.paymentMethod !== paymentFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const docId = `gia-${o.id} #${o.id}`.toLowerCase();
        const clientName = (o.customer?.name || '').toLowerCase();
        const clientDoc = (o.customer?.doc || '').toLowerCase();
        const cashier = (currentShift?.cashierName || user?.name || '').toLowerCase();
        if (!docId.includes(q) && !clientName.includes(q) && !clientDoc.includes(q) && !cashier.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [orders, period, customFrom, customTo, paymentFilter, search, currentShift, user]);

  const metrics = useMemo(() => {
    const validOrders = filtered.filter(o => o.status !== 'cancelled');
    const cash = validOrders.filter(o => o.paymentMethod === 'cash').reduce((s, o) => s + o.total, 0);
    const debit = validOrders.filter(o => o.paymentMethod === 'card_debit').reduce((s, o) => s + o.total, 0);
    const credit = validOrders.filter(o => o.paymentMethod === 'card_credit').reduce((s, o) => s + o.total, 0);
    const cards = debit + credit;
    const transfer = validOrders.filter(o => o.paymentMethod === 'transfer').reduce((s, o) => s + o.total, 0);
    const totalSales = validOrders.reduce((s, o) => s + o.total, 0);
    const totalCount = validOrders.length;

    return {
      cash,
      debit,
      credit,
      cards,
      transfer,
      creditSales: 0,
      others: 0,
      refunds: 0,
      totalSales,
      totalCount,
    };
  }, [filtered]);

  const flavorStats = useMemo(() => {
    const counts: Record<string, { qty: number; revenue: number }> = {};
    filtered.forEach(o => {
      if (o.status === 'cancelled') return;
      o.items.forEach(i => {
        const key = i.flavors ? `${i.name} (${i.flavors})` : i.name;
        if (!counts[key]) counts[key] = { qty: 0, revenue: 0 };
        counts[key].qty += i.quantity;
        counts[key].revenue += i.price * i.quantity;
      });
    });
    return Object.entries(counts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [filtered]);

  const handleDeleteOrder = async (orderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`¿Estás seguro de eliminar permanentemente la orden GIA-${orderId}?`)) {
      return;
    }
    try {
      await deleteOrder(orderId);
      toast.success(`Orden GIA-${orderId} eliminada correctamente`);
      if (selectedInvoice?.id === orderId) {
        setSelectedInvoice(null);
      }
    } catch (err) {
      toast.error('Error al eliminar la orden');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Fecha', 'Comprobante', 'Tipo', 'Vendedor', 'Turno', 'Cliente', 'Doc Cliente', 'Total', 'Metodo Pago', 'Estado'];
    const rows = filtered.map(o => [
      o.createdAt,
      `GIA-${o.id}`,
      'Doc. de ingreso',
      currentShift?.cashierName || 'Caja Convención',
      currentShift?.id ? `#${currentShift.id}` : '#1',
      `"${o.customer?.name || 'Consumidor Final'}"`,
      o.customer?.doc || '222222222222',
      o.total,
      o.paymentMethod,
      o.status === 'delivered' ? 'Guardado' : o.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ventas_gia_${period}_${getColombiaTodayStr()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5 font-sans">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-sans font-bold text-2xl lg:text-3xl text-[#242D49]">
            Ventas e ingresos
          </h1>
          <p className="text-xs text-[#897863] mt-0.5 font-sans">
            Registro de comprobantes, facturas de ingreso y balances de venta
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-[#FAF8EA] p-1 rounded-2xl border border-[#364266]/10">
            <button
              onClick={() => setActiveTab('ventas')}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
                activeTab === 'ventas' ? 'bg-[#364266] text-[#FEF3DE] shadow-sm' : 'text-[#364266] hover:bg-white/60'
              )}
            >
              <FileText size={14} />
              <span>Comprobantes</span>
            </button>
            <button
              onClick={() => setActiveTab('graficas')}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
                activeTab === 'graficas' ? 'bg-[#364266] text-[#FEF3DE] shadow-sm' : 'text-[#364266] hover:bg-white/60'
              )}
            >
              <BarChart3 size={14} />
              <span>Estadísticas</span>
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#364266]/20 text-xs font-bold text-[#364266] hover:bg-[#FAF8EA] shadow-sm transition-all"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Descargar Excel</span>
          </button>
        </div>
      </div>

      {/* Top KPI Metrics Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#364266]/10 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-left">
          {/* Efectivo */}
          <div className="p-2 border-r border-gray-100 last:border-r-0">
            <span className="text-[11px] font-medium text-gray-500 block font-sans">Efectivo</span>
            <span className="text-sm lg:text-base font-bold font-sans text-[#242D49] block mt-0.5">
              {formatPrice(metrics.cash)}
            </span>
          </div>

          {/* Tarjetas */}
          <div className="p-2 border-r border-gray-100 last:border-r-0">
            <span className="text-[11px] font-medium text-gray-500 block font-sans">Tarjetas</span>
            <span className="text-sm lg:text-base font-bold font-sans text-[#242D49] block mt-0.5">
              {formatPrice(metrics.cards)}
            </span>
            <span className="text-[10px] text-gray-400 font-sans block">(Déb: {formatPrice(metrics.debit)})</span>
          </div>

          {/* Pagos en línea / QR */}
          <div className="p-2 border-r border-gray-100 last:border-r-0">
            <span className="text-[11px] font-medium text-gray-500 block font-sans">Pagos QR / Transferencia</span>
            <span className="text-sm lg:text-base font-bold font-sans text-[#242D49] block mt-0.5">
              {formatPrice(metrics.transfer)}
            </span>
          </div>

          {/* Crédito */}
          <div className="p-2 border-r border-gray-100 last:border-r-0">
            <span className="text-[11px] font-medium text-gray-500 block font-sans">Crédito</span>
            <span className="text-sm lg:text-base font-bold font-sans text-gray-400 block mt-0.5">
              $0,00
            </span>
          </div>

          {/* Otros */}
          <div className="p-2 border-r border-gray-100 last:border-r-0">
            <span className="text-[11px] font-medium text-gray-500 block font-sans">Otros</span>
            <span className="text-sm lg:text-base font-bold font-sans text-gray-400 block mt-0.5">
              $0,00
            </span>
          </div>

          {/* Devoluciones */}
          <div className="p-2 border-r border-gray-100 last:border-r-0">
            <span className="text-[11px] font-medium text-gray-500 block font-sans">Devoluciones</span>
            <span className="text-sm lg:text-base font-bold font-sans text-gray-400 block mt-0.5">
              $0,00
            </span>
          </div>

          {/* Total Ventas */}
          <div className="p-2 relative col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold font-sans text-[#242D49] block">Total ventas</span>
            <span className="text-base lg:text-lg font-extrabold font-sans text-[#242D49] block mt-0.5">
              {formatPrice(metrics.totalSales)}
            </span>
            <div className="w-full h-1 bg-[#364266] rounded-full mt-1.5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-3 border border-[#364266]/10 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por N° comprobante (ej. GIA-1003), cliente o vendedor..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#364266] font-sans"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Period Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(['today', 'yesterday', 'week', 'month'] as PeriodKey[]).map((p) => {
            const labels: Record<PeriodKey, string> = {
              today: 'Hoy',
              yesterday: 'Ayer',
              week: 'Esta semana',
              month: 'Este mes',
              custom: 'Personalizado',
            };
            const isSelected = period === p;
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all font-sans',
                  isSelected
                    ? 'bg-[#364266] text-[#FEF3DE] shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {labels[p]}
              </button>
            );
          })}

          <button
            onClick={() => setPeriod('custom')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 font-sans',
              period === 'custom'
                ? 'bg-[#364266] text-[#FEF3DE] shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <Calendar size={13} />
            <span>Rango</span>
          </button>

          {/* Payment Method Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 border border-gray-200 text-gray-700 font-sans"
          >
            <option value="all">Todos los pagos</option>
            <option value="cash">Efectivo</option>
            <option value="card_debit">Tarjeta Débito</option>
            <option value="card_credit">Tarjeta Crédito</option>
            <option value="transfer">QR / Transferencia</option>
          </select>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {period === 'custom' && (
        <div className="bg-[#FAF8EA] p-3 rounded-2xl border border-[#C6BF81]/40 flex items-center gap-3 text-xs font-sans">
          <span className="font-bold text-[#364266]">Desde:</span>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="p-1.5 rounded-lg border border-gray-300 bg-white"
          />
          <span className="font-bold text-[#364266]">Hasta:</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="p-1.5 rounded-lg border border-gray-300 bg-white"
          />
        </div>
      )}

      {/* TAB 1: Comprobantes Table (Gia Palette) */}
      {activeTab === 'ventas' && (
        <div className="bg-white rounded-2xl border border-[#364266]/10 shadow-sm overflow-hidden font-sans">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#242D49] text-[#FEF3DE] font-semibold">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Nro. Comprobante</th>
                  <th className="py-3 px-4">Tipo Comprobante</th>
                  <th className="py-3 px-4">Vendedor</th>
                  <th className="py-3 px-4">Turno</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4 text-right">Total Ventas</th>
                  <th className="py-3 px-4">Método de Pago</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-400">
                      No se encontraron comprobantes para el período seleccionado.
                    </td>
                  </tr>
                ) : (
                  filtered.map((order) => {
                    const formattedDate = new Date(order.createdAt).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-[#FAF8EA]/60 transition-colors group cursor-pointer"
                        onClick={() => setSelectedInvoice(order)}
                      >
                        {/* Fecha */}
                        <td className="py-3.5 px-4 text-gray-700 font-medium whitespace-nowrap font-sans">
                          {formattedDate}
                        </td>

                        {/* Nro Comprobante */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-[#364266] font-bold font-sans hover:underline">
                            GIA-{order.id}
                          </span>
                        </td>

                        {/* Tipo */}
                        <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap font-sans">
                          Doc. de ingreso
                        </td>

                        {/* Vendedor */}
                        <td className="py-3.5 px-4 text-gray-700 font-medium whitespace-nowrap font-sans">
                          {currentShift?.cashierName || 'Elena C Vanegas'}
                        </td>

                        {/* Turno */}
                        <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap font-sans">
                          {order.shiftId ? `${order.shiftId}` : '1'}
                        </td>

                        {/* Cliente */}
                        <td className="py-3.5 px-4 text-[#242D49] font-semibold truncate max-w-[150px] font-sans">
                          {order.customer?.name || 'Consumidor Final'}
                        </td>

                        {/* Total Ventas */}
                        <td className="py-3.5 px-4 text-right font-bold font-sans text-[#242D49] whitespace-nowrap">
                          {formatPrice(order.total)}
                        </td>

                        {/* Métodos de Pago */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FAF8EA] text-[#364266] border border-[#C6BF81]/40 font-sans">
                            {order.paymentMethod === 'cash' ? 'Efectivo' :
                             order.paymentMethod === 'card_debit' ? 'Tarjeta Débito' :
                             order.paymentMethod === 'card_credit' ? 'Tarjeta Crédito' : 'Transferencia QR'}
                          </span>
                        </td>

                        {/* Estado */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px] font-sans">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            Guardado
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedInvoice(order)}
                              className="p-1.5 rounded-lg hover:bg-[#FAF8EA] text-[#364266] transition-colors"
                              title="Ver Factura"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedInvoice(order);
                                setTimeout(() => window.print(), 200);
                              }}
                              className="p-1.5 rounded-lg hover:bg-[#FAF8EA] text-[#364266] transition-colors"
                              title="Imprimir"
                            >
                              <Printer size={15} />
                            </button>
                            {user?.role === 'admin' && (
                              <button
                                onClick={(e) => handleDeleteOrder(order.id, e)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                                title="Eliminar Comprobante (Admin)"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-sans">
            <span>Mostrando {filtered.length} registro(s)</span>
            <span>Total Filtrado: <strong>{formatPrice(metrics.totalSales)}</strong></span>
          </div>
        </div>
      )}

      {/* TAB 2: Gráficas y Estadísticas */}
      {activeTab === 'graficas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 font-sans">
          {/* Top Flavors Sold */}
          <div className="bg-white rounded-2xl p-5 border border-[#364266]/10 shadow-sm">
            <h3 className="font-bold text-base text-[#242D49] mb-4">Sabores más vendidos en el período</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flavorStats} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any) => [`${val} unidades`, 'Cantidad']} />
                  <Bar dataKey="qty" fill="#364266" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Methods Distribution */}
          <div className="bg-white rounded-2xl p-5 border border-[#364266]/10 shadow-sm">
            <h3 className="font-bold text-base text-[#242D49] mb-4">Distribución por Método de Pago</h3>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Efectivo', value: metrics.cash, color: '#364266' },
                      { name: 'T. Débito', value: metrics.debit, color: '#242D49' },
                      { name: 'T. Crédito', value: metrics.credit, color: '#C6BF81' },
                      { name: 'QR / Transferencia', value: metrics.transfer, color: '#897863' },
                    ].filter(d => d.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.name}: ${formatPrice(entry.value)}`}
                  >
                    {[
                      { color: '#364266' },
                      { color: '#242D49' },
                      { color: '#C6BF81' },
                      { color: '#897863' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatPrice(Number(val))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Invoice Print Modal */}
      <PrintModal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        order={selectedInvoice}
      />
    </div>
  );
};

export default ReportsPage;
