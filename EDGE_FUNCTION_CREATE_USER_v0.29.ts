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

async function findUserByEmail(admin: any, email: string) {
  const target = email.toLowerCase()
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    const users = data?.users || []
    const match = users.find((user: any) => String(user.email || '').toLowerCase() === target)
    if (match) return match
    if (users.length < 100) break
  }
  return null
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
    const action = String(body?.action || 'create').trim().toLowerCase()

    if (action === 'delete') {
      const targetUserId = String(body?.userId || '').trim()
      if (!targetUserId) return json({ error: 'USER_ID_REQUIRED' }, 400)
      if (targetUserId === caller.id) return json({ error: 'CANNOT_DELETE_SELF' }, 403)

      const { data: targetProfile, error: targetProfileError } = await admin
        .from('profiles')
        .select('user_id,email,name,role')
        .eq('user_id', targetUserId)
        .maybeSingle()
      if (targetProfileError) throw targetProfileError
      if (!targetProfile) return json({ error: 'PROFILE_NOT_FOUND' }, 404)
      if (targetProfile.role === 'admin') return json({ error: 'ADMIN_CANNOT_BE_DELETED' }, 403)
      if (callerProfile.role === 'gestor' && targetProfile.role !== 'standard') {
        return json({ error: 'GESTOR_CANNOT_DELETE_GESTOR' }, 403)
      }

      const { error: deleteError } = await admin.auth.admin.deleteUser(targetUserId)
      if (deleteError) return json({ error: deleteError.message }, 400)

      return json({
        ok: true,
        deleted: true,
        user: {
          id: targetUserId,
          name: targetProfile.name || '',
          email: targetProfile.email || '',
          role: targetProfile.role || '',
        },
      })
    }

    if (action !== 'create') return json({ error: 'ACTION_NOT_ALLOWED' }, 400)

    const name = String(body?.name || '').trim().slice(0, 120)
    const email = String(body?.email || '').trim().toLowerCase()
    const role = String(body?.role || '').trim().toLowerCase()

    if (!name || !email || !email.includes('@')) return json({ error: 'NAME_EMAIL_REQUIRED' }, 400)
    if (!['gestor', 'standard'].includes(role)) return json({ error: 'ROLE_NOT_ALLOWED' }, 400)

    // v0.29: ja NO generem ni coneixem cap contrasenya temporal.
    // El nou usuari rep una invitació oficial de Supabase i, en obrir-la,
    // entra a l'APP amb una sessió vàlida per definir la seva pròpia contrasenya.
    let existing = await findUserByEmail(admin, email)
    let replacedPendingUser = false

    if (existing?.email_confirmed_at) {
      return json({ error: 'EMAIL_ALREADY_REGISTERED' }, 409)
    }

    // Si queda un compte pendent d'una prova anterior, el reiniciem netament.
    // Com que encara no té l'email confirmat, no és un compte actiu.
    if (existing?.id) {
      const { error: staleDeleteError } = await admin.auth.admin.deleteUser(existing.id)
      if (staleDeleteError) return json({ error: staleDeleteError.message }, 400)
      replacedPendingUser = true
      existing = null
    }

    const redirectTo = 'https://viandavisual.github.io/BANDADELACALA/app/?view=user&setup=password'
    const metadata = { name, must_change_password: true }

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: metadata,
      redirectTo,
    })

    if (inviteError) {
      // Si Auth arribés a crear un usuari pendent abans de fallar l'enviament,
      // el netegem per permetre un reintent posterior sense residus.
      try {
        const orphan = await findUserByEmail(admin, email)
        if (orphan?.id && !orphan.email_confirmed_at) await admin.auth.admin.deleteUser(orphan.id)
      } catch (_cleanupError) {}
      return json({ error: inviteError.message }, 400)
    }

    const user = invited?.user
    if (!user?.id) return json({ error: 'USER_NOT_INVITED' }, 500)

    const { error: profileError } = await admin.from('profiles').upsert({
      user_id: user.id,
      email,
      name,
      role,
      must_change_password: true,
      created_by: caller.id,
    }, { onConflict: 'user_id' })

    if (profileError) {
      try { await admin.auth.admin.deleteUser(user.id) } catch (_cleanupError) {}
      throw profileError
    }

    return json({
      ok: true,
      inviteSent: true,
      replacedPendingUser,
      user: { id: user.id, name, email, role },
    })
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : 'UNKNOWN_ERROR' }, 500)
  }
})
