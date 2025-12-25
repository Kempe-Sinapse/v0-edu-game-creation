import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, BookOpen, UsersIcon, BarChart3, LogOut, Clock, FolderOpen, Layers } from "lucide-react"
import type { Game } from "@/lib/types"

export default async function TeacherDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?role=teacher")
  }

  let profile
  try {
    const { data, error } = await supabase.from("profiles").select("role, display_name").eq("id", user.id).single()

    if (error) {
      console.error("[v0] Error fetching teacher profile:", error)
      redirect("/")
    }

    profile = data
  } catch (err) {
    console.error("[v0] Exception fetching teacher profile:", err)
    redirect("/")
  }

  if (!profile || profile.role !== "teacher") {
    redirect("/")
  }

  const { data: games } = await supabase
    .from("games")
    .select(
      `
      *,
      game_attempts(count)
    `,
    )
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false })

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
            <h1 className="text-2xl font-bold text-foreground">Painel do Professor</h1>
            <p className="text-sm text-muted-foreground">Bem-vindo, {profile.display_name}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/teacher/classes">
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <UsersIcon className="h-4 w-4" />
                Turmas
              </Button>
            </Link>
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
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Meus Jogos</h2>
              <p className="text-sm text-muted-foreground">Gerencie seus jogos educacionais</p>
            </div>
          </div>
          <Link href="/teacher/games/create">
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
              <Plus className="h-4 w-4" />
              Criar Jogo
            </Button>
          </Link>
        </div>

        {!games || games.length === 0 ? (
          <Card className="border-dashed border-border/60 bg-card/30 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">Nenhum jogo criado</h3>
              <p className="mb-6 text-muted-foreground">Comece criando seu primeiro jogo educacional</p>
              <Link href="/teacher/games/create">
                <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                  <Plus className="h-4 w-4" />
                  Criar Primeiro Jogo
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => {
              const typedGame = game as Game & { game_attempts: { count: number }[] }
              const attemptCount = typedGame.game_attempts?.[0]?.count || 0

              return (
                <Card
                  key={game.id}
                  className="group overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-card/70"
                >
                  <CardHeader>
                    <div className="mb-2 flex items-center justify-between">
                      <div
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          game.is_published ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {game.is_published ? "Publicado" : "Rascunho"}
                      </div>
                    </div>
                    <CardTitle className="line-clamp-1 text-lg font-bold text-foreground">{game.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{game.description || "Sem descrição"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="mr-2 h-4 w-4 text-primary" />
                        {game.time_limit}s
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <FolderOpen className="mr-2 h-4 w-4 text-primary" />
                        {attemptCount} {attemptCount === 1 ? "tentativa" : "tentativas"}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Link href={`/teacher/games/${game.id}/edit`} className="flex-1" prefetch={false}>
                      <Button variant="outline" className="w-full font-semibold bg-transparent">
                        Editar
                      </Button>
                    </Link>
                    <Link href={`/teacher/games/${game.id}/results`} className="flex-1" prefetch={false}>
                      <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Resultados
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
