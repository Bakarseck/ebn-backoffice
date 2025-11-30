"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Package, User, Clock, Check, MapPin, UserCheck, Trash2, AlertTriangle } from "lucide-react"
import { doc, getDoc, updateDoc, collection, getDocs, query, where, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Shipment, AppUser } from "@/lib/types"
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
import { useToast } from "@/hooks/use-toast"
import { assignCoursierToShipment } from "@/lib/coursier-assignment"

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [chauffeurs, setChauffeurs] = useState<AppUser[]>([])
  const [assigningChauffeur, setAssigningChauffeur] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { toast } = useToast()

  const generateTrackingNumber = () => {
    const prefix = "EBN"
    const timestamp = Date.now().toString().slice(-8)
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `${prefix}${timestamp}${random}`
  }

  const handleAcceptShipment = async () => {
    if (!shipment) return

    setAccepting(true)
    try {
      const shipmentRef = doc(db, "shipments", shipment.id)

      const trackingNumber = generateTrackingNumber()
      
      // Extraire les coordonnées GPS depuis sender.location si disponible (porte à porte)
      // Sinon utiliser des coordonnées aléatoires
      let lon: number
      let lat: number
      
      if (shipment.sender?.location?.longitude && shipment.sender?.location?.latitude) {
        lon = shipment.sender.location.longitude
        lat = shipment.sender.location.latitude
      } else {
        lon = -1.5536 + (Math.random() - 0.5) * 0.1
        lat = 14.6928 + (Math.random() - 0.5) * 0.1
      }

      await updateDoc(shipmentRef, {
        trackingNumber,
        lon,
        lat,
        status: "picked-up",
        updatedAt: new Date(),
      })

      const updatedShipment = {
        ...shipment,
        trackingNumber,
        lon,
        lat,
        status: "picked-up" as const,
        updatedAt: new Date(),
      }

      setShipment(updatedShipment)

      // Assignation automatique pour les colis porte à porte
      if (shipment.routeInfo?.deliveryMode === "porte_a_porte") {
        const assignmentResult = await assignCoursierToShipment(shipment.id, updatedShipment)
        if (assignmentResult.success) {
          setShipment({
            ...updatedShipment,
            coursierId: assignmentResult.coursierId,
            coursierName: assignmentResult.coursierName,
          })
          console.log(`✅ Colis ${trackingNumber} assigné à ${assignmentResult.coursierName}`)
        } else {
          console.warn(`⚠️ Échec de l'assignation pour le colis ${trackingNumber}`)
        }
      }
    } catch (error) {
      console.error("Error accepting shipment:", error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'acceptation de l'expédition.",
        variant: "destructive",
      })
    } finally {
      setAccepting(false)
    }
  }

  useEffect(() => {
    async function fetchShipment() {
      try {
        const shipmentRef = doc(db, "shipments", params.id as string)
        const shipmentDoc = await getDoc(shipmentRef)

        if (shipmentDoc.exists()) {
          const docData = shipmentDoc.data()
          const shipmentData: Shipment = {
            id: shipmentDoc.id,
            ...docData,
            // Mapper packagePrice vers price si packagePrice existe
            price: docData.price || docData.packagePrice,
            // Ensure lat and lon are properly extracted as numbers
            lat: typeof docData.lat === "number" ? docData.lat : typeof docData.lat === "string" ? parseFloat(docData.lat) : docData.lat,
            lon: typeof docData.lon === "number" ? docData.lon : typeof docData.lon === "string" ? parseFloat(docData.lon) : docData.lon,
            createdAt: docData.createdAt?.toDate(),
            updatedAt: docData.updatedAt?.toDate(),
          } as Shipment
          setShipment(shipmentData)
        }
      } catch (error) {
        console.error("Error fetching shipment:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchShipment()
  }, [params.id])

  // Charger la liste des chauffeurs
  useEffect(() => {
    async function fetchChauffeurs() {
      try {
        const usersRef = collection(db, "users")
        const q = query(usersRef, where("role", "==", "chauffeur"))
        const snapshot = await getDocs(q)

        const data = snapshot.docs
          .map((doc) => {
            const docData = doc.data()
            return {
              uid: doc.id,
              email: docData.email || "",
              name: docData.name || "",
              phone: docData.phone || "",
              role: docData.role || "chauffeur",
              fcmToken: docData.fcmToken,
              createdAt: docData.createdAt?.toDate() || new Date(),
              updatedAt: docData.updatedAt?.toDate() || new Date(),
            } as AppUser
          })
          .filter((user) => user.email)

        setChauffeurs(data)
      } catch (error) {
        console.error("Error fetching chauffeurs:", error)
      }
    }

    fetchChauffeurs()
  }, [])

  const handleAssignChauffeur = async (chauffeurId: string) => {
    if (!shipment) return

    setAssigningChauffeur(true)
    try {
      const shipmentRef = doc(db, "shipments", shipment.id)

      if (chauffeurId === "none" || chauffeurId === "") {
        // Retirer l'assignation
        await updateDoc(shipmentRef, {
          chauffeurId: null,
          chauffeurName: null,
          updatedAt: new Date(),
        })

        setShipment({
          ...shipment,
          chauffeurId: undefined,
          chauffeurName: undefined,
          updatedAt: new Date(),
        })
      } else {
        // Assigner un chauffeur
        const selectedChauffeur = chauffeurs.find((c) => c.uid === chauffeurId)

        await updateDoc(shipmentRef, {
          chauffeurId,
          chauffeurName: selectedChauffeur?.name || "",
          updatedAt: new Date(),
        })

        setShipment({
          ...shipment,
          chauffeurId,
          chauffeurName: selectedChauffeur?.name || "",
          updatedAt: new Date(),
        })
      }
    } catch (error) {
      console.error("Error assigning chauffeur:", error)
    } finally {
      setAssigningChauffeur(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!shipment) return

    setUpdating(true)
    try {
      const shipmentRef = doc(db, "shipments", shipment.id)
      await updateDoc(shipmentRef, {
        status: newStatus,
        updatedAt: new Date(),
      })

      setShipment({ ...shipment, status: newStatus as Shipment["status"], updatedAt: new Date() })
    } catch (error) {
      console.error("Error updating status:", error)
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true)
  }

  const handleDeleteShipment = async () => {
    if (!shipment) return

    try {
      setDeleting(true)
      const shipmentRef = doc(db, "shipments", shipment.id)
      await deleteDoc(shipmentRef)
      
      toast({
        title: "Expédition supprimée",
        description: shipment.trackingNumber 
          ? `L'expédition ${shipment.trackingNumber} a été supprimée avec succès.`
          : "L'expédition a été supprimée avec succès.",
        variant: "default",
      })
      
      router.push("/dashboard/orders")
    } catch (error) {
      console.error("Error deleting shipment:", error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression de l'expédition.",
        variant: "destructive",
      })
      setDeleting(false)
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "En attente",
      "picked-up": "Récupéré",
      "in-transit": "En transit",
      "out-for-delivery": "En livraison",
      delivered: "Livré",
      cancelled: "Annulé",
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!shipment) {
    return (
      <div className="p-8">
        <div className="text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Expédition non trouvée</p>
          <Button onClick={() => router.push("/dashboard/orders")} className="mt-4">
            Retour aux expéditions
          </Button>
        </div>
      </div>
    )
  }

  const needsAcceptance = !shipment.trackingNumber

  return (
    <div className="p-8">
      <Button variant="ghost" onClick={() => router.push("/dashboard/orders")} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour
      </Button>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Détails de l'expédition</h1>
          <p className="text-muted-foreground">
            {needsAcceptance ? "En attente d'acceptation" : shipment.trackingNumber}
          </p>
        </div>
        <div className="flex gap-2">
          {needsAcceptance && (
            <Button onClick={handleAcceptShipment} disabled={accepting} size="lg">
              {accepting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Acceptation...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Accepter l'expédition
                </>
              )}
            </Button>
          )}
          <Button
            onClick={handleDeleteClick}
            disabled={deleting}
            variant="destructive"
            size="lg"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Expéditeur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Nom</p>
                <p className="font-medium">{shipment.senderName || shipment.sender?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Téléphone</p>
                <p className="font-medium">{shipment.senderPhone || shipment.sender?.phone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Adresse</p>
                <p className="font-medium">{shipment.senderAddress || shipment.sender?.address}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Destinataire
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Nom</p>
                <p className="font-medium">{shipment.recipientName || shipment.recipient?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Téléphone</p>
                <p className="font-medium">{shipment.recipientPhone || shipment.recipient?.phone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Adresse</p>
                <p className="font-medium">{shipment.recipientAddress || shipment.recipient?.address}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Informations de l'expédition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Statut</p>
              <Select value={shipment.status} onValueChange={handleStatusUpdate} disabled={updating || needsAcceptance}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="picked-up">Récupéré</SelectItem>
                  <SelectItem value="in-transit">En transit</SelectItem>
                  <SelectItem value="out-for-delivery">En livraison</SelectItem>
                  <SelectItem value="delivered">Livré</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {shipment.price && (
              <div>
                <p className="text-sm text-muted-foreground">Prix</p>
                <p className="font-medium">{shipment.price.toLocaleString('fr-FR')} FCFA</p>
              </div>
            )}
            {shipment.payment?.method && (
              <div>
                <p className="text-sm text-muted-foreground">Paiement</p>
                <p className="font-medium">{shipment.payment.method}</p>
              </div>
            )}
            {shipment.packageDescription && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="font-medium">{shipment.packageDescription}</p>
              </div>
            )}
            {(shipment.routeInfo?.from || shipment.routeInfo?.to || shipment.routeInfo?.deliveryMode) && (
              <div>
                <p className="text-sm text-muted-foreground">Itinéraire</p>
                <p className="font-medium">
                  {shipment.routeInfo?.from || "—"} → {shipment.routeInfo?.to || "—"}
                  {shipment.routeInfo?.deliveryMode ? ` • ${shipment.routeInfo.deliveryMode}` : ""}
                  {shipment.routeInfo?.zone ? ` • ${shipment.routeInfo.zone}` : ""}
                </p>
              </div>
            )}
            {(shipment.packageImageUrl || shipment.packageImage) && (
              <div>
                <p className="text-sm text-muted-foreground">Photo du colis</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shipment.packageImageUrl || shipment.packageImage!} alt="Colis" className="mt-1 max-w-xs rounded border" />
              </div>
            )}
            {shipment.weight && (
              <div>
                <p className="text-sm text-muted-foreground">Poids</p>
                <p className="font-medium">{shipment.weight} kg</p>
              </div>
            )}
            {shipment.currentLocation && (
              <div>
                <p className="text-sm text-muted-foreground">Position actuelle</p>
                <p className="font-medium">{shipment.currentLocation}</p>
              </div>
            )}
            {shipment.lon != null && shipment.lat != null && (
              <div>
                <p className="text-sm text-muted-foreground">Coordonnées GPS</p>
                <p className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {typeof shipment.lat === "number" && typeof shipment.lon === "number"
                    ? `${shipment.lat.toFixed(4)}, ${shipment.lon.toFixed(4)}`
                    : `${shipment.lat}, ${shipment.lon}`}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Chauffeur assigné</p>
              <Select
                value={shipment.chauffeurId || "none"}
                onValueChange={handleAssignChauffeur}
                disabled={assigningChauffeur || needsAcceptance}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un chauffeur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun chauffeur</SelectItem>
                  {chauffeurs.length === 0 ? (
                    <SelectItem value="no-drivers" disabled>
                      Aucun chauffeur disponible
                    </SelectItem>
                  ) : (
                    chauffeurs.map((chauffeur) => (
                      <SelectItem key={chauffeur.uid} value={chauffeur.uid}>
                        {chauffeur.name} ({chauffeur.phone})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {shipment.chauffeurName && shipment.chauffeurId && (
                <div className="mt-2">
                  <Link
                    href={`/dashboard/chauffeurs/${shipment.chauffeurId}`}
                    className="text-sm font-medium text-primary hover:underline flex items-center gap-2"
                  >
                    <UserCheck className="h-4 w-4" />
                    {shipment.chauffeurName}
                  </Link>
                </div>
              )}
            </div>
            {shipment.routeInfo?.deliveryMode === "porte_a_porte" && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Coursier assigné</p>
                {shipment.coursierName && shipment.coursierId ? (
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-purple-500" />
                    <Link
                      href={`/dashboard/coursiers/${shipment.coursierId}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {shipment.coursierName}
                    </Link>
                    <span className="text-xs text-muted-foreground">(Assigné automatiquement)</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun coursier assigné</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Créé le</p>
              <p className="font-medium">
                {shipment.createdAt?.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dernière mise à jour</p>
              <p className="font-medium">
                {shipment.updatedAt?.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {shipment.notes && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{shipment.notes}</p>
          </CardContent>
        </Card>
      )}

      {shipment.lon != null && shipment.lat != null && typeof shipment.lat === "number" && typeof shipment.lon === "number" && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Position sur la carte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://www.google.com/maps?q=${shipment.lat},${shipment.lon}&z=15&output=embed`}
                title="Position de l'expédition"
                allowFullScreen
              />
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle>Supprimer l'expédition</AlertDialogTitle>
                <AlertDialogDescription className="mt-2">
                  {shipment?.trackingNumber ? (
                    <>
                      Êtes-vous sûr de vouloir supprimer l'expédition <strong>{shipment.trackingNumber}</strong> ?
                    </>
                  ) : (
                    "Êtes-vous sûr de vouloir supprimer cette expédition ?"
                  )}
                  <br />
                  <span className="text-destructive font-medium">Cette action est irréversible.</span>
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteShipment}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
