import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, TrendingUp, Clock, Award, RefreshCw } from "lucide-react"
import Link from "next/link"
import type { GameAttempt } from "@/lib/types"

export default async function GameResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?role=teacher")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "teacher") {
    redirect("/")
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .single()

  if (gameError || !game) {
    notFound()
  }

  const { data: attempts } = await supabase
    .from("game_attempts")
    .select(
      `
      *,
      profiles!game_attempts_student_id_fkey(display_name, email)
    `,
    )
    .eq("game_id", id)
    .order("completed_at", { ascending: false })

  const typedAttempts = (attempts || []) as (GameAttempt & {
    profiles: { display_name: string; email: string }
  })[]

  const totalAttempts = typedAttempts.length
  const averageScore =
    totalAttempts > 0 ? Math.round(typedAttempts.reduce((acc, a) => acc + a.score, 0) / totalAttempts) : 0
  const averagePercentage =
    totalAttempts > 0
      ? Math.round(typedAttempts.reduce((acc, a) => acc + (a.score / a.total_questions) * 100, 0) / totalAttempts)
      : 0
  const averageTime =
    totalAttempts > 0 ? Math.round(typedAttempts.reduce((acc, a) => acc + a.time_taken, 0) / totalAttempts) : 0
  const uniqueStudents = new Set(typedAttempts.map((a) => a.student_id)).size

  const allowRetry = async (attemptId: string) => {
    "use server"
    const supabase = await createClient()
    await supabase.from("game_attempts").update({ can_retry: true }).eq("id", attemptId)
    redirect(`/teacher/games/${id}/results`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <header className="border-b-4 border-green-600 bg-white shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <Link href="/teacher">
              <Button variant="ghost" size="icon" className="hover:bg-green-100">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-green-800">Análise da Tarefa</h1>
              <p className="text-base text-gray-600">{game.title}</p>
            </div>
          </div>
          <Link href={`/teacher/games/${id}/edit`}>
            <Button variant="outline" className="bg-transparent border-2 font-semibold">
              Editar Tarefa
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-2 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-green-50">
              <CardTitle className="text-sm font-semibold text-green-900">Total de Tentativas</CardTitle>
              <Users className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-gray-900">{totalAttempts}</div>
              <p className="text-sm text-gray-600 mt-1">{uniqueStudents} alunos únicos</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-blue-50">
              <CardTitle className="text-sm font-semibold text-blue-900">Pontuação Média</CardTitle>
              <Award className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-gray-900">{averagePercentage}%</div>
              <p className="text-sm text-gray-600 mt-1">
                {averageScore} / {typedAttempts[0]?.total_questions || 0} perguntas
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-purple-50">
              <CardTitle className="text-sm font-semibold text-purple-900">Tempo Médio</CardTitle>
              <Clock className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-gray-900">{averageTime}s</div>
              <p className="text-sm text-gray-600 mt-1">
                De {game.time_limit}s limite ({Math.round((averageTime / game.time_limit) * 100)}%)
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-orange-50">
              <CardTitle className="text-sm font-semibold text-orange-900">Taxa de Aprovação</CardTitle>
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-gray-900">
                {totalAttempts > 0
                  ? Math.round(
                      (typedAttempts.filter((a) => (a.score / a.total_questions) * 100 >= 60).length / totalAttempts) *
                        100,
                    )
                  : 0}
                %
              </div>
              <p className="text-sm text-gray-600 mt-1">Alunos com 60% ou mais</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-2 border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-900">Tentativas Recentes</CardTitle>
            <CardDescription>Histórico de desempenho dos alunos nesta tarefa</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {totalAttempts === 0 ? (
              <div className="py-16 text-center">
                <Users className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                <h3 className="mb-2 text-xl font-bold text-gray-900">Nenhuma tentativa ainda</h3>
                <p className="text-gray-600">Os alunos ainda não jogaram esta tarefa</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-green-200">
                      <th className="pb-3 text-left text-sm font-bold text-gray-900">Aluno</th>
                      <th className="pb-3 text-left text-sm font-bold text-gray-900">Pontuação</th>
                      <th className="pb-3 text-left text-sm font-bold text-gray-900">Porcentagem</th>
                      <th className="pb-3 text-left text-sm font-bold text-gray-900">Tempo</th>
                      <th className="pb-3 text-left text-sm font-bold text-gray-900">Data</th>
                      <th className="pb-3 text-left text-sm font-bold text-gray-900">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typedAttempts.map((attempt) => {
                      const percentage = Math.round((attempt.score / attempt.total_questions) * 100)

                      return (
                        <tr key={attempt.id} className="border-b border-gray-200 last:border-0">
                          <td className="py-4">
                            <div>
                              <p className="font-semibold text-gray-900">{attempt.profiles.display_name}</p>
                              <p className="text-sm text-gray-500">{attempt.profiles.email}</p>
                            </div>
                          </td>
                          <td className="py-4 font-semibold text-gray-900">
                            {attempt.score} / {attempt.total_questions}
                          </td>
                          <td className="py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${
                                percentage >= 80
                                  ? "bg-green-100 text-green-800 border-2 border-green-400"
                                  : percentage >= 60
                                    ? "bg-yellow-100 text-yellow-800 border-2 border-yellow-400"
                                    : "bg-red-100 text-red-800 border-2 border-red-400"
                              }`}
                            >
                              {percentage}%
                            </span>
                          </td>
                          <td className="py-4 text-gray-900 font-medium">{attempt.time_taken}s</td>
                          <td className="py-4 text-gray-600">
                            {new Date(attempt.completed_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-4">
                            {!attempt.can_retry && (
                              <form action={allowRetry.bind(null, attempt.id)}>
                                <Button
                                  type="submit"
                                  variant="outline"
                                  size="sm"
                                  className="border-2 border-blue-400 text-blue-700 hover:bg-blue-50 bg-transparent"
                                >
                                  <RefreshCw className="mr-1 h-3 w-3" />
                                  Liberar
                                </Button>
                              </form>
                            )}
                            {attempt.can_retry && (
                              <span className="text-sm text-green-600 font-semibold">✓ Liberado</span>
                            )}
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
