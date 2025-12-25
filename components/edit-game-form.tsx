"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, X, ArrowLeft, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import type { Game, GameQuestion } from "@/lib/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Question {
  id?: string
  text: string
  correctAnswers: string[]
  distractors: string[]
}

export function EditGameForm({
  game,
  questions: initialQuestions,
}: {
  game: Game
  questions: GameQuestion[]
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(game.title)
  const [description, setDescription] = useState(game.description || "")
  const [timeLimit, setTimeLimit] = useState(game.time_limit.toString())

  const [questions, setQuestions] = useState<Question[]>(
    initialQuestions.map((q) => ({
      id: q.id,
      text: q.question_text,
      correctAnswers: Array.isArray(q.correct_answers) ? q.correct_answers : [],
      distractors: Array.isArray(q.distractors) ? q.distractors : [],
    })),
  )

  const addQuestion = () => {
    setQuestions([...questions, { text: "", correctAnswers: [""], distractors: [] }])
  }

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index))
    }
  }

  const updateQuestionText = (index: number, value: string) => {
    const updated = [...questions]
    updated[index].text = value

    const blankCount = (value.match(/___/g) || []).length
    const currentAnswers = updated[index].correctAnswers

    if (blankCount > currentAnswers.length) {
      // Add empty answers for new blanks
      updated[index].correctAnswers = [...currentAnswers, ...Array(blankCount - currentAnswers.length).fill("")]
    } else if (blankCount < currentAnswers.length) {
      // Remove extra answers
      updated[index].correctAnswers = currentAnswers.slice(0, blankCount)
    }

    setQuestions(updated)
  }

  const updateCorrectAnswer = (questionIndex: number, answerIndex: number, value: string) => {
    const updated = [...questions]
    updated[questionIndex].correctAnswers[answerIndex] = value
    setQuestions(updated)
  }

  const addDistractor = (questionIndex: number) => {
    const updated = [...questions]
    updated[questionIndex].distractors.push("")
    setQuestions(updated)
  }

  const removeDistractor = (questionIndex: number, distractorIndex: number) => {
    const updated = [...questions]
    updated[questionIndex].distractors = updated[questionIndex].distractors.filter((_, i) => i !== distractorIndex)
    setQuestions(updated)
  }

  const updateDistractor = (questionIndex: number, distractorIndex: number, value: string) => {
    const updated = [...questions]
    updated[questionIndex].distractors[distractorIndex] = value
    setQuestions(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!title.trim()) {
      setError("Por favor, insira um título para a tarefa")
      setIsLoading(false)
      return
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) {
        setError(`Pergunta ${i + 1}: O texto não pode estar vazio`)
        setIsLoading(false)
        return
      }

      const blankCount = (q.text.match(/___/g) || []).length
      if (blankCount === 0) {
        setError(`Pergunta ${i + 1}: Use ___ para indicar onde a resposta deve ser inserida`)
        setIsLoading(false)
        return
      }

      if (blankCount > 5) {
        setError(`Pergunta ${i + 1}: Máximo de 5 lacunas por pergunta`)
        setIsLoading(false)
        return
      }

      if (q.correctAnswers.some((a) => !a.trim())) {
        setError(`Pergunta ${i + 1}: Todas as respostas corretas devem ser preenchidas`)
        setIsLoading(false)
        return
      }

      if (q.correctAnswers.length !== blankCount) {
        setError(
          `Pergunta ${i + 1}: Número de respostas (${q.correctAnswers.length}) não corresponde ao número de lacunas (${blankCount})`,
        )
        setIsLoading(false)
        return
      }
    }

    const supabase = createClient()

    try {
      // Update game
      const { error: gameError } = await supabase
        .from("games")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          time_limit: Number.parseInt(timeLimit),
        })
        .eq("id", game.id)

      if (gameError) throw gameError

      await supabase.from("game_questions").delete().eq("game_id", game.id)

      const questionsData = questions.map((q, index) => ({
        game_id: game.id,
        question_text: q.text.trim(),
        correct_answers: q.correctAnswers.map((a) => a.trim()),
        distractors: q.distractors.filter((d) => d.trim()).map((d) => d.trim()),
        position: index,
      }))

      const { error: questionsError } = await supabase.from("game_questions").insert(questionsData)

      if (questionsError) throw questionsError

      router.push("/teacher")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar a tarefa")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.from("games").delete().eq("id", game.id)

      if (error) throw error

      router.push("/teacher")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir a tarefa")
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      <header className="border-b-4 border-green-600 bg-white shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <Link href="/teacher">
              <Button
                variant="outline"
                size="icon"
                className="border-2 border-green-600 hover:bg-green-50 bg-transparent"
              >
                <ArrowLeft className="h-5 w-5 text-green-700" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-green-800">Editar Tarefa</h1>
              <p className="text-sm font-medium text-green-600">Atualize os detalhes e perguntas da tarefa</p>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={isDeleting}
                className="border-2 border-red-600 bg-red-600 font-bold hover:bg-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Tarefa?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. A tarefa e todos os dados associados serão permanentemente excluídos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-2 border-green-200 shadow-lg">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-2xl text-green-800">Detalhes da Tarefa</CardTitle>
              <CardDescription className="text-green-600">Atualize as informações básicas da tarefa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-base font-semibold text-gray-700">
                  Título da Tarefa *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="border-2 border-green-300 focus:border-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-semibold text-gray-700">
                  Descrição
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="border-2 border-green-300 focus:border-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeLimit" className="text-base font-semibold text-gray-700">
                  Tempo Limite (segundos) *
                </Label>
                <Input
                  id="timeLimit"
                  type="number"
                  min="10"
                  max="600"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  required
                  className="border-2 border-green-300 focus:border-green-500"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 shadow-lg">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-2xl text-green-800">Perguntas</CardTitle>
              <CardDescription className="text-green-600">
                Use ___ no texto para indicar onde a resposta deve ser inserida (máximo 5 lacunas por pergunta)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {questions.map((question, qIndex) => {
                const blankCount = (question.text.match(/___/g) || []).length

                return (
                  <div key={qIndex} className="space-y-4 rounded-lg border-2 border-green-200 bg-green-50/50 p-5">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-bold text-green-800">Pergunta {qIndex + 1}</Label>
                      {questions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(qIndex)}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`question-text-${qIndex}`} className="text-base font-semibold text-gray-700">
                        Texto da Pergunta *
                        {blankCount > 0 && (
                          <span className="ml-2 text-sm text-green-600">
                            ({blankCount} lacuna{blankCount !== 1 ? "s" : ""})
                          </span>
                        )}
                      </Label>
                      <Textarea
                        id={`question-text-${qIndex}`}
                        value={question.text}
                        onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                        rows={3}
                        required
                        placeholder="Digite a pergunta usando ___ onde a resposta deve ser inserida"
                        className="border-2 border-green-300 focus:border-green-500"
                      />
                    </div>

                    {blankCount > 0 && (
                      <div className="space-y-3 rounded-lg border-2 border-green-300 bg-white p-4">
                        <Label className="text-base font-semibold text-gray-700">Respostas Corretas *</Label>
                        {question.correctAnswers.map((answer, aIndex) => (
                          <div key={aIndex} className="space-y-2">
                            <Label htmlFor={`answer-${qIndex}-${aIndex}`} className="text-sm font-medium text-gray-600">
                              Resposta Correta {aIndex + 1}
                            </Label>
                            <Input
                              id={`answer-${qIndex}-${aIndex}`}
                              value={answer}
                              onChange={(e) => updateCorrectAnswer(qIndex, aIndex, e.target.value)}
                              required
                              placeholder={`Resposta para a lacuna ${aIndex + 1}`}
                              className="border-2 border-green-300 focus:border-green-500"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-3 rounded-lg border-2 border-orange-300 bg-orange-50/50 p-4">
                      <Label className="text-base font-semibold text-gray-700">
                        Palavras de Distração (Pergunta {qIndex + 1})
                      </Label>
                      {question.distractors.map((distractor, dIndex) => (
                        <div key={dIndex} className="flex gap-2">
                          <Input
                            value={distractor}
                            onChange={(e) => updateDistractor(qIndex, dIndex, e.target.value)}
                            placeholder="Palavra incorreta"
                            className="border-2 border-orange-300 focus:border-orange-500"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDistractor(qIndex, dIndex)}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addDistractor(qIndex)}
                        className="w-full border-2 border-orange-400 bg-white font-semibold text-orange-700 hover:bg-orange-50"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Palavra de Distração
                      </Button>
                    </div>
                  </div>
                )
              })}

              <Button
                type="button"
                variant="outline"
                onClick={addQuestion}
                className="w-full border-2 border-green-500 bg-white font-bold text-green-700 hover:bg-green-50"
              >
                <Plus className="mr-2 h-5 w-5" />
                Adicionar Pergunta
              </Button>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive" className="border-2 border-red-500">
              <AlertDescription className="font-semibold">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Link href="/teacher" className="flex-1">
              <Button
                type="button"
                variant="outline"
                className="w-full border-2 border-gray-400 bg-white font-bold hover:bg-gray-50"
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              className="flex-1 border-2 border-green-700 bg-green-600 font-bold hover:bg-green-700"
              disabled={isLoading}
            >
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
