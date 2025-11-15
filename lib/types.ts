export interface Shipment {
  id: string
  trackingNumber?: string // Optional - only exists after acceptance
  // Existing flat fields (kept for backward compatibility with current UI)
  senderName: string
  senderPhone: string
  senderAddress: string
  recipientName: string
  recipientPhone: string
  recipientAddress: string

  // New nested structures (present in mobile app payloads)
  sender?: {
    name: string
    phone: string
    address?: string
    email?: string
    location?: {
      latitude: number
      longitude: number
    }
  }
  recipient?: {
    name: string
    phone: string
    address: string
  }
  payment?: {
    method: string // e.g. "wave"
  }
  routeInfo?: {
    deliveryMode: string // e.g. "point_relais"
    from: string
    to: string
    zone?: string
  }
  packageImage?: string
  packageImageUrl?: string
  packageDescription?: string
  userId?: string
  chauffeurId?: string // ID du chauffeur assigné à cette expédition
  chauffeurName?: string // Nom du chauffeur (pour affichage)
  status: "pending" | "picked-up" | "in-transit" | "out-for-delivery" | "delivered" | "cancelled"
  createdAt: Date
  updatedAt: Date
  price?: number
  weight?: number
  notes?: string
  currentLocation?: string
  lon?: number
  lat?: number
}

export interface AppUser {
  uid: string
  email: string
  name: string
  phone: string
  role: "user" | "admin" | "chauffeur"
  fcmToken?: string
  createdAt: Date
  updatedAt: Date
}
