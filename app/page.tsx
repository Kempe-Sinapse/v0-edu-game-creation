import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GraduationCap, Sparkles, ArrowRight } from "lucide-react"

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile) redirect(profile.role === "teacher" ? "/teacher" : "/student")
  }

  return (
    <div className="min-h-screen bg-[#F7F9F0] flex flex-col">
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 font-black text-2xl text-primary tracking-tight">
          <div className="bg-primary text-white p-1.5 rounded-lg">
            <Sparkles className="h-5 w-5" />
          </div>
          EduGame
        </div>
        <Link href="/auth/login">
          <Button variant="ghost" className="font-semibold hover:bg-primary/10 hover:text-primary">
            Entrar
          </Button>
        </Link>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto pb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-primary/20 text-primary text-sm font-semibold mb-8 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Plataforma de Gamificação 2.0
        </div>
        
        <h1 className="text-5xl sm:text-7xl font-black text-gray-900 mb-6 tracking-tight leading-[1.1]">
          Aprender nunca foi tão <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-400">divertido</span>.
        </h1>
        
        <p className="text-xl text-gray-600 mb-10 max-w-2xl leading-relaxed">
          Crie jogos interativos em segundos. Engaje seus alunos com desafios de completar frases e acompanhe o desempenho em tempo real.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link href="/auth/sign-up?role=teacher">
            <Button size="lg" className="h-14 px-8 text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all bg-gray-900 hover:bg-gray-800 w-full sm:w-auto">
              Sou Professor
            </Button>
          </Link>
          <Link href="/auth/sign-up?role=student">
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-2xl border-2 hover:bg-white w-full sm:w-auto bg-white">
              <GraduationCap className="mr-2 h-5 w-5" />
              Sou Aluno
            </Button>
          </Link>
        </div>
      </main>
      
      {/* Decoração de Fundo */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
    </div>
  )
}
