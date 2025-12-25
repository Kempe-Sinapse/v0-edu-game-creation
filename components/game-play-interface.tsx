"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Clock, Check, X, Trophy } from "lucide-react"
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
  userAnswers: string[] // Array de respostas do usuário
  correctAnswers: string[] // Array de respostas corretas
  isCorrect: boolean
}

export function GamePlayInterface({ game, questions, studentId }: GamePlayInterfaceProps) {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState(game.time_limit)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<Answer[]>([])
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set())

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  const blanksCount = (currentQuestion.question_text.match(/___/g) || []).length
  const currentAnswers = answers[currentQuestion.id] || []

  const currentQuestionWords = [...(currentQuestion.correct_answers || []), ...(currentQuestion.distractors || [])]

  const [shuffledWords, setShuffledWords] = useState<string[]>([])

  useEffect(() => {
    // Embaralha as palavras sempre que a pergunta atual mudar
    setShuffledWords([...currentQuestionWords].sort(() => Math.random() - 0.5))
  }, [currentQuestionIndex])

  // Timer
  useEffect(() => {
    if (timeLeft <= 0 || showResults) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmitGame()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, showResults])

  useEffect(() => {
    setUsedWords(new Set(currentAnswers))
  }, [currentQuestionIndex])

  const handleWordClick = (word: string) => {
    const currentQuestionAnswers = answers[currentQuestion.id] || []

    // Se a palavra já foi usada nesta pergunta, remove
    if (currentQuestionAnswers.includes(word)) {
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: currentQuestionAnswers.filter((w) => w !== word),
      }))
      setUsedWords((prev) => {
        const updated = new Set(prev)
        updated.delete(word)
        return updated
      })
    } else if (currentQuestionAnswers.length < blanksCount) {
      // Adiciona palavra na próxima lacuna disponível
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: [...currentQuestionAnswers, word],
      }))
      setUsedWords((prev) => new Set(prev).add(word))
    }
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
    }
  }

  const handleSubmitGame = useCallback(async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    const timeTaken = game.time_limit - timeLeft

    const calculatedResults: Answer[] = questions.map((q) => {
      const userAnswers = answers[q.id] || []
      const correctAnswers = q.correct_answers || []

      // Verifica se todas as respostas estão corretas (ordem e conteúdo)
      const isCorrect =
        userAnswers.length === correctAnswers.length &&
        userAnswers.every((ans, idx) => ans.toLowerCase().trim() === correctAnswers[idx]?.toLowerCase().trim())

      return {
        questionId: q.id,
        userAnswers,
        correctAnswers,
        isCorrect,
      }
    })

    const score = calculatedResults.filter((r) => r.isCorrect).length

    setResults(calculatedResults)
    setShowResults(true)

    // Save to database
    const supabase = createClient()
    try {
      await supabase.from("game_attempts").insert({
        game_id: game.id,
        student_id: studentId,
        score,
        total_questions: questions.length,
        time_taken: timeTaken,
        answers: calculatedResults,
        can_retry: true, // Alterado para true para permitir sempre novas tentativas
      })
      console.log("[v0] Tentativa de jogo salva com sucesso")
    } catch (error) {
      console.error("[v0] Erro ao salvar tentativa de jogo:", error)
    }
  }, [answers, game, questions, studentId, timeLeft, isSubmitting])

  if (showResults) {
    const score = results.filter((r) => r.isCorrect).length
    const percentage = Math.round((score / questions.length) * 100)

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-6">
        <Card className="w-full max-w-3xl border-4 border-emerald-600 shadow-2xl">
          <CardHeader className="text-center bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-t-lg">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-yellow-400 shadow-lg">
              <Trophy className="h-14 w-14 text-yellow-900" />
            </div>
            <CardTitle className="text-4xl font-black">Jogo Concluído!</CardTitle>
            <CardDescription className="text-xl text-emerald-50 font-semibold">
              Você acertou {score} de {questions.length} perguntas ({percentage}%)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-6">
              <h3 className="mb-4 text-xl font-bold text-emerald-900">Suas Respostas:</h3>
              <div className="space-y-4">
                {questions.map((question, index) => {
                  const result = results.find((r) => r.questionId === question.id)
                  const isCorrect = result?.isCorrect

                  return (
                    <div
                      key={question.id}
                      className={cn(
                        "rounded-lg border-2 p-4 shadow-md",
                        isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50",
                      )}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <p className="flex-1 text-base font-semibold text-gray-900">
                          {index + 1}. {question.question_text}
                        </p>
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full",
                            isCorrect ? "bg-green-600" : "bg-red-600",
                          )}
                        >
                          {isCorrect ? <Check className="h-5 w-5 text-white" /> : <X className="h-5 w-5 text-white" />}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div
                          className={cn(
                            "rounded-md p-3 font-semibold",
                            isCorrect ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900",
                          )}
                        >
                          <span className="font-bold">Sua resposta: </span>
                          {result?.userAnswers && result.userAnswers.length > 0
                            ? result.userAnswers.join(", ")
                            : "(Sem resposta)"}
                        </div>
                        {!isCorrect && result?.correctAnswers && (
                          <div className="rounded-md bg-green-100 p-3 text-green-900 font-semibold">
                            <span className="font-bold">Resposta correta: </span>
                            {result.correctAnswers.join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => router.push("/student")}
                variant="outline"
                className="flex-1 h-14 text-lg font-bold border-2 border-gray-900 hover:bg-gray-100"
              >
                Voltar ao Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header com Timer */}
        <div className="mb-8 flex items-center justify-between rounded-2xl bg-white border-4 border-emerald-600 p-6 shadow-xl">
          <div>
            <h1 className="text-3xl font-black text-emerald-900">{game.title}</h1>
            <p className="text-lg font-semibold text-emerald-700">
              Pergunta {currentQuestionIndex + 1} de {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-3 shadow-lg">
            <Clock className={cn("h-7 w-7", timeLeft <= 10 ? "text-red-300 animate-pulse" : "text-white")} />
            <span className={cn("text-2xl font-black", timeLeft <= 10 ? "text-red-100" : "text-white")}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </span>
          </div>
        </div>

        <Progress value={progress} className="mb-8 h-4 border-2 border-emerald-600" />

        {/* Pergunta */}
        <Card className="mb-8 border-4 border-emerald-600 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-black">Complete a frase</CardTitle>
            <CardDescription className="text-emerald-50 text-base font-semibold">
              Clique nas palavras do banco para preencher as lacunas ({currentAnswers.length}/{blanksCount} preenchidas)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-8">
              <p className="text-balance text-xl leading-relaxed font-medium text-gray-900">
                {currentQuestion.question_text.split("___").map((part, index) => (
                  <span key={index}>
                    {part}
                    {index < blanksCount && (
                      <span
                        className={cn(
                          "mx-2 inline-block min-w-40 rounded-lg border-4 px-6 py-3 text-center font-bold shadow-md",
                          currentAnswers[index]
                            ? "border-emerald-600 bg-emerald-100 text-emerald-900"
                            : "border-gray-400 border-dashed bg-white text-gray-400",
                        )}
                      >
                        {currentAnswers[index] || `Lacuna ${index + 1}`}
                      </span>
                    )}
                  </span>
                ))}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Banco de Palavras */}
        <Card className="mb-8 border-4 border-emerald-600 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-black">Banco de Palavras</CardTitle>
            <CardDescription className="text-emerald-50 text-base font-semibold">
              Clique em uma palavra para selecioná-la como resposta (específico para esta pergunta)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-wrap gap-4">
              {shuffledWords.map((word, index) => {
                const isUsed = usedWords.has(word)
                const isCurrentAnswer = currentAnswers.includes(word)

                return (
                  <Button
                    key={`${word}-${index}`}
                    type="button"
                    variant={isCurrentAnswer ? "default" : "outline"}
                    className={cn(
                      "transition-all text-lg font-bold px-6 py-6 rounded-lg border-2 shadow-md",
                      isCurrentAnswer && "bg-emerald-600 text-white border-emerald-700 scale-105",
                      isUsed && !isCurrentAnswer && "opacity-30 cursor-not-allowed",
                      !isUsed && "bg-white border-gray-900 hover:scale-110 hover:bg-emerald-50",
                    )}
                    onClick={() => handleWordClick(word)}
                    disabled={isUsed && !isCurrentAnswer}
                  >
                    {word}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Navegação */}
        <div className="flex gap-4">
          <Button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            variant="outline"
            className="h-16 text-lg font-bold border-4 border-gray-900 hover:bg-gray-100 disabled:opacity-30 bg-transparent"
          >
            ← Anterior
          </Button>
          {currentQuestionIndex === questions.length - 1 ? (
            <Button
              onClick={handleSubmitGame}
              disabled={isSubmitting}
              className="flex-1 h-16 text-xl font-black bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg"
            >
              {isSubmitting ? "Enviando..." : "Finalizar Jogo"}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="flex-1 h-16 text-xl font-black bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg"
            >
              Próxima →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
