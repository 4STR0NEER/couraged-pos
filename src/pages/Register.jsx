import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, CircleCheck, Loader2, Minus, Plus, Search, ShoppingBag, Tag, X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { manilaToday, money, quickCash, round2, uuid } from '../lib/util.js'
import { CountUp, EASE_OUT } from '../components/ui.jsx'

const METHODS = [
  ['cash', 'Cash'],
  ['gcash', 'GCash'],
  ['maya', 'Maya'],
  ['card', 'Card'],
  ['bank_transfer', 'Bank'],
  ['other', 'Other'],
]

const stockOf = (p) =>
  p.kind === 'service'
    ? { label: 'Service', tone: 'text-smoke' }
    : p.stock_qty <= 0
      ? { label: 'Out of stock', tone: 'text-crimson' }
      : p.stock_qty <= p.reorder_level
        ? { label: `Low · ${p.stock_qty} left`, tone: 'text-[#7A5A00]' }
        : { label: `${p.stock_qty} in stock`, tone: 'text-smoke' }

export default function Register() {
  const [products, setProducts] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [today, setToday] = useState(null)
  const [cat, setCat] = useState('All')
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState([]) // [{ id, qty }] in the order items were added
  const [method, setMethod] = useState('cash')
  const [tendered, setTendered] = useState('')
  const [discount, setDiscount] = useState('')
  const [customer, setCustomer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [sheet, setSheet] = useState(false)
  // One ref per checkout, reused on retries so a dropped connection can't record the sale twice.
  const clientRef = useRef(uuid())
  const searchRef = useRef(null)

  const load = useCallback(async () => {
    const [p, t] = await Promise.all([
      supabase
        .from('products')
        .select('id, code, name, category, kind, selling_price, stock_qty, reorder_level')
        .eq('is_active', true)
        .order('category')
        .order('name'),
      supabase.from('v_daily_sales').select('receipts, revenue').eq('sale_date', manilaToday()).maybeSingle(),
    ])
    if (p.error) setLoadError(p.error.message)
    else {
      setLoadError(null)
      setProducts(p.data)
    }
    if (!t.error) setToday(t.data ?? { receipts: 0, revenue: 0 })
  }, [])
  useEffect(() => {
    load()
  }, [load])

  // Keep search focused for a USB/Bluetooth barcode scanner, but not on touch screens where it pops the keyboard.
  const focusSearch = () => matchMedia('(pointer: fine)').matches && searchRef.current?.focus()
  useEffect(() => {
    focusSearch()
  }, [])

  const byId = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products])
  const categories = useMemo(() => ['All', ...new Set((products ?? []).map((p) => p.category))], [products])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (products ?? []).filter((p) => (cat === 'All' || p.category === cat) && (!q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)))
  }, [products, cat, query])

  const lines = cart.filter((l) => byId.has(l.id)).map((l) => ({ ...byId.get(l.id), qty: l.qty }))
  const qtyIn = (id) => cart.find((l) => l.id === id)?.qty ?? 0
  const count = lines.reduce((n, l) => n + l.qty, 0)
  const subtotal = round2(lines.reduce((s, l) => s + l.qty * l.selling_price, 0))
  const disc = Number(discount) || 0
  const discTooBig = disc > subtotal
  const total = round2(Math.max(subtotal - disc, 0))
  // Blank tendered means the customer paid the exact amount.
  const paid = method === 'cash' ? (tendered === '' ? total : Number(tendered)) : null
  const change = paid == null ? null : round2(paid - total)
  const canCharge = lines.length > 0 && !busy && !discTooBig && (change == null || change >= 0)

  const maxQty = (p) => (p.kind === 'good' ? p.stock_qty : Infinity)
  const add = (p) => {
    if (qtyIn(p.id) >= maxQty(p)) return
    setError(null)
    setCart((c) => (c.some((l) => l.id === p.id) ? c.map((l) => (l.id === p.id ? { ...l, qty: l.qty + 1 } : l)) : [...c, { id: p.id, qty: 1 }]))
  }
  const setQty = (p, qty) => {
    setError(null)
    setCart((c) => (qty <= 0 ? c.filter((l) => l.id !== p.id) : c.map((l) => (l.id === p.id ? { ...l, qty: Math.min(qty, maxQty(p)) } : l))))
  }

  // Enter in search adds an exact code match (barcode scanners type the code + Enter) or the only result.
  const onSearchKey = (e) => {
    if (e.key !== 'Enter') return
    const q = query.trim().toLowerCase()
    const hit = shown.find((p) => p.code.toLowerCase() === q) ?? (shown.length === 1 ? shown[0] : null)
    if (hit) {
      add(hit)
      setQuery('')
    }
  }

  const charge = async () => {
    if (!canCharge) return
    setBusy(true)
    setError(null)
    const { data: id, error } = await supabase.rpc('record_sale', {
      p_items: lines.map((l) => ({ product_id: l.id, qty: l.qty })),
      p_payment_method: method,
      p_discount: disc,
      p_amount_tendered: paid,
      p_customer_name: customer.trim() || null,
      p_client_ref: clientRef.current,
    })
    if (error) {
      setBusy(false)
      setError(/fetch|network/i.test(error.message) ? "Connection problem. Tap Charge again, it won't be recorded twice." : error.message)
      load()
      return
    }
    const { data: sale } = await supabase
      .from('sales')
      .select('sale_no, subtotal, discount, total, amount_tendered, change_due, payment_method, customer_name, sale_items(product_name, qty, line_total)')
      .eq('id', id)
      .single()
    // The sale is saved either way; fall back to what the register knows if the read-back failed.
    setReceipt(
      sale ?? {
        sale_no: null,
        subtotal,
        discount: disc,
        total,
        amount_tendered: paid,
        change_due: change,
        payment_method: method,
        customer_name: customer.trim() || null,
        sale_items: lines.map((l) => ({ product_name: l.name, qty: l.qty, line_total: l.qty * l.selling_price })),
      },
    )
    clientRef.current = uuid()
    setCart([])
    setTendered('')
    setDiscount('')
    setCustomer('')
    setMethod('cash')
    setSheet(false)
    setBusy(false)
    load()
  }

  const newSale = () => {
    setReceipt(null)
    focusSearch()
  }

  return (
    <>
      <div className="lg:grid lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_25rem] xl:grid-cols-[minmax(0,1fr)_28rem]">
        <section className="min-w-0 px-4 pt-5 pb-28 sm:px-6 lg:overflow-y-auto lg:pb-8">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="font-display text-5xl font-black uppercase leading-none">Register</h1>
            {today && (
              <p className="tabular text-sm font-semibold text-smoke">
                Today · <CountUp value={today.receipts} /> receipts · <CountUp value={today.revenue} format={money} />
              </p>
            )}
          </header>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative block sm:w-72">
              <span className="sr-only">Search products or scan a code</span>
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-smoke" aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKey}
                placeholder="Search or scan code"
                className="h-11 w-full rounded-lg bg-paper pr-3 pl-10 ring-1 ring-ink/10 outline-none transition-shadow focus:ring-2 focus:ring-gold"
              />
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0" role="group" aria-label="Category">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  aria-pressed={cat === c}
                  className="press relative h-11 shrink-0 rounded-lg px-4 text-sm font-semibold"
                >
                  {cat === c && <motion.span layoutId="cat-pill" className="absolute inset-0 rounded-lg bg-ink" transition={{ type: 'spring', duration: 0.35, bounce: 0.1 }} />}
                  <span className={`relative transition-colors duration-150 ${cat === c ? 'text-paper' : 'text-smoke'}`}>{c}</span>
                </button>
              ))}
            </div>
          </div>

          {loadError && (
            <p role="alert" className="mt-6 flex items-center gap-2 rounded-lg bg-crimson/10 px-4 py-3 text-sm text-crimson">
              <CircleAlert className="size-4 shrink-0" aria-hidden="true" /> Couldn't load products: {loadError}
            </p>
          )}
          {!products && !loadError && <Loader2 className="mx-auto mt-16 size-8 animate-spin text-smoke" aria-label="Loading products" />}
          {products && shown.length === 0 && <p className="mt-16 text-center text-smoke">No products match "{query}".</p>}

          <motion.ul layout className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            <AnimatePresence mode="popLayout" initial={false}>
              {shown.map((p) => (
                <motion.li
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.25, ease: EASE_OUT }}
                >
                  <ProductTile p={p} inCart={qtyIn(p.id)} onAdd={() => add(p)} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        </section>

        <aside
          aria-label="Current sale"
          className={`bg-ink text-paper lg:flex lg:min-h-0 lg:flex-col ${sheet ? 'fixed inset-0 z-30 flex flex-col' : 'max-lg:hidden'}`}
        >
          <Cart
            lines={lines}
            count={count}
            subtotal={subtotal}
            total={total}
            {...{ method, setMethod, tendered, setTendered, discount, setDiscount, discTooBig, customer, setCustomer, change, busy, error, canCharge, charge, setQty }}
            onClear={() => setCart([])}
            onClose={() => setSheet(false)}
          />
        </aside>
      </div>

      {/* Phones and small tablets: the cart lives in a sheet behind this bar. */}
      <AnimatePresence>
        {count > 0 && !sheet && (
          <motion.button
            type="button"
            onClick={() => setSheet(true)}
            className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 flex h-16 items-center justify-between rounded-xl bg-ink px-5 text-paper shadow-[0_12px_32px_-8px_rgb(0_0_0/0.6)] lg:hidden"
            initial={{ y: 96 }}
            animate={{ y: 0 }}
            exit={{ y: 96 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
          >
            <span className="flex items-center gap-2 font-semibold">
              <ShoppingBag className="size-5 text-gold" aria-hidden="true" /> {count} item{count === 1 ? '' : 's'}
            </span>
            <span className="tabular font-display text-2xl font-black">Review {money(total)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>{receipt && <Receipt sale={receipt} onDone={newSale} />}</AnimatePresence>
    </>
  )
}

function ProductTile({ p, inCart, onAdd }) {
  const s = stockOf(p)
  const soldOut = p.kind === 'good' && inCart >= p.stock_qty
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={soldOut}
      aria-label={`Add ${p.name}, ${money(p.selling_price)}, ${s.label}${inCart ? `, ${inCart} in cart` : ''}`}
      className={`press relative flex h-full min-h-36 w-full flex-col rounded-xl bg-paper p-4 text-left ring-1 transition-[box-shadow,opacity] duration-150 hover:ring-ink/25 disabled:cursor-not-allowed disabled:opacity-50 ${inCart ? 'ring-2 ring-gold' : 'ring-ink/5'}`}
    >
      <span className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-smoke">
        {p.category} · {p.code}
      </span>
      <span className="mt-1 font-semibold leading-snug">{p.name}</span>
      <span className="mt-auto pt-3 font-display text-3xl font-black leading-none tabular">{money(p.selling_price)}</span>
      <span className={`mt-1 text-xs font-semibold ${s.tone}`}>{s.label}</span>
      <AnimatePresence>
        {inCart > 0 && (
          <motion.span
            key={inCart}
            aria-hidden="true"
            className="tabular absolute -top-2 -right-2 grid size-8 place-items-center rounded-full bg-gold text-sm font-bold text-ink shadow-md"
            initial={{ scale: 1.5 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.4 }}
          >
            {inCart}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

const darkField = 'h-11 w-full rounded-lg bg-ink-2 px-3 text-paper ring-1 ring-paper/10 outline-none transition-shadow placeholder:text-ash/60 focus:ring-2 focus:ring-gold'

function Cart({ lines, count, subtotal, total, method, setMethod, tendered, setTendered, discount, setDiscount, discTooBig, customer, setCustomer, change, busy, error, canCharge, charge, setQty, onClear, onClose }) {
  const [showDiscount, setShowDiscount] = useState(false)
  return (
    <>
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
        <h2 className="font-display text-2xl font-extrabold uppercase leading-none">
          Current sale <span className="tabular text-ash">· {count}</span>
        </h2>
        <div className="flex items-center gap-2">
          {lines.length > 0 && (
            <button type="button" onClick={onClear} className="press rounded-lg px-2.5 py-1.5 text-sm font-semibold text-ash hover:text-paper">
              Clear
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Back to products" className="press grid size-10 place-items-center rounded-lg ring-1 ring-paper/10 lg:hidden">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto px-5">
        <AnimatePresence initial={false}>
          {lines.map((l) => (
            <motion.li
              key={l.id}
              layout
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24, transition: { duration: 0.15 } }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="flex items-center gap-3 border-b border-paper/8 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{l.name}</p>
                <p className="tabular text-xs text-ash">{money(l.selling_price)} each</p>
              </div>
              <div className="flex items-center rounded-lg bg-ink-2 ring-1 ring-paper/10">
                <button type="button" onClick={() => setQty(l, l.qty - 1)} aria-label={`One less ${l.name}`} className="press grid size-10 place-items-center text-ash hover:text-paper">
                  <Minus className="size-4" aria-hidden="true" />
                </button>
                <span className="tabular w-7 text-center font-bold">{l.qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(l, l.qty + 1)}
                  disabled={l.kind === 'good' && l.qty >= l.stock_qty}
                  aria-label={`One more ${l.name}`}
                  className="press grid size-10 place-items-center text-ash hover:text-paper disabled:opacity-30"
                >
                  <Plus className="size-4" aria-hidden="true" />
                </button>
              </div>
              <span className="tabular w-20 text-right font-semibold">{money(l.qty * l.selling_price)}</span>
            </motion.li>
          ))}
        </AnimatePresence>
        {lines.length === 0 && (
          <li className="grid h-full min-h-40 place-items-center text-center text-ash">
            <div>
              <ShoppingBag className="mx-auto size-10 text-ash/50" aria-hidden="true" />
              <p className="mt-3 font-semibold text-paper">Tap a product to start a sale</p>
              <p className="mt-1 text-sm">Typing or scanning a code and pressing Enter works too.</p>
            </div>
          </li>
        )}
      </ul>

      <div className="space-y-4 border-t border-paper/10 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <dl className="tabular space-y-1.5 text-sm">
          <div className="flex justify-between text-ash">
            <dt>Subtotal</dt>
            <dd>{money(subtotal)}</dd>
          </div>
          {showDiscount ? (
            <div className="flex items-center justify-between gap-3">
              <dt>
                <label htmlFor="discount" className="text-ash">
                  Discount (₱)
                </label>
              </dt>
              <dd className="flex items-center gap-2">
                <input id="discount" type="number" inputMode="decimal" min="0" step="any" autoFocus value={discount} onChange={(e) => setDiscount(e.target.value)} className={`${darkField} h-9 w-28 text-right`} />
                <button type="button" onClick={() => (setDiscount(''), setShowDiscount(false))} aria-label="Remove discount" className="press text-ash hover:text-paper">
                  <X className="size-4" aria-hidden="true" />
                </button>
              </dd>
            </div>
          ) : (
            <div>
              <button type="button" onClick={() => setShowDiscount(true)} className="press flex items-center gap-1.5 text-sm font-semibold text-gold">
                <Tag className="size-3.5" aria-hidden="true" /> Add discount
              </button>
            </div>
          )}
          {discTooBig && (
            <div role="alert" className="text-xs font-semibold text-[#FF8A9B]">
              Discount is larger than the subtotal.
            </div>
          )}
          <div className="flex items-end justify-between pt-1">
            <dt className="font-display text-xl font-extrabold uppercase">Total</dt>
            <dd className="font-display text-5xl font-black leading-none">
              <CountUp value={total} format={money} duration={0.35} />
            </dd>
          </div>
        </dl>

        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Payment method">
          {METHODS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={method === value}
              onClick={() => setMethod(value)}
              className="press relative h-10 rounded-lg text-sm font-semibold ring-1 ring-paper/10"
            >
              {method === value && <motion.span layoutId="pay-pill" className="absolute inset-0 rounded-lg bg-gold" transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }} />}
              <span className={`relative transition-colors duration-150 ${method === value ? 'text-ink' : 'text-ash'}`}>{label}</span>
            </button>
          ))}
        </div>

        {method === 'cash' && <CashIn total={total} tendered={tendered} setTendered={setTendered} change={change} />}

        <label className="block">
          <span className="sr-only">Customer name, optional</span>
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name (optional)" className={darkField} />
        </label>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-crimson/25 px-3 py-2.5 text-sm ring-1 ring-crimson/60">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {error}
          </p>
        )}

        <button
          type="button"
          onClick={charge}
          disabled={!canCharge}
          className="press flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gold font-display text-2xl font-black uppercase tracking-[0.03em] text-ink disabled:opacity-40"
        >
          {busy ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Recording
            </>
          ) : (
            <>Charge {money(total)}</>
          )}
        </button>
      </div>
    </>
  )
}

function CashIn({ total, tendered, setTendered, change }) {
  const short = change < 0
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Cash received</span>
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ash">₱</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={tendered}
            onChange={(e) => setTendered(e.target.value)}
            placeholder={`Cash received · exact ${money(total)}`}
            className={`${darkField} tabular pl-7`}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setTendered('')} className="press h-9 rounded-lg bg-ink-2 px-3 text-sm font-semibold ring-1 ring-paper/10">
          Exact
        </button>
        {quickCash(total).map((v) => (
          <button key={v} type="button" onClick={() => setTendered(String(v))} className="press tabular h-9 rounded-lg bg-ink-2 px-3 text-sm font-semibold ring-1 ring-paper/10">
            {money(v)}
          </button>
        ))}
      </div>
      <div className={`flex items-center justify-between rounded-lg px-4 py-3 ${short ? 'bg-crimson/25 ring-1 ring-crimson/60' : 'bg-ink-2'}`} aria-live="polite">
        <span className="font-display text-lg font-extrabold uppercase">{short ? 'Short by' : 'Change'}</span>
        <span className={`tabular font-display text-4xl font-black leading-none ${short ? 'text-paper' : 'text-gold'}`}>
          <CountUp value={Math.abs(change)} format={money} duration={0.3} />
        </span>
      </div>
    </div>
  )
}

