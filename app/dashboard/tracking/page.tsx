"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, MapPin } from "lucide-react"
import { collection, query, getDocs, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Shipment } from "@/lib/types"

export default function TrackingPage() {
  const [trackingNumber, setTrackingNumber] = useState("")
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!trackingNumber.trim()) return

    setLoading(true)
    setSearched(true)
    try {
      const shipmentsRef = collection(db, "shipments")
      const q = query(shipmentsRef, where("trackingNumber", "==", trackingNumber.trim()))
      const snapshot = await getDocs(q)

      if (!snapshot.empty) {
        const doc = snapshot.docs[0]
        setShipment({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        } as Shipment)
      } else {
        setShipment(null)
      }
    } catch (error) {
      console.error("Error searching shipment:", error)
      setShipment(null)
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      pending: { text: "En attente", color: "bg-gray-500/10 text-gray-500" },
      "picked-up": { text: "Récupéré", color: "bg-blue-500/10 text-blue-500" },
      "in-transit": { text: "En transit", color: "bg-purple-500/10 text-purple-500" },
      "out-for-delivery": { text: "En livraison", color: "bg-orange-500/10 text-orange-500" },
      delivered: { text: "Livré", color: "bg-green-500/10 text-green-500" },
      cancelled: { text: "Annulé", color: "bg-red-500/10 text-red-500" },
    }
    return labels[status] || labels.pending
  }

  const getStatusSteps = (currentStatus: string) => {
    const steps = [
      { key: "picked-up", label: "Récupéré" },
      { key: "in-transit", label: "En transit" },
      { key: "out-for-delivery", label: "En livraison" },
      { key: "delivered", label: "Livré" },
    ]

    const currentIndex = steps.findIndex((s) => s.key === currentStatus)

    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      active: index === currentIndex,
    }))
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Suivi des expéditions</h1>
        <p className="text-muted-foreground">Recherchez une expédition par son numéro de suivi</p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Entrez le numéro de suivi (ex: EBN12345678ABCD)..."
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? "Recherche..." : "Rechercher"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Recherche en cours...</p>
          </div>
        </div>
      )}

      {!loading && searched && !shipment && (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucune expédition trouvée avec ce numéro de suivi</p>
            <p className="text-sm text-muted-foreground mt-2">
              Vérifiez que le numéro de suivi est correct et que l'expédition a été acceptée
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && shipment && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations de l'expédition</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Numéro de suivi</p>
                  <p className="font-medium">{shipment.trackingNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                      getStatusLabel(shipment.status).color,
                    )}
                  >
                    {getStatusLabel(shipment.status).text}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expéditeur</p>
                  <p className="font-medium">{shipment.senderName}</p>
                  <p className="text-sm text-muted-foreground">{shipment.senderAddress}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Destinataire</p>
                  <p className="font-medium">{shipment.recipientName}</p>
                  <p className="text-sm text-muted-foreground">{shipment.recipientAddress}</p>
                </div>
              </div>
              {shipment.currentLocation && (
                <div>
                  <p className="text-sm text-muted-foreground">Position actuelle</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {shipment.currentLocation}
                  </p>
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
              <CardTitle>Progression de la livraison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getStatusSteps(shipment.status).map((step, index) => (
                  <div key={step.key} className="flex items-center gap-4">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border-2",
                        step.completed
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted bg-background",
                      )}
                    >
                      {step.completed ? "✓" : index + 1}
                    </div>
                    <div className="flex-1">
                      <p className={cn("font-medium", step.active && "text-primary")}>{step.label}</p>
                      {step.active && shipment.updatedAt && (
                        <p className="text-sm text-muted-foreground">
                          {shipment.updatedAt.toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {shipment.lon && shipment.lat && (
            <Card>
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
      )}
    </div>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}
