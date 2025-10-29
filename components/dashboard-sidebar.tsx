"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Package, MapPin, Settings, LogOut } from "lucide-react"
import Image from "next/image"

const navigation = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { name: "Expéditions", href: "/dashboard/orders", icon: Package },
  { name: "Suivi", href: "/dashboard/tracking", icon: MapPin },
  { name: "Paramètres", href: "/dashboard/settings", icon: Settings },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { logout, user } = useAuth()

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r border-border">
      <div className="flex h-16 items-center justify-center border-b border-border px-6">
        <Image src="/logo.png" alt="EBN Express" width={140} height={40} className="object-contain" />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border p-4">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium">{user?.email}</p>
          <p className="text-xs text-muted-foreground">Administrateur</p>
        </div>
        <Button variant="outline" className="w-full justify-start bg-transparent" onClick={() => logout()}>
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  )
}
