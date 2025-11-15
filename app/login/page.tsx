"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { signIn, appUser, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const redirectPath = searchParams.get("redirect") || "/dashboard"
  const message = searchParams.get("message") || ""

  // Afficher le message s'il est présent
  useEffect(() => {
    if (message) {
      setError(message)
      // Effacer le message après 5 secondes si ce n'est pas une vraie erreur
      const timer = setTimeout(() => {
        if (message && !message.includes("incorrect") && !message.includes("erreur")) {
          setError("")
        }
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && appUser) {
      // Si c'est un admin et qu'il n'y a pas de redirect spécifique, aller au dashboard
      if (isAdmin && redirectPath === "/dashboard") {
        router.push("/dashboard")
      } else if (redirectPath) {
        // Sinon, aller à la page de redirect
        router.push(redirectPath)
      } else {
        router.push("/dashboard")
      }
    }
  }, [appUser, isAdmin, authLoading, router, redirectPath])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await signIn(email, password)
      // Wait for the auth state to update and fetch user data from Firestore
      await new Promise((resolve) => setTimeout(resolve, 1000))
      
      // Re-check auth state after a delay to ensure user data is loaded
      // The ProtectedRoute will handle redirecting non-admin users
      // We'll check here too to show a proper error message
      const checkAdmin = async () => {
        await new Promise((resolve) => setTimeout(resolve, 500))
        // Rediriger vers la page spécifiée ou le dashboard par défaut
        if (redirectPath && redirectPath !== "/dashboard") {
          router.push(redirectPath)
        } else {
          router.push("/dashboard")
        }
      }
      await checkAdmin()
    } catch (err: any) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        setError("Email ou mot de passe incorrect")
      } else if (err.code === "auth/user-disabled") {
        setError("Ce compte a été désactivé")
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.")
      }
      setLoading(false)
    }
  }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f1419]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f1419]">
      <Card className="w-full max-w-md border-border/50 bg-card/95 backdrop-blur">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <Image src="/logo.png" alt="EBN Express" width={180} height={60} className="object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold">Backoffice</CardTitle>
          <CardDescription>Connectez-vous pour accéder au tableau de bord</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@ebn-express.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background"
              />
            </div>
            {error && (
              <div className={`text-sm p-3 rounded-md ${
                error.includes("Veuillez") || error.includes("connecter") 
                  ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" 
                  : "text-destructive bg-destructive/10"
              }`}>
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <a
              href="/delete-account"
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Supprimer mon compte
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
