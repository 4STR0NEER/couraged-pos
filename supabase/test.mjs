// Runs schema.sql + every numbered patch in a real Postgres (PGlite, in-process), then
// checks permissions, checkout, stock and reports as staff / admin / inactive users.
// npm run test:db
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const dir = new URL('.', import.meta.url)
const files = ['schema.sql', ...readdirSync(dir).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort()]
const db = new PGlite()
// Minimal Supabase stand-in: auth schema, auth.uid() from a session setting, the two API roles.
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`)
// Each file twice: patches must be safe to re-run.
for (const f of [...files, ...files.slice(1)]) {
  await db.exec(readFileSync(new URL(f, dir), 'utf8').replace(/create extension[^;]*;/i, '')) // gen_random_uuid is core
}
console.log(`applied ${files.join(', ')} (patches twice)`)
const A = '00000000-0000-0000-0000-00000000000a', S = '00000000-0000-0000-0000-00000000000b', X = '00000000-0000-0000-0000-00000000000c'
await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values
  ('${A}', 'admin@x', '{"full_name":"Ana Admin"}'), ('${S}', 'staff@x', '{"full_name":"Sam Staff"}'), ('${X}', 'rand@x', '{}');
  update public.profiles set role = 'admin' where id = '${A}'; update public.profiles set role = 'staff' where id = '${S}';`)
const as = async (uid, sql, params) => {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid])
  await db.exec('set role authenticated')
  try { return (await db.query(sql, params)).rows } finally { await db.exec('reset role') }
}
const fails = async (uid, sql, re, params) => { await assert.rejects(as(uid, sql, params), re); }
const one = async (sql) => (await db.query(sql)).rows[0]
const gid = (await one(`select id from products where code = 'CFH05'`)).id
let n = 0; const ok = (m) => console.log(`  ✓ ${++n} ${m}`)

assert.equal((await one(`select role from profiles where id = '${X}'`)).role, 'inactive'); ok('new sign-up starts inactive')
assert.equal((await as(X, 'select * from products')).length, 0); ok('inactive user sees no products')
await fails(X, `select record_sale('[{"product_id":"${gid}","qty":1}]')`, /Not authorized/); ok('inactive user cannot sell')

await as(S, `insert into stock_movements (product_id, movement_type, qty, unit_cost, note, created_by) values ($1, 'purchase', 24, 27.21, 'Opening', $2)`, [gid, S])
assert.equal((await one(`select stock_qty from products where id='${gid}'`)).stock_qty, 24); ok('staff receives delivery, stock 24')
await fails(S, `insert into stock_movements (product_id, movement_type, qty, created_by) values ($1, 'purchase', 5, $2)`, /row-level security/, [gid, A]); ok('cannot sign a movement as someone else')
await fails(S, `insert into stock_movements (product_id, movement_type, qty, created_by) values ($1, 'sale', -5, $2)`, /row-level security/, [gid, S]); ok('cannot fake a sale movement')

const sale = `select record_sale($1::jsonb, 'cash', 0, 200, null, null, null, $2::uuid) as id`
const items = JSON.stringify([{ product_id: gid, qty: 2 }]), ref = '11111111-1111-1111-1111-111111111111'
const id1 = (await as(S, sale, [items, ref]))[0].id, id2 = (await as(S, sale, [items, ref]))[0].id
assert.equal(id1, id2); assert.equal((await one('select count(*)::int c from sales')).c, 1); ok('retry with same client_ref returns the same sale, no duplicate')
const s1 = await one(`select total, change_due from sales where id='${id1}'`); assert.equal(+s1.total, 100); assert.equal(+s1.change_due, 100); ok('total ₱100, change ₱100 from ₱200')
assert.equal((await one(`select stock_qty from products where id='${gid}'`)).stock_qty, 22); ok('stock 22 after sale')
await fails(S, `select record_sale($1::jsonb)`, /Not enough stock/, [JSON.stringify([{ product_id: gid, qty: 30 }])]); ok('overselling blocked')

await as(S, `update products set selling_price = 55 where id = $1`, [gid])
const ch = await one(`select field, old_value, new_value, changed_by from product_changes where product_id='${gid}' and field='selling_price'`)
assert.deepEqual([ch.old_value, ch.new_value, ch.changed_by], ['50.00', '55.00', S]); ok('staff price change 50 → 55 logged under staff')
await fails(S, `update products set stock_qty = 999 where id = $1`, /permission denied/, [gid]); ok('stock_qty cannot be edited directly')
await fails(S, `insert into products (code, name, selling_price, stock_qty) values ('T1','x',1,50)`, /permission denied/); ok('new product cannot start with made-up stock')
await as(S, `insert into products (code, name, category, kind, selling_price) values ('MEM-M','Monthly','Membership','service',1200)`)
assert.equal((await one(`select count(*)::int c from product_changes where field='created'`)).c, 1); ok('staff adds a membership product, creation logged')

assert.equal((await as(S, `select set_stock_count($1, 20) as d`, [gid]))[0].d, -2)
assert.equal((await one(`select stock_qty from products where id='${gid}'`)).stock_qty, 20); ok('stock count 20 records a −2 adjustment')
assert.equal((await as(S, `select set_stock_count($1, 20) as d`, [gid]))[0].d, 0); ok('matching count records nothing')
await fails(S, `select set_stock_count(id, 3) from products where code='MEM-M'`, /no stock/); ok('services cannot be counted')
assert.equal((await as(S, `select full_name from profiles`)).length, 3); ok('staff can see team names for history')

await fails(S, `select sales_report(current_date - 7, current_date)`, /Only an admin/); ok('staff cannot open reports')
const mid = (await one(`select id from products where code='MEM-M'`)).id
await as(S, `select record_sale($1::jsonb, 'gcash')`, [JSON.stringify([{ product_id: mid, qty: 1 }, { product_id: gid, qty: 1 }])])
const r = (await as(A, `select sales_report((now() at time zone 'Asia/Manila')::date - 6, (now() at time zone 'Asia/Manila')::date) as r`))[0].r
assert.equal(+r.totals.revenue, 100 + 1255); assert.equal(r.totals.receipts, 2); assert.equal(r.daily.length, 7)
assert.equal(r.staff[0].name, 'Sam Staff'); assert.equal(+r.staff[0].memberships, 1)
assert.deepEqual(r.categories.map((c) => c.category).sort(), ['Drinks', 'Membership']); assert.equal(r.payments.length, 2)
ok(`admin report: revenue ₱${r.totals.revenue}, 2 receipts, 7 days, staff + membership + payments`)
await as(A, `select void_sale($1, 'Wrong item')`, [id1])
assert.equal((await one(`select stock_qty from products where id='${gid}'`)).stock_qty, 21)
const r2 = (await as(A, `select sales_report((now() at time zone 'Asia/Manila')::date - 6, (now() at time zone 'Asia/Manila')::date) as r`))[0].r
assert.equal(r2.voids.count, 1); assert.equal(r2.totals.receipts, 1); ok('void puts stock back and moves the sale out of totals')
await fails(A, `select sales_report(current_date, current_date - 1)`, /valid date range/); ok('bad range rejected')
console.log('all passed')
