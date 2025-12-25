import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, TrendingUp, Clock, Award } from "lucide-react"
import Link from "next/link"
import type { GameAttempt } from "@/lib/types"

export default async function GameResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login?role=teacher")

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .single()

  if (gameError || !game) notFound()

  const { data: attempts } = await supabase
    .from("game_attempts")
    .select(`*, profiles!game_attempts_student_id_fkey(display_name, email)`)
    .eq("game_id", id)
    .order("completed_at", { ascending: false })

  const typedAttempts = (attempts || []) as (GameAttempt & {
    profiles: { display_name: string; email: string }
  })[]

  const totalAttempts = typedAttempts.length
  const averagePercentage = totalAttempts > 0
      ? Math.round(typedAttempts.reduce((acc, a) => acc + (a.score / a.total_questions) * 100, 0) / totalAttempts)
      : 0

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <Link href="/teacher">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Relatório de Desempenho</h1>
              <p className="text-sm text-muted-foreground">{game.title}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Entregas</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAttempts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Média da Turma</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averagePercentage}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tempo Limite</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{game.time_limit}s <span className="text-xs font-normal text-muted-foreground">/ questão</span></div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resultados Individuais</CardTitle>
            <CardDescription>Lista completa de alunos que finalizaram a avaliação.</CardDescription>
          </CardHeader>
          <CardContent>
            {totalAttempts === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Nenhum aluno realizou esta avaliação ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-3 font-medium">Aluno</th>
                      <th className="py-3 font-medium">Acertos</th>
                      <th className="py-3 font-medium">Nota</th>
                      <th className="py-3 font-medium">Data de Envio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {typedAttempts.map((attempt) => {
                      const percentage = Math.round((attempt.score / attempt.total_questions) * 100)
                      return (
                        <tr key={attempt.id} className="hover:bg-secondary/50 transition-colors">
                          <td className="py-4 pr-4">
                            <div className="font-medium text-foreground">{attempt.profiles.display_name}</div>
                            <div className="text-xs text-muted-foreground">{attempt.profiles.email}</div>
                          </td>
                          <td className="py-4">
                            {attempt.score} / {attempt.total_questions}
                          </td>
                          <td className="py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              percentage >= 70 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                            }`}>
                              {percentage}%
                            </span>
                          </td>
                          <td className="py-4 text-muted-foreground">
                            {new Date(attempt.completed_at).toLocaleDateString("pt-BR", {
                              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                            })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
