import { formatPrice, formatFullDate } from './format';

export interface PrintOptions {
  paperSize?: '80mm' | '58mm';
  autoPrint?: boolean;
}

export function printThermal(htmlContent: string, title = 'Impresión POS'): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const existing = document.getElementById('pos-print-iframe');
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'pos-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '320px';
      iframe.style.height = '600px';
      iframe.style.border = '0';
      iframe.style.opacity = '0.001';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc) {
        fallbackPopupPrint(htmlContent, title);
        resolve(true);
        return;
      }

      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();

      const doPrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 3000);
          resolve(true);
        } catch (e) {
          console.warn('Iframe print failed, fallback to popup', e);
          fallbackPopupPrint(htmlContent, title);
          resolve(true);
        }
      };

      setTimeout(doPrint, 200);
    } catch (err) {
      console.warn('Primary print failed, popup fallback', err);
      fallbackPopupPrint(htmlContent, title);
      resolve(true);
    }
  });
}

function fallbackPopupPrint(htmlContent: string, title: string) {
  const win = window.open('', '_blank', 'width=380,height=600,menubar=no,toolbar=no,location=no,status=no');
  if (win) {
    win.document.open();
    win.document.write(htmlContent);
    win.document.close();
    win.focus();
    setTimeout(() => {
      try {
        win.print();
      } catch (e) {}
    }, 300);
  }
}

