import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Hexagon, ShieldCheck, Zap } from "lucide-react"

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile) redirect(profile.role === "teacher" ? "/teacher" : "/student")
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Background Abstract Shapes */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full z-10">
        <div className="flex items-center gap-2 font-black text-2xl tracking-tighter">
          <Hexagon className="h-8 w-8 text-primary fill-primary/20" />
          <span>Trivu</span>
        </div>
        <div className="flex gap-4">
          <Link href="/auth/login">
            <Button variant="ghost" className="font-medium hover:bg-primary/10 hover:text-primary">
              Login
            </Button>
          </Link>
          <Link href="/auth/sign-up">
            <Button className="font-medium shadow-lg shadow-primary/20">
              Começar Agora
            </Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-5xl mx-auto pb-20 z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-8 border border-border">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Avaliação Acadêmica Inteligente
        </div>
        
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black mb-8 tracking-tight leading-[1.1] bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60">
          O futuro da <br/> avaliação.
        </h1>
        
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl leading-relaxed">
          O <strong>Trivu</strong> transforma testes convencionais em experiências de aprendizado engajadoras e mensuráveis. Segurança, performance e design para o ensino superior.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-16">
          <Link href="/auth/sign-up?role=teacher">
            <Button size="lg" className="h-14 px-8 text-lg font-bold rounded-lg shadow-xl shadow-primary/20 hover:scale-105 transition-transform w-full sm:w-auto">
              Acesso Docente <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/auth/sign-up?role=student">
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-bold rounded-lg border-2 hover:bg-secondary w-full sm:w-auto">
              Acesso Discente
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left w-full max-w-4xl">
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
            <Zap className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-lg font-bold mb-2">Alta Performance</h3>
            <p className="text-muted-foreground">Interface otimizada para foco total e carregamento instantâneo de questões.</p>
          </div>
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
            <ShieldCheck className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-lg font-bold mb-2">Integridade Acadêmica</h3>
            <p className="text-muted-foreground">Sistema de tentativa única e temporizador preciso por questão.</p>
          </div>
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
            <Hexagon className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-lg font-bold mb-2">Dados Estruturados</h3>
            <p className="text-muted-foreground">Dashboards analíticos detalhados para acompanhamento de desempenho.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
