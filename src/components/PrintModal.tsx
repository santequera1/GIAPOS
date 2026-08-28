import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { formatPrice } from '@/lib/format';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
}

export const PrintModal: React.FC<PrintModalProps> = ({ isOpen, onClose, order }) => {
  const [paperSize, setPaperSize] = useState<'80mm' | '58mm' | 'letter'>('80mm');

  if (!isOpen || !order) return null;

  const items = order.items || [];
  const subtotal = order.subtotal || items.reduce((a: number, i: any) => a + i.price * i.quantity, 0);
  const discount = order.discount || 0;
  const total = order.total !== undefined ? order.total : Math.max(0, subtotal - discount);
  const impoconsumo = Math.round(total * 0.08);
  const baseGravable = total - impoconsumo;
  const docNumber = order.id ? `GIA-${order.id}` : 'GIA-1001';
  const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();

  const formattedDate = orderDate.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = orderDate.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handlePrint = () => {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) return;

    const widthCss = paperSize === '58mm' ? '48mm' : paperSize === '80mm' ? '70mm' : '100%';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Recibo ${docNumber}</title>
          <style>
            @page {
              margin: 0;
              size: auto;
            }
            @media print {
              html, body {
                width: ${widthCss};
                margin: 0 auto;
                padding: 1.5mm 0mm;
                height: auto !important;
                min-height: 0 !important;
                overflow: visible !important;
              }
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, monospace, sans-serif;
              font-size: 10px;
              color: #000;
              background: #fff;
              width: ${widthCss};
              margin: 0 auto;
              padding: 1.5mm 0mm;
              line-height: 1.15;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .logo-box {
              width: 38px;
              height: 38px;
              background-color: #242D49;
              border-radius: 6px;
              margin: 0 auto 3px auto;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 3px;
            }
            .logo-box img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
            .divider {
              border-top: 1px solid #000;
              margin: 3px 0;
            }
            .dashed {
              border-top: 1px dashed #333;
              margin: 3px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 2px 0;
              font-size: 9.5px;
            }
            th, td {
              padding: 1px 0;
            }
            .item-detail {
              font-size: 8.5px;
              color: #222;
              padding-left: 8px;
            }
          </style>
        </head>
        <body>
          <div class="text-center">
            <div class="logo-box">
              <img src="${window.location.origin}/logo/gia-logo-light.png" alt="GIA" />
            </div>
            <p class="font-bold" style="font-size: 11px; letter-spacing: 0.5px;">GIACARTAGENA SAS</p>
            <p style="font-size: 8.5px;">NIT: 901961461-3 • CALLE BALOCO CENTRO</p>
            <p style="font-size: 8.5px;">Cartagena - Tel: 3007856068</p>
          </div>

          <div class="divider"></div>

          <div class="text-center">
            <p class="font-bold" style="font-size: 10px;">Doc. Ingreso No. ${docNumber}</p>
            <p style="font-size: 8.5px;">${formattedDate} ${formattedTime}</p>
          </div>

          <div class="dashed"></div>

          <div style="font-size: 9px;">
            <p><strong>Cliente:</strong> ${order.customerName || order.customer?.name || 'Consumidor Final'}</p>
            <p><strong>C.C / NIT:</strong> ${order.customerDoc || order.customer?.documentId || order.customer?.doc || '222222222222'}</p>
          </div>

          <div class="dashed"></div>

          <table>
            <thead>
              <tr style="border-bottom: 1px dashed #000; font-size: 9px;">
                <th style="text-align: left; width: 14%;">Cant.</th>
                <th style="text-align: left; width: 46%;">Producto</th>
                <th style="text-align: right; width: 40%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item: any) => `
                <tr>
                  <td class="font-bold">${item.quantity}x</td>
                  <td>${item.name}</td>
                  <td class="text-right font-bold">${formatPrice(item.price * item.quantity)}</td>
                </tr>
                ${item.flavors ? `<tr><td colspan="3" class="item-detail">• ${item.flavors}</td></tr>` : ''}
              `).join('')}
            </tbody>
          </table>

          <div class="dashed"></div>

          <div style="font-size: 9.5px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Subtotal:</span>
              <span>${formatPrice(subtotal)}</span>
            </div>
            ${discount > 0 ? `
              <div style="display: flex; justify-content: space-between; color: #000; font-weight: bold;">
                <span>Descuento Aplicado:</span>
                <span>-${formatPrice(discount)}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-top: 2px; border-top: 1px solid #000; padding-top: 2px;">
              <span>TOTAL:</span>
              <span>${formatPrice(total)}</span>
            </div>
            ${order.paymentMethod === 'mixed' || order.paymentSplit ? `
              <div style="margin-top: 2px; font-size: 8.5px;">
                <div style="display: flex; justify-content: space-between;">
                  <span>Pago Mixto:</span>
                  <span class="font-bold">${formatPrice(total)}</span>
                </div>
                ${order.paymentSplit ? `
                  <div style="padding-left: 6px; font-size: 8px;">
                    <div>• ${order.paymentSplit.method1 === 'cash' ? 'Efectivo' : order.paymentSplit.method1 === 'card_debit' ? 'T. Débito' : order.paymentSplit.method1 === 'card_credit' ? 'T. Crédito' : 'QR / Transf'}: ${formatPrice(order.paymentSplit.amount1)}</div>
                    <div>• ${order.paymentSplit.method2 === 'cash' ? 'Efectivo' : order.paymentSplit.method2 === 'card_debit' ? 'T. Débito' : order.paymentSplit.method2 === 'card_credit' ? 'T. Crédito' : 'QR / Transf'}: ${formatPrice(order.paymentSplit.amount2)}</div>
                  </div>
                ` : ''}
              </div>
            ` : `
              <div style="display: flex; justify-content: space-between; font-size: 9px; margin-top: 2px;">
                <span>Pago:</span>
                <span class="font-bold">${order.paymentMethod === 'cash' ? 'Efectivo' : order.paymentMethod === 'card_debit' ? 'T. Débito' : order.paymentMethod === 'card_credit' ? 'T. Crédito' : order.paymentMethod === 'transfer' ? 'QR / Nequi' : 'Tarjeta'}</span>
              </div>
            `}
            ${order.paymentMethod === 'cash' && order.cashReceived ? `
              <div style="display: flex; justify-content: space-between; font-size: 8.5px;">
                <span>Recibido: ${formatPrice(order.cashReceived)}</span>
                <span>Cambio: ${formatPrice(order.cashChange || 0)}</span>
              </div>
            ` : ''}
          </div>

          <div class="dashed" style="margin-top: 4px;"></div>
          <div class="text-center" style="font-size: 8.5px; margin-top: 2px;">
            <p class="font-bold">¡Gracias por su compra en Gia!</p>
          </div>
        </body>
      </html>
    `;

    frameDoc.open();
    frameDoc.write(htmlContent);
    frameDoc.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 2000);
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] font-sans animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between shrink-0 bg-white">
          <h2 className="font-bold text-base sm:text-lg text-[#242D49]">Configuración de impresión</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Paper Size Selector */}
        <div className="p-3.5 bg-gray-50 border-b border-gray-200 shrink-0">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Tamaño de impresión (Optimizado para rollo térmico)
          </label>
          <div className="relative">
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as any)}
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-gray-300 text-xs sm:text-sm font-semibold text-[#242D49] focus:outline-none focus:ring-2 focus:ring-[#0091FF]"
            >
              <option value="80mm">80 mm (Estándar Térmica - Corto Ahorro Papel)</option>
              <option value="58mm">58 mm (Mini Térmica)</option>
              <option value="letter">Carta / A4</option>
            </select>
          </div>
        </div>

        {/* Live Visual Preview (Compact Ticket) */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-100 flex justify-center items-start">
          <div
            className="bg-white p-3.5 rounded-xl shadow-md border border-gray-300 text-left font-mono text-[10.5px] text-[#111] space-y-2 transition-all"
            style={{ width: paperSize === '58mm' ? '220px' : paperSize === '80mm' ? '260px' : '300px' }}
          >
            {/* Header with Navy Square Logo */}
            <div className="text-center pb-1.5 border-b border-gray-300">
              <div className="w-10 h-10 bg-[#242D49] rounded-lg flex items-center justify-center mx-auto mb-1 p-1.5 shadow-sm">
                <img src="/logo/gia-logo-light.png" alt="Gia" className="max-h-full max-w-full object-contain" />
              </div>
              <p className="font-bold text-xs tracking-wide text-[#242D49]">GIACARTAGENA SAS</p>
              <p className="text-[9px] text-gray-600">NIT: 901961461-3 • CALLE BALOCO</p>
              <p className="text-[9px] text-gray-600">Cartagena - Tel: 3007856068</p>
            </div>

            {/* Document Info */}
            <div className="text-center py-0.5 border-b border-gray-300">
              <p className="font-bold text-[11px] text-[#242D49]">Doc. Ingreso No. {docNumber}</p>
              <p className="text-[9px] text-gray-500">{formattedDate} {formattedTime}</p>
            </div>

            {/* Customer Info */}
            <div className="text-[9.5px] space-y-0.5 border-b border-dashed border-gray-300 pb-1.5">
              <p><span className="font-bold">Cliente:</span> {order.customerName || order.customer?.name || 'Consumidor Final'}</p>
              <p><span className="font-bold">C.C / NIT:</span> {order.customerDoc || order.customer?.documentId || order.customer?.doc || '222222222222'}</p>
            </div>

            {/* Items Table */}
            <div className="py-1 border-b border-dashed border-gray-300">
              <div className="flex justify-between font-bold text-[9px] border-b border-dashed border-gray-300 pb-0.5 mb-1">
                <span className="w-8">Cant.</span>
                <span className="flex-1">Producto</span>
                <span className="w-16 text-right">Total</span>
              </div>
              <div className="space-y-1">
                {items.map((item: any, idx: number) => (
                  <div key={idx} className="text-[9.5px]">
                    <div className="flex justify-between">
                      <span className="w-8 font-bold">{item.quantity}x</span>
                      <span className="flex-1 truncate">{item.name}</span>
                      <span className="w-16 text-right font-bold">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                    {item.flavors && (
                      <div className="text-[8.5px] text-gray-600 pl-4 truncate">
                        • {item.flavors}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-0.5 pt-1 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between font-bold text-red-600">
                  <span>Descuento:</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-gray-300 text-[#242D49]">
                <span>TOTAL:</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="pt-0.5 text-[9px] text-gray-600">
                <div className="flex justify-between">
                  <span>Pago:</span>
                  <span className="font-semibold text-gray-800">
                    {order.paymentMethod === 'mixed' || order.paymentSplit
                      ? 'Mixto / Combinado'
                      : order.paymentMethod === 'cash'
                      ? 'Efectivo'
                      : order.paymentMethod === 'card_debit'
                      ? 'T. Débito'
                      : order.paymentMethod === 'card_credit'
                      ? 'T. Crédito'
                      : order.paymentMethod === 'transfer'
                      ? 'QR / Nequi'
                      : 'Tarjeta'}
                  </span>
                </div>
                {order.paymentSplit && (
                  <div className="text-[8.5px] text-gray-500 pl-2">
                    <div>• {order.paymentSplit.method1 === 'cash' ? 'Efectivo' : order.paymentSplit.method1 === 'card_debit' ? 'T. Débito' : order.paymentSplit.method1 === 'card_credit' ? 'T. Crédito' : 'Transferencia'}: {formatPrice(order.paymentSplit.amount1)}</div>
                    <div>• {order.paymentSplit.method2 === 'cash' ? 'Efectivo' : order.paymentSplit.method2 === 'card_debit' ? 'T. Débito' : order.paymentSplit.method2 === 'card_credit' ? 'T. Crédito' : 'Transferencia'}: {formatPrice(order.paymentSplit.amount2)}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="text-center pt-1 border-t border-dashed border-gray-300 text-[8.5px] text-gray-500">
              ¡Gracias por su compra en Gia!
            </div>
          </div>
        </div>

        {/* Footer Action Button */}
        <div className="p-3.5 bg-white border-t border-gray-200 shrink-0">
          <button
            onClick={handlePrint}
            className="w-full py-3 rounded-xl bg-[#0091FF] hover:bg-[#0080E6] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.99]"
          >
            <Printer size={17} />
            <span>Imprimir Ticket Corto</span>
          </button>
        </div>
      </div>
    </div>
  );
};
