"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Trash2, Lock, CheckCircle, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth"

export default function SettingsPage() {
  const { appUser, user } = useAuth()
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")
    setPasswordSuccess("")
    setChangingPassword(true)

    try {
      // Vérifications
      if (!oldPassword || !newPassword || !confirmPassword) {
        setPasswordError("Veuillez remplir tous les champs")
        setChangingPassword(false)
        return
      }

      if (newPassword !== confirmPassword) {
        setPasswordError("Les nouveaux mots de passe ne correspondent pas")
        setChangingPassword(false)
        return
      }

      if (newPassword.length < 6) {
        setPasswordError("Le nouveau mot de passe doit contenir au moins 6 caractères")
        setChangingPassword(false)
        return
      }

      if (oldPassword === newPassword) {
        setPasswordError("Le nouveau mot de passe doit être différent de l'ancien")
        setChangingPassword(false)
        return
      }

      if (!user || !user.email) {
        setPasswordError("Vous devez être connecté pour changer votre mot de passe")
        setChangingPassword(false)
        return
      }

      // Réauthentifier l'utilisateur
      const credential = EmailAuthProvider.credential(user.email, oldPassword)
      await reauthenticateWithCredential(user, credential)

      // Mettre à jour le mot de passe
      await updatePassword(user, newPassword)

      setPasswordSuccess("Mot de passe modifié avec succès!")
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")

      // Effacer le message de succès après 5 secondes
      setTimeout(() => setPasswordSuccess(""), 5000)
    } catch (err: any) {
      console.error("Erreur lors du changement de mot de passe:", err)
      if (err.code === "auth/wrong-password") {
        setPasswordError("L'ancien mot de passe est incorrect")
      } else if (err.code === "auth/weak-password") {
        setPasswordError("Le nouveau mot de passe est trop faible. Utilisez au moins 6 caractères.")
      } else if (err.code === "auth/requires-recent-login") {
        setPasswordError(
          "Votre session a expiré. Veuillez vous reconnecter et réessayer de changer votre mot de passe."
        )
      } else {
        setPasswordError(`Erreur lors du changement de mot de passe: ${err.message || err}`)
      }
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">Gérez les paramètres de votre compte</p>
      </div>

      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Informations du compte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Nom</p>
                <p className="font-medium">{appUser?.name || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{appUser?.email || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Téléphone</p>
                <p className="font-medium">{appUser?.phone || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rôle</p>
                <p className="font-medium">Administrateur</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ID utilisateur</p>
                <p className="font-medium text-xs text-muted-foreground font-mono">{appUser?.uid || "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Modifier le mot de passe
              </CardTitle>
              <CardDescription>
                Changez votre mot de passe pour sécuriser votre compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="oldPassword">Ancien mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="oldPassword"
                      type={showOldPassword ? "text" : "password"}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Entrez votre ancien mot de passe"
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                    >
                      {showOldPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Entrez votre nouveau mot de passe"
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Le mot de passe doit contenir au moins 6 caractères
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirmez votre nouveau mot de passe"
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                {passwordError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{passwordError}</AlertDescription>
                  </Alert>
                )}

                {passwordSuccess && (
                  <Alert className="border-green-500 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">{passwordSuccess}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={changingPassword} className="w-full">
                  {changingPassword ? "Modification..." : "Modifier le mot de passe"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Zone de danger
            </CardTitle>
            <CardDescription>
              Actions irréversibles concernant votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Attention:</strong> La suppression de votre compte est une action
                irréversible. Toutes vos données (compte, expéditions, informations personnelles)
                seront définitivement supprimées et ne pourront pas être récupérées.
              </AlertDescription>
            </Alert>

            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Si vous souhaitez supprimer votre compte et toutes vos données, cliquez sur le
                bouton ci-dessous. Vous serez redirigé vers une page de confirmation où vous devrez
                confirmer votre identité.
              </p>
              <Link href="/delete-account">
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer mon compte
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
