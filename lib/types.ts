export type Detection = {
  disease: string;
  label?: string;
  diagnosisType?: "disease" | "crop";
  modelCapability?: string;
  confidence: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  regions?: { x: number; y: number; width: number; height: number }[];
  timestamp: number | null;
  severity: "Low" | "Moderate" | "High" | "Critical" | "Not assessed";
  severityAssessed?: boolean;
  severityMethod?: "healthy_class" | "visible_area_heuristic" | "not_assessed" | string;
  affectedArea: number | null;
  affectedAreaSource?: "bounding_box" | "visual_heuristic" | "unknown";
  localization?: "detected" | "whole_image" | "estimated";
  decisionStatus?: "accepted" | "review_required";
  decisionAccepted?: boolean;
  decisionReasons?: string[];
  inputQuality?: {
    acceptable: boolean;
    blur_variance: number;
    mean_brightness: number;
    warnings: string[];
  };
  confidenceCalibration?: "uncalibrated_softmax" | "provider_reported_unverified" | string;
  closedSetWarning?: string;
  riskMethod?: string;
  riskScore?: number;
  riskLevel?: "Low" | "Moderate" | "High" | "Critical";
  sourceModel?: string;
  evidenceCount?: number;
  alternatives?: { label: string; confidence: number }[];
  environmentAdjusted?: boolean;
  // Real disease info (from disease_map.py database)
  scientificName?: string | null;
  pathogenType?: string | null;
  hostCrops?: string[];
  symptoms?: string | null;
  treatment?: string | null;
  prevention?: string | null;
  severityProfile?: string | null;
  source?: string | null;
  // Kindwise / Plant.id online API extras
  description?: string | null;
  treatment_bio?: string | null;
  treatment_chem?: string | null;
  eppo_code?: string | null;
};

export type FrameResult = {
  timestamp: number;
  imageData?: string;
  width: number;
  height: number;
  predictions: Detection[];
};

export type AnalysisSummary = {
  diseasesFound: string[];
  targetsFound?: string[];
  highestConfidenceDisease: string | null;
  infectedFrames: number;
  detectedFrames?: number;
  reviewRequiredCount?: number;
  affectedAreaEstimate: number | null;
  riskScore?: number;
  riskLevel?: "Low" | "Moderate" | "High" | "Critical";
  timeline: { timestamp: number; count: number; topDisease: string | null }[];
  distribution: { disease: string; count: number; averageConfidence: number }[];
};

export type DetectionEvent = {
  timestamp: number;
  frameIndex: number;
  labels: string[];
  maxConfidence: number;
  predictions: Detection[];
  imageData?: string;
};

export type AnalysisResult = {
  id: string;
  mediaType: "image" | "video" | "camera";
  demoMode: boolean;
  analysisMode?: "offline" | "online" | "hybrid" | "cassava";
  localModelCapability?: "crop_detection" | "disease_detection" | "demo_disease_detection" | "missing" | string;
  localModelClassDomain?: "crop" | "disease" | "missing" | string;
  localModelClassCount?: number;
  provider?: string;
  providerUseCase?: string;
  feedbackImageStorageEnabled?: boolean;
  providerStatuses?: { name: string; status: "used" | "skipped" | "error"; detail?: string }[];
  environment?: EnvironmentContext | null;
  environmentRisk?: EnvironmentRisk | null;
  crop?: string | null;
  previewImage?: string;
  width: number;
  height: number;
  predictions: Detection[];
  frames: FrameResult[];
  detectionEvents?: DetectionEvent[];
  summary: AnalysisSummary;
};

export type EnvironmentContext = {
  lat: number;
  lng: number;
  provider: string;
  available: boolean;
  error?: string;
  current?: {
    temperature: number;
    humidity: number;
    precipitation: number;
    windspeed: number;
  };
  soil?: {
    moisture0To1cm?: number | null;
    temperature0cm?: number | null;
    evapotranspiration?: number | null;
  };
  forecast?: {
    days: string[];
    rainTotal7d: number;
    rainyDays7d: number;
    temperatureMaxAvg7d?: number | null;
    temperatureMinAvg7d?: number | null;
    precipitationDaily: number[];
    windMaxDaily: number[];
  };
};

export type EnvironmentRisk = {
  score: number;
  level: "Low" | "Moderate" | "High" | "Critical";
  drivers: string[];
  disease?: string | null;
};

export type ScanFeedback = {
  id: string;
  analysis_id: string;
  prediction_index: number;
  original_disease: string;
  confirmed: boolean;
  corrected_disease?: string | null;
  crop?: string | null;
  confidence: number;
  severity: string;
  source_model?: string | null;
  image_data?: string | null;
  notes?: string | null;
  created_at: string;
};

export type MapPin = {
  id: number;
  lat: number;
  lng: number;
  taxon_name: string;
  scientific_name?: string;
  observed_on?: string;
  place_guess?: string;
  photo_url?: string;
  uri?: string;
  quality_grade?: string;
};

/** User-created disease field report — stored in localStorage */
export type UserMapPin = {
  id: string;
  lat: number;
  lng: number;
  disease: string;
  crop: string;
  severity: "Low" | "Moderate" | "High" | "Critical";
  notes: string;
  createdAt: string; // ISO date string
  spreadRadiusKm?: number; // estimated disease spread radius
  weather?: {
    temperature: number;    // °C
    humidity: number;       // %
    precipitation: number;  // mm
    windspeed: number;      // km/h
    winddirection?: number; // degrees 0–360
    riskLevel: "Low" | "Moderate" | "High"; // computed disease spread risk
  } | null;
};

export type Farm = {
  id: string;
  name: string;
  owner?: string | null;
  region?: string | null;
  created_at: string;
};

export type FieldRecord = {
  id: string;
  farm_id: string;
  name: string;
  crop: string;
  area_hectares: number;
  lat: number;
  lng: number;
  boundary?: { lat: number; lng: number }[] | null;
  created_at: string;
};

export type RiskPrediction = {
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  predictedSpreadRadiusKm: number;
  predictedOutbreakTimeline: { day: number; date: string; expected: string; radius_km: number }[];
  nearbyOutbreaks: Record<string, unknown>[];
  drivers: string[];
  validationStatus?: string;
  intendedUse?: string;
};

export type FieldHealth = {
  field: FieldRecord;
  healthScore: number;
  healthLevel: "Low" | "Medium" | "High" | "Critical";
  trend: "Improving" | "Stable" | "Declining";
  explanation: string[];
  timeline: { date: string; score: number }[];
  latestScans: Record<string, unknown>[];
  latestReports: Record<string, unknown>[];
};

export type DiseaseHotspot = {
  id: string;
  lat: number;
  lng: number;
  disease: string;
  reports: number;
  intensity: number;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  radiusKm: number;
};

export type MapIntelligence = {
  heatmap: { lat: number; lng: number; weight: number; disease: string }[];
  clusters: DiseaseHotspot[];
  spreadSimulation: {
    hotspotId: string;
    disease: string;
    center: { lat: number; lng: number };
    day7RadiusKm: number;
    day14RadiusKm: number;
    recommendedAction: string;
  }[];
  hotspots: DiseaseHotspot[];
};

export type EarlyWarning = {
  fieldId: string;
  fieldName: string;
  crop: string;
  disease: string;
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  reason: string;
  recommendedActions: string[];
};
