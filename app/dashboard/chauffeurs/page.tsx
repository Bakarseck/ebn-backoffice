"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, UserCheck, Package, Phone, Mail, Eye } from "lucide-react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { AppUser } from "@/lib/types"
import Link from "next/link"

export default function ChauffeursPage() {
  const [chauffeurs, setChauffeurs] = useState<AppUser[]>([])
  const [filteredChauffeurs, setFilteredChauffeurs] = useState<AppUser[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [shipmentsCount, setShipmentsCount] = useState<Record<string, number>>({})

  const fetchChauffeurs = async () => {
    try {
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("role", "==", "chauffeur"))
      const snapshot = await getDocs(q)

      const data = snapshot.docs
        .map((doc) => {
          const docData = doc.data()
          // Pour les liens, utiliser TOUJOURS le document ID (identifiant unique du document Firestore)
          // Le document ID peut être soit un UID Firebase Auth, soit un email
          // Utiliser le champ uid du document pour l'affichage/appUser.uid si disponible
          const docId = doc.id
          const firebaseUid = docData.uid || null
          return {
            uid: firebaseUid || docId, // Utiliser le champ uid si disponible, sinon docId
            email: docData.email || (doc.id.includes("@") ? doc.id : ""),
            name: docData.name || "",
            phone: docData.phone || "",
            role: docData.role || "chauffeur",
            fcmToken: docData.fcmToken,
            createdAt: docData.createdAt?.toDate() || new Date(),
            updatedAt: docData.updatedAt?.toDate() || new Date(),
            // Stocker le document ID pour les liens (identifiant unique du document)
            _docId: docId,
            // Stocker aussi le vrai UID Firebase Auth s'il existe
            _firebaseUid: firebaseUid,
          } as AppUser & { _docId?: string; _firebaseUid?: string | null }
        })
        .filter((user) => user.email)

      setChauffeurs(data)
      setFilteredChauffeurs(data)

      // Compter les shipments par chauffeur
      // Les shipments peuvent avoir comme chauffeurId soit l'UID Firebase Auth, soit l'email (document ID)
      const shipmentsRef = collection(db, "shipments")
      const shipmentsSnapshot = await getDocs(shipmentsRef)
      const counts: Record<string, number> = {}

      shipmentsSnapshot.docs.forEach((doc) => {
        const shipmentData = doc.data()
        const chauffeurId = shipmentData.chauffeurId
        if (chauffeurId) {
          // Trouver le chauffeur correspondant (par UID, email ou document ID)
          const matchingChauffeur = data.find(
            (chauffeur) =>
              chauffeurId === chauffeur.uid ||
              chauffeurId === chauffeur.email ||
              (chauffeur as any)._docId && chauffeurId === (chauffeur as any)._docId
          )
          if (matchingChauffeur) {
            // Utiliser l'UID pour le comptage (celui utilisé dans les liens)
            counts[matchingChauffeur.uid] = (counts[matchingChauffeur.uid] || 0) + 1
          }
        }
      })

      setShipmentsCount(counts)
    } catch (error) {
      console.error("Error fetching chauffeurs:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChauffeurs()
  }, [])

  useEffect(() => {
    const term = searchTerm.toLowerCase()
    const filtered = chauffeurs.filter(
      (chauffeur) =>
        chauffeur.name.toLowerCase().includes(term) ||
        chauffeur.email.toLowerCase().includes(term) ||
        chauffeur.phone.toLowerCase().includes(term),
    )
    setFilteredChauffeurs(filtered)
  }, [searchTerm, chauffeurs])

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
        <h1 className="text-3xl font-bold tracking-tight">Gestion des chauffeurs</h1>
        <p className="text-muted-foreground">Gérez les chauffeurs et leurs expéditions assignées</p>
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
          {filteredChauffeurs.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "Aucun chauffeur trouvé" : "Aucun chauffeur pour le moment"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredChauffeurs.map((chauffeur) => (
                <Card key={chauffeur.uid} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                          <UserCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{chauffeur.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">Chauffeur</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{chauffeur.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{chauffeur.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {shipmentsCount[chauffeur.uid] || 0} expédition(s) assignée(s)
                      </span>
                    </div>
                    <Link href={`/dashboard/chauffeurs/${(chauffeur as any)._docId}`}>
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

