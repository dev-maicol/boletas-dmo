import { NextResponse } from "next/server"
import { buildBoletaPdf } from "@/lib/boleta-pdf"
import { loadDetallesMerged } from "@/lib/planilla-boletas-server"
import { getServiceSupabase } from "@/lib/supabase-service"
import nodemailer from "nodemailer"

const MESES_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]

function mailConfigError(): string | null {
  if (!process.env.EMAIL_USER?.trim() || !process.env.EMAIL_PASS?.trim()) {
    return "Falta EMAIL_USER o EMAIL_PASS en .env.local (contraseña de aplicación de Gmail)."
  }
  return null
}

/** Nombre que verá el destinatario (Gmail muestra esto junto a la dirección). */
const DEFAULT_FROM_NAME = "DMO S.R.L. - Sistema de boletas"

function getMailFrom() {
  const address = process.env.EMAIL_USER!.trim()
  const name =
    process.env.EMAIL_FROM_NAME?.trim() || DEFAULT_FROM_NAME
  return { name, address }
}

function sanitizeFilePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
}

export async function POST(request: Request) {
  try {
    const mailErr = mailConfigError()
    if (mailErr) {
      return NextResponse.json({ error: mailErr }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    let soloErrores = false
    let planillaId: string | null = null
    try {
      const body = (await request.json()) as {
        soloErrores?: boolean
        planillaId?: string
      }
      soloErrores = Boolean(body?.soloErrores)
      planillaId =
        typeof body?.planillaId === "string" && body.planillaId.length > 0
          ? body.planillaId
          : null
    } catch {
      /* cuerpo vacío o no JSON */
    }

    const rows = await loadDetallesMerged(supabase, {
      planillaId: planillaId ?? undefined,
      estadoEnvio: soloErrores ? "error" : "pendiente",
    })

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: soloErrores
          ? "No hay registros con error para reintentar."
          : "No hay boletas pendientes de envío.",
        enviados: 0,
        fallos: 0,
        total: 0,
      })
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    let enviados = 0
    let fallos = 0

    for (const row of rows) {
      try {
        if (!row.email?.trim()) {
          throw new Error("Sin dirección de correo en el detalle")
        }

        const pdfBytes = await buildBoletaPdf(row)

        const mes = row.planillas?.mes
        const anio = row.planillas?.anio
        const mesNombre =
          typeof mes === "number" && mes >= 1 && mes <= 12
            ? MESES_ES[mes - 1]
            : null
        const subject =
          mes != null && anio != null
            ? `Boleta de pago — ${mes}/${anio}`
            : "Boleta de pago"
        const nombreTrabajador = String(row.nombre ?? "trabajador").trim()
        const periodoTexto =
          mesNombre && anio != null
            ? `${mesNombre}/${anio}`
            : mes != null && anio != null
              ? `${mes}/${anio}`
              : "el período correspondiente"
        const textBody = `Hola, ${nombreTrabajador}, adjunto a este correo encontrará su boleta de pago correspondiente al mes de ${periodoTexto}.`
        const ciSafe = sanitizeFilePart(String(row.ci ?? row.id))
        const mesFile = sanitizeFilePart(String(mes ?? "sinmes"))
        const anioFile = sanitizeFilePart(String(anio ?? "sinanio"))
        const filename = `boleta_${ciSafe}_${mesFile}_${anioFile}.pdf`

        await transporter.sendMail({
          from: getMailFrom(),
          to: row.email,
          subject,
          text: textBody,
          html: `<p>Hola, ${nombreTrabajador},</p><p>Adjunto a este correo encontrará su boleta de pago correspondiente al mes de ${periodoTexto}.</p>`,
          headers: {
            "Content-Language": "es",
          },
          attachments: [
            {
              filename,
              content: Buffer.from(pdfBytes),
            },
          ],
        })

        await supabase
          .from("planilla_detalles")
          .update({ estado_envio: "enviado", error_envio: null })
          .eq("id", row.id)

        enviados++
      } catch (err: unknown) {
        console.error(err)
        const message = err instanceof Error ? err.message : "Error desconocido"
        await supabase
          .from("planilla_detalles")
          .update({
            estado_envio: "error",
            error_envio: message,
          })
          .eq("id", row.id)
        fallos++
      }
    }

    return NextResponse.json({
      success: true,
      enviados,
      fallos,
      total: rows.length,
    })
  } catch (error) {
    console.error(error)
    let message = "Error inesperado en el servidor."
    if (error instanceof Error) {
      message = error.message
    } else if (
      typeof error === "object" &&
      error !== null &&
      "message" in error
    ) {
      message = String((error as { message: unknown }).message)
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
