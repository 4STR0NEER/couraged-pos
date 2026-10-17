// Prints a receipt through the browser. On the POS PC Chrome runs with --kiosk-printing,
// so window.print() goes straight to the default (Xprinter) printer with no dialog.
// Only the receipt is printed: it renders into its own hidden iframe, never the app page.
// No @page size on purpose: when a requested size differs from the driver's paper (XP-58: 58(48) x 210mm
// or the 3276mm roll), Chrome scales and centres the receipt on it, giving blank paper / a fed roll.
// Without a size the receipt starts at the top edge; the driver's paper length decides where it stops.
import { money } from './util.js'
import { RECEIPT } from '../config/receipt.js'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const row = (l, r, cls = '') => `<div class="row ${cls}"><span>${esc(l)}</span><span>${esc(r)}</span></div>`

// receipt: { storeName, headerLines[], footerLines[], paperWidth (58|80), receiptNo, date, cashier, customer,
//   items[{ name, qty, lineTotal }], subtotal, discount, total,
//   paymentMethod (label), paymentRef, cash, change, banner (e.g. 'REPRINT', 'VOIDED') }
export function receiptHtml(r) {
  const mm = r.paperWidth === 58 ? 48 : 72 // printable width inside 58mm / 80mm paper (384 / 576 dots at 203 dpi)
  // Plain black text only: no images, filters, backgrounds or shadows, so Chrome sends simple text to the driver.
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@page { margin: 0 }
* { color: #000; background: none; box-shadow: none; text-shadow: none }
html, body { margin: 0; padding: 0 }
body { width: ${mm}mm; padding: 1mm 0 4mm; font: 9pt/1.3 Arial, Helvetica, sans-serif }
.c { text-align: center } .b { font-weight: 700 } .big { font-size: 11pt }
.row { display: flex; justify-content: space-between } .row span:first-child { overflow-wrap: anywhere; padding-right: 2mm }
.row span:last-child { white-space: nowrap }
hr { border: 0; border-top: 1px dashed #000; margin: 1.5mm 0 }
</style></head><body>
${r.banner ? `<div class="c b big">*** ${esc(r.banner)} ***</div>` : ''}
<div class="c b big">${esc(r.storeName)}</div>
${(r.headerLines ?? []).filter(Boolean).slice(0, 3).map((l) => `<div class="c">${esc(l)}</div>`).join('')}
<hr>
${r.receiptNo ? row('Receipt #', r.receiptNo) : ''}
${row('Date', r.date)}
${r.cashier ? row('Staff', r.cashier) : ''}
${r.customer ? row('Customer', r.customer) : ''}
<hr>
${r.items.map((i) => row(`${i.qty} x ${i.name}`, money(i.lineTotal))).join('')}
<hr>
${row('Subtotal', money(r.subtotal))}
${row('Discount', Number(r.discount) > 0 ? '-' + money(r.discount) : money(0))}
${row('TOTAL', money(r.total), 'b big')}
<hr>
${row('Payment', (r.paymentMethod ?? 'Cash') + (r.paymentRef ? ` …${r.paymentRef}` : ''))}
${row('Tendered', money(r.cash ?? r.total))}
${row('Change', money(r.change ?? 0))}
<hr>
${(r.footerLines ?? []).filter(Boolean).map((l) => `<div class="c">${esc(l)}</div>`).join('')}
</body></html>`
}

// A saved sale row (with sale_items) -> receiptHtml input. Voided sales always print VOIDED.
export const saleReceipt = (sale, { cashier, method, banner } = {}) => ({
  ...RECEIPT,
  banner: sale.status === 'voided' ? 'VOIDED' : banner,
  receiptNo: sale.sale_no ? String(sale.sale_no).padStart(5, '0') : null,
  date: new Date(sale.sold_at ?? Date.now()).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }),
  cashier,
  customer: sale.customer_name,
  items: sale.sale_items.map((i) => ({ name: i.product_name, qty: i.qty, lineTotal: i.line_total })),
  subtotal: sale.subtotal,
  discount: sale.discount,
  total: sale.total,
  paymentMethod: method,
  paymentRef: sale.payment_ref,
  cash: sale.amount_tendered ?? sale.total,
  change: sale.change_due ?? 0,
})

// Sample receipt so staff can check the printer without making a sale.
export const testReceipt = () =>
  saleReceipt(
    {
      sale_no: 0,
      subtotal: 1350,
      discount: 50,
      total: 1300,
      amount_tendered: 1500,
      change_due: 200,
      customer_name: 'Sample <Customer> & Co.',
      sale_items: [
        { product_name: 'Day pass', qty: 1, line_total: 150 },
        { product_name: 'Monthly membership', qty: 1, line_total: 1000 },
        { product_name: 'Bottled water 500ml', qty: 4, line_total: 200 },
      ],
    },
    { cashier: 'Test', method: 'Cash', banner: 'TEST PRINT' },
  )

export function printReceipt(r) {
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;left:-1000mm;top:0;width:80mm;height:10mm;border:0;visibility:hidden'
  frame.srcdoc = receiptHtml(r)
  frame.onload = () => {
    frame.contentWindow.focus()
    frame.contentWindow.print()
    // Removed later, not on afterprint, so the frame is still there while the job spools.
    setTimeout(() => frame.remove(), 60_000)
  }
  document.body.appendChild(frame)
}
