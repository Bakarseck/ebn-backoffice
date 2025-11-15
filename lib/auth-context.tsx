"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { type User as FirebaseUser, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth"
import { doc, getDoc, collection, getDocs, setDoc, deleteDoc } from "firebase/firestore"
import { auth, db } from "./firebase"
import type { AppUser } from "./types"

interface AuthContextType {
  user: FirebaseUser | null
  appUser: AppUser | null
  isAdmin: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  isAdmin: false,
  loading: true,
  signIn: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      
      if (firebaseUser) {
        // Fetch user data from Firestore
        try {
          // First, try to find user by UID
          let userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
          
          let userData: any = null
          let userDocId: string = firebaseUser.uid
          
          if (userDoc.exists()) {
            userData = userDoc.data()
            userDocId = userDoc.id
          } else if (firebaseUser.email) {
            // If not found by UID, try to find by email
            const usersRef = collection(db, "users")
            const usersSnapshot = await getDocs(usersRef)
            const userByEmail = usersSnapshot.docs.find(
              (doc) => doc.data().email === firebaseUser.email || doc.id === firebaseUser.email
            )
            if (userByEmail) {
              userData = userByEmail.data()
              userDocId = userByEmail.id
            }
          }
          
          if (userData) {
            const appUserData: AppUser = {
              uid: firebaseUser.uid, // Always use Firebase Auth UID
              email: userData.email || firebaseUser.email || "",
              name: userData.name || "",
              phone: userData.phone || "",
              role: userData.role || "user",
              fcmToken: userData.fcmToken,
              createdAt: userData.createdAt?.toDate() || new Date(),
              updatedAt: userData.updatedAt?.toDate() || new Date(),
            }
            setAppUser(appUserData)
            
            // If user document was found by email, update it with Firebase Auth UID
            // (This handles the case where admin created user with email as document ID)
            if (userDocId !== firebaseUser.uid && userDocId.includes("@")) {
              // Document ID is email, update it to use Firebase Auth UID
              try {
                // Create new document with Firebase Auth UID, excluding temp fields
                const { _tempPassword, _needsAuthAccount, ...userDataWithoutTemp } = userData
                await setDoc(doc(db, "users", firebaseUser.uid), {
                  ...userDataWithoutTemp,
                  uid: firebaseUser.uid,
                  updatedAt: new Date(),
                })
                // Delete old document with email as ID
                await deleteDoc(doc(db, "users", userDocId))
              } catch (updateError) {
                console.error("Error updating user document:", updateError)
              }
            }
          } else {
            // User doesn't exist in Firestore, set to null
            setAppUser(null)
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
          setAppUser(null)
        }
      } else {
        setAppUser(null)
      }
      
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const logout = async () => {
    await signOut(auth)
    setAppUser(null)
  }

  const isAdmin = appUser?.role === "admin"

  return (
    <AuthContext.Provider value={{ user, appUser, isAdmin, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
