// Mock templates for optometry examinations

export interface RefractionTemplate {
  id: string;
  name: string;
  description: string;
  category: "myopia" | "hyperopia" | "presbyopia" | "astigmatism" | "other";
  data: {
    od: {
      sphere: number;
      cylinder: number | null;
      axis: number | null;
      add_power: number | null;
    };
    os: {
      sphere: number;
      cylinder: number | null;
      axis: number | null;
      add_power: number | null;
    };
  };
}

export interface ComplaintTemplate {
  id: string;
  name: string;
  description: string;
  complaints: string[];
  severity: "mild" | "moderate" | "severe";
  typical_duration: string;
}

export interface DiagnosisTemplate {
  id: string;
  name: string;
  description: string;
  diagnosis: string;
  treatment_plan: string;
  follow_up: string;
}

export interface MedicalHistoryPattern {
  id: string;
  name: string;
  description: string;
  conditions: {
    diabetes: boolean;
    hypertension: boolean;
    heart_disease: boolean;
    thyroid_disorder: boolean;
    asthma: boolean;
    tuberculosis: boolean;
    kidney_disease: boolean;
    liver_disease: boolean;
    cancer: boolean;
    hiv_aids: boolean;
  };
}

// Refraction Templates
export const refractionTemplates: RefractionTemplate[] = [
  {
    id: "template_low_myopia",
    name: "Low Myopia",
    description: "Mild nearsightedness (-0.50 to -3.00 D)",
    category: "myopia",
    data: {
      od: { sphere: -1.50, cylinder: -0.50, axis: 90, add_power: null },
      os: { sphere: -1.75, cylinder: -0.50, axis: 90, add_power: null },
    },
  },
  {
    id: "template_moderate_myopia",
    name: "Moderate Myopia",
    description: "Moderate nearsightedness (-3.00 to -6.00 D)",
    category: "myopia",
    data: {
      od: { sphere: -4.00, cylinder: -0.75, axis: 180, add_power: null },
      os: { sphere: -4.25, cylinder: -0.75, axis: 180, add_power: null },
    },
  },
  {
    id: "template_high_myopia",
    name: "High Myopia",
    description: "Severe nearsightedness (> -6.00 D)",
    category: "myopia",
    data: {
      od: { sphere: -7.50, cylinder: -1.00, axis: 90, add_power: null },
      os: { sphere: -8.00, cylinder: -1.25, axis: 85, add_power: null },
    },
  },
  {
    id: "template_low_hyperopia",
    name: "Low Hyperopia",
    description: "Mild farsightedness (+0.50 to +3.00 D)",
    category: "hyperopia",
    data: {
      od: { sphere: 1.50, cylinder: null, axis: null, add_power: null },
      os: { sphere: 1.50, cylinder: null, axis: null, add_power: null },
    },
  },
  {
    id: "template_presbyopia",
    name: "Presbyopia",
    description: "Age-related reading difficulty (40+ years)",
    category: "presbyopia",
    data: {
      od: { sphere: 0, cylinder: null, axis: null, add_power: 2.00 },
      os: { sphere: 0, cylinder: null, axis: null, add_power: 2.00 },
    },
  },
  {
    id: "template_myopia_presbyopia",
    name: "Myopia + Presbyopia",
    description: "Distance correction with reading add",
    category: "presbyopia",
    data: {
      od: { sphere: -2.00, cylinder: -0.50, axis: 90, add_power: 2.00 },
      os: { sphere: -2.25, cylinder: -0.50, axis: 90, add_power: 2.00 },
    },
  },
  {
    id: "template_simple_astigmatism",
    name: "Simple Astigmatism",
    description: "Cylinder correction only",
    category: "astigmatism",
    data: {
      od: { sphere: 0, cylinder: -1.00, axis: 90, add_power: null },
      os: { sphere: 0, cylinder: -1.00, axis: 90, add_power: null },
    },
  },
  {
    id: "template_compound_myopic_astigmatism",
    name: "Compound Myopic Astigmatism",
    description: "Myopia with astigmatism",
    category: "astigmatism",
    data: {
      od: { sphere: -2.50, cylinder: -1.50, axis: 180, add_power: null },
      os: { sphere: -2.75, cylinder: -1.75, axis: 175, add_power: null },
    },
  },
  {
    id: "template_emmetropia",
    name: "Emmetropia (No Correction)",
    description: "Normal vision - no glasses needed",
    category: "other",
    data: {
      od: { sphere: 0, cylinder: null, axis: null, add_power: null },
      os: { sphere: 0, cylinder: null, axis: null, add_power: null },
    },
  },
];

