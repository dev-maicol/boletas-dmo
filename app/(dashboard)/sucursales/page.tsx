"use client"

import { useEffect, useState } from "react"
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

type Sucursal = {
  id: string
  nombre: string
  direccion: string
  numero_empleador: string
}

const emptyForm = {
  nombre: "",
  direccion: "",
  numero_empleador: "",
}

export default function SucursalesPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Sucursal | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchData = async () => {
    setLoadError(null)
    const { data, error } = await supabase
      .from("sucursales")
      .select("*")
      .order("nombre")

    if (error) {
      setLoadError("No se pudieron cargar las sucursales.")
      return
    }
    setSucursales((data as Sucursal[]) ?? [])
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setSheetOpen(true)
    setLoadError(null)
  }

  const openEdit = (s: Sucursal) => {
    setEditingId(s.id)
    setForm({
      nombre: s.nombre,
      direccion: s.direccion,
      numero_empleador: s.numero_empleador,
    })
    setSheetOpen(true)
    setLoadError(null)
  }

  const save = async () => {
    if (
      !form.nombre.trim() ||
      !form.direccion.trim() ||
      !form.numero_empleador.trim()
    ) {
      setLoadError("Nombre, dirección y número de empleador son obligatorios.")
      return
    }
    setSaving(true)
    setLoadError(null)

    const payload = {
      nombre: form.nombre.trim(),
      direccion: form.direccion.trim(),
      numero_empleador: form.numero_empleador.trim(),
    }

    const { error } = editingId
      ? await supabase.from("sucursales").update(payload).eq("id", editingId)
      : await supabase.from("sucursales").insert([payload])

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
      .from("sucursales")
      .delete()
      .eq("id", deleteTarget.id)
    setDeleting(false)
    if (error) {
      setLoadError(
        error.message.includes("foreign key") || error.code === "23503"
          ? "No se puede eliminar: hay trabajadores asignados a esta sucursal."
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
            Sucursales
          </h1>
          <p className="text-sm text-muted-foreground">
            Nombre, dirección y número de empleador se usan en el PDF de cada
            boleta.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          Nueva sucursal
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
            Datos de la empresa por ubicación para el encabezado del PDF.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>N° empleador</TableHead>
                <TableHead className="w-[120px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sucursales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No hay sucursales registradas.
                  </TableCell>
                </TableRow>
              ) : (
                sucursales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.nombre}</TableCell>
                    <TableCell>{s.direccion}</TableCell>
                    <TableCell>{s.numero_empleador}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(s)}
                          aria-label={`Editar ${s.nombre}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(s)}
                          aria-label={`Eliminar ${s.nombre}`}
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
              {editingId ? "Editar sucursal" : "Nueva sucursal"}
            </SheetTitle>
            <SheetDescription>
              Estos campos aparecen en la boleta de pago generada.
            </SheetDescription>
          </SheetHeader>
          <div className="grid flex-1 gap-4 overflow-y-auto px-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) =>
                  setForm({ ...form, nombre: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={form.direccion}
                onChange={(e) =>
                  setForm({ ...form, direccion: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero_empleador">Número de empleador</Label>
              <Input
                id="numero_empleador"
                value={form.numero_empleador}
                onChange={(e) =>
                  setForm({ ...form, numero_empleador: e.target.value })
                }
              />
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
            <AlertDialogTitle>Eliminar sucursal</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirma eliminar la sucursal{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.nombre}
              </span>
              ? No podrá hacerlo si hay trabajadores asignados.
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
