export interface Shipment {
  id: string
  trackingNumber?: string // Optional - only exists after acceptance
  senderName: string
  senderPhone: string
  senderAddress: string
  recipientName: string
  recipientPhone: string
  recipientAddress: string
  status: "pending" | "picked-up" | "in-transit" | "out-for-delivery" | "delivered" | "cancelled"
  createdAt: Date
  updatedAt: Date
  price?: number
  weight?: number
  notes?: string
  currentLocation?: string
  lon?: number // Longitude - added after acceptance
  lat?: number // Latitude - added after acceptance
}
