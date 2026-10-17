// Cloudflare Pages Function: POST /api/staff (live site). Twin of api/staff.js (Vercel previews);
// all the rules live in server/staff.js.
// Needs SUPABASE_SERVICE_ROLE_KEY in the Pages project's environment variables, as a secret
// (server only: never prefix it with VITE_, or it would be shipped to every browser).
import { createClient } from '@supabase/supabase-js'
import { handleStaff } from '../../server/staff.js'

export async function onRequestPost({ request, env }) {
  const url = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return Response.json({ error: 'Adding staff needs SUPABASE_SERVICE_ROLE_KEY set in Cloudflare.' }, { status: 500 })

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const token = String(request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  try {
    const body = await request.json().catch(() => ({}))
    const { status, json } = await handleStaff(admin, token, body)
    return Response.json(json, { status })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
