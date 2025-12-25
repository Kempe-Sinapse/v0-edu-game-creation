"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, CheckCircle2, XCircle, Trophy, ArrowRight, RotateCcw, Loader2, X, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Game, GameQuestion } from "@/lib/types"
import { cn } from "@/lib/utils"

interface GamePlayInterfaceProps {
  game: Game
  questions: GameQuestion[]
  studentId: string
}

interface Answer {
  question_id: string
  user_answers: string[]
  correct_answers: string[]
  is_correct: boolean
}

export function GamePlayInterface({ game, questions, studentId }: GamePlayInterfaceProps) {
  const router = useRouter()
  
  // -- ESTADOS --
  const [timeLeft, setTimeLeft] = useState(game?.time_limit || 60)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<Answer[]>([])
  
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set())
  const [shuffledWords, setShuffledWords] = useState<string[]>([])

  const hasQuestions = questions && questions.length > 0
  const currentQuestion = hasQuestions ? questions[currentQuestionIndex] : null

  // -- EFEITOS --
  
  // 1. Inicializa palavras e Timer quando a pergunta muda
  useEffect(() => {
    if (!currentQuestion) return

    const words = [
      ...(currentQuestion.correct_answers || []), 
      ...(currentQuestion.distractors || [])
    ]
    setShuffledWords(words.sort(() => Math.random() - 0.5))
    
    const savedAnswers = answers[currentQuestion.id] || []
    setUsedWords(new Set(savedAnswers))

    setTimeLeft(game.time_limit)
  }, [currentQuestionIndex, currentQuestion, game.time_limit]) // answers removido de deps para evitar loop

  // 2. Lógica do Timer
  useEffect(() => {
    if (showResults || isSubmitting) return

    if (timeLeft <= 0) {
      if (currentQuestionIndex < questions.length - 1) {
        handleNext()
      } else {
        handleSubmitGame()
      }
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, showResults, isSubmitting, currentQuestionIndex, questions.length])

  // -- HANDLERS --

  if (!currentQuestion) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  const parts = currentQuestion.question_text ? currentQuestion.question_text.split(/_{3,}/g) : []
  const blanksCount = parts.length - 1
  const currentAnswers = answers[currentQuestion.id] || []

  const handleWordClick = (word: string) => {
    const currentQuestionAnswers = answers[currentQuestion.id] || []

    if (usedWords.has(word)) {
      const newAnswers = currentQuestionAnswers.filter((w) => w !== word)
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: newAnswers }))
      setUsedWords((prev) => {
        const next = new Set(prev)
        next.delete(word)
        return next
      })
    } else {
      if (currentQuestionAnswers.length < blanksCount) {
        setAnswers((prev) => ({
          ...prev,
          [currentQuestion.id]: [...currentQuestionAnswers, word],
        }))
        setUsedWords((prev) => new Set(prev).add(word))
      }
    }
  }

  const handleGapClick = (index: number) => {
    const currentQuestionAnswers = answers[currentQuestion.id] || []
    if (!currentQuestionAnswers[index]) return

    const wordToRemove = currentQuestionAnswers[index]
    const newAnswers = [...currentQuestionAnswers]
    newAnswers.splice(index, 1)

    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: newAnswers }))
    setUsedWords((prev) => {
      const next = new Set(prev)
      next.delete(wordToRemove)
      return next
    })
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    } else {
      handleSubmitGame()
    }
  }

  const handleSubmitGame = async () => {
    if (isSubmitting || showResults) return
    setIsSubmitting(true)

    const calculatedResults: Answer[] = questions.map((q) => {
      const userAnswers = answers[q.id] || []
      const correctAnswers = q.correct_answers || []
      
      const isCorrect =
        userAnswers.length === correctAnswers.length &&
        userAnswers.every((ans, idx) => 
          ans.toLowerCase().trim() === correctAnswers[idx]?.toLowerCase().trim()
        )

      return { 
        question_id: q.id, 
        user_answers: userAnswers, 
        correct_answers: correctAnswers, 
        is_correct: isCorrect 
      }
    })

    const score = calculatedResults.filter((r) => r.is_correct).length
    
    setResults(calculatedResults)
    setShowResults(true)
    
    const supabase = createClient()
    await supabase.from("game_attempts").insert({
      game_id: game.id,
      student_id: studentId,
      score,
      total_questions: questions.length,
      time_taken: 0, 
      answers: calculatedResults,
      can_retry: false,
    })
    setIsSubmitting(false)
  }

  // TELA DE RESULTADOS (MODERNA - DARK)
  if (showResults) {
    const score = results.filter((r) => r.is_correct).length
    const percentage = Math.round((score / questions.length) * 100)

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-3xl border border-border shadow-2xl bg-card">
          <CardHeader className="text-center pt-10 border-b border-border bg-secondary/30">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
              <Trophy className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight mb-2 text-foreground">
              Avaliação Concluída
            </CardTitle>
            <CardDescription className="text-lg">
              Resultado final: <span className="font-bold text-foreground">{score}</span> de <span className="font-bold text-foreground">{questions.length}</span> acertos ({percentage}%)
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8">
            <div className="space-y-3 mb-8 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {questions.map((q, idx) => {
                const res = results.find(r => r.question_id === q.id)
                const isCorrect = res?.is_correct

                return (
                  <div key={q.id} className="group flex flex-col gap-2 rounded-lg border border-border p-4 bg-background hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                        isCorrect 
                          ? "bg-green-500/10 border-green-500/20 text-green-600" 
                          : "bg-red-500/10 border-red-500/20 text-red-600"
                      )}>
                        {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                          Questão {idx + 1}
                        </span>
                        <p className="text-sm font-medium mt-1 text-foreground">
                          {q.question_text.replace(/_{3,}/g, "___")}
                        </p>
                      </div>
                    </div>
                    
                    <div className="ml-12 text-sm space-y-1 mt-1">
                        <div className="flex gap-2">
                            <span className="text-muted-foreground">Sua resposta:</span>
                            <span className={cn("font-medium", isCorrect ? "text-green-500" : "text-red-500")}>
                                {res?.user_answers && res.user_answers.length > 0 
                                    ? res.user_answers.join(" / ") 
                                    : "(Em branco)"}
                            </span>
                        </div>
                        {!isCorrect && (
                            <div className="flex gap-2">
                                <span className="text-muted-foreground">Correto:</span>
                                <span className="font-medium text-foreground">
                                    {res?.correct_answers ? res.correct_answers.join(" / ") : ""}
                                </span>
                            </div>
                        )}
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="flex justify-center">
              <Button 
                onClick={() => router.push("/student")} 
                size="lg" 
                className="w-full sm:w-auto min-w-[200px] font-bold"
              >
                Voltar ao Painel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // TIMER COLORS (DARK THEME)
  const timerColor = timeLeft <= 10 
    ? "text-red-500 border-red-500/30 bg-red-500/10 animate-pulse" 
    : "text-foreground border-border bg-secondary/30"

  const progressColor = timeLeft <= 10 
    ? "bg-red-500" 
    : timeLeft <= 30 
      ? "bg-orange-500" 
      : "bg-primary"

  // -- RENDERIZAÇÃO: JOGO --
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10 px-6 py-4">
        <div className="max-w-5xl mx-auto w-full flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md font-mono font-bold text-lg border transition-colors duration-300",
              timerColor
            )}>
              <Clock className="h-5 w-5" />
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </div>

            <div className="text-sm font-medium text-muted-foreground">
              Questão <span className="text-foreground font-bold">{currentQuestionIndex + 1}</span> de {questions.length}
            </div>
          </div>
          
          <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
             <div 
               className={cn("h-full transition-all duration-1000 ease-linear", progressColor)}
               style={{ width: `${(timeLeft / game.time_limit) * 100}%` }}
             />
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 max-w-5xl mx-auto w-full flex flex-col gap-8">
        {/* Frase */}
        <Card className="border border-border shadow-sm bg-card">
          <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Complete a lacuna</CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <h2 className="text-2xl md:text-3xl leading-relaxed font-medium text-center">
              {parts.map((part, index) => (
                <span key={index}>
                  {part}
                  {index < blanksCount && (
                    <button
                      onClick={() => handleGapClick(index)}
                      className={cn(
                        "inline-flex items-center justify-center min-w-[120px] h-[2.2em] mx-2 px-4 align-middle rounded-md border-b-2 text-xl font-bold transition-all",
                        currentAnswers[index]
                          ? "bg-primary/10 border-primary text-primary hover:bg-destructive/10 hover:border-destructive hover:text-destructive" 
                          : "bg-secondary border-border border-dashed text-transparent"
                      )}
                    >
                      {currentAnswers[index] || "?"}
                    </button>
                  )}
                </span>
              ))}
            </h2>
          </CardContent>
        </Card>

        {/* Banco de Palavras */}
        <div className="flex-1">
          <div className="flex flex-wrap justify-center gap-3">
            {shuffledWords.map((word, idx) => {
              const isUsed = usedWords.has(word)
              return (
                <button
                  key={`${word}-${idx}`}
                  onClick={() => handleWordClick(word)}
                  disabled={isUsed && !currentAnswers.includes(word)}
                  className={cn(
                    "px-6 py-3 rounded-md font-medium text-lg border transition-all duration-200",
                    isUsed 
                      ? "bg-secondary text-muted-foreground border-transparent cursor-default opacity-50" 
                      : "bg-card text-foreground border-border hover:border-primary hover:text-primary hover:bg-primary/5 shadow-sm"
                  )}
                >
                  {word}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-auto pt-6 flex justify-end">
          <Button 
            onClick={handleNext} 
            size="lg" 
            className="w-full sm:w-auto px-8 font-bold text-lg"
          >
            {currentQuestionIndex === questions.length - 1 ? (
              isSubmitting ? "Finalizando..." : "Concluir"
            ) : (
              <>Próxima <ArrowRight className="ml-2 h-5 w-5" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
