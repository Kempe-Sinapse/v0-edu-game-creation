import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GraduationCap, BookOpen, ArrowRight, Sparkles } from "lucide-react"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    try {
      const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).single()

      if (profile && !error) {
        redirect(profile.role === "teacher" ? "/teacher" : "/student")
      } else if (error) {
        await supabase.auth.signOut()
      }
    } catch (err) {
      await supabase.auth.signOut()
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-primary/10 blur-[120px] rounded-full" />

      <div className="relative">
        <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
          <div className="mx-auto max-w-6xl text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              <span>Plataforma Educacional Gamificada</span>
            </div>

            <h1 className="mb-6 text-balance bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-6xl font-bold tracking-tight text-transparent sm:text-7xl md:text-8xl">
              EduGame
            </h1>

            <p className="mx-auto mb-12 max-w-2xl text-pretty text-xl text-muted-foreground sm:text-2xl">
              Transforme o aprendizado em uma experiência interativa e envolvente através de jogos educacionais
              inteligentes
            </p>

            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
              {/* Professor Card */}
              <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/50 p-8 backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-card/70">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="relative">
                  <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <GraduationCap className="h-8 w-8" />
                  </div>

                  <h2 className="mb-3 text-2xl font-bold text-foreground">Professor</h2>
                  <p className="mb-8 text-balance text-muted-foreground">
                    Crie jogos educacionais personalizados, gerencie turmas e acompanhe o desempenho dos alunos
                  </p>

                  <div className="space-y-3">
                    <Link href="/auth/login?role=teacher" className="block">
                      <Button className="group/btn w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-semibold">
                        Entrar
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                      </Button>
                    </Link>
                    <Link href="/auth/sign-up?role=teacher" className="block">
                      <Button
                        variant="outline"
                        className="w-full h-12 text-base font-semibold border-border/60 hover:bg-secondary bg-transparent"
                      >
                        Criar Conta
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Student Card */}
              <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/50 p-8 backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-card/70">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="relative">
                  <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <BookOpen className="h-8 w-8" />
                  </div>

                  <h2 className="mb-3 text-2xl font-bold text-foreground">Aluno</h2>
                  <p className="mb-8 text-balance text-muted-foreground">
                    Aprenda de forma interativa, teste seus conhecimentos e acompanhe seu progresso acadêmico
                  </p>

                  <div className="space-y-3">
                    <Link href="/auth/login?role=student" className="block">
                      <Button className="group/btn w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-semibold">
                        Entrar
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                      </Button>
                    </Link>
                    <Link href="/auth/sign-up?role=student" className="block">
                      <Button
                        variant="outline"
                        className="w-full h-12 text-base font-semibold border-border/60 hover:bg-secondary bg-transparent"
                      >
                        Criar Conta
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
