"use client"

import { createContext, useContext, useState, useEffect } from "react"

interface SidebarContextType {
  isOpen: boolean
  toggle: () => void
  setIsOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextType>({
  isOpen: true,
  toggle: () => {},
  setIsOpen: () => {},
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)

  // Charger l'état depuis localStorage au montage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-open")
    if (saved !== null) {
      setIsOpen(saved === "true")
    }
  }, [])

  // Sauvegarder l'état dans localStorage
  useEffect(() => {
    localStorage.setItem("sidebar-open", String(isOpen))
  }, [isOpen])

  const toggle = () => setIsOpen(!isOpen)

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => useContext(SidebarContext)

