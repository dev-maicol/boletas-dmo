import { NextResponse } from "next/server"
import JSZip from "jszip"

import { buildBoletaPdf } from "@/lib/boleta-pdf"
import { loadDetallesMerged } from "@/lib/planilla-boletas-server"
import { getServiceSupabase } from "@/lib/supabase-service"

type Ctx = { params: Promise<{ planillaId: string }> }

/**
 * Descarga un ZIP con los PDF de boletas **enviadas correctamente**
 * para una planilla (mismo diseño que el correo: carta, 2 copias por hoja).
 */
export async function GET(_request: Request, context: Ctx) {
  try {
    const { planillaId } = await context.params
    if (!planillaId?.trim()) {
      return NextResponse.json({ error: "planillaId inválido" }, { status: 400 })
    }

    const supabase = getServiceSupabase()
    const rows = await loadDetallesMerged(supabase, {
      planillaId,
      estadoEnvio: "enviado",
    })

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No hay boletas con estado enviado para esta planilla." },
        { status: 404 }
      )
    }

    const zip = new JSZip()
    for (const row of rows) {
      const pdf = await buildBoletaPdf(row)
      const name = `boleta_${String(row.ci ?? row.id).replace(/[^\w.-]/g, "_")}.pdf`
      zip.file(name, Buffer.from(pdf))
    }

    const buf = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
    })

    const filename = `boletas_planilla_${planillaId.slice(0, 8)}.zip`

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error(error)
    const message =
      error instanceof Error ? error.message : "Error al generar el ZIP."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