// Complaint Templates
export const complaintTemplates: ComplaintTemplate[] = [
  {
    id: "complaint_blurred_distance",
    name: "Blurred Distance Vision",
    description: "Difficulty seeing objects far away",
    complaints: ["Difficulty seeing distant objects", "Squinting to see clearly"],
    severity: "moderate",
    typical_duration: "3_months",
  },
  {
    id: "complaint_blurred_near",
    name: "Blurred Near Vision",
    description: "Difficulty reading and near work",
    complaints: [
      "Difficulty reading small print",
      "Need to hold reading material farther away",
      "Eye strain with near work",
    ],
    severity: "moderate",
    typical_duration: "6_months",
  },
  {
    id: "complaint_headache_reading",
    name: "Headache with Reading",
    description: "Eye strain and headache during near work",
    complaints: [
      "Headache after reading",
      "Eye fatigue with prolonged near work",
      "Frontal headache",
    ],
    severity: "moderate",
    typical_duration: "1_month",
  },
  {
    id: "complaint_eye_strain",
    name: "Digital Eye Strain",
    description: "Computer/screen-related eye discomfort",
    complaints: [
      "Eye strain with screen use",
      "Dry eyes",
      "Blurred vision after screen time",
      "Neck/shoulder pain",
    ],
    severity: "mild",
    typical_duration: "1_week",
  },
  {
    id: "complaint_routine_exam",
    name: "Routine Eye Exam",
    description: "No specific complaints - routine checkup",
    complaints: ["Routine eye examination", "No specific complaints"],
    severity: "mild",
    typical_duration: "today",
  },
  {
    id: "complaint_dry_eyes",
    name: "Dry Eyes",
    description: "Dryness, burning, and irritation",
    complaints: [
      "Burning sensation",
      "Gritty feeling",
      "Watering (reflex tearing)",
      "Eye redness",
    ],
    severity: "moderate",
    typical_duration: "1_month",
  },
  {
    id: "complaint_floaters",
    name: "Floaters",
    description: "Floating spots in vision",
    complaints: [
      "Floating spots in vision",
      "Cobwebs or strings in vision",
    ],
    severity: "mild",
    typical_duration: "few_days",
  },
  {
    id: "complaint_light_sensitivity",
    name: "Light Sensitivity",
    description: "Photophobia and glare issues",
    complaints: [
      "Sensitivity to bright lights",
      "Glare while driving at night",
      "Need for sunglasses",
    ],
    severity: "moderate",
    typical_duration: "2_weeks",
  },
];

// Diagnosis Templates
export const diagnosisTemplates: DiagnosisTemplate[] = [
  {
    id: "diagnosis_myopia_glasses",
    name: "Myopia - Glasses Rx",
    description: "Standard myopia treatment with spectacles",
    diagnosis: "Myopia OU (both eyes)",
    treatment_plan:
      "Spectacle correction recommended. Single vision lenses for distance. Consider anti-reflective coating for better visual comfort.",
    follow_up: "1_year",
  },
  {
    id: "diagnosis_presbyopia_progressive",
    name: "Presbyopia - Progressive Lenses",
    description: "Age-related near vision correction",
    diagnosis: "Presbyopia",
    treatment_plan:
      "Progressive addition lenses (PALs) recommended for seamless distance to near vision. Consider photochromic lenses if light sensitivity present.",
    follow_up: "1_year",
  },
  {
    id: "diagnosis_dry_eye",
    name: "Dry Eye Syndrome",
    description: "Dry eye management protocol",
    diagnosis: "Dry Eye Syndrome (mild to moderate)",
    treatment_plan:
      "Artificial tears 4x daily. Warm compresses and lid hygiene 2x daily. Consider omega-3 supplementation. Reduce screen time and take regular breaks.",
    follow_up: "3_months",
  },
  {
    id: "diagnosis_cl_fitting",
    name: "Contact Lens Trial",
    description: "Initial contact lens fitting",
    diagnosis: "Refractive error - suitable for contact lens wear",
    treatment_plan:
      "Contact lens trial initiated. Training on insertion, removal, and care provided. Follow-up in 1 week for fit assessment.",
    follow_up: "1_week",
  },
  {
    id: "diagnosis_normal",
    name: "Normal Eye Exam",
    description: "No treatment needed",
    diagnosis: "Normal ocular health examination",
    treatment_plan:
      "No treatment required at this time. Continue good eye health practices including regular breaks during screen time, adequate lighting for reading, and UV protection outdoors.",
    follow_up: "1_year",
  },
  {
    id: "diagnosis_glaucoma_suspect",
    name: "Glaucoma Suspect",
    description: "Elevated IOP or suspicious findings",
    diagnosis: "Glaucoma suspect - elevated IOP / suspicious disc appearance",
    treatment_plan:
      "Referral to ophthalmologist for comprehensive glaucoma workup including visual fields and OCT. No treatment initiated at this time.",
    follow_up: "referral",
  },
];

