"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Search, User, Shield, UserCheck } from "lucide-react"
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp, updateDoc } from "firebase/firestore"
import { createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword } from "firebase/auth"
import { db, auth } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { AppUser } from "@/lib/types"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"

export default function UsersPage() {
  const { user: currentAdmin } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)

  // Form state
  const [email, setEmail] = useState("")
  const [password] = useState("EbnExpress2025@") // Mot de passe par défaut
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<"user" | "admin" | "chauffeur">("admin")
  const [createError, setCreateError] = useState("")
  const [createSuccess, setCreateSuccess] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState("")
  const [generatingEmail, setGeneratingEmail] = useState(false)

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, "users")
      const snapshot = await getDocs(usersRef)

      const data = snapshot.docs
        .map((doc) => {
          const docData = doc.data()
          // Handle both cases: document ID is UID or email
          return {
            uid: doc.id,
            email: docData.email || doc.id, // Use email from data or document ID
            name: docData.name || "",
            phone: docData.phone || "",
            role: docData.role || "user",
            fcmToken: docData.fcmToken,
            createdAt: docData.createdAt?.toDate() || new Date(),
            updatedAt: docData.updatedAt?.toDate() || new Date(),
          } as AppUser
        })
        .filter((user) => user.email) // Filter out invalid users

      setUsers(data)
      setFilteredUsers(data)
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    const term = searchTerm.toLowerCase()
    const filtered = users.filter(
      (user) =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.phone.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term),
    )
    setFilteredUsers(filtered)
  }, [searchTerm, users])

  // Fonction pour générer l'email à partir du nom
  const generateEmailFromName = useCallback(async (fullName: string) => {
    if (!fullName.trim()) {
      setEmail("")
      return
    }

    setGeneratingEmail(true)
    try {
      // Nettoyer le nom : enlever les accents, convertir en minuscules, remplacer les espaces par des points
      const cleanName = fullName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Enlever les accents
        .trim()
        .replace(/\s+/g, ".") // Remplacer les espaces multiples par un point
        .replace(/[^a-z0-9.]/g, "") // Enlever les caractères spéciaux sauf points

      // Générer l'email de base
      let baseEmail = `${cleanName}@ebn-express.com`
      let finalEmail = baseEmail
      let counter = 1

      // Vérifier si l'email existe déjà
      const usersRef = collection(db, "users")
      const snapshot = await getDocs(usersRef)
      
      // Vérifier aussi dans Firebase Auth (on ne peut pas le faire directement, mais on vérifie dans Firestore)
      const existingEmails = new Set(
        snapshot.docs.map((doc) => {
          const data = doc.data()
          return (data.email || "").toLowerCase()
        })
      )

      // Si l'email existe, incrémenter jusqu'à trouver un email disponible
      while (existingEmails.has(finalEmail.toLowerCase())) {
        finalEmail = `${cleanName}${counter}@ebn-express.com`
        counter++
      }

      setEmail(finalEmail)
    } catch (error) {
      console.error("Error generating email:", error)
    } finally {
      setGeneratingEmail(false)
    }
  }, [])

  // Générer l'email automatiquement quand le nom change (avec debounce)
  useEffect(() => {
    if (!name.trim()) {
      setEmail("")
      return
    }

    // Debounce pour éviter trop de requêtes
    const timeoutId = setTimeout(() => {
      generateEmailFromName(name)
    }, 500) // Attendre 500ms après la dernière frappe

    return () => clearTimeout(timeoutId)
  }, [name, generateEmailFromName])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError("")
    setCreateSuccess("")
    setCreating(true)

    try {
      // Check if user already exists
      const usersRef = collection(db, "users")
      const snapshot = await getDocs(usersRef)
      const existingUser = snapshot.docs.find((doc) => doc.data().email === email)
      
      if (existingUser) {
        setCreateError("Un utilisateur avec cet email existe déjà")
        setCreating(false)
        return
      }

      // Create user document in Firestore
      // Note: In production, use Firebase Admin SDK via Cloud Functions to create both
      // Firebase Auth user and Firestore document securely
      // 
      // For now, we'll create the document with email as key
      // When the user logs in for the first time, the system can update the document with their Firebase Auth UID
      // Or the admin can manually create the Firebase Auth account and update the document
      
      const userData = {
        email,
        name,
        phone,
        role,
        // Store password temporarily - should be removed after Firebase Auth account is created
        // Admin should create Firebase Auth account in Firebase Console
        _tempPassword: "EbnExpress2025@", // Mot de passe par défaut
        _needsAuthAccount: true, // Flag to indicate Firebase Auth account needs to be created
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      // Créer l'utilisateur dans Firebase Auth
      const defaultPassword = "EbnExpress2025@"
      let firebaseAuthUser = null
      
      try {
        // Sauvegarder les credentials de l'admin actuel avant de créer l'utilisateur
        const adminEmail = currentAdmin?.email
        if (!adminEmail) {
          throw new Error("Admin non connecté. Veuillez vous reconnecter.")
        }

        // Créer le compte Firebase Auth (cela connectera automatiquement l'utilisateur créé)
        const userCredential = await createUserWithEmailAndPassword(auth, email, defaultPassword)
        firebaseAuthUser = userCredential.user
        const firebaseUid = firebaseAuthUser.uid

        // IMPORTANT: Créer le document Firestore AVANT de se déconnecter
        // Car les règles Firestore nécessitent request.auth != null
        // Pendant que l'utilisateur créé est connecté, on peut créer son document
        const { _tempPassword, _needsAuthAccount, ...cleanUserData } = userData
        await setDoc(doc(db, "users", firebaseUid), {
          ...cleanUserData,
          uid: firebaseUid,
          updatedAt: serverTimestamp(),
        })

        // Maintenant, déconnecter l'utilisateur créé
        await signOut(auth)

        // Essayer de reconnecter l'admin si on a son email
        // Note: On n'a pas le mot de passe, donc on ne peut pas reconnecter automatiquement
        // L'admin devra se reconnecter manuellement

        setCreateSuccess(
          `✅ Utilisateur créé avec succès! ` +
          `Email: ${email} ` +
          `Mot de passe par défaut: ${defaultPassword} ` +
          `L'utilisateur peut maintenant se connecter. ` +
          `⚠️ Vous avez été déconnecté. Veuillez vous reconnecter avec votre compte admin.`
        )
        
        // Rediriger vers la page de connexion après 2 secondes
        setTimeout(() => {
          window.location.href = "/login?message=Utilisateur créé avec succès. Veuillez vous reconnecter."
        }, 2000)
      } catch (authError: any) {
        console.error("Erreur lors de la création du compte Firebase Auth:", authError)
        
        // Si la création Firebase Auth échoue, créer quand même le document Firestore
        const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        await setDoc(doc(db, "users", tempUserId), userData)

        if (authError.code === "auth/email-already-in-use") {
          setCreateError(
            `L'email ${email} est déjà utilisé dans Firebase Auth. ` +
            `Le document Firestore a été créé avec l'ID: ${tempUserId}. ` +
            `Veuillez lier manuellement le compte Firebase Auth existant.`
          )
        } else {
          setCreateError(
            `Erreur lors de la création du compte Firebase Auth: ${authError.message}. ` +
            `Le document Firestore a été créé avec l'ID: ${tempUserId}. ` +
            `Veuillez créer le compte Firebase Auth manuellement dans la console.`
          )
        }
        return
      }
      setEmail("")
      setName("")
      setPhone("")
      setRole("admin")
      setShowCreateForm(false)
      await fetchUsers()
      
      // Clear success message after 15 seconds
      setTimeout(() => setCreateSuccess(""), 15000)
    } catch (error: any) {
      console.error("Error creating user:", error)
      setCreateError("Erreur lors de la création de l'utilisateur: " + error.message)
    } finally {
      setCreating(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4 text-blue-500" />
      case "chauffeur":
        return <UserCheck className="h-4 w-4 text-green-500" />
      default:
        return <User className="h-4 w-4 text-gray-500" />
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrateur"
      case "chauffeur":
        return "Chauffeur"
      default:
        return "Utilisateur"
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string, userName: string) => {
    setDeletingId(userId)
    setDeleteError("")
    
    try {
      // Supprimer le document Firestore
      // Note: Pour supprimer le compte Firebase Auth, il faut utiliser Firebase Admin SDK
      // car on ne peut pas supprimer d'autres utilisateurs depuis le client
      await deleteDoc(doc(db, "users", userId))
      
      // Rafraîchir la liste des utilisateurs
      await fetchUsers()
      
      setDeletingId(null)
    } catch (error: any) {
      console.error("Error deleting user:", error)
      setDeleteError(`Erreur lors de la suppression: ${error.message}`)
      setDeletingId(null)
    }
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">Gérez les utilisateurs, admins et chauffeurs</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Créer un utilisateur
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Créer un nouvel utilisateur</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nom.prenom@ebn-express.com"
                      required
                      className={generatingEmail ? "opacity-50" : ""}
                    />
                    {generatingEmail && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    L'email est généré automatiquement à partir du nom. Vous pouvez le modifier si nécessaire.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+221 77 123 45 67"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rôle</Label>
                  <Select value={role} onValueChange={(value: "user" | "admin" | "chauffeur") => setRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrateur</SelectItem>
                      <SelectItem value="chauffeur">Chauffeur</SelectItem>
                      <SelectItem value="user">Utilisateur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="text"
                    value="EbnExpress2025@"
                    readOnly
                    className="bg-muted"
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Mot de passe par défaut. L'utilisateur pourra le changer après la première connexion.
                  </p>
                </div>
              </div>
              {createError && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{createError}</div>
              )}
              {createSuccess && (
                <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">{createSuccess}</div>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? "Création..." : "Créer l'utilisateur"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email, téléphone ou rôle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "Aucun utilisateur trouvé" : "Aucun utilisateur pour le moment"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nom</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Téléphone</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Rôle</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Créé le</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.uid} className="border-b border-border last:border-0">
                      <td className="py-3 px-4 font-medium">{user.name}</td>
                      <td className="py-3 px-4">{user.email}</td>
                      <td className="py-3 px-4">{user.phone}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(user.role)}
                          <span>{getRoleLabel(user.role)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {user.createdAt?.toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={deletingId === user.uid}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{user.name}</strong> ({user.email}) ?
                                <br />
                                <br />
                                Cette action supprimera le document Firestore de l'utilisateur.
                                <br />
                                <span className="text-orange-600 font-medium">
                                  ⚠️ Pour supprimer le compte Firebase Auth, utilisez Firebase Admin SDK via Cloud Functions ou la console Firebase.
                                </span>
                              </AlertDialogDescription>
                              {deleteError && (
                                <div className="mt-2 p-2 bg-destructive/10 text-destructive text-sm rounded">
                                  {deleteError}
                                </div>
                              )}
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(user.uid, user.email, user.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deletingId === user.uid ? "Suppression..." : "Supprimer"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

