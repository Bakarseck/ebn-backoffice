import type React from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { SidebarProvider } from "@/components/sidebar-context"
import { DashboardSidebar } from "@/components/dashboard-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <DashboardSidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  )
}
