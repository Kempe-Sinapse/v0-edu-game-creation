import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, Play, Clock, Trophy, Zap, CheckCircle } from "lucide-react"
import Link from "next/link"
import type { Game, GameAttempt } from "@/lib/types"

export default async function StudentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login?role=student")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, class_id")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "student") redirect("/")

  let gamesQuery = supabase
    .from("games")
    .select(`*, profiles!games_teacher_id_fkey(display_name)`)
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

  const handleSignOut = async () => {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Painel do Aluno</h1>
            <p className="text-sm text-muted-foreground">{profile.display_name}</p>
          </div>
          <form action={handleSignOut}>
            <Button variant="ghost" type="submit" size="sm" className="gap-2">
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Avaliações Disponíveis</h2>
          <p className="text-muted-foreground">Selecione uma avaliação para iniciar.</p>
        </div>

        {!games || games.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border rounded-lg border-dashed">
            <p className="text-muted-foreground">Nenhuma avaliação disponível no momento.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => {
              const typedGame = game as Game & { profiles: { display_name: string } }
              const userAttempts = attempts?.filter((a) => a.game_id === game.id) || []
              const hasAttempt = userAttempts.length > 0
              const lastAttempt = userAttempts[0] as GameAttempt | undefined

              return (
                <Card key={game.id} className="flex flex-col hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="line-clamp-1">{game.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{game.description || "Sem descrição"}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-3 text-sm mb-6">
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="mr-2 h-4 w-4" />
                        {game.time_limit}s por questão
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Zap className="mr-2 h-4 w-4" />
                        Prof. {typedGame.profiles?.display_name}
                      </div>
                    </div>

                    {hasAttempt ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-secondary rounded-lg flex items-center justify-between">
                          <span className="text-sm font-medium">Nota Final:</span>
                          <span className="font-bold text-primary">
                            {lastAttempt ? Math.round((lastAttempt.score / lastAttempt.total_questions) * 100) : 0}%
                          </span>
                        </div>
                        <Button disabled className="w-full bg-secondary text-secondary-foreground hover:bg-secondary cursor-not-allowed">
                          <CheckCircle className="mr-2 h-4 w-4" /> Concluído
                        </Button>
                      </div>
                    ) : (
                      <Link href={`/student/play/${game.id}`} className="block mt-auto">
                        <Button className="w-full font-bold">
                          <Play className="mr-2 h-4 w-4" /> Iniciar Avaliação
                        </Button>
                      </Link>
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
