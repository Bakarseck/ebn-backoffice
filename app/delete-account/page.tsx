"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Trash2, Shield, Package, LogIn } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore"
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth"
import { db, auth } from "@/lib/firebase"
import Link from "next/link"

export default function DeleteAccountPage() {
  const { user, appUser, logout, loading: authLoading } = useAuth()
  const router = useRouter()
  const [confirmEmail, setConfirmEmail] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [confirmText, setConfirmText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState<"warning" | "confirm" | "deleting">("warning")

  // Rediriger vers login si non connecté
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/delete-account&message=Veuillez vous connecter pour supprimer votre compte")
    }
  }, [user, authLoading, router])

  // Si l'utilisateur est connecté mais n'a pas de données Firestore, utiliser les données Firebase Auth
  const userEmail = appUser?.email || user?.email || ""
  const userUid = appUser?.uid || user?.uid || ""
  const userName = appUser?.name || user?.displayName || "Utilisateur"
  const userPhone = appUser?.phone || ""

  const handleDeleteAccount = async () => {
    if (!user || !userUid) {
      setError("Vous devez être connecté pour supprimer votre compte")
      return
    }

    // Vérifier la confirmation
    if (confirmEmail !== userEmail) {
      setError("L'email ne correspond pas")
      return
    }

    if (confirmText !== "SUPPRIMER") {
      setError("Vous devez écrire 'SUPPRIMER' en majuscules pour confirmer")
      return
    }

    setLoading(true)
    setError("")
    setStep("deleting")

    try {
      // 1. Réauthentifier l'utilisateur pour confirmer l'identité
      if (!user.email) {
        throw new Error("Email non disponible")
      }

      const credential = EmailAuthProvider.credential(user.email, confirmPassword)
      await reauthenticateWithCredential(user, credential)

      // 2. Supprimer tous les shipments de l'utilisateur
      console.log("Suppression des shipments de l'utilisateur...")
      const shipmentsRef = collection(db, "shipments")
      
      // Rechercher tous les shipments
      const allShipmentsSnapshot = await getDocs(shipmentsRef)
      
      // Filtrer les shipments qui appartiennent à l'utilisateur
      const userShipments = allShipmentsSnapshot.docs.filter((shipmentDoc) => {
        const data = shipmentDoc.data()
        const userId = data.userId
        const senderEmail = data.sender?.email || data.senderEmail
        const senderPhone = data.sender?.phone || data.senderPhone
        const recipientEmail = data.recipient?.email || data.recipientEmail
        const recipientPhone = data.recipient?.phone || data.recipientPhone
        
        return (
          userId === userUid ||
          senderEmail === userEmail ||
          senderPhone === userPhone ||
          recipientEmail === userEmail ||
          recipientPhone === userPhone
        )
      })

      if (userShipments.length > 0) {
        // Utiliser un batch pour supprimer tous les shipments
        const batchSize = 500
        for (let i = 0; i < userShipments.length; i += batchSize) {
          const batch = writeBatch(db)
          const batchDocs = userShipments.slice(i, i + batchSize)
          batchDocs.forEach((shipmentDoc) => {
            batch.delete(shipmentDoc.ref)
          })
          await batch.commit()
        }
        console.log(`${userShipments.length} shipments supprimés`)
      } else {
        console.log("Aucun shipment trouvé pour cet utilisateur")
      }

      // 3. Supprimer le document Firestore de l'utilisateur (si existe)
      console.log("Suppression du document Firestore...")
      try {
        // Essayer de supprimer par UID
        const userDocRef = doc(db, "users", userUid)
        await deleteDoc(userDocRef)
        console.log("Document Firestore supprimé (par UID)")
      } catch (deleteError: any) {
        // Si le document n'existe pas par UID, essayer par email
        if (userEmail) {
          try {
            const userDocByEmailRef = doc(db, "users", userEmail)
            await deleteDoc(userDocByEmailRef)
            console.log("Document Firestore supprimé (par email)")
          } catch (emailDeleteError) {
            console.warn("Impossible de supprimer le document Firestore:", emailDeleteError)
            // Continuer quand même avec la suppression du compte Firebase Auth
          }
        }
      }

      // 4. Supprimer le compte Firebase Auth
      console.log("Suppression du compte Firebase Auth...")
      await deleteUser(user)
      console.log("Compte Firebase Auth supprimé")

      // 5. Déconnecter et rediriger
      await logout()
      router.push("/login?deleted=true")
    } catch (err: any) {
      console.error("Erreur lors de la suppression du compte:", err)
      setStep("confirm")
      setLoading(false)

      if (err.code === "auth/wrong-password") {
        setError("Mot de passe incorrect")
      } else if (err.code === "auth/requires-recent-login") {
        setError("Votre session a expiré. Veuillez vous reconnecter et réessayer.")
      } else if (err.code === "permission-denied") {
        setError(
          "Erreur de permissions. Assurez-vous que les règles Firestore permettent la suppression de documents."
        )
      } else {
        setError(`Erreur lors de la suppression: ${err.message || err}`)
      }
    }
  }

  // Afficher un message de chargement pendant la vérification de l'authentification
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f1419]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Si non connecté, afficher un message avec un lien vers la connexion
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f1419] p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Connexion requise
            </CardTitle>
            <CardDescription>
              Vous devez être connecté pour supprimer votre compte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">Se connecter</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === "warning") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f1419] p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Attention: Suppression définitive
            </CardTitle>
            <CardDescription>
              Vous êtes sur le point de supprimer définitivement votre compte et toutes vos données.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Cette action est irréversible.</strong> Toutes les données suivantes seront
                définitivement supprimées:
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium">Compte utilisateur</p>
                  <p className="text-sm text-muted-foreground">
                    Votre compte Firebase Auth et votre profil utilisateur seront définitivement
                    supprimés.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium">Expéditions</p>
                  <p className="text-sm text-muted-foreground">
                    Toutes vos expéditions associées à votre compte seront définitivement
                    supprimées.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Trash2 className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium">Données personnelles</p>
                  <p className="text-sm text-muted-foreground">
                    Toutes vos données personnelles (nom, email, téléphone, etc.) seront
                    définitivement supprimées.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-4">
                Si vous êtes sûr de vouloir supprimer votre compte, cliquez sur le bouton ci-dessous
                pour continuer.
              </p>
              <Button
                variant="destructive"
                onClick={() => setStep("confirm")}
                className="w-full"
              >
                Je comprends, continuer
              </Button>
              <Link href="/login">
                <Button variant="outline" className="w-full mt-2">
                  Annuler
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === "deleting") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f1419] p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-center text-muted-foreground">
                Suppression de votre compte et de toutes vos données...
                <br />
                Veuillez patienter, cela peut prendre quelques instants.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f1419] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Dernière confirmation
          </CardTitle>
          <CardDescription>
            Pour des raisons de sécurité, veuillez confirmer votre identité avant de supprimer votre
            compte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirmEmail">Confirmez votre email</Label>
            <Input
              id="confirmEmail"
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={userEmail}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmez votre mot de passe</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Entrez votre mot de passe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmText">
              Tapez <strong>SUPPRIMER</strong> pour confirmer
            </Label>
            <Input
              id="confirmText"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="SUPPRIMER"
              required
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="pt-4 border-t space-y-2">
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={loading || !confirmEmail || !confirmPassword || confirmText !== "SUPPRIMER"}
              className="w-full"
            >
              {loading ? "Suppression..." : "Supprimer définitivement mon compte"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setStep("warning")}
              disabled={loading}
              className="w-full"
            >
              Retour
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

