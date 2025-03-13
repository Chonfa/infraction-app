"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Upload, Camera, MapPin, Calendar, Clock, AlertTriangle, Send, Loader2, ScanLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { createWorker } from "tesseract.js"
import EXIF from "exif-js"

interface ImageMetadata {
  dateTime?: string
  location?: {
    latitude?: number
    longitude?: number
  }
}

interface InfractionType {
  id: string
  name: string
  description: string
  icon: React.ReactNode
}

const infractionTypes: InfractionType[] = [
  {
    id: "parking",
    name: "Estacionamiento Ilegal",
    description: "Vehículo estacionado en zona prohibida, espacio para discapacitados sin permiso, etc.",
    icon: <MapPin className="h-5 w-5" />,
  },
  {
    id: "redlight",
    name: "Semáforo en Rojo",
    description: "Vehículo pasando un semáforo en rojo o señal de alto.",
    icon: <AlertTriangle className="h-5 w-5" />,
  },
  {
    id: "speeding",
    name: "Exceso de Velocidad",
    description: "Vehículo excediendo el límite de velocidad.",
    icon: <Clock className="h-5 w-5" />,
  },
  {
    id: "other",
    name: "Otra Infracción",
    description: "Cualquier otra infracción de tráfico no listada anteriormente.",
    icon: <AlertTriangle className="h-5 w-5" />,
  },
]

const logObject = (label: string, obj: any) => {
  console.log(`${label}:`, JSON.stringify(obj, null, 2))
}

