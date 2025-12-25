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
import { Plus, X, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import type { Class } from "@/lib/types"

interface Question {
  text: string
  correctAnswers: string[]
  distractors: string[]
}

export function CreateGameForm({ teacherId, classes }: { teacherId: string; classes: Class[] }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [timeLimit, setTimeLimit] = useState("60")
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [isPublished, setIsPublished] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([{ text: "", correctAnswers: [""], distractors: [""] }])

  const addQuestion = () => {
    setQuestions([...questions, { text: "", correctAnswers: [""], distractors: [""] }])
  }

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index))
    }
  }

  const updateQuestionText = (index: number, value: string) => {
    const updated = [...questions]
    updated[index].text = value

    const blankCount = (value.match(/_{3,}/g) || []).length
    const limitedCount = Math.min(blankCount, 5)

    if (limitedCount > updated[index].correctAnswers.length) {
      const diff = limitedCount - updated[index].correctAnswers.length
      updated[index].correctAnswers = [...updated[index].correctAnswers, ...Array(diff).fill("")]
    } else if (limitedCount < updated[index].correctAnswers.length) {
      updated[index].correctAnswers = updated[index].correctAnswers.slice(0, limitedCount)
    }

    setQuestions(updated)
  }

  const updateCorrectAnswer = (qIndex: number, aIndex: number, value: string) => {
    const updated = [...questions]
    updated[qIndex].correctAnswers[aIndex] = value
    setQuestions(updated)
  }

  const addDistractor = (qIndex: number) => {
    const updated = [...questions]
    updated[qIndex].distractors.push("")
    setQuestions(updated)
  }

  const removeDistractor = (qIndex: number, dIndex: number) => {
    const updated = [...questions]
    if (updated[qIndex].distractors.length > 1) {
      updated[qIndex].distractors = updated[qIndex].distractors.filter((_, i) => i !== dIndex)
      setQuestions(updated)
    }
  }

  const updateDistractor = (qIndex: number, dIndex: number, value: string) => {
    const updated = [...questions]
    updated[qIndex].distractors[dIndex] = value
    setQuestions(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    console.log("[v0] Iniciando criação de tarefa")

    if (!title.trim()) {
      setError("Por favor, insira um título para a tarefa")
      setIsLoading(false)
      return
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) {
        setError(`Pergunta ${i + 1} precisa de um texto`)
        setIsLoading(false)
        return
      }

      const blankCount = (q.text.match(/_{3,}/g) || []).length
      if (blankCount === 0) {
        setError(`Pergunta ${i + 1} precisa ter pelo menos uma lacuna (___) no texto`)
        setIsLoading(false)
        return
      }

      if (q.correctAnswers.some((a) => !a.trim())) {
        setError(`Pergunta ${i + 1} precisa ter todas as respostas corretas preenchidas`)
        setIsLoading(false)
        return
      }

      if (q.correctAnswers.length !== blankCount) {
        setError(`Pergunta ${i + 1} tem ${blankCount} lacunas mas ${q.correctAnswers.length} respostas`)
        setIsLoading(false)
        return
      }
    }

    const supabase = createClient()

    try {
      console.log("[v0] Inserindo jogo no banco de dados")

      const { data: game, error: gameError } = await supabase
        .from("games")
        .insert({
          teacher_id: teacherId,
          title: title.trim(),
          description: description.trim() || null,
          time_limit: Number.parseInt(timeLimit),
          class_id: selectedClass || null,
          is_published: isPublished,
          published_at: isPublished ? new Date().toISOString() : null,
        })
        .select()
        .single()

      if (gameError) {
        console.log("[v0] Erro ao criar jogo:", gameError)
        throw gameError
      }

      console.log("[v0] Jogo criado com sucesso:", game.id)
      console.log("[v0] Inserindo perguntas")

      const questionsData = questions.map((q, index) => ({
        game_id: game.id,
        question_text: q.text.trim(),
        correct_answers: q.correctAnswers.map((a) => a.trim()),
        distractors: q.distractors.filter((d) => d.trim()).map((d) => d.trim()),
        position: index,
      }))

      const { error: questionsError } = await supabase.from("game_questions").insert(questionsData)

      if (questionsError) {
        console.log("[v0] Erro ao criar perguntas:", questionsError)
        throw questionsError
      }

      console.log("[v0] Perguntas criadas com sucesso")
      console.log("[v0] Redirecionando para dashboard")

      // Usar window.location ao invés de router para garantir reload completo
      window.location.href = "/teacher"
    } catch (err) {
      console.log("[v0] Erro geral:", err)
      setError(err instanceof Error ? err.message : "Falha ao criar tarefa")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <header className="border-b-4 border-green-600 bg-white shadow-lg">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <Link href="/teacher">
            <Button variant="ghost" size="icon" className="hover:bg-green-100">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Criar Nova Tarefa</h1>
            <p className="text-sm text-gray-600">Monte seu jogo educacional de completar lacunas</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-2 border-green-200 shadow-lg">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-900">Detalhes da Tarefa</CardTitle>
              <CardDescription>Configure as informações básicas da sua tarefa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-base font-semibold">
                  Título da Tarefa *
                </Label>
                <Input
                  id="title"
                  placeholder="ex: Quiz sobre Doença de Pompe"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="border-2 focus:border-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-semibold">
                  Descrição
                </Label>
                <Textarea
                  id="description"
                  placeholder="Breve descrição sobre o tópico da tarefa"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="border-2 focus:border-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeLimit" className="text-base font-semibold">
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
                  className="border-2 focus:border-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="class" className="text-base font-semibold">
                  Turma
                </Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="border-2 focus:border-green-500">
                    <SelectValue placeholder="Selecione uma turma (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem turma específica</SelectItem>
                    {classes.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-600">Se não selecionar, ficará disponível para todos os alunos</p>
              </div>

              <div className="flex items-center space-x-2 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                <Checkbox id="publish" checked={isPublished} onCheckedChange={(checked) => setIsPublished(!!checked)} />
                <div className="space-y-1">
                  <Label
                    htmlFor="publish"
                    className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Publicar tarefa imediatamente
                  </Label>
                  <p className="text-sm text-gray-600">
                    Se não marcar, a tarefa será salva como rascunho e você pode publicar depois
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 shadow-lg">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-900">Perguntas</CardTitle>
              <CardDescription>
                Use <code className="rounded bg-gray-200 px-1 py-0.5 font-mono">___</code> (três ou mais underscores)
                para marcar as lacunas. Você pode ter até 5 lacunas por pergunta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {questions.map((question, qIndex) => {
                const blankCount = (question.text.match(/_{3,}/g) || []).length

                return (
                  <div key={qIndex} className="space-y-4 rounded-lg border-2 border-green-300 bg-green-50/30 p-6">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-bold text-green-900">Pergunta {qIndex + 1}</Label>
                      {questions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(qIndex)}
                          className="text-red-600 hover:bg-red-100 hover:text-red-700"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`question-text-${qIndex}`} className="font-semibold">
                        Texto da Pergunta *
                      </Label>
                      <Textarea
                        id={`question-text-${qIndex}`}
                        placeholder="ex: A doença de Pompe é caracterizada pelo acúmulo de ___ afetando a manutenção da ___ celular."
                        value={question.text}
                        onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                        rows={3}
                        required
                        className="border-2 focus:border-green-500"
                      />
                      {blankCount > 0 && (
                        <p className="text-sm text-green-700 font-medium">
                          {blankCount} lacuna{blankCount !== 1 ? "s" : ""} detectada{blankCount !== 1 ? "s" : ""}
                        </p>
                      )}
                      {blankCount > 5 && (
                        <p className="text-sm text-red-600 font-medium">Máximo de 5 lacunas por pergunta!</p>
                      )}
                    </div>

                    {question.correctAnswers.length > 0 && (
                      <div className="space-y-3">
                        <Label className="font-semibold text-green-900">Respostas Corretas *</Label>
                        <div className="space-y-2">
                          {question.correctAnswers.map((answer, aIndex) => (
                            <div key={aIndex} className="space-y-1">
                              <Label htmlFor={`answer-${qIndex}-${aIndex}`} className="text-sm">
                                Resposta Correta {aIndex + 1}
                              </Label>
                              <Input
                                id={`answer-${qIndex}-${aIndex}`}
                                placeholder={`Palavra ${aIndex + 1}`}
                                value={answer}
                                onChange={(e) => updateCorrectAnswer(qIndex, aIndex, e.target.value)}
                                required
                                className="border-2 border-green-200 focus:border-green-500 bg-white"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <Label className="font-semibold text-green-900">Palavras de Distração (desta pergunta)</Label>
                      <p className="text-sm text-gray-600">Adicione palavras incorretas para aumentar o desafio</p>
                      <div className="space-y-2">
                        {question.distractors.map((distractor, dIndex) => (
                          <div key={dIndex} className="flex gap-2">
                            <Input
                              placeholder={`Palavra de distração ${dIndex + 1}`}
                              value={distractor}
                              onChange={(e) => updateDistractor(qIndex, dIndex, e.target.value)}
                              className="border-2 border-orange-200 focus:border-orange-500 bg-white"
                            />
                            {question.distractors.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeDistractor(qIndex, dIndex)}
                                className="text-red-600 hover:bg-red-100"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addDistractor(qIndex)}
                          className="w-full border-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Adicionar Palavra de Distração
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}

              <Button
                type="button"
                variant="outline"
                onClick={addQuestion}
                className="w-full border-2 border-green-500 bg-green-50 text-green-700 hover:bg-green-100 font-semibold h-12"
              >
                <Plus className="mr-2 h-5 w-5" />
                Adicionar Nova Pergunta
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
                className="w-full border-2 border-gray-400 hover:bg-gray-100 font-semibold h-12 bg-transparent"
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-12 text-base shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? "Criando..." : "Criar Tarefa"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
