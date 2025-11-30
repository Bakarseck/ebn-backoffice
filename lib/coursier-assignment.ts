/**
 * Fonctions utilitaires pour l'assignation automatique des coursiers
 */

import { collection, getDocs, query, where, doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "./firebase"
import type { AppUser, Shipment } from "./types"

// Coordonnées de l'entrepôt à Thiès (par défaut pour les nouveaux coursiers)
export const ENTREPOT_THIES = {
  latitude: 14.7886,
  longitude: -16.9261,
}

/**
 * Calcule la distance entre deux points GPS en kilomètres (formule de Haversine)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Rayon de la Terre en kilomètres
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Récupère tous les coursiers disponibles
 */
export async function getAvailableCoursiers(): Promise<AppUser[]> {
  try {
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("role", "==", "coursier"))
    const snapshot = await getDocs(q)

    return snapshot.docs
      .map((doc) => {
        const docData = doc.data()
        return {
          uid: doc.id,
          email: docData.email || "",
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
        } as AppUser
      })
      .filter((user) => user.email && user.location) // Seulement les coursiers avec une localisation
  } catch (error) {
    console.error("Error fetching coursiers:", error)
    return []
  }
}

/**
 * Trouve le coursier le plus proche d'un point GPS donné
 * Si c'est le premier colis porte à porte, assigne au premier coursier disponible
 * Sinon, trouve le coursier le plus proche du nouveau colis (pas du dernier colis)
 */
export async function findBestCoursier(
  shipmentLat: number,
  shipmentLon: number,
  isFirstShipment: boolean = false
): Promise<AppUser | null> {
  const coursiers = await getAvailableCoursiers()

  if (coursiers.length === 0) {
    return null
  }

  // Si c'est le premier colis porte à porte, assigner au premier coursier
  if (isFirstShipment) {
    return coursiers[0]
  }

  // Pour les colis suivants, trouver le coursier le plus proche du NOUVEAU colis
  // On compare la distance entre la position du coursier et la position du nouveau colis
  let bestCoursier: AppUser | null = null
  let minDistance = Infinity

  for (const coursier of coursiers) {
    if (!coursier.location) continue

    // Calculer la distance entre le nouveau colis et la position actuelle du coursier
    const distance = calculateDistance(
      shipmentLat,
      shipmentLon,
      coursier.location.latitude,
      coursier.location.longitude
    )

    if (distance < minDistance) {
      minDistance = distance
      bestCoursier = coursier
    }
  }

  return bestCoursier || coursiers[0]
}

/**
 * Trouve le dernier colis porte à porte assigné à un coursier
 * pour déterminer la position de référence
 */
export async function findLastAssignedPorteAPorteShipment(): Promise<
  Shipment | null
> {
  try {
    const shipmentsRef = collection(db, "shipments")
    const snapshot = await getDocs(shipmentsRef)

    const porteAPorteShipments = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }))
      .filter(
        (shipment: any) =>
          shipment.routeInfo?.deliveryMode === "porte_a_porte" &&
          shipment.coursierId
      ) as Shipment[]

    if (porteAPorteShipments.length === 0) {
      return null
    }

    // Trier par date de création (plus récent en premier)
    porteAPorteShipments.sort((a, b) => {
      const dateA = a.createdAt?.getTime() || 0
      const dateB = b.createdAt?.getTime() || 0
      return dateB - dateA
    })

    return porteAPorteShipments[0]
  } catch (error) {
    console.error("Error finding last assigned shipment:", error)
    return null
  }
}

/**
 * Assignation automatique d'un coursier à un colis porte à porte
 */
export async function assignCoursierToShipment(
  shipmentId: string,
  shipment: Shipment
): Promise<{ success: boolean; coursierId?: string; coursierName?: string }> {
  try {
    // Vérifier que c'est un colis porte à porte
    if (shipment.routeInfo?.deliveryMode !== "porte_a_porte") {
      return { success: false }
    }

    // Si déjà assigné, ne pas réassigner
    if (shipment.coursierId) {
      return { success: true, coursierId: shipment.coursierId, coursierName: shipment.coursierName }
    }

    // Obtenir les coordonnées du colis
    const shipmentLat =
      shipment.lat || shipment.sender?.location?.latitude
    const shipmentLon =
      shipment.lon || shipment.sender?.location?.longitude

    if (!shipmentLat || !shipmentLon) {
      console.warn("Shipment has no GPS coordinates")
      return { success: false }
    }

    // Vérifier si c'est le premier colis porte à porte (aucun colis assigné)
    const lastShipment = await findLastAssignedPorteAPorteShipment()
    const isFirstShipment = !lastShipment
    
    console.log("Assignation coursier:", {
      shipmentId,
      isFirstShipment,
      hasLastShipment: !!lastShipment,
      shipmentLat,
      shipmentLon,
    })

    // Trouver le meilleur coursier (le plus proche du nouveau colis)
    const bestCoursier = await findBestCoursier(
      shipmentLat,
      shipmentLon,
      isFirstShipment
    )

    if (!bestCoursier) {
      console.warn("No available coursier found")
      return { success: false }
    }

    // Assigner le coursier au colis
    const shipmentRef = doc(db, "shipments", shipmentId)
    await updateDoc(shipmentRef, {
      coursierId: bestCoursier.uid,
      coursierName: bestCoursier.name,
      updatedAt: new Date(),
    })

    return {
      success: true,
      coursierId: bestCoursier.uid,
      coursierName: bestCoursier.name,
    }
  } catch (error) {
    console.error("Error assigning coursier to shipment:", error)
    return { success: false }
  }
}

/**
 * Assignation automatique de tous les colis porte à porte en attente
 * qui n'ont pas encore de coursier assigné
 */
export async function assignPendingPorteAPorteShipments(): Promise<{
  assigned: number
  failed: number
  errors: string[]
}> {
  const errors: string[] = []
  let assigned = 0
  let failed = 0

  try {
    const shipmentsRef = collection(db, "shipments")
    const snapshot = await getDocs(shipmentsRef)

    // Filtrer les colis porte à porte acceptés sans coursier
    const pendingShipments = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }))
      .filter(
        (shipment: any) =>
          shipment.routeInfo?.deliveryMode === "porte_a_porte" &&
          shipment.trackingNumber && // Accepté (a un numéro de suivi)
          !shipment.coursierId // Pas encore assigné
      ) as Shipment[]

    // Trier par date de création (plus ancien en premier)
    pendingShipments.sort((a, b) => {
      const dateA = a.createdAt?.getTime() || 0
      const dateB = b.createdAt?.getTime() || 0
      return dateA - dateB
    })

    // Assigner chaque colis
    for (const shipment of pendingShipments) {
      try {
        const result = await assignCoursierToShipment(shipment.id, shipment)
        if (result.success) {
          assigned++
        } else {
          failed++
          errors.push(`Colis ${shipment.trackingNumber || shipment.id}: échec de l'assignation`)
        }
      } catch (error: any) {
        failed++
        errors.push(`Colis ${shipment.trackingNumber || shipment.id}: ${error.message}`)
      }
    }

    return { assigned, failed, errors }
  } catch (error: any) {
    console.error("Error assigning pending shipments:", error)
    return { assigned, failed, errors: [error.message] }
  }
}

