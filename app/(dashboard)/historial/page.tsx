"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type DetalleMini = { estado_envio: string | null }

type PlanillaRow = {
  id: string
  mes: number
  anio: number
  estado: string | null
  planilla_detalles?: DetalleMini[] | null
}

function summarize(detalles: DetalleMini[] | null | undefined) {
  const list = detalles ?? []
  let enviado = 0
  let pendiente = 0
  let error = 0
  for (const d of list) {
    const s = d.estado_envio ?? "pendiente"
    if (s === "enviado") enviado++
    else if (s === "error") error++
    else pendiente++
  }
  return { total: list.length, enviado, pendiente, error }
}

const mesLabel = (m: number) =>
  new Date(2000, m - 1, 1).toLocaleString("es", { month: "long" })

type EnviarResponse = {
  success?: boolean
  message?: string
  enviados?: number
  fallos?: number
  total?: number
  error?: string
}

export default function HistorialPage() {
  const [rows, setRows] = useState<PlanillaRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const loadRows = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    const { data, error: q } = await supabase
      .from("planillas")
      .select("id, mes, anio, estado, planilla_detalles(estado_envio)")
      .order("anio", { ascending: false })
      .order("mes", { ascending: false })

    if (q) {
      if (!silent) setError("No se pudo cargar el historial.")
      if (!silent) setRows([])
    } else {
      setRows((data as PlanillaRow[]) ?? [])
    }
    if (!silent) setLoading(false)
  }

  useEffect(() => {
    void loadRows()
  }, [])

  const retryErroresPlanilla = async (planillaId: string) => {
    setActionMsg(null)
    setRetryingId(planillaId)
    try {
      const res = await fetch("/api/enviar-planillas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soloErrores: true, planillaId }),
      })
      const body = (await res.json()) as EnviarResponse
      if (!res.ok) {
        setActionMsg(body.error ?? "Error al reintentar envíos.")
        return
      }
      const detail =
        body.total != null
          ? `Procesados: ${body.total}. Enviados: ${body.enviados ?? 0}. Fallos: ${body.fallos ?? 0}.`
          : (body.message ?? "Listo.")
      setActionMsg(detail)
      await loadRows({ silent: true })
    } catch {
      setActionMsg("No se pudo contactar al servidor.")
    } finally {
      setRetryingId(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Historial de envíos
          </h1>
          <p className="text-sm text-muted-foreground">
            Planillas guardadas, reintento de errores y descarga ZIP de boletas
            ya enviadas.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/planillas">Ir a planillas</Link>
        </Button>
      </div>

      {actionMsg && (
        <p className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground">
          {actionMsg}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Planillas</CardTitle>
          <CardDescription>
            El ZIP incluye un PDF por cada detalle con estado enviado (carta
            horizontal, dos boletas iguales por hoja).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 text-sm text-destructive">{error}</p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Estado planilla</TableHead>
                <TableHead className="text-right">Detalles</TableHead>
                <TableHead className="text-right">Enviados</TableHead>
                <TableHead className="text-right">Pendientes</TableHead>
                <TableHead className="text-right">Error</TableHead>
                <TableHead className="w-[120px] text-right">Reintento</TableHead>
                <TableHead className="w-[100px] text-right">ZIP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground">
                    Cargando…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground">
                    Aún no hay planillas guardadas.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((p) => {
                  const { total, enviado, pendiente, error: err } = summarize(
                    p.planilla_detalles
                  )
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium capitalize">
                        {mesLabel(p.mes)} {p.anio}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {p.estado ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{total}</TableCell>
                      <TableCell className="text-right text-emerald-700 dark:text-emerald-400">
                        {enviado}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {pendiente}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {err}
                      </TableCell>
                      <TableCell className="text-right">
                        {err > 0 ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={retryingId !== null}
                            onClick={() => retryErroresPlanilla(p.id)}
                          >
                            {retryingId === p.id ? "Enviando…" : "Reintentar"}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {enviado > 0 ? (
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={`/api/planillas/${p.id}/boletas-zip`}
                              download
                            >
                              Descargar
                            </a>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
