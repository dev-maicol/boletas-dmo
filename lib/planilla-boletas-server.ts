import type { SupabaseClient } from "@supabase/supabase-js"

import type { DetalleRow, SucursalHeader } from "@/lib/boleta-pdf"

export function unwrapSucursal(raw: unknown): SucursalHeader | null {
  if (raw == null) return null
  if (Array.isArray(raw)) {
    const first = raw[0]
    return first && typeof first === "object"
      ? (first as SucursalHeader)
      : null
  }
  if (typeof raw === "object") return raw as SucursalHeader
  return null
}

export async function sucursalesPorCi(
  supabase: SupabaseClient,
  cis: (string | null)[]
): Promise<Map<string, SucursalHeader | null>> {
  const map = new Map<string, SucursalHeader | null>()
  const unique = [
    ...new Set(
      cis
        .map((c) => (c == null ? "" : String(c).trim()))
        .filter((c) => c.length > 0)
    ),
  ]
  if (unique.length === 0) return map

  const { data, error } = await supabase
    .from("trabajadores")
    .select("ci, sucursales(nombre, direccion, numero_empleador)")
    .in("ci", unique)

  if (error) throw error

  for (const row of data ?? []) {
    const ci = String((row as { ci?: string }).ci ?? "").trim()
    if (!ci) continue
    const s = unwrapSucursal((row as { sucursales?: unknown }).sucursales)
    map.set(ci, s)
  }
  return map
}

export function mergeDetalleConSucursal(
  detalles: DetalleRow[],
  sucMap: Map<string, SucursalHeader | null>
): DetalleRow[] {
  return detalles.map((row) => {
    const ci = String(row.ci ?? "").trim()
    const suc = ci ? sucMap.get(ci) ?? null : null
    return {
      ...row,
      trabajadores: { sucursales: suc },
    }
  })
}

export async function loadDetallesMerged(
  supabase: SupabaseClient,
  filters: {
    planillaId?: string
    estadoEnvio?: "pendiente" | "enviado" | "error"
    soloErrores?: boolean
  }
): Promise<DetalleRow[]> {
  let q = supabase.from("planilla_detalles").select(`
      *,
      planillas ( mes, anio )
    `)

  if (filters.soloErrores) {
    q = q.eq("estado_envio", "error")
  } else if (filters.estadoEnvio) {
    q = q.eq("estado_envio", filters.estadoEnvio)
  }

  if (filters.planillaId) {
    q = q.eq("planilla_id", filters.planillaId)
  }

  const { data: detalles, error } = await q
  if (error) throw error

  const baseRows = (detalles ?? []) as DetalleRow[]
  const sucMap = await sucursalesPorCi(
    supabase,
    baseRows.map((r) => r.ci)
  )
  return mergeDetalleConSucursal(baseRows, sucMap)
}
