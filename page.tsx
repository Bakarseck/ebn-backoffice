// "use client"

// import { useState } from "react"
// import { useRouter } from "next/navigation"
// import { createUserWithEmailAndPassword, signOut } from "firebase/auth"
// import { doc, serverTimestamp, setDoc } from "firebase/firestore"
// import { auth, db } from "@/lib/firebase"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Button } from "@/components/ui/button"

// export default function CreateAdminPage() {
//   const router = useRouter()
//   const [name, setName] = useState("")
//   const [email, setEmail] = useState("")
//   const [phone, setPhone] = useState("")
//   const [password, setPassword] = useState("EbnExpress2025@")
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState("")
//   const [success, setSuccess] = useState("")

//   const handleSubmit = async (event: React.FormEvent) => {
//     event.preventDefault()
//     setError("")
//     setSuccess("")

//     if (!name.trim()) {
//       setError("Le nom complet est requis.")
//       return
//     }

//     if (!email.trim()) {
//       setError("L'email est requis.")
//       return
//     }

//     setLoading(true)

//     try {
//       const normalizedEmail = email.trim().toLowerCase()
//       const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
//       const firebaseUser = credential.user

//       await setDoc(doc(db, "users", firebaseUser.uid), {
//         uid: firebaseUser.uid,
//         email: normalizedEmail,
//         name: name.trim(),
//         phone: phone.trim(),
//         role: "admin",
//         createdAt: serverTimestamp(),
//         updatedAt: serverTimestamp(),
//         createdViaEmergencyPage: true,
//       })

//       const successMessage = `✅ Administrateur créé. Email: ${normalizedEmail} / Mot de passe: ${password}`
//       setSuccess(successMessage)

//       // Déconnecter l'utilisateur fraîchement créé pour laisser la place à l'admin réel
//       await signOut(auth)

//       // Rediriger vers la page de connexion pour se connecter avec le nouveau compte
//       setTimeout(() => {
//         router.push(
//           `/login?message=${encodeURIComponent(
//             `Administrateur créé. Connectez-vous avec ${normalizedEmail}`,
//           )}`,
//         )
//       }, 1500)
//     } catch (err: any) {
//       if (err.code === "auth/email-already-in-use") {
//         setError("Cet email est déjà utilisé. Merci d'en choisir un autre.")
//       } else if (err.code === "auth/weak-password") {
//         setError("Mot de passe trop faible. Ajoutez des lettres, chiffres et symboles.")
//       } else {
//         setError("Erreur lors de la création de l'admin: " + err.message)
//       }
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f1419] p-4">
//       <Card className="w-full max-w-xl border-border/50 bg-card/95 backdrop-blur">
//         <CardHeader className="space-y-2 text-center">
//           <CardTitle className="text-2xl font-bold">Créer un administrateur</CardTitle>
//           <CardDescription>
//             Page temporaire pour générer un compte admin. À supprimer une fois l&apos;opération
//             terminée.
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <form className="space-y-4" onSubmit={handleSubmit}>
//             <div className="space-y-2">
//               <Label htmlFor="name">Nom complet</Label>
//               <Input
//                 id="name"
//                 value={name}
//                 onChange={(event) => setName(event.target.value)}
//                 placeholder="Bakar Seck"
//                 required
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="email">Email professionnel</Label>
//               <Input
//                 id="email"
//                 type="email"
//                 value={email}
//                 onChange={(event) => setEmail(event.target.value)}
//                 placeholder="admin@ebn-express.com"
//                 required
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="phone">Téléphone</Label>
//               <Input
//                 id="phone"
//                 value={phone}
//                 onChange={(event) => setPhone(event.target.value)}
//                 placeholder="+221 77 123 45 67"
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="password">Mot de passe temporaire</Label>
//               <Input
//                 id="password"
//                 type="text"
//                 value={password}
//                 onChange={(event) => setPassword(event.target.value)}
//                 required
//               />
//               <p className="text-xs text-muted-foreground">
//                 Communiquez ce mot de passe à l&apos;administrateur créé. Il pourra le modifier après
//                 connexion.
//               </p>
//             </div>

//             {error && (
//               <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
//             )}
//             {success && (
//               <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">{success}</div>
//             )}

//             <Button type="submit" className="w-full" disabled={loading}>
//               {loading ? "Création..." : "Créer l'administrateur"}
//             </Button>
//             <Button
//               type="button"
//               variant="ghost"
//               className="w-full text-muted-foreground"
//               onClick={() => router.push("/login")}
//             >
//               Retour à la connexion
//             </Button>
//           </form>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }


