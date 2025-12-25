"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Clock, CheckCircle2, XCircle, Trophy, Sparkles, ArrowRight, RotateCcw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Game, GameQuestion } from "@/lib/types"
import { cn } from "@/lib/utils"
import confetti from "canvas-confetti" // Sugestão: instalar 'canvas-confetti' para efeito visual

interface GamePlayInterfaceProps {
  game: Game
  questions: GameQuestion[]
  studentId: string
}

interface Answer {
  questionId: string
  userAnswers: string[]
  correctAnswers: string[]
  isCorrect: boolean
}

export function GamePlayInterface({ game, questions, studentId }: GamePlayInterfaceProps) {
  const router = useRouter()
  // Estado inicial
  const [timeLeft, setTimeLeft] = useState(game.time_limit)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<Answer[]>([])
  
  // Controle de palavras usadas na questão atual
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set())
  const [shuffledWords, setShuffledWords] = useState<string[]>([])

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex) / questions.length) * 100

  // Regex para identificar lacunas (3 ou mais underlines)
  // Isso evita bugs se o professor digitar "____" em vez de "___"
  const parts = currentQuestion.question_text.split(/_{3,}/g)
  const blanksCount = parts.length - 1
  
  const currentAnswers = answers[currentQuestion.id] || []

  // Inicializa palavras da questão
  useEffect(() => {
    const words = [...(currentQuestion.correct_answers || []), ...(currentQuestion.distractors || [])]
    setShuffledWords(words.sort(() => Math.random() - 0.5))
    // Resetar palavras usadas ao mudar de questão, mas manter respostas se o aluno voltar
    const savedAnswers = answers[currentQuestion.id] || []
    setUsedWords(new Set(savedAnswers))
  }, [currentQuestionIndex, currentQuestion])

  // Timer
  useEffect(() => {
    if (timeLeft <= 0 && !showResults) {
      handleSubmitGame()
      return
    }
    if (showResults) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft, showResults])

  const handleWordClick = (word: string) => {
    const currentQuestionAnswers = answers[currentQuestion.id] || []

    // Lógica de Toggle: Se já usou, remove. Se não, adiciona.
    if (usedWords.has(word)) {
      // Remove a palavra (mesmo que esteja no meio das respostas)
      const newAnswers = currentQuestionAnswers.filter((w) => w !== word)
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: newAnswers }))
      setUsedWords((prev) => {
        const next = new Set(prev)
        next.delete(word)
        return next
      })
    } else {
      // Só adiciona se houver espaço
      if (currentQuestionAnswers.length < blanksCount) {
        // Preenche a primeira lacuna vazia (adiciona ao final do array de respostas)
        setAnswers((prev) => ({
          ...prev,
          [currentQuestion.id]: [...currentQuestionAnswers, word],
        }))
        setUsedWords((prev) => new Set(prev).add(word))
      }
    }
  }

  // Remove uma palavra específica clicando na lacuna preenchida
  const handleGapClick = (index: number) => {
    const currentQuestionAnswers = answers[currentQuestion.id] || []
    if (!currentQuestionAnswers[index]) return

    const wordToRemove = currentQuestionAnswers[index]
    const newAnswers = [...currentQuestionAnswers]
    newAnswers.splice(index, 1) // Remove do array mantendo a ordem dos restantes

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

  const handleSubmitGame = useCallback(async () => {
    if (isSubmitting || showResults) return
    setIsSubmitting(true)

    const timeTaken = game.time_limit - timeLeft
    const calculatedResults: Answer[] = questions.map((q) => {
      const userAnswers = answers[q.id] || []
      const correctAnswers = q.correct_answers || []
      
      // Validação insensível a maiúsculas/minúsculas e espaços
      const isCorrect =
        userAnswers.length === correctAnswers.length &&
        userAnswers.every((ans, idx) => 
          ans.toLowerCase().trim() === correctAnswers[idx]?.toLowerCase().trim()
        )

      return { questionId: q.id, userAnswers, correctAnswers, isCorrect }
    })

    const score = calculatedResults.filter((r) => r.isCorrect).length
    setResults(calculatedResults)
    setShowResults(true)
    
    // Efeito de confete se pontuação for boa (> 50%)
    if (score / questions.length > 0.5) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
    }

    const supabase = createClient()
    await supabase.from("game_attempts").insert({
      game_id: game.id,
      student_id: studentId,
      score,
      total_questions: questions.length,
      time_taken: timeTaken,
      answers: calculatedResults,
      can_retry: true,
    })
    setIsSubmitting(false)
  }, [answers, game, questions, studentId, timeLeft, isSubmitting, showResults])

  if (showResults) {
    const score = results.filter((r) => r.isCorrect).length
    const percentage = Math.round((score / questions.length) * 100)

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F9F0] p-4">
        <Card className="w-full max-w-2xl border-none shadow-2xl overflow-hidden">
          <div className={`h-2 w-full ${percentage >= 70 ? 'bg-green-500' : 'bg-orange-500'}`} />
          <CardHeader className="text-center pt-8 pb-2">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-yellow-100 ring-4 ring-white shadow-lg">
              <Trophy className="h-12 w-12 text-yellow-600" />
            </div>
            <CardTitle className="text-3xl font-black text-gray-800">
              {percentage >= 70 ? "Mandou bem!" : "Bom esforço!"}
            </CardTitle>
            <p className="text-lg text-gray-500 font-medium mt-1">
              Você acertou <span className="text-primary font-bold">{score}</span> de {questions.length}
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3 mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {questions.map((q, idx) => {
                const res = results.find(r => r.questionId === q.id)
                return (
                  <div key={q.id} className="flex items-center gap-3 rounded-xl border p-3 bg-white shadow-sm">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${res?.isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {res?.isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 text-sm font-medium text-gray-700 truncate">
                      Questão {idx + 1}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="grid gap-3">
              <Button onClick={() => window.location.reload()} variant="outline" size="lg" className="w-full font-bold border-2">
                <RotateCcw className="mr-2 h-4 w-4" /> Tentar Novamente
              </Button>
              <Button onClick={() => router.push("/student")} size="lg" className="w-full font-bold shadow-md hover:shadow-lg transition-all">
                Voltar ao Menu
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F9F0] flex flex-col">
      {/* Barra Superior */}
      <div className="bg-white border-b sticky top-0 z-10 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-mono font-bold text-sm ${timeLeft < 10 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-700'}`}>
              <Clock className="h-4 w-4" />
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </div>
          </div>
          <div className="flex-1 mx-4 max-w-xs hidden sm:block">
            <div className="flex justify-between text-xs text-gray-500 mb-1 font-semibold">
              <span>Progresso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2.5" />
          </div>
          <div className="text-sm font-bold text-primary">
            {currentQuestionIndex + 1} <span className="text-gray-400">/ {questions.length}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">
        
        {/* Área da Pergunta (Frase) */}
        <Card className="border-none shadow-md overflow-hidden ring-1 ring-black/5 bg-white">
          <div className="h-2 w-full bg-primary/20">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((answers[currentQuestion.id]?.length || 0) / blanksCount) * 100}%` }} />
          </div>
          <CardContent className="p-6 sm:p-10">
            <h2 className="text-2xl sm:text-3xl leading-relaxed font-medium text-gray-800 text-center font-serif">
              {parts.map((part, index) => (
                <span key={index}>
                  {part}
                  {index < blanksCount && (
                    <button
                      onClick={() => handleGapClick(index)}
                      className={cn(
                        "inline-flex items-center justify-center min-w-[80px] h-[1.8em] mx-1.5 px-3 align-middle rounded-lg border-2 border-b-4 text-base font-bold transition-all transform active:scale-95",
                        currentAnswers[index]
                          ? "bg-primary/10 border-primary text-primary hover:bg-red-50 hover:border-red-200 hover:text-red-500" 
                          : "bg-gray-50 border-gray-200 border-dashed text-transparent animate-pulse"
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
          <p className="text-center text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">
            Escolha a palavra correta
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {shuffledWords.map((word, idx) => {
              const isUsed = usedWords.has(word)
              return (
                <button
                  key={`${word}-${idx}`}
                  onClick={() => handleWordClick(word)}
                  disabled={isUsed && !currentAnswers.includes(word)}
                  className={cn(
                    "px-6 py-3 rounded-xl font-bold text-lg shadow-sm border-2 border-b-4 transition-all duration-200 active:scale-95 hover:-translate-y-0.5",
                    isUsed 
                      ? "bg-gray-100 text-gray-300 border-gray-200 cursor-default shadow-none translate-y-1 border-b-2" 
                      : "bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary"
                  )}
                >
                  {word}
                </button>
              )
            })}
          </div>
        </div>

        {/* Botão Próximo */}
        <div className="mt-auto pt-6">
          <Button 
            onClick={handleNext} 
            size="lg" 
            className="w-full h-14 text-xl font-black shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all rounded-2xl"
            disabled={currentAnswers.length < blanksCount} // Obriga a preencher tudo para avançar? Opcional.
          >
            {currentQuestionIndex === questions.length - 1 ? (
              isSubmitting ? "Finalizando..." : "Concluir Jogo"
            ) : (
              <>Próxima <ArrowRight className="ml-2" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
