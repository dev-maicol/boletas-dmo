import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let cached: SupabaseClient | null = null

/**
 * Cliente Supabase con service role: solo en rutas API / servidor.
 * La clave anónima no lleva sesión de usuario; con RLS activo las
 * consultas desde la API fallan sin la service role.
 */
export function getServiceSupabase(): SupabaseClient {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url?.trim()) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL en el entorno.")
  }
  if (!key?.trim()) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local (Supabase → Settings → API → service_role). Sin ella el envío desde el servidor no puede leer ni actualizar planillas."
    )
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}
