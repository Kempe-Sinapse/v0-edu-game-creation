import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, Play, Clock, Trophy, Zap, AlertCircle, TrendingUp } from "lucide-react"
import Link from "next/link"
import type { Game, GameAttempt } from "@/lib/types"

export default async function StudentDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?role=student")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, class_id")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "student") {
    redirect("/")
  }

  let gamesQuery = supabase
    .from("games")
    .select(`
      *,
      profiles!games_teacher_id_fkey(display_name)
    `)
    .eq("is_published", true)
    .order("created_at", { ascending: false })

  if (profile.class_id) {
    gamesQuery = gamesQuery.eq("class_id", profile.class_id)
  } else {
    gamesQuery = gamesQuery.is("class_id", null)
  }

  const { data: games } = await gamesQuery
  const { data: attempts } = await supabase
    .from("game_attempts")
    .select("*")
    .eq("student_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(5)

  const handleSignOut = async () => {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Olá, {profile.display_name}</p>
          </div>
          <div className="flex items-center gap-4">
            {!profile.class_id && (
              <div className="flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs text-orange-400">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Sem turma atribuída</span>
              </div>
            )}
            <form action={handleSignOut}>
              <Button variant="ghost" type="submit" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {attempts && attempts.length > 0 && (
          <div className="mb-10">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Desempenho Recente</h2>
                <p className="text-sm text-muted-foreground">Suas últimas tentativas</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {attempts.slice(0, 3).map((attempt) => {
                const typedAttempt = attempt as GameAttempt
                const percentage = Math.round((typedAttempt.score / typedAttempt.total_questions) * 100)
                const isGood = percentage >= 70

                return (
                  <Card
                    key={attempt.id}
                    className="border-border/40 bg-card/50 backdrop-blur-sm transition-all hover:border-primary/50"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Trophy
                          className={`h-8 w-8 ${
                            percentage >= 80
                              ? "text-yellow-500"
                              : percentage >= 60
                                ? "text-slate-400"
                                : "text-slate-600"
                          }`}
                        />
                        <span className={`text-3xl font-bold ${isGood ? "text-primary" : "text-destructive"}`}>
                          {percentage}%
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm">
                        <p className="font-medium text-foreground">
                          {typedAttempt.score}/{typedAttempt.total_questions} questões
                        </p>
                        <p className="text-muted-foreground">
                          <Clock className="mr-1 inline h-3.5 w-3.5" />
                          {typedAttempt.time_taken}s
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Jogos Disponíveis</h2>
            <p className="text-sm text-muted-foreground">Selecione um jogo para começar</p>
          </div>
        </div>

        {!games || games.length === 0 ? (
          <Card className="border-dashed border-border/60 bg-card/30 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
                <Play className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">Nenhum jogo disponível</h3>
              <p className="text-muted-foreground">Aguarde! Seu professor disponibilizará novos jogos em breve</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => {
              const typedGame = game as Game & { profiles: { display_name: string } }
              const hasAttempt = attempts?.some((a) => a.game_id === game.id)
              const lastAttempt = attempts?.find((a) => a.game_id === game.id) as GameAttempt | undefined
              const canPlay = true

              return (
                <Card
                  key={game.id}
                  className="group overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-card/70"
                >
                  <CardHeader>
                    <CardTitle className="line-clamp-1 text-xl font-bold text-foreground">{game.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{game.description || "Sem descrição"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 space-y-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="mr-2 h-4 w-4 text-primary" />
                        {game.time_limit}s
                      </div>
                      <p className="text-xs text-muted-foreground">Professor: {typedGame.profiles?.display_name}</p>
                      {hasAttempt && lastAttempt && (
                        <div
                          className={`rounded-lg px-3 py-2 text-sm font-medium ${
                            lastAttempt.score / lastAttempt.total_questions >= 0.7
                              ? "bg-primary/10 text-primary"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          Última: {Math.round((lastAttempt.score / lastAttempt.total_questions) * 100)}%
                        </div>
                      )}
                    </div>
                    {canPlay ? (
                      <Link href={`/student/play/${game.id}`}>
                        <Button className="group/btn w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                          <Play className="mr-2 h-4 w-4 transition-transform group-hover/btn:scale-110" />
                          {hasAttempt ? "Jogar Novamente" : "Iniciar Jogo"}
                        </Button>
                      </Link>
                    ) : (
                      <Button disabled className="w-full">
                        Jogo realizado
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
