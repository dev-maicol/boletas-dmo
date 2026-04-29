"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Building2,
  FileSpreadsheet,
  History,
  Users,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function DashboardPage() {
  const [counts, setCounts] = useState<{
    trabajadores: number
    sucursales: number
    planillas: number
    pendientes: number
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [t, s, p, d] = await Promise.all([
        supabase.from("trabajadores").select("id", { count: "exact", head: true }),
        supabase.from("sucursales").select("id", { count: "exact", head: true }),
        supabase.from("planillas").select("id", { count: "exact", head: true }),
        supabase
          .from("planilla_detalles")
          .select("id", { count: "exact", head: true })
          .eq("estado_envio", "pendiente"),
      ])
      if (cancelled) return
      setCounts({
        trabajadores: t.count ?? 0,
        sucursales: s.count ?? 0,
        planillas: p.count ?? 0,
        pendientes: d.count ?? 0,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const cards = [
    {
      title: "Trabajadores",
      value: counts?.trabajadores ?? "—",
      desc: "Registrados con CI y correo para envío.",
      href: "/trabajadores",
      icon: Users,
    },
    {
      title: "Sucursales",
      value: counts?.sucursales ?? "—",
      desc: "Datos de empleador en el PDF.",
      href: "/sucursales",
      icon: Building2,
    },
    {
      title: "Planillas",
      value: counts?.planillas ?? "—",
      desc: "Cargas guardadas por período.",
      href: "/planillas",
      icon: FileSpreadsheet,
    },
    {
      title: "Boletas pendientes",
      value: counts?.pendientes ?? "—",
      desc: "Detalles aún no enviados por correo.",
      href: "/planillas",
      icon: History,
    },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Inicio
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Flujo: cargar Excel en Planillas, verificar contra la base de datos,
          guardar y ejecutar el envío de PDFs por correo. Use Trabajadores y
          Sucursales para mantener datos válidos antes de cada carga.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.title} className="flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
                <Icon className="size-4 text-muted-foreground" aria-hidden />
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <p className="font-heading text-2xl font-semibold tabular-nums">
                  {c.value}
                </p>
                <CardDescription className="flex-1">{c.desc}</CardDescription>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={c.href}>Abrir</Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
