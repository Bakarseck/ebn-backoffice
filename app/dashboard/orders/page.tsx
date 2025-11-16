"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Package, Eye, Check, Trash2 } from "lucide-react"
import { collection, query, getDocs, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Shipment } from "@/lib/types"
import Link from "next/link"

export default function OrdersPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

      fetchShipments()
    } catch (error) {
      console.error("Error accepting shipment:", error)
    } finally {
      setAcceptingId(null)
    }
  }

  const handleDeleteShipment = async (shipmentId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette expédition ? Cette action est irréversible.")) {
      return
    }

    try {
      setDeletingId(shipmentId)
      const shipmentRef = doc(db, "shipments", shipmentId)
      await deleteDoc(shipmentRef)
      fetchShipments()
    } catch (error) {
      console.error("Error deleting shipment:", error)
      alert("Erreur lors de la suppression de l'expédition")
    } finally {
      setDeletingId(null)
    }
  }

  const fetchShipments = async () => {
    try {
      const shipmentsRef = collection(db, "shipments")
      const shipmentsQuery = query(shipmentsRef, orderBy("createdAt", "desc"))
      const snapshot = await getDocs(shipmentsQuery)

      const data = snapshot.docs.map((doc) => {
        const docData = doc.data()
        return {
          id: doc.id,
          ...docData,
          // Mapper packagePrice vers price si packagePrice existe
          price: docData.price || docData.packagePrice,
          createdAt: docData.createdAt?.toDate(),
          updatedAt: docData.updatedAt?.toDate(),
        } as Shipment
      })

      setShipments(data)
      setFilteredShipments(data)
    } catch (error) {
      console.error("Error fetching shipments:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchShipments()
  }, [])

  useEffect(() => {
    const term = searchTerm.toLowerCase()
    const filtered = shipments.filter((shipment) => {
      const tracking = shipment.trackingNumber?.toLowerCase() ?? ""
      const senderFlat = shipment.senderName?.toLowerCase() ?? ""
      const senderNested = shipment.sender?.name?.toLowerCase() ?? ""
      const recipientFlat = shipment.recipientName?.toLowerCase() ?? ""
      const recipientNested = shipment.recipient?.name?.toLowerCase() ?? ""

      return (
        tracking.includes(term) ||
        senderFlat.includes(term) ||
        senderNested.includes(term) ||
        recipientFlat.includes(term) ||
        recipientNested.includes(term)
      )
    })
    setFilteredShipments(filtered)
  }, [searchTerm, shipments])

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
        <h1 className="text-3xl font-bold tracking-tight">Gestion des expéditions</h1>
        <p className="text-muted-foreground">Gérez toutes vos expéditions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par numéro de suivi, expéditeur ou destinataire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredShipments.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "Aucune expédition trouvée" : "Aucune expédition pour le moment"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">N° Suivi</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Expéditeur</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Destinataire</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Chauffeur</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Statut</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Prix</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipments.map((shipment) => {
                    const statusInfo = getStatusLabel(shipment.status)
                    const needsAcceptance = !shipment.trackingNumber

                    return (
                      <tr key={shipment.id} className="border-b border-border last:border-0">
                        <td className="py-3 px-4 font-medium">
                          {needsAcceptance ? (
                            <span className="text-orange-500">En attente d'acceptation</span>
                          ) : (
                            shipment.trackingNumber
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{shipment.senderName || shipment.sender?.name}</p>
                            <p className="text-sm text-muted-foreground">{shipment.senderPhone || shipment.sender?.phone}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{shipment.recipientName || shipment.recipient?.name}</p>
                            <p className="text-sm text-muted-foreground">{shipment.recipientPhone || shipment.recipient?.phone}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {shipment.chauffeurName ? (
                            <Link
                              href={`/dashboard/chauffeurs/${shipment.chauffeurId}`}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              {shipment.chauffeurName}
                            </Link>
                          ) : (
                            <span className="text-sm text-muted-foreground">Non assigné</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                              statusInfo.color,
                            )}
                          >
                            {statusInfo.text}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {shipment.createdAt?.toLocaleDateString("fr-FR")}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {shipment.price ? `${shipment.price.toLocaleString('fr-FR')} FCFA` : "-"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {needsAcceptance && (
                              <Button
                                onClick={() => handleAcceptShipment(shipment.id)}
                                disabled={acceptingId === shipment.id}
                                size="sm"
                              >
                                {acceptingId === shipment.id ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Link href={`/dashboard/orders/${shipment.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              onClick={() => handleDeleteShipment(shipment.id)}
                              disabled={deletingId === shipment.id}
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              {deletingId === shipment.id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}