const METHOD_LABEL = Object.fromEntries(METHODS)

function Receipt({ sale, onDone }) {
  const cash = sale.payment_method === 'cash'
  useEffect(() => {
    const onKey = (e) => (e.key === 'Enter' || e.key === 'Escape') && onDone()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])
  return (
    <motion.div
      className="fixed inset-0 z-40 grid place-items-center bg-ink/70 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-title"
    >
      <motion.div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-paper shadow-[0_24px_64px_-12px_rgb(0_0_0/0.6)]"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
      >
        <div className="bg-ink px-6 pt-6 pb-5 text-paper">
          <p id="receipt-title" className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-active">
            <CircleCheck className="size-4" aria-hidden="true" /> Sale recorded{sale.sale_no ? ` · #${String(sale.sale_no).padStart(5, '0')}` : ''}
          </p>
          <p className="mt-3 font-display text-xl font-extrabold uppercase text-ash">{cash ? 'Change to give' : `Paid by ${METHOD_LABEL[sale.payment_method]}`}</p>
          <motion.p
            className="tabular font-display text-7xl font-black leading-none text-gold"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.3, delay: 0.1 }}
          >
            {money(cash ? (sale.change_due ?? 0) : sale.total)}
          </motion.p>
        </div>
        <div className="px-6 py-5">
          <ul className="tabular space-y-1.5 text-sm">
            {sale.sale_items.map((i, k) => (
              <li key={k} className="flex justify-between gap-3">
                <span>
                  {i.qty} × {i.product_name}
                </span>
                <span>{money(i.line_total)}</span>
              </li>
            ))}
          </ul>
          <dl className="tabular mt-4 space-y-1 border-t border-ink/10 pt-3 text-sm">
            {Number(sale.discount) > 0 && (
              <div className="flex justify-between text-smoke">
                <dt>Discount</dt>
                <dd>−{money(sale.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd>{money(sale.total)}</dd>
            </div>
            {cash && (
              <div className="flex justify-between text-smoke">
                <dt>Cash received</dt>
                <dd>{money(sale.amount_tendered ?? sale.total)}</dd>
              </div>
            )}
            {sale.customer_name && (
              <div className="flex justify-between text-smoke">
                <dt>Customer</dt>
                <dd>{sale.customer_name}</dd>
              </div>
            )}
          </dl>
          <button type="button" autoFocus onClick={onDone} className="press mt-6 h-12 w-full rounded-xl bg-ink font-display text-xl font-black uppercase tracking-[0.04em] text-paper">
            New sale
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
