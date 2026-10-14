// Prints a receipt through the browser. On the POS PC Chrome runs with --kiosk-printing,
// so window.print() goes straight to the default (Xprinter) printer with no dialog.
import { money } from './util.js'
import { RECEIPT } from '../config/receipt.js'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const row = (l, r, cls = '') => `<div class="row ${cls}"><span>${esc(l)}</span><span>${esc(r)}</span></div>`

// receipt: { storeName, headerLines[], footer, paperWidth (58|80), receiptNo, date, cashier, customer,
//   items[{ name, qty, lineTotal }], subtotal, discount, total,
//   paymentMethod (label; omit or 'Cash' for cash), paymentRef, cash, change, banner (e.g. 'REPRINT') }
export function receiptHtml(r) {
  const mm = r.paperWidth === 58 ? 48 : 72 // printable width inside 58mm / 80mm paper
  const isCash = !r.paymentMethod || r.paymentMethod === 'Cash'
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: ${r.paperWidth === 58 ? 58 : 80}mm auto; margin: 0 }
body { width: ${mm}mm; margin: 0 auto; padding: 2mm 0 6mm; font: ${r.paperWidth === 58 ? 11 : 12}px/1.35 'Courier New', monospace; color: #000 }
.c { text-align: center } .b { font-weight: 700 } .big { font-size: 1.4em }
.row { display: flex; justify-content: space-between; gap: 2mm } .row span:first-child { overflow-wrap: anywhere }
hr { border: 0; border-top: 1px dashed #000; margin: 2mm 0 }
</style></head><body>
${r.banner ? `<div class="c b big">*** ${esc(r.banner)} ***</div>` : ''}
<div class="c b big">${esc(r.storeName)}</div>
${(r.headerLines ?? []).filter(Boolean).slice(0, 3).map((l) => `<div class="c">${esc(l)}</div>`).join('')}
<hr>
${r.receiptNo ? row('Receipt #', r.receiptNo) : ''}
${row('Date', r.date)}
${r.cashier ? row('Cashier', r.cashier) : ''}
${r.customer ? row('Customer', r.customer) : ''}
<hr>
${r.items.map((i) => row(`${i.qty} x ${i.name}`, money(i.lineTotal))).join('')}
<hr>
${Number(r.discount) > 0 ? row('Subtotal', money(r.subtotal)) + row('Discount', '-' + money(r.discount)) : ''}
${row('TOTAL', money(r.total), 'b big')}
${isCash ? row('Cash', money(r.cash ?? r.total)) + row('Change', money(r.change ?? 0)) : row('Paid via', r.paymentMethod + (r.paymentRef ? ` …${r.paymentRef}` : ''))}
<hr>
${r.footer ? `<div class="c">${esc(r.footer)}</div>` : ''}
</body></html>`
}

// A saved sale row (with sale_items) -> receiptHtml input. banner: e.g. 'REPRINT'.
export const saleReceipt = (sale, { cashier, method, banner } = {}) => ({
  ...RECEIPT,
  banner,
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

export function printReceipt(r) {
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  frame.srcdoc = receiptHtml(r)
  frame.onload = () => {
    const w = frame.contentWindow
    w.onafterprint = () => frame.remove()
    w.focus()
    w.print()
    setTimeout(() => frame.remove(), 60_000) // fallback if afterprint never fires
  }
  document.body.appendChild(frame)
}
