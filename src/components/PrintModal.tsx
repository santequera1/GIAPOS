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
  const total = order.total || Math.max(0, subtotal - discount);
  const impoconsumo = Math.round(total * 0.08);
  const baseGravable = total - impoconsumo;
  const docNumber = order.id ? `GIA-${order.id}` : 'GIA-1003';
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

    const widthMm = paperSize === '58mm' ? '54mm' : paperSize === '80mm' ? '72mm' : '100%';
    const pageCss = paperSize === '58mm' ? '58mm auto' : paperSize === '80mm' ? '80mm auto' : 'letter';

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Recibo ${docNumber}</title>
          <style>
            @page {
              size: ${pageCss};
              margin: 0mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace, sans-serif;
              font-size: 11px;
              color: #000;
              background: #fff;
              padding: 4mm 2mm;
              width: ${widthMm};
              margin: 0 auto;
              line-height: 1.25;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .logo-box {
              width: 55px;
              height: 55px;
              background-color: #242D49;
              border-radius: 8px;
              margin: 0 auto 6px auto;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 6px;
            }
            .logo-box img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
            .divider {
              border-top: 1px solid #000;
              margin: 6px 0;
            }
            .dashed {
              border-top: 1px dashed #444;
              margin: 6px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 4px 0;
              font-size: 10.5px;
            }
            th, td {
              padding: 2px 0;
            }
            .item-detail {
              font-size: 9.5px;
              color: #222;
              padding-left: 12px;
            }
          </style>
        </head>
        <body>
          <div class="text-center">
            <div class="logo-box">
              <img src="${window.location.origin}/logo/gia-logo-light.png" alt="GIA" />
            </div>
            <p class="font-bold" style="font-size: 13px; letter-spacing: 0.5px;">GIACARTAGENA SAS</p>
            <p style="font-size: 10px;">NIT: 901961461-3</p>
            <p style="font-size: 10px;">Dir.: CALLE BALOCO CENTRO</p>
            <p style="font-size: 10px;">Cartagena - tel. 3007856068</p>
          </div>

          <div class="divider"></div>

          <div class="text-center">
            <p class="font-bold" style="font-size: 11px;">Documento de ingreso No. ${docNumber}</p>
            <p style="font-size: 9.5px;">Fecha generación: ${formattedDate}, ${formattedTime}</p>
            <p style="font-size: 9.5px;">Fecha expedición: ${formattedDate}, ${formattedTime}</p>
            <p style="font-size: 8.5px; margin-top: 3px; color: #333;">
              Este documento no reemplaza la factura de venta ni el documento equivalente, es un soporte de uso contable.
            </p>
          </div>

          <div class="dashed"></div>

          <div style="font-size: 10px;">
            <p><strong>Cliente:</strong> ${order.customerName || order.customer?.name || 'Consumidor Final'}</p>
            <p><strong>C.C / NIT:</strong> ${order.customerDoc || order.customer?.documentId || '222222222222'}</p>
            <p><strong>Teléfono:</strong> ${order.customerPhone || order.customer?.phone || '3000000000'}</p>
            <p><strong>Vendedor:</strong> Elena C Vanegas</p>
          </div>

          <div class="dashed"></div>

          <table>
            <thead>
              <tr style="border-bottom: 1px dashed #000; font-size: 10px;">
                <th style="text-align: left; width: 12%;">Ít.</th>
                <th style="text-align: left; width: 18%;">Cant.</th>
                <th style="text-align: right; width: 35%;">Vr. Unit</th>
                <th style="text-align: right; width: 35%;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item: any, idx: number) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${item.quantity} UNI</td>
                  <td class="text-right">${formatPrice(item.price)}</td>
                  <td class="text-right font-bold">${formatPrice(item.price * item.quantity)}</td>
                </tr>
                <tr>
                  <td colspan="4" class="item-detail">${item.name} ${item.flavors ? '(' + item.flavors + ')' : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="dashed"></div>

          <div class="text-center font-bold" style="font-size: 10px; margin-bottom: 2px;">Impuestos</div>
          <table style="font-size: 9.5px;">
            <thead>
              <tr style="border-bottom: 1px dashed #666;">
                <th style="text-align: left;">ID</th>
                <th style="text-align: right;">%</th>
                <th style="text-align: right;">Base</th>
                <th style="text-align: right;">Impuesto</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>INC</td>
                <td class="text-right">8%</td>
                <td class="text-right">${formatPrice(baseGravable)}</td>
                <td class="text-right">${formatPrice(impoconsumo)}</td>
              </tr>
            </tbody>
          </table>

          <div class="divider"></div>

          <div style="font-size: 10.5px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Total Ítems:</span>
              <span class="font-bold">${items.reduce((a: number, i: any) => a + i.quantity, 0)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Subtotal:</span>
              <span>${formatPrice(subtotal)}</span>
            </div>
            ${discount > 0 ? `
              <div style="display: flex; justify-content: space-between; color: #c00;">
                <span>Descuento:</span>
                <span>-${formatPrice(discount)}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-top: 4px; border-top: 1px solid #000; padding-top: 3px;">
              <span>TOTAL A PAGAR:</span>
              <span>${formatPrice(total)}</span>
            </div>
            ${order.paymentMethod === 'mixed' || order.paymentSplit ? `
              <div style="margin-top: 3px; font-size: 10px; color: #444;">
                <div style="display: flex; justify-content: space-between;">
                  <span>Método de Pago:</span>
                  <span class="font-bold">Pago Mixto / Combinado</span>
                </div>
                ${order.paymentSplit ? `
                  <div style="padding-left: 8px; font-size: 9px; color: #333; margin-top: 2px;">
                    <div>• ${order.paymentSplit.method1 === 'cash' ? 'Efectivo' : order.paymentSplit.method1 === 'card_debit' ? 'Tarjeta Débito' : order.paymentSplit.method1 === 'card_credit' ? 'Tarjeta Crédito' : order.paymentSplit.method1 === 'transfer' ? 'QR / Transferencia' : 'Tarjeta'}: ${formatPrice(order.paymentSplit.amount1)}</div>
                    <div>• ${order.paymentSplit.method2 === 'cash' ? 'Efectivo' : order.paymentSplit.method2 === 'card_debit' ? 'Tarjeta Débito' : order.paymentSplit.method2 === 'card_credit' ? 'Tarjeta Crédito' : order.paymentSplit.method2 === 'transfer' ? 'QR / Transferencia' : 'Tarjeta'}: ${formatPrice(order.paymentSplit.amount2)}</div>
                  </div>
                ` : ''}
              </div>
            ` : `
              <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 3px; color: #444;">
                <span>Método de Pago:</span>
                <span class="font-bold">${order.paymentMethod === 'cash' ? 'Efectivo' : order.paymentMethod === 'card_debit' ? 'Tarjeta Débito' : order.paymentMethod === 'card_credit' ? 'Tarjeta Crédito' : order.paymentMethod === 'transfer' ? 'QR / Transferencia' : 'Tarjeta'}</span>
              </div>
            `}
            ${order.paymentMethod === 'cash' && order.cashReceived ? `
              <div style="display: flex; justify-content: space-between; font-size: 9.5px; color: #555;">
                <span>Recibido:</span>
                <span>${formatPrice(order.cashReceived)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 9.5px; color: #555;">
                <span>Cambio:</span>
                <span>${formatPrice(order.cashChange || 0)}</span>
              </div>
            ` : ''}
          </div>

          <div class="dashed" style="margin-top: 8px;"></div>
          <div class="text-center" style="font-size: 9px; color: #555;">
            <p class="font-bold">¡Gracias por disfrutar de Gia Gelatería!</p>
            <p>Cartagena de Indias, Colombia</p>
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
        document.body.removeChild(printFrame);
      }, 2000);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] font-sans animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between shrink-0 bg-white">
          <h2 className="font-bold text-lg text-[#242D49]">Configuración de impresión</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Paper Size Selector */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 shrink-0">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Elija el tamaño del papel en el que va a imprimir
          </label>
          <div className="relative">
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as any)}
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-gray-300 text-sm font-semibold text-[#242D49] focus:outline-none focus:ring-2 focus:ring-[#0091FF] focus:border-[#0091FF]"
            >
              <option value="80mm">80 mm (Estándar Impresora Térmica DIG-K200L)</option>
              <option value="58mm">58 mm (Mini Térmica)</option>
              <option value="letter">Carta / A4 (Hoja Completa)</option>
            </select>
          </div>
        </div>

        {/* Live Visual Preview (Siigo Style) */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-100 flex justify-center items-start">
          <div
            className="bg-white p-4 rounded-xl shadow-md border border-gray-300 text-left font-mono text-[11px] text-[#111] space-y-2.5 transition-all"
            style={{ width: paperSize === '58mm' ? '240px' : paperSize === '80mm' ? '290px' : '340px' }}
          >
            {/* Header with Navy Square Logo */}
            <div className="text-center pb-2 border-b border-gray-300">
              <div className="w-14 h-14 bg-[#242D49] rounded-xl flex items-center justify-center mx-auto mb-2 p-2 shadow-sm">
                <img src="/logo/gia-logo-light.png" alt="Gia" className="max-h-full max-w-full object-contain" />
              </div>
              <p className="font-bold text-sm tracking-wide text-[#242D49]">GIACARTAGENA SAS</p>
              <p className="text-[10px] text-gray-600">NIT: 901961461-3</p>
              <p className="text-[10px] text-gray-600">Dir.: CALLE BALOCO CENTRO</p>
              <p className="text-[10px] text-gray-600">Cartagena - tel. 3007856068</p>
            </div>

            {/* Document Info */}
            <div className="text-center py-1 border-b border-gray-300">
              <p className="font-bold text-xs text-[#242D49]">Documento de ingreso No. {docNumber}</p>
              <p className="text-[10px] text-gray-500">Fecha generación: {formattedDate}, {formattedTime}</p>
              <p className="text-[10px] text-gray-500">Fecha expedición: {formattedDate}, {formattedTime}</p>
              <p className="text-[9px] text-gray-400 mt-1 leading-tight">
                Este documento no reemplaza la factura de venta ni el documento equivalente, es un soporte de uso contable.
              </p>
            </div>

            {/* Customer Info */}
            <div className="text-[10.5px] space-y-0.5 border-b border-dashed border-gray-300 pb-2">
              <p><span className="font-bold">Cliente:</span> {order.customerName || order.customer?.name || 'Consumidor Final'}</p>
              <p><span className="font-bold">C.C / NIT:</span> {order.customerDoc || order.customer?.documentId || '222222222222'}</p>
              <p><span className="font-bold">Teléfono:</span> {order.customerPhone || order.customer?.phone || '3000000000'}</p>
              <p><span className="font-bold">Vendedor:</span> Elena C Vanegas</p>
            </div>

            {/* Items Table */}
            <div className="py-1 border-b border-dashed border-gray-300">
              <div className="flex justify-between font-bold text-[10px] border-b border-dashed border-gray-300 pb-1 mb-1">
                <span className="w-6">Ít.</span>
                <span className="w-12">Cant.</span>
                <span className="flex-1 text-right">Vr. Unit</span>
                <span className="w-20 text-right">Valor</span>
              </div>
              <div className="space-y-1.5">
                {items.map((item: any, idx: number) => (
                  <div key={idx} className="text-[10.5px]">
                    <div className="flex justify-between">
                      <span className="w-6">{idx + 1}</span>
                      <span className="w-12">{item.quantity} UNI</span>
                      <span className="flex-1 text-right text-gray-600">{formatPrice(item.price)}</span>
                      <span className="w-20 text-right font-bold">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                    <div className="text-[9.5px] text-gray-700 pl-6 truncate">
                      {item.name} {item.flavors ? `(${item.flavors})` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Taxes Table */}
            <div className="py-1 border-b border-gray-300">
              <p className="text-center font-bold text-[10px] mb-1">Impuestos</p>
              <div className="flex justify-between text-[9.5px] text-gray-600 border-b border-dashed border-gray-200 pb-0.5 mb-1">
                <span>ID</span>
                <span>%</span>
                <span className="text-right">Base</span>
                <span className="text-right">Impuesto</span>
              </div>
              <div className="flex justify-between text-[9.5px]">
                <span>INC</span>
                <span>8%</span>
                <span className="text-right">{formatPrice(baseGravable)}</span>
                <span className="text-right">{formatPrice(impoconsumo)}</span>
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1 pt-1 text-[11px]">
              <div className="flex justify-between">
                <span>Total Ítems:</span>
                <span className="font-bold">{items.reduce((a: number, i: any) => a + i.quantity, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Descuento:</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-gray-300 text-[#242D49]">
                <span>TOTAL:</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="pt-1 text-[10px] text-gray-600">
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
                  <div className="text-[9px] text-gray-500 pl-2 mt-0.5 space-y-0.5">
                    <div>• {order.paymentSplit.method1 === 'cash' ? 'Efectivo' : order.paymentSplit.method1 === 'card_debit' ? 'T. Débito' : order.paymentSplit.method1 === 'card_credit' ? 'T. Crédito' : 'Transferencia'}: {formatPrice(order.paymentSplit.amount1)}</div>
                    <div>• {order.paymentSplit.method2 === 'cash' ? 'Efectivo' : order.paymentSplit.method2 === 'card_debit' ? 'T. Débito' : order.paymentSplit.method2 === 'card_credit' ? 'T. Crédito' : 'Transferencia'}: {formatPrice(order.paymentSplit.amount2)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Button */}
        <div className="p-4 bg-white border-t border-gray-200 shrink-0">
          <button
            onClick={handlePrint}
            className="w-full py-3 rounded-xl bg-[#0091FF] hover:bg-[#0080E6] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.99]"
          >
            <Printer size={17} />
            <span>Exportar para impresión</span>
          </button>
        </div>
      </div>
    </div>
  );
};
