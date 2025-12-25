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
import { Plus, X, ArrowLeft, Eye, EyeOff } from "lucide-react"
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
  // ... (manter imports e states existentes)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [timeLimit, setTimeLimit] = useState("60")
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [isPublished, setIsPublished] = useState(false)
  const [revealAnswers, setRevealAnswers] = useState(true) // Novo state
  const [questions, setQuestions] = useState<Question[]>([{ text: "", correctAnswers: [""], distractors: [""] }])

  // ... (funções de addQuestion, removeQuestion, updates etc. mantêm-se iguais)
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

    // ... (validações mantêm-se iguais)
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
          reveal_answers: revealAnswers, // Adicionado
        })
        .select()
        .single()

      if (gameError) throw gameError

      const questionsData = questions.map((q, index) => ({
        game_id: game.id,
        question_text: q.text.trim(),
        correct_answers: q.correctAnswers.map((a) => a.trim()),
        distractors: q.distractors.filter((d) => d.trim()).map((d) => d.trim()),
        position: index,
      }))

      const { error: questionsError } = await supabase.from("game_questions").insert(questionsData)

      if (questionsError) throw questionsError

      window.location.href = "/teacher"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar tarefa")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <Link href="/teacher">
            <Button variant="ghost" size="icon" className="hover:bg-secondary">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Criar Nova Avaliação</h1>
            <p className="text-sm text-muted-foreground">Configuração da atividade</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border bg-secondary/20 pb-4">
              <CardTitle className="text-lg">Informações Gerais</CardTitle>
              <CardDescription>Defina os parâmetros básicos da avaliação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title">Título da Avaliação *</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Anatomia Humana - Sistema Nervoso"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="bg-background border-input"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Descrição (Opcional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Instruções ou contexto para os alunos..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="bg-background border-input resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeLimit">Tempo por Questão (segundos) *</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    min="10"
                    max="600"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    required
                    className="bg-background border-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="class">Atribuir à Turma</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue placeholder="Selecione uma turma (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem turma específica (Público)</SelectItem>
                      {classes.map((classItem) => (
                        <SelectItem key={classItem.id} value={classItem.id}>
                          {classItem.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Opções de Configuração */}
              <div className="grid gap-4 pt-2 border-t border-border">
                <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-secondary/10">
                  <div className="space-y-0.5">
                    <Label className="text-base">Revelar Respostas</Label>
                    <p className="text-sm text-muted-foreground">
                      Permitir que o aluno veja quais questões acertou e o gabarito após finalizar.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {revealAnswers ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    <Checkbox 
                      id="reveal" 
                      checked={revealAnswers} 
                      onCheckedChange={(checked) => setRevealAnswers(!!checked)} 
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-secondary/10">
                  <div className="space-y-0.5">
                    <Label className="text-base">Publicar Imediatamente</Label>
                    <p className="text-sm text-muted-foreground">
                      Tornar visível para os alunos assim que salvar.
                    </p>
                  </div>
                  <Checkbox 
                    id="publish" 
                    checked={isPublished} 
                    onCheckedChange={(checked) => setIsPublished(!!checked)} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Questões</h2>
              <span className="text-sm text-muted-foreground">{questions.length} questões criadas</span>
            </div>

            {questions.map((question, qIndex) => {
              const blankCount = (question.text.match(/_{3,}/g) || []).length

              return (
                <Card key={qIndex} className="border border-border bg-card shadow-sm relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  <CardHeader className="pb-4 pt-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {qIndex + 1}
                        </span>
                        Questão {qIndex + 1}
                      </CardTitle>
                      {questions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(qIndex)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                        >
                          <X className="h-4 w-4 mr-2" /> Remover
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Enunciado (Use ___ para criar lacunas)</Label>
                      <Textarea
                        placeholder="Ex: A capital do Brasil é ___."
                        value={question.text}
                        onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                        rows={2}
                        className="bg-background font-medium text-lg"
                      />
                      {blankCount > 0 && (
                        <p className="text-xs text-primary font-medium flex items-center gap-1">
                          <Plus className="h-3 w-3" /> {blankCount} lacuna(s) detectada(s)
                        </p>
                      )}
                    </div>

                    {question.correctAnswers.length > 0 && (
                      <div className="grid gap-4 sm:grid-cols-2 bg-secondary/10 p-4 rounded-lg border border-border">
                        {question.correctAnswers.map((answer, aIndex) => (
                          <div key={aIndex} className="space-y-1.5">
                            <Label className="text-xs text-primary font-bold uppercase tracking-wider">
                              Resposta Correta {aIndex + 1}
                            </Label>
                            <Input
                              placeholder={`Resposta para a lacuna ${aIndex + 1}`}
                              value={answer}
                              onChange={(e) => updateCorrectAnswer(qIndex, aIndex, e.target.value)}
                              className="bg-background border-primary/30 focus:border-primary"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-3">
                      <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                        Distratores (Palavras Incorretas)
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {question.distractors.map((distractor, dIndex) => (
                          <div key={dIndex} className="flex-1 min-w-[200px] flex gap-2">
                            <Input
                              placeholder="Palavra incorreta"
                              value={distractor}
                              onChange={(e) => updateDistractor(qIndex, dIndex, e.target.value)}
                              className="bg-background"
                            />
                            {question.distractors.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeDistractor(qIndex, dIndex)}
                                className="shrink-0 text-muted-foreground hover:text-destructive"
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
                          className="shrink-0 border-dashed"
                        >
                          <Plus className="h-4 w-4 mr-2" /> Add Distrator
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            <Button
              type="button"
              variant="outline"
              onClick={addQuestion}
              className="w-full py-8 border-dashed border-2 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all"
            >
              <Plus className="mr-2 h-5 w-5" />
              Adicionar Nova Pergunta
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4 pt-4 border-t border-border">
            <Link href="/teacher" className="flex-1">
              <Button type="button" variant="outline" className="w-full h-12 text-base" disabled={isLoading}>
                Cancelar
              </Button>
            </Link>
            <Button type="submit" className="flex-1 h-12 text-base font-bold shadow-lg shadow-primary/20" disabled={isLoading}>
              {isLoading ? "Criando..." : "Criar Avaliação"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