// Medical History Patterns
export const medicalHistoryPatterns: MedicalHistoryPattern[] = [
  {
    id: "pattern_healthy",
    name: "Healthy",
    description: "No significant medical history",
    conditions: {
      diabetes: false,
      hypertension: false,
      heart_disease: false,
      thyroid_disorder: false,
      asthma: false,
      tuberculosis: false,
      kidney_disease: false,
      liver_disease: false,
      cancer: false,
      hiv_aids: false,
    },
  },
  {
    id: "pattern_diabetic",
    name: "Diabetic",
    description: "Diabetes mellitus only",
    conditions: {
      diabetes: true,
      hypertension: false,
      heart_disease: false,
      thyroid_disorder: false,
      asthma: false,
      tuberculosis: false,
      kidney_disease: false,
      liver_disease: false,
      cancer: false,
      hiv_aids: false,
    },
  },
  {
    id: "pattern_diabetic_htn",
    name: "Diabetic + Hypertensive",
    description: "Common comorbidity pattern",
    conditions: {
      diabetes: true,
      hypertension: true,
      heart_disease: false,
      thyroid_disorder: false,
      asthma: false,
      tuberculosis: false,
      kidney_disease: false,
      liver_disease: false,
      cancer: false,
      hiv_aids: false,
    },
  },
  {
    id: "pattern_elderly",
    name: "Elderly with Comorbidities",
    description: "Typical elderly patient pattern",
    conditions: {
      diabetes: true,
      hypertension: true,
      heart_disease: true,
      thyroid_disorder: false,
      asthma: false,
      tuberculosis: false,
      kidney_disease: false,
      liver_disease: false,
      cancer: false,
      hiv_aids: false,
    },
  },
];

// Common drugs for allergy suggestions
export const commonDrugs = [
  "Sulfonamides",
  "Penicillin",
  "Aspirin",
  "NSAIDs",
  "Ibuprofen",
  "Ciprofloxacin",
  "Moxifloxacin",
  "Timolol",
  "Latanoprost",
  "Brimonidine",
  "Tropicamide",
  "Cyclopentolate",
  "Atropine",
  "Fluorescein",
  "Tetracaine",
  "Proparacaine",
  "Prednisolone",
  "Dexamethasone",
];

// Common reactions for allergy selection
export const commonReactions = [
  "Skin rash",
  "Itching",
  "Swelling",
  "Hives",
  "Breathing difficulty",
  "Anaphylaxis",
  "GI upset",
  "Nausea",
  "Eye redness",
  "Eye swelling",
];

// Common complaints for quick selection
export const commonComplaints = [
  "Blurred vision (distance)",
  "Blurred vision (near)",
  "Eye pain",
  "Eye redness",
  "Itching",
  "Watering",
  "Dryness",
  "Burning sensation",
  "Headache",
  "Eye strain",
  "Light sensitivity",
  "Floaters",
  "Double vision",
  "Foreign body sensation",
  "Discharge",
];

// Common surgeries for eye surgery history
export const commonEyeSurgeries = [
  "Cataract surgery",
  "LASIK",
  "PRK",
  "SMILE",
  "ICL implantation",
  "Glaucoma surgery",
  "Trabeculectomy",
  "Vitrectomy",
  "Retinal detachment repair",
  "Corneal transplant",
  "Pterygium excision",
  "Squint surgery",
  "Eyelid surgery",
  "Chalazion excision",
  "DCR (Dacryocystorhinostomy)",
];

// Common diagnoses for quick selection
export const commonDiagnoses = [
  "Myopia OU",
  "Hyperopia OU",
  "Astigmatism OU",
  "Presbyopia",
  "Myopia with astigmatism OU",
  "Hyperopia with astigmatism OU",
  "Dry eye syndrome",
  "Allergic conjunctivitis",
  "Computer vision syndrome",
  "Blepharitis",
  "Meibomian gland dysfunction",
  "Glaucoma suspect",
  "Cataract",
  "Normal ocular examination",
];
