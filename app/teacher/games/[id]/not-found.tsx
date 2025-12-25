import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-white px-4">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-12 w-12 text-red-600" />
        </div>
        <h1 className="mb-3 text-4xl font-bold text-gray-900">Jogo Não Encontrado</h1>
        <p className="mb-8 text-lg text-gray-600">Este jogo não existe ou você não tem permissão para acessá-lo.</p>
        <Link href="/teacher">
          <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold h-12 px-6">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Voltar ao Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
