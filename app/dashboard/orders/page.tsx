"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Package, Eye, Check, Trash2, AlertTriangle } from "lucide-react"
import { collection, query, getDocs, orderBy, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Shipment } from "@/lib/types"
import { assignCoursierToShipment } from "@/lib/coursier-assignment"
import Link from "next/link"
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

export default function OrdersPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [shipmentToDelete, setShipmentToDelete] = useState<{ id: string; trackingNumber?: string } | null>(null)
  const { toast } = useToast()

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
        await assignCoursierToShipment(shipmentId, updatedShipment)
      }

      fetchShipments()
    } catch (error) {
      console.error("Error accepting shipment:", error)
    } finally {
      setAcceptingId(null)
    }
  }

  const handleDeleteClick = (shipment: Shipment) => {
    setShipmentToDelete({ id: shipment.id, trackingNumber: shipment.trackingNumber })
    setDeleteDialogOpen(true)
  }

  const handleDeleteShipment = async () => {
    if (!shipmentToDelete) return

    try {
      setDeletingId(shipmentToDelete.id)
      const shipmentRef = doc(db, "shipments", shipmentToDelete.id)
      await deleteDoc(shipmentRef)
      
      toast({
        title: "Expédition supprimée",
        description: shipmentToDelete.trackingNumber 
          ? `L'expédition ${shipmentToDelete.trackingNumber} a été supprimée avec succès.`
          : "L'expédition a été supprimée avec succès.",
        variant: "default",
      })
      
      setDeleteDialogOpen(false)
      setShipmentToDelete(null)
      fetchShipments()
    } catch (error) {
      console.error("Error deleting shipment:", error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression de l'expédition.",
        variant: "destructive",
      })
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
                              onClick={() => handleDeleteClick(shipment)}
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
                  {shipmentToDelete?.trackingNumber ? (
                    <>
                      Êtes-vous sûr de vouloir supprimer l'expédition <strong>{shipmentToDelete.trackingNumber}</strong> ?
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
            <AlertDialogCancel disabled={deletingId !== null}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteShipment}
              disabled={deletingId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? (
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

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}
