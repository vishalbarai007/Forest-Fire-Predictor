"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/placeholder.svg?height=25&width=25",
  iconUrl: "/placeholder.svg?height=25&width=25",
  shadowUrl: "/placeholder.svg?height=25&width=25",
})

interface MapComponentProps {
  layers: {
    fireProbability: boolean
    terrain: boolean
    temperature: boolean
    humidity: boolean
    vegetation: boolean
    settlements: boolean
    roads: boolean
  }
  timeStep: number
}

export default function MapComponent({ layers, timeStep }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const layersRef = useRef<{ [key: string]: L.Layer }>({})

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Initialize map
    const map = L.map(mapRef.current).setView([37.7749, -122.4194], 10)
    mapInstanceRef.current = map

    // Add base tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map)

    // Create fire probability layer (simulated)
    const fireProbabilityLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      opacity: 0.6,
      attribution: "Fire Probability Data",
    })
    layersRef.current.fireProbability = fireProbabilityLayer

    // Add sample fire markers
    const fireMarkers = [
      { lat: 37.7849, lng: -122.4094, risk: "high" },
      { lat: 37.7649, lng: -122.4294, risk: "medium" },
      { lat: 37.7549, lng: -122.4394, risk: "low" },
    ]

    fireMarkers.forEach((marker) => {
      const color = marker.risk === "high" ? "red" : marker.risk === "medium" ? "orange" : "yellow"
      L.circleMarker([marker.lat, marker.lng], {
        radius: 8,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.6,
      })
        .addTo(map)
        .bindPopup(`Risk Level: ${marker.risk.toUpperCase()}`)
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update layers based on props
  useEffect(() => {
    if (!mapInstanceRef.current) return

    const map = mapInstanceRef.current

    // Toggle fire probability layer
    if (layers.fireProbability && !map.hasLayer(layersRef.current.fireProbability)) {
      map.addLayer(layersRef.current.fireProbability)
    } else if (!layers.fireProbability && map.hasLayer(layersRef.current.fireProbability)) {
      map.removeLayer(layersRef.current.fireProbability)
    }

    // Update opacity based on time step (simulate animation)
    if (layersRef.current.fireProbability) {
      const opacity = 0.3 + timeStep * 0.1
      ;(layersRef.current.fireProbability as L.TileLayer).setOpacity(Math.min(opacity, 0.8))
    }
  }, [layers, timeStep])

  return (
    <div className="relative">
      <div ref={mapRef} className="h-[600px] w-full rounded-lg overflow-hidden" />
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg">
        <div className="text-sm font-medium mb-2">Legend</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>High Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>Medium Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Low Risk</span>
          </div>
        </div>
      </div>
    </div>
  )
}
