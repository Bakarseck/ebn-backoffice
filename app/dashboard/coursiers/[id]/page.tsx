"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Truck, Package, Phone, Mail, MapPin, Clock, Eye } from "lucide-react"
import { doc, getDoc, collection, getDocs, query, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { AppUser, Shipment } from "@/lib/types"
import Link from "next/link"

export default function CoursierDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [coursier, setCoursier] = useState<AppUser | null>(null)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    async function fetchCoursier() {
      try {
        const searchId = params.id as string
        let userDoc: any = null
        let userDocId: string = searchId

        // Essayer de trouver le coursier par UID d'abord
        const docByUid = await getDoc(doc(db, "users", searchId))
        if (docByUid.exists()) {
          userDoc = docByUid
          userDocId = docByUid.id
        } else {
          // Si pas trouvé par UID, essayer de trouver par email (document ID ou champ email)
          const usersRef = collection(db, "users")
          const usersSnapshot = await getDocs(usersRef)
          const userByEmail = usersSnapshot.docs.find(
            (doc) => doc.id === searchId || doc.data().email === searchId
          )
          if (userByEmail) {
            userDoc = userByEmail
            userDocId = userByEmail.id
          }
        }

        if (userDoc && userDoc.exists()) {
          const userData = userDoc.data()
          
          const realUid = userData.uid || userDocId
          const isEmailId = userDocId.includes("@")

          const coursierData: AppUser = {
            uid: realUid,
            email: userData.email || userDocId,
            name: userData.name || "",
            phone: userData.phone || "",
            role: userData.role || "coursier",
            location: userData.location
              ? {
                  latitude: userData.location.latitude,
                  longitude: userData.location.longitude,
                  updatedAt: userData.location.updatedAt?.toDate(),
                }
              : undefined,
            fcmToken: userData.fcmToken,
            createdAt: userData.createdAt?.toDate() || new Date(),
            updatedAt: userData.updatedAt?.toDate() || new Date(),
          }
          setCoursier(coursierData)

          // Charger les shipments assignés à ce coursier
          const shipmentsRef = collection(db, "shipments")
          
          try {
            // Chercher par UID d'abord
            let q = query(shipmentsRef, where("coursierId", "==", realUid), orderBy("createdAt", "desc"))
            let shipmentsSnapshot = await getDocs(q)
            let shipmentsData = shipmentsSnapshot.docs.map((doc) => {
              const docData = doc.data()
              return {
                id: doc.id,
                ...docData,
                lat: typeof docData.lat === "number" ? docData.lat : typeof docData.lat === "string" ? parseFloat(docData.lat) : docData.lat,
                lon: typeof docData.lon === "number" ? docData.lon : typeof docData.lon === "string" ? parseFloat(docData.lon) : docData.lon,
                createdAt: docData.createdAt?.toDate(),
                updatedAt: docData.updatedAt?.toDate(),
              } as Shipment
            })

            // Si le document ID est un email, aussi chercher par email dans coursierId
            if (isEmailId && shipmentsData.length === 0) {
              q = query(shipmentsRef, where("coursierId", "==", userDocId), orderBy("createdAt", "desc"))
              shipmentsSnapshot = await getDocs(q)
              shipmentsData = shipmentsSnapshot.docs.map((doc) => {
                const docData = doc.data()
                return {
                  id: doc.id,
                  ...docData,
                  lat: typeof docData.lat === "number" ? docData.lat : typeof docData.lat === "string" ? parseFloat(docData.lat) : docData.lat,
                  lon: typeof docData.lon === "number" ? docData.lon : typeof docData.lon === "string" ? parseFloat(docData.lon) : docData.lon,
                  createdAt: docData.createdAt?.toDate(),
                  updatedAt: docData.updatedAt?.toDate(),
                } as Shipment
              })
            }

            setShipments(shipmentsData)
          } catch (error: any) {
            // Si l'index n'existe pas, charger tous les shipments et filtrer côté client
            if (error.code === "failed-precondition") {
              console.warn("Index Firestore manquant, chargement de tous les shipments...")
              const allShipmentsSnapshot = await getDocs(shipmentsRef)
              const allShipments = allShipmentsSnapshot.docs
                .filter((doc) => {
                  const data = doc.data()
                  const coursierId = data.coursierId
                  return coursierId === realUid || coursierId === userDocId || coursierId === coursierData.email
                })
                .map((doc) => {
                  const docData = doc.data()
                  return {
                    id: doc.id,
                    ...docData,
                    lat: typeof docData.lat === "number" ? docData.lat : typeof docData.lat === "string" ? parseFloat(docData.lat) : docData.lat,
                    lon: typeof docData.lon === "number" ? docData.lon : typeof docData.lon === "string" ? parseFloat(docData.lon) : docData.lon,
                    createdAt: docData.createdAt?.toDate(),
                    updatedAt: docData.updatedAt?.toDate(),
                  } as Shipment
                })
                .sort((a, b) => {
                  const dateA = a.createdAt?.getTime() || 0
                  const dateB = b.createdAt?.getTime() || 0
                  return dateB - dateA
                })

              setShipments(allShipments)
            } else {
              throw error
            }
          }
        }
      } catch (error) {
        console.error("Error fetching coursier:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCoursier()
  }, [params.id])

  const filteredShipments = shipments.filter((shipment) => {
    const term = searchTerm.toLowerCase()
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

  const stats = {
    total: shipments.length,
    inTransit: shipments.filter((s) => s.status === "in-transit" || s.status === "out-for-delivery").length,
    delivered: shipments.filter((s) => s.status === "delivered").length,
    pending: shipments.filter((s) => s.status === "pending" || s.status === "picked-up").length,
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

  if (!coursier) {
    return (
      <div className="p-8">
        <div className="text-center">
          <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Coursier non trouvé</p>
          <Button onClick={() => router.push("/dashboard/coursiers")} className="mt-4">
            Retour aux coursiers
          </Button>
        </div>
      </div>
    )
  }

  function cn(...classes: string[]) {
    return classes.filter(Boolean).join(" ")
  }

  return (
    <div className="p-8">
      <Button variant="ghost" onClick={() => router.push("/dashboard/coursiers")} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Détails du coursier</h1>
        <p className="text-muted-foreground">Informations et expéditions assignées</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total expéditions</CardTitle>
            <Package className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En transit</CardTitle>
            <MapPin className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inTransit}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Livrées</CardTitle>
            <Package className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En attente</CardTitle>
            <Clock className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Informations du coursier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Nom</p>
              <p className="font-medium">{coursier.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {coursier.email}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Téléphone</p>
              <p className="font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {coursier.phone}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rôle</p>
              <p className="font-medium">Coursier</p>
            </div>
            {coursier.location && (
              <div>
                <p className="text-sm text-muted-foreground">Position actuelle</p>
                <p className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {coursier.location.latitude.toFixed(4)}, {coursier.location.longitude.toFixed(4)}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">ID utilisateur</p>
              <p className="font-medium text-xs text-muted-foreground font-mono">{coursier.uid}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Statistiques
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Expéditions assignées</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expéditions livrées</p>
              <p className="text-2xl font-bold text-green-500">{stats.delivered}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expéditions en cours</p>
              <p className="text-2xl font-bold text-purple-500">{stats.inTransit}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Taux de livraison</p>
              <p className="text-2xl font-bold">
                {stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expéditions assignées (Porte à porte)</CardTitle>
          <div className="mt-4">
            <Input
              placeholder="Rechercher par numéro de suivi, expéditeur ou destinataire..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredShipments.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "Aucune expédition trouvée" : "Aucune expédition assignée pour le moment"}
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
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Statut</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Prix</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipments.map((shipment) => {
                    const statusInfo = getStatusLabel(shipment.status)
                    return (
                      <tr key={shipment.id} className="border-b border-border last:border-0">
                        <td className="py-3 px-4 font-medium">
                          {shipment.trackingNumber || (
                            <span className="text-orange-500">En attente d'acceptation</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{shipment.senderName || shipment.sender?.name || "—"}</p>
                            <p className="text-sm text-muted-foreground">{shipment.senderPhone || shipment.sender?.phone || ""}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{shipment.recipientName || shipment.recipient?.name || "—"}</p>
                            <p className="text-sm text-muted-foreground">{shipment.recipientPhone || shipment.recipient?.phone || ""}</p>
                          </div>
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
                        <td className="py-3 px-4 font-medium">{shipment.price ? `${shipment.price} €` : "-"}</td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/dashboard/orders/${shipment.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
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

