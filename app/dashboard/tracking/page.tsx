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

  const formatCurrentLocation = (value: Shipment["currentLocation"]) => {
    if (typeof value === "string") return value
    if (
      value &&
      typeof value === "object" &&
      "latitude" in value &&
      "longitude" in value
    ) {
      const loc = value as { latitude: number | string; longitude: number | string }
      return `${loc.latitude}, ${loc.longitude}`
    }
    return ""
  }

  const handleSearch = async () => {
    if (!trackingNumber.trim()) return

    setLoading(true)
    setSearched(true)
    try {
      const shipmentsRef = collection(db, "shipments")
      const q = query(shipmentsRef, where("trackingNumber", "==", trackingNumber.trim()))
      const snapshot = await getDocs(q)

      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data()
        
        // Extraire les coordonnées GPS
        // Priorité 1: lat/lon directs (pour les colis acceptés)
        // Priorité 2: sender.location (pour les colis porte à porte)
        let lat = typeof docData.lat === "number" ? docData.lat : typeof docData.lat === "string" ? parseFloat(docData.lat) : undefined
        let lon = typeof docData.lon === "number" ? docData.lon : typeof docData.lon === "string" ? parseFloat(docData.lon) : undefined
        
        // Si pas de lat/lon directs, essayer depuis sender.location (pour porte à porte)
        if ((lat == null || lon == null) && docData.sender?.location) {
          lat = typeof docData.sender.location.latitude === "number" 
            ? docData.sender.location.latitude 
            : typeof docData.sender.location.latitude === "string" 
            ? parseFloat(docData.sender.location.latitude) 
            : undefined
          lon = typeof docData.sender.location.longitude === "number" 
            ? docData.sender.location.longitude 
            : typeof docData.sender.location.longitude === "string" 
            ? parseFloat(docData.sender.location.longitude) 
            : undefined
        }
        
        const shipmentData: Shipment = {
          id: snapshot.docs[0].id,
          ...docData,
          // Mapper packagePrice vers price si packagePrice existe
          price: docData.price || docData.packagePrice,
          lat,
          lon,
          createdAt: docData.createdAt?.toDate(),
          updatedAt: docData.updatedAt?.toDate(),
        } as Shipment
        setShipment(shipmentData)
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
    const statusLower = status.toLowerCase()
    const labels: Record<string, { text: string; color: string }> = {
      pending: { text: "En attente", color: "bg-gray-500/10 text-gray-500" },
      "picked-up": { text: "Récupéré", color: "bg-blue-500/10 text-blue-500" },
      "in-transit": { text: "En transit", color: "bg-purple-500/10 text-purple-500" },
      "out-for-delivery": { text: "En livraison", color: "bg-orange-500/10 text-orange-500" },
      delivered: { text: "Livré", color: "bg-green-500/10 text-green-500" },
      cancelled: { text: "Annulé", color: "bg-red-500/10 text-red-500" },
      "en cours": { text: "En cours", color: "bg-purple-500/10 text-purple-500" },
    }
    // Chercher le statut en minuscules ou retourner le label par défaut
    return labels[statusLower] || labels[status] || { text: status, color: "bg-gray-500/10 text-gray-500" }
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
                  <p className="font-medium">{shipment.senderName || shipment.sender?.name}</p>
                  <p className="text-sm text-muted-foreground">{shipment.senderAddress || shipment.sender?.address}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Destinataire</p>
                  <p className="font-medium">{shipment.recipientName || shipment.recipient?.name}</p>
                  <p className="text-sm text-muted-foreground">{shipment.recipientAddress || shipment.recipient?.address}</p>
                </div>
              </div>
              {shipment.currentLocation && (
                <div>
                  <p className="text-sm text-muted-foreground">Position actuelle</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {formatCurrentLocation(shipment.currentLocation)}
                  </p>
                </div>
              )}
              {(shipment.lon != null && shipment.lat != null) && (
                <div>
                  <p className="text-sm text-muted-foreground">Coordonnées GPS</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {typeof shipment.lat === "number" && typeof shipment.lon === "number"
                      ? `${shipment.lat.toFixed(4)}, ${shipment.lon.toFixed(4)}`
                      : `${shipment.lat}, ${shipment.lon}`}
                    {shipment.routeInfo?.deliveryMode === "porte_a_porte" && (
                      <span className="text-xs text-muted-foreground">(Porte à porte)</span>
                    )}
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
                      <p className={cn("font-medium", step.active ? "text-primary" : "")}>{step.label}</p>
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

          {shipment.lon != null && 
           shipment.lat != null && 
           typeof shipment.lat === "number" && 
           typeof shipment.lon === "number" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Position sur la carte
                  {shipment.routeInfo?.deliveryMode === "porte_a_porte" && (
                    <span className="text-sm text-muted-foreground font-normal">(Livraison porte à porte)</span>
                  )}
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
        </div>
      )}
    </div>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}
