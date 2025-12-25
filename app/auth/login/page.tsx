"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, Suspense } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = searchParams.get("role") || "student"

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      console.log("[v0] Iniciando login com role:", role)

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log("[v0] Resultado da autenticação:", { authData, authError })

      if (authError) {
        console.log("[v0] Erro na autenticação:", authError)
        throw authError
      }

      // Verify the user has the correct role
      if (authData.user) {
        console.log("[v0] Usuário autenticado, buscando perfil:", authData.user.id)

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .single()

        console.log("[v0] Resultado da busca de perfil:", { profile, profileError })

        if (profileError) {
          console.log("[v0] Erro ao buscar perfil:", profileError)
          throw profileError
        }

        console.log("[v0] Role do perfil:", profile.role, "Role esperado:", role)

        if (profile.role !== role) {
          await supabase.auth.signOut()
          throw new Error(`Esta conta está registrada como ${profile.role}. Por favor, use o portal de login correto.`)
        }

        console.log("[v0] Login bem-sucedido, redirecionando para:", role === "teacher" ? "/teacher" : "/student")

        const redirectUrl = role === "teacher" ? "/teacher" : "/student"
        window.location.href = redirectUrl
      }
    } catch (error: unknown) {
      console.log("[v0] Erro capturado no catch:", error)
      setError(error instanceof Error ? error.message : "Ocorreu um erro")
      setIsLoading(false)
    }
    // Removido finally que setava isLoading para false, pois estamos redirecionando
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-6">
      <div className="w-full max-w-sm">
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl font-bold">
              {role === "teacher" ? "Login - Professor" : "Login - Aluno"}
            </CardTitle>
            <CardDescription className="text-base">Entre com suas credenciais para acessar sua conta</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-base font-semibold">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-2 border-black"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-base font-semibold">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-2 border-black"
                  />
                </div>
                {error && (
                  <Alert variant="destructive" className="border-2 border-red-600">
                    <AlertDescription className="font-semibold">{error}</AlertDescription>
                  </Alert>
                )}
                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-lg py-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Não tem uma conta?{" "}
                <Link
                  href={`/auth/sign-up?role=${role}`}
                  className="font-semibold text-green-700 underline underline-offset-4"
                >
                  Cadastre-se
                </Link>
              </div>
              <div className="mt-2 text-center text-sm">
                <Link href="/" className="text-muted-foreground underline underline-offset-4">
                  Voltar para início
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <LoginForm />
    </Suspense>
  )
}
