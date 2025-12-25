import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Check, X, ArrowLeft, Lock, HelpCircle } from "lucide-react"
import Link from "next/link"
import type { GameAttempt, Game } from "@/lib/types"

export default async function StudentResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login?role=student")

  const { data: attempt, error } = await supabase
    .from("game_attempts")
    .select(`*, games(*)`)
    .eq("id", attemptId)
    .eq("student_id", user.id)
    .single()

  if (error || !attempt) notFound()

  const typedAttempt = attempt as GameAttempt & { games: Game }
  const game = typedAttempt.games
  const percentage = Math.round((typedAttempt.score / typedAttempt.total_questions) * 100)
  const reveal = game.reveal_answers ?? true

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <Link href="/student">
            <Button variant="ghost" size="icon" className="hover:bg-secondary">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Resultado da Avaliação</h1>
            <p className="text-sm text-muted-foreground">{game.title}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <Card className="mb-8 border-border bg-gradient-to-b from-secondary/30 to-card">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
              <Trophy className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">
              Avaliação Concluída
            </CardTitle>
            <CardDescription className="text-lg">
              Você acertou <span className="text-foreground font-bold">{typedAttempt.score}</span> de <span className="text-foreground font-bold">{typedAttempt.total_questions}</span> questões ({percentage}%)
            </CardDescription>
          </CardHeader>
        </Card>

        {!reveal && (
          <div className="mb-8 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 flex items-center gap-3">
            <Lock className="h-5 w-5" />
            <p className="text-sm">O professor configurou esta avaliação para não exibir o gabarito completo após a conclusão.</p>
          </div>
        )}

        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" /> Suas Respostas
        </h3>

        <div className="space-y-4">
          {typedAttempt.answers.map((answer: any, index: number) => {
            // Suporte híbrido para snake_case (novo) e camelCase (velho)
            const isCorrect = answer.is_correct ?? answer.isCorrect
            const userAnswers = answer.user_answers || answer.userAnswers || []
            const correctAnswers = answer.correct_answers || answer.correctAnswers || []

            return (
              <Card key={index} className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                      reveal 
                        ? (isCorrect ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500")
                        : "bg-secondary border-border text-muted-foreground"
                    }`}>
                      {reveal 
                        ? (isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />)
                        : <span className="text-xs font-bold">{index + 1}</span>
                      }
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <p className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Questão {index + 1}</p>
                      
                      <div className="p-3 bg-secondary/30 rounded-md border border-white/5">
                        <span className="text-xs text-muted-foreground block mb-1">Sua resposta:</span>
                        <p className={`font-medium ${reveal ? (isCorrect ? "text-green-400" : "text-red-400") : "text-foreground"}`}>
                          {userAnswers.length > 0 ? userAnswers.join(" / ") : "(Em branco)"}
                        </p>
                      </div>

                      {reveal && !isCorrect && (
                        <div className="p-3 bg-green-500/5 rounded-md border border-green-500/10">
                          <span className="text-xs text-green-500/70 block mb-1">Gabarito:</span>
                          <p className="font-medium text-green-400">
                            {correctAnswers.join(" / ")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-8">
          <Link href="/student">
            <Button className="w-full font-bold h-12 text-lg">Voltar ao Painel</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
