"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  Menu,
  Users,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  SheetClose,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const menu = [
  { name: "Inicio", path: "/", icon: LayoutDashboard },
  { name: "Planillas", path: "/planillas", icon: FileSpreadsheet },
  { name: "Historial", path: "/historial", icon: History },
  { name: "Trabajadores", path: "/trabajadores", icon: Users },
  { name: "Sucursales", path: "/sucursales", icon: Building2 },
]

function isActive(pathname: string, itemPath: string) {
  if (itemPath === "/") return pathname === "/"
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`)
}

type SidebarNavProps = {
  collapsed?: boolean
  closeOnNavigate?: boolean
}

function SidebarNav({ collapsed = false, closeOnNavigate = false }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <div className="flex flex-1 flex-col">
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {menu.map((item) => {
          const Icon = item.icon
          const active = isActive(pathname, item.path)
          const link = (
            <Link
              href={item.path}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center px-2",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
              {!collapsed && item.name}
            </Link>
          )

          return (
            <div key={item.path}>
              {closeOnNavigate ? <SheetClose asChild>{link}</SheetClose> : link}
            </div>
          )
        })}
      </nav>
    </div>
  )
}

type SidebarProps = {
  collapsed: boolean
  onToggleCollapsed: () => void
  showMobileTrigger?: boolean
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  showMobileTrigger = true,
}: SidebarProps) {
  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className="flex items-start justify-between gap-2 p-3">
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-heading text-sm font-semibold tracking-tight text-sidebar-foreground">
                Boletas de pago
              </p>
              <p className="text-xs text-muted-foreground">Planillas y envío</p>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn("shrink-0", collapsed && "mx-auto")}
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          >
            <Menu className="size-4" aria-hidden />
          </Button>
        </div>
        <Separator className="bg-sidebar-border" />
        <SidebarNav collapsed={collapsed} />
      </aside>

      {showMobileTrigger && (
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="icon" aria-label="Abrir menú">
                <Menu className="size-4" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Menú principal</SheetTitle>
                <SheetDescription>Navegación del sistema de planillas.</SheetDescription>
              </SheetHeader>
              <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
                <SidebarNav closeOnNavigate />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </>
  )
}
