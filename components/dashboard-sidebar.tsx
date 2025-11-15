"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useSidebar } from "./sidebar-context"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Package, MapPin, Settings, LogOut, Users, ChevronLeft, ChevronRight, UserCheck } from "lucide-react"
import Image from "next/image"

const navigation = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { name: "Expéditions", href: "/dashboard/orders", icon: Package },
  { name: "Suivi", href: "/dashboard/tracking", icon: MapPin },
  { name: "Chauffeurs", href: "/dashboard/chauffeurs", icon: UserCheck },
  { name: "Utilisateurs", href: "/dashboard/users", icon: Users },
  { name: "Paramètres", href: "/dashboard/settings", icon: Settings },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { logout, appUser } = useAuth()
  const { isOpen, toggle } = useSidebar()

  return (
    <div
      className={cn(
        "relative flex h-full flex-col bg-card border-r border-border transition-all duration-300 ease-in-out",
        isOpen ? "w-64" : "w-20"
      )}
    >
      {/* Bouton toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        className={cn(
          "absolute -right-3 top-20 z-50 h-6 w-6 rounded-full border border-border bg-card shadow-md hover:bg-accent transition-all duration-300",
          isOpen ? "" : ""
        )}
      >
        {isOpen ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>

      {/* Logo */}
      <div className={cn("flex h-28 items-center justify-center border-b border-border px-6 py-8 transition-all duration-300", isOpen ? "" : "px-2")}>
        {isOpen ? (
          <Image src="/logo.png" alt="EBN Express" width={140} height={40} className="object-contain mt-4" />
        ) : (
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
            <Image src="/logo.png" alt="EBN Express" width={32} height={32} className="object-contain" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors group relative",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                !isOpen && "justify-center"
              )}
              title={!isOpen ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span
                className={cn(
                  "transition-all duration-300 whitespace-nowrap",
                  isOpen ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                )}
              >
                {item.name}
              </span>
              {/* Tooltip quand la sidebar est fermée */}
              {!isOpen && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {item.name}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        {isOpen ? (
          <>
            <div className="mb-3 px-3">
              <p className="text-sm font-medium truncate">{appUser?.name || appUser?.email}</p>
              <p className="text-xs text-muted-foreground">Administrateur</p>
            </div>
            <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-full"
              onClick={() => logout()}
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
