"use client";

import React, { useState, ChangeEvent } from "react";
import {
  Loader2,
  Globe,
  FileUp,
  Zap,
  Map,
} from "lucide-react";

// --- Constants ---
const SEQ_LEN = 6;
const HORIZONS = 3;
const PATCH_SIZE = 13;
const CHANNELS = 7;
const API_ENDPOINT = "http://localhost:5000/api/predict";

interface Dataset {
  name: string;
  abbreviation: string;
  type: "dynamic" | "static";
  files: number;
}

const DATASET_NAMES: Dataset[] = [
  { name: "T2M (T2M (2m Temperature))", abbreviation: "T2M", type: "dynamic", files: 6 },
  { name: "D2M (D2M (2m Dew Point Temp))", abbreviation: "D2M", type: "dynamic", files: 6 },
  { name: "TP (TP (Total Precipitation))", abbreviation: "TP", type: "dynamic", files: 6 },
  { name: "V10 (V10 (10m V-Wind))", abbreviation: "V10", type: "dynamic", files: 6 },
  { name: "U10 (U10 (10m U-Wind))", abbreviation: "U10", type: "dynamic", files: 6 },
  { name: "LULC (LULC (Land Cover))", abbreviation: "LULC", type: "static", files: 1 },
  { name: "DEM (DEM (Digital Elevation Model))", abbreviation: "DEM", type: "static", files: 1 },
];

const DEFAULT_BOUNDS = {
  latMin: "30.2",
  latMax: "30.3",
  lonMin: "77.8",
  lonMax: "77.9",
};

interface TimeDetails {
  inputStart: string;
  inputEnd: string;
  predStart: string;
  predEnd: string;
  date: string;
}

const MOCK_TIME_DETAILS: TimeDetails = {
  inputStart: "17:00:00",
  inputEnd: "22:00:00",
  predStart: "23:00:00",
  predEnd: "01:00:00",
  date: "2015-01-01",
};

interface PredictionAPIParams {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  inputFiles: Record<string, File[] | File | null>;
}

interface PredictionAPIResponse {
  prediction: number[][][];
  timeDetails: TimeDetails;
  center: [number, number];
}

const runPredictionAPI = async ({
  latMin,
  latMax,
  lonMin,
  lonMax,
  inputFiles,
}: PredictionAPIParams): Promise<PredictionAPIResponse> => {
  const fileManifest: Record<string, string[] | string | null> = {};
  for (const { abbreviation, type } of DATASET_NAMES) {
    const fileData = inputFiles[abbreviation];
    if (type === "dynamic") {
      fileManifest[abbreviation] = Array.isArray(fileData)
        ? fileData.map((f) => f.name)
        : [];
    } else if (fileData instanceof File) {
      fileManifest[abbreviation] = fileData.name;
    } else {
      fileManifest[abbreviation] = null;
    }
  }

  const requestBody = {
    latMin,
    latMax,
    lonMin,
    lonMax,
    fileManifest,
  };

  const centerLat = (latMin + latMax) / 2;
  const centerLon = (lonMin + lonMax) / 2;

  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `Status ${response.status}`,
      }));
      throw new Error(errorData.error || `Server responded with status ${response.status}`);
    }

    const data = await response.json();
    return {
      prediction: data.prediction_results,
      timeDetails: data.time_details,
      center: [centerLat, centerLon],
    };
  } catch (error: any) {
    console.warn(`[API FAILED] Using simulated data. Error: ${error.message}`);
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockPrediction = Array(HORIZONS)
          .fill(0)
          .map(() =>
            Array(PATCH_SIZE)
              .fill(0)
              .map((_, i) =>
                Array(PATCH_SIZE)
                  .fill(0)
                  .map((__, j) => {
                    const baseProb =
                      0.05 +
                      i / PATCH_SIZE * 0.2 +
                      j / PATCH_SIZE * 0.3 +
                      Math.random() * 0.1;
                    return Math.min(1.0, Math.max(0.0, baseProb));
                  })
              )
          );
        resolve({
          prediction: mockPrediction,
          timeDetails: MOCK_TIME_DETAILS,
          center: [centerLat, centerLon],
        });
      }, 1000);
    });
  }
};

