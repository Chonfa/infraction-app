"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import Image from "next/image"

interface ImageAreaSelectorProps {
  imageUrl: string
  onAreaSelected: (area: { x: number; y: number; width: number; height: number }) => void
}

export function ImageAreaSelector({ imageUrl, onAreaSelected }: ImageAreaSelectorProps) {
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [endPos, setEndPos] = useState({ x: 0, y: 0 })
  const [isSelecting, setIsSelecting] = useState(false)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const img = new window.Image()

    img.onload = () => {
      setImageSize({ width: img.width, height: img.height })
    }
    img.src = imageUrl
  }, [imageUrl])

  const getEventCoordinates = (e: React.MouseEvent | React.TouchEvent | undefined): { x: number; y: number } | null => {
    if (!containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()

    if (e instanceof MouseEvent || (e as React.MouseEvent).clientX !== undefined) {
      const mouseEvent = e as React.MouseEvent
      return {
        x: mouseEvent.clientX - rect.left,
        y: mouseEvent.clientY - rect.top,
      }
    } else if (e instanceof TouchEvent || (e as React.TouchEvent).touches !== undefined) {
      const touchEvent = e as React.TouchEvent
      const touch = touchEvent.touches[0]
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      }
    }

    return null
  }

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getEventCoordinates(e)
    if (coords) {
      setStartPos(coords)
      setEndPos(coords)
      setIsSelecting(true)
    }
  }

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isSelecting) return
    const coords = getEventCoordinates(e)
    if (coords) {
      setEndPos(coords)
    }
  }

  const handleEnd = () => {
    if (!isSelecting) return
    setIsSelecting(false)
    const area = {
      x: Math.min(startPos.x, endPos.x),
      y: Math.min(startPos.y, endPos.y),
      width: Math.abs(endPos.x - startPos.x),
      height: Math.abs(endPos.y - startPos.y),
    }
    onAreaSelected(area)
  }

  const selectionStyle = {
    left: `${Math.min(startPos.x, endPos.x)}px`,
    top: `${Math.min(startPos.y, endPos.y)}px`,
    width: `${Math.abs(endPos.x - startPos.x)}px`,
    height: `${Math.abs(endPos.y - startPos.y)}px`,
  }

  return (
    <div
      ref={containerRef}
      className="relative cursor-crosshair"
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
    >
      <Image
        src={imageUrl || "/placeholder.svg"}
        alt="Seleccionar área de la placa"
        width={imageSize.width}
        height={imageSize.height}
        className="max-w-full h-auto"
      />
      {isSelecting && (
        <div className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-40" style={selectionStyle} />
      )}
    </div>
  )
}

