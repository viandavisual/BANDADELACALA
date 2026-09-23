import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function temporaryPassword(length = 16) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%'
  const random = new Uint32Array(length)
  crypto.getRandomValues(random)
  return Array.from(random, n => chars[n % chars.length]).join('')
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'SUPABASE_ADMIN_SECRET_MISSING' }, 500)

    const authorization = req.headers.get('Authorization') || ''
    const jwt = authorization.replace(/^Bearer\s+/i, '')
    if (!jwt) return json({ error: 'AUTH_REQUIRED' }, 401)

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })

    const { data: authData, error: authError } = await admin.auth.getUser(jwt)
    const caller = authData?.user
    if (authError || !caller) return json({ error: 'AUTH_INVALID' }, 401)

    const { data: callerProfile, error: callerProfileError } = await admin
      .from('profiles')
      .select('role')
      .eq('user_id', caller.id)
      .maybeSingle()
    if (callerProfileError) throw callerProfileError
    if (!callerProfile || !['admin', 'gestor'].includes(callerProfile.role)) {
      return json({ error: 'EDITOR_PERMISSION_REQUIRED' }, 403)
    }

    const body = await req.json()
    const name = String(body?.name || '').trim().slice(0, 120)
    const email = String(body?.email || '').trim().toLowerCase()
    const role = String(body?.role || '').trim().toLowerCase()
    const suppliedPassword = String(body?.temporaryPassword || '').trim()
    const password = suppliedPassword.length >= 12 ? suppliedPassword : temporaryPassword()

    if (!name || !email || !email.includes('@')) return json({ error: 'NAME_EMAIL_REQUIRED' }, 400)
    if (!['gestor', 'standard'].includes(role)) return json({ error: 'ROLE_NOT_ALLOWED' }, 400)

    // inviteUserByEmail crea el compte NO confirmat i envia el link que valida l'email.
    const redirectTo = 'https://viandavisual.github.io/BANDADELACALA/app/?view=user'
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { name, must_change_password: true },
    })
    if (inviteError) return json({ error: inviteError.message }, 400)

    const user = invited?.user
    if (!user) return json({ error: 'USER_NOT_CREATED' }, 500)

    // Assignem la contrasenya temporal sense confirmar manualment l'email.
    const { error: passwordError } = await admin.auth.admin.updateUserById(user.id, {
      password,
      user_metadata: { ...(user.user_metadata || {}), name, must_change_password: true },
    })
    if (passwordError) throw passwordError

    const { error: profileError } = await admin.from('profiles').upsert({
      user_id: user.id,
      email,
      name,
      role,
      must_change_password: true,
      created_by: caller.id,
    }, { onConflict: 'user_id' })
    if (profileError) throw profileError

    return json({
      ok: true,
      inviteSent: true,
      user: { id: user.id, name, email, role },
      temporaryPassword: password,
    })
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : 'UNKNOWN_ERROR' }, 500)
  }
})