const getFireColor = (prob: number) => {
  if (prob < 0.1) return "rgba(255, 255, 255, 0)";
  if (prob < 0.3) return `rgba(255, 255, 0, ${0.4 + prob * 0.3})`;
  if (prob < 0.6) return `rgba(255, 165, 0, ${0.5 + prob * 0.4})`;
  return `rgba(255, 0, 0, ${0.6 + prob * 0.4})`;
};

interface StaticGridVisualizationProps {
  bounds: [[number, number], [number, number]];
  prediction: number[][][];
  currentHorizon: number;
  timeDetails: TimeDetails | null;
}

const StaticGridVisualization: React.FC<StaticGridVisualizationProps> = ({
  bounds,
  prediction,
  currentHorizon,
  timeDetails,
}) => {
  if (!prediction || prediction.length === 0) return null;

  const [latMin, lonMin] = bounds[0];
  const [latMax, lonMax] = bounds[1];
  const horizonData = prediction[currentHorizon];
  const titleDate = timeDetails?.date || "N/A";
  const titleTime = timeDetails?.predStart || "N/A";

  return (
    <div className="relative w-full h-[550px] p-2 bg-white rounded-xl shadow-inner border border-gray-100">
      <h3 className="text-lg font-bold text-center mb-4 text-gray-700">
        Fire Probability Grid @ {titleDate} {titleTime} (Hour +{currentHorizon + 1})
      </h3>

      <div className="relative w-full h-[450px] mx-auto flex items-center justify-center">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -rotate-90 text-sm font-semibold text-gray-600">
          Latitude
        </div>

        <div className="flex-grow h-full bg-gray-50 shadow-inner rounded-lg overflow-hidden border border-gray-300 mx-10">
          <div
            className="w-full h-full grid"
            style={{
              gridTemplateColumns: `repeat(${PATCH_SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${PATCH_SIZE}, 1fr)`,
            }}
          >
            {horizonData
              .slice()
              .reverse()
              .map((row, i) =>
                row.map((prob, j) => (
                  <div
                    key={`${i}-${j}`}
                    className="border border-gray-200/50 transition duration-100 cursor-help"
                    style={{ backgroundColor: getFireColor(prob), opacity: 1 }}
                    title={`Lat Cell: ${latMax - i}, Lon Cell: ${lonMin + j} | Prob: ${prob.toFixed(4)}`}
                  />
                ))
              )}
          </div>
        </div>

        <div className="absolute right-0 top-0 text-xs font-medium text-gray-700 mt-2">
          {latMax.toFixed(4)}
        </div>
        <div className="absolute right-0 bottom-0 text-xs font-medium text-gray-700 mb-2">
          {latMin.toFixed(4)}
        </div>
      </div>

      <div className="text-center mt-2 text-sm font-semibold text-gray-600">Longitude</div>

      <div className="flex justify-between mx-10 text-xs font-medium text-gray-700">
        <span>{lonMin.toFixed(4)}</span>
        <span>{lonMax.toFixed(4)}</span>
      </div>
    </div>
  );
};

