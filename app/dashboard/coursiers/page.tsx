"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, UserCheck, Package, Phone, Mail, Eye, Truck } from "lucide-react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { AppUser } from "@/lib/types"
import Link from "next/link"

export default function CoursiersPage() {
  const [coursiers, setCoursiers] = useState<AppUser[]>([])
  const [filteredCoursiers, setFilteredCoursiers] = useState<AppUser[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [shipmentsCount, setShipmentsCount] = useState<Record<string, number>>({})

  const fetchCoursiers = async () => {
    try {
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("role", "==", "coursier"))
      const snapshot = await getDocs(q)

      const data = snapshot.docs
        .map((doc) => {
          const docData = doc.data()
          const docId = doc.id
          const firebaseUid = docData.uid || null
          return {
            uid: firebaseUid || docId,
            email: docData.email || (doc.id.includes("@") ? doc.id : ""),
            name: docData.name || "",
            phone: docData.phone || "",
            role: docData.role || "coursier",
            location: docData.location
              ? {
                  latitude: docData.location.latitude,
                  longitude: docData.location.longitude,
                  updatedAt: docData.location.updatedAt?.toDate(),
                }
              : undefined,
            fcmToken: docData.fcmToken,
            createdAt: docData.createdAt?.toDate() || new Date(),
            updatedAt: docData.updatedAt?.toDate() || new Date(),
            _docId: docId,
            _firebaseUid: firebaseUid,
          } as AppUser & { _docId?: string; _firebaseUid?: string | null }
        })
        .filter((user) => user.email)

      setCoursiers(data)
      setFilteredCoursiers(data)

      // Compter les shipments par coursier
      const shipmentsRef = collection(db, "shipments")
      const shipmentsSnapshot = await getDocs(shipmentsRef)
      const counts: Record<string, number> = {}

      shipmentsSnapshot.docs.forEach((doc) => {
        const shipmentData = doc.data()
        const coursierId = shipmentData.coursierId
        if (coursierId) {
          const matchingCoursier = data.find(
            (coursier) =>
              coursierId === coursier.uid ||
              coursierId === coursier.email ||
              (coursier as any)._docId && coursierId === (coursier as any)._docId
          )
          if (matchingCoursier) {
            counts[matchingCoursier.uid] = (counts[matchingCoursier.uid] || 0) + 1
          }
        }
      })

      setShipmentsCount(counts)
    } catch (error) {
      console.error("Error fetching coursiers:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoursiers()
  }, [])

  useEffect(() => {
    const term = searchTerm.toLowerCase()
    const filtered = coursiers.filter(
      (coursier) =>
        coursier.name.toLowerCase().includes(term) ||
        coursier.email.toLowerCase().includes(term) ||
        coursier.phone.toLowerCase().includes(term),
    )
    setFilteredCoursiers(filtered)
  }, [searchTerm, coursiers])

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
        <h1 className="text-3xl font-bold tracking-tight">Gestion des coursiers</h1>
        <p className="text-muted-foreground">Gérez les coursiers et leurs expéditions assignées</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email ou téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCoursiers.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "Aucun coursier trouvé" : "Aucun coursier pour le moment"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCoursiers.map((coursier) => (
                <Card key={coursier.uid} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                          <Truck className="h-6 w-6 text-purple-500" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{coursier.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">Coursier</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{coursier.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{coursier.phone}</span>
                    </div>
                    {coursier.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">
                          📍 {coursier.location.latitude.toFixed(4)}, {coursier.location.longitude.toFixed(4)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {shipmentsCount[coursier.uid] || 0} expédition(s) assignée(s)
                      </span>
                    </div>
                    <Link href={`/dashboard/coursiers/${(coursier as any)._docId}`}>
                      <Button variant="outline" className="w-full" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Voir les détails
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

