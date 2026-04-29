"use client"

import { useEffect, useMemo, useState } from "react"
import { Pencil, Trash2 } from "lucide-react"

import { supabase } from "@/lib/supabase"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Trabajador = {
  id: string
  ci: string
  nombre: string
  email: string | null
  sucursal_id: string | null
  sucursales?: { nombre: string } | null
}

type Sucursal = { id: string; nombre: string }

const emptyForm = {
  ci: "",
  nombre: "",
  email: "",
  sucursal_id: "",
}

export default function TrabajadoresPage() {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Trabajador | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState("")
  const [sucursalFilter, setSucursalFilter] = useState("__all__")
  const [pageSize, setPageSize] = useState("10")
  const [currentPage, setCurrentPage] = useState(1)

  const fetchData = async () => {
    setLoadError(null)
    const { data: t, error: e1 } = await supabase
      .from("trabajadores")
      .select("id, ci, nombre, email, sucursal_id, sucursales (nombre)")
      .order("nombre")

    if (e1) {
      setLoadError("No se pudieron cargar los trabajadores.")
      return
    }
    setTrabajadores((t as unknown as Trabajador[]) ?? [])

    const { data: s, error: e2 } = await supabase
      .from("sucursales")
      .select("id, nombre")
      .order("nombre")

    if (e2) {
      setLoadError("No se pudieron cargar las sucursales.")
      return
    }
    setSucursales((s as Sucursal[]) ?? [])
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredTrabajadores = useMemo(() => {
    const term = search.trim().toLowerCase()
    return trabajadores.filter((t) => {
      const matchesSearch =
        !term ||
        t.ci.toLowerCase().includes(term) ||
        t.nombre.toLowerCase().includes(term) ||
        (t.email ?? "").toLowerCase().includes(term) ||
        (t.sucursales?.nombre ?? "").toLowerCase().includes(term)

      const matchesSucursal =
        sucursalFilter === "__all__" || t.sucursal_id === sucursalFilter

      return matchesSearch && matchesSucursal
    })
  }, [trabajadores, search, sucursalFilter])

  const pageSizeNumber = Number(pageSize)
  const totalPages = Math.max(
    1,
    Math.ceil(filteredTrabajadores.length / pageSizeNumber)
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [search, sucursalFilter, pageSize, trabajadores.length])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const paginatedTrabajadores = useMemo(() => {
    const start = (currentPage - 1) * pageSizeNumber
    return filteredTrabajadores.slice(start, start + pageSizeNumber)
  }, [filteredTrabajadores, currentPage, pageSizeNumber])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setSheetOpen(true)
    setLoadError(null)
  }

  const openEdit = (t: Trabajador) => {
    setEditingId(t.id)
    setForm({
      ci: t.ci,
      nombre: t.nombre,
      email: t.email ?? "",
      sucursal_id: t.sucursal_id ?? "",
    })
    setSheetOpen(true)
    setLoadError(null)
  }

  const save = async () => {
    if (!form.ci.trim() || !form.nombre.trim()) {
      setLoadError("CI y nombre son obligatorios.")
      return
    }
    setSaving(true)
    setLoadError(null)

    const payload = {
      ci: form.ci.trim(),
      nombre: form.nombre.trim(),
      email: form.email.trim() || null,
      sucursal_id: form.sucursal_id || null,
    }

    const { error } = editingId
      ? await supabase.from("trabajadores").update(payload).eq("id", editingId)
      : await supabase.from("trabajadores").insert([payload])

    setSaving(false)
    if (error) {
      setLoadError(error.message)
      return
    }
    setSheetOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    fetchData()
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setLoadError(null)
    const { error } = await supabase
      .from("trabajadores")
      .delete()
      .eq("id", deleteTarget.id)
    setDeleting(false)
    if (error) {
      setLoadError(
        error.message.includes("foreign key")
          ? "No se puede eliminar: hay datos de planillas u otras tablas que referencian a este trabajador."
          : error.message
      )
      setDeleteTarget(null)
      return
    }
    setDeleteTarget(null)
    fetchData()
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Trabajadores
          </h1>
          <p className="text-sm text-muted-foreground">
            CI único, correo y sucursal necesarios para validar planillas y
            enviar boletas.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          Nuevo trabajador
        </Button>
      </div>

      {loadError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>
            Datos enlazados a sucursales para encabezado del PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="buscar-trabajador">Buscar</Label>
              <Input
                id="buscar-trabajador"
                placeholder="CI, nombre, correo o sucursal"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Sucursal</Label>
              <Select value={sucursalFilter} onValueChange={setSucursalFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {sucursales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filas por página</Label>
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>C.I.</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="w-[120px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTrabajadores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      {trabajadores.length === 0
                        ? "No hay trabajadores registrados."
                        : "No hay resultados con los filtros actuales."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTrabajadores.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.ci}</TableCell>
                      <TableCell>{t.nombre}</TableCell>
                      <TableCell>{t.email ?? "—"}</TableCell>
                      <TableCell>{t.sucursales?.nombre ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(t)}
                            aria-label={`Editar ${t.nombre}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(t)}
                            aria-label={`Eliminar ${t.nombre}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Mostrando {paginatedTrabajadores.length} de {filteredTrabajadores.length} resultado(s)
              {filteredTrabajadores.length !== trabajadores.length &&
                ` (total: ${trabajadores.length})`}
              .
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span>
                Página {currentPage} de {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o)
          if (!o) setEditingId(null)
        }}
      >
        <SheetContent side="right" className="flex flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editingId ? "Editar trabajador" : "Nuevo trabajador"}
            </SheetTitle>
            <SheetDescription>
              La sucursal define dirección y número de empleador en la boleta.
            </SheetDescription>
          </SheetHeader>
          <div className="grid flex-1 gap-4 overflow-y-auto px-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="ci">C.I.</Label>
              <Input
                id="ci"
                value={form.ci}
                readOnly={Boolean(editingId)}
                aria-readonly={Boolean(editingId)}
                className={editingId ? "bg-muted" : undefined}
                onChange={(e) => setForm({ ...form, ci: e.target.value })}
              />
              {editingId && (
                <p className="text-xs text-muted-foreground">
                  El CI no se puede cambiar desde aquí.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Sucursal</Label>
              <Select
                value={form.sucursal_id || "__none__"}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    sucursal_id: v === "__none__" ? "" : v,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione sucursal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin asignar</SelectItem>
                  {sucursales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSheetOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={save}>
              {saving ? "Guardando…" : editingId ? "Actualizar" : "Guardar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar trabajador</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirma eliminar a{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.nombre}
              </span>{" "}
              (CI {deleteTarget?.ci})? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault()
                void confirmDelete()
              }}
              disabled={deleting}
            >
              {deleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
