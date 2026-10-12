// Vercel serverless function: POST /api/staff. All the rules live in server/staff.js.
// Needs SUPABASE_SERVICE_ROLE_KEY in Vercel's environment variables (server only:
// never prefix it with VITE_, or it would be shipped to every browser).
import { createClient } from '@supabase/supabase-js'
import { handleStaff } from '../server/staff.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' })
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(500).json({ error: 'Adding staff needs SUPABASE_SERVICE_ROLE_KEY set in Vercel.' })

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  try {
    const { status, json } = await handleStaff(admin, token, req.body ?? {})
    res.status(status).json(json)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
