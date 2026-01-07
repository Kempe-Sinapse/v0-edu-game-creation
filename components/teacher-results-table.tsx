"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GameAttempt, GameQuestion } from "@/lib/types"

interface TeacherResultsTableProps {
  attempts: (GameAttempt & {
    profiles: { display_name: string; email: string }
  })[]
  questions: GameQuestion[]
}

export function TeacherResultsTable({ attempts, questions }: TeacherResultsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleRow = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Aluno</TableHead>
            <TableHead>Acertos</TableHead>
            <TableHead>Nota</TableHead>
            <TableHead>Data de Envio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attempts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                Nenhum resultado encontrado.
              </TableCell>
            </TableRow>
          ) : (
            attempts.map((attempt) => {
              const percentage = Math.round((attempt.score / attempt.total_questions) * 100)
              const isExpanded = expandedId === attempt.id

              return (
                <>
                  <TableRow 
                    key={attempt.id} 
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-muted/50", 
                      isExpanded && "bg-muted/50 border-b-0"
                    )}
                    onClick={() => toggleRow(attempt.id)}
                  >
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{attempt.profiles.display_name}</div>
                      <div className="text-xs text-muted-foreground">{attempt.profiles.email}</div>
                    </TableCell>
                    <TableCell>
                      {attempt.score} / {attempt.total_questions}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          percentage >= 70
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                        )}
                      >
                        {percentage}%
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(attempt.completed_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                  
                  {/* Linha Expandida com Detalhes */}
                  {isExpanded && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-t-0">
                      <TableCell colSpan={5} className="p-0">
                        <div className="p-4 sm:p-6 space-y-4">
                          <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            Detalhes das Respostas
                          </h4>
                          
                          <div className="grid gap-3">
                            {attempt.answers.map((answer: any, index: number) => {
                              // Encontra a pergunta original para mostrar o texto
                              const questionData = questions.find(q => q.id === answer.question_id)
                              const questionText = questionData?.question_text || `Questão ${index + 1}`
                              
                              // Compatibilidade com snake_case e camelCase
                              const isCorrect = answer.is_correct ?? answer.isCorrect
                              const userAnswers = answer.user_answers || answer.userAnswers || []
                              const correctAnswers = answer.correct_answers || answer.correctAnswers || []

                              return (
                                <div key={index} className="rounded-lg border border-border bg-background p-3 text-sm">
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5 shrink-0">
                                      {isCorrect ? (
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                      ) : (
                                        <XCircle className="h-5 w-5 text-red-500" />
                                      )}
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                      <p className="font-medium text-foreground">
                                        {questionText.replace(/_{3,}/g, "___")}
                                      </p>
                                      
                                      <div className="grid sm:grid-cols-2 gap-2 mt-2">
                                        <div className="rounded bg-muted/50 p-2">
                                          <span className="text-xs text-muted-foreground block mb-0.5">Resposta do Aluno:</span>
                                          <span className={cn("font-medium", isCorrect ? "text-green-500" : "text-red-500")}>
                                            {userAnswers.length > 0 ? userAnswers.join(" / ") : "(Em branco)"}
                                          </span>
                                        </div>
                                        
                                        {!isCorrect && (
                                          <div className="rounded bg-green-500/5 p-2 border border-green-500/10">
                                            <span className="text-xs text-green-600/70 block mb-0.5">Correto:</span>
                                            <span className="font-medium text-green-500">
                                              {correctAnswers.join(" / ")}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
