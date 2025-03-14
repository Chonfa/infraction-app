/**
 * Servicio para geocodificación inversa usando la API de la Ciudad de Buenos Aires
 */

interface GeocodingResult {
    direccion?: string
    error?: string
  }
  
  export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult> {
    try {
      // URL de la API de normalización de Buenos Aires (versión 4)
      const url = `https://servicios.usig.buenosaires.gob.ar/normalizar/?lng=${lng}&lat=${lat}&tipoResultado=calle_altura_calle_y_calle`
  
      console.log("Consultando API de geocodificación:", url)
  
      const response = await fetch(url)
  
      if (!response.ok) {
        throw new Error(`Error en la respuesta: ${response.status}`)
      }
  
      const data = await response.json()
      console.log("Respuesta de geocodificación:", data)
  
      // Extraer el parámetro "direccion" de la respuesta
      if (data && data.direccion) {
        return {
          direccion: data.direccion,
        }
      } else if (data && data.direccionNormalizada) {
        // Formato alternativo posible
        return {
          direccion: data.direccionNormalizada,
        }
      } else if (data && data.calle) {
        // Otro formato posible
        return {
          direccion: `${data.calle} ${data.altura || ""}`.trim(),
        }
      } else {
        return {
          error: "No se pudo determinar la dirección",
        }
      }
    } catch (error) {
      console.error("Error al geocodificar:", error)
      return {
        error: "Error al obtener la dirección",
      }
    }
  }
  
  