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

function SignUpForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = searchParams.get("role") || "student"

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("As senhas não coincidem")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres")
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            role: role,
          },
        },
      })

      if (error) throw error

      if (data.user) {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (loginError) {
          router.push("/auth/sign-up-success")
        } else {
          const redirectUrl = role === "teacher" ? "/teacher" : "/student"
          window.location.href = redirectUrl
        }
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ocorreu um erro")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-6">
      <div className="w-full max-w-sm">
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl font-bold">
              {role === "teacher" ? "Cadastro - Professor" : "Cadastro - Aluno"}
            </CardTitle>
            <CardDescription className="text-base">Crie sua conta para começar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="displayName" className="text-base font-semibold">
                    Nome
                  </Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Seu nome"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="border-2 border-black"
                  />
                </div>
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
                <div className="grid gap-2">
                  <Label htmlFor="repeat-password" className="text-base font-semibold">
                    Repetir Senha
                  </Label>
                  <Input
                    id="repeat-password"
                    type="password"
                    required
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
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
                  {isLoading ? "Criando conta..." : "Cadastrar"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Já tem uma conta?{" "}
                <Link
                  href={`/auth/login?role=${role}`}
                  className="font-semibold text-green-700 underline underline-offset-4"
                >
                  Fazer login
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

export default function SignUpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpForm />
    </Suspense>
  )
}
