"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Clock, CheckCircle2, XCircle, Trophy, ArrowRight, RotateCcw, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Game, GameQuestion } from "@/lib/types"
import { cn } from "@/lib/utils"

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
  
  // -- ESTADOS --
  const [timeLeft, setTimeLeft] = useState(game?.time_limit || 60)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<Answer[]>([])
  
  // Controle de palavras
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set())
  const [shuffledWords, setShuffledWords] = useState<string[]>([])

  // -- VALIDADORES DE SEGURANÇA (Para evitar tela branca) --
  const hasQuestions = questions && questions.length > 0
  const currentQuestion = hasQuestions ? questions[currentQuestionIndex] : null

  // -- EFEITOS --

  // 1. Inicializa palavras e Timer quando a pergunta muda
  useEffect(() => {
    if (!currentQuestion) return

    // Misturar palavras (Respostas corretas + Distratores)
    const words = [
      ...(currentQuestion.correct_answers || []), 
      ...(currentQuestion.distractors || [])
    ]
    setShuffledWords(words.sort(() => Math.random() - 0.5))
    
    // Resetar palavras usadas
    const savedAnswers = answers[currentQuestion.id] || []
    setUsedWords(new Set(savedAnswers))

    // REINICIAR O TIMER (Requisito 3)
    setTimeLeft(game.time_limit)
  }, [currentQuestionIndex, currentQuestion, game.time_limit]) // Dependências corrigidas

  // 2. Lógica do Timer
  useEffect(() => {
    if (showResults || isSubmitting) return

    if (timeLeft <= 0) {
      handleNext() // Tempo acabou -> Próxima
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, showResults, isSubmitting])

  // -- HANDLERS --

  // Se não houver questão carregada, não renderiza lógica
  if (!currentQuestion) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F7F9F0]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-2 text-gray-600">Carregando jogo...</span>
      </div>
    )
  }

  // Identificar lacunas com segurança
  const parts = currentQuestion.question_text ? currentQuestion.question_text.split(/_{3,}/g) : []
  const blanksCount = parts.length - 1
  const currentAnswers = answers[currentQuestion.id] || []

  const handleWordClick = (word: string) => {
    const currentQuestionAnswers = answers[currentQuestion.id] || []

    if (usedWords.has(word)) {
      // Remove a palavra
      const newAnswers = currentQuestionAnswers.filter((w) => w !== word)
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: newAnswers }))
      setUsedWords((prev) => {
        const next = new Set(prev)
        next.delete(word)
        return next
      })
    } else {
      // Adiciona se houver espaço
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

    // Calcular resultados
    const calculatedResults: Answer[] = questions.map((q) => {
      const userAnswers = answers[q.id] || []
      const correctAnswers = q.correct_answers || []
      
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
    
    // Salvar no Supabase
    const supabase = createClient()
    await supabase.from("game_attempts").insert({
      game_id: game.id,
      student_id: studentId,
      score,
      total_questions: questions.length,
      time_taken: 0, // Simplificado
      answers: calculatedResults,
      can_retry: true,
    })
    setIsSubmitting(false)
  }

  // -- RENDERIZAÇÃO: TELA DE RESULTADOS --
  if (showResults) {
    const score = results.filter((r) => r.isCorrect).length
    const percentage = Math.round((score / questions.length) * 100)

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F9F0] p-4">
        <Card className="w-full max-w-2xl border-none shadow-2xl overflow-hidden bg-white">
          <div className={`h-3 w-full ${percentage >= 70 ? 'bg-green-500' : 'bg-orange-500'}`} />
          <CardHeader className="text-center pt-10 pb-2">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-yellow-50 ring-8 ring-yellow-100/50 shadow-sm">
              <Trophy className="h-12 w-12 text-yellow-600" />
            </div>
            <CardTitle className="text-4xl font-black text-gray-800 mb-2">
              {percentage >= 70 ? "Parabéns!" : "Bom esforço!"}
            </CardTitle>
            <CardDescription className="text-xl font-medium text-gray-600">
              Você acertou <span className={percentage >= 70 ? "text-green-600 font-bold" : "text-orange-600 font-bold"}>
                {score}
              </span> de <span className="text-gray-900 font-bold">{questions.length}</span> questões
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8">
            <div className="space-y-4 mb-8 max-h-[50vh] overflow-y-auto pr-2">
              {questions.map((q, idx) => {
                const res = results.find(r => r.questionId === q.id)
                const isCorrect = res?.isCorrect

                return (
                  <div key={q.id} className="group flex items-center gap-4 rounded-2xl border-2 border-gray-100 p-4 bg-white hover:border-gray-200 transition-colors">
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2",
                      isCorrect 
                        ? "bg-green-50 border-green-200 text-green-600" 
                        : "bg-red-50 border-red-200 text-red-600"
                    )}>
                      {isCorrect ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                        Questão {idx + 1}
                      </p>
                      <p className="text-base font-semibold text-gray-700 line-clamp-1">
                        {q.question_text.replace(/_{3,}/g, "___")}
                      </p>
                    </div>
                    {!isCorrect && (
                       <div className="hidden sm:block text-xs font-semibold text-red-500 bg-red-50 px-3 py-1 rounded-full">
                         Errou
                       </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            <div className="grid gap-4">
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                size="lg" 
                className="w-full h-12 font-bold border-2 text-gray-700 hover:bg-gray-50 rounded-xl"
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Tentar Novamente
              </Button>
              <Button 
                onClick={() => router.push("/student")} 
                size="lg" 
                className="w-full h-12 font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all rounded-xl bg-green-600 hover:bg-green-700 text-white"
              >
                Voltar ao Menu
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Cores do Timer
  const timerColor = timeLeft <= 10 
    ? "text-red-600 bg-red-100 border-red-200 animate-pulse" 
    : timeLeft <= 30 
      ? "text-orange-600 bg-orange-100 border-orange-200" 
      : "text-green-700 bg-green-100 border-green-200"

  const progressColor = timeLeft <= 10 
    ? "bg-red-500" 
    : timeLeft <= 30 
      ? "bg-orange-500" 
      : "bg-green-500"

  // -- RENDERIZAÇÃO: JOGO --
  return (
    <div className="min-h-screen bg-[#F7F9F0] flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 px-4 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg border-2 transition-colors duration-300",
              timerColor
            )}>
              <Clock className="h-5 w-5" />
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </div>

            <div className="text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
              Questão <span className="text-gray-900 text-base">{currentQuestionIndex + 1}</span> <span className="text-gray-400">/ {questions.length}</span>
            </div>
          </div>

          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
             <div 
               className={cn("h-full transition-all duration-1000 ease-linear", progressColor)}
               style={{ width: `${(timeLeft / game.time_limit) * 100}%` }}
             />
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">
        {/* Frase */}
        <Card className="border-none shadow-md ring-1 ring-black/5 bg-white overflow-hidden rounded-2xl">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 p-4 text-center">
             <span className="text-green-800 font-semibold text-sm uppercase tracking-wider">Preencha as lacunas</span>
          </div>
          <CardContent className="p-6 sm:p-10">
            <h2 className="text-2xl sm:text-3xl leading-loose font-medium text-gray-800 text-center">
              {parts.map((part, index) => (
                <span key={index}>
                  {part}
                  {index < blanksCount && (
                    <button
                      onClick={() => handleGapClick(index)}
                      className={cn(
                        "inline-flex items-center justify-center min-w-[100px] h-[2em] mx-1.5 px-4 align-middle rounded-xl border-2 border-b-4 text-lg font-bold transition-all transform active:scale-95 mb-2",
                        currentAnswers[index]
                          ? "bg-white border-green-500 text-green-700 shadow-sm hover:border-red-400 hover:text-red-500 group relative" 
                          : "bg-gray-50 border-gray-300 border-dashed text-transparent animate-pulse"
                      )}
                    >
                      {currentAnswers[index] ? (
                        <span className="flex items-center gap-1">
                           {currentAnswers[index]}
                        </span>
                      ) : "?"}
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
                    "px-5 py-3 rounded-xl font-bold text-lg shadow-sm border-2 border-b-4 transition-all duration-200",
                    isUsed 
                      ? "bg-gray-100 text-gray-300 border-gray-200 cursor-default shadow-none translate-y-1 border-b-2" 
                      : "bg-white text-gray-700 border-gray-200 hover:border-green-500 hover:text-green-700 hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2"
                  )}
                >
                  {word}
                </button>
              )
            })}
          </div>
        </div>

        {/* Rodapé Navegação */}
        <div className="mt-auto pt-6 flex gap-4">
          <Button 
            onClick={handleNext} 
            size="lg" 
            className="w-full h-14 text-xl font-black shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all rounded-2xl bg-green-600 hover:bg-green-700 text-white"
          >
            {currentQuestionIndex === questions.length - 1 ? (
              isSubmitting ? "Finalizando..." : "Concluir Jogo"
            ) : (
              <>Próxima <ArrowRight className="ml-2 h-6 w-6" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
