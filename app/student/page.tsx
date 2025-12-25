import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { LogOut, Play, Clock, Trophy, Zap, CheckCircle, GraduationCap, Calendar, BarChart3, ChevronRight, Eye, History } from "lucide-react"
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

  // Separar jogos
  const pendingGames = games?.filter(game => 
    !attempts?.some(attempt => attempt.game_id === game.id)
  ) || []

  const completedGames = games?.filter(game => 
    attempts?.some(attempt => attempt.game_id === game.id)
  ) || []

  // Estatísticas
  const totalCompleted = completedGames.length
  const totalScore = attempts?.reduce((acc, curr) => acc + curr.score, 0) || 0
  const totalQuestionsAttempted = attempts?.reduce((acc, curr) => acc + curr.total_questions, 0) || 0
  const accuracy = totalQuestionsAttempted > 0 ? Math.round((totalScore / totalQuestionsAttempted) * 100) : 0

  const handleSignOut = async () => {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
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
            <Button variant="ghost" type="submit" size="sm" className="text-muted-foreground hover:text-white">
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-12">
        
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-secondary/30 border-white/5 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Avaliações Pendentes</p>
                <h3 className="text-3xl font-bold text-white mt-1">{pendingGames.length}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/30 border-white/5 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Concluídas</p>
                <h3 className="text-3xl font-bold text-white mt-1">{totalCompleted}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                <CheckCircle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/30 border-white/5 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Precisão Geral</p>
                <h3 className="text-3xl font-bold text-white mt-1">{accuracy}%</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <BarChart3 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seção: Avaliações Pendentes */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Zap className="h-5 w-5 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">Avaliações Disponíveis</h2>
          </div>

          {pendingGames.length === 0 ? (
            <Card className="bg-secondary/10 border-white/5 border-dashed backdrop-blur-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 bg-secondary/30 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-500/50" />
                </div>
                <h3 className="text-lg font-medium text-white mb-1">Ops, sem novas avaliações por enquanto</h3>
                <p className="text-sm text-muted-foreground">Você completou todas as atividades pendentes. Bom trabalho!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pendingGames.map((game) => {
                const typedGame = game as Game & { profiles: { display_name: string } }
                return (
                  <Card key={game.id} className="group flex flex-col bg-card border-white/5 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                    <div className="h-1 w-full bg-gradient-to-r from-primary to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader>
                      <span className="text-xs font-bold px-2 py-1 rounded bg-secondary w-fit text-muted-foreground mb-2">NOVO</span>
                      <CardTitle className="line-clamp-1 text-lg group-hover:text-primary transition-colors">{game.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{game.description || "Sem descrição"}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="flex items-center text-xs text-muted-foreground gap-4">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {game.time_limit}s/q</span>
                        <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" /> {typedGame.profiles?.display_name}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Link href={`/student/play/${game.id}`} className="w-full">
                        <Button className="w-full font-bold bg-white text-black hover:bg-white/90">
                          Iniciar Agora <Play className="ml-2 h-3 w-3 fill-current" />
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        {/* Seção: Avaliações Concluídas */}
        {completedGames.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <History className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-bold text-white">Histórico de Conclusão</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedGames.map((game) => {
                const attempt = attempts?.find(a => a.game_id === game.id)
                const percentage = attempt ? Math.round((attempt.score / attempt.total_questions) * 100) : 0
                
                return (
                  <Card key={game.id} className="bg-secondary/20 border-white/5 flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base line-clamp-1">{game.title}</CardTitle>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${percentage >= 70 ? 'bg-green-500/10 text-green-400' : 'bg-secondary text-muted-foreground'}`}>
                          {percentage}%
                        </span>
                      </div>
                      <CardDescription className="text-xs">Entregue em: {new Date(attempt!.completed_at).toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3 flex-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Acertos:</span>
                        <span className="font-medium text-white">{attempt?.score} de {attempt?.total_questions}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Link href={`/student/results/${attempt!.id}`} className="w-full">
                        <Button variant="outline" size="sm" className="w-full border-white/10 hover:bg-white/5 text-muted-foreground hover:text-white">
                          <Eye className="mr-2 h-3 w-3" /> Visualizar
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
