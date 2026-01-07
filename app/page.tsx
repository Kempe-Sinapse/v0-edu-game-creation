import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Hexagon, ShieldCheck, Zap, LogIn } from "lucide-react"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    try {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
      if (profile) redirect(profile.role === "teacher" ? "/teacher" : "/student")
    } catch (err) {
      // Silently handle error if profile not found
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Background Abstract Shapes - Efeito Glow Futurista */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-50" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none opacity-50" />

      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full z-10 border-b border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-2 font-black text-2xl tracking-tighter">
          <div className="bg-primary p-1.5 rounded-lg shadow-lg shadow-primary/20">
            <Hexagon className="h-6 w-6 text-white fill-white/20" />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">Trivu</span>
        </div>
        <div className="flex gap-4">
          <Link href="/auth/login">
            <Button variant="ghost" className="font-medium hover:bg-white/5 hover:text-white">
              Entrar
            </Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-6xl mx-auto pb-20 z-10 pt-20">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/50 text-secondary-foreground text-sm font-medium mb-8 border border-white/10 backdrop-blur-md shadow-inner">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="tracking-wide text-xs uppercase">Plataforma Acadêmica v2.0</span>
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black mb-8 tracking-tight leading-[1.1] text-white drop-shadow-2xl">
          O futuro da <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-blue-500">
            avaliação digital.
          </span>
        </h1>

        <p className="text-xl text-muted-foreground mb-12 max-w-2xl leading-relaxed font-light">
          Segurança, design e performance para o ensino moderno. Transforme testes em experiências de aprendizado
          mensuráveis.
        </p>

        <div className="flex flex-col sm:flex-row gap-5 w-full justify-center mb-24">
          <Link href="/auth/login?role=teacher">
            <Button
              size="lg"
              className="h-14 px-8 text-lg font-bold rounded-xl shadow-[0_0_40px_-10px_rgba(124,58,237,0.5)] hover:shadow-[0_0_60px_-10px_rgba(124,58,237,0.6)] hover:scale-105 transition-all w-full sm:w-auto bg-primary text-white border-none"
            >
              Portal do Docente <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          {/* CORREÇÃO AQUI: Redireciona para LOGIN e o hover tem cor legível */}
          <Link href="/auth/login?role=student">
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-lg font-bold rounded-xl border-white/20 bg-white/5 backdrop-blur-sm text-white hover:bg-white/10 hover:text-white hover:border-white/40 w-full sm:w-auto transition-all"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Portal do Aluno
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          <div className="group p-8 rounded-3xl bg-secondary/30 border border-white/5 backdrop-blur-md hover:bg-secondary/50 transition-all hover:border-primary/30">
            <div className="mb-4 p-3 bg-primary/10 w-fit rounded-xl group-hover:scale-110 transition-transform">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Performance</h3>
            <p className="text-muted-foreground leading-relaxed">
              Interface otimizada para foco total e carregamento instantâneo, sem distrações.
            </p>
          </div>
          <div className="group p-8 rounded-3xl bg-secondary/30 border border-white/5 backdrop-blur-md hover:bg-secondary/50 transition-all hover:border-primary/30">
            <div className="mb-4 p-3 bg-blue-500/10 w-fit rounded-xl group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Integridade</h3>
            <p className="text-muted-foreground leading-relaxed">
              Sistema de tentativa única e controle de tempo preciso para avaliações justas.
            </p>
          </div>
          <div className="group p-8 rounded-3xl bg-secondary/30 border border-white/5 backdrop-blur-md hover:bg-secondary/50 transition-all hover:border-primary/30">
            <div className="mb-4 p-3 bg-purple-500/10 w-fit rounded-xl group-hover:scale-110 transition-transform">
              <Hexagon className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Analytics</h3>
            <p className="text-muted-foreground leading-relaxed">
              Dados estruturados de acertos e erros para acompanhamento pedagógico.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