export function generateSalesTicketHtml(order: any, options: PrintOptions = {}): string {
  const paperSize = options.paperSize || '80mm';
  const widthCss = paperSize === '58mm' ? '48mm' : '72mm';
  const fontSize = paperSize === '58mm' ? '9px' : '10.5px';

  const items = order.items || [];
  const subtotal = order.subtotal || items.reduce((a: number, i: any) => a + (i.price || 0) * (i.quantity || 1), 0);
  const discount = order.discount || 0;
  const total = order.total !== undefined ? order.total : Math.max(0, subtotal - discount);
  const docNumber = order.id ? `GIA-${order.id}` : 'GIA-1001';

  const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const formattedDate = orderDate.toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = orderDate.toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
  });

  const customerName = order.customerName || order.customer?.name || 'Consumidor Final';
  const customerDoc = order.customerDoc || order.customer?.documentId || order.customer?.doc || '222222222222';

  let paymentMethodLabel = 'Efectivo';
  if (order.paymentMethod === 'mixed' || order.paymentSplit) paymentMethodLabel = 'Mixto / Combinado';
  else if (order.paymentMethod === 'card_debit') paymentMethodLabel = 'T. Débito';
  else if (order.paymentMethod === 'card_credit') paymentMethodLabel = 'T. Crédito';
  else if (order.paymentMethod === 'transfer') paymentMethodLabel = 'QR / Nequi';
  else if (order.paymentMethod === 'card') paymentMethodLabel = 'Tarjeta';

  return `
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
          *, *:before, *:after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          html, body {
            width: ${widthCss};
            max-width: ${widthCss};
            background: #fff;
            color: #000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace, sans-serif;
            font-size: ${fontSize};
            line-height: 1.2;
            margin: 0;
            padding: 0;
          }
          .ticket {
            width: ${widthCss};
            max-width: ${widthCss};
            padding: 2mm 1mm 4mm 1mm;
            margin: 0 auto;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .font-bold { font-weight: bold; }
          .divider { border-top: 1px solid #000; margin: 3px 0; }
          .dashed { border-top: 1px dashed #333; margin: 3px 0; }
          .row { display: flex; justify-content: space-between; align-items: flex-start; margin: 1.5px 0; }
          .item-desc { font-weight: 600; word-break: break-word; }
          .item-flavors { font-size: 8.5px; color: #333; padding-left: 6px; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="text-center">
            <p class="font-bold" style="font-size: 13px; letter-spacing: 0.5px;">GIACARTAGENA SAS</p>
            <p class="font-bold" style="font-size: 11px;">GIA GELATERÍA ARTESANAL</p>
            <p style="font-size: 9px;">NIT: 901961461-3 • CALLE BALOCO</p>
            <p style="font-size: 9px;">Cartagena - Tel: 3007856068</p>
          </div>

          <div class="divider"></div>

          <div class="text-center" style="font-size: 9.5px;">
            <p class="font-bold">DOC. INGRESO No. ${docNumber}</p>
            <p style="font-size: 8.5px;">${formattedDate} • ${formattedTime}</p>
          </div>

          <div class="dashed"></div>

          <div style="font-size: 9px; margin-bottom: 2px;">
            <div class="row"><span><strong>Cliente:</strong> ${customerName}</span></div>
            <div class="row"><span><strong>C.C / NIT:</strong> ${customerDoc}</span></div>
          </div>

          <div class="divider"></div>

          <div style="margin-bottom: 2px;">
            <div class="row font-bold" style="font-size: 9px; border-bottom: 1px dashed #666; padding-bottom: 2px;">
              <span style="width: 25px;">Cant</span>
              <span style="flex: 1; text-align: left;">Producto</span>
              <span style="width: 55px; text-align: right;">Total</span>
            </div>
            ${items.map((item: any) => `
              <div style="margin: 2px 0;">
                <div class="row" style="font-size: ${fontSize};">
                  <span style="width: 25px; font-weight: bold;">${item.quantity || 1}x</span>
                  <span style="flex: 1; text-align: left;" class="item-desc">${item.name}</span>
                  <span style="width: 55px; text-align: right; font-weight: bold;">${formatPrice((item.price || 0) * (item.quantity || 1))}</span>
                </div>
                ${item.flavors ? `<div class="item-flavors">• ${item.flavors}</div>` : ''}
              </div>
            `).join('')}
          </div>

          <div class="divider"></div>

          <div style="font-size: 9.5px;">
            <div class="row"><span>Subtotal:</span><span>${formatPrice(subtotal)}</span></div>
            ${discount > 0 ? `<div class="row font-bold" style="color: #000;"><span>Descuento:</span><span>-${formatPrice(discount)}</span></div>` : ''}
            <div class="row font-bold" style="font-size: 12px; margin-top: 3px; border-top: 1px solid #000; padding-top: 2px;">
              <span>TOTAL A PAGAR:</span>
              <span>${formatPrice(total)}</span>
            </div>
            <div class="row" style="font-size: 9px; margin-top: 2px;">
              <span>Forma de Pago:</span>
              <span class="font-bold">${paymentMethodLabel}</span>
            </div>
            ${order.paymentSplit ? `
              <div style="font-size: 8.5px; padding-left: 6px;">
                <div>• ${order.paymentSplit.method1 === 'cash' ? 'Efectivo' : order.paymentSplit.method1 === 'card_debit' ? 'T. Débito' : order.paymentSplit.method1 === 'card_credit' ? 'T. Crédito' : 'Transferencia'}: ${formatPrice(order.paymentSplit.amount1)}</div>
                <div>• ${order.paymentSplit.method2 === 'cash' ? 'Efectivo' : order.paymentSplit.method2 === 'card_debit' ? 'T. Débito' : order.paymentSplit.method2 === 'card_credit' ? 'T. Crédito' : 'Transferencia'}: ${formatPrice(order.paymentSplit.amount2)}</div>
              </div>
            ` : ''}
            ${order.paymentMethod === 'cash' && order.cashReceived > 0 ? `
              <div class="row" style="font-size: 8.5px;"><span>Recibido:</span><span>${formatPrice(order.cashReceived)}</span></div>
              <div class="row" style="font-size: 8.5px;"><span>Cambio / Vueltas:</span><span>${formatPrice(order.cashChange || (order.cashReceived - total))}</span></div>
            ` : ''}
          </div>

          <div class="dashed" style="margin-top: 5px;"></div>

          <div class="text-center" style="font-size: 8.5px; margin-top: 3px; line-height: 1.3;">
            <p class="font-bold">¡Gracias por su visita a Gia Gelatería!</p>
            <p>Auténtico Gelato Italiano en Cartagena</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function generateZReportHtml(shiftData: any, options: PrintOptions & { isReportX?: boolean } = {}): string {
  const paperSize = options.paperSize || '80mm';
  const widthCss = paperSize === '58mm' ? '48mm' : '72mm';
  const fontSize = paperSize === '58mm' ? '9px' : '10px';

  const shiftId = shiftData.id || 1;
  const cashier = shiftData.cashierName || shiftData.cashier_name || 'Cajero Gia';
  const initial = shiftData.initialCash !== undefined ? shiftData.initialCash : shiftData.initial_cash || 0;
  const cash = shiftData.cashSales !== undefined ? shiftData.cashSales : shiftData.cash_sales || 0;
  const withdrawals = shiftData.totalWithdrawals !== undefined ? shiftData.totalWithdrawals : shiftData.total_withdrawals || 0;
  const debit = shiftData.debitSales !== undefined ? shiftData.debitSales : shiftData.debit_sales || 0;
  const credit = shiftData.creditSales !== undefined ? shiftData.creditSales : shiftData.credit_sales || 0;
  const transfer = shiftData.transferSales !== undefined ? shiftData.transferSales : shiftData.transfer_sales || 0;
  const totalSales = shiftData.totalSales !== undefined ? shiftData.totalSales : shiftData.total_sales || 0;
  const totalOrders = shiftData.totalOrders !== undefined ? shiftData.totalOrders : shiftData.total_orders || 0;
  const expected = shiftData.expectedCash !== undefined ? shiftData.expectedCash : (initial + cash - withdrawals);
  const actual = shiftData.actualCash !== undefined ? shiftData.actualCash : shiftData.actual_cash || 0;
  const diff = shiftData.difference !== undefined ? shiftData.difference : (actual - expected);

  const dateStr = formatFullDate(shiftData.closedAt || shiftData.closed_at || shiftData.openedAt || shiftData.opened_at || new Date().toISOString());
  const reportTitle = options.isReportX ? 'CORTE PARCIAL (REPORTE X)' : 'CIERRE DE CAJA (REPORTE Z)';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Reporte Turno #${shiftId}</title>
        <style>
          @page {
            margin: 0;
            size: auto;
          }
          *, *:before, *:after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          html, body {
            width: ${widthCss};
            max-width: ${widthCss};
            background: #fff;
            color: #000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace, sans-serif;
            font-size: ${fontSize};
            line-height: 1.2;
            margin: 0;
            padding: 0;
          }
          .ticket {
            width: ${widthCss};
            max-width: ${widthCss};
            padding: 2mm 1mm 4mm 1mm;
            margin: 0 auto;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .divider { border-top: 1px solid #000; margin: 3px 0; }
          .dashed { border-top: 1px dashed #333; margin: 3px 0; }
          .row { display: flex; justify-content: space-between; margin: 1.5px 0; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="text-center">
            <p class="font-bold" style="font-size: 12.5px; letter-spacing: 0.5px;">GIACARTAGENA SAS</p>
            <p class="font-bold" style="font-size: 11px;">GIA GELATERÍA ARTESANAL</p>
            <p style="font-size: 8.5px;">NIT: 901961461-3 • CALLE BALOCO</p>
            <p class="font-bold" style="font-size: 10px; margin-top: 3px; border: 1px solid #000; padding: 2px 4px; display: inline-block;">
              ${reportTitle}
            </p>
          </div>

          <div class="divider"></div>

          <div style="font-size: 9px;">
            <div class="row"><span><strong>Turno ID:</strong> #${shiftId}</span><span>${dateStr}</span></div>
            <div class="row"><span><strong>Cajero:</strong> ${cashier}</span><span><strong>Pedidos:</strong> ${totalOrders}</span></div>
          </div>

          <div class="divider"></div>

          <div style="font-size: 9.5px;">
            <p class="font-bold" style="font-size: 9px; text-decoration: underline; margin-bottom: 2px;">VENTAS POR MEDIO DE PAGO:</p>
            <div class="row"><span>Ventas Efectivo:</span><span class="font-bold">+${formatPrice(cash)}</span></div>
            <div class="row"><span>Ventas T. Débito:</span><span>${formatPrice(debit)}</span></div>
            <div class="row"><span>Ventas T. Crédito:</span><span>${formatPrice(credit)}</span></div>
            <div class="row"><span>Ventas QR / Nequi:</span><span>${formatPrice(transfer)}</span></div>
            <div class="row font-bold" style="font-size: 11px; margin-top: 3px; border-top: 1px solid #000; padding-top: 2px;">
              <span>TOTAL VENTAS:</span>
              <span>${formatPrice(totalSales)}</span>
            </div>
          </div>

          <div class="dashed"></div>

          <div style="font-size: 9.5px;">
            <p class="font-bold" style="font-size: 9px; text-decoration: underline; margin-bottom: 2px;">ARQUEO Y CUADRE DE GAVETA:</p>
            <div class="row"><span>Base Inicial en Caja:</span><span>${formatPrice(initial)}</span></div>
            <div class="row"><span>+ Efectivo por Ventas:</span><span>${formatPrice(cash)}</span></div>
            ${withdrawals > 0 ? `<div class="row font-bold" style="color: #000;"><span>- Retiros / Gastos:</span><span>-${formatPrice(withdrawals)}</span></div>` : ''}
            <div class="row font-bold" style="font-size: 10px; border-top: 1px dashed #666; padding-top: 2px;">
              <span>= Efectivo Esperado:</span>
              <span>${formatPrice(expected)}</span>
            </div>
            <div class="row font-bold" style="font-size: 10px;">
              <span>= Efectivo Contado:</span>
              <span>${formatPrice(actual)}</span>
            </div>
            <div class="row font-bold" style="font-size: 10.5px; margin-top: 2px; border-top: 1px solid #000; padding-top: 2px;">
              <span>DIFERENCIA CAJA:</span>
              <span>${diff === 0 ? 'Exacto ($0)' : diff > 0 ? '+' + formatPrice(diff) + ' (Sobrante)' : formatPrice(diff) + ' (Faltante)'}</span>
            </div>
          </div>

          <div class="divider"></div>

          <div style="margin-top: 8px; padding-top: 4px; text-align: center; font-size: 8.5px;">
            <div style="border-bottom: 1px solid #000; width: 60%; margin: 15px auto 4px auto;"></div>
            <p>Firma Cajero / Responsable</p>
            <p style="margin-top: 4px; font-size: 8px; color: #444;">Gia Gelatería POS • Sistema de Facturación</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