export default function InfractionReporter() {
  const [step, setStep] = useState<number>(1)
  const [image, setImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [metadata, setMetadata] = useState<ImageMetadata>({})
  const [selectedInfraction, setSelectedInfraction] = useState<string>("")
  const [licensePlate, setLicensePlate] = useState<string>("")
  const [additionalNotes, setAdditionalNotes] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isProcessingOcr, setIsProcessingOcr] = useState<boolean>(false)
  const [ocrConfidence, setOcrConfidence] = useState<number>(0)
  const router = useRouter()

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      console.log("File selected:", file.name)
      console.log("File type:", file.type)
      console.log("File size:", file.size, "bytes")
      setImageFile(file)

      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          console.log("Image loaded into memory")
          setImage(event.target.result as string)
          extractMetadata(file)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const extractMetadata = (file: File) => {
    console.log("Extracting metadata from file:", file.name)
    console.log("File type:", file.type)
    console.log("File size:", file.size, "bytes")

    EXIF.getData(file as any, function (this: any) {
      console.log("EXIF data extracted")

      const allTags = EXIF.getAllTags(this)
      logObject("All EXIF tags", allTags)

      const dateTime = EXIF.getTag(this, "DateTimeOriginal")
      const latitudeRef = EXIF.getTag(this, "GPSLatitudeRef")
      const latitudeValue = EXIF.getTag(this, "GPSLatitude")
      const longitudeRef = EXIF.getTag(this, "GPSLongitudeRef")
      const longitudeValue = EXIF.getTag(this, "GPSLongitude")

      console.log("Date and Time:", dateTime)
      console.log("GPS Data:", { latitudeRef, latitudeValue, longitudeRef, longitudeValue })

      let latitude, longitude

      if (latitudeValue && longitudeValue) {
        latitude = convertDMSToDD(latitudeValue, latitudeRef)
        longitude = convertDMSToDD(longitudeValue, longitudeRef)
        console.log("Converted coordinates:", { latitude, longitude })
      }

      const metadata: ImageMetadata = {
        dateTime: dateTime ? formatExifDate(dateTime) : undefined,
        location: latitude && longitude ? { latitude, longitude } : undefined,
      }

      logObject("Extracted metadata", metadata)

      setMetadata(metadata)

      // Process OCR after metadata extraction
      if (image) {
        processOCR(image)
      }

      // Move to next step after metadata extraction
      setStep(2)
    })
  }

  const formatExifDate = (dateTimeStr: string): string => {
    // EXIF date format: "YYYY:MM:DD HH:MM:SS"
    const [date, time] = dateTimeStr.split(" ")
    const [year, month, day] = date.split(":")
    return `${day}/${month}/${year} ${time}`
  }

  const convertDMSToDD = (dms: number[], ref: string) => {
    const degrees = dms[0]
    const minutes = dms[1]
    const seconds = dms[2]

    let dd = degrees + minutes / 60 + seconds / 3600

    if (ref === "S" || ref === "W") {
      dd = dd * -1
    }

    return dd
  }

  const processOCR = async (imageData: string) => {
    console.log("Starting OCR processing")
    setIsProcessingOcr(true)

    try {
      const worker = await createWorker("spa")
      console.log("Tesseract worker created")

      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      })
      console.log("Tesseract parameters set")

      const { data } = await worker.recognize(imageData)
      console.log("OCR recognition completed")
      logObject("OCR full result", data)

      const lines = data.lines.filter(
        (line) => line.text.length >= 5 && line.text.length <= 8 && /^[A-Z0-9]+$/.test(line.text.replace(/\s/g, "")),
      )
      console.log("Filtered OCR lines:", lines)

      if (lines.length > 0) {
        const bestMatch = lines.sort((a, b) => b.confidence - a.confidence)[0]
        console.log("Best license plate match:", bestMatch)
        setLicensePlate(bestMatch.text.replace(/\s/g, ""))
        setOcrConfidence(bestMatch.confidence)


      } else {
        console.log("No valid license plate detected")
      }

      await worker.terminate()
      console.log("Tesseract worker terminated")
    } catch (error) {
      console.error("Error en OCR:", error)

    } finally {
      setIsProcessingOcr(false)
    }
  }

  const handleSubmit = async () => {
    if (!image || !selectedInfraction || !licensePlate) {
      return
    }

    setIsSubmitting(true)

    try {
      // In a real app, you would send this data to your backend
      // const formData = new FormData()
      // formData.append('image', imageFile as File)
      // formData.append('metadata', JSON.stringify(metadata))
      // formData.append('infractionType', selectedInfraction)
      // formData.append('licensePlate', licensePlate)
      // formData.append('notes', additionalNotes)

      // const response = await fetch('/api/report-infraction', {
      //   method: 'POST',
      //   body: formData,
      // })

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Reset form
      setImage(null)
      setImageFile(null)
      setMetadata({})
      setSelectedInfraction("")
      setLicensePlate("")
      setAdditionalNotes("")
      setOcrConfidence(0)
      setStep(1)
    } catch (error) {
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Reportar Infracción de Tráfico</CardTitle>
        <CardDescription>
          Suba una foto de un vehículo en infracción, proporcione detalles y envíe su reporte.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 1 && (
          <div className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors",
                image ? "border-primary" : "border-muted",
              )}
              onClick={() => document.getElementById("image-upload")?.click()}
            >
              {image ? (
                <div className="relative w-full h-64">
                  <Image src={image || "/placeholder.svg"} alt="Vehículo subido" fill className="object-contain" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-medium text-lg">Subir foto de infracción</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Arrastre y suelte o haga clic para subir una foto del vehículo en infracción
                  </p>
                </div>
              )}
              <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => document.getElementById("image-upload")?.click()}>
                Seleccionar Archivo
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // In a real app, you would integrate with the device camera
                  document.getElementById("image-upload")?.click()
                }}
              >
                <Camera className="mr-2 h-4 w-4" />
                Tomar Foto
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative h-48 md:h-full">
                {image && (
                  <Image
                    src={image || "/placeholder.svg"}
                    alt="Vehículo subido"
                    fill
                    className="object-contain rounded-lg"
                  />
                )}
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Metadatos de la Imagen</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Fecha/Hora:</span>
                    </div>
                    <div>{metadata.dateTime || "No disponible"}</div>

                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Ubicación:</span>
                    </div>
                    <div>
                      {metadata.location?.latitude
                        ? `${metadata.location.latitude.toFixed(4)}, ${metadata.location.longitude?.toFixed(4)}`
                        : "No disponible"}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="license-plate">Número de Placa</Label>
                    {isProcessingOcr && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Procesando OCR...
                      </div>
                    )}
                    {ocrConfidence > 0 && !isProcessingOcr && (
                      <div className="text-xs text-muted-foreground flex items-center">
                        <ScanLine className="h-3 w-3 mr-1" />
                        Detectado por OCR ({Math.round(ocrConfidence)}% confianza)
                      </div>
                    )}
                  </div>
                  <Input
                    id="license-plate"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="Ingrese número de placa"
                    className={cn(
                      ocrConfidence > 70 ? "border-green-500" : "",
                      ocrConfidence > 0 && ocrConfidence <= 70 ? "border-yellow-500" : "",
                    )}
                  />
                  {ocrConfidence > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {ocrConfidence > 70
                        ? "Alta confianza en la detección de la placa"
                        : "Baja confianza en la detección. Por favor, verifique la placa."}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Tipo de Infracción</Label>
              <RadioGroup
                value={selectedInfraction}
                onValueChange={setSelectedInfraction}
                className="grid grid-cols-1 md:grid-cols-2 gap-2"
              >
                {infractionTypes.map((type) => (
                  <div key={type.id} className="flex items-start space-x-2">
                    <RadioGroupItem value={type.id} id={type.id} className="mt-1" />
                    <Label htmlFor={type.id} className="flex flex-col cursor-pointer">
                      <div className="flex items-center">
                        <span className="mr-2">{type.icon}</span>
                        <span>{type.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Proporcione detalles adicionales sobre la infracción"
                rows={3}
              />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {step === 2 && (
          <>
            <Button variant="outline" onClick={() => setStep(1)}>
              Atrás
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !selectedInfraction || !licensePlate}>
              {isSubmitting ? (
                <>Procesando...</>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Reporte
                </>
              )}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  )
}

