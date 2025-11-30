"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, Truck, CheckCircle, Clock, Check } from "lucide-react"
import { collection, query, getDocs, orderBy, doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Shipment } from "@/lib/types"
import Link from "next/link"
import { assignCoursierToShipment, assignPendingPorteAPorteShipments } from "@/lib/coursier-assignment"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    total: 0,
    inTransit: 0,
    delivered: 0,
    pending: 0,
  })
  const [pendingShipments, setPendingShipments] = useState<Shipment[]>([])
  const [recentShipments, setRecentShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  const generateTrackingNumber = () => {
    const prefix = "EBN"
    const timestamp = Date.now().toString().slice(-8)
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `${prefix}${timestamp}${random}`
  }

  const handleAcceptShipment = async (shipmentId: string) => {
    try {
      setAcceptingId(shipmentId)
      const shipmentRef = doc(db, "shipments", shipmentId)
      const shipmentDoc = await getDoc(shipmentRef)
      
      if (!shipmentDoc.exists()) {
        console.error("Shipment not found")
        return
      }

      const shipmentData = shipmentDoc.data() as Shipment
      const trackingNumber = generateTrackingNumber()
      
      // Extraire les coordonnées GPS depuis sender.location si disponible (porte à porte)
      // Sinon utiliser des coordonnées aléatoires
      let lon: number
      let lat: number
      
      if (shipmentData.sender?.location?.longitude && shipmentData.sender?.location?.latitude) {
        lon = shipmentData.sender.location.longitude
        lat = shipmentData.sender.location.latitude
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

      // Assignation automatique pour les colis porte à porte
      if (shipmentData.routeInfo?.deliveryMode === "porte_a_porte") {
        const updatedShipment: Shipment = {
          ...shipmentData,
          id: shipmentId,
          trackingNumber,
          lon,
          lat,
          status: "picked-up",
          updatedAt: new Date(),
        }
        const assignmentResult = await assignCoursierToShipment(shipmentId, updatedShipment)
        if (assignmentResult.success) {
          console.log(`✅ Colis ${trackingNumber} assigné à ${assignmentResult.coursierName}`)
        }
      }

      // Assigner automatiquement tous les colis en attente après chaque acceptation
      assignPendingPorteAPorteShipments().catch((error) => {
        console.error("Error auto-assigning pending shipments:", error)
      })

      fetchData()
    } catch (error) {
      console.error("Error accepting shipment:", error)
    } finally {
      setAcceptingId(null)
    }
  }

  const fetchData = async () => {
    try {
      const shipmentsRef = collection(db, "shipments")
      const shipmentsQuery = query(shipmentsRef, orderBy("createdAt", "desc"))
      const snapshot = await getDocs(shipmentsQuery)

      const shipments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Shipment[]

      const pending = shipments.filter((s) => !s.trackingNumber)
      setPendingShipments(pending)

      setStats({
        total: shipments.length,
        inTransit: shipments.filter((s) => s.status === "in-transit" || s.status === "out-for-delivery").length,
        delivered: shipments.filter((s) => s.status === "delivered").length,
        pending: pending.length,
      })

      setRecentShipments(shipments.filter((s) => s.trackingNumber).slice(0, 5))
    } catch (error) {
      console.error("Error fetching shipments:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const statsCards = [
    {
      name: "Total Expéditions",
      value: stats.total.toString(),
      icon: Package,
      color: "text-blue-500",
    },
    {
      name: "En transit",
      value: stats.inTransit.toString(),
      icon: Truck,
      color: "text-purple-500",
    },
    {
      name: "Livrées",
      value: stats.delivered.toString(),
      icon: CheckCircle,
      color: "text-green-500",
    },
    {
      name: "En attente",
      value: stats.pending.toString(),
      icon: Clock,
      color: "text-orange-500",
    },
  ]

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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d'ensemble de votre activité</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.name}</CardTitle>
              <stat.icon className={cn("h-5 w-5", stat.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pendingShipments.length > 0 && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Expéditions en attente d'acceptation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingShipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="flex items-center justify-between border border-border rounded-lg p-4"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {(shipment.senderName || shipment.sender?.name) || "—"} → {(shipment.recipientName || shipment.recipient?.name) || "—"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">De: {shipment.senderAddress || shipment.sender?.address || "—"}</p>
                      <p className="text-sm text-muted-foreground">Vers: {shipment.recipientAddress || shipment.recipient?.address || "—"}</p>
                      {shipment.price && <p className="text-sm font-medium mt-2">{shipment.price} €</p>}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/orders/${shipment.id}`}>
                        <Button variant="outline" size="sm">
                          Voir détails
                        </Button>
                      </Link>
                      <Button
                        onClick={() => handleAcceptShipment(shipment.id)}
                        disabled={acceptingId === shipment.id}
                        size="sm"
                      >
                        {acceptingId === shipment.id ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                            Acceptation...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Accepter
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Expéditions récentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentShipments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucune expédition acceptée pour le moment</p>
            ) : (
              <div className="space-y-4">
                {recentShipments.map((shipment) => {
                  const statusInfo = getStatusLabel(shipment.status)
                  return (
                    <div
                      key={shipment.id}
                      className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                    >
                      <div>
                        <p className="font-medium">{shipment.trackingNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {(shipment.senderName || shipment.sender?.name) || "—"} → {(shipment.recipientName || shipment.recipient?.name) || "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        {shipment.price && <p className="font-medium mb-1">{shipment.price} €</p>}
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                            statusInfo.color,
                          )}
                        >
                          {statusInfo.text}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}
