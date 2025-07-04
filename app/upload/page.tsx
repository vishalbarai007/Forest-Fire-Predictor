"use client"

import type React from "react"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, MapPin, Brain, CheckCircle, AlertCircle, Download, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function UploadPage() {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const { toast } = useToast()

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        // 50MB limit
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 50MB",
          variant: "destructive",
        })
        return
      }
      setSelectedFile(file)
      toast({
        title: "File selected",
        description: `${file.name} is ready for upload`,
      })
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setUploadProgress(0)

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    // Simulate processing
    setTimeout(() => {
      setUploadProgress(100)
      setResults({
        areaName: "Custom Region Analysis",
        totalArea: "2,450 hectares",
        riskDistribution: {
          high: 18.5,
          medium: 34.2,
          low: 47.3,
        },
        modelUsed: "U-Net + LSTM",
        confidence: 87.3,
        processingTime: "2.4 seconds",
      })
      setIsProcessing(false)
      toast({
        title: "Analysis complete",
        description: "Your fire risk prediction is ready!",
      })
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Upload & Predict</h1>
          <p className="text-muted-foreground">Upload your custom map data to get personalized fire risk predictions</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upload Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="mr-2 h-5 w-5" />
                Upload Map Data
              </CardTitle>
              <CardDescription>Supported formats: GeoTIFF, GeoJSON (Max size: 50MB)</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Map File</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".tiff,.tif,.geojson,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <div className="space-y-2">
                        <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
                        <div className="text-sm">
                          {selectedFile ? (
                            <div className="space-y-1">
                              <p className="font-medium">{selectedFile.name}</p>
                              <p className="text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          ) : (
                            <>
                              <p className="font-medium">Click to upload or drag and drop</p>
                              <p className="text-muted-foreground">GeoTIFF, GeoJSON files</p>
                            </>
                          )}
                        </div>
                      </div>
                    </Label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="area-name">Area Name</Label>
                    <Input id="area-name" placeholder="e.g., Northern California" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" placeholder="e.g., 37.7749, -122.4194" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model-select">AI/ML Model</Label>
                  <Select defaultValue="unet-lstm">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unet">U-Net (Segmentation)</SelectItem>
                      <SelectItem value="lstm">LSTM (Time Series)</SelectItem>
                      <SelectItem value="unet-lstm">U-Net + LSTM (Hybrid)</SelectItem>
                      <SelectItem value="cellular-automata">Cellular Automata</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea id="description" placeholder="Additional context about your area of interest..." rows={3} />
                </div>

                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Processing...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={!selectedFile || isProcessing}>
                  {isProcessing ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Run Prediction
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Results Panel */}
          <div className="space-y-6">
            {results ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                      Prediction Results
                    </CardTitle>
                    <CardDescription>Analysis completed for {results.areaName}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Area</p>
                        <p className="font-medium">{results.totalArea}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Model Used</p>
                        <p className="font-medium">{results.modelUsed}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <p className="font-medium">{results.confidence}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Processing Time</p>
                        <p className="font-medium">{results.processingTime}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Risk Distribution</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                            <span className="text-sm">High Risk</span>
                          </div>
                          <Badge variant="destructive">{results.riskDistribution.high}%</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-orange-500 rounded"></div>
                            <span className="text-sm">Medium Risk</span>
                          </div>
                          <Badge variant="secondary">{results.riskDistribution.medium}%</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-green-500 rounded"></div>
                            <span className="text-sm">Low Risk</span>
                          </div>
                          <Badge variant="outline">{results.riskDistribution.low}%</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button className="flex-1">
                        <Eye className="mr-2 h-4 w-4" />
                        View on Map
                      </Button>
                      <Button variant="outline" className="flex-1 bg-transparent">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="mr-2 h-5 w-5" />
                    Upload Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Upload your geospatial data to get started with custom fire risk predictions
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <h4 className="font-medium">Supported File Types:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• GeoTIFF (.tiff, .tif) - Raster data</li>
                      <li>• GeoJSON (.geojson, .json) - Vector data</li>
                      <li>• Maximum file size: 50MB</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">What happens next:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>1. File validation and preprocessing</li>
                      <li>2. AI/ML model inference</li>
                      <li>3. Risk map generation</li>
                      <li>4. Results visualization</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
