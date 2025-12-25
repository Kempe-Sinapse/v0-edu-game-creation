"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Clock, CheckCircle2, XCircle, Trophy, ArrowRight, RotateCcw, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Game, GameQuestion } from "@/lib/types"
import { cn } from "@/lib/utils"
import confetti from "canvas-confetti"

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
  // Progresso visual da barra superior (baseado na pergunta atual)
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  // Regex para identificar lacunas (3 ou mais underlines)
  const parts = currentQuestion.question_text.split(/_{3,}/g)
  const blanksCount = parts.length - 1
  
  const currentAnswers = answers[currentQuestion.id] || []

  // -- EFEITOS --

  // 1. Inicializa/Reinicia palavras e Timer quando a pergunta muda
  useEffect(() => {
    // Misturar palavras
    const words = [...(currentQuestion.correct_answers || []), ...(currentQuestion.distractors || [])]
    setShuffledWords(words.sort(() => Math.random() - 0.5))
    
    // Resetar palavras usadas (baseado se o aluno já respondeu antes e voltou)
    const savedAnswers = answers[currentQuestion.id] || []
    setUsedWords(new Set(savedAnswers))

    // REINICIAR O TIMER PARA A NOVA PERGUNTA (Requisito 3)
    setTimeLeft(game.time_limit)
  }, [currentQuestionIndex, currentQuestion, game.time_limit]) // Dependência importante: currentQuestionIndex

  // 2. Lógica do Timer (Requisito 2)
  useEffect(() => {
    if (showResults || isSubmitting) return

    if (timeLeft <= 0) {
      // Tempo acabou: Avançar ou Finalizar
      handleNext()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, showResults, isSubmitting]) // Removemos handleNext das dependências para evitar loop, a lógica está no `if (timeLeft <= 0)`

  // -- HANDLERS --

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
      // Adiciona a palavra se houver espaço
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

  // Avança para a próxima pergunta ou finaliza se for a última
  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    } else {
      handleSubmitGame()
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
    }
  }

  const handleSubmitGame = useCallback(async () => {
    if (isSubmitting || showResults) return
    setIsSubmitting(true)

    // Nota: O tempo gasto total aqui é aproximado, pois agora o tempo é por pergunta.
    // Se quiser o tempo total gasto, precisaria somar o tempo gasto em cada pergunta individualmente.
    // Por simplificação, vamos assumir que completou o jogo.
    const totalTimeLimit = game.time_limit * questions.length
    const estimatedTimeTaken = totalTimeLimit // Placeholder, pois a lógica mudou para "tempo por pergunta"

    const calculatedResults: Answer[] = questions.map((q) => {
      const userAnswers = answers[q.id] || []
      const correctAnswers = q.correct_answers || []
      
      // Validação: Se não respondeu tudo, conta como errado (Requisito 2)
      // Validação insensível a maiúsculas/minúsculas
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
    
    if (score / questions.length > 0.5) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
    }

    const supabase = createClient()
    await supabase.from("game_attempts").insert({
      game_id: game.id,
      student_id: studentId,
      score,
      total_questions: questions.length,
      time_taken: 0, // Como o tempo é por pergunta, salvar 0 ou fazer uma lógica de soma se desejar
      answers: calculatedResults,
      can_retry: true,
    })
    setIsSubmitting(false)
  }, [answers, game, questions, studentId, isSubmitting, showResults])

  // -- RENDERIZAÇÃO: TELA DE RESULTADOS --
  if (showResults) {
    const score = results.filter((r) => r.isCorrect).length
    const percentage = Math.round((score / questions.length) * 100)

    // Requisito 1: Texto claro de acertos/erros
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
            <div className="
