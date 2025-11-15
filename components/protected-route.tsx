"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldX } from "lucide-react"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, appUser, isAdmin, loading, logout } = useAuth()
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!loading) {
      setChecked(true)
      if (!user) {
        router.push("/login")
      } else if (!appUser) {
        // User exists in Firebase Auth but not in Firestore users collection
        // Sign out and redirect to login
        logout()
        router.push("/login?error=no_user_data")
      } else if (!isAdmin) {
        // User is not an admin - they'll see an error message below
      }
    }
  }, [user, appUser, isAdmin, loading, router, logout])

  if (loading || !checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!appUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldX className="h-5 w-5 text-destructive" />
              Accès refusé
            </CardTitle>
            <CardDescription>Vos données utilisateur ne sont pas disponibles.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => logout()} className="w-full">
              Se déconnecter
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldX className="h-5 w-5 text-destructive" />
              Accès refusé
            </CardTitle>
            <CardDescription>
              Seuls les administrateurs peuvent accéder au backoffice.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Vous êtes connecté en tant que : <strong>{appUser.name}</strong></p>
              <p>Rôle : <strong>{appUser.role}</strong></p>
            </div>
            <Button onClick={() => logout()} className="w-full">
              Se déconnecter
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