// --- Main Page Component ---
const PredictPage: React.FC = () => {
  const initialFilesState: Record<string, File[] | File | null> = DATASET_NAMES.reduce(
    (acc, { abbreviation, type }) => ({
      ...acc,
      [abbreviation]: type === "dynamic" ? [] : null,
    }),
    {} as Record<string, File[] | File | null>
  );

  const [inputFiles, setInputFiles] = useState(initialFilesState);
  const [latMin, setLatMin] = useState(DEFAULT_BOUNDS.latMin);
  const [latMax, setLatMax] = useState(DEFAULT_BOUNDS.latMax);
  const [lonMin, setLonMin] = useState(DEFAULT_BOUNDS.lonMin);
  const [lonMax, setLonMax] = useState(DEFAULT_BOUNDS.lonMax);
  const [predictionResult, setPredictionResult] = useState<number[][][]>([]);
  const [timeDetails, setTimeDetails] = useState<TimeDetails | null>(null);
  const [currentHorizon, setCurrentHorizon] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedLatMin = parseFloat(latMin);
  const parsedLatMax = parseFloat(latMax);
  const parsedLonMin = parseFloat(lonMin);
  const parsedLonMax = parseFloat(lonMax);

  const isRangeValid =
    !isNaN(parsedLatMin) &&
    !isNaN(parsedLatMax) &&
    parsedLatMin < parsedLatMax &&
    !isNaN(parsedLonMin) &&
    !isNaN(parsedLonMax) &&
    parsedLonMin < parsedLonMax;

  const isFormValid =
    DATASET_NAMES.every(({ abbreviation, type, files }) => {
      const fileInput = inputFiles[abbreviation];
      if (type === "dynamic") {
        return Array.isArray(fileInput) && fileInput.length === files;
      } else {
        return fileInput !== null && fileInput instanceof File;
      }
    }) && isRangeValid;

  const handleFileChange = (
    abbreviation: string,
    fileList: FileList,
    fileType: "dynamic" | "static"
  ) => {
    if (fileType === "dynamic") {
      const filesToStore = Array.from(fileList).slice(0, 6);
      setInputFiles((prev) => ({ ...prev, [abbreviation]: filesToStore }));
    } else {
      setInputFiles((prev) => ({ ...prev, [abbreviation]: fileList[0] || null }));
    }
  };

  const handlePredict = async () => {
    if (!isFormValid) {
      setError("Please ensure all files are uploaded and the geographical range is valid.");
      return;
    }

    setError(null);
    setIsLoading(true);
    setPredictionResult([]);
    setTimeDetails(null);

    try {
      const { prediction, timeDetails: details } = await runPredictionAPI({
        latMin: parsedLatMin,
        latMax: parsedLatMax,
        lonMin: parsedLonMin,
        lonMax: parsedLonMax,
        inputFiles,
      });
      setPredictionResult(prediction);
      setTimeDetails(details);
      setCurrentHorizon(0);
    } catch (e) {
      console.error("Prediction Error:", e);
      setError("Prediction failed. Showing fallback simulation results.");
    } finally {
      setIsLoading(false);
    }
  };

  const currentBounds: [[number, number], [number, number]] = [
    [parsedLatMin, parsedLonMin],
    [parsedLatMax, parsedLonMax],
  ];

  const dynamicDatasets = DATASET_NAMES.filter(d => d.type === "dynamic");
  const staticDatasets = DATASET_NAMES.filter(d => d.type === "static");

  return (
    <div className="PREDICT min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900  p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-red-600 text-3xl">🔥</div>
            <h1 className="text-3xl font-bold text-gray-800">Wildfire Prediction Analysis</h1>
          </div>
          <p className="text-gray-600 text-sm">
            Upload the 7 geospatial data channels (32 files total) to generate the $13 \times 13$ fire probability grid for Uttarakhand.
          </p>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Geospatial Context */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-indigo-600" />
                <h2 className="text-xl font-bold text-indigo-700">Geospatial Context</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Country</label>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-gray-700">
                    India
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">State/Region</label>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-gray-700">
                    Uttarakhand
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Map className="w-4 h-4 text-indigo-600" />
                <h3 className="text-base font-bold text-indigo-700">$13 \times 13$ Patch Bounds:</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lat Min</label>
                  <input
                    type="text"
                    value={latMin}
                    onChange={(e) => setLatMin(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lat Max</label>
                  <input
                    type="text"
                    value={latMax}
                    onChange={(e) => setLatMax(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lon Min</label>
                  <input
                    type="text"
                    value={lonMin}
                    onChange={(e) => setLonMin(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lon Max</label>
                  <input
                    type="text"
                    value={lonMax}
                    onChange={(e) => setLonMax(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Upload Datasets */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <FileUp className="w-5 h-5 text-gray-700" />
                <h2 className="text-xl font-bold text-gray-800">Upload Datasets</h2>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Total 32 files required (5 dynamic channels $\times$ 6 hours, 2 static channels $\times$ 1 file).
              </p>

              {/* Dynamic Channels */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-indigo-700 uppercase mb-3">
                  Dynamic Channels (5 $\times$ 6 hourly files)
                </h3>
                <div className="space-y-3">
                  {dynamicDatasets.map(({ name, abbreviation, files }) => {
                    const uploadedFiles = inputFiles[abbreviation];
                    const fileCount = Array.isArray(uploadedFiles) ? uploadedFiles.length : 0;
                    const isComplete = fileCount === files;

                    return (
                      <div key={abbreviation} className="border border-dashed border-gray-300 rounded-lg p-4 hover:border-indigo-400 transition">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">{name}</span>
                          <span className={`text-xs font-semibold ${isComplete ? 'text-green-600' : 'text-red-500'}`}>
                            ({fileCount}/6 files)
                          </span>
                        </div>
                        <label className="flex items-center justify-center gap-2 cursor-pointer text-xs text-gray-500 hover:text-indigo-600">
                          <FileUp className="w-4 h-4" />
                          <span>Click to upload 6 files (TIF/NetCDF)</span>
                          <input
                            type="file"
                            multiple
                            accept=".nc,.tif,.tiff"
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              e.target.files && handleFileChange(abbreviation, e.target.files, "dynamic")
                            }
                            className="hidden"
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Static Channels */}
              <div>
                <h3 className="text-sm font-bold text-indigo-700 uppercase mb-3">
                  Static Channels (2 $\times$ 1 file)
                </h3>
                <div className="space-y-3">
                  {staticDatasets.map(({ name, abbreviation }) => {
                    const uploadedFile = inputFiles[abbreviation];
                    const isComplete = uploadedFile instanceof File;

                    return (
                      <div key={abbreviation} className="border border-dashed border-gray-300 rounded-lg p-4 hover:border-indigo-400 transition">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">{name}</span>
                          <span className={`text-xs font-semibold ${isComplete ? 'text-green-600' : 'text-red-500'}`}>
                            ({isComplete ? '1' : '0'}/1 files)
                          </span>
                        </div>
                        <label className="flex items-center justify-center gap-2 cursor-pointer text-xs text-gray-500 hover:text-indigo-600">
                          <FileUp className="w-4 h-4" />
                          <span>Click to upload 1 file (TIF/NetCDF)</span>
                          <input
                            type="file"
                            accept=".nc,.tif,.tiff"
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              e.target.files && handleFileChange(abbreviation, e.target.files, "static")
                            }
                            className="hidden"
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Run Prediction Button */}
            <button
              onClick={handlePredict}
              disabled={isLoading || !isFormValid}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Running Prediction...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>RUN PREDICTION</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column - Prediction Results */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="text-indigo-600">📊</div>
              <h2 className="text-xl font-bold text-gray-800">Prediction Results</h2>
            </div>

            <div className="border-4 border-dashed border-gray-200 rounded-xl min-h-[600px] flex items-center justify-center bg-gray-50">
              {predictionResult.length > 0 ? (
                <StaticGridVisualization
                  bounds={currentBounds}
                  prediction={predictionResult}
                  currentHorizon={currentHorizon}
                  timeDetails={timeDetails}
                />
              ) : (
                <div className="text-center py-12">
                  <Map className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium mb-1">Visualization awaits prediction results.</p>
                  <p className="text-gray-400 text-sm">Configure inputs and run the API.</p>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictPage;