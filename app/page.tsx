import type { Metadata } from "next"
import InfractionReporter from "@/components/infraction-reporter"

export const metadata: Metadata = {
  title: "Sistema de Reporte de Infracciones",
  description: "Reporta infracciones de tráfico subiendo fotos con metadatos",
}

export default function Home() {
  return (
    <main className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Sistema de Reporte de Infracciones</h1>
      <div className="max-w-3xl mx-auto">
        <InfractionReporter />
      </div>
    </main>
  )
}

