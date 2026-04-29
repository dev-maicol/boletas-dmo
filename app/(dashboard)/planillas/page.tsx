"use client"

import { useMemo, useState } from "react"
import * as XLSX from "xlsx"
import { Trash2 } from "lucide-react"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

function parseExcelDate(value: unknown) {
  if (!value) return null
  if (typeof value === "string") return value
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value)
    if (!date) return null
    return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`
  }
  return null
}

const COLUMN_ORDER = [
  "nombre",
  "cargo",
  "ci",
  "fecha_ingreso",
  "haber_basico",
  "dias_trabajados",
  "haber_mensual",
  "bono_antiguedad",
  "total_ganado",
  "afp",
  "otros_descuentos",
  "total_descuentos",
  "liquido_pagable",
  "email",
  "sucursal",
] as const

const COLUMN_LABELS: Record<(typeof COLUMN_ORDER)[number] | "errores", string> =
  {
    nombre: "Nombre",
    cargo: "Cargo",
    ci: "C.I.",
    fecha_ingreso: "Fecha ingreso",
    haber_basico: "Haber básico",
    dias_trabajados: "Días trab.",
    haber_mensual: "Haber mensual",
    bono_antiguedad: "Bono antigüedad",
    total_ganado: "Total ganado",
    afp: "AFP",
    otros_descuentos: "Otros desc.",
    total_descuentos: "Total desc.",
    liquido_pagable: "Líquido pagable",
    email: "Correo",
    sucursal: "Sucursal (BD)",
    errores: "Validación",
  }

function formatCell(key: string, val: unknown) {
  if (val == null || val === "") return "—"
  if (typeof val === "object" && val !== null && "nombre" in (val as object)) {
    return String((val as { nombre?: string }).nombre ?? "—")
  }
  if (typeof val === "number" && !Number.isNaN(val)) return val.toFixed(2)
  return String(val)
}

const MESES = Array.from({ length: 12 }, (_, i) => i + 1)
const currentYear = new Date().getFullYear()
const ANIOS = [currentYear - 1, currentYear, currentYear + 1]

type PlanillaRow = Record<string, unknown> & { errores?: string[] }

export default function PlanillasPage() {
  const [data, setData] = useState<PlanillaRow[]>([])
  const [validatedData, setValidatedData] = useState<PlanillaRow[]>([])
  const [isValidated, setIsValidated] = useState(false)
  const [showOnlyOk, setShowOnlyOk] = useState(false)
  const [excludedOkRows, setExcludedOkRows] = useState<string[]>([])
  const [mes, setMes] = useState(String(new Date().getMonth() + 1))
  const [anio, setAnio] = useState(String(currentYear))

  const [loadingSave, setLoadingSave] = useState(false)
  const [loadingVerify, setLoadingVerify] = useState(false)
  const [loadingSend, setLoadingSend] = useState(false)
  const [banner, setBanner] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const sourceData: PlanillaRow[] = isValidated ? validatedData : data
  const tableData: PlanillaRow[] =
    isValidated && showOnlyOk
      ? sourceData.filter((row) => {
          const ci = String(row.ci ?? "")
          return (row.errores?.length ?? 0) === 0 && !excludedOkRows.includes(ci)
        })
      : sourceData

  const visibleColumns = useMemo(() => {
    if (tableData.length === 0) return []
    const keys = new Set<string>()
    tableData.forEach((row) => {
      Object.keys(row).forEach((k) => {
        if (k !== "errores") keys.add(k)
      })
    })
    return COLUMN_ORDER.filter((c) => keys.has(c))
  }, [tableData])

  type EnviarBody = {
    soloErrores?: boolean
    planillaId?: string
    message?: string
    enviados?: number
    fallos?: number
    total?: number
    error?: string
  }

  const callEnviarApi = async (opts: { soloErrores?: boolean; planillaId?: string } = {}) => {
    setBanner(null)
    setLoadingSend(true)
    try {
      const res = await fetch("/api/enviar-planillas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      })
      const body = (await res.json().catch(() => ({}))) as EnviarBody
      if (!res.ok) {
        setBanner({
          type: "error",
          text: body.error ?? "Error en el envío",
        })
        return
      }
      const detail =
        body.total != null
          ? ` Procesados: ${body.total}. Enviados: ${body.enviados ?? 0}. Fallos: ${body.fallos ?? 0}.`
          : ""
      const base =
        body.message ??
        (opts.soloErrores
          ? "Reintento de correos con error finalizado."
          : "Proceso de envío de pendientes finalizado.")
      setBanner({
        type: "success",
        text: `${base}${detail} En Historial puede descargar un ZIP con los PDF enviados.`,
      })
    } catch {
      setBanner({ type: "error", text: "No se pudo contactar al servidor." })
    } finally {
      setLoadingSend(false)
    }
  }

  const removeOkRow = (ci: string) => {
    setExcludedOkRows((prev) => (prev.includes(ci) ? prev : [...prev, ci]))
  }

  const restoreExcludedOkRows = () => {
    setExcludedOkRows([])
  }

  const savePlanilla = async () => {
    setBanner(null)
    if (!isValidated) {
      setBanner({ type: "error", text: "Primero debe verificar los datos." })
      return
    }

    const rowsToSave = showOnlyOk
      ? validatedData.filter((row) => {
          const ci = String(row.ci ?? "")
          return (row.errores?.length ?? 0) === 0 && !excludedOkRows.includes(ci)
        })
      : validatedData

    if (rowsToSave.length === 0) {
      setBanner({
        type: "error",
        text: "No hay filas válidas para guardar con el filtro actual.",
      })
      return
    }

    const hasErrors = rowsToSave.some(
      (row) => row.errores && row.errores.length > 0
    )
    if (hasErrors) {
      setBanner({
        type: "error",
        text: "Hay filas con errores. Corrija la planilla o los datos en trabajadores antes de guardar.",
      })
      return
    }

    const mesNum = Number(mes)
    const anioNum = Number(anio)
    if (!mesNum || !anioNum) {
      setBanner({ type: "error", text: "Seleccione mes y año válidos." })
      return
    }

    try {
      setLoadingSave(true)

      const { data: planilla, error: errorPlanilla } = await supabase
        .from("planillas")
        .insert([{ mes: mesNum, anio: anioNum, estado: "procesado" }])
        .select()
        .single()

      if (errorPlanilla) throw errorPlanilla

      const detalles = rowsToSave.map((row) => ({
        planilla_id: planilla.id,
        ci: row.ci,
        nombre: row.nombre,
        cargo: row.cargo,
        fecha_ingreso: row.fecha_ingreso || null,
        haber_basico: Number(row.haber_basico),
        dias_trabajados: Number(row.dias_trabajados),
        haber_mensual: Number(row.haber_mensual),
        bono_antiguedad: Number(row.bono_antiguedad),
        total_ganado: Number(row.total_ganado),
        afp: Number(row.afp),
        otros_descuentos: Number(row.otros_descuentos),
        total_descuentos: Number(row.total_descuentos),
        liquido_pagable: Number(row.liquido_pagable),
        email: row.email || null,
        estado_envio: "pendiente",
      }))

      const { error: errorDetalles } = await supabase
        .from("planilla_detalles")
        .insert(detalles)

      if (errorDetalles) throw errorDetalles

      setBanner({ type: "success", text: "Planilla guardada correctamente." })
      setData([])
      setValidatedData([])
      setIsValidated(false)
      setShowOnlyOk(false)
      setExcludedOkRows([])
    } catch (e) {
      console.error(e)
      setBanner({
        type: "error",
        text: "No se pudo guardar. Revise la consola o permisos de Supabase.",
      })
    } finally {
      setLoadingSave(false)
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const binaryStr = evt.target?.result
      const workbook = XLSX.read(binaryStr, { type: "binary" })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
      }) as Record<string, unknown>[]

      const cleanData = jsonData
        .filter((row) => {
          const values = Object.values(row)
          const nro = values[0]
          const nombre = String(values[1] ?? "")
            .trim()
            .toUpperCase()
          const ci = String(values[3] ?? "")
            .trim()
            .toUpperCase()

          if (!nro || Number.isNaN(Number(nro))) return false
          if (!nombre || nombre === "NOMBRE") return false
          if (!ci || ci === "C.I.") return false
          if (["SUBTOTAL", "SUCURSAL", "TOTAL"].some((w) => nombre.includes(w)))
            return false

          return true
        })
        .map((row) => {
          const values = Object.values(row)
          return {
            nombre: values[1],
            cargo: values[2],
            ci: String(values[3]).trim(),
            fecha_ingreso: parseExcelDate(values[4]),
            haber_basico: (Number(values[6]) || 0).toFixed(2),
            dias_trabajados: String(values[7] ?? "").trim() || "0",
            haber_mensual: (Number(values[8]) || 0).toFixed(2),
            bono_antiguedad: (Number(values[11]) || 0).toFixed(2),
            total_ganado: (Number(values[12]) || 0).toFixed(2),
            afp: (
              (Number(values[16]) || 0) + (Number(values[17]) || 0)
            ).toFixed(2),
            otros_descuentos: (
              (Number(values[19]) || 0) + (Number(values[20]) || 0)
            ).toFixed(2),
            total_descuentos: (Number(values[22]) || 0).toFixed(2),
            liquido_pagable: (Number(values[23]) || 0).toFixed(2),
          }
        })

      setData(cleanData as PlanillaRow[])
      setValidatedData([])
      setIsValidated(false)
      setShowOnlyOk(false)
      setExcludedOkRows([])
      setBanner({
        type: "success",
        text: `Se importaron ${cleanData.length} filas desde el Excel.`,
      })
    }
    reader.readAsBinaryString(file)
    e.target.value = ""
  }

  const validateData = async () => {
    setBanner(null)
    if (data.length === 0) return
    setLoadingVerify(true)
    try {
      const ciList = data.map((row) => String(row.ci))

      const { data: trabajadores, error } = await supabase
        .from("trabajadores")
        .select(
          "ci, email, sucursal_id, sucursales(nombre, direccion, numero_empleador)"
        )
        .in("ci", ciList)

      if (error) {
        setBanner({ type: "error", text: "Error al consultar trabajadores." })
        return
      }

      const result = data.map((row) => {
        const errores: string[] = []
        const ci = String(row.ci ?? "").trim()
        const trabajador = trabajadores?.find((t) => t.ci === ci)

        if (!ci) errores.push("CI vacío")
        if (ci && ci.length < 5) errores.push("CI inválido")
        if (!row.nombre) errores.push("Nombre vacío")
        if (Number(row.haber_basico) <= 0)
          errores.push("Haber básico debe ser mayor a 0")
        if (Number(row.liquido_pagable) <= 0)
          errores.push("Líquido pagable debe ser mayor a 0")

        if (!trabajador) {
          errores.push("No existe en base de datos")
        } else {
          if (!trabajador.email) errores.push("Sin correo en BD")
          if (!trabajador.sucursal_id) errores.push("Sin sucursal asignada")
        }

        return {
          ...row,
          ci,
          email: trabajador?.email ?? "",
          sucursal: trabajador?.sucursales ?? null,
          errores,
        }
      })

      setValidatedData(result)
      setIsValidated(true)
      setShowOnlyOk(false)
      setExcludedOkRows([])
    } finally {
      setLoadingVerify(false)
    }
  }

  const errorCount = isValidated
    ? validatedData.filter((r) => r.errores?.length).length
    : 0
  const okCount = isValidated
    ? validatedData.filter((r) => (r.errores?.length ?? 0) === 0).length
    : 0
  const excludedOkCount = excludedOkRows.length

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Planillas
        </h1>
        <p className="text-sm text-muted-foreground">
          Cargue el Excel, verifique contra la base de datos, guarde y envíe las
          boletas por correo.
        </p>
      </div>

      {banner && (
        <div
          role="status"
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            banner.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          {banner.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Parámetros e importación</CardTitle>
          <CardDescription>
            Mes y año definen la planilla guardada. La sucursal en el PDF sale
            del trabajador, no del archivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Mes</Label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {new Date(2000, m - 1, 1).toLocaleString("es", {
                        month: "long",
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Año</Label>
              <Select value={anio} onValueChange={setAnio}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {ANIOS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="excel">Archivo Excel</Label>
              <Input
                id="excel"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFile}
                className="cursor-pointer"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={data.length === 0 || loadingVerify}
              onClick={validateData}
            >
              {loadingVerify ? "Verificando…" : "Verificar"}
            </Button>
            <Button
              type="button"
              disabled={!isValidated || loadingSave}
              onClick={savePlanilla}
            >
              {loadingSave ? "Guardando…" : "Guardar planilla"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loadingSend}
              onClick={() => callEnviarApi()}
            >
              {loadingSend ? "Enviando…" : "Enviar pendientes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loadingSend}
              onClick={() => callEnviarApi({ soloErrores: true })}
            >
              {loadingSend ? "Enviando…" : "Reintentar solo errores"}
            </Button>
            <Button
              type="button"
              variant={showOnlyOk ? "secondary" : "outline"}
              disabled={!isValidated}
              onClick={() => setShowOnlyOk((prev) => !prev)}
            >
              {showOnlyOk ? "Mostrar todos" : "Filtrar (solo OK)"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!isValidated || excludedOkRows.length === 0}
              onClick={restoreExcludedOkRows}
            >
              Restaurar excluidas
            </Button>
          </div>
          {isValidated && (
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                {errorCount === 0
                  ? "Todas las filas pasaron las validaciones."
                  : `${errorCount} fila(s) con observaciones.`}
              </p>
              <p>
                Mostrando {tableData.length} de {validatedData.length} fila(s).
                {showOnlyOk &&
                  ` Filtradas OK: ${okCount}. Excluidas manualmente: ${excludedOkCount}.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {tableData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vista previa</CardTitle>
            <CardDescription>
              Tras verificar se muestran correo y sucursal desde la base de
              datos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    {visibleColumns.map((key) => (
                      <TableHead key={key}>
                        {COLUMN_LABELS[key] ?? key}
                      </TableHead>
                    ))}
                    {isValidated && (
                      <TableHead>{COLUMN_LABELS.errores}</TableHead>
                    )}
                    {isValidated && showOnlyOk && (
                      <TableHead className="w-[90px] text-right">Acción</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((row, i) => {
                    const hasErr = (row.errores?.length ?? 0) > 0
                    return (
                      <TableRow
                        key={i}
                        className={cn(hasErr && "bg-destructive/5")}
                      >
                        <TableCell className="text-muted-foreground">
                          {i + 1}
                        </TableCell>
                        {visibleColumns.map((key) => (
                          <TableCell key={key}>
                            {formatCell(key, row[key])}
                          </TableCell>
                        ))}
                        {isValidated && (
                          <TableCell>
                            {hasErr ? (
                              <div className="flex flex-wrap gap-1">
                                {row.errores?.map((err) => (
                                  <Badge
                                    key={err}
                                    variant="destructive"
                                    className="font-normal"
                                  >
                                    {err}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <Badge variant="secondary" className="font-normal">
                                OK
                              </Badge>
                            )}
                          </TableCell>
                        )}
                        {isValidated && showOnlyOk && !hasErr && (
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeOkRow(String(row.ci ?? ""))}
                              aria-label={`Excluir fila ${i + 1}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
