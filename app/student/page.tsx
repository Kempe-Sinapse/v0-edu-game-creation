import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { LogOut, Play, Clock, Trophy, Zap, CheckCircle, GraduationCap, Calendar, BarChart3, ChevronRight } from "lucide-react"
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

  // Estatísticas do Aluno
  const totalGames = games?.length || 0
  const completedGames = attempts?.length || 0
  const totalScore = attempts?.reduce((acc, curr) => acc + curr.score, 0) || 0
  const totalQuestions = attempts?.reduce((acc, curr) => acc + curr.total_questions, 0) || 0
  const averageAccuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0

  const handleSignOut = async () => {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header com Glassmorphism */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Portal do Aluno</h1>
              <p className="font-bold text-white">{profile.display_name}</p>
            </div>
          </div>
          <form action={handleSignOut}>
            <Button variant="ghost" type="submit" size="sm" className="text-muted-foreground hover:text-white hover:bg-white/5">
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-10">
        
        {/* Seção de Estatísticas (Hero) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-secondary/50 to-secondary/20 border-white/5 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avaliações Concluídas</p>
                <h3 className="text-3xl font-bold mt-1 text-white">{completedGames} <span className="text-lg text-muted-foreground font-normal">/ {totalGames}</span></h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-secondary/50 to-secondary/20 border-white/5 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Precisão Média</p>
                <h3 className="text-3xl font-bold mt-1 text-white">{averageAccuracy}%</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-primary/20 to-secondary/20 border-primary/20 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/10 blur-xl opacity-50"></div>
            <CardContent className="p-6 flex items-center justify-between relative z-10">
              <div>
                <p className="text-sm font-medium text-primary/80">Questões Acertadas</p>
                <h3 className="text-3xl font-bold mt-1 text-white">{totalScore}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Lista de Avaliações */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Avaliações Disponíveis
            </h2>
          </div>

          {!games || games.length === 0 ? (
            <Card className="border-dashed border-white/10 bg-transparent py-16">
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-white">Tudo em dia!</h3>
                <p className="text-muted-foreground">Não há novas avaliações agendadas no momento.</p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {games.map((game) => {
                const typedGame = game as Game & { profiles: { display_name: string } }
                const userAttempts = attempts?.filter((a) => a.game_id === game.id) || []
                const hasAttempt = userAttempts.length > 0
                const lastAttempt = userAttempts[0] as GameAttempt | undefined

                return (
                  <Card key={game.id} className="group flex flex-col bg-secondary/30 border-white/5 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 overflow-hidden">
                    <div className="h-1 w-full bg-gradient-to-r from-primary/50 to-blue-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold px-2 py-1 rounded bg-secondary text-muted-foreground uppercase tracking-wider">
                          Avaliação
                        </span>
                        {hasAttempt && (
                          <span className="text-xs font-bold px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Feito
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-xl leading-tight group-hover:text-primary transition-colors">
                        {game.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 mt-2">
                        {game.description || "Sem descrição adicional."}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="flex-1">
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center text-muted-foreground bg-secondary/50 p-2 rounded-lg">
                          <Clock className="mr-3 h-4 w-4 text-primary" />
                          <span className="font-mono">{game.time_limit}s</span>
                          <span className="text-xs ml-1 opacity-70">por questão</span>
                        </div>
                        <div className="flex items-center text-muted-foreground p-2">
                          <GraduationCap className="mr-3 h-4 w-4 opacity-50" />
                          Prof. {typedGame.profiles?.display_name}
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0">
                      {hasAttempt ? (
                        <div className="w-full bg-secondary/50 rounded-lg p-3 border border-white/5 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground font-medium">Nota Obtida</span>
                          <span className="text-lg font-bold text-white">
                            {lastAttempt ? Math.round((lastAttempt.score / lastAttempt.total_questions) * 100) : 0}%
                          </span>
                        </div>
                      ) : (
                        <Link href={`/student/play/${game.id}`} className="w-full">
                          <Button className="w-full font-bold bg-white text-black hover:bg-white/90 group-hover:translate-x-1 transition-all">
                            Iniciar Agora <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </Link>
                      )}
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
