"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Package, User, Clock, Check, MapPin } from "lucide-react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Shipment } from "@/lib/types"

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [accepting, setAccepting] = useState(false)

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
      const lon = -1.5536 + (Math.random() - 0.5) * 0.1
      const lat = 14.6928 + (Math.random() - 0.5) * 0.1

      await updateDoc(shipmentRef, {
        trackingNumber,
        lon,
        lat,
        status: "picked-up",
        updatedAt: new Date(),
      })

      setShipment({
        ...shipment,
        trackingNumber,
        lon,
        lat,
        status: "picked-up",
        updatedAt: new Date(),
      })
    } catch (error) {
      console.error("Error accepting shipment:", error)
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
          setShipment({
            id: shipmentDoc.id,
            ...shipmentDoc.data(),
            createdAt: shipmentDoc.data().createdAt?.toDate(),
            updatedAt: shipmentDoc.data().updatedAt?.toDate(),
          } as Shipment)
        }
      } catch (error) {
        console.error("Error fetching shipment:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchShipment()
  }, [params.id])

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
                <p className="font-medium">{shipment.price} €</p>
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
            {shipment.lon && shipment.lat && (
              <div>
                <p className="text-sm text-muted-foreground">Coordonnées GPS</p>
                <p className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {shipment.lat.toFixed(4)}, {shipment.lon.toFixed(4)}
                </p>
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

      {shipment.lon && shipment.lat && (
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
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${shipment.lon - 0.01},${shipment.lat - 0.01},${shipment.lon + 0.01},${shipment.lat + 0.01}&layer=mapnik&marker=${shipment.lat},${shipment.lon}`}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
