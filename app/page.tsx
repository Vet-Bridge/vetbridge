"use client";

import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  buildFallbackIntegrationReadiness,
  type IntegrationReadiness,
} from "../lib/integration-catalog";

type Update = {
  message: string;
  time: string;
};

type EstimateItem = Record<string, unknown>;

type VisitForm = {
  id: string;
  form_type: string;
  form_body: string | null;
  form_status: string;
  signed_name: string | null;
  signed_at: string | null;
  decline_reason: string | null;
  declined_at: string | null;
};

type Visit = {
  id: string;
  createdAt: string;
  petName: string;
  species: string;
  otherSpecies: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  phone: string;
  reason: string;
  visitType: string;
  referralName: string;
  beenHereBefore: string;
  clinicNotes: string;
  status: string;
  updates: Update[];
  breed: string;
  consentFormType: string;
  consentSignedName: string;
  consentSignedAt: string;
  estimateItems: EstimateItem[];
  estimateTotal: number;
  estimateStatus: string;
  workflowStep: string;
  forms: VisitForm[];
  petPhotoUrl: string;
  accessToken: string;
  accessUrl: string;
};

type VisitDraft = {
  petName: string;
  species: string;
  otherSpecies: string;
  breed: string;
  petAge: string;
  sex: string;
  spayedNeutered: string;
  weight: string;
  emergencyReason: string;
  symptoms: string;
  whenStartedDays: string;
  isConscious: string;
  breathingNormally: string;
  bleeding: string;
  canWalk: string;
  currentMedications: string;
  allergies: string;
  allergyDetails: string;
  ownerFirstName: string;
  ownerLastName: string;
  phone: string;
  email: string;
  visitType: string;
  referralName: string;
  reason: string;
  beenHereBefore: string;
};

type OwnerPortalTab = "home" | "updates" | "actions" | "pet" | "profile";
type OwnerPortalMode = "owner" | "shared";

const initialVisitDraft: VisitDraft = {
  petName: "",
  species: "",
  otherSpecies: "",
  breed: "",
  petAge: "",
  sex: "",
  spayedNeutered: "",
  weight: "",
  emergencyReason: "",
  symptoms: "",
  whenStartedDays: "",
  isConscious: "",
  breathingNormally: "",
  bleeding: "",
  canWalk: "",
  currentMedications: "",
  allergies: "",
  allergyDetails: "",
  ownerFirstName: "",
  ownerLastName: "",
  phone: "",
  email: "",
  visitType: "Walk-in",
  referralName: "",
  reason: "",
  beenHereBefore: "",
};

type ReferralDocument = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
};

type ReferralDocumentPreview = {
  name: string;
  type: string;
  url: string;
};

type ReferralMessage = {
  id: string;
  senderType: string;
  senderName: string;
  message: string;
  createdAt: string;
};

type Referral = {
  id: string;
  referringClinicName: string;
  referringDoctorName: string;
  referringPhone: string;
  referringEmail: string;
  referringAddress: string;
  preferredCallbackNumber: string;
  petName: string;
  species: string;
  breed: string;
  age: string;
  sex: string;
  weight: number;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPhone: string;
  ownerEmail: string;
  referralType: string;
  reason: string;
  presentingComplaint: string;
  history: string;
  currentSymptoms: string;
  suspectedDiagnosis: string;
  clinicalSummary: string;
  treatmentProvided: string;
  medicationsGiven: string;
  ivFluids: string;
  transferTime: string;
  stabilityLevel: string;
  status: string;
  convertedVisitId: string;
  createdAt: string;
  documents: ReferralDocument[];
  messages: ReferralMessage[];
};

type DoctorOption = {
  name: string;
  profileUrl: string;
};

type StaffRole = "Front Desk" | "Technician" | "Veterinarian" | "Admin";

type StaffProfile = {
  email: string;
  fullName: string;
  role: StaffRole;
};

type NotificationSummary = {
  channel: "sms";
  status: "sent" | "skipped" | "failed";
  reason: string;
  error: string;
  link: string;
};

type ClinicActionResult = {
  visit: Visit;
  notification?: NotificationSummary | null;
};

type ReferralWorkflowResponse = {
  setupRequired: boolean;
  referrals: Referral[];
};

type ClinicDashboardView = "active" | "critical" | "approvals" | "pickup" | "discharged";

type ClinicSort = "newest" | "oldest" | "pet" | "status";

type ClinicWorkflowView = "patients" | "referrals" | "approvals" | "messages" | "more";

type CommunicationHubTab = "owner" | "internal" | "referring";

type OwnerUpdateMediaDraft = {
  name: string;
  type: "photo" | "video" | "file";
  previewUrl: string;
  caption: string;
};

type ClinicSettings = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  timezone: string;
  formsEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  estimatedWaitMinutes: number;
  defaultUpdateCadence: string;
  cprDefault: string;
  aftercareFollowupHours: number;
  setupRequired: boolean;
};

const defaultClinicSettings: ClinicSettings = {
  id: "",
  slug: "demo-emergency-hospital",
  name: "MyPawLink Emergency Hospital",
  logoUrl: "",
  primaryColor: "#087f78",
  secondaryColor: "#0b5f99",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  timezone: "America/New_York",
  formsEnabled: true,
  smsEnabled: true,
  emailEnabled: true,
  estimatedWaitMinutes: 30,
  defaultUpdateCadence: "milestone",
  cprDefault: "ask-owner",
  aftercareFollowupHours: 48,
  setupRequired: true,
};

type CareHubForm = {
  id: string;
  title: string;
  description: string;
  body: string[];
};

type CareHubCategory = {
  id: string;
  title: string;
  description: string;
  forms: CareHubForm[];
};

const doctors: DoctorOption[] = [
  {
    name: "Samantha Aumann",
    profileUrl: "https://www.medvet.com/doctor/samantha-aumann/",
  },
  {
    name: "Aaron Maness",
    profileUrl: "https://www.medvet.com/doctor/aaron-maness/",
  },
  {
    name: "Tiffany McAllister-Bernal",
    profileUrl: "https://www.medvet.com/doctor/tiffany-mcallister/",
  },
];

const careHubCategories: CareHubCategory[] = [
  {
    id: "admission",
    title: "Admission Forms",
    description: "Start-of-visit authorizations and admission paperwork.",
    forms: [
      {
        id: "admission-intake",
        title: "Emergency Admission Authorization",
        description: "Permission to admit your pet for emergency evaluation.",
        body: [
          "I authorize the emergency hospital team to receive and evaluate my pet.",
          "I understand the care team may perform an initial medical assessment and recommend stabilization, diagnostics, or treatment based on my pet's condition.",
          "I confirm that the owner/contact information provided for this visit is accurate to the best of my knowledge.",
        ],
      },
      {
        id: "general-care",
        title: "General Care Permission",
        description: "Allows the team to provide routine nursing support while your pet is in care.",
        body: [
          "I authorize reasonable nursing care, monitoring, handling, and comfort measures while my pet is at the hospital.",
          "This may include basic cleaning, temperature support, assisted movement, and routine observation.",
        ],
      },
      {
        id: "owner-info",
        title: "Owner Information Confirmation",
        description: "Confirms contact details used for updates and decisions.",
        body: [
          "I confirm that my phone number and email may be used to contact me about this visit.",
          "I understand that urgent medical decisions may require prompt response from the listed owner or authorized contact.",
        ],
      },
    ],
  },
  {
    id: "financial",
    title: "Financial Forms",
    description: "Estimate, deposit, and payment responsibility acknowledgements.",
    forms: [
      {
        id: "financial-responsibility",
        title: "Financial Responsibility Agreement",
        description: "Acknowledges responsibility for charges related to this visit.",
        body: [
          "I understand that emergency veterinary care may include examination, stabilization, diagnostics, hospitalization, medications, procedures, and monitoring charges.",
          "I accept financial responsibility for authorized care provided to my pet.",
        ],
      },
      {
        id: "deposit-authorization",
        title: "Deposit Authorization",
        description: "Approves collecting a deposit toward emergency care.",
        body: [
          "I understand that the hospital may request a deposit before non-immediate treatment proceeds.",
          "If my pet is unstable, I understand emergency stabilization may begin before full financial discussion is complete.",
        ],
      },
      {
        id: "estimate-review",
        title: "Estimate Review Acknowledgement",
        description: "Confirms you reviewed the estimate or treatment range.",
        body: [
          "I acknowledge that I have reviewed the estimate or expected range for care.",
          "I understand that the estimate may change if my pet's condition changes or additional diagnostics/treatments are needed.",
        ],
      },
    ],
  },
  {
    id: "emergency-decisions",
    title: "Emergency Decisions",
    description: "Critical care choices that may be needed quickly.",
    forms: [
      {
        id: "cpr-dnr",
        title: "CPR / DNR Preference",
        description: "Documents resuscitation wishes in case of cardiac or respiratory arrest.",
        body: [
          "I understand that CPR may include chest compressions, intubation, emergency medications, defibrillation, and advanced life support.",
          "I understand that DNR means the team will not perform resuscitation if my pet experiences cardiac or respiratory arrest.",
          "I understand that CPR success cannot be guaranteed.",
        ],
      },
      {
        id: "emergency-stabilization",
        title: "Emergency Stabilization Consent",
        description: "Allows immediate stabilization if your pet is unstable.",
        body: [
          "I authorize immediate stabilization if the medical team believes my pet is at risk of serious harm or death without prompt intervention.",
          "Stabilization may include oxygen, IV catheter placement, fluids, emergency medications, warming or cooling, pain control, and urgent monitoring.",
        ],
      },
      {
        id: "critical-intervention",
        title: "Critical Intervention Preference",
        description: "Records direction for urgent decisions while the team contacts you.",
        body: [
          "I understand that certain emergencies require time-sensitive decisions.",
          "I authorize the team to contact me immediately for major decisions and understand that basic life-support stabilization may begin while contact is attempted.",
        ],
      },
    ],
  },
  {
    id: "treatment",
    title: "Treatment Consents",
    description: "Common treatment permissions during ER or hospitalization.",
    forms: [
      {
        id: "medication-consent",
        title: "Medication Administration Consent",
        description: "Allows prescribed medications during the visit.",
        body: [
          "I authorize the medical team to administer medications recommended for my pet's emergency care.",
          "These may include pain medications, anti-nausea medications, antibiotics, sedatives, or other treatments as medically indicated.",
        ],
      },
      {
        id: "hospitalization-care",
        title: "Hospitalization Treatment Consent",
        description: "Covers ongoing care if your pet stays in hospital.",
        body: [
          "I authorize hospitalization care including monitoring, nursing care, treatments, feeding plans, medication administration, and doctor reassessment.",
          "I understand the care plan may be updated as my pet responds to treatment.",
        ],
      },
      {
        id: "pain-management",
        title: "Pain Management Consent",
        description: "Allows the team to provide pain relief when needed.",
        body: [
          "I authorize medically appropriate pain control for my pet.",
          "I understand that medication choice and dose will be determined by the veterinarian based on my pet's condition.",
        ],
      },
    ],
  },
  {
    id: "procedure",
    title: "Procedure Authorizations",
    description: "Permissions for anesthesia, surgery, imaging, and procedures.",
    forms: [
      {
        id: "anesthesia-consent",
        title: "Anesthesia / Sedation Consent",
        description: "Acknowledges anesthesia or sedation risks.",
        body: [
          "I authorize anesthesia or sedation if recommended for diagnostics, treatment, or procedures.",
          "I understand risks may include adverse drug reaction, breathing complications, blood pressure changes, and death, even with careful monitoring.",
        ],
      },
      {
        id: "surgery-consent",
        title: "Surgery / Procedure Consent",
        description: "Authorizes a recommended urgent procedure.",
        body: [
          "I authorize the recommended surgery or procedure for my pet.",
          "I understand risks may include bleeding, infection, pain, anesthesia complications, unexpected findings, need for additional procedures, and death.",
        ],
      },
      {
        id: "diagnostic-procedure",
        title: "Diagnostic Procedure Authorization",
        description: "Approves imaging or diagnostic procedures.",
        body: [
          "I authorize diagnostic procedures such as radiographs, ultrasound, bloodwork, urine testing, ECG, or other tests recommended by the veterinarian.",
          "I understand these tests help guide diagnosis and treatment recommendations.",
        ],
      },
    ],
  },
  {
    id: "communication",
    title: "Communication Preferences",
    description: "How the clinic may contact you during your pet's visit.",
    forms: [
      {
        id: "sms-email-consent",
        title: "SMS / Email Communication Consent",
        description: "Allows digital updates related to your pet's care.",
        body: [
          "I consent to receive visit-related updates by SMS, email, or MyPawLink portal notification.",
          "I understand urgent medical decisions may still require a phone call.",
        ],
      },
      {
        id: "authorized-contact",
        title: "Authorized Contact Permission",
        description: "Allows communication with another trusted contact.",
        body: [
          "I authorize the hospital to discuss non-public visit updates with the contact I provide if I cannot be reached.",
          "I understand medical and financial decisions may still require owner confirmation unless otherwise documented.",
        ],
      },
    ],
  },
  {
    id: "discharge",
    title: "Discharge Documents",
    description: "Documents for going home and aftercare.",
    forms: [
      {
        id: "discharge-instructions",
        title: "Discharge Instruction Acknowledgement",
        description: "Confirms you received home-care instructions.",
        body: [
          "I acknowledge receipt of discharge instructions for my pet.",
          "I understand medication directions, feeding instructions, activity restrictions, warning signs, and recheck recommendations should be followed as written.",
        ],
      },
      {
        id: "medication-schedule",
        title: "Medication Schedule Acknowledgement",
        description: "Confirms you understand take-home medication timing.",
        body: [
          "I acknowledge that medication instructions have been reviewed with me.",
          "I understand I should contact the hospital if I have questions, miss a dose, or notice concerning side effects.",
        ],
      },
    ],
  },
];

const doctorMetaStart = "[[MPL_DOCTOR_ASSIGNMENT]]";
const doctorMetaEnd = "[[/MPL_DOCTOR_ASSIGNMENT]]";
const doctorMetaPattern = new RegExp(
  `\\n?${doctorMetaStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([\\s\\S]*?)${doctorMetaEnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
);
const petPhotoMetaStart = "[[MPL_PET_PHOTO]]";
const petPhotoMetaEnd = "[[/MPL_PET_PHOTO]]";
const petPhotoMetaPattern = new RegExp(
  `\\n?${petPhotoMetaStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([\\s\\S]*?)${petPhotoMetaEnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
);

const getAssignedDoctorFromNotes = (notes: string): DoctorOption | null => {
  const match = notes.match(doctorMetaPattern);
  if (!match) return null;

  try {
    const doctor = JSON.parse(match[1]) as Partial<DoctorOption>;
    if (!doctor.name || !doctor.profileUrl) return null;
    return {
      name: doctor.name,
      profileUrl: doctor.profileUrl,
    };
  } catch {
    return null;
  }
};

const removeDoctorMetadata = (notes: string) =>
  notes.replace(doctorMetaPattern, "").trim();

const getPetPhotoFromNotes = (notes: string) => {
  const match = notes.match(petPhotoMetaPattern);
  return match?.[1] || "";
};

const removePetPhotoMetadata = (notes: string) =>
  notes.replace(petPhotoMetaPattern, "").trim();

const removeAppMetadata = (notes: string) =>
  removePetPhotoMetadata(removeDoctorMetadata(notes)).trim();

const combineClinicNotes = (
  visibleNotes: string,
  doctor: DoctorOption | null,
  petPhotoUrl: string
) =>
  [
    visibleNotes.trim(),
    doctor ? `${doctorMetaStart}${JSON.stringify(doctor)}${doctorMetaEnd}` : "",
    petPhotoUrl ? `${petPhotoMetaStart}${petPhotoUrl}${petPhotoMetaEnd}` : "",
  ]
    .filter(Boolean)
    .join("\n");

const withDoctorMetadata = (notes: string, doctor: DoctorOption) => {
  return combineClinicNotes(
    removeAppMetadata(notes),
    doctor,
    getPetPhotoFromNotes(notes)
  );
};

const withPetPhotoMetadata = (notes: string, petPhotoUrl: string) =>
  combineClinicNotes(
    removeAppMetadata(notes),
    getAssignedDoctorFromNotes(notes),
    petPhotoUrl
  );

const resizePetPhoto = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxSize = 520;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Could not prepare pet photo."));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };

      image.onerror = () => reject(new Error("Could not load pet photo."));
      image.src = String(reader.result);
    };

    reader.onerror = () => reject(new Error("Could not read pet photo."));
    reader.readAsDataURL(file);
  });

export default function Home() {
  const [view, setView] = useState<
  "home" | "newPet" | "existingPet" | "referral" | "ownerUpdates" | "clinic" | "status"
>("home");
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [clinicSelectedVisitId, setClinicSelectedVisitId] = useState<string | null>(null);
  const [selectedReferralSpecies, setSelectedReferralSpecies] = useState("");
  const [searchError, setSearchError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittingVisit, setSubmittingVisit] = useState(false);
  const [submittingReferral, setSubmittingReferral] = useState(false);
  const [visitSubmitError, setVisitSubmitError] = useState("");
  const [visitSubmitMessage, setVisitSubmitMessage] = useState("");
  const [visitMissingFields, setVisitMissingFields] = useState<string[]>([]);
  const [visitWizardStep, setVisitWizardStep] = useState(1);
  const [visitDraft, setVisitDraft] = useState<VisitDraft>({ ...initialVisitDraft });
  const [referralSubmitError, setReferralSubmitError] = useState("");
  const [referralSubmitMessage, setReferralSubmitMessage] = useState("");
  const [referralMissingFields, setReferralMissingFields] = useState<string[]>([]);
  const [referralWizardStep, setReferralWizardStep] = useState(1);
  const [referralOwnerExpanded, setReferralOwnerExpanded] = useState(false);
  const [selectedReferralUrgency, setSelectedReferralUrgency] = useState("");
  const [selectedReferralIvFluids, setSelectedReferralIvFluids] = useState("");
  const [referralLocationLabel, setReferralLocationLabel] = useState("");
  const [referralReviewSnapshot, setReferralReviewSnapshot] = useState<Record<string, string>>({});
  const [clinicLoading, setClinicLoading] = useState(false);
  const [pendingClinicActions, setPendingClinicActions] = useState<Record<string, string>>({});
  const [petPhotoPreview, setPetPhotoPreview] = useState("");
  const [petPhotoByVisitId, setPetPhotoByVisitId] = useState<Record<string, string>>({});
  const [petMediaName, setPetMediaName] = useState("");
  const [petMediaType, setPetMediaType] = useState("");
  const [referralDocumentNames, setReferralDocumentNames] = useState<string[]>([]);
  const [referralDocumentPreviews, setReferralDocumentPreviews] = useState<ReferralDocumentPreview[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [referralWorkflowSetupRequired, setReferralWorkflowSetupRequired] = useState(false);
  const [referralDashboardStatus, setReferralDashboardStatus] = useState("All referrals");
  const [referralMessageDrafts, setReferralMessageDrafts] = useState<Record<string, string>>({});
  const [pendingReferralActions, setPendingReferralActions] = useState<Record<string, string>>({});
  const [selectedReferralId, setSelectedReferralId] = useState<string | null>(null);
  const [clinicUnlocked, setClinicUnlocked] = useState(false);
  const [clinicError, setClinicError] = useState("");
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>(defaultClinicSettings);
  const [clinicSettingsDraft, setClinicSettingsDraft] =
    useState<ClinicSettings>(defaultClinicSettings);
  const [clinicSettingsMessage, setClinicSettingsMessage] = useState("");
  const [savingClinicSettings, setSavingClinicSettings] = useState(false);
  const [integrationReadiness, setIntegrationReadiness] = useState<IntegrationReadiness>(
    buildFallbackIntegrationReadiness(true)
  );
  const [integrationReadinessMessage, setIntegrationReadinessMessage] = useState("");
  const [clinicDashboardView, setClinicDashboardView] =
    useState<ClinicDashboardView>("active");
  const [clinicWorkflowView, setClinicWorkflowView] =
    useState<ClinicWorkflowView>("patients");
  const [clinicSearch, setClinicSearch] = useState("");
  const [clinicStatusFilter, setClinicStatusFilter] = useState("All statuses");
  const [clinicDoctorFilter, setClinicDoctorFilter] = useState("All doctors");
  const [clinicSort, setClinicSort] = useState<ClinicSort>("newest");
  const [ownerUpdateDrafts, setOwnerUpdateDrafts] = useState<Record<string, string>>({});
  const [ownerMediaDrafts, setOwnerMediaDrafts] = useState<Record<string, OwnerUpdateMediaDraft>>({});
  const [communicationHubTabs, setCommunicationHubTabs] = useState<
    Record<string, CommunicationHubTab>
  >({});
  const [authUserEmail, setAuthUserEmail] = useState("");
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [authMessage, setAuthMessage] = useState("");
  const [staffLoginEmail, setStaffLoginEmail] = useState("");
  const [staffLoginPassword, setStaffLoginPassword] = useState("");
  const [ownerAccessEmail, setOwnerAccessEmail] = useState("");
  const [ownerAccessCode, setOwnerAccessCode] = useState("");
  const [ownerCodeSent, setOwnerCodeSent] = useState(false);
  const [ownerVisits, setOwnerVisits] = useState<Visit[]>([]);
  const [ownerVisitsLoading, setOwnerVisitsLoading] = useState(false);
  const [ownerVisitsError, setOwnerVisitsError] = useState("");
  const [ownerPortalTab, setOwnerPortalTab] = useState<OwnerPortalTab>("home");
  const [ownerPortalMode, setOwnerPortalMode] = useState<OwnerPortalMode>("owner");
  const [visitAccessInput, setVisitAccessInput] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [careHubOpen, setCareHubOpen] = useState(false);
  const [selectedCareHubCategoryId, setSelectedCareHubCategoryId] = useState<string | null>(null);
  const [selectedCareHubFormId, setSelectedCareHubFormId] = useState<string | null>(null);
  const [signedCareHubForms, setSignedCareHubForms] = useState<
    Record<string, { signedName: string; signedAt: string }>
  >({});
  const submittingVisitRef = useRef(false);
  const submittingReferralRef = useRef(false);
  const referralFormRef = useRef<HTMLFormElement | null>(null);
  const clinicLoadingRef = useRef(false);
  const pendingClinicActionsRef = useRef<Record<string, string>>({});
  const dogBreeds = [
    "Labrador Retriever",
    "German Shepherd",
    "Golden Retriever",
    "French Bulldog",
    "Bulldog",
    "Poodle",
    "Beagle",
    "Rottweiler",
    "Dachshund",
    "Yorkshire Terrier",
  ];

  const catBreeds = [
    "Persian",
    "Maine Coon",
    "Siamese",
    "Ragdoll",
    "Bengal",
    "Sphynx",
    "British Shorthair",
    "Abyssinian",
    "Scottish Fold",
    "Russian Blue",
  ];
  const emergencyReasons = [
    "Trouble breathing",
    "Collapse or severe weakness",
    "Severe vomiting or diarrhea",
    "Trauma or hit by car",
    "Seizure",
    "Possible toxin ingestion",
    "Difficulty urinating",
    "Bleeding or open wound",
    "Pain or unable to get comfortable",
    "Not eating or very lethargic",
  ];
  const referralTypes = [
    "Emergency transfer",
    "Specialty consult",
    "Imaging review",
    "Second opinion",
  ];
  const stabilityLevels = ["Stable", "Urgent", "Critical"];
  const referralEtaOptions = ["15 min", "30 min", "1 hour", "2+ hours"];
  const referralProcedureOptions = [
    "Bloodwork",
    "X-rays",
    "Ultrasound",
    "ECG",
    "Oxygen",
    "Catheter placed",
    "Pain meds",
    "Antibiotics",
    "Other",
  ];
  const referralDocumentTypes = [
    "Referral notes",
    "Labs",
    "Imaging",
    "Ultrasound",
    "Photos",
    "Video",
    "Other",
  ];
  const referralStepLabels = ["Clinic", "Patient", "Triage", "Treatment", "Documents", "Review"];
  const referralStatuses = [
    "New Referral",
    "Under Review",
    "Waiting on Info",
    "Accepted",
    "Redirected",
    "Patient Arrived",
    "Converted to Visit",
    "Closed",
  ];
  const [visits, setVisits] = useState<Visit[]>([]);
  const selectedVisit = visits.find((v) => v.id === selectedVisitId) || null;
  const selectedReferral =
    referrals.find((referral) => referral.id === selectedReferralId) || null;
  const selectedUpdates = selectedVisit?.updates || [];
  const latestOwnerUpdate = selectedUpdates[selectedUpdates.length - 1];
  const selectedCareHubCategory =
    careHubCategories.find((category) => category.id === selectedCareHubCategoryId) || null;
  const selectedCareHubForm =
    selectedCareHubCategory?.forms.find((form) => form.id === selectedCareHubFormId) || null;
  const canEditClinicNotes = Boolean(
    staffProfile && ["Technician", "Veterinarian", "Admin"].includes(staffProfile.role)
  );
  const getOwnerName = (visit: Visit) => `${visit.ownerFirstName} ${visit.ownerLastName}`;

  const getSpecies = (visit: Visit) =>
    visit.species === "Other" ? visit.otherSpecies : visit.species;

  const getAssignedDoctorName = (visit: Visit) =>
    getAssignedDoctorFromNotes(visit.clinicNotes)?.name || "Unassigned";
  const ownerPortalTabs: { id: OwnerPortalTab; label: string }[] = [
    { id: "home", label: "Home" },
    { id: "updates", label: "Updates" },
    { id: "actions", label: "Actions" },
    { id: "pet", label: "My Pet" },
    { id: "profile", label: "Profile" },
  ];
  const visibleOwnerPortalTabs =
    ownerPortalMode === "shared"
      ? ownerPortalTabs.filter((tab) => ["home", "updates", "pet"].includes(tab.id))
      : ownerPortalTabs;
  const pendingOwnerForms = selectedVisit?.forms.filter((form) => form.form_status === "Sent") || [];
  const ownerActionCount =
    pendingOwnerForms.length +
    (selectedVisit?.estimateStatus?.toLowerCase().includes("pending") ? 1 : 0);
  const getOwnerStatusLabel = (visit: Visit) =>
    visit.status.toLowerCase() === "request submitted"
      ? "Waiting for team review"
      : visit.status;
  const getOwnerReviewMessage = (visit: Visit) =>
    visit.status.toLowerCase() === "request submitted"
      ? "The veterinary team has received your request and will update you here."
      : "The veterinary team will keep this page updated as care progresses.";
  const getVisitStageIndex = (visit: Visit) => {
    const status = visit.status.toLowerCase();

    if (status.includes("ready") || status.includes("discharge") || status.includes("closed")) {
      return 4;
    }

    if (
      status.includes("treatment") ||
      status.includes("diagnostic") ||
      status.includes("surgery") ||
      status.includes("icu") ||
      status.includes("observation") ||
      status.includes("stable") ||
      status.includes("critical") ||
      status.includes("recover")
    ) {
      return 3;
    }

    if (status.includes("exam") || status.includes("doctor")) {
      return 2;
    }

    if (
      status.includes("accepted") ||
      status.includes("checked") ||
      status.includes("triage") ||
      status.includes("review") ||
      status.includes("stabil")
    ) {
      return 1;
    }

    return 0;
  };
  const getAccessDestinationLabel = () => {
    const destination = ownerAccessEmail.trim();
    const digits = destination.replace(/\D/g, "");

    if (digits.length >= 10) {
      const lastFour = digits.slice(-4);
      return `+1 (***) ***-${lastFour}`;
    }

    return destination || "your email";
  };
  const getVisitRelativeTime = (visit: Visit) => {
    const createdTime = new Date(visit.createdAt).getTime();
    if (!Number.isFinite(createdTime)) return "Recently checked in";

    const diffMinutes = Math.max(0, Math.round((Date.now() - createdTime) / 60000));

    if (diffMinutes < 1) return "Checked in just now";
    if (diffMinutes < 60) return `Checked in ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `Checked in ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

    const diffDays = Math.round(diffHours / 24);
    return `Checked in ${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  };
  const isDischargedVisit = (visit: Visit) =>
    ["closed", "discharged"].includes(visit.status.toLowerCase());
  const isReadyForPickupVisit = (visit: Visit) =>
    visit.status.toLowerCase() === "ready for pickup";
  const isCriticalVisit = (visit: Visit) => {
    const status = visit.status.toLowerCase();
    return (
      status.includes("red") ||
      status.includes("critical") ||
      status.includes("stabiliz") ||
      status.includes("surgery") ||
      status.includes("urgent")
    );
  };
  const needsApprovalVisit = (visit: Visit) =>
    visit.status.toLowerCase().includes("awaiting estimate") ||
    visit.estimateStatus.toLowerCase().includes("pending") ||
    visit.forms.some((form) => form.form_status === "Sent");
  const activeVisits = visits.filter((visit) => !isDischargedVisit(visit));
  const closedVisits = visits.filter(isDischargedVisit);
  const criticalVisits = visits.filter((visit) => !isDischargedVisit(visit) && isCriticalVisit(visit));
  const approvalVisits = visits.filter((visit) => !isDischargedVisit(visit) && needsApprovalVisit(visit));
  const pickupVisits = visits.filter(isReadyForPickupVisit);
  const dischargedVisits = visits.filter(isDischargedVisit);
  const hospitalizedVisits = visits.filter((visit) => {
    const status = visit.status.toLowerCase();
    return !isDischargedVisit(visit) && (status.includes("hospital") || status.includes("icu"));
  });
  const pendingDischargeVisits = visits.filter((visit) => {
    const status = visit.status.toLowerCase();
    return !isDischargedVisit(visit) && (status.includes("ready") || status.includes("discharge"));
  });
  const clinicStatuses = Array.from(
    new Set(visits.map((visit) => visit.status).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const clinicDoctors = Array.from(new Set(visits.map(getAssignedDoctorName))).sort((a, b) =>
    a.localeCompare(b)
  );
  const dashboardTabs: { id: ClinicDashboardView; label: string; count: number }[] = [
    { id: "active", label: "Active Visits", count: activeVisits.length },
    { id: "critical", label: "Critical Cases", count: criticalVisits.length },
    { id: "approvals", label: "Waiting Approval", count: approvalVisits.length },
    { id: "pickup", label: "Ready Pickup", count: pickupVisits.length },
    { id: "discharged", label: "Discharged", count: dischargedVisits.length },
  ];
  const visitsForDashboardView =
    clinicDashboardView === "critical"
      ? criticalVisits
      : clinicDashboardView === "approvals"
        ? approvalVisits
        : clinicDashboardView === "pickup"
          ? pickupVisits
          : clinicDashboardView === "discharged"
            ? dischargedVisits
            : activeVisits;
  const filteredClinicVisits = visitsForDashboardView
    .filter((visit) => {
      const query = clinicSearch.trim().toLowerCase();
      const doctorName = getAssignedDoctorName(visit);
      const searchable = [
        visit.petName,
        getSpecies(visit),
        getOwnerName(visit),
        visit.phone,
        visit.status,
        visit.visitType,
        visit.breed,
        doctorName,
        visit.reason,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!query || searchable.includes(query)) &&
        (clinicStatusFilter === "All statuses" || visit.status === clinicStatusFilter) &&
        (clinicDoctorFilter === "All doctors" || doctorName === clinicDoctorFilter)
      );
    })
    .sort((a, b) => {
      if (clinicSort === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (clinicSort === "pet") {
        return a.petName.localeCompare(b.petName);
      }
      if (clinicSort === "status") {
        return a.status.localeCompare(b.status);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  const clinicSelectedVisit =
    filteredClinicVisits.find((visit) => visit.id === clinicSelectedVisitId) ||
    visits.find((visit) => visit.id === clinicSelectedVisitId) ||
    null;
  const normalizeReferralStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      "Referral Submitted": "New Referral",
      "Records Received": "Waiting on Info",
      "Waiting for Patient Arrival": "Accepted",
      "Declined / Redirected": "Redirected",
    };

    return statusMap[status] || status || "New Referral";
  };
  const referralCounts = {
    new: referrals.filter((referral) => normalizeReferralStatus(referral.status) === "New Referral").length,
    underReview: referrals.filter(
      (referral) => normalizeReferralStatus(referral.status) === "Under Review"
    ).length,
    waitingInfo: referrals.filter(
      (referral) => normalizeReferralStatus(referral.status) === "Waiting on Info"
    ).length,
    accepted: referrals.filter((referral) => normalizeReferralStatus(referral.status) === "Accepted").length,
    redirected: referrals.filter(
      (referral) => normalizeReferralStatus(referral.status) === "Redirected"
    ).length,
    closed: referrals.filter((referral) =>
      ["Closed", "Converted to Visit"].includes(normalizeReferralStatus(referral.status))
    ).length,
  };
  const operationsBoardCards: {
    label: string;
    count: number;
    target: ClinicWorkflowView;
    view?: ClinicDashboardView;
    referralStatus?: string;
  }[] = [
    { label: "Active Patients", count: activeVisits.length, target: "patients", view: "active" },
    { label: "Critical Patients", count: criticalVisits.length, target: "patients", view: "critical" },
    { label: "Waiting Approval", count: approvalVisits.length, target: "approvals", view: "approvals" },
    { label: "New Referrals", count: referralCounts.new, target: "referrals", referralStatus: "New Referral" },
    { label: "Ready for Pickup", count: pickupVisits.length, target: "patients", view: "pickup" },
    { label: "Hospitalized", count: hospitalizedVisits.length, target: "patients", view: "active" },
    { label: "Pending Discharge", count: pendingDischargeVisits.length, target: "patients", view: "pickup" },
  ];
  const filteredReferrals = referrals.filter(
    (referral) =>
      referralDashboardStatus === "All referrals" ||
      normalizeReferralStatus(referral.status) === referralDashboardStatus
  );

  const apiRequest = async <T,>(payload: Record<string, unknown>): Promise<T> => {
    const { data } = await supabase.auth.getSession();
    const authToken = data.session?.access_token;

    const response = await fetch("/api/mypawlink", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(authToken ? { ...payload, authToken } : payload),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(result?.error || "Request failed.");
    }

    return response.json() as Promise<T>;
  };

  const syncStaffProfile = async (session: Session | null) => {
    setAuthUserEmail(session?.user.email || "");

    if (!session) {
      setStaffProfile(null);
      return null;
    }

    try {
      const response = await fetch("/api/mypawlink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "getStaffProfile",
          authToken: session.access_token,
        }),
      });
      if (!response.ok) throw new Error("Unable to load staff profile.");

      const result = (await response.json()) as { staffProfile: StaffProfile | null };
      setStaffProfile(result.staffProfile);
      return result.staffProfile;
    } catch {
      setStaffProfile(null);
      return null;
    }
  };

  useEffect(() => {
    loadVisits();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("ownerAccess") !== "1") return;

    window.setTimeout(() => setView("existingPet"), 0);
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const profile = await syncStaffProfile(data.session);
      if (active && data.session && !profile) {
        await loadOwnerVisits();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      const profile = await syncStaffProfile(session);
      if (active && session && !profile) {
        await loadOwnerVisits();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadVisits() {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) return;
    if (clinicLoadingRef.current) return;

    clinicLoadingRef.current = true;
    setClinicLoading(true);

    try {
      const result = await apiRequest<{ visits: Visit[] }>({
        action: "loadVisits",
      });
      setVisits(result.visits);
      await loadClinicSettings();
      await loadIntegrationReadiness();
      await loadReferrals();
      setClinicError("");
      setClinicUnlocked(true);
    } catch (error) {
      setClinicUnlocked(false);
      setClinicError(error instanceof Error ? error.message : "Unable to load clinic visits.");
    } finally {
      clinicLoadingRef.current = false;
      setClinicLoading(false);
    }
  }

  async function loadClinicSettings() {
    try {
      const result = await apiRequest<{ clinicSettings: ClinicSettings }>({
        action: "loadClinicSettings",
      });
      setClinicSettings(result.clinicSettings);
      setClinicSettingsDraft(result.clinicSettings);
      setClinicSettingsMessage(
        result.clinicSettings.setupRequired
          ? "Run the Phase 9 SQL to save clinic settings in Supabase."
          : ""
      );
    } catch (error) {
      setClinicSettings(defaultClinicSettings);
      setClinicSettingsDraft(defaultClinicSettings);
      setClinicSettingsMessage(
        error instanceof Error ? error.message : "Unable to load clinic settings."
      );
    }
  }

  async function loadReferrals() {
    setReferralsLoading(true);

    try {
      const result = await apiRequest<{ referralWorkflow: ReferralWorkflowResponse }>({
        action: "loadReferrals",
      });
      setReferrals(result.referralWorkflow.referrals);
      setReferralWorkflowSetupRequired(result.referralWorkflow.setupRequired);
    } catch (error) {
      setReferralWorkflowSetupRequired(true);
      console.error(error);
    } finally {
      setReferralsLoading(false);
    }
  }

  async function loadIntegrationReadiness() {
    try {
      const result = await apiRequest<{ integrationReadiness: IntegrationReadiness }>({
        action: "loadIntegrationReadiness",
      });
      setIntegrationReadiness(result.integrationReadiness);
      setIntegrationReadinessMessage(
        result.integrationReadiness.setupRequired
          ? "Run the Phase 12 SQL to turn on the integration event queue."
          : ""
      );
    } catch (error) {
      setIntegrationReadiness(buildFallbackIntegrationReadiness(true));
      setIntegrationReadinessMessage(
        error instanceof Error ? error.message : "Unable to load integration readiness."
      );
    }
  }

  const updateClinicSettingsDraft = (
    key: keyof ClinicSettings,
    value: string | number | boolean
  ) => {
    setClinicSettingsDraft((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const saveClinicSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingClinicSettings(true);
    setClinicSettingsMessage("");

    try {
      const result = await apiRequest<{ clinicSettings: ClinicSettings }>({
        action: "updateClinicSettings",
        settings: clinicSettingsDraft,
      });
      setClinicSettings(result.clinicSettings);
      setClinicSettingsDraft(result.clinicSettings);
      setClinicSettingsMessage("Clinic settings saved.");
    } catch (error) {
      setClinicSettingsMessage(
        error instanceof Error ? error.message : "Unable to save clinic settings."
      );
    } finally {
      setSavingClinicSettings(false);
    }
  };

  async function loadOwnerVisits() {
    setOwnerVisitsLoading(true);
    setOwnerVisitsError("");

    try {
      const result = await apiRequest<{ visits: Visit[] }>({
        action: "loadOwnerVisits",
      });
      setOwnerVisits(result.visits);
      setVisits((current) => {
        const byId = new Map(current.map((visit) => [visit.id, visit]));
        result.visits.forEach((visit) => byId.set(visit.id, visit));
        return Array.from(byId.values());
      });
    } catch (error) {
      setOwnerVisitsError(
        error instanceof Error
          ? error.message
          : "Unable to load visits for this email."
      );
    } finally {
      setOwnerVisitsLoading(false);
    }
  }

  const signInClinicStaff = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");
    setClinicError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: staffLoginEmail.trim(),
      password: staffLoginPassword,
    });

    if (error) {
      setAuthLoading(false);
      setAuthMessage(error.message);
      return;
    }

    const profile = await syncStaffProfile(data.session);
    setAuthMessage(
      profile
        ? "Clinic staff signed in."
        : "Signed in, but this email is not active as clinic staff yet."
    );
    setAuthLoading(false);
    if (profile) await loadVisits();
  };

  const sendOwnerAccessCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");
    setOwnerVisitsError("");

    const { error } = await supabase.auth.signInWithOtp({
      email: ownerAccessEmail.trim(),
      options: {
        emailRedirectTo: getOwnerMagicRedirectUrl(),
      },
    });

    setAuthLoading(false);

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    setOwnerCodeSent(true);
    setAuthMessage("Access code sent. Enter the 6-digit code to open your visits.");
  };

  const verifyOwnerAccessCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");
    setOwnerVisitsError("");

    const { data, error } = await supabase.auth.verifyOtp({
      email: ownerAccessEmail.trim(),
      token: ownerAccessCode.trim(),
      type: "email",
    });

    if (error) {
      setAuthLoading(false);
      setAuthMessage(error.message);
      return;
    }

    const profile = await syncStaffProfile(data.session);
    if (!profile) {
      await loadOwnerVisits();
    }

    setAuthMessage("Code verified. Choose your pet below.");
    setAuthLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthUserEmail("");
    setStaffProfile(null);
    setClinicUnlocked(false);
    setVisits([]);
    setOwnerVisits([]);
    setOwnerVisitsError("");
    setOwnerAccessCode("");
    setOwnerCodeSent(false);
    setAuthMessage("Signed out.");
  };

  const getPetPhoto = (visit: Visit) =>
    visit.petPhotoUrl ||
    getPetPhotoFromNotes(visit.clinicNotes) ||
    petPhotoByVisitId[visit.id] ||
    "/vet-hero.jpeg";

  const getTokenFromInput = (value: string) => {
    const trimmed = value.trim();
    const match = trimmed.match(/\/visit\/([^/?#]+)/);
    return decodeURIComponent(match?.[1] || trimmed);
  };

  const getOwnerMagicRedirectUrl = () => {
    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    const baseUrl =
      configuredSiteUrl ||
      (window.location.hostname === "localhost" ? "https://mypawlink.com" : window.location.origin);
    const callbackUrl = new URL("/auth/callback", baseUrl);
    callbackUrl.searchParams.set("next", "/?ownerAccess=1");
    return callbackUrl.toString();
  };

  const copyVisitLink = async (visit: Visit) => {
    if (!visit.accessUrl) {
      alert("This visit does not have a secure link yet. Refresh the dashboard and try again.");
      return;
    }

    try {
      await navigator.clipboard.writeText(visit.accessUrl);
      alert("Secure visit link copied.");
    } catch {
      window.prompt("Copy this secure visit link", visit.accessUrl);
    }
  };

  const handlePetPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      setPetPhotoPreview("");
      setPetMediaName("");
      setPetMediaType("");
      return;
    }

    setPetMediaName(file.name);
    setPetMediaType(file.type.startsWith("video/") ? "video" : "photo");

    if (file.type.startsWith("video/")) {
      setPetPhotoPreview("");
      return;
    }

    try {
      const photoDataUrl = await resizePetPhoto(file);
      setPetPhotoPreview(photoDataUrl);
    } catch (error) {
      console.error(error);
      alert("We couldn't prepare that photo. Please try a different image.");
    }
  };

  const handleReferralDocumentsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setReferralDocumentNames(files.map((file) => file.name));
    const previews = await Promise.all(
      files.slice(0, 8).map(
        (file) =>
          new Promise<ReferralDocumentPreview>((resolve) => {
            if (!file.type.startsWith("image/")) {
              resolve({ name: file.name, type: file.type || "document", url: "" });
              return;
            }

            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                name: file.name,
                type: file.type || "image",
                url: String(reader.result || ""),
              });
            reader.onerror = () => resolve({ name: file.name, type: file.type || "image", url: "" });
            reader.readAsDataURL(file);
          })
      )
    );
    setReferralDocumentPreviews(previews);
  };

  const getIntakeField = (visit: Visit, label: string) => {
    const match = visit.reason
      .split("\n")
      .find((line) => line.toLowerCase().startsWith(`${label.toLowerCase()}:`));

    return match?.split(":").slice(1).join(":").trim() || "Not provided";
  };

  const getIntakeSummary = (visit: Visit) => {
    const mediaLine =
      visit.reason
        .split("\n")
        .find((line) => line.toLowerCase().includes("selected:")) || "";
    const mediaSummary = mediaLine.toLowerCase().startsWith("video")
      ? "1 video attached"
      : mediaLine.toLowerCase().startsWith("photo")
        ? "1 photo attached"
        : "No media attached";

    return {
      age: getIntakeField(visit, "Approx. age"),
      sex: getIntakeField(visit, "Sex"),
      weight: getIntakeField(visit, "Weight"),
      chiefComplaint: getIntakeField(visit, "Emergency reason"),
      symptom: getIntakeField(visit, "Primary symptom"),
      started: getIntakeField(visit, "Started"),
      breathing: getIntakeField(visit, "Breathing normally"),
      conscious: getIntakeField(visit, "Conscious"),
      mobility: getIntakeField(visit, "Can walk"),
      bleeding: getIntakeField(visit, "Bleeding"),
      medications: getIntakeField(visit, "Current medications"),
      allergies: getIntakeField(visit, "Allergies"),
      notes: getIntakeField(visit, "Additional details"),
      mediaSummary,
    };
  };

  const getCompactPatientMetaLine = (visit: Visit) => {
    const intake = getIntakeSummary(visit);
    return [
      getSpecies(visit) || "Species not provided",
      visit.breed || "Breed not provided",
      intake.age !== "Not provided" ? intake.age : "",
      visit.visitType || "Walk-in",
    ]
      .filter(Boolean)
      .join(" - ");
  };

  const getTriageLevel = (visit: Visit) => {
    const status = visit.status.toLowerCase();
    if (status.includes("critical") || status.includes("red")) return "Critical";
    if (status.includes("urgent") || status.includes("orange") || status.includes("yellow")) return "Urgent";
    if (status.includes("stable") || status.includes("green")) return "Stable";
    return "Pending";
  };

  const getClinicWorkflowStatusLabel = (visit: Visit) => {
    const status = visit.status.toLowerCase();
    if (status.includes("request") || status.includes("accepted") || status.includes("checked")) {
      return "Awaiting Triage";
    }
    if (status.includes("triage")) return "Triage In Progress";
    if (status.includes("doctor")) return "Doctor Reviewing";
    if (status.includes("diagnostic") || status.includes("result")) return "Diagnostics Active";
    if (status.includes("estimate")) return "Estimate Pending";
    if (status.includes("ready")) return "Ready for Pickup";
    if (status.includes("closed")) return "Closed";
    return visit.status || "Awaiting Triage";
  };

  const getStatusChips = (visit: Visit, doctor: DoctorOption | null) => {
    const chips: { label: string; tone: "neutral" | "teal" | "orange" | "red" | "blue" }[] = [];
    const status = visit.status.toLowerCase();
    const visitType = (visit.visitType || "").toLowerCase();

    if (visitType.includes("referral") || visit.referralName) {
      chips.push({ label: "Referral", tone: "blue" });
      chips.push({ label: "Converted", tone: "teal" });
    } else if (status.includes("converted")) {
      chips.push({ label: "Converted", tone: "teal" });
    }
    if (getTriageLevel(visit) === "Pending") chips.push({ label: "Needs Triage", tone: "orange" });
    if (!doctor) chips.push({ label: "Doctor Needed", tone: "neutral" });
    if (isCriticalVisit(visit)) chips.push({ label: "Critical", tone: "red" });

    return chips.slice(0, 4);
  };

  const getPrimaryClinicalAction = (visit: Visit, doctor: DoctorOption | null) => {
    const status = visit.status.toLowerCase();
    const triage = getTriageLevel(visit);

    if (status.includes("ready") || status.includes("discharge")) {
      return {
        kind: "sendDischarge",
        label: "Send Discharge",
        helper: "Send pickup or discharge instructions to the owner.",
      };
    }

    if (
      status.includes("estimate") ||
      visit.estimateStatus.toLowerCase().includes("pending") ||
      (visit.estimateTotal > 0 && !visit.estimateStatus.toLowerCase().includes("approved"))
    ) {
      return {
        kind: "sendEstimate",
        label: "Send Estimate",
        helper: "Request owner approval for the treatment estimate.",
      };
    }

    if (status.includes("diagnostic") || status.includes("result") || status.includes("bloodwork")) {
      return {
        kind: "updateDiagnostics",
        label: "Update Diagnostics",
        helper: "Send a diagnostics milestone or results-waiting update.",
      };
    }

    if (triage === "Pending" || status.includes("request") || status.includes("accepted") || status.includes("checked")) {
      return {
        kind: "startTriage",
        label: "Start Triage",
        helper: "Begin triage and assign a medical urgency level.",
      };
    }

    if (!doctor) {
      return {
        kind: "assignDoctor",
        label: "Assign Doctor",
        helper: "Choose the doctor responsible for owner-facing updates.",
      };
    }

    return {
      kind: "sendOwnerUpdate",
      label: "Send Owner Update",
      helper: "Share the next owner-facing care milestone.",
    };
  };

  const getCommunicationTab = (visitId: string) => communicationHubTabs[visitId] || "owner";

  const setCommunicationTab = (visitId: string, tab: CommunicationHubTab) => {
    setCommunicationHubTabs((current) => ({ ...current, [visitId]: tab }));
  };

  const getActionCenterCategory = (visit: Visit) => {
    const status = visit.status.toLowerCase();

    if (status.includes("closed") || status.includes("discharged") || status.includes("ready")) {
      return "discharge";
    }

    if (
      status.includes("treatment") ||
      status.includes("surgery") ||
      status.includes("recover") ||
      status.includes("stable") ||
      status.includes("critical") ||
      status.includes("icu") ||
      status.includes("hospital")
    ) {
      return "treatment";
    }

    if (
      status.includes("doctor") ||
      status.includes("exam") ||
      status.includes("diagnostic") ||
      status.includes("result") ||
      status.includes("estimate")
    ) {
      return "diagnostics";
    }

    if (status.includes("accepted") || status.includes("checked") || status.includes("triage")) {
      return "registration";
    }

    return "arrival";
  };

  const getActionCenterTitle = (visit: Visit) => {
    const category = getActionCenterCategory(visit);
    const labels: Record<string, string> = {
      arrival: "Arrival / Triage",
      registration: "Registration / Consent",
      diagnostics: "Doctor / Diagnostics",
      treatment: "Treatment",
      care: "Care Events",
      discharge: "Discharge",
    };

    return labels[category] || "Action Center";
  };

  const compactWorkflowSteps = ["Request", "Check-In", "Triage", "Doctor", "Diagnostics", "Treatment", "Discharge"];

  const getCompactWorkflowIndex = (visit: Visit) => {
    const timelineIndex = getVisitTimelineIndex(visit);
    if (timelineIndex >= 10) return 6;
    if (timelineIndex >= 8) return 5;
    if (timelineIndex >= 5) return 4;
    if (timelineIndex >= 3) return 3;
    if (timelineIndex >= 2) return 2;
    if (timelineIndex >= 1) return 1;
    return 0;
  };

  const getVisitTimelineIndex = (visit: Visit) => {
    const status = visit.status.toLowerCase();
    const doctorAssigned = Boolean(getAssignedDoctorFromNotes(visit.clinicNotes));

    if (status.includes("closed")) return 12;
    if (status.includes("discharged")) return 11;
    if (status.includes("ready")) return 10;
    if (status.includes("hospital") || status.includes("icu") || status.includes("monitor")) return 9;
    if (status.includes("treatment") || status.includes("surgery")) return 8;
    if (visit.estimateStatus.toLowerCase().includes("approved")) return 7;
    if (
      status.includes("estimate") ||
      visit.estimateStatus.toLowerCase().includes("pending") ||
      visit.estimateTotal > 0
    ) {
      return 6;
    }
    if (status.includes("diagnostic") || status.includes("x-ray") || status.includes("bloodwork")) return 5;
    if (status.includes("exam") || status.includes("doctor")) return 4;
    if (doctorAssigned) return 3;
    if (status.includes("triage") || status.includes("stabil")) return 2;
    if (status.includes("checked") || status.includes("accepted")) return 1;
    return 0;
  };

  const openConvertedReferralVisit = (referral: Referral) => {
    const visit = visits.find((item) => item.id === referral.convertedVisitId);
    if (!visit) {
      alert("This referral was converted. Refresh the dashboard if the visit is not visible yet.");
      return;
    }

    setClinicWorkflowView("patients");
    setClinicDashboardView("active");
    setClinicSelectedVisitId(visit.id);
  };

  const handleOwnerUpdateMediaChange = async (
    visitId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const mediaType = file.type.startsWith("image/")
      ? "photo"
      : file.type.startsWith("video/")
        ? "video"
        : "file";

    let previewUrl = "";
    if (mediaType === "photo") {
      previewUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
      });
    }

    setOwnerMediaDrafts((current) => ({
      ...current,
      [visitId]: {
        name: file.name,
        type: mediaType,
        previewUrl,
        caption: "",
      },
    }));
  };

  const updateOwnerMediaCaption = (visitId: string, caption: string) => {
    setOwnerMediaDrafts((current) => {
      if (!current[visitId]) return current;
      return {
        ...current,
        [visitId]: { ...current[visitId], caption },
      };
    });
  };

  const sendOwnerUpdate = async (visit: Visit, message: string, status = visit.status) => {
    const customNote = ownerUpdateDrafts[visit.id]?.trim();
    const media = ownerMediaDrafts[visit.id];
    const mediaNote = media
      ? `${media.type === "video" ? "Video" : media.type === "photo" ? "Photo" : "File"} attached: ${
          media.caption || media.name
        }`
      : "";
    const updateMessage = [message, customNote, mediaNote].filter(Boolean).join("\n");

    if (!updateMessage.trim()) {
      alert("Add a message or choose a template before sending.");
      return;
    }

    await sendUpdate(visit.id, status, updateMessage);
    setOwnerUpdateDrafts((current) => ({ ...current, [visit.id]: "" }));
    setOwnerMediaDrafts((current) => {
      const next = { ...current };
      delete next[visit.id];
      return next;
    });
  };

  const textVisitLink = (visit: Visit) => {
    if (!visit.accessUrl) {
      alert("This visit does not have a secure link yet. Refresh the dashboard and try again.");
      return;
    }

    const message = `MyPawLink update for ${visit.petName}: use this secure link to view live updates ${visit.accessUrl}`;
    window.location.href = `sms:${visit.phone}?&body=${encodeURIComponent(message)}`;
  };

  const emailVisitLink = (visit: Visit) => {
    if (!visit.accessUrl) {
      alert("This visit does not have a secure link yet. Refresh the dashboard and try again.");
      return;
    }

    if (!visit.ownerEmail) {
      alert("This visit does not have an owner email saved yet.");
      return;
    }

    const subject = `MyPawLink updates for ${visit.petName}`;
    const body = `Use this secure link to view ${visit.petName}'s live visit updates:\n\n${visit.accessUrl}`;
    window.location.href = `mailto:${visit.ownerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const beginClinicAction = (visitId: string, label = "Sending update...") => {
    if (pendingClinicActionsRef.current[visitId]) return false;

    const next = {
      ...pendingClinicActionsRef.current,
      [visitId]: label,
    };
    pendingClinicActionsRef.current = next;
    setPendingClinicActions(next);
    return true;
  };

  const finishClinicAction = (visitId: string) => {
    const next = { ...pendingClinicActionsRef.current };
    delete next[visitId];
    pendingClinicActionsRef.current = next;
    setPendingClinicActions(next);
  };

  const showNotificationIssue = (notification?: NotificationSummary | null) => {
    if (!notification || notification.status === "sent") return;

    const reason =
      notification.reason === "not-configured"
        ? "Twilio is not configured in Vercel yet."
        : notification.reason === "missing-fields"
          ? "The owner phone number is missing or not a valid US phone number."
          : notification.error || "Twilio rejected the text message.";

    alert(`Update saved, but the text was not sent. ${reason}`);
  };

  const requiredFieldLabels: Record<string, string> = {
    allergyDetails: "known allergies",
    allergies: "allergies",
    beenHereBefore: "whether your pet has been here before",
    bleeding: "bleeding",
    breed: "breed",
    breathingNormally: "breathing normally",
    canWalk: "can walk",
    clinicalSummary: "clinical summary",
    doctorEmail: "doctor email",
    doctorPhone: "doctor phone number",
    email: "email",
    emergencyReason: "emergency reason",
    isConscious: "is pet conscious",
    ivFluids: "IV fluids",
    medications: "medications",
    otherSpecies: "pet type",
    ownerFirstName: "owner first name",
    ownerLastName: "owner last name",
    petName: "pet name",
    phone: "phone number",
    presentingComplaint: "presenting complaint",
    reason: "reason for referral",
    referralName: "referring vet or clinic name",
    referralType: "referral type",
    referringClinic: "referring clinic name",
    referringDoctor: "referring doctor name",
    sex: "sex",
    spayedNeutered: "spayed/neutered",
    species: "species",
    stabilityLevel: "stability / urgency level",
    symptoms: "main symptom",
    treatmentGiven: "treatment already given",
    transferTime: "time of transfer",
    visitType: "visit type",
    whenStartedDays: "when symptoms started",
  };

  const getRequiredFieldLabel = (field: Element | null) => {
    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLSelectElement ||
      field instanceof HTMLTextAreaElement
    ) {
      return (
        requiredFieldLabels[field.name] ||
        (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
          ? field.placeholder
          : "") ||
        field.getAttribute("aria-label") ||
        "a required field"
      );
    }

    return "a required field";
  };

  const validateRequiredFields = (
    form: HTMLFormElement,
    formName: "visit" | "referral",
    setError: (message: string) => void,
    setMessage: (message: string) => void,
    setMissingFields: (fields: string[]) => void
  ) => {
    if (form.checkValidity()) {
      setMissingFields([]);
      return true;
    }

    const invalidField = form.querySelector(":invalid");
    const invalidFields = Array.from(form.querySelectorAll(":invalid"));
    const missingFields = Array.from(
      new Map(
        invalidFields.map((field) => {
          const fieldName =
            field instanceof HTMLInputElement ||
            field instanceof HTMLSelectElement ||
            field instanceof HTMLTextAreaElement
              ? field.name || getRequiredFieldLabel(field)
              : getRequiredFieldLabel(field);

          return [fieldName, getRequiredFieldLabel(field)];
        })
      ).values()
    );

    setMissingFields(missingFields);
    setError(`Please complete the missing required information before submitting the ${formName}.`);
    setMessage("");

    if (invalidField instanceof HTMLElement) {
      invalidField.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => invalidField.focus(), 160);
    }

    return false;
  };

  const visitStepLabels = ["Pet", "Emergency", "Extras", "Review"];
  const whenStartedOptions = [
    "Within 30 minutes",
    "1-3 hours ago",
    "Today",
    "Yesterday",
    "More than 1 day",
  ];
  const quickAnswerOptions = ["Yes", "No", "Not sure"];
  const sexOptions = ["Male", "Female", "Unknown"];
  const spayedOptions = ["Yes", "No", "Not sure"];
  const visitTypeOptions = ["Walk-in", "Vet referral", "Follow up"];

  const clearVisitFeedback = () => {
    if (visitSubmitError) setVisitSubmitError("");
    if (visitSubmitMessage) setVisitSubmitMessage("");
    if (visitMissingFields.length) setVisitMissingFields([]);
  };

  const updateVisitDraft = (field: keyof VisitDraft, value: string) => {
    clearVisitFeedback();
    setVisitDraft((current) => {
      const next = { ...current, [field]: value };

      if (field === "species") {
        next.otherSpecies = "";
        next.breed = "";
      }

      if (field === "emergencyReason") {
        next.symptoms = value;
      }

      if (field === "allergies" && value !== "Yes") {
        next.allergyDetails = "";
      }

      if (field === "visitType" && value !== "Vet referral") {
        next.referralName = "";
      }

      return next;
    });
  };

  const getVisitStepMissingFields = (step: number | "all" = visitWizardStep) => {
    const requiredByStep: Record<number, (keyof VisitDraft)[]> = {
      1: ["ownerFirstName", "ownerLastName", "phone", "email", "petName", "species"],
      2: [
        "emergencyReason",
        "whenStartedDays",
        "isConscious",
        "breathingNormally",
        "bleeding",
        "canWalk",
      ],
      3: [],
      4: [],
    };

    if (visitDraft.species === "Other") {
      requiredByStep[1] = [...requiredByStep[1], "otherSpecies"];
    }

    if (visitDraft.allergies === "Yes") {
      requiredByStep[3] = [...requiredByStep[3], "allergyDetails"];
    }

    const fields =
      step === "all"
        ? Object.values(requiredByStep).flat()
        : requiredByStep[step] || [];

    return fields
      .filter((field) => !String(visitDraft[field] || "").trim())
      .map((field) => requiredFieldLabels[field] || "required information");
  };

  const goToVisitWizardStep = (step: number) => {
    setVisitWizardStep(step);
    window.setTimeout(() => {
      document.getElementById("start-visit-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const continueVisitWizard = () => {
    const missingFields = getVisitStepMissingFields();

    if (missingFields.length) {
      setVisitMissingFields(missingFields);
      setVisitSubmitError("Please complete these quick details before continuing.");
      setVisitSubmitMessage("");
      return;
    }

    goToVisitWizardStep(Math.min(4, visitWizardStep + 1));
  };

  const backVisitWizard = () => {
    clearVisitFeedback();
    goToVisitWizardStep(Math.max(1, visitWizardStep - 1));
  };

  const renderVisitChoiceGroup = (
    label: string,
    field: keyof VisitDraft,
    options: string[],
    columns: "compact" | "wide" = "compact"
  ) => (
    <div style={styles.visitChoiceBlock}>
      <p style={styles.visitChoiceLabel}>{label}</p>
      <div
        style={{
          ...styles.visitChoiceGrid,
          gridTemplateColumns:
            columns === "wide"
              ? "repeat(auto-fit, minmax(min(100%, 132px), 1fr))"
              : "repeat(auto-fit, minmax(86px, 1fr))",
        }}
      >
        {options.map((option) => {
          const selected = visitDraft[field] === option;
          return (
            <button
              key={option}
              type="button"
              style={{
                ...styles.visitChoiceButton,
                ...(selected ? styles.visitChoiceButtonSelected : {}),
              }}
              onClick={() => updateVisitDraft(field, option)}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );

  const clearReferralFeedback = () => {
    if (referralSubmitError) setReferralSubmitError("");
    if (referralSubmitMessage) setReferralSubmitMessage("");
    if (referralMissingFields.length) setReferralMissingFields([]);
  };

  const getReferralFormValue = (name: string) => {
    if (name === "stabilityLevel") return selectedReferralUrgency;
    if (name === "ivFluids") return selectedReferralIvFluids;

    const form = referralFormRef.current;
    if (!form) return "";

    const value = new FormData(form).get(name);
    return String(value || "").trim();
  };

  const getReferralSnapshot = (): Record<string, string> => {
    const form = referralFormRef.current;
    if (!form) return {};

    const data = new FormData(form);
    return {
      referringClinic: String(data.get("referringClinic") || ""),
      referringDoctor: String(data.get("referringDoctor") || ""),
      doctorPhone: String(data.get("doctorPhone") || ""),
      doctorEmail: String(data.get("doctorEmail") || ""),
      petName: String(data.get("petName") || ""),
      species:
        String(data.get("species") || "") === "Other"
          ? String(data.get("otherSpecies") || "Other")
          : String(data.get("species") || ""),
      age: String(data.get("age") || ""),
      sex: String(data.get("sex") || ""),
      weight: String(data.get("weight") || ""),
      ownerFirstName: String(data.get("ownerFirstName") || ""),
      ownerLastName: String(data.get("ownerLastName") || ""),
      ownerPhone: String(data.get("ownerPhone") || ""),
      ownerEmail: String(data.get("ownerEmail") || ""),
      referralType: String(data.get("referralType") || ""),
      stabilityLevel: selectedReferralUrgency,
      reason: String(data.get("reason") || ""),
      suspectedDiagnosis: String(data.get("suspectedDiagnosis") || ""),
      clinicalSummary: String(data.get("clinicalSummary") || ""),
      transferTime: String(data.get("transferTime") || ""),
      ivFluids: selectedReferralIvFluids,
      medications: String(data.get("medications") || ""),
      treatmentGiven: String(data.get("treatmentGiven") || ""),
    };
  };

  const getReferralStepMissingFields = (step: number | "all" = referralWizardStep) => {
    const requiredByStep: Record<number, string[]> = {
      1: ["referringClinic", "referringDoctor", "doctorPhone", "doctorEmail"],
      2: ["petName", "species"],
      3: ["referralType", "stabilityLevel", "reason", "clinicalSummary", "transferTime"],
      4: ["ivFluids"],
      5: [],
      6: [],
    };

    if (selectedReferralSpecies === "Other") {
      requiredByStep[2] = [...requiredByStep[2], "otherSpecies"];
    }

    const fields =
      step === "all"
        ? Object.values(requiredByStep).flat()
        : requiredByStep[step] || [];

    return fields
      .filter((field) => !getReferralFormValue(field))
      .map((field) => requiredFieldLabels[field] || "required information");
  };

  const goToReferralWizardStep = (step: number) => {
    clearReferralFeedback();
    setReferralWizardStep(step);
    window.setTimeout(() => {
      document.getElementById("referral-transfer-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const continueReferralWizard = () => {
    const missingFields = getReferralStepMissingFields();

    if (missingFields.length) {
      setReferralMissingFields(missingFields);
      setReferralSubmitError("Please complete these quick details before continuing.");
      setReferralSubmitMessage("");
      return;
    }

    if (referralWizardStep === 5) {
      setReferralReviewSnapshot(getReferralSnapshot());
    }

    goToReferralWizardStep(Math.min(6, referralWizardStep + 1));
  };

  const backReferralWizard = () => {
    goToReferralWizardStep(Math.max(1, referralWizardStep - 1));
  };

  const useReferralCurrentLocation = () => {
    clearReferralFeedback();

    if (!navigator.geolocation) {
      setReferralSubmitMessage("Location sharing is not available on this device.");
      return;
    }

    setReferralSubmitMessage("Getting your current location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const label = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
        setReferralLocationLabel(label);
        setReferralSubmitMessage("Location added to this referral.");
      },
      () => {
        setReferralSubmitMessage("Location was not added. You can continue without it.");
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  const renderReferralButtonGroup = (
    label: string,
    value: string,
    onSelect: (value: string) => void,
    options: string[]
  ) => (
    <div style={styles.visitChoiceBlock}>
      <p style={styles.visitChoiceLabel}>{label}</p>
      <div style={styles.referralUrgencyGrid}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              style={{
                ...styles.referralChoiceButton,
                ...(selected ? styles.visitChoiceButtonSelected : {}),
              }}
              onClick={() => {
                clearReferralFeedback();
                onSelect(option);
              }}
            >
              {option === "Stable" && <span style={styles.referralChoiceDotGreen} />}
              {option === "Urgent" && <span style={styles.referralChoiceDotYellow} />}
              {option === "Critical" && <span style={styles.referralChoiceDotRed} />}
              <span>{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const createVisit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (submittingVisitRef.current) return;
  const missingVisitFields = getVisitStepMissingFields("all");
  if (missingVisitFields.length) {
    setVisitMissingFields(missingVisitFields);
    setVisitSubmitError("Please complete the missing required information before sending.");
    setVisitSubmitMessage("");

    const firstStepWithMissing = [1, 2, 3].find(
      (step) => getVisitStepMissingFields(step).length > 0
    );
    if (firstStepWithMissing) {
      goToVisitWizardStep(firstStepWithMissing);
    }

    return;
  }

  if (
    !validateRequiredFields(
      e.currentTarget,
      "visit",
      setVisitSubmitError,
      setVisitSubmitMessage,
      setVisitMissingFields
    )
  ) {
    return;
  }

  setVisitSubmitError("");
  setVisitSubmitMessage("Submitting visit request...");
  setVisitMissingFields([]);
  submittingVisitRef.current = true;
  setSubmittingVisit(true);

  const form = new FormData(e.currentTarget);
  const petAge = String(form.get("petAge") || "").trim();
  const weight = String(form.get("weight") || "").trim();
  const allergies = String(form.get("allergies") || "");
  const allergyDetails = String(form.get("allergyDetails") || "").trim();
  const currentMedications = String(form.get("currentMedications") || "").trim();
  const additionalDetails = String(form.get("reason") || "").trim();
  const mediaFile = form.get("petPhoto") as File | null;
  const mediaNote =
    petMediaName
      ? `${petMediaType === "video" ? "Video" : "Photo"} selected: ${petMediaName}`
      : mediaFile && mediaFile.name
        ? `${mediaFile.type.startsWith("video/") ? "Video" : "Photo"} selected: ${mediaFile.name}`
        : "No photo or video selected";
  const intakeSummary = [
    "Emergency intake",
    `Approx. age: ${petAge || "Not provided"}`,
    `Sex: ${String(form.get("sex") || "Not provided")}`,
    `Spayed/neutered: ${String(form.get("spayedNeutered") || "Not provided")}`,
    `Weight: ${weight ? `${weight} lb` : "Not provided"}`,
    `Emergency reason: ${String(form.get("emergencyReason") || "Not provided")}`,
    `Primary symptom: ${String(form.get("symptoms") || "Not provided")}`,
    `Started: ${String(form.get("whenStartedDays") || "Not provided")}`,
    `Conscious: ${String(form.get("isConscious") || "Not provided")}`,
    `Breathing normally: ${String(form.get("breathingNormally") || "Not provided")}`,
    `Bleeding: ${String(form.get("bleeding") || "Not provided")}`,
    `Can walk: ${String(form.get("canWalk") || "Not provided")}`,
    `Current medications: ${currentMedications || "None provided"}`,
    `Allergies: ${allergies || "Not provided"}${
      allergies === "Yes" && allergyDetails ? ` - ${allergyDetails}` : ""
    }`,
    mediaNote,
    `Additional details: ${additionalDetails || "None provided"}`,
  ].join("\n");

  const firstUpdate = {
    message: "Visit request submitted. The clinic will review it shortly.",
    status: "Request submitted",
  };

  let visit: Visit;

  try {
    const result = await apiRequest<{ visit: Visit }>({
      action: "createVisit",
      owner: {
        first_name: String(form.get("ownerFirstName")),
        last_name: String(form.get("ownerLastName")),
        phone: String(form.get("phone")),
        email: String(form.get("email")),
      },
      pet: {
        pet_name: String(form.get("petName")),
        species: String(form.get("species")),
        other_species: String(form.get("otherSpecies") || ""),
        breed: String(form.get("breed") || ""),
      },
      visit: {
        visit_type: String(form.get("visitType")),
        referral_name: String(form.get("referralName") || ""),
        been_here_before: String(form.get("beenHereBefore")),
        reason: intakeSummary,
        clinic_notes: petPhotoPreview ? withPetPhotoMetadata("", petPhotoPreview) : "",
        status: "Request submitted",
      },
      firstUpdateMessage: firstUpdate.message,
      firstUpdateStatus: firstUpdate.status,
    });
    visit = result.visit;
  } catch (error) {
    console.error(error);
    setVisitSubmitError(error instanceof Error ? error.message : "Error creating visit");
    setVisitSubmitMessage("");
    submittingVisitRef.current = false;
    setSubmittingVisit(false);
    return;
  }

  if (petPhotoPreview) {
    setPetPhotoByVisitId((current) => ({
      ...current,
      [visit.id]: petPhotoPreview,
    }));
  }

  setVisits((current) => [visit, ...current.filter((item) => item.id !== visit.id)]);
  setSelectedVisitId(visit.id);
  setVisitDraft({ ...initialVisitDraft });
  setVisitWizardStep(1);
  setPetMediaName("");
  setPetMediaType("");
  setPetPhotoPreview("");
  setVisitSubmitMessage("Visit request submitted. Opening your pet's status page...");
  setOwnerPortalTab("home");
  setView("status");
  submittingVisitRef.current = false;
  setSubmittingVisit(false);
};

  const createReferralVisit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (submittingReferralRef.current) return;
    const missingReferralFields = getReferralStepMissingFields("all");
    if (missingReferralFields.length) {
      setReferralMissingFields(missingReferralFields);
      setReferralSubmitError("Please complete the missing required information before sending.");
      setReferralSubmitMessage("");

      const firstStepWithMissing = [1, 2, 3, 4].find(
        (step) => getReferralStepMissingFields(step).length > 0
      );
      if (firstStepWithMissing) {
        goToReferralWizardStep(firstStepWithMissing);
      }

      return;
    }

    setReferralSubmitError("");
    setReferralSubmitMessage("Submitting referral intake...");
    setReferralMissingFields([]);
    submittingReferralRef.current = true;
    setSubmittingReferral(true);

    const form = new FormData(e.currentTarget);
    const clinicName = String(form.get("referringClinic") || "").trim();
    const doctorName = String(form.get("referringDoctor") || "").trim();
    const doctorPhone = String(form.get("doctorPhone") || "").trim();
    const doctorEmail = String(form.get("doctorEmail") || "").trim();
    const ownerFirstName = String(form.get("ownerFirstName") || "").trim();
    const ownerLastName = String(form.get("ownerLastName") || "").trim();
    const ownerPhone = String(form.get("ownerPhone") || "").trim();
    const ownerEmail = String(form.get("ownerEmail") || "").trim();
    const documentsIncluded = form.getAll("documentsIncluded").map(String);
    const proceduresCompleted = form.getAll("proceduresCompleted").map(String);
    const referralDocuments = form
      .getAll("referralDocuments")
      .filter((entry): entry is File => entry instanceof File && Boolean(entry.name));
    const transferTime = String(form.get("transferTime") || "").trim();
    const referralDocumentsPayload = referralDocuments.map((file) => ({
      fileName: file.name,
      fileUrl: "",
      fileType: file.type || file.name.split(".").pop() || "document",
    }));
    const referralReason = String(form.get("reason") || "").trim();
    const clinicalSummary = [
      `Presenting problem: ${referralReason}`,
      String(form.get("suspectedDiagnosis") || "").trim()
        ? `Suspected diagnosis: ${String(form.get("suspectedDiagnosis") || "").trim()}`
        : "",
      String(form.get("clinicalSummary") || "").trim(),
      proceduresCompleted.length ? `Procedures completed: ${proceduresCompleted.join(", ")}` : "",
      documentsIncluded.length ? `Documents included: ${documentsIncluded.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const result = await apiRequest<{ referral: Referral }>({
        action: "createReferral",
        referral: {
          referringClinicName: clinicName,
          referringDoctorName: doctorName,
          referringPhone: doctorPhone,
          referringEmail: doctorEmail,
          referringAddress: referralLocationLabel || String(form.get("referringAddress") || "").trim(),
          preferredCallbackNumber: doctorPhone,
          petName: String(form.get("petName") || "").trim(),
          species:
            String(form.get("species") || "").trim() === "Other"
              ? String(form.get("otherSpecies") || "Other").trim()
              : String(form.get("species") || "").trim(),
          breed: String(form.get("breed") || "").trim(),
          age: String(form.get("age") || "").trim(),
          sex: String(form.get("sex") || "").trim(),
          weight: String(form.get("weight") || "").trim(),
          ownerFirstName,
          ownerLastName,
          ownerPhone,
          ownerEmail,
          referralType: String(form.get("referralType") || "").trim(),
          reason: referralReason,
          presentingComplaint: referralReason,
          history: String(form.get("history") || "").trim(),
          currentSymptoms: String(form.get("currentSymptoms") || "").trim(),
          suspectedDiagnosis: String(form.get("suspectedDiagnosis") || "").trim(),
          clinicalSummary,
          treatmentProvided: String(form.get("treatmentGiven") || "").trim(),
          medicationsGiven: String(form.get("medications") || "").trim(),
          ivFluids: String(form.get("ivFluids") || "").trim(),
          transferTime,
          stabilityLevel: String(form.get("stabilityLevel") || "Stable"),
        },
        documents: referralDocumentsPayload,
      });
      setReferrals((current) => [
        result.referral,
        ...current.filter((item) => item.id !== result.referral.id),
      ]);
      setReferralWorkflowSetupRequired(false);
    } catch (error) {
      console.error(error);
      setReferralSubmitError(error instanceof Error ? error.message : "Error creating referral");
      setReferralSubmitMessage("");
      submittingReferralRef.current = false;
      setSubmittingReferral(false);
      return;
    }

    setSelectedReferralSpecies("");
    setSelectedReferralUrgency("");
    setSelectedReferralIvFluids("");
    setReferralOwnerExpanded(false);
    setReferralWizardStep(1);
    setReferralLocationLabel("");
    setReferralReviewSnapshot({});
    setReferralDocumentNames([]);
    setReferralDocumentPreviews([]);
    setReferralSubmitMessage("Referral intake submitted. Opening the referral dashboard...");
    if (!clinicUnlocked) {
      alert("Referral intake submitted. It is ready in the clinic referral dashboard.");
    }
    setView(clinicUnlocked ? "clinic" : "home");
    submittingReferralRef.current = false;
    setSubmittingReferral(false);
  };

  const setPendingReferralAction = (referralId: string, message: string) => {
    setPendingReferralActions((current) => ({ ...current, [referralId]: message }));
  };

  const clearPendingReferralAction = (referralId: string) => {
    setPendingReferralActions((current) => {
      const next = { ...current };
      delete next[referralId];
      return next;
    });
  };

  const updateReferralStatusFromDashboard = async (
    referral: Referral,
    status: string,
    defaultMessage: string
  ) => {
    if (pendingReferralActions[referral.id]) return;

    setPendingReferralAction(referral.id, `Updating referral to ${status}...`);

    try {
      const result = await apiRequest<{ referral: Referral }>({
        action: "updateReferralStatus",
        referralId: referral.id,
        status,
        message: defaultMessage,
      });
      setReferrals((current) =>
        current.map((item) => (item.id === result.referral.id ? result.referral : item))
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to update referral");
    } finally {
      clearPendingReferralAction(referral.id);
    }
  };

  const sendReferralMessage = async (referral: Referral) => {
    const message = referralMessageDrafts[referral.id]?.trim();
    if (!message || pendingReferralActions[referral.id]) return;

    setPendingReferralAction(referral.id, "Sending referral message...");

    try {
      const result = await apiRequest<{ referral: Referral }>({
        action: "updateReferralStatus",
        referralId: referral.id,
        status: referral.status,
        message,
      });
      setReferrals((current) =>
        current.map((item) => (item.id === result.referral.id ? result.referral : item))
      );
      setReferralMessageDrafts((current) => ({ ...current, [referral.id]: "" }));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to send referral message");
    } finally {
      clearPendingReferralAction(referral.id);
    }
  };

  const convertReferralFromDashboard = async (referral: Referral) => {
    if (pendingReferralActions[referral.id]) return;

    setPendingReferralAction(referral.id, "Converting referral to visit...");

    try {
      const result = await apiRequest<{ referral: Referral; visit: Visit }>({
        action: "convertReferralToVisit",
        referralId: referral.id,
      });
      setReferrals((current) =>
        current.map((item) => (item.id === result.referral.id ? result.referral : item))
      );
      setVisits((current) => [
        result.visit,
        ...current.filter((visit) => visit.id !== result.visit.id),
      ]);
      setClinicDashboardView("active");
      setClinicWorkflowView("patients");
      setSelectedReferralId(null);
      setClinicSelectedVisitId(result.visit.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to convert referral");
    } finally {
      clearPendingReferralAction(referral.id);
    }
  };

  const sendUpdate = async (
    visitId: string,
    status: string,
    message: string,
    actionLabel = "Sending update..."
  ) => {
    if (!beginClinicAction(visitId, actionLabel)) return;

    try {
      const result = await apiRequest<ClinicActionResult>({
        action: "sendUpdate",
        visitId,
        status,
        message,
      });
      setVisits((current) =>
        current.map((visit) => (visit.id === visitId ? result.visit : visit))
      );
      showNotificationIssue(result.notification);
    } catch (error) {
      alert("There was an error updating the visit.");
      console.error(error);
    } finally {
      finishClinicAction(visitId);
    }
  };

  const saveClinicNotes = async (visitId: string, notes: string) => {
    const currentVisit = visits.find((visit) => visit.id === visitId);
    const assignedDoctor = currentVisit
      ? getAssignedDoctorFromNotes(currentVisit.clinicNotes)
      : null;
    const savedPetPhoto = currentVisit
      ? getPetPhotoFromNotes(currentVisit.clinicNotes)
      : "";
    const notesToSave = combineClinicNotes(notes, assignedDoctor, savedPetPhoto);
    
    setVisits((current) =>
      current.map((visit) =>
        visit.id === visitId ? { ...visit, clinicNotes: notesToSave } : visit
      )
    );

    try {
      const result = await apiRequest<{ visit: Visit }>({
        action: "saveClinicNotes",
        visitId,
        clinicNotes: notesToSave,
      });
      setVisits((current) =>
        current.map((visit) => (visit.id === visitId ? result.visit : visit))
      );
    } catch (error) {
      console.error("Error saving clinic notes:", error);
    }
  };

  const assignDoctorToVisit = async (visitId: string, doctorName: string) => {
    const doctor = doctors.find((item) => item.name === doctorName);
    const visit = visits.find((item) => item.id === visitId);
    if (!doctor || !visit) return;
    if (!beginClinicAction(visitId, "Assigning doctor...")) return;

    const message = `Dr. ${doctor.name} is now assigned to ${visit.petName}'s case and will review the plan with you shortly.`;
    const updatedNotes = withDoctorMetadata(visit.clinicNotes, doctor);

    try {
      const result = await apiRequest<ClinicActionResult>({
        action: "assignDoctor",
        visitId,
        clinicNotes: updatedNotes,
        message,
      });
      setVisits((current) =>
        current.map((item) => (item.id === visitId ? result.visit : item))
      );
      showNotificationIssue(result.notification);
    } catch (error) {
      alert("There was an error assigning the doctor.");
      console.error("Error assigning doctor:", error);
    } finally {
      finishClinicAction(visitId);
    }
  };

  const sendFormToVisit = async (
    visit: Visit,
    formType: string,
    formBody: string,
    updateMessage: string
  ) => {
    if (!beginClinicAction(visit.id, "Sending form...")) return;

    try {
      const result = await apiRequest<ClinicActionResult>({
        action: "sendForm",
        visitId: visit.id,
        formType,
        formBody,
        status: visit.status,
        message: updateMessage,
      });
      setVisits((current) =>
        current.map((item) => (item.id === visit.id ? result.visit : item))
      );
      showNotificationIssue(result.notification);
      alert(`${formType} sent to customer`);
    } catch (error) {
      console.error(error);
      alert("Error sending form");
    } finally {
      finishClinicAction(visit.id);
    }
  };

  const sendCustomCareUpdate = (
    visit: Visit,
    status: string,
    promptTitle: string,
    fallbackMessage: string
  ) => {
    const detail = window.prompt(promptTitle);
    sendUpdate(visit.id, status, detail || fallbackMessage);
  };

  const sendEstimateApproval = async (visit: Visit) => {
    const estimateTitle =
      window.prompt("Estimate title", "Emergency treatment estimate") ||
      "Emergency treatment estimate";
    const estimateTotal = window.prompt("Estimate total as a number, for example 1200");
    if (!estimateTotal) return;

    const amount = Number(estimateTotal.replace(/[$,]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter the estimate amount as a number.");
      return;
    }

    const estimateDetails = window.prompt("What is included in the estimate?");
    if (!estimateDetails) return;

    if (!beginClinicAction(visit.id, "Sending estimate...")) return;

    try {
      const result = await apiRequest<ClinicActionResult>({
        action: "createEstimate",
        visitId: visit.id,
        title: estimateTitle,
        amount,
        description: estimateDetails,
      });
      setVisits((current) =>
        current.map((item) => (item.id === visit.id ? result.visit : item))
      );
      showNotificationIssue(result.notification);
      alert("Estimate sent to owner.");
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Error sending estimate");
    } finally {
      finishClinicAction(visit.id);
    }
  };

  const sendDischargeInstructions = (visit: Visit) => {
    const instructions = window.prompt("Enter discharge instructions for the owner");
    if (!instructions) return;

    sendFormToVisit(
      visit,
      "Discharge instructions acknowledgement",
      instructions,
      `${visit.petName}'s discharge instructions are ready for review.`
    );
  };

  const openCareHub = () => {
    setCareHubOpen(true);
    setSelectedCareHubCategoryId(null);
    setSelectedCareHubFormId(null);
  };

  const closeCareHub = () => {
    setCareHubOpen(false);
    setSelectedCareHubCategoryId(null);
    setSelectedCareHubFormId(null);
  };

  const openCareHubCategory = (categoryId: string) => {
    setSelectedCareHubCategoryId(categoryId);
    setSelectedCareHubFormId(null);
  };

  const submitCareHubForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCareHubForm) return;

    const form = new FormData(event.currentTarget);
    const signedName = String(form.get("printedName") || "").trim();
    const signature = String(form.get("signature") || "").trim();
    const accepted = form.get("accepted") === "on";

    if (!signedName || !signature || !accepted) {
      alert("Please complete the printed name, checkbox, and signature.");
      return;
    }

    setSignedCareHubForms((current) => ({
      ...current,
      [selectedCareHubForm.id]: {
        signedName,
        signedAt: new Date().toLocaleString(),
      },
    }));
    setSelectedCareHubFormId(null);
  };

  return (
    <main style={styles.page}>
      {view === "home" && (
        <section style={styles.hero}>
          <div style={styles.brandRow}>
            <div style={styles.logoCrop}>
              <img src="/mypawlink-logo.png" alt="MyPawLink" style={styles.logoImage} />
            </div>
          </div>

          <h1 style={styles.heroTitle}>Stay connected to your pet&apos;s care in real time.</h1>

          <p style={styles.heroSubtitle}>
            Receive updates, approve treatment, and communicate with your veterinary team from your phone.
          </p>

          <div style={styles.buttonRow}>
            <button style={styles.primaryCardButton} onClick={() => setView("newPet")}>
              <span style={styles.bigIcon}><MiniIcon type="paw" /></span>
              <div style={styles.buttonText}>
                <div style={styles.buttonTitle}>Start Visit</div>
                <div style={styles.buttonSubtitle}>
                  Check your pet in before arrival or when you get to the hospital.
                </div>
              </div>
              <span style={styles.cardCta}>Start Visit</span>
            </button>

            <button style={styles.darkCardButton} onClick={() => setView("existingPet")}>
              <span style={styles.bigIcon}><MiniIcon type="search" /></span>
              <div style={styles.buttonText}>
                <div style={styles.buttonTitle}>Track My Pet</div>
                <div style={styles.buttonSubtitle}>
                  Use your secure visit link or access code to view live updates.
                </div>
              </div>
              <span style={styles.cardCtaBlue}>Track My Pet</span>
            </button>
          </div>

          <div style={styles.secureLine}>
            <MiniIcon type="lock" />
            <span>Secure communication between pet owners and care teams.</span>
          </div>

          <div style={styles.statusPreviewCard}>
            <div style={styles.statusPreviewTop}>
              <span style={styles.statusPreviewBadge}>Live update</span>
              <span style={styles.statusPreviewTime}>10:42 AM</span>
            </div>
            <strong>Bella has been checked in.</strong>
            <p style={styles.statusPreviewText}>
              Dr. Smith is reviewing the case. Estimate pending approval.
            </p>
          </div>

          <div style={styles.teamLinkRow}>
            <span>For veterinary teams</span>
            <button style={styles.teamTextButton} onClick={() => setView("referral")}>
              Vet Referral
            </button>
            <button style={styles.teamTextButton} onClick={() => setView("clinic")}>
              Staff Login
            </button>
          </div>
        </section>
      )}

      <section style={styles.mainGrid}>
        <div style={styles.panel}>
          {view === "home" && (
            <section style={styles.homeProductSections}>
              <div style={styles.homeInfoSection}>
                <h2 style={styles.homeSectionTitle}>How MyPawLink Works</h2>
                <div style={styles.homeStepList}>
                  {[
                    "Check in",
                    "Receive live updates",
                    "Approve care",
                    "Pick up your pet",
                  ].map((step, index) => (
                    <div key={step} style={styles.homeStepCard}>
                      <span style={styles.homeStepNumber}>{index + 1}</span>
                      <strong>{step}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.homeInfoSection}>
                <h2 style={styles.homeSectionTitle}>Built for Emergency Veterinary Hospitals</h2>
                <div style={styles.homeBenefitGrid}>
                  {[
                    "Fewer status-check phone calls",
                    "Faster digital intake",
                    "Signed consents and approvals",
                    "Clear discharge communication",
                  ].map((benefit) => (
                    <div key={benefit} style={styles.homeBenefitCard}>
                      <span style={styles.homeBenefitCheck}>OK</span>
                      <strong>{benefit}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.homeDisclaimer}>
                MyPawLink does not replace emergency veterinary medical advice. If your pet is
                experiencing a life-threatening emergency, contact your nearest emergency
                veterinary hospital immediately.
              </div>
            </section>
          )}

          {view === "newPet" && (
            <section id="start-visit-form">
              <div style={styles.visitWizardHeader}>
                <span style={styles.visitStepEyebrow}>Step {visitWizardStep} of 4</span>
                <h2 style={styles.title}>Start Emergency Visit</h2>
                <p style={styles.text}>
                  Need emergency care? Complete this quick check-in so the veterinary team can prepare.
                </p>
              </div>

              <div style={styles.visitProgressTrack}>
                {visitStepLabels.map((label, index) => {
                  const step = index + 1;
                  const active = visitWizardStep === step;
                  const complete = visitWizardStep > step;

                  return (
                    <button
                      key={label}
                      type="button"
                      style={{
                        ...styles.visitProgressStep,
                        ...(active ? styles.visitProgressStepActive : {}),
                        ...(complete ? styles.visitProgressStepComplete : {}),
                      }}
                      onClick={() => {
                        if (step <= visitWizardStep) goToVisitWizardStep(step);
                      }}
                    >
                      <span>{step}</span>
                      <small style={styles.visitProgressLabel}>{label}</small>
                    </button>
                  );
                })}
              </div>

              <form
                onSubmit={createVisit}
                noValidate
                style={styles.visitWizardForm}
              >
                {(Object.entries(visitDraft) as [keyof VisitDraft, string][]).map(
                  ([field, value]) => (
                    <input key={field} type="hidden" name={field} value={value} readOnly />
                  )
                )}

                {visitWizardStep === 1 && (
                  <section style={styles.visitStepCard}>
                    <div>
                      <h3 style={styles.visitStepTitle}>Pet + contact</h3>
                      <p style={styles.visitStepText}>
                        Contact comes first so the team can reach you if anything interrupts check-in.
                      </p>
                    </div>

                    <div style={styles.visitFieldGrid}>
                      <input
                        style={styles.input}
                        value={visitDraft.ownerFirstName}
                        onChange={(e) => updateVisitDraft("ownerFirstName", e.target.value)}
                        placeholder="Owner first name"
                        autoComplete="given-name"
                      />
                      <input
                        style={styles.input}
                        value={visitDraft.ownerLastName}
                        onChange={(e) => updateVisitDraft("ownerLastName", e.target.value)}
                        placeholder="Owner last name"
                        autoComplete="family-name"
                      />
                      <input
                        style={styles.input}
                        value={visitDraft.phone}
                        onChange={(e) => updateVisitDraft("phone", e.target.value)}
                        placeholder="Phone number"
                        inputMode="tel"
                        autoComplete="tel"
                      />
                      <input
                        style={styles.input}
                        value={visitDraft.email}
                        onChange={(e) => updateVisitDraft("email", e.target.value)}
                        placeholder="Email"
                        inputMode="email"
                        autoComplete="email"
                      />
                      <input
                        style={styles.input}
                        value={visitDraft.petName}
                        onChange={(e) => updateVisitDraft("petName", e.target.value)}
                        placeholder="Pet name"
                      />
                      <input
                        style={styles.input}
                        value={visitDraft.petAge}
                        onChange={(e) => updateVisitDraft("petAge", e.target.value)}
                        placeholder="Approx. age (optional)"
                      />
                    </div>

                    {renderVisitChoiceGroup("Pet type", "species", ["Dog", "Cat", "Other"])}

                    {visitDraft.species === "Other" && (
                      <input
                        style={styles.input}
                        value={visitDraft.otherSpecies}
                        onChange={(e) => updateVisitDraft("otherSpecies", e.target.value)}
                        placeholder="Pet type, for example Rabbit or Bird"
                      />
                    )}

                    <div style={styles.visitFieldGrid}>
                      <input
                        style={styles.input}
                        value={visitDraft.breed}
                        onChange={(e) => updateVisitDraft("breed", e.target.value)}
                        placeholder="Breed (if known)"
                        list={
                          visitDraft.species === "Dog"
                            ? "dog-breeds"
                            : visitDraft.species === "Cat"
                              ? "cat-breeds"
                              : undefined
                        }
                      />
                      <datalist id="dog-breeds">
                        {dogBreeds.map((breed) => (
                          <option key={breed} value={breed} />
                        ))}
                      </datalist>
                      <datalist id="cat-breeds">
                        {catBreeds.map((breed) => (
                          <option key={breed} value={breed} />
                        ))}
                      </datalist>
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        step="0.1"
                        value={visitDraft.weight}
                        onChange={(e) => updateVisitDraft("weight", e.target.value)}
                        placeholder="Weight in pounds (if known)"
                        inputMode="decimal"
                      />
                    </div>

                    {renderVisitChoiceGroup("Sex", "sex", sexOptions)}
                    {renderVisitChoiceGroup("Spayed/neutered?", "spayedNeutered", spayedOptions)}
                  </section>
                )}

                {visitWizardStep === 2 && (
                  <section style={styles.visitStepCard}>
                    <div>
                      <h3 style={styles.visitStepTitle}>What&apos;s happening?</h3>
                      <p style={styles.visitStepText}>
                        Choose the closest option. The clinic can adjust it after triage.
                      </p>
                    </div>

                    {renderVisitChoiceGroup("Main concern", "emergencyReason", emergencyReasons, "wide")}
                    {renderVisitChoiceGroup("When did this start?", "whenStartedDays", whenStartedOptions, "wide")}
                    {renderVisitChoiceGroup("Is your pet conscious?", "isConscious", quickAnswerOptions)}
                    {renderVisitChoiceGroup("Breathing normally?", "breathingNormally", quickAnswerOptions)}
                    {renderVisitChoiceGroup("Bleeding?", "bleeding", quickAnswerOptions)}
                    {renderVisitChoiceGroup("Can walk?", "canWalk", quickAnswerOptions)}
                  </section>
                )}

                {visitWizardStep === 3 && (
                  <section style={styles.visitStepCard}>
                    <div>
                      <h3 style={styles.visitStepTitle}>Extra details</h3>
                      <p style={styles.visitStepText}>
                        Optional details help the care team prepare, but you can still send without them.
                      </p>
                    </div>

                    <textarea
                      style={styles.textarea}
                      value={visitDraft.currentMedications}
                      onChange={(e) => updateVisitDraft("currentMedications", e.target.value)}
                      placeholder="Current medications (if any)"
                    />

                    {renderVisitChoiceGroup("Known allergies?", "allergies", ["Yes", "No", "Not sure"])}

                    {visitDraft.allergies === "Yes" && (
                      <input
                        style={styles.input}
                        value={visitDraft.allergyDetails}
                        onChange={(e) => updateVisitDraft("allergyDetails", e.target.value)}
                        placeholder="List known allergies"
                      />
                    )}

                    <label style={styles.photoUploadBox}>
                      <span style={styles.photoUploadTitle}>Photo/video (optional)</span>
                      <span style={styles.photoUploadText}>
                        Upload a photo or short video if it helps explain the concern.
                      </span>
                      <input
                        style={styles.hiddenFileInput}
                        type="file"
                        name="petPhoto"
                        accept="image/*,video/*"
                        onChange={handlePetPhotoChange}
                      />
                      <span style={styles.photoUploadButton}>
                        {petMediaName ? "Change File" : "Choose File"}
                      </span>
                    </label>

                    <div style={styles.photoPreviewCard}>
                      {petPhotoPreview ? (
                        <img src={petPhotoPreview} alt="Pet preview" style={styles.photoPreviewImage} />
                      ) : (
                        <span style={styles.photoEmptyIcon}>+</span>
                      )}
                      <span>
                        {petMediaName
                          ? `${petMediaType === "video" ? "Video" : "Photo"} selected: ${petMediaName}`
                          : "No image uploaded. This is optional."}
                      </span>
                    </div>

                    {renderVisitChoiceGroup("How are you coming in?", "visitType", visitTypeOptions, "wide")}

                    {visitDraft.visitType === "Vet referral" && (
                      <input
                        style={styles.input}
                        value={visitDraft.referralName}
                        onChange={(e) => updateVisitDraft("referralName", e.target.value)}
                        placeholder="Referring vet or clinic name"
                      />
                    )}

                    {renderVisitChoiceGroup(
                      "Has your pet been here before?",
                      "beenHereBefore",
                      ["Yes", "No", "Not sure"]
                    )}

                    <textarea
                      style={styles.textarea}
                      value={visitDraft.reason}
                      onChange={(e) => updateVisitDraft("reason", e.target.value)}
                      placeholder="Anything else the care team should know? (optional)"
                    />
                  </section>
                )}

                {visitWizardStep === 4 && (
                  <section style={styles.visitStepCard}>
                    <div>
                      <h3 style={styles.visitStepTitle}>Ready to send</h3>
                      <p style={styles.visitStepText}>
                        Review the basics, then send this check-in to the veterinary team.
                      </p>
                    </div>

                    <div style={styles.visitReviewGrid}>
                      <div style={styles.visitReviewCard}>
                        <span>Pet</span>
                        <strong>{visitDraft.petName || "Missing pet name"}</strong>
                        <small>
                          {[visitDraft.species, visitDraft.breed, visitDraft.petAge]
                            .filter(Boolean)
                            .join(" / ") || "Species needed"}
                        </small>
                      </div>
                      <div style={styles.visitReviewCard}>
                        <span>Contact</span>
                        <strong>
                          {[visitDraft.ownerFirstName, visitDraft.ownerLastName]
                            .filter(Boolean)
                            .join(" ") || "Missing owner name"}
                        </strong>
                        <small>{visitDraft.phone || visitDraft.email || "Phone and email needed"}</small>
                      </div>
                      <div style={styles.visitReviewCard}>
                        <span>Concern</span>
                        <strong>{visitDraft.emergencyReason || "Missing concern"}</strong>
                        <small>{visitDraft.whenStartedDays || "Start time needed"}</small>
                      </div>
                      <div style={styles.visitReviewCard}>
                        <span>Triage</span>
                        <strong>
                          {[
                            `Conscious: ${visitDraft.isConscious || "-"}`,
                            `Breathing: ${visitDraft.breathingNormally || "-"}`,
                          ].join(" / ")}
                        </strong>
                        <small>
                          Bleeding: {visitDraft.bleeding || "-"} / Can walk: {visitDraft.canWalk || "-"}
                        </small>
                      </div>
                    </div>
                  </section>
                )}

                {visitSubmitError && <div style={styles.errorBox}>{visitSubmitError}</div>}
                {visitMissingFields.length > 0 && (
                  <div style={styles.missingInfoBox}>
                    <strong>Missing required information</strong>
                    <p>Please complete these fields before submitting:</p>
                    <ul style={styles.missingInfoList}>
                      {visitMissingFields.map((field) => (
                        <li key={field}>{field}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {visitSubmitMessage && <div style={styles.authMessage}>{visitSubmitMessage}</div>}

                <div style={styles.visitWizardNav}>
                  {visitWizardStep > 1 && (
                    <button
                      style={styles.visitBackButton}
                      type="button"
                      onClick={backVisitWizard}
                      disabled={submittingVisit}
                    >
                      Back
                    </button>
                  )}

                  {visitWizardStep < 4 ? (
                    <button
                      style={{ ...styles.primaryButton, ...styles.visitForwardButton }}
                      type="button"
                      onClick={continueVisitWizard}
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      style={{
                        ...styles.primaryButton,
                        ...styles.visitForwardButton,
                        ...(submittingVisit ? styles.disabledButton : {}),
                      }}
                      type="submit"
                      disabled={submittingVisit}
                    >
                      {submittingVisit ? "Sending Check-In..." : "Send Check-In"}
                    </button>
                  )}
                </div>
              </form>
            </section>
          )}
          {view === "referral" && (
            <section id="referral-transfer-form">
              <div style={styles.referralWizardHero}>
                <span style={styles.visitStepEyebrow}>Step {referralWizardStep} of 6</span>
                <h2 style={styles.title}>Emergency Referral Transfer</h2>
                <p style={styles.text}>Quickly send patient details before transfer.</p>
                <div style={styles.referralCompactNotice}>Send patient information before transfer.</div>
              </div>

              <div style={{ ...styles.visitProgressTrack, gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
                {referralStepLabels.map((label, index) => {
                  const step = index + 1;
                  const active = referralWizardStep === step;
                  const complete = referralWizardStep > step;

                  return (
                    <button
                      key={label}
                      type="button"
                      style={{
                        ...styles.visitProgressStep,
                        ...(active ? styles.visitProgressStepActive : {}),
                        ...(complete ? styles.visitProgressStepComplete : {}),
                      }}
                      onClick={() => {
                        if (step <= referralWizardStep) goToReferralWizardStep(step);
                      }}
                    >
                      <span>{step}</span>
                      <small style={styles.visitProgressLabel}>{label}</small>
                    </button>
                  );
                })}
              </div>

              <form
                ref={referralFormRef}
                onSubmit={createReferralVisit}
                noValidate
                onChange={() => {
                  if (referralSubmitError) setReferralSubmitError("");
                  if (referralMissingFields.length) setReferralMissingFields([]);
                }}
                style={styles.visitWizardForm}
              >
                <input type="hidden" name="stabilityLevel" value={selectedReferralUrgency} readOnly />
                <input type="hidden" name="ivFluids" value={selectedReferralIvFluids} readOnly />
                <input type="hidden" name="referringAddress" value={referralLocationLabel} readOnly />
                <input type="hidden" name="preferredCallbackNumber" value="" readOnly />

                <section
                  style={{
                    ...styles.visitStepCard,
                    display: referralWizardStep === 1 ? "grid" : "none",
                  }}
                >
                  <div>
                    <h3 style={styles.visitStepTitle}>Referring clinic</h3>
                    <p style={styles.visitStepText}>
                      Direct contact details so the receiving team can call back quickly.
                    </p>
                  </div>

                  <div style={styles.visitFieldGrid}>
                    <input style={styles.input} name="referringClinic" placeholder="Referring clinic" />
                    <input style={styles.input} name="referringDoctor" placeholder="Referring doctor" />
                    <input
                      style={styles.input}
                      name="doctorPhone"
                      placeholder="Callback number"
                      inputMode="tel"
                    />
                    <input
                      style={styles.input}
                      name="doctorEmail"
                      placeholder="Doctor email"
                      inputMode="email"
                    />
                  </div>

                  <button
                    style={styles.referralLocationButton}
                    type="button"
                    onClick={useReferralCurrentLocation}
                  >
                    Use my current location
                  </button>
                  {referralLocationLabel && (
                    <div style={styles.referralLocationNote}>Location added: {referralLocationLabel}</div>
                  )}
                </section>

                <section
                  style={{
                    ...styles.visitStepCard,
                    display: referralWizardStep === 2 ? "grid" : "none",
                  }}
                >
                  <div>
                    <h3 style={styles.visitStepTitle}>Patient information</h3>
                    <p style={styles.visitStepText}>Just the details needed before transfer.</p>
                  </div>

                  <div style={styles.visitFieldGrid}>
                    <input style={styles.input} name="petName" placeholder="Pet name" />
                    <select
                      style={styles.input}
                      name="species"
                      value={selectedReferralSpecies}
                      onChange={(e) => {
                        clearReferralFeedback();
                        setSelectedReferralSpecies(e.target.value);
                      }}
                    >
                      <option value="">Species</option>
                      <option value="Dog">Dog</option>
                      <option value="Cat">Cat</option>
                      <option value="Other">Other</option>
                    </select>
                    {selectedReferralSpecies === "Other" && (
                      <input
                        style={styles.input}
                        name="otherSpecies"
                        placeholder="Pet type, for example Rabbit or Bird"
                      />
                    )}
                    <input style={styles.input} name="breed" placeholder="Breed (if known)" />
                    <input style={styles.input} name="age" placeholder="Approx age" />
                    <select style={styles.input} name="sex">
                      <option value="">Sex</option>
                      <option value="Female">Female</option>
                      <option value="Female spayed">Female spayed</option>
                      <option value="Male">Male</option>
                      <option value="Male neutered">Male neutered</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                    <input
                      style={styles.input}
                      name="weight"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Weight in pounds"
                      inputMode="decimal"
                    />
                  </div>

                  <button
                    style={styles.referralOwnerToggle}
                    type="button"
                    onClick={() => setReferralOwnerExpanded((current) => !current)}
                  >
                    {referralOwnerExpanded ? "Hide owner contact" : "Add owner contact (optional)"}
                  </button>

                  <div
                    style={{
                      ...styles.referralOwnerPanel,
                      display: referralOwnerExpanded ? "grid" : "none",
                    }}
                  >
                    <input style={styles.input} name="ownerFirstName" placeholder="Owner first name" />
                    <input style={styles.input} name="ownerLastName" placeholder="Owner last name" />
                    <input style={styles.input} name="ownerPhone" placeholder="Owner phone" inputMode="tel" />
                    <input style={styles.input} name="ownerEmail" placeholder="Owner email" inputMode="email" />
                  </div>
                </section>

                <section
                  style={{
                    ...styles.visitStepCard,
                    display: referralWizardStep === 3 ? "grid" : "none",
                  }}
                >
                  <div>
                    <h3 style={styles.visitStepTitle}>Clinical summary</h3>
                    <p style={styles.visitStepText}>Structured details the receiving doctor can scan fast.</p>
                  </div>

                  <div style={styles.visitFieldGrid}>
                    <select style={styles.input} name="referralType">
                      <option value="">Referral type</option>
                      {referralTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <select style={styles.input} name="transferTime">
                      <option value="">ETA</option>
                      {referralEtaOptions.map((eta) => (
                        <option key={eta} value={eta}>
                          {eta}
                        </option>
                      ))}
                    </select>
                  </div>

                  {renderReferralButtonGroup(
                    "Urgency",
                    selectedReferralUrgency,
                    setSelectedReferralUrgency,
                    stabilityLevels
                  )}

                  <div style={styles.visitFieldGrid}>
                    <input style={styles.input} name="reason" placeholder="Presenting problem" />
                    <input style={styles.input} name="suspectedDiagnosis" placeholder="Suspected diagnosis" />
                  </div>

                  <textarea
                    style={styles.textarea}
                    name="clinicalSummary"
                    placeholder="Brief clinical summary"
                  />
                </section>

                <section
                  style={{
                    ...styles.visitStepCard,
                    display: referralWizardStep === 4 ? "grid" : "none",
                  }}
                >
                  <div>
                    <h3 style={styles.visitStepTitle}>Treatment already provided</h3>
                    <p style={styles.visitStepText}>Capture what has already been done before transfer.</p>
                  </div>

                  {renderReferralButtonGroup(
                    "IV fluids?",
                    selectedReferralIvFluids,
                    setSelectedReferralIvFluids,
                    ["Yes", "No"]
                  )}

                  <textarea
                    style={styles.textarea}
                    name="medications"
                    placeholder="Medications given"
                  />

                  <textarea
                    style={styles.textarea}
                    name="treatmentGiven"
                    placeholder="Treatment notes (optional)"
                  />

                  <div style={styles.referralSubsection}>
                    <strong>Procedures completed</strong>
                    <div style={styles.checkboxGrid}>
                      {referralProcedureOptions.map((item) => (
                        <label key={item} style={styles.radioBox}>
                          <input type="checkbox" name="proceduresCompleted" value={item} /> {item}
                        </label>
                      ))}
                    </div>
                  </div>
                </section>

                <section
                  style={{
                    ...styles.visitStepCard,
                    display: referralWizardStep === 5 ? "grid" : "none",
                  }}
                >
                  <div>
                    <h3 style={styles.visitStepTitle}>Upload supporting documents</h3>
                    <p style={styles.visitStepText}>Doctors often photograph records. Make that fast here.</p>
                  </div>

                  <div style={styles.referralSubsection}>
                    <strong>What are you sending?</strong>
                    <div style={styles.checkboxGrid}>
                      {referralDocumentTypes.map((item) => (
                        <label key={item} style={styles.radioBox}>
                          <input type="checkbox" name="documentsIncluded" value={item} /> {item}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={styles.referralUploadGrid}>
                    <label style={styles.referralUploadAction}>
                      <span style={styles.referralUploadIcon}>📷</span>
                      <strong>Take Photo</strong>
                      <small>Paperwork, X-rays, wounds, labels</small>
                      <input
                        style={styles.hiddenFileInput}
                        type="file"
                        name="referralDocuments"
                        accept="image/*,video/*"
                        capture="environment"
                        multiple
                        onChange={handleReferralDocumentsChange}
                      />
                    </label>

                    <label style={styles.referralUploadAction}>
                      <span style={styles.referralUploadIcon}>📎</span>
                      <strong>Upload Files</strong>
                      <small>PDFs, labs, images, videos</small>
                      <input
                        style={styles.hiddenFileInput}
                        type="file"
                        name="referralDocuments"
                        accept=".pdf,.doc,.docx,.dcm,image/*,video/*"
                        multiple
                        onChange={handleReferralDocumentsChange}
                      />
                    </label>
                  </div>

                  {referralDocumentNames.length > 0 && (
                    <div style={styles.referralPreviewGrid}>
                      {referralDocumentPreviews.map((preview) => (
                        <div key={preview.name} style={styles.referralPreviewCard}>
                          {preview.url ? (
                            <img src={preview.url} alt={preview.name} style={styles.referralPreviewImage} />
                          ) : (
                            <span style={styles.referralPreviewIcon}>
                              {preview.type.startsWith("video/") ? "Video" : "File"}
                            </span>
                          )}
                          <span>{preview.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section
                  style={{
                    ...styles.visitStepCard,
                    display: referralWizardStep === 6 ? "grid" : "none",
                  }}
                >
                  <div>
                    <h3 style={styles.visitStepTitle}>Review referral</h3>
                    <p style={styles.visitStepText}>Confirm the transfer summary before sending.</p>
                  </div>

                  <div style={styles.visitReviewGrid}>
                    <div style={styles.visitReviewCard}>
                      <span>Clinic</span>
                      <strong>{referralReviewSnapshot.referringClinic || "Missing clinic"}</strong>
                      <small>{referralReviewSnapshot.referringDoctor || "Doctor needed"}</small>
                    </div>
                    <div style={styles.visitReviewCard}>
                      <span>Patient</span>
                      <strong>{referralReviewSnapshot.petName || "Missing pet"}</strong>
                      <small>
                        {[referralReviewSnapshot.species, referralReviewSnapshot.age, referralReviewSnapshot.weight]
                          .filter(Boolean)
                          .join(" / ") || "Patient basics"}
                      </small>
                    </div>
                    <div style={styles.visitReviewCard}>
                      <span>Urgency</span>
                      <strong>{referralReviewSnapshot.stabilityLevel || "Missing urgency"}</strong>
                      <small>ETA: {referralReviewSnapshot.transferTime || "Not provided"}</small>
                    </div>
                    <div style={styles.visitReviewCard}>
                      <span>Files</span>
                      <strong>{referralDocumentNames.length}</strong>
                      <small>{referralDocumentNames.length === 1 ? "file uploaded" : "files uploaded"}</small>
                    </div>
                  </div>
                </section>

                {referralSubmitError && <div style={styles.errorBox}>{referralSubmitError}</div>}
                {referralMissingFields.length > 0 && (
                  <div style={styles.missingInfoBox}>
                    <strong>Missing required information</strong>
                    <p>Please complete these fields before submitting:</p>
                    <ul style={styles.missingInfoList}>
                      {referralMissingFields.map((field) => (
                        <li key={field}>{field}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {referralSubmitMessage && (
                  <div style={styles.authMessage}>{referralSubmitMessage}</div>
                )}

                <div style={styles.referralWizardNav}>
                  {referralWizardStep > 1 && (
                    <button
                      style={styles.visitBackButton}
                      type="button"
                      onClick={backReferralWizard}
                      disabled={submittingReferral}
                    >
                      Back
                    </button>
                  )}

                  {referralWizardStep < 6 ? (
                    <button
                      style={{ ...styles.primaryButton, ...styles.visitForwardButton }}
                      type="button"
                      onClick={continueReferralWizard}
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      style={{
                        ...styles.primaryButton,
                        ...styles.visitForwardButton,
                        ...(submittingReferral ? styles.disabledButton : {}),
                      }}
                      type="submit"
                      disabled={submittingReferral}
                    >
                      {submittingReferral
                        ? "Sending Referral..."
                        : "Send Referral to Receiving Team"}
                    </button>
                  )}
                </div>
              </form>
            </section>
          )}
          {view === "existingPet" && (
            <section style={styles.trackPage}>
              <div style={styles.trackHeader}>
                <h2 style={styles.trackTitle}>Check on Your Pet <span aria-hidden="true">&hearts;</span></h2>
                <p style={styles.trackSubtitle}>
                  Secure access to live updates from your veterinary team.
                </p>
              </div>

              <div style={styles.ownerAccessCard}>
                {!ownerCodeSent ? (
                  <>
                    <div>
                      <h3 style={styles.trackCardTitle}>Owner Access</h3>
                      <p style={styles.trackCardText}>
                        Receive a one-time access code to view and manage your pet&apos;s visit.
                      </p>
                    </div>

                    <form style={styles.trackForm} onSubmit={sendOwnerAccessCode}>
                      <label style={styles.trackFieldLabel}>
                        Phone number or email
                        <input
                          style={styles.trackInput}
                          type="text"
                          value={ownerAccessEmail}
                          onChange={(event) => {
                            setOwnerAccessEmail(event.target.value);
                            setOwnerCodeSent(false);
                            setOwnerAccessCode("");
                            setAuthMessage("");
                          }}
                          placeholder="Enter your phone number or email"
                          required
                        />
                      </label>
                      <button
                        style={{
                          ...styles.trackPrimaryButton,
                          ...(authLoading ? styles.disabledButton : {}),
                        }}
                        type="submit"
                        disabled={authLoading}
                      >
                        {authLoading ? "Sending..." : "Send Access Code"}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 style={styles.trackCardTitle}>Verify Access</h3>
                      <p style={styles.trackCardText}>
                        We sent a 6-digit code to {getAccessDestinationLabel()}.
                      </p>
                    </div>

                    <form style={styles.trackForm} onSubmit={verifyOwnerAccessCode}>
                      <label style={styles.trackFieldLabel}>
                        6-digit code
                        <input
                          style={styles.trackInput}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          value={ownerAccessCode}
                          onChange={(event) =>
                            setOwnerAccessCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                          }
                          placeholder="Enter code"
                          required
                        />
                      </label>
                      <button
                        style={{
                          ...styles.trackPrimaryButton,
                          ...(authLoading || ownerAccessCode.length < 6
                            ? styles.disabledButton
                            : {}),
                        }}
                        type="submit"
                        disabled={authLoading || ownerAccessCode.length < 6}
                      >
                        {authLoading ? "Verifying..." : "Verify & Open Visits"}
                      </button>
                    </form>

                    <button
                      type="button"
                      style={styles.trackTextButton}
                      onClick={() => {
                        setOwnerCodeSent(false);
                        setOwnerAccessCode("");
                        setAuthMessage("");
                      }}
                    >
                      Use a different phone/email
                    </button>
                  </>
                )}

                <div style={styles.trackFeatureNote}>
                  <strong>Full access includes:</strong>
                  <span>Live updates</span>
                  <span>Form signing</span>
                  <span>Estimate approvals</span>
                  <span>Discharge instructions</span>
                </div>

                {authMessage && <div style={styles.authMessage}>{authMessage}</div>}
              </div>

              <div style={styles.sharedAccessCard}>
                <div>
                  <h3 style={styles.trackCardTitle}>Shared Family Access</h3>
                  <p style={styles.trackCardText}>
                    Have a secure view-only link from the pet owner or veterinary team?
                  </p>
                </div>

                <form
                  style={styles.trackForm}
                  onSubmit={async (e) => {
                    e.preventDefault();

                    setSearchError("");
                    setLoading(true);

                    const token = getTokenFromInput(visitAccessInput);

                    if (!token) {
                      setSearchError("Please paste a secure visit link.");
                      setLoading(false);
                      return;
                    }

                    if (/^\d{6}$/.test(token)) {
                      setSearchError(
                        "That looks like an owner access code. Enter it in the Owner Access card above."
                      );
                      setLoading(false);
                      return;
                    }

                    try {
                      const result = await apiRequest<{ visit: Visit }>({
                        action: "loadVisitByToken",
                        token,
                      });
                      setLoading(false);

                      setVisits((current) =>
                        current.some((currentVisit) => currentVisit.id === result.visit.id)
                          ? current.map((currentVisit) =>
                              currentVisit.id === result.visit.id
                                ? { ...currentVisit, ...result.visit }
                                : currentVisit
                            )
                          : [result.visit, ...current]
                      );
                      setSelectedVisitId(result.visit.id);
                      setOwnerPortalTab("home");
                      setOwnerPortalMode("shared");
                      setView("status");
                    } catch (error) {
                      setLoading(false);
                      setSearchError(
                        error instanceof Error
                          ? error.message
                          : "We could not open that visit link. Please check it and try again."
                      );
                      console.error(error);
                    }
                  }}
                >
                  <label style={styles.trackFieldLabel}>
                    Secure visit link
                    <input
                      style={styles.trackInput}
                      value={visitAccessInput}
                      onChange={(event) => setVisitAccessInput(event.target.value)}
                      placeholder="Paste shared visit link"
                    />
                  </label>

                  <button
                    style={{
                      ...styles.trackSecondaryButton,
                      ...(loading ? styles.disabledButton : {}),
                    }}
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "Opening..." : "Open Shared View"}
                  </button>
                </form>

                <p style={styles.trackSmallNote}>View-only access. No approvals or form signing.</p>
              </div>

              {loading && <p style={styles.text}>Opening secure visit...</p>}
              {searchError && <div style={styles.errorBox}>{searchError}</div>}

              {authUserEmail && (
                <div style={styles.ownerVisitPanel}>
                  <div>
                    <h3 style={styles.ownerVisitTitle}>Your Pets</h3>
                    <p style={styles.authHelpText}>Choose a pet to open live updates.</p>
                  </div>

                  {ownerVisitsLoading && <div style={styles.authMessage}>Loading your pets...</div>}
                  {ownerVisitsError && <div style={styles.errorBox}>{ownerVisitsError}</div>}
                  {!ownerVisitsLoading && !ownerVisitsError && ownerVisits.length === 0 && (
                    <div style={styles.trackEmptyState}>
                      <strong>No Active Visits Found</strong>
                      <span>
                        If your pet was recently checked in, it may take a few minutes to appear here.
                      </span>
                      <span>
                        If someone shared a direct visit link with you, use Shared Family Access above.
                      </span>
                      <button
                        type="button"
                        style={styles.trackSecondaryButton}
                        onClick={loadOwnerVisits}
                        disabled={ownerVisitsLoading}
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                  <div style={styles.ownerVisitList}>
                    {ownerVisits.map((visit) => (
                      <button
                        key={visit.id}
                        type="button"
                        style={styles.ownerVisitCard}
                        onClick={() => {
                          setVisits((current) =>
                            current.some((currentVisit) => currentVisit.id === visit.id)
                              ? current.map((currentVisit) =>
                                  currentVisit.id === visit.id ? visit : currentVisit
                                )
                              : [visit, ...current]
                          );
                          setSelectedVisitId(visit.id);
                          setVisitAccessInput(visit.accessUrl || visit.accessToken || "");
                          setOwnerPortalTab("home");
                          setOwnerPortalMode("owner");
                          setView("status");
                        }}
                      >
                        <img src={getPetPhoto(visit)} alt={visit.petName} style={styles.ownerVisitImage} />
                        <span style={styles.ownerVisitContent}>
                          <strong>{visit.petName} <span aria-hidden="true">&#128062;</span></strong>
                          <span>
                            {isDischargedVisit(visit)
                              ? "Discharged"
                              : `${visit.visitType || "Emergency visit"} in progress`}
                          </span>
                          <span>{clinicSettings.name || "MyPawLink Emergency Hospital"}</span>
                          <small>{getVisitRelativeTime(visit)}</small>
                        </span>
                        <span style={styles.ownerVisitArrow}>
                          {isDischargedVisit(visit) ? "View Discharge" : "Open Updates"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
    {view === "clinic" && (
            <section>
              {!clinicUnlocked ? (
                <div style={styles.clinicLoginCard}>
                  <h2 style={styles.title}>Clinic Dashboard</h2>
                  <p style={styles.text}>Sign in with your clinic staff account to view requests and send updates.</p>
                  {staffProfile ? (
                    <div style={styles.authPanel}>
                      <strong>
                        {staffProfile.fullName || staffProfile.email} - {staffProfile.role}
                      </strong>
                      <p style={styles.authHelpText}>
                        Staff session found. Open the protected clinic dashboard.
                      </p>
                      <button
                        style={{
                          ...styles.primaryButton,
                          ...(clinicLoading ? styles.disabledButton : {}),
                        }}
                        onClick={() => loadVisits()}
                        disabled={clinicLoading}
                      >
                        {clinicLoading ? "Opening..." : "Open Dashboard"}
                      </button>
                    </div>
                  ) : (
                    <form style={styles.authForm} onSubmit={signInClinicStaff}>
                      <input
                        style={styles.input}
                        type="email"
                        value={staffLoginEmail}
                        onChange={(event) => setStaffLoginEmail(event.target.value)}
                        placeholder="Staff email"
                        required
                      />
                      <input
                        style={styles.input}
                        type="password"
                        value={staffLoginPassword}
                        onChange={(event) => setStaffLoginPassword(event.target.value)}
                        placeholder="Password"
                        required
                      />
                      <button
                        style={{
                          ...styles.primaryButton,
                          ...(authLoading ? styles.disabledButton : {}),
                        }}
                        type="submit"
                        disabled={authLoading}
                      >
                        {authLoading ? "Signing in..." : "Sign In as Clinic Staff"}
                      </button>
                    </form>
                  )}
                  {authUserEmail && (
                    <button style={styles.staffSignOutButton} onClick={signOut}>
                      Sign Out
                    </button>
                  )}
                  {authMessage && <div style={styles.authMessage}>{authMessage}</div>}
                  {clinicError && <div style={styles.errorBox}>{clinicError}</div>}
                </div>
              ) : clinicWorkflowView === "messages" ? (
                <>
                <div style={styles.dashboardHeader}>
                  <div>
                    <h2 style={styles.title}>{clinicSettings.name || "Clinic Dashboard"}</h2>
                    <p style={styles.text}>
                      Owner communication layer for live updates, approvals, referrals, and discharge.
                    </p>
                  </div>
                  <span style={styles.counter}>
                    {activeVisits.length} Active / {closedVisits.length} Closed
                  </span>
                </div>

                <nav style={styles.clinicMainNav} aria-label="Clinic workflow">
                  {[
                    ["patients", "Patients"],
                    ["referrals", "Referrals"],
                    ["approvals", "Approvals"],
                    ["messages", "Messages"],
                    ["more", "More"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      style={{
                        ...styles.clinicMainNavButton,
                        ...(clinicWorkflowView === id ? styles.clinicMainNavButtonActive : {}),
                      }}
                      onClick={() => {
                        const nextView = id as ClinicWorkflowView;
                        setClinicWorkflowView(nextView);
                        setClinicSelectedVisitId(null);
                        setSelectedReferralId(null);
                        if (nextView === "approvals") setClinicDashboardView("approvals");
                        if (nextView === "patients") setClinicDashboardView("active");
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </nav>

                <section style={styles.referralDashboardPanel}>
                  <div style={styles.referralDashboardHeader}>
                    <div>
                      <h3 style={styles.ownerVisitTitle}>Messages</h3>
                      <p style={styles.authHelpText}>
                        Recent owner-facing updates and quick access to each visit communication hub.
                      </p>
                    </div>
                  </div>
                  <div style={styles.visitList}>
                    {activeVisits.map((visit) => (
                      <article key={visit.id} style={styles.referralCard}>
                        <div style={styles.referralCardHeader}>
                          <div>
                            <h4 style={styles.referralPetName}>{visit.petName}</h4>
                            <p style={styles.text}>Owner: {getOwnerName(visit)}</p>
                          </div>
                          <span style={styles.referralStatusBadge}>{visit.status}</span>
                        </div>
                        <div style={styles.latestMessagePreview}>
                          {visit.updates[visit.updates.length - 1]?.message ||
                            "No owner update sent yet."}
                        </div>
                        <button
                          type="button"
                          style={styles.primaryButton}
                          onClick={() => {
                            setClinicWorkflowView("patients");
                            setClinicDashboardView("active");
                            setCommunicationTab(visit.id, "owner");
                            setSelectedReferralId(null);
                            setClinicSelectedVisitId(visit.id);
                          }}
                        >
                          Open Communication Hub
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
                </>
              ) : (
                <>
              <div style={styles.dashboardHeader}>
                <div>
                  <h2 style={styles.title}>{clinicSettings.name || "Clinic Dashboard"}</h2>
                  <p style={styles.text}>
                    Owner communication layer for live updates, approvals, referrals, and discharge.
                  </p>
                </div>
                <span style={styles.counter}>
                  {activeVisits.length} Active / {closedVisits.length} Closed
                </span>
              </div>

              <nav style={styles.clinicMainNav} aria-label="Clinic workflow">
                {[
                  ["patients", "Patients"],
                  ["referrals", "Referrals"],
                  ["approvals", "Approvals"],
                  ["messages", "Messages"],
                  ["more", "More"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    style={{
                      ...styles.clinicMainNavButton,
                      ...(clinicWorkflowView === id ? styles.clinicMainNavButtonActive : {}),
                    }}
                    onClick={() => {
                        const nextView = id as ClinicWorkflowView;
                        setClinicWorkflowView(nextView);
                        setClinicSelectedVisitId(null);
                        setSelectedReferralId(null);
                        if (nextView === "approvals") setClinicDashboardView("approvals");
                        if (nextView === "patients") setClinicDashboardView("active");
                      }}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              {clinicWorkflowView !== "more" && !clinicSelectedVisit && !selectedReferral && (
              <div style={styles.clinicCommandCenter}>
                <div style={styles.operationsBoardGrid}>
                  {operationsBoardCards.map((card) => (
                    <button
                      key={card.label}
                      type="button"
                      style={styles.operationsBoardCard}
                      onClick={() => {
                        setClinicWorkflowView(card.target);
                        setClinicSelectedVisitId(null);
                        setSelectedReferralId(null);
                        if (card.view) setClinicDashboardView(card.view);
                        if (card.referralStatus) setReferralDashboardStatus(card.referralStatus);
                      }}
                    >
                      <span>{card.label}</span>
                      <strong>{card.count}</strong>
                    </button>
                  ))}
                </div>

                {clinicWorkflowView === "patients" && (
                  <>
                    <div style={styles.clinicViewTabs}>
                      {dashboardTabs.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          style={{
                            ...styles.clinicViewTab,
                            ...(clinicDashboardView === tab.id ? styles.clinicViewTabActive : {}),
                          }}
                          onClick={() => {
                            setClinicSelectedVisitId(null);
                            setClinicDashboardView(tab.id);
                          }}
                        >
                          <span>{tab.label}</span>
                          <strong>{tab.count}</strong>
                        </button>
                      ))}
                    </div>

                    <div style={styles.clinicFilterBar}>
                      <input
                        style={styles.clinicSearchInput}
                        value={clinicSearch}
                        onChange={(event) => setClinicSearch(event.target.value)}
                        placeholder="Search pet, owner, phone, status, doctor"
                      />
                      <select
                        style={styles.clinicCompactSelect}
                        value={clinicStatusFilter}
                        onChange={(event) => setClinicStatusFilter(event.target.value)}
                      >
                        <option>All statuses</option>
                        {clinicStatuses.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                      <select
                        style={styles.clinicCompactSelect}
                        value={clinicDoctorFilter}
                        onChange={(event) => setClinicDoctorFilter(event.target.value)}
                      >
                        <option>All doctors</option>
                        {clinicDoctors.map((doctor) => (
                          <option key={doctor}>{doctor}</option>
                        ))}
                      </select>
                      <select
                        style={styles.clinicCompactSelect}
                        value={clinicSort}
                        onChange={(event) => setClinicSort(event.target.value as ClinicSort)}
                      >
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="pet">Pet name</option>
                        <option value="status">Status</option>
                      </select>
                    </div>

                    <p style={styles.clinicResultText}>
                      Showing {filteredClinicVisits.length} of {visitsForDashboardView.length}{" "}
                      {dashboardTabs
                        .find((tab) => tab.id === clinicDashboardView)
                        ?.label.toLowerCase()}
                    </p>
                  </>
                )}
              </div>
              )}

              {clinicWorkflowView === "more" && (
                <form style={styles.clinicSettingsPanel} onSubmit={saveClinicSettings}>
                  <div style={styles.clinicSettingsHeader}>
                    <div>
                      <h3 style={styles.ownerVisitTitle}>More</h3>
                      <p style={styles.authHelpText}>
                        Clinic profile, roles, templates, forms, branding, integrations, and access.
                      </p>
                    </div>
                    <span style={styles.speciesPill}>Clinic Admin</span>
                  </div>

                  <div style={styles.moreMenuGrid}>
                    {[
                      "Clinic Profile",
                      "Users & Roles",
                      "Communication Templates",
                      "Forms Library",
                      "Branding",
                      "Integrations",
                    ].map((item) => (
                      <div key={item} style={styles.moreMenuCard}>
                        <strong>{item}</strong>
                        <span>
                          {item === "Integrations"
                            ? "PIMS and owner notification readiness"
                            : item === "Communication Templates"
                              ? "Reusable owner update wording"
                              : item === "Forms Library"
                                ? "Consent and approval templates"
                                : "Clinic administration"}
                        </span>
                      </div>
                    ))}
                    <button type="button" style={styles.moreMenuLogout} onClick={signOut}>
                      Logout
                    </button>
                  </div>

                  <h4 style={styles.workflowSectionTitle}>Clinic Profile & Branding</h4>

                  {clinicSettingsDraft.setupRequired && (
                    <div style={styles.queueMiniCard}>
                      Run the Phase 9 SQL file in Supabase to make these settings permanent.
                    </div>
                  )}

                  <div style={styles.settingsGrid}>
                    <input
                      style={styles.input}
                      value={clinicSettingsDraft.name}
                      onChange={(event) => updateClinicSettingsDraft("name", event.target.value)}
                      placeholder="Hospital name"
                      required
                    />
                    <input
                      style={styles.input}
                      value={clinicSettingsDraft.phone}
                      onChange={(event) => updateClinicSettingsDraft("phone", event.target.value)}
                      placeholder="Clinic phone"
                    />
                    <input
                      style={styles.input}
                      type="email"
                      value={clinicSettingsDraft.email}
                      onChange={(event) => updateClinicSettingsDraft("email", event.target.value)}
                      placeholder="Clinic email"
                    />
                    <input
                      style={styles.input}
                      value={clinicSettingsDraft.logoUrl}
                      onChange={(event) => updateClinicSettingsDraft("logoUrl", event.target.value)}
                      placeholder="Logo URL"
                    />
                    <input
                      style={styles.input}
                      value={clinicSettingsDraft.address}
                      onChange={(event) => updateClinicSettingsDraft("address", event.target.value)}
                      placeholder="Address"
                    />
                    <input
                      style={styles.input}
                      value={clinicSettingsDraft.city}
                      onChange={(event) => updateClinicSettingsDraft("city", event.target.value)}
                      placeholder="City"
                    />
                    <input
                      style={styles.input}
                      value={clinicSettingsDraft.state}
                      onChange={(event) => updateClinicSettingsDraft("state", event.target.value)}
                      placeholder="State"
                    />
                    <input
                      style={styles.input}
                      value={clinicSettingsDraft.zip}
                      onChange={(event) => updateClinicSettingsDraft("zip", event.target.value)}
                      placeholder="ZIP"
                    />
                    <label style={styles.settingsFieldLabel}>
                      Primary color
                      <input
                        style={styles.colorInput}
                        type="color"
                        value={clinicSettingsDraft.primaryColor}
                        onChange={(event) =>
                          updateClinicSettingsDraft("primaryColor", event.target.value)
                        }
                      />
                    </label>
                    <label style={styles.settingsFieldLabel}>
                      Accent color
                      <input
                        style={styles.colorInput}
                        type="color"
                        value={clinicSettingsDraft.secondaryColor}
                        onChange={(event) =>
                          updateClinicSettingsDraft("secondaryColor", event.target.value)
                        }
                      />
                    </label>
                    <input
                      style={styles.input}
                      type="number"
                      min="0"
                      value={clinicSettingsDraft.estimatedWaitMinutes}
                      onChange={(event) =>
                        updateClinicSettingsDraft("estimatedWaitMinutes", Number(event.target.value))
                      }
                      placeholder="Default wait minutes"
                    />
                    <input
                      style={styles.input}
                      type="number"
                      min="0"
                      value={clinicSettingsDraft.aftercareFollowupHours}
                      onChange={(event) =>
                        updateClinicSettingsDraft("aftercareFollowupHours", Number(event.target.value))
                      }
                      placeholder="Aftercare follow-up hours"
                    />
                    <select
                      style={styles.input}
                      value={clinicSettingsDraft.defaultUpdateCadence}
                      onChange={(event) =>
                        updateClinicSettingsDraft("defaultUpdateCadence", event.target.value)
                      }
                    >
                      <option value="milestone">Milestone updates</option>
                      <option value="hourly">Hourly while hospitalized</option>
                      <option value="shift">Each shift handoff</option>
                    </select>
                    <select
                      style={styles.input}
                      value={clinicSettingsDraft.cprDefault}
                      onChange={(event) => updateClinicSettingsDraft("cprDefault", event.target.value)}
                    >
                      <option value="ask-owner">Ask owner every visit</option>
                      <option value="full-cpr">Default to Full CPR form</option>
                      <option value="dnr">Default to DNR form</option>
                    </select>
                  </div>

                  <div style={styles.settingsToggleRow}>
                    <label style={styles.settingsToggle}>
                      <input
                        type="checkbox"
                        checked={clinicSettingsDraft.formsEnabled}
                        onChange={(event) =>
                          updateClinicSettingsDraft("formsEnabled", event.target.checked)
                        }
                      />
                      Forms enabled
                    </label>
                    <label style={styles.settingsToggle}>
                      <input
                        type="checkbox"
                        checked={clinicSettingsDraft.smsEnabled}
                        onChange={(event) =>
                          updateClinicSettingsDraft("smsEnabled", event.target.checked)
                        }
                      />
                      SMS updates
                    </label>
                    <label style={styles.settingsToggle}>
                      <input
                        type="checkbox"
                        checked={clinicSettingsDraft.emailEnabled}
                        onChange={(event) =>
                          updateClinicSettingsDraft("emailEnabled", event.target.checked)
                        }
                      />
                      Email updates
                    </label>
                  </div>

                  <h4 style={styles.workflowSectionTitle}>Integrations</h4>
                  <div style={styles.integrationPanel}>
                    <div style={styles.integrationHeader}>
                      <div>
                        <h3 style={styles.ownerVisitTitle}>Integration Readiness</h3>
                        <p style={styles.authHelpText}>
                          Future API layer for PIMS, treatment-board, and referral-system
                          connections. No live third-party connection is active yet.
                        </p>
                      </div>
                      <span style={styles.speciesPill}>Phase 12</span>
                    </div>

                    {integrationReadinessMessage && (
                      <div style={styles.queueMiniCard}>{integrationReadinessMessage}</div>
                    )}

                    <div style={styles.integrationSummaryGrid}>
                      <div style={styles.integrationSummaryCard}>
                        <span>Queued events</span>
                        <strong>{integrationReadiness.queueSummary.queued}</strong>
                      </div>
                      <div style={styles.integrationSummaryCard}>
                        <span>Processed</span>
                        <strong>{integrationReadiness.queueSummary.processed}</strong>
                      </div>
                      <div style={styles.integrationSummaryCard}>
                        <span>Failed</span>
                        <strong>{integrationReadiness.queueSummary.failed}</strong>
                      </div>
                      <div style={styles.integrationSummaryCard}>
                        <span>Latest event</span>
                        <strong>
                          {integrationReadiness.queueSummary.lastEventAt
                            ? new Date(
                                integrationReadiness.queueSummary.lastEventAt
                              ).toLocaleString()
                            : "None yet"}
                        </strong>
                      </div>
                    </div>

                    <div style={styles.integrationProviderGrid}>
                      {integrationReadiness.providers.map((provider) => (
                        <div key={provider.key} style={styles.integrationProviderCard}>
                          <div style={styles.integrationProviderHeader}>
                            <div>
                              <strong>{provider.name}</strong>
                              <span>{provider.category} - {provider.direction}</span>
                            </div>
                            <span
                              style={{
                                ...styles.integrationStatusPill,
                                ...(provider.enabled ? styles.integrationStatusPillActive : {}),
                              }}
                            >
                              {provider.status}
                            </span>
                          </div>
                          <p style={styles.integrationDescription}>{provider.description}</p>
                          <div style={styles.integrationCapabilityList}>
                            {provider.capabilities.map((capability) => (
                              <span key={capability} style={styles.integrationCapabilityPill}>
                                {capability}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={styles.integrationEventList}>
                      <strong>Supported future events</strong>
                      <span>{integrationReadiness.supportedEvents.join(", ")}</span>
                    </div>
                  </div>

                  {clinicSettingsMessage && (
                    <div
                      style={
                        clinicSettingsMessage.includes("saved")
                          ? styles.authMessage
                          : styles.errorBox
                      }
                    >
                      {clinicSettingsMessage}
                    </div>
                  )}

                  <button
                    style={{
                      ...styles.primaryButton,
                      ...(savingClinicSettings ? styles.disabledButton : {}),
                    }}
                    type="submit"
                    disabled={savingClinicSettings}
                  >
                    {savingClinicSettings ? "Saving Settings..." : "Save Clinic Settings"}
                  </button>
                </form>
              )}

              {clinicWorkflowView !== "more" && (clinicWorkflowView === "referrals" ? (
                <section style={styles.referralDashboardPanel}>
                  {!selectedReferral && (
                    <>
                      <div style={styles.referralDashboardHeader}>
                        <div>
                          <h3 style={styles.ownerVisitTitle}>Referral Queue</h3>
                          <p style={styles.authHelpText}>
                            Review transfers, request records, accept cases, and convert referrals into
                            active MyPawLink visits.
                          </p>
                        </div>
                      </div>

                      {referralWorkflowSetupRequired && (
                        <div style={styles.queueMiniCard}>
                          Run the Phase 13 SQL file in Supabase to store referrals separately from visits.
                        </div>
                      )}

                      <div style={styles.referralStatsGrid}>
                        {([
                          ["New", "New Referral", referralCounts.new],
                          ["Under Review", "Under Review", referralCounts.underReview],
                          ["Waiting Info", "Waiting on Info", referralCounts.waitingInfo],
                          ["Accepted", "Accepted", referralCounts.accepted],
                          ["Redirected", "Redirected", referralCounts.redirected],
                          ["Closed", "Closed", referralCounts.closed],
                        ] as const).map(([label, status, count]) => (
                          <button
                            key={label}
                            type="button"
                            style={{
                              ...styles.referralStatCard,
                              ...(referralDashboardStatus === status ? styles.referralStatCardActive : {}),
                            }}
                            onClick={() =>
                              setReferralDashboardStatus(
                                referralDashboardStatus === status ? "All referrals" : status
                              )
                            }
                          >
                            <span>{label}</span>
                            <strong>{count}</strong>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {selectedReferral ? (
                    (() => {
                      const referralStatus = normalizeReferralStatus(selectedReferral.status);
                      const pendingMessage = pendingReferralActions[selectedReferral.id];
                      const messageDraft = referralMessageDrafts[selectedReferral.id] || "";
                      const convertedVisit = visits.find(
                        (visit) => visit.id === selectedReferral.convertedVisitId
                      );

                      return (
                        <div style={styles.referralDetailShell}>
                          <button
                            type="button"
                            style={styles.trackTextButton}
                            onClick={() => setSelectedReferralId(null)}
                          >
                            Back to referral queue
                          </button>

                          <div style={styles.referralDetailHero}>
                            <div>
                              <span style={styles.referralStatusBadge}>{referralStatus}</span>
                              <h3 style={styles.petName}>{selectedReferral.petName}</h3>
                              <p style={styles.text}>
                                {[
                                  selectedReferral.species,
                                  selectedReferral.breed,
                                  selectedReferral.age,
                                ]
                                  .filter(Boolean)
                                  .join(" - ")}
                              </p>
                            </div>
                            <strong style={styles.referralUrgencyBadge}>
                              {selectedReferral.stabilityLevel || "Urgency not set"}
                            </strong>
                          </div>

                          {pendingMessage && (
                            <div style={styles.pendingActionNotice}>{pendingMessage}</div>
                          )}

                          <div style={styles.workflowSectionGrid}>
                            <section style={styles.workflowSection}>
                              <h4 style={styles.workflowSectionTitle}>Referral Summary</h4>
                              <div style={styles.referralMetaGrid}>
                                <span>
                                  <strong>Clinic</strong>
                                  {selectedReferral.referringClinicName || "Not provided"}
                                </span>
                                <span>
                                  <strong>Doctor</strong>
                                  {selectedReferral.referringDoctorName || "Not provided"}
                                </span>
                                <span>
                                  <strong>Callback</strong>
                                  {selectedReferral.referringPhone || "Not provided"}
                                </span>
                                <span>
                                  <strong>ETA</strong>
                                  {selectedReferral.transferTime || "Not provided"}
                                </span>
                                <span>
                                  <strong>Type</strong>
                                  {selectedReferral.referralType || "Not provided"}
                                </span>
                                <span>
                                  <strong>Owner</strong>
                                  {[selectedReferral.ownerFirstName, selectedReferral.ownerLastName]
                                    .filter(Boolean)
                                    .join(" ") || "Not provided"}
                                </span>
                              </div>
                            </section>

                            <section style={styles.workflowSection}>
                              <h4 style={styles.workflowSectionTitle}>Clinical Summary</h4>
                              <div style={styles.clinicInfoList}>
                                <span>
                                  <strong>Presenting problem</strong>
                                  {selectedReferral.presentingComplaint ||
                                    selectedReferral.reason ||
                                    "Not provided"}
                                </span>
                                <span>
                                  <strong>Suspected diagnosis</strong>
                                  {selectedReferral.suspectedDiagnosis || "Not provided"}
                                </span>
                                <span>
                                  <strong>Brief clinical summary</strong>
                                  {selectedReferral.clinicalSummary || "Not provided"}
                                </span>
                                <span>
                                  <strong>Treatment already given</strong>
                                  {selectedReferral.treatmentProvided || "Not provided"}
                                </span>
                                <span>
                                  <strong>Medications given</strong>
                                  {selectedReferral.medicationsGiven || "Not provided"}
                                </span>
                                <span>
                                  <strong>IV fluids</strong>
                                  {selectedReferral.ivFluids || "Not provided"}
                                </span>
                              </div>
                            </section>
                          </div>

                          <section style={styles.workflowSection}>
                            <h4 style={styles.workflowSectionTitle}>Attachments</h4>
                            <div style={styles.attachmentGrid}>
                              {selectedReferral.documents.length > 0 ? (
                                selectedReferral.documents.map((document) => (
                                  <a
                                    key={document.id}
                                    href={document.fileUrl || "#"}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={styles.attachmentCard}
                                  >
                                    <strong>{document.fileName || "Referral document"}</strong>
                                    <span>{document.fileType || "Document"}</span>
                                  </a>
                                ))
                              ) : (
                                <div style={styles.emptyBox}>No documents attached yet.</div>
                              )}
                            </div>
                          </section>

                          <section style={styles.workflowSection}>
                            <h4 style={styles.workflowSectionTitle}>Next Action</h4>
                            <div style={styles.contextActionRow}>
                              {referralStatus === "New Referral" && (
                                <button
                                  type="button"
                                  style={styles.blueAction}
                                  onClick={() =>
                                    updateReferralStatusFromDashboard(
                                      selectedReferral,
                                      "Under Review",
                                      "The emergency team is reviewing the referral records."
                                    )
                                  }
                                >
                                  Review Referral
                                </button>
                              )}

                              {referralStatus === "Under Review" && (
                                <>
                                  <button
                                    type="button"
                                    style={styles.greenAction}
                                    onClick={() =>
                                      updateReferralStatusFromDashboard(
                                        selectedReferral,
                                        "Accepted",
                                        "Referral accepted. Please send the patient when ready."
                                      )
                                    }
                                  >
                                    Accept Transfer
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.orangeAction}
                                    onClick={() =>
                                      updateReferralStatusFromDashboard(
                                        selectedReferral,
                                        "Waiting on Info",
                                        "Please send additional records for the emergency team to review."
                                      )
                                    }
                                  >
                                    Request More Info
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.redAction}
                                    onClick={() =>
                                      updateReferralStatusFromDashboard(
                                        selectedReferral,
                                        "Redirected",
                                        "Referral reviewed. Please call the emergency team for redirection."
                                      )
                                    }
                                  >
                                    Redirect
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.redAction}
                                    onClick={() =>
                                      updateReferralStatusFromDashboard(
                                        selectedReferral,
                                        "Closed",
                                        "Referral closed after review."
                                      )
                                    }
                                  >
                                    Decline
                                  </button>
                                </>
                              )}

                              {referralStatus === "Waiting on Info" && (
                                <button
                                  type="button"
                                  style={styles.blueAction}
                                  onClick={() =>
                                    updateReferralStatusFromDashboard(
                                      selectedReferral,
                                      "Under Review",
                                      "Additional records were received and the emergency team is reviewing."
                                    )
                                  }
                                >
                                  Resume Review
                                </button>
                              )}

                              {referralStatus === "Accepted" && (
                                <button
                                  type="button"
                                  style={styles.greenAction}
                                  onClick={() =>
                                    updateReferralStatusFromDashboard(
                                      selectedReferral,
                                      "Patient Arrived",
                                      "The referred patient has arrived at the emergency hospital."
                                    )
                                  }
                                >
                                  Mark Patient Arrived
                                </button>
                              )}

                              {referralStatus === "Patient Arrived" && (
                                <button
                                  type="button"
                                  style={styles.greenAction}
                                  onClick={() => convertReferralFromDashboard(selectedReferral)}
                                >
                                  Convert to Active Visit
                                </button>
                              )}

                              {referralStatus === "Converted to Visit" && (
                                <button
                                  type="button"
                                  style={styles.greenAction}
                                  onClick={() => openConvertedReferralVisit(selectedReferral)}
                                >
                                  Open Active Visit
                                </button>
                              )}

                              {convertedVisit && (
                                <button
                                  type="button"
                                  style={styles.secondaryButton}
                                  onClick={() => {
                                    setClinicWorkflowView("patients");
                                    setClinicDashboardView("active");
                                    setSelectedReferralId(null);
                                    setClinicSelectedVisitId(convertedVisit.id);
                                  }}
                                >
                                  Open {convertedVisit.petName}
                                </button>
                              )}
                            </div>
                          </section>

                          <section style={styles.workflowSection}>
                            <h4 style={styles.workflowSectionTitle}>Communication</h4>
                            {selectedReferral.messages.length > 0 && (
                              <div style={styles.referralMessageList}>
                                {selectedReferral.messages.slice(-4).map((message) => (
                                  <span key={message.id}>
                                    <strong>{message.senderName}:</strong> {message.message}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div style={styles.referralMessageComposer}>
                              <textarea
                                style={styles.textarea}
                                value={messageDraft}
                                onChange={(event) =>
                                  setReferralMessageDrafts((current) => ({
                                    ...current,
                                    [selectedReferral.id]: event.target.value,
                                  }))
                                }
                                placeholder="Message referring clinic"
                              />
                              <button
                                type="button"
                                style={styles.secondaryButton}
                                onClick={() => sendReferralMessage(selectedReferral)}
                                disabled={!messageDraft.trim()}
                              >
                                Send Message
                              </button>
                            </div>
                          </section>
                        </div>
                      );
                    })()
                  ) : (
                    <section style={styles.patientListPanel}>
                      <div style={styles.patientListHeader}>
                        <div>
                          <h3 style={styles.ownerVisitTitle}>Referrals</h3>
                          <p style={styles.authHelpText}>
                            Open one referral at a time to review records and choose the next action.
                          </p>
                        </div>
                        <span style={styles.speciesPill}>{filteredReferrals.length} shown</span>
                      </div>

                      <select
                        style={styles.clinicCompactSelect}
                        value={referralDashboardStatus}
                        onChange={(event) => setReferralDashboardStatus(event.target.value)}
                      >
                        <option>All referrals</option>
                        {referralStatuses.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>

                      {referralsLoading && (
                        <div style={styles.emptyBox}>Loading referral dashboard...</div>
                      )}

                      {!referralsLoading && filteredReferrals.length === 0 && (
                        <div style={styles.emptyBox}>No referrals match this view yet.</div>
                      )}

                      <div style={styles.patientListGrid}>
                        {filteredReferrals.map((referral) => (
                          <button
                            key={referral.id}
                            type="button"
                            style={styles.patientListCard}
                            onClick={() => {
                              setClinicSelectedVisitId(null);
                              setSelectedReferralId(referral.id);
                            }}
                          >
                            <span style={styles.patientListSummary}>
                              <strong>{referral.petName}</strong>
                              <span>
                                {[referral.species, referral.breed, referral.age]
                                  .filter(Boolean)
                                  .join(" - ") || "Patient details pending"}
                              </span>
                            </span>
                            <span style={styles.patientListMeta}>
                              <span style={styles.referralStatusBadge}>
                                {normalizeReferralStatus(referral.status)}
                              </span>
                              <span>{referral.referringClinicName || "Clinic not provided"}</span>
                              <span>{referral.referringDoctorName || "Doctor not provided"}</span>
                              <span>{referral.stabilityLevel || "Urgency not set"}</span>
                              <span>{referral.transferTime || "ETA not set"}</span>
                              <span>{referral.documents.length} docs</span>
                            </span>
                            <span style={styles.patientListOpen}>Review</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </section>
              ) : (
                <>
                  {!clinicSelectedVisit && visits.length === 0 && (
                    <div style={styles.emptyBox}>
                      No active patient visits yet. Submitted visits and converted referrals will
                      appear here.
                    </div>
                  )}
                  {!clinicSelectedVisit && visits.length > 0 && filteredClinicVisits.length === 0 && (
                    <div style={styles.emptyBox}>
                      No visits match this view or filter. Try Active Visits or clear the search.
                    </div>
                  )}

                  {!clinicSelectedVisit && filteredClinicVisits.length > 0 && (
                    <section style={styles.patientListPanel}>
                      <div style={styles.patientListHeader}>
                        <div>
                          <h3 style={styles.ownerVisitTitle}>Patients</h3>
                          <p style={styles.authHelpText}>
                            Search or filter, then open the specific patient workspace.
                          </p>
                        </div>
                        <span style={styles.speciesPill}>{filteredClinicVisits.length} shown</span>
                      </div>

                      <div style={styles.patientListGrid}>
                        {filteredClinicVisits.map((visit) => {
                          const doctorName = getAssignedDoctorName(visit);
                          const triageLevel = getTriageLevel(visit);
                          const workflowStatus = getClinicWorkflowStatusLabel(visit);

                          return (
                            <button
                              key={visit.id}
                              type="button"
                              style={styles.patientListCard}
                              onClick={() => setClinicSelectedVisitId(visit.id)}
                            >
                              <span style={styles.patientListSummary}>
                                <strong>{visit.petName}</strong>
                                <span>{getCompactPatientMetaLine(visit)}</span>
                              </span>
                              <span style={styles.patientListMeta}>
                                <span
                                  style={{
                                    ...styles.patientListTriageChip,
                                    ...(triageLevel === "Critical" ? styles.patientStatusChipRed : {}),
                                    ...(triageLevel === "Urgent" ? styles.patientStatusChipOrange : {}),
                                    ...(triageLevel === "Stable" ? styles.patientStatusChipTeal : {}),
                                  }}
                                >
                                  {triageLevel}
                                </span>
                                <span>
                                  {doctorName === "Unassigned"
                                    ? "Unassigned"
                                    : `Dr. ${doctorName.split(" ").slice(-1)[0]}`}
                                </span>
                                <span>{workflowStatus}</span>
                              </span>
                              <span style={styles.patientListOpen}>Open</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {clinicSelectedVisit && (
                    <div style={styles.patientDetailScreen}>
                      <button
                        type="button"
                        style={styles.patientDetailBackButton}
                        onClick={() => setClinicSelectedVisitId(null)}
                      >
                        Back to Patients
                      </button>

                      <div style={styles.visitList}>
                    {[clinicSelectedVisit].map((visit) => {
                      const intake = getIntakeSummary(visit);
                      const doctor = getAssignedDoctorFromNotes(visit.clinicNotes);
                      const pendingMessage = pendingClinicActions[visit.id];
                      const mediaDraft = ownerMediaDrafts[visit.id];
                      const actionCategory = getActionCenterCategory(visit);
                      const communicationTab = getCommunicationTab(visit.id);
                      const workflowStatus = getClinicWorkflowStatusLabel(visit);
                      const primaryClinicalAction = getPrimaryClinicalAction(visit, doctor);
                      const compactWorkflowIndex = getCompactWorkflowIndex(visit);
                      const statusChips = getStatusChips(visit, doctor);
                      const isReferralPatient =
                        (visit.visitType || "").toLowerCase().includes("referral") ||
                        Boolean(visit.referralName);

                      return (
                        <article key={visit.id} style={styles.patientWorkflowCard}>
                          <section style={styles.patientOverviewSticky}>
                            <header style={styles.patientHeaderCard}>
                              <div>
                                <h3 style={styles.petName}>{visit.petName}</h3>
                                <p style={styles.patientMetaLine}>{getCompactPatientMetaLine(visit)}</p>
                              </div>
                            </header>

                            <div style={styles.patientOverviewMetaList}>
                              <span>
                                <strong>Owner:</strong>
                                {getOwnerName(visit)}
                              </span>
                              <span>
                                <strong>Doctor:</strong>
                                {doctor ? `Dr. ${doctor.name}` : "Unassigned"}
                              </span>
                              <span>
                                <strong>Triage:</strong>
                                {getTriageLevel(visit)}
                              </span>
                              <span>
                                <strong>Status:</strong>
                                {workflowStatus}
                              </span>
                            </div>

                            {statusChips.length > 0 && (
                              <div style={styles.patientChipRow}>
                                {statusChips.map((chip) => (
                                  <span
                                    key={chip.label}
                                    style={{
                                      ...styles.patientStatusChip,
                                      ...(chip.tone === "teal" ? styles.patientStatusChipTeal : {}),
                                      ...(chip.tone === "orange" ? styles.patientStatusChipOrange : {}),
                                      ...(chip.tone === "red" ? styles.patientStatusChipRed : {}),
                                      ...(chip.tone === "blue" ? styles.patientStatusChipBlue : {}),
                                    }}
                                  >
                                    {chip.label}
                                  </span>
                                ))}
                              </div>
                            )}

                            {doctor && (
                              <a
                                href={doctor.profileUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={styles.clinicDoctorLink}
                              >
                                View Dr. {doctor.name} profile
                              </a>
                            )}

                            <div style={styles.primaryClinicalActionCard}>
                              <div>
                                <span style={styles.ownerHeroEyebrow}>Next clinical action</span>
                                <strong>{primaryClinicalAction.label}</strong>
                                <p style={styles.authHelpText}>{primaryClinicalAction.helper}</p>
                              </div>

                              {primaryClinicalAction.kind === "assignDoctor" ? (
                                <select
                                  style={styles.primaryClinicalSelect}
                                  defaultValue=""
                                  onChange={(event) => {
                                    if (!event.target.value) return;
                                    assignDoctorToVisit(visit.id, event.target.value);
                                    event.target.value = "";
                                  }}
                                >
                                  <option value="">Assign Doctor</option>
                                  {doctors.map((doctorOption) => (
                                    <option key={doctorOption.name} value={doctorOption.name}>
                                      Dr. {doctorOption.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <button
                                  type="button"
                                  style={styles.primaryClinicalActionButton}
                                  onClick={() => {
                                    if (primaryClinicalAction.kind === "startTriage") {
                                      sendUpdate(
                                        visit.id,
                                        "Triage in progress",
                                        `${visit.petName}'s triage assessment has started.`
                                      );
                                      return;
                                    }
                                    if (primaryClinicalAction.kind === "updateDiagnostics") {
                                      sendUpdate(
                                        visit.id,
                                        "Diagnostics underway",
                                        `Diagnostics are being updated for ${visit.petName}. We will share the next milestone as soon as it is ready.`
                                      );
                                      return;
                                    }
                                    if (primaryClinicalAction.kind === "sendEstimate") {
                                      sendEstimateApproval(visit);
                                      return;
                                    }
                                    if (primaryClinicalAction.kind === "sendDischarge") {
                                      sendDischargeInstructions(visit);
                                      return;
                                    }
                                    sendOwnerUpdate(
                                      visit,
                                      ownerUpdateDrafts[visit.id] ||
                                        `There is a new update for ${visit.petName}.`
                                    );
                                  }}
                                >
                                  {primaryClinicalAction.label}
                                </button>
                              )}
                            </div>

                            <div style={styles.quickActionRow}>
                              <a style={styles.quickActionButton} href={`tel:${visit.phone}`}>
                                <span aria-hidden="true">📞</span> Call
                              </a>
                              <a style={styles.quickActionButton} href={`sms:${visit.phone}`}>
                                <span aria-hidden="true">💬</span> Text
                              </a>
                              <button
                                type="button"
                                style={{
                                  ...styles.quickActionButton,
                                  ...(!visit.ownerEmail ? styles.disabledButton : {}),
                                }}
                                onClick={() => emailVisitLink(visit)}
                                disabled={!visit.ownerEmail}
                              >
                                <span aria-hidden="true">✉️</span> Email
                              </button>
                              <button
                                type="button"
                                style={styles.quickActionButton}
                                onClick={() => {
                                  setSelectedVisitId(visit.id);
                                  setOwnerPortalTab("home");
                                  setOwnerPortalMode("owner");
                                  setView("status");
                                }}
                              >
                                <span aria-hidden="true">👁</span> Owner View
                              </button>
                            </div>
                          </section>

                          {pendingMessage && (
                            <div style={styles.pendingActionNotice}>{pendingMessage}</div>
                          )}

                          <section style={styles.workflowSection}>
                            <div style={styles.sectionHeaderRow}>
                              <div>
                                <h4 style={styles.workflowSectionTitle}>Workflow Timeline</h4>
                                <p style={styles.authHelpText}>Current Status: {workflowStatus}</p>
                              </div>
                            </div>
                            <div style={styles.compactWorkflowTracker}>
                              {compactWorkflowSteps.map((step, index) => {
                                const complete = index < compactWorkflowIndex;
                                const current = index === compactWorkflowIndex;

                                return (
                                  <div key={step} style={styles.compactWorkflowItem}>
                                    <span
                                      style={{
                                        ...styles.compactWorkflowDot,
                                        ...(complete ? styles.compactWorkflowDotComplete : {}),
                                        ...(current ? styles.compactWorkflowDotCurrent : {}),
                                      }}
                                    >
                                      {complete ? "✓" : current ? "•" : ""}
                                    </span>
                                    <strong>{step}</strong>
                                  </div>
                                );
                              })}
                            </div>
                          </section>

                          <section style={styles.workflowSection}>
                            <div style={styles.sectionHeaderRow}>
                              <div>
                                <h4 style={styles.workflowSectionTitle}>Action Center</h4>
                                <p style={styles.authHelpText}>
                                  Next workflow: {getActionCenterTitle(visit)}
                                </p>
                              </div>
                              <span style={styles.speciesPill}>{getActionCenterTitle(visit)}</span>
                            </div>

                            <fieldset
                              disabled={Boolean(pendingMessage)}
                              style={{
                                ...styles.clinicWorkflowFieldset,
                                ...(pendingMessage ? styles.disabledActionGrid : {}),
                              }}
                            >
                              {actionCategory === "arrival" && (
                                <div style={styles.contextActionRow}>
                                  <button
                                    type="button"
                                    style={styles.greenAction}
                                    onClick={() =>
                                      sendUpdate(
                                        visit.id,
                                        "Accepted",
                                        `Your visit request for ${visit.petName} has been received by the emergency team.`
                                      )
                                    }
                                  >
                                    Accept Visit
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.blueAction}
                                    onClick={() =>
                                      sendUpdate(
                                        visit.id,
                                        "Checked in",
                                        `${visit.petName} has arrived and check-in has started.`
                                      )
                                    }
                                  >
                                    Mark Checked In
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.redAction}
                                    onClick={() =>
                                      sendUpdate(
                                        visit.id,
                                        "Critical triage",
                                        `${visit.petName} has been triaged as critical and moved immediately to the treatment area.`
                                      )
                                    }
                                  >
                                    Critical
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.orangeAction}
                                    onClick={() =>
                                      sendUpdate(
                                        visit.id,
                                        "Urgent triage",
                                        `${visit.petName} has been triaged as urgent and is being stabilized by the medical team.`
                                      )
                                    }
                                  >
                                    Urgent
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.tealAction}
                                    onClick={() =>
                                      sendUpdate(
                                        visit.id,
                                        "Stable triage",
                                        `${visit.petName} has been triaged as stable and will be seen based on medical priority.`
                                      )
                                    }
                                  >
                                    Stable
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.tealAction}
                                    onClick={() =>
                                      sendCustomCareUpdate(
                                        visit,
                                        visit.status,
                                        "Enter a short vitals update for the owner",
                                        `${visit.petName}'s vital signs were checked and are stable at this time.`
                                      )
                                    }
                                  >
                                    Add Vitals
                                  </button>
                                </div>
                              )}

                              {actionCategory === "registration" && (
                                <div style={styles.contextActionRow}>
                                  <button
                                    type="button"
                                    style={styles.blueAction}
                                    onClick={() =>
                                      sendUpdate(
                                        visit.id,
                                        visit.status,
                                        `${visit.petName}'s registration information has been received.`
                                      )
                                    }
                                  >
                                    Registration Complete
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.purpleAction}
                                    onClick={() =>
                                      sendFormToVisit(
                                        visit,
                                        "Treatment authorization",
                                        [
                                          "I authorize the emergency team to examine my pet and provide emergency stabilization as needed.",
                                          "I understand I am financially responsible for care provided.",
                                          "I authorize MyPawLink updates by SMS/email when available.",
                                        ].join("\n\n"),
                                        `A treatment authorization form is ready for ${visit.petName}.`
                                      )
                                    }
                                  >
                                    Send General Consent
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.purpleAction}
                                    onClick={() =>
                                      sendFormToVisit(
                                        visit,
                                        "CPR / DNR preference",
                                        [
                                          "Please choose and sign a resuscitation preference for your pet.",
                                          "Options include Full CPR, DNR, or Limited CPR.",
                                          "Full CPR may include chest compressions, intubation, emergency drugs, defibrillation, and advanced life support.",
                                        ].join("\n\n"),
                                        `A CPR/DNR preference form is ready for ${visit.petName}.`
                                      )
                                    }
                                  >
                                    Send CPR / DNR Form
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.orangeAction}
                                    onClick={() =>
                                      sendCustomCareUpdate(
                                        visit,
                                        "Deposit requested",
                                        "Enter deposit request, for example: A $1,000 deposit is requested to continue care.",
                                        `A deposit is requested to continue care for ${visit.petName}.`
                                      )
                                    }
                                  >
                                    Request Deposit
                                  </button>
                                </div>
                              )}

                              {actionCategory === "diagnostics" && (
                                <div style={styles.contextActionRow}>
                                  <select
                                    style={styles.doctorSelect}
                                    defaultValue=""
                                    onChange={(event) => {
                                      if (!event.target.value) return;
                                      assignDoctorToVisit(visit.id, event.target.value);
                                      event.target.value = "";
                                    }}
                                  >
                                    <option value="">Assign Doctor</option>
                                    {doctors.map((doctorOption) => (
                                      <option key={doctorOption.name} value={doctorOption.name}>
                                        Dr. {doctorOption.name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    style={styles.purpleAction}
                                    onClick={() =>
                                      sendUpdate(
                                        visit.id,
                                        "Doctor reviewing",
                                        `The doctor is reviewing ${visit.petName}'s history, triage notes, and current symptoms.`
                                      )
                                    }
                                  >
                                    Doctor Reviewing
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.blueAction}
                                    onClick={() =>
                                      sendUpdate(
                                        visit.id,
                                        "Diagnostics underway",
                                        `Diagnostics are underway for ${visit.petName}. We will update you as results are reviewed.`
                                      )
                                    }
                                  >
                                    Diagnostics Underway
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.blueAction}
                                    onClick={() =>
                                      sendUpdate(
                                        visit.id,
                                        "Diagnostics underway",
                                        `Bloodwork is in progress for ${visit.petName}.`
                                      )
                                    }
                                  >
                                    Bloodwork Ordered
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.blueAction}
                                    onClick={() =>
                                      sendUpdate(
                                        visit.id,
                                        "Awaiting test results",
                                        `Radiographs have been completed for ${visit.petName}. The doctor is reviewing the images.`
                                      )
                                    }
                                  >
                                    X-rays Complete
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.orangeAction}
                                    onClick={() =>
                                      sendUpdate(
                                        visit.id,
                                        "Awaiting test results",
                                        `${visit.petName}'s test results are pending doctor review.`
                                      )
                                    }
                                  >
                                    Awaiting Results
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.greenAction}
                                    onClick={() => sendEstimateApproval(visit)}
                                  >
                                    Send Estimate
                                  </button>
                                </div>
                              )}

                              {actionCategory === "treatment" && (
                                <div style={styles.contextActionStack}>
                                  <div style={styles.contextActionRow}>
                                    {[
                                      ["Treatment started", "Treatment Started"],
                                      ["In surgery", "In Surgery"],
                                      ["Recovering from anesthesia", "Recovering"],
                                      ["Stable", "Stable"],
                                      ["Critical condition", "Critical"],
                                      ["ICU monitoring", "Hospitalized / ICU"],
                                    ].map(([status, label]) => (
                                      <button
                                        key={label}
                                        type="button"
                                        style={
                                          status.includes("Critical") ? styles.redAction : styles.orangeAction
                                        }
                                        onClick={() =>
                                          sendUpdate(
                                            visit.id,
                                            status,
                                            `${visit.petName}'s status has been updated: ${label}.`
                                          )
                                        }
                                      >
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                  <div style={styles.careEventPanel}>
                                    <strong>Care Events</strong>
                                    <div style={styles.contextActionRow}>
                                      <button
                                        type="button"
                                        style={styles.greenAction}
                                        onClick={() =>
                                          sendCustomCareUpdate(
                                            visit,
                                            visit.status,
                                            "Enter medication/treatment update",
                                            `${visit.petName}'s scheduled medication or treatment was completed.`
                                          )
                                        }
                                      >
                                        Medication Given
                                      </button>
                                      <button
                                        type="button"
                                        style={styles.tealAction}
                                        onClick={() =>
                                          sendCustomCareUpdate(
                                            visit,
                                            visit.status,
                                            "Enter monitoring update",
                                            `${visit.petName} is resting and being monitored by the care team.`
                                          )
                                        }
                                      >
                                        Monitoring Note
                                      </button>
                                      <button
                                        type="button"
                                        style={styles.blueAction}
                                        onClick={() =>
                                          sendCustomCareUpdate(
                                            visit,
                                            visit.status,
                                            "Enter feeding/nursing update",
                                            `${visit.petName}'s nursing care was completed.`
                                          )
                                        }
                                      >
                                        Feeding / Nursing
                                      </button>
                                      {["Walked", "Urinated", "Defecated"].map((label) => (
                                        <button
                                          key={label}
                                          type="button"
                                          style={styles.blueAction}
                                          onClick={() =>
                                            sendUpdate(
                                              visit.id,
                                              visit.status,
                                              `${visit.petName} ${label.toLowerCase()} during the latest care check.`
                                            )
                                          }
                                        >
                                          {label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {actionCategory === "discharge" && (
                                <div style={styles.contextActionRow}>
                                  <button
                                    type="button"
                                    style={styles.redAction}
                                    onClick={() =>
                                      sendUpdate(
                                        visit.id,
                                        "Ready for pickup",
                                        `${visit.petName} is ready for pickup. Please check in at the front desk when you arrive.`
                                      )
                                    }
                                  >
                                    Ready for Pickup
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.purpleAction}
                                    onClick={() => sendDischargeInstructions(visit)}
                                  >
                                    Send Discharge Instructions
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.greenAction}
                                    onClick={() =>
                                      sendUpdate(
                                        visit.id,
                                        visit.status,
                                        `A follow-up reminder has been set for ${visit.petName}.`
                                      )
                                    }
                                  >
                                    Aftercare Reminder
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.greenAction}
                                    onClick={() =>
                                      sendUpdate(
                                        visit.id,
                                        visit.status,
                                        `Payment has been completed for ${visit.petName}'s visit.`
                                      )
                                    }
                                  >
                                    Payment Complete
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.redAction}
                                    onClick={() =>
                                      sendUpdate(
                                        visit.id,
                                        "Closed",
                                        `${visit.petName}'s visit has been completed and closed.`
                                      )
                                    }
                                  >
                                    Close Visit
                                  </button>
                                </div>
                              )}
                            </fieldset>
                          </section>

                          <section style={styles.workflowSection}>
                            <div style={styles.sectionHeaderRow}>
                              <div>
                                <h4 style={styles.workflowSectionTitle}>Communication Hub</h4>
                                <p style={styles.authHelpText}>
                                  Owner updates, internal notes, and referral coordination.
                                </p>
                              </div>
                            </div>

                            <div style={styles.communicationTabRow}>
                              {(["owner", "internal"] as CommunicationHubTab[]).map((tab) => (
                                <button
                                  key={tab}
                                  type="button"
                                  style={{
                                    ...styles.communicationTabButton,
                                    ...(communicationTab === tab
                                      ? styles.communicationTabButtonActive
                                      : {}),
                                  }}
                                  onClick={() => setCommunicationTab(visit.id, tab)}
                                >
                                  {tab === "owner" ? "Owner" : "Internal"}
                                </button>
                              ))}
                              {isReferralPatient && (
                                <button
                                  type="button"
                                  style={{
                                    ...styles.communicationTabButton,
                                    ...(communicationTab === "referring"
                                      ? styles.communicationTabButtonActive
                                      : {}),
                                  }}
                                  onClick={() => setCommunicationTab(visit.id, "referring")}
                                >
                                  Referring Clinic
                                </button>
                              )}
                            </div>

                            {communicationTab === "owner" && (
                              <div style={styles.communicationPanel}>
                                <details style={styles.ownerAccessDetails}>
                                  <summary style={styles.ownerAccessSummary}>Owner Access Link</summary>
                                  <p style={styles.secureVisitLinkText}>
                                    Share this secure link with the pet owner so they can view updates
                                    for this visit.
                                  </p>
                                  <small style={styles.trackSmallNote}>
                                    Shared family links are view only. No forms, approvals, payments,
                                    or owner profile editing.
                                  </small>
                                  <div style={styles.ownerLinkButtonRow}>
                                    <button
                                      type="button"
                                      style={styles.secureVisitLinkButton}
                                      onClick={() => copyVisitLink(visit)}
                                    >
                                      Copy Link
                                    </button>
                                    <button
                                      type="button"
                                      style={styles.secureVisitLinkButton}
                                      onClick={() => textVisitLink(visit)}
                                    >
                                      Text Link
                                    </button>
                                    <button
                                      type="button"
                                      style={styles.secureVisitLinkButton}
                                      onClick={() => emailVisitLink(visit)}
                                    >
                                      Email Link
                                    </button>
                                  </div>
                                </details>

                                <div style={styles.contextActionRow}>
                                  <button
                                    type="button"
                                    style={styles.tealAction}
                                    onClick={() =>
                                      sendOwnerUpdate(
                                        visit,
                                        ownerUpdateDrafts[visit.id] ||
                                          `There is a new update for ${visit.petName}.`
                                      )
                                    }
                                  >
                                    Send Message
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.purpleAction}
                                    onClick={() =>
                                      sendFormToVisit(
                                        visit,
                                        "General consent form",
                                        "Please review and sign this consent so the care team can continue the recommended visit workflow.",
                                        `A consent form is ready for ${visit.petName}.`
                                      )
                                    }
                                  >
                                    Send Consent Form
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.greenAction}
                                    onClick={() => sendEstimateApproval(visit)}
                                  >
                                    Send Estimate
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.blueAction}
                                    onClick={() => sendDischargeInstructions(visit)}
                                  >
                                    Send Discharge Instructions
                                  </button>
                                </div>

                                <div style={styles.mediaActionRow}>
                                  <label style={styles.mediaUploadButton}>
                                    Take Photo
                                    <input
                                      hidden
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      onChange={(event) =>
                                        handleOwnerUpdateMediaChange(visit.id, event)
                                      }
                                    />
                                  </label>
                                  <label style={styles.mediaUploadButton}>
                                    Record Video
                                    <input
                                      hidden
                                      type="file"
                                      accept="video/*"
                                      capture="environment"
                                      onChange={(event) =>
                                        handleOwnerUpdateMediaChange(visit.id, event)
                                      }
                                    />
                                  </label>
                                  <label style={styles.mediaUploadButton}>
                                    Upload Media
                                    <input
                                      hidden
                                      type="file"
                                      accept="image/*,video/*"
                                      onChange={(event) =>
                                        handleOwnerUpdateMediaChange(visit.id, event)
                                      }
                                    />
                                  </label>
                                </div>

                                {mediaDraft && (
                                  <div style={styles.mediaPreviewCard}>
                                    {mediaDraft.previewUrl ? (
                                      <img
                                        src={mediaDraft.previewUrl}
                                        alt={mediaDraft.name}
                                        style={styles.mediaPreviewImage}
                                      />
                                    ) : (
                                      <span style={styles.mediaPreviewIcon}>
                                        {mediaDraft.type === "video" ? "Video" : "File"}
                                      </span>
                                    )}
                                    <div>
                                      <strong>{mediaDraft.name}</strong>
                                      <input
                                        style={styles.trackInput}
                                        value={mediaDraft.caption}
                                        onChange={(event) =>
                                          updateOwnerMediaCaption(visit.id, event.target.value)
                                        }
                                        placeholder="Optional caption"
                                      />
                                    </div>
                                  </div>
                                )}

                                <div style={styles.ownerUpdateTemplateGrid}>
                                  {[
                                    "Your pet has been checked in.",
                                    "Your pet is waiting for triage.",
                                    "The doctor is reviewing your pet now.",
                                    "Diagnostics are underway.",
                                    "We are waiting on lab results.",
                                    "Your pet is resting comfortably.",
                                    "Treatment has started.",
                                    "Please review and approve the estimate.",
                                    "Please review and sign the consent form.",
                                    "Your pet is ready for pickup.",
                                  ].map((template) => (
                                    <button
                                      key={template}
                                      type="button"
                                      style={styles.templateButton}
                                      onClick={() => sendOwnerUpdate(visit, template)}
                                    >
                                      {template}
                                    </button>
                                  ))}
                                </div>

                                <textarea
                                  style={styles.textarea}
                                  value={ownerUpdateDrafts[visit.id] || ""}
                                  onChange={(event) =>
                                    setOwnerUpdateDrafts((current) => ({
                                      ...current,
                                      [visit.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Edit or write an owner-friendly update before sending"
                                />

                                <button
                                  type="button"
                                  style={styles.primaryButton}
                                  onClick={() =>
                                    sendOwnerUpdate(
                                      visit,
                                      mediaDraft
                                        ? `A new ${mediaDraft.type} update is available for ${visit.petName}.`
                                        : ownerUpdateDrafts[visit.id] ||
                                            `There is a new update for ${visit.petName}.`
                                    )
                                  }
                                >
                                  Send Owner Update
                                </button>
                              </div>
                            )}

                            {communicationTab === "internal" && (
                              <div style={styles.communicationPanel}>
                                <p style={styles.authHelpText}>
                                  Internal notes are visible only to clinic staff and never appear on
                                  the owner page.
                                </p>
                                <textarea
                                  style={{
                                    ...styles.notesBox,
                                    ...(!canEditClinicNotes ? styles.disabledButton : {}),
                                  }}
                                  placeholder={
                                    canEditClinicNotes
                                      ? "Add internal notes visible only to clinic staff."
                                      : "Internal notes are limited to technician, veterinarian, and admin roles."
                                  }
                                  value={removeAppMetadata(visit.clinicNotes)}
                                  onChange={(event) => {
                                    if (canEditClinicNotes) {
                                      saveClinicNotes(visit.id, event.target.value);
                                    }
                                  }}
                                  disabled={!canEditClinicNotes}
                                />
                              </div>
                            )}

                            {communicationTab === "referring" && isReferralPatient && (
                              <div style={styles.communicationPanel}>
                                <p style={styles.authHelpText}>
                                  Coordinate records, ETA, and transfer updates with the referring
                                  clinic.
                                </p>
                                <div style={styles.contextActionRow}>
                                  {[
                                    "Request additional records",
                                    "Confirm ETA",
                                    "Send referral status update",
                                  ].map((message) => (
                                    <button
                                      key={message}
                                      type="button"
                                      style={styles.blueAction}
                                      onClick={() =>
                                        window.alert(`${message} queued for the referring clinic.`)
                                      }
                                    >
                                      {message}
                                    </button>
                                  ))}
                                </div>
                                <textarea
                                  style={styles.textarea}
                                  placeholder="Message the referring doctor or clinic"
                                />
                              </div>
                            )}
                          </section>

                          <details style={styles.workflowAccordion}>
                            <summary style={styles.workflowAccordionSummary}>
                              Clinical Details
                            </summary>
                            <div style={styles.workflowSectionGrid}>
                              <section style={styles.workflowSection}>
                                <h4 style={styles.workflowSectionTitle}>Intake Summary</h4>
                                <div style={styles.intakeCardGrid}>
                                  {[
                                    [
                                      "Chief Complaint",
                                      `${intake.chiefComplaint} / ${intake.symptom}`,
                                    ],
                                    ["Symptoms Started", intake.started],
                                    ["Breathing", intake.breathing],
                                    ["Conscious", intake.conscious],
                                    ["Mobility", intake.mobility],
                                    ["Bleeding", intake.bleeding],
                                    ["Medications", intake.medications],
                                    ["Allergies", intake.allergies],
                                    ["Attached Media", intake.mediaSummary],
                                    ["Additional Notes", intake.notes],
                                  ].map(([label, value]) => (
                                    <div key={label} style={styles.intakeDataCard}>
                                      <span>{label}</span>
                                      <strong>{value}</strong>
                                    </div>
                                  ))}
                                </div>
                              </section>

                              <section style={styles.workflowSection}>
                                <h4 style={styles.workflowSectionTitle}>Documents</h4>
                                <button type="button" style={styles.attachmentCard}>
                                  <strong>{intake.mediaSummary}</strong>
                                  <span>Tap media from the owner update or intake upload when present.</span>
                                </button>
                              </section>

                              <section style={styles.workflowSection}>
                                <h4 style={styles.workflowSectionTitle}>Forms & Approvals</h4>
                                <div style={styles.contextActionRow}>
                                  <button
                                    type="button"
                                    style={styles.purpleAction}
                                    onClick={() =>
                                      sendFormToVisit(
                                        visit,
                                        "CPR / DNR preference",
                                        "Please review and choose a resuscitation preference for this visit.",
                                        `A CPR/DNR form is ready for ${visit.petName}.`
                                      )
                                    }
                                  >
                                    Send CPR / DNR Form
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.greenAction}
                                    onClick={() => sendEstimateApproval(visit)}
                                  >
                                    Send Estimate
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.blueAction}
                                    onClick={() => {
                                      const formType = window.prompt(
                                        "Enter document name, for example Procedure Authorization"
                                      );
                                      if (!formType) return;
                                      const formBody = window.prompt(
                                        "Enter the details the customer needs to review"
                                      );
                                      if (!formBody) return;
                                      sendFormToVisit(
                                        visit,
                                        formType,
                                        formBody,
                                        `A new ${formType} document is ready for ${visit.petName}.`
                                      );
                                    }}
                                  >
                                    Send Custom Document
                                  </button>
                                </div>
                                <div style={styles.approvalStatusGrid}>
                                  <span>Estimate: {visit.estimateStatus || "Not Sent"}</span>
                                  {visit.forms.length > 0 ? (
                                    visit.forms.map((form) => (
                                      <span key={form.id}>
                                        {form.form_type}: {form.form_status}
                                      </span>
                                    ))
                                  ) : (
                                    <span>Forms: Not Sent</span>
                                  )}
                                </div>
                              </section>

                              <section style={styles.workflowSection}>
                                <h4 style={styles.workflowSectionTitle}>Care History</h4>
                                <div style={styles.referralMessageList}>
                                  {visit.updates.slice(-5).map((update, index) => (
                                    <span key={`${update.time}-${index}`}>
                                      <strong>{update.time}</strong> {update.message}
                                    </span>
                                  ))}
                                </div>
                              </section>

                              <section style={styles.workflowSection}>
                                <h4 style={styles.workflowSectionTitle}>Discharge History</h4>
                                <div style={styles.contextActionRow}>
                                  <button
                                    type="button"
                                    style={styles.purpleAction}
                                    onClick={() => sendDischargeInstructions(visit)}
                                  >
                                    Send Discharge Instructions
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.greenAction}
                                    onClick={() =>
                                      sendUpdate(
                                        visit.id,
                                        visit.status,
                                        `A follow-up reminder has been set for ${visit.petName}.`
                                      )
                                    }
                                  >
                                    Send Aftercare Reminder
                                  </button>
                                </div>
                              </section>
                            </div>
                          </details>
                        </article>
                      );
                    })}
                      </div>
                    </div>
                  )}
                </>
              ))}
                </>
              )}
            </section>
          )}

          {view === "status" && selectedVisit && (
            <section style={styles.ownerPortalShell}>
              <div style={styles.ownerPortalHeader}>
                <button style={styles.customerHomeButton} onClick={() => setView("home")}>
                  Exit
                </button>
                {ownerPortalMode === "shared" && <span style={styles.viewOnlyBadge}>VIEW ONLY</span>}
                {ownerPortalMode === "owner" && ownerActionCount > 0 && (
                  <button
                    type="button"
                    style={styles.ownerActionAlert}
                    onClick={() => setOwnerPortalTab("actions")}
                  >
                    {ownerActionCount} action{ownerActionCount === 1 ? "" : "s"} needed
                  </button>
                )}
              </div>

              {ownerPortalTab === "home" && (
                <div style={styles.ownerTabPanel}>
                  <div style={styles.ownerHeroStatusCard}>
                    <div>
                      <span style={styles.ownerHeroEyebrow}>Check-in received</span>
                      <h2 style={styles.ownerHeroTitle}>
                        {selectedVisit.petName} is now checked in <span aria-hidden="true">&hearts;</span>
                      </h2>
                      <p style={styles.ownerHeroText}>
                        {ownerPortalMode === "shared"
                          ? `You are viewing shared updates for ${selectedVisit.petName}.`
                          : getOwnerReviewMessage(selectedVisit)}
                      </p>
                    </div>
                    <img src={getPetPhoto(selectedVisit)} alt={selectedVisit.petName} style={styles.ownerHeroPetImage} />
                  </div>

                  <div style={styles.ownerStatusCard}>
                    <div>
                      <span style={styles.ownerStatusLabel}>Current status</span>
                      <strong style={styles.ownerStatusValue}>
                        {getOwnerStatusLabel(selectedVisit)}
                      </strong>
                    </div>
                    <div style={styles.ownerReviewPill}>
                      {selectedVisit.status.toLowerCase() === "request submitted"
                        ? "Review: 15-30 min"
                        : "Prioritized by medical urgency"}
                    </div>
                  </div>

                  <div style={styles.ownerStageTracker}>
                    {["Request received", "Under review", "In exam", "Treatment", "Ready"].map(
                      (stage, index) => {
                        const currentStage = getVisitStageIndex(selectedVisit);
                        const complete = index < currentStage;
                        const active = index === currentStage;

                        return (
                          <div key={stage} style={styles.ownerStageItem}>
                            <span
                              style={{
                                ...styles.ownerStageDot,
                                ...(complete ? styles.ownerStageDotComplete : {}),
                                ...(active ? styles.ownerStageDotActive : {}),
                              }}
                            >
                              {complete ? "OK" : ""}
                            </span>
                            <strong>{stage}</strong>
                          </div>
                        );
                      }
                    )}
                  </div>

                  {getAssignedDoctorFromNotes(selectedVisit.clinicNotes) && (
                    <a
                      href={getAssignedDoctorFromNotes(selectedVisit.clinicNotes)?.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.doctorProfileCard}
                    >
                      <span style={styles.doctorProfileLabel}>Assigned doctor</span>
                      <strong style={styles.doctorProfileName}>
                        Dr. {getAssignedDoctorFromNotes(selectedVisit.clinicNotes)?.name}
                      </strong>
                      <span style={styles.doctorProfileAction}>View profile</span>
                    </a>
                  )}

                  <div style={styles.latestUpdatePanel}>
                    <div style={styles.liveCardTop}>
                      <div style={styles.liveBadge}>Latest update</div>
                    </div>
                    <h3 style={styles.liveUpdateTitle}>
                      {latestOwnerUpdate?.message ||
                        `${selectedVisit.petName}'s visit request has been received.`}
                    </h3>
                    <button
                      type="button"
                      style={styles.previousUpdatesButton}
                      onClick={() => setOwnerPortalTab("updates")}
                    >
                      View updates
                    </button>
                  </div>
                </div>
              )}

              {ownerPortalTab === "updates" && (
                <div style={styles.ownerTabPanel}>
                  <div style={styles.ownerSectionHeader}>
                    <h2 style={styles.sectionTitle}>Updates</h2>
                    <p style={styles.careHubIntro}>
                      Messages from the veterinary team will appear here as care progresses.
                    </p>
                  </div>

                  <div style={styles.ownerTimeline}>
                    {[...selectedUpdates].reverse().map((update, index) => (
                      <div key={`${update.message}-${index}`} style={styles.ownerTimelineItem}>
                        <span
                          style={{
                            ...styles.ownerTimelineDot,
                            ...(index === 0 ? styles.ownerTimelineDotActive : {}),
                          }}
                        />
                        <div style={styles.timelineContent}>
                          <p style={styles.timelineMessage}>{update.message}</p>
                          <small>{update.time}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ownerPortalTab === "pet" && (
                <div style={styles.ownerTabPanel}>
                  <div style={styles.ownerPetProfileCard}>
                    <img src={getPetPhoto(selectedVisit)} alt={selectedVisit.petName} style={styles.ownerPetProfileImage} />
                    <div>
                      <h2 style={styles.petTitle}>{selectedVisit.petName}</h2>
                      <p style={styles.statusBadge}>{selectedVisit.status}</p>
                    </div>
                  </div>

                  <div style={styles.ownerInfoGrid}>
                    <div style={styles.ownerInfoCard}>
                      <span>Species</span>
                      <strong>{getSpecies(selectedVisit) || "Not provided"}</strong>
                    </div>
                    <div style={styles.ownerInfoCard}>
                      <span>Breed</span>
                      <strong>{selectedVisit.breed || "Not provided"}</strong>
                    </div>
                    <div style={styles.ownerInfoCard}>
                      <span>Visit type</span>
                      <strong>{selectedVisit.visitType || "Emergency visit"}</strong>
                    </div>
                    <div style={styles.ownerInfoCard}>
                      <span>Been here before</span>
                      <strong>{selectedVisit.beenHereBefore || "Not provided"}</strong>
                    </div>
                  </div>
                </div>
              )}

              {ownerPortalTab === "profile" && (
                <div style={styles.ownerTabPanel}>
                  <div style={styles.ownerSectionHeader}>
                    <h2 style={styles.sectionTitle}>Profile</h2>
                    <p style={styles.careHubIntro}>
                      This is the contact information connected to this visit.
                    </p>
                  </div>

                  <div style={styles.ownerInfoGrid}>
                    <div style={styles.ownerInfoCard}>
                      <span>Owner</span>
                      <strong>{getOwnerName(selectedVisit)}</strong>
                    </div>
                    <div style={styles.ownerInfoCard}>
                      <span>Phone</span>
                      <strong>{selectedVisit.phone || "Not provided"}</strong>
                    </div>
                    <div style={styles.ownerInfoCard}>
                      <span>Email</span>
                      <strong>{authUserEmail || "Connected to this visit"}</strong>
                    </div>
                    <div style={styles.ownerInfoCard}>
                      <span>Notifications</span>
                      <strong>Updates appear here in MyPawLink</strong>
                    </div>
                  </div>
                </div>
              )}

              {ownerPortalTab === "actions" && (
                <div style={styles.ownerTabPanel}>
                  <div style={styles.ownerSectionHeader}>
                    <h2 style={styles.sectionTitle}>Actions</h2>
                    <p style={styles.careHubIntro}>
                      Forms, approvals, and discharge documents will appear here only when the care
                      team needs a response.
                    </p>
                  </div>

                  {pendingOwnerForms.length === 0 && !careHubOpen && (
                    <div style={styles.ownerNoActionCard}>
                      <strong>No action needed right now.</strong>
                      <span>We will let you know here when something needs your review.</span>
                    </div>
                  )}
              {selectedVisit.forms && selectedVisit.forms.length > 0 && (
  <div style={{ marginBottom: 20 }}>
    <h3>Forms</h3>

    {selectedVisit.forms.map((form) => (
      <div
        key={form.id}
        style={{
          border: "1px solid #dcefeb",
          borderRadius: 8,
          padding: 16,
          marginBottom: 12,
          background: "#ffffff",
        }}
      >
        <p>
          <strong>{form.form_type}</strong>
        </p>

        <p>Status: {form.form_status}</p>

        {form.form_body && (
          <div style={styles.noticeBox}>
            <strong>Please review before responding:</strong>
            <p>{form.form_body}</p>
          </div>
        )}

        {form.form_status === "Sent" && (
          <div style={{ display: "grid", gap: 10 }}>
            <button
              style={styles.primaryButton}
              onClick={async () => {
                const signedName = window.prompt("Type your full name to sign");

                if (!signedName) return;

                try {
                  await apiRequest<{ ok: boolean }>({
                    action: "respondForm",
                    formId: form.id,
                    formStatus: "Signed",
                    signedName,
                  });
                  setVisits((current) =>
                    current.map((visit) =>
                      visit.id === selectedVisit.id
                        ? {
                            ...visit,
                            forms: visit.forms.map((item) =>
                              item.id === form.id
                                ? {
                                    ...item,
                                    form_status: "Signed",
                                    signed_name: signedName,
                                    signed_at: new Date().toISOString(),
                                  }
                                : item
                            ),
                          }
                        : visit
                    )
                  );
                } catch (error) {
                  console.error(error);
                  alert("Error signing form");
                  return;
                }

                alert("Form signed successfully");
              }}
            >
              Sign Form
            </button>

            <button
              style={styles.redAction}
              onClick={async () => {
                const reason = window.prompt(
                  "Please tell us why you do not want to sign this form"
                );

                if (!reason) return;

                try {
                  await apiRequest<{ ok: boolean }>({
                    action: "respondForm",
                    formId: form.id,
                    formStatus: "Declined",
                    declineReason: reason,
                  });
                  setVisits((current) =>
                    current.map((visit) =>
                      visit.id === selectedVisit.id
                        ? {
                            ...visit,
                            forms: visit.forms.map((item) =>
                              item.id === form.id
                                ? {
                                    ...item,
                                    form_status: "Declined",
                                    decline_reason: reason,
                                    declined_at: new Date().toISOString(),
                                  }
                                : item
                            ),
                          }
                        : visit
                    )
                  );
                } catch (error) {
                  console.error(error);
                  alert("Error declining form");
                  return;
                }

                alert("Form declined. The clinic has been notified.");
              }}
            >
              Decline / Do Not Sign
            </button>
          </div>
        )}

        {form.form_status === "Signed" && (
          <p>
            Signed by: {form.signed_name}
          </p>
        )}

        {form.form_status === "Declined" && (
          <p style={{ color: "#b91c1c", fontWeight: 700 }}>
            Declined by customer. Reason: {form.decline_reason}
          </p>
        )}
      </div>
    ))}
  </div>
)}
              <div style={styles.ownerActionCard}>
                <h3 style={styles.sectionTitle}>MyPawLink Care Hub</h3>
                <p style={styles.careHubIntro}>
                  Review forms, decisions, approvals, and discharge documents in one place.
                </p>
                <button style={styles.careHubButton} onClick={openCareHub}>
                  Open Care Hub <span>&gt;</span>
                </button>
                <div style={styles.careHubActionList}>
                  {[
                    "🐾 Admission Forms",
                    "💳 Financial Approvals",
                    "❤️ Emergency Decisions",
                    "📋 Treatment Consents",
                    "🩺 Procedure Authorizations",
                    "🏠 Discharge Instructions",
                  ].map((item) => (
                    <div key={item} style={styles.careHubActionItem}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {careHubOpen && (
                <div style={styles.careHubPortal}>
                  <div style={styles.careHubHeader}>
                    <div>
                      <p style={styles.careHubEyebrow}>Client Portal</p>
                      <h3 style={styles.sectionTitle}>MyPawLink Care Hub</h3>
                      <p style={styles.careHubIntro}>
                        Documents are organized by category for the care team to send as needed.
                      </p>
                    </div>
                    <button
                      style={styles.careHubBackButton}
                      onClick={() => {
                        if (selectedCareHubForm) {
                          setSelectedCareHubFormId(null);
                          return;
                        }
                        if (selectedCareHubCategory) {
                          setSelectedCareHubCategoryId(null);
                          return;
                        }
                        closeCareHub();
                      }}
                    >
                      {selectedCareHubForm || selectedCareHubCategory ? "Back" : "Close"}
                    </button>
                  </div>

                  {!selectedCareHubCategory && (
                    <div style={styles.careHubCategoryGrid}>
                      {careHubCategories.map((category) => {
                        const signedCount = category.forms.filter(
                          (form) => signedCareHubForms[form.id]
                        ).length;

                        return (
                          <button
                            key={category.id}
                            style={styles.careHubCategoryCard}
                            onClick={() => openCareHubCategory(category.id)}
                          >
                            <span style={styles.careHubCategoryTitle}>{category.title}</span>
                            <span style={styles.careHubCategoryText}>{category.description}</span>
                            <span style={styles.careHubCategoryMeta}>
                              {signedCount}/{category.forms.length} signed
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {selectedCareHubCategory && !selectedCareHubForm && (
                    <div>
                      <div style={styles.careHubCategoryHeader}>
                        <h4 style={styles.careHubFormSectionTitle}>
                          {selectedCareHubCategory.title}
                        </h4>
                        <p style={styles.careHubIntro}>{selectedCareHubCategory.description}</p>
                      </div>

                      <div style={styles.careHubFormList}>
                        {selectedCareHubCategory.forms.map((form) => {
                          const signedInfo = signedCareHubForms[form.id];
                          return (
                            <div key={form.id} style={styles.careHubFormCard}>
                              <div>
                                <div style={styles.careHubFormTitleRow}>
                                  <h5 style={styles.careHubFormTitle}>{form.title}</h5>
                                  <span
                                    style={{
                                      ...styles.careHubStatusBadge,
                                      ...(signedInfo ? styles.careHubSignedBadge : {}),
                                    }}
                                  >
                                    {signedInfo ? "Signed" : "Ready"}
                                  </span>
                                </div>
                                <p style={styles.careHubFormDescription}>{form.description}</p>
                              </div>
                              <button
                                style={styles.careHubViewButton}
                                onClick={() => setSelectedCareHubFormId(form.id)}
                              >
                                View Form
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedCareHubForm && (
                    <div style={styles.careHubConsentShell}>
                      <div style={styles.careHubConsentHeader}>
                        <span
                          style={{
                            ...styles.careHubStatusBadge,
                            ...(signedCareHubForms[selectedCareHubForm.id]
                              ? styles.careHubSignedBadge
                              : {}),
                          }}
                        >
                          {signedCareHubForms[selectedCareHubForm.id]
                            ? "Signed"
                            : "Needs signature"}
                        </span>
                        <h4 style={styles.careHubFormSectionTitle}>
                          {selectedCareHubForm.title}
                        </h4>
                        <p style={styles.careHubFormDescription}>
                          {selectedCareHubForm.description}
                        </p>
                      </div>

                      <div style={styles.careHubLegalBox}>
                        <div style={styles.careHubMetaGrid}>
                          <span>Pet: {selectedVisit.petName}</span>
                          <span>Owner: {getOwnerName(selectedVisit)}</span>
                          <span>Visit status: {selectedVisit.status}</span>
                        </div>
                        {selectedCareHubForm.body.map((paragraph) => (
                          <p key={paragraph} style={styles.careHubLegalText}>
                            {paragraph}
                          </p>
                        ))}
                      </div>

                      {signedCareHubForms[selectedCareHubForm.id] ? (
                        <div style={styles.careHubSignedBox}>
                          <strong>Signed</strong>
                          <span>
                            {signedCareHubForms[selectedCareHubForm.id].signedName} signed this
                            form on {signedCareHubForms[selectedCareHubForm.id].signedAt}.
                          </span>
                        </div>
                      ) : (
                        <form
                          key={selectedCareHubForm.id}
                          style={styles.careHubSignatureForm}
                          onSubmit={submitCareHubForm}
                        >
                          <input
                            style={styles.input}
                            name="printedName"
                            placeholder="Printed name"
                            required
                          />
                          <label style={styles.careHubCheckRow}>
                            <input type="checkbox" name="accepted" required /> I have reviewed
                            and agree to this form.
                          </label>
                          <input
                            style={styles.input}
                            name="signature"
                            placeholder="Electronic signature"
                            required
                          />
                          <input
                            style={styles.input}
                            name="dateTime"
                            value={new Date().toLocaleString()}
                            readOnly
                          />
                          <button style={styles.primaryButton} type="submit">
                            Submit Signed Form
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}

                </div>
              )}

              <div style={styles.bottomNav}>
                {visibleOwnerPortalTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    style={{
                      ...styles.bottomNavButton,
                      ...(ownerPortalTab === tab.id ? styles.bottomNavActive : {}),
                    }}
                    onClick={() => setOwnerPortalTab(tab.id)}
                  >
                    {tab.label}
                    {ownerPortalMode === "owner" && tab.id === "actions" && ownerActionCount > 0 && (
                      <span style={styles.bottomNavBadge}>{ownerActionCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

function MiniIcon({ type }: { type: "chat" | "check" | "heart" | "lock" | "paw" | "search" | "plus" | "referral" }) {
  const stroke = type === "search" ? "#0b62d8" : type === "referral" ? "#b45309" : "#087f78";

  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      {type === "chat" && (
        <>
          <rect x="5" y="7" width="20" height="14" rx="4" fill="none" stroke={stroke} strokeWidth="2" />
          <path d="M11 21 L9 25 L15 21" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="14" r="1.3" fill={stroke} />
          <circle cx="16" cy="14" r="1.3" fill={stroke} />
          <circle cx="20" cy="14" r="1.3" fill={stroke} />
        </>
      )}
      {type === "check" && (
        <>
          <path d="M15 4 L24 8 V15 C24 21 20 25 15 27 C10 25 6 21 6 15 V8 Z" fill="none" stroke={stroke} strokeWidth="2" />
          <path d="M10 15 L14 19 L21 11" fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {type === "heart" && (
        <path d="M15 25 C8 20 5 16 5 11 C5 7 8 5 11 5 C13 5 14 6 15 8 C16 6 17 5 19 5 C22 5 25 7 25 11 C25 16 22 20 15 25 Z" fill={stroke} />
      )}
      {type === "lock" && (
        <>
          <rect x="7" y="13" width="16" height="12" rx="3" fill="none" stroke={stroke} strokeWidth="2" />
          <path d="M10 13 V10 C10 6 12 4 15 4 C18 4 20 6 20 10 V13" fill="none" stroke={stroke} strokeWidth="2" />
          <circle cx="15" cy="19" r="1.5" fill={stroke} />
        </>
      )}
      {type === "paw" && (
        <>
          <circle cx="10" cy="11" r="3" fill={stroke} />
          <circle cx="15" cy="8" r="3" fill={stroke} />
          <circle cx="20" cy="11" r="3" fill={stroke} />
          <circle cx="8" cy="17" r="2.6" fill={stroke} />
          <circle cx="22" cy="17" r="2.6" fill={stroke} />
          <path d="M9 23 C10 18 13 16 15 16 C17 16 20 18 21 23 C18 25 12 25 9 23 Z" fill={stroke} />
        </>
      )}
      {type === "search" && (
        <>
          <circle cx="13" cy="13" r="7" fill="none" stroke={stroke} strokeWidth="3" />
          <path d="M18 18 L25 25" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {type === "plus" && (
        <>
          <path d="M15 7 V23" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
          <path d="M7 15 H23" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {type === "referral" && (
        <>
          <path d="M9 4 H18 L23 9 V25 H9 Z" fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M18 4 V10 H23" fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 15 H20" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M12 19 H18" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M6 13 H12" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M8 10 L5 13 L8 16" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

function actionStyle(background: string, color: string): React.CSSProperties {
  return {
    background,
    color,
    border: `1px solid ${color}2f`,
    padding: "12px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
    boxShadow: "0 3px 8px rgba(41, 64, 83, 0.06)",
    minHeight: 48,
  };
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f7fcfc 0%, #eef8f6 100%)",
    fontFamily: "Arial, sans-serif",
    color: "#243447",
    padding: "8px 12px 18px",
  },
  hero: {
    maxWidth: 480,
    margin: "0 auto 12px",
    background: "rgba(255, 255, 255, 0.92)",
    border: "1px solid #e1ecec",
    borderRadius: 8,
    padding: "8px 18px 18px",
    display: "grid",
    gap: 12,
    boxShadow: "0 14px 34px rgba(41, 64, 83, 0.08)",
  },
  heroLeft: {},
  heroRight: {
    display: "grid",
    alignContent: "center",
    gap: 22,
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoCrop: {
    width: "min(100%, 250px)",
    height: 70,
    overflow: "hidden",
    borderRadius: 8,
  },
  logoImage: {
    width: "100%",
    height: "auto",
    display: "block",
    transform: "translateY(-36px)",
  },
  logoMark: {
    width: 58,
    height: 58,
    borderRadius: "50%",
    background: "#e7fbf7",
    color: "white",
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 18,
    boxShadow: "inset 0 0 0 4px #0f8f86, 0 10px 25px rgba(15, 143, 134, 0.18)",
  },
  logo: {
    fontSize: "clamp(32px, 8vw, 42px)",
    margin: 0,
    color: "#12485a",
    letterSpacing: 0,
  },
  tagline: {
    marginTop: 4,
    color: "#13a89e",
    fontSize: 17,
    fontWeight: 700,
  },
  heroTitle: {
    fontSize: "clamp(29px, 8vw, 38px)",
    lineHeight: 1.08,
    margin: "2px 0 0",
    color: "#102a3a",
    textAlign: "center",
  },
  accentText: {
    color: "#087f78",
    display: "block",
  },
  heroSubtitle: {
    color: "#526070",
    fontSize: 16,
    lineHeight: 1.45,
    textAlign: "center",
    margin: 0,
  },
  statusPreviewCard: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    boxShadow: "0 8px 20px rgba(41, 64, 83, 0.05)",
    color: "#102a3a",
    display: "grid",
    gap: 6,
    padding: 12,
  },
  statusPreviewTop: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
  },
  statusPreviewBadge: {
    background: "#dcfce7",
    border: "1px solid #bbf7d0",
    borderRadius: 8,
    color: "#047857",
    fontSize: 11,
    fontWeight: 900,
    padding: "5px 8px",
    textTransform: "uppercase",
  },
  statusPreviewTime: {
    color: "#64717d",
    fontSize: 12,
    fontWeight: 800,
  },
  statusPreviewText: {
    color: "#526070",
    fontSize: 13,
    lineHeight: 1.35,
    margin: 0,
  },
  mobileCue: {
    background: "#fff8f1",
    border: "1px solid #fed7c2",
    borderRadius: 8,
    color: "#9a3412",
    fontWeight: 700,
    marginTop: 16,
    padding: "12px 14px",
  },
  petImageBox: {
    minHeight: 260,
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid #dcefeb",
    boxShadow: "0 10px 25px rgba(41, 64, 83, 0.12)",
  },
  petHeroStage: {
    position: "relative",
    minHeight: 340,
    borderRadius: 8,
    overflow: "hidden",
    background: "linear-gradient(145deg, #e7fbf7, #d7f7f2)",
    border: "1px solid #dcefeb",
    boxShadow: "0 10px 25px rgba(41, 64, 83, 0.12)",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    minHeight: 340,
    objectFit: "cover",
    display: "block",
  },
  floatBubble: {
    position: "absolute",
    zIndex: 2,
    width: 58,
    height: 58,
    borderRadius: "50%",
    background: "#ffffff",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 10px 25px rgba(15, 143, 134, 0.16)",
    border: "1px solid #bfe9e0",
  },
  featureRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 14,
    marginTop: 30,
  },
  infoCard: {
    display: "grid",
    gridTemplateColumns: "58px 1fr",
    gap: 14,
    alignItems: "start",
    textAlign: "left",
  },
  infoIcon: {
    width: 56,
    height: 56,
    margin: 0,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    background: "#fff0e8",
    color: "#c24124",
    fontSize: 18,
    fontWeight: 800,
  },
  featureTitle: {
    color: "#102a3a",
    fontSize: 15,
    fontWeight: 900,
    margin: "0 0 4px",
  },
  smallText: {
    color: "#243447",
    fontSize: 13,
    lineHeight: 1.4,
    margin: 0,
  },
  featurePanel: {
    background: "#ffffff",
    border: "1px solid #e1ecec",
    borderRadius: 8,
    padding: 20,
    display: "grid",
    gap: 20,
    boxShadow: "0 14px 34px rgba(41, 64, 83, 0.1)",
  },
  secureLine: {
    background: "#f0fbf8",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    color: "#087f78",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 700,
  },
  startHeader: {
    textAlign: "center",
    color: "#102a3a",
  },
  startHeaderTitle: {
    fontSize: 15,
    fontWeight: 900,
    margin: "0 0 8px",
  },
  startHeaderText: {
    color: "#526070",
    lineHeight: 1.5,
    margin: 0,
    textAlign: "center",
  },
  cardCta: {
    display: "block",
    background: "linear-gradient(135deg, #0f9f94, #087f78)",
    color: "#ffffff",
    borderRadius: 8,
    padding: "10px 14px",
    marginTop: 10,
    textAlign: "center",
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1.2,
    width: "100%",
    gridColumn: "1 / -1",
    boxSizing: "border-box",
  },
  cardCtaBlue: {
    display: "block",
    background: "linear-gradient(135deg, #12485a, #0b2f3d)",
    color: "#ffffff",
    borderRadius: 8,
    padding: "10px 14px",
    marginTop: 10,
    textAlign: "center",
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1.2,
    width: "100%",
    gridColumn: "1 / -1",
    boxSizing: "border-box",
  },
  cardCtaReferral: {
    display: "block",
    background: "linear-gradient(135deg, #f59e0b, #b45309)",
    color: "#ffffff",
    borderRadius: 8,
    padding: "9px 14px",
    marginTop: 12,
    textAlign: "center",
    fontWeight: 800,
    fontSize: 12,
    lineHeight: 1.2,
    width: "100%",
    gridColumn: "1 / -1",
    boxSizing: "border-box",
  },
  buttonRow: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
  },
  primaryCardButton: {
    background: "linear-gradient(135deg, #f0fffb, #e7fbf7)",
    color: "#087f78",
    border: "1px solid #bfe9e0",
    padding: 14,
    borderRadius: 8,
    cursor: "pointer",
    display: "grid",
    gridTemplateColumns: "44px 1fr",
    alignItems: "flex-start",
    gap: 12,
    textAlign: "left",
    minHeight: 108,
    width: "100%",
    boxSizing: "border-box",
  },
  darkCardButton: {
    background: "linear-gradient(135deg, #ffffff, #f5fbfb)",
    color: "#12485a",
    border: "1px solid #c8dddf",
    padding: 14,
    borderRadius: 8,
    cursor: "pointer",
    display: "grid",
    gridTemplateColumns: "44px 1fr",
    alignItems: "flex-start",
    gap: 12,
    textAlign: "left",
    minHeight: 108,
    width: "100%",
    boxSizing: "border-box",
  },
  referralCardButton: {
    background: "linear-gradient(135deg, #fff8f1, #fff1dd)",
    color: "#b45309",
    border: "1px solid #fed7aa",
    padding: 22,
    borderRadius: 8,
    cursor: "pointer",
    display: "grid",
    gridTemplateColumns: "62px 1fr",
    alignItems: "flex-start",
    gap: 16,
    textAlign: "left",
    fontSize: 18,
    minHeight: 188,
    width: "100%",
    boxSizing: "border-box",
  },
  staffLinkButton: {
  gridColumn: "1 / -1",
  background: "transparent",
  color: "#2457a6",
  border: "1px dashed #9cc5f8",
  padding: "12px 16px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
},
  bigIcon: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.72)",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
  buttonText: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    width: "100%",
    minWidth: 0,
  },
  buttonTitle: {
    fontSize: 17,
    fontWeight: 900,
    lineHeight: 1.2,
  },
  buttonSubtitle: {
    fontSize: 13,
    opacity: 0.92,
    lineHeight: 1.35,
  },
  teamLinkRow: {
    alignItems: "center",
    color: "#64717d",
    display: "flex",
    flexWrap: "wrap",
    fontSize: 12,
    gap: 6,
    justifyContent: "center",
  },
  teamTextButton: {
    background: "transparent",
    border: "none",
    color: "#087f78",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 900,
    padding: "4px 6px",
    textDecoration: "underline",
  },
  mainGrid: {
    maxWidth: 760,
    margin: "0 auto",
  },
  panel: {
    background: "rgba(255, 255, 255, 0.94)",
    border: "1px solid #e1ecec",
    borderRadius: 8,
    padding: "clamp(14px, 4vw, 24px)",
    boxShadow: "0 10px 28px rgba(41, 64, 83, 0.07)",
  },
  homeProductSections: {
    display: "grid",
    gap: 20,
  },
  homeInfoSection: {
    display: "grid",
    gap: 14,
  },
  homeSectionTitle: {
    color: "#102a3a",
    fontSize: "clamp(22px, 5vw, 28px)",
    lineHeight: 1.15,
    margin: 0,
    textAlign: "center",
  },
  homeBenefitGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
    gap: 10,
  },
  homeBenefitCard: {
    background: "#ffffff",
    border: "1px solid #e1ecec",
    borderRadius: 8,
    padding: 14,
    display: "grid",
    gridTemplateColumns: "34px 1fr",
    alignItems: "center",
    gap: 10,
    color: "#102a3a",
    boxShadow: "0 8px 18px rgba(41, 64, 83, 0.05)",
  },
  homeBenefitCheck: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "#ecfdf3",
    color: "#027a48",
    display: "grid",
    placeItems: "center",
    fontSize: 10,
    fontWeight: 900,
  },
  homeStepList: {
    display: "grid",
    gap: 10,
  },
  homeStepCard: {
    background: "linear-gradient(135deg, #fbffff, #f2fbfa)",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    padding: 14,
    display: "grid",
    gridTemplateColumns: "38px 1fr",
    alignItems: "center",
    gap: 12,
    color: "#102a3a",
  },
  homeStepNumber: {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: "#087f78",
    color: "#ffffff",
    display: "grid",
    placeItems: "center",
    fontSize: 14,
    fontWeight: 900,
  },
  homeDisclaimer: {
    background: "#fff8f1",
    border: "1px solid #fed7aa",
    borderRadius: 8,
    padding: 14,
    color: "#9a3412",
    fontSize: 13,
    lineHeight: 1.45,
    fontWeight: 700,
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  homeMessage: {
    textAlign: "center",
    padding: "28px 12px",
  },
  title: {
    fontSize: "clamp(24px, 6vw, 28px)",
    marginBottom: 8,
    color: "#243447",
  },
  text: {
    color: "#64717d",
    lineHeight: 1.5,
  },
  form: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
    gap: 16,
    maxWidth: 780,
  },
  input: {
    padding: "16px 15px",
    borderRadius: 8,
    border: "1px solid #cfe0df",
    fontSize: 16,
    outline: "none",
    background: "#ffffff",
  },
  textarea: {
    gridColumn: "1 / -1",
    padding: 15,
    borderRadius: 8,
    border: "1px solid #cfe0df",
    fontSize: 16,
    minHeight: 120,
    outline: "none",
  },
  photoUploadBox: {
    gridColumn: "1 / -1",
    border: "1px dashed #9cc5f8",
    borderRadius: 8,
    padding: 16,
    background: "#f8fbff",
    cursor: "pointer",
    display: "grid",
    gap: 8,
  },
  photoUploadTitle: {
    color: "#102a3a",
    fontWeight: 900,
    fontSize: 15,
  },
  photoUploadText: {
    color: "#64717d",
    fontSize: 14,
    lineHeight: 1.4,
  },
  hiddenFileInput: {
    display: "none",
  },
  photoUploadButton: {
    display: "inline-block",
    justifySelf: "start",
    background: "#e7fbf7",
    color: "#087f78",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    padding: "10px 14px",
    fontWeight: 800,
    marginTop: 4,
  },
  photoPreviewCard: {
    gridColumn: "1 / -1",
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#ffffff",
    border: "1px solid #e1ecec",
    borderRadius: 8,
    padding: 12,
    color: "#64717d",
    fontWeight: 700,
  },
  photoPreviewImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    objectFit: "cover",
    border: "2px solid #e7fbf7",
  },
  referralSubsection: {
    gridColumn: "1 / -1",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
    gap: 12,
    border: "1px solid #e1ecec",
    borderRadius: 8,
    padding: 14,
    background: "#ffffff",
  },
  referralWizardHero: {
    display: "grid",
    gap: 6,
    marginBottom: 14,
  },
  referralCompactNotice: {
    background: "#f0fbf8",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    color: "#087f78",
    fontSize: 13,
    fontWeight: 900,
    padding: "10px 12px",
  },
  referralLocationButton: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#12485a",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 900,
    minHeight: 48,
    padding: "0 14px",
    justifySelf: "start",
  },
  referralLocationNote: {
    background: "#f0fbf8",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    color: "#087f78",
    fontSize: 13,
    fontWeight: 800,
    padding: 10,
  },
  referralOwnerToggle: {
    background: "#ffffff",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    color: "#087f78",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 900,
    minHeight: 48,
    padding: "0 14px",
    textAlign: "left",
  },
  referralOwnerPanel: {
    border: "1px solid #e1ecec",
    borderRadius: 8,
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
    padding: 12,
  },
  referralUrgencyGrid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))",
  },
  referralChoiceButton: {
    alignItems: "center",
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#243447",
    cursor: "pointer",
    display: "flex",
    fontSize: 13,
    fontWeight: 900,
    gap: 8,
    justifyContent: "center",
    minHeight: 46,
    padding: "10px 9px",
  },
  referralChoiceDotGreen: {
    background: "#22c55e",
    borderRadius: 999,
    display: "inline-block",
    height: 9,
    width: 9,
  },
  referralChoiceDotYellow: {
    background: "#facc15",
    borderRadius: 999,
    display: "inline-block",
    height: 9,
    width: 9,
  },
  referralChoiceDotRed: {
    background: "#ef4444",
    borderRadius: 999,
    display: "inline-block",
    height: 9,
    width: 9,
  },
  referralUploadGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  },
  referralUploadAction: {
    background: "#f8fbff",
    border: "1px dashed #9cc5f8",
    borderRadius: 10,
    color: "#102a3a",
    cursor: "pointer",
    display: "grid",
    gap: 6,
    minHeight: 132,
    padding: 14,
    placeItems: "center",
    textAlign: "center",
  },
  referralUploadIcon: {
    background: "#e7fbf7",
    borderRadius: 999,
    display: "grid",
    fontSize: 24,
    height: 46,
    placeItems: "center",
    width: 46,
  },
  referralPreviewGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 110px), 1fr))",
  },
  referralPreviewCard: {
    background: "#ffffff",
    border: "1px solid #e1ecec",
    borderRadius: 8,
    color: "#52606d",
    display: "grid",
    fontSize: 12,
    fontWeight: 800,
    gap: 7,
    minWidth: 0,
    padding: 9,
  },
  referralPreviewImage: {
    aspectRatio: "1 / 1",
    borderRadius: 8,
    objectFit: "cover",
    width: "100%",
  },
  referralPreviewIcon: {
    alignItems: "center",
    aspectRatio: "1 / 1",
    background: "#eef6ff",
    borderRadius: 8,
    color: "#2457a6",
    display: "flex",
    fontSize: 12,
    fontWeight: 900,
    justifyContent: "center",
    width: "100%",
  },
  referralWizardNav: {
    background: "rgba(246, 252, 250, 0.96)",
    bottom: 0,
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
    padding: "10px 0 2px",
    position: "sticky",
    zIndex: 5,
  },
  checkboxGrid: {
    gridColumn: "1 / -1",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
  },
  documentList: {
    gridColumn: "1 / -1",
    display: "grid",
    gap: 6,
    background: "#fff8f1",
    border: "1px solid #fed7aa",
    borderRadius: 8,
    padding: 12,
    color: "#9a3412",
    fontWeight: 700,
    fontSize: 13,
  },
  label: {
    fontWeight: 700,
    marginBottom: 10,
    color: "#243447",
  },
  radioRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 12,
  },
  radioBox: {
    border: "1px solid #cfe0df",
    borderRadius: 8,
    padding: 14,
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  primaryButton: {
    gridColumn: "1 / -1",
    background: "linear-gradient(135deg, #13a89e, #0f766e)",
    color: "white",
    border: "none",
    padding: "15px 20px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 700,
    minHeight: 52,
  },
  disabledButton: {
    opacity: 0.62,
    cursor: "not-allowed",
    filter: "saturate(0.75)",
  },
  secondaryButton: {
    background: "white",
    color: "#2457a6",
    border: "1px solid #9cc5f8",
    padding: "13px 18px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 15,
    width: "100%",
    minHeight: 48,
  },
  smallButton: {
    background: "#fff0e8",
    border: "none",
    padding: "10px 15px",
    borderRadius: 8,
    cursor: "pointer",
    color: "#9a3412",
    fontWeight: 700,
  },
  customerHomeButton: {
    background: "#f0fbf8",
    border: "1px solid #bfe9e0",
    padding: "6px 10px",
    borderRadius: 8,
    cursor: "pointer",
    color: "#087f78",
    fontSize: 12,
    fontWeight: 800,
  },
  noticeBox: {
    background: "#f0fbf8",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    padding: 18,
    marginBottom: 20,
  },
  visitWizardHeader: {
    display: "grid",
    gap: 6,
    marginBottom: 14,
  },
  visitStepEyebrow: {
    color: "#087f78",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  visitProgressTrack: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 4,
    marginBottom: 14,
  },
  visitProgressStep: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#64717d",
    cursor: "pointer",
    display: "grid",
    gap: 3,
    minHeight: 54,
    minWidth: 0,
    padding: "7px 2px",
    placeItems: "center",
    textAlign: "center",
  },
  visitProgressLabel: {
    display: "block",
    fontSize: 10,
    fontWeight: 900,
    lineHeight: 1.05,
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  visitProgressStepActive: {
    background: "#e7fbf7",
    borderColor: "#13a89e",
    color: "#087f78",
    boxShadow: "0 6px 14px rgba(15, 143, 134, 0.12)",
  },
  visitProgressStepComplete: {
    background: "#f0fbf8",
    color: "#087f78",
  },
  visitWizardForm: {
    display: "grid",
    gap: 14,
    maxWidth: 780,
  },
  visitStepCard: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    boxShadow: "0 8px 20px rgba(41, 64, 83, 0.06)",
    display: "grid",
    gap: 14,
    padding: 14,
  },
  visitStepTitle: {
    color: "#102a3a",
    fontSize: 20,
    lineHeight: 1.15,
    margin: 0,
  },
  visitStepText: {
    color: "#64717d",
    fontSize: 14,
    lineHeight: 1.4,
    margin: "5px 0 0",
  },
  visitFieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
    gap: 10,
  },
  visitChoiceBlock: {
    display: "grid",
    gap: 8,
  },
  visitChoiceLabel: {
    color: "#102a3a",
    fontSize: 14,
    fontWeight: 900,
    margin: 0,
  },
  visitChoiceGrid: {
    display: "grid",
    gap: 8,
  },
  visitChoiceButton: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#243447",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.25,
    minHeight: 44,
    padding: "10px 9px",
    textAlign: "center",
  },
  visitChoiceButtonSelected: {
    background: "#087f78",
    borderColor: "#087f78",
    color: "#ffffff",
    boxShadow: "0 8px 16px rgba(15, 143, 134, 0.16)",
  },
  photoEmptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    background: "#e7fbf7",
    color: "#087f78",
    display: "grid",
    placeItems: "center",
    fontSize: 24,
    fontWeight: 900,
    flexShrink: 0,
  },
  visitReviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
    gap: 10,
  },
  visitReviewCard: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    display: "grid",
    gap: 4,
    padding: 12,
  },
  visitWizardNav: {
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
  },
  visitBackButton: {
    background: "#ffffff",
    border: "1px solid #cfe0df",
    borderRadius: 8,
    color: "#526070",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 900,
    minHeight: 52,
    padding: "0 18px",
  },
  visitForwardButton: {
    flex: 1,
    width: "100%",
  },
  queueGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 6,
    marginBottom: 14,
  },
  queueCard: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    padding: "8px 6px",
    boxShadow: "0 3px 8px rgba(41, 64, 83, 0.04)",
    textAlign: "center",
  },
  queueLabel: {
    display: "block",
    color: "#64717d",
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1.15,
    marginBottom: 4,
  },
  queueNumber: {
    color: "#12485a",
    fontSize: 16,
    lineHeight: 1.1,
  },
  queueMiniCard: {
    background: "#fff8f1",
    border: "1px solid #fed7c2",
    borderRadius: 8,
    color: "#9a3412",
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  secureVisitLinkCard: {
    background: "#f0fbf8",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
    display: "grid",
    gap: 12,
    alignItems: "start",
  },
  secureVisitLinkText: {
    color: "#52606d",
    fontSize: 13,
    margin: "4px 0 0",
    lineHeight: 1.35,
  },
  secureVisitLinkButton: {
    background: "#087f78",
    border: "none",
    color: "#ffffff",
    borderRadius: 8,
    padding: "10px 12px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  ownerLinkButtonRow: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    width: "100%",
  },
  ownerAccessDetails: {
    background: "#f0fbf8",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    display: "grid",
    gap: 8,
    padding: 10,
  },
  ownerAccessSummary: {
    color: "#087f78",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
  },
  errorBox: {
  background: "#fff1f2",
  border: "1px solid #e11d48",
  color: "#b91c1c",
  padding: 12,
  borderRadius: 8,
  marginTop: 10,
},
  missingInfoBox: {
    background: "#fff8f1",
    border: "1px solid #fed7aa",
    borderRadius: 8,
    color: "#9a3412",
    display: "grid",
    gap: 6,
    padding: 12,
  },
  missingInfoList: {
    margin: "2px 0 0",
    paddingLeft: 20,
  },
  dashboardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 15,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  counter: {
    background: "#e6f7f5",
    color: "#0f766e",
    padding: "10px 14px",
    borderRadius: 8,
    fontWeight: 700,
  },
  clinicCommandCenter: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    padding: 14,
    marginBottom: 18,
    display: "grid",
    gap: 12,
    boxShadow: "0 8px 20px rgba(41, 64, 83, 0.06)",
  },
  clinicMainNav: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    display: "flex",
    gap: 6,
    marginBottom: 12,
    overflowX: "auto",
    padding: 6,
    position: "sticky",
    top: 0,
    zIndex: 12,
    WebkitOverflowScrolling: "touch",
  },
  clinicMainNavButton: {
    flex: "0 0 auto",
    background: "transparent",
    border: "none",
    borderRadius: 8,
    color: "#52606d",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
    minHeight: 42,
    minWidth: 88,
    padding: "8px 12px",
    whiteSpace: "nowrap",
  },
  clinicMainNavButtonActive: {
    background: "#087f78",
    color: "#ffffff",
    boxShadow: "0 8px 16px rgba(15, 143, 134, 0.18)",
  },
  operationsBoardGrid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 130px), 1fr))",
  },
  operationsBoardCard: {
    background: "linear-gradient(135deg, #f0fffb, #ffffff)",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    color: "#102a3a",
    cursor: "pointer",
    display: "grid",
    gap: 6,
    minHeight: 76,
    padding: 12,
    textAlign: "left",
  },
  clinicWorkflowTabs: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
  },
  clinicWorkflowTab: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#52606d",
    cursor: "pointer",
    display: "grid",
    gap: 4,
    padding: 14,
    textAlign: "left",
  },
  clinicWorkflowTabActive: {
    background: "linear-gradient(135deg, #f0fffb, #ffffff)",
    borderColor: "#13a89e",
    color: "#087f78",
    boxShadow: "0 10px 24px rgba(15, 143, 134, 0.12)",
  },
  clinicInsightGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
    gap: 8,
  },
  clinicInsightCard: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    padding: "10px 8px",
    display: "grid",
    gap: 3,
    color: "#64717d",
    fontSize: 12,
    fontWeight: 800,
  },
  clinicViewTabs: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 145px), 1fr))",
    gap: 8,
  },
  clinicViewTab: {
    border: "1px solid #dcefeb",
    background: "#ffffff",
    color: "#52606d",
    borderRadius: 8,
    padding: "10px 11px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
    textAlign: "left",
  },
  clinicViewTabActive: {
    background: "#087f78",
    borderColor: "#087f78",
    color: "#ffffff",
  },
  clinicFilterBar: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
    gap: 8,
  },
  clinicSearchInput: {
    minHeight: 42,
    border: "1px solid #cfe0df",
    borderRadius: 8,
    padding: "0 12px",
    fontSize: 14,
    outline: "none",
    background: "#ffffff",
  },
  clinicCompactSelect: {
    minHeight: 42,
    border: "1px solid #cfe0df",
    borderRadius: 8,
    padding: "0 10px",
    fontSize: 13,
    color: "#243447",
    background: "#ffffff",
  },
  clinicResultText: {
    margin: 0,
    color: "#64717d",
    fontSize: 13,
    fontWeight: 800,
  },
  emptyBox: {
    background: "#f8fbff",
    border: "1px dashed #a7c9f7",
    borderRadius: 8,
    padding: 22,
  },
  clinicLoginCard: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    padding: 22,
    boxShadow: "0 8px 20px rgba(41, 64, 83, 0.06)",
  },
  authPanel: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    padding: 14,
    marginBottom: 18,
    display: "grid",
    gap: 10,
  },
  authForm: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
    maxWidth: 780,
    marginBottom: 14,
  },
  authInlineForm: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
    gap: 10,
  },
  authHelpText: {
    color: "#64717d",
    fontSize: 13,
    lineHeight: 1.4,
    margin: 0,
  },
  authMessage: {
    background: "#f0fbf8",
    border: "1px solid #bfe9e0",
    color: "#087f78",
    borderRadius: 8,
    padding: "9px 10px",
    fontSize: 13,
    fontWeight: 800,
  },
  authSignedInText: {
    color: "#087f78",
    fontSize: 13,
    fontWeight: 800,
    margin: 0,
  },
  trackPage: {
    display: "grid",
    gap: 16,
  },
  trackHeader: {
    display: "grid",
    gap: 6,
    textAlign: "center",
  },
  trackTitle: {
    color: "#102a3a",
    fontSize: "clamp(28px, 7vw, 34px)",
    lineHeight: 1.08,
    margin: 0,
  },
  trackSubtitle: {
    color: "#52606d",
    fontSize: 15,
    lineHeight: 1.4,
    margin: 0,
  },
  ownerAccessCard: {
    background: "linear-gradient(135deg, #f0fffb, #ffffff)",
    border: "1px solid #bfe9e0",
    borderRadius: 18,
    boxShadow: "0 16px 36px rgba(15, 143, 134, 0.13)",
    display: "grid",
    gap: 14,
    padding: 18,
  },
  sharedAccessCard: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 16,
    boxShadow: "0 8px 20px rgba(41, 64, 83, 0.05)",
    display: "grid",
    gap: 12,
    padding: 16,
  },
  trackCardTitle: {
    color: "#102a3a",
    fontSize: 20,
    fontWeight: 900,
    margin: "0 0 5px",
  },
  trackCardText: {
    color: "#52606d",
    fontSize: 14,
    lineHeight: 1.4,
    margin: 0,
  },
  trackForm: {
    display: "grid",
    gap: 10,
  },
  trackFieldLabel: {
    color: "#102a3a",
    display: "grid",
    fontSize: 13,
    fontWeight: 900,
    gap: 7,
  },
  trackInput: {
    background: "#ffffff",
    border: "1px solid #cfe0df",
    borderRadius: 14,
    color: "#102a3a",
    fontSize: 16,
    minHeight: 56,
    outline: "none",
    padding: "0 15px",
  },
  trackPrimaryButton: {
    background: "linear-gradient(135deg, #13a89e, #0f766e)",
    border: "none",
    borderRadius: 14,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 900,
    minHeight: 56,
    padding: "0 16px",
  },
  trackSecondaryButton: {
    background: "#ffffff",
    border: "1px solid #b9d6da",
    borderRadius: 14,
    color: "#12485a",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 900,
    minHeight: 56,
    padding: "0 16px",
  },
  trackTextButton: {
    background: "transparent",
    border: "none",
    color: "#087f78",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
    justifySelf: "start",
    padding: 0,
  },
  trackFeatureNote: {
    background: "rgba(255, 255, 255, 0.72)",
    border: "1px solid #dcefeb",
    borderRadius: 14,
    color: "#52606d",
    display: "grid",
    fontSize: 13,
    gap: 5,
    padding: 12,
  },
  trackSmallNote: {
    color: "#64717d",
    fontSize: 12,
    fontWeight: 800,
    margin: 0,
  },
  trackEmptyState: {
    background: "#f8fbff",
    border: "1px dashed #a7c9f7",
    borderRadius: 16,
    color: "#52606d",
    display: "grid",
    gap: 9,
    padding: 16,
  },
  ownerVisitPanel: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    display: "grid",
    gap: 12,
    boxShadow: "0 8px 20px rgba(41, 64, 83, 0.06)",
  },
  ownerVisitTitle: {
    color: "#082f3f",
    fontSize: 20,
    margin: "0 0 4px",
  },
  ownerVisitList: {
    display: "grid",
    gap: 10,
  },
  ownerVisitCard: {
    width: "100%",
    border: "1px solid #dcefeb",
    borderRadius: 16,
    background: "#ffffff",
    padding: 12,
    display: "grid",
    gridTemplateColumns: "52px minmax(0, 1fr) auto",
    gap: 12,
    alignItems: "center",
    textAlign: "left",
    cursor: "pointer",
  },
  ownerVisitImage: {
    width: 52,
    height: 52,
    borderRadius: 8,
    objectFit: "cover",
    background: "#e6f7f5",
  },
  ownerVisitContent: {
    display: "grid",
    gap: 3,
    color: "#52606d",
    fontSize: 13,
  },
  ownerVisitArrow: {
    color: "#087f78",
    fontSize: 12,
    fontWeight: 900,
    textAlign: "right",
  },
  manualVisitLinkPanel: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    display: "grid",
    gap: 4,
  },
  clinicSettingsPanel: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    padding: 16,
    marginBottom: 18,
    display: "grid",
    gap: 14,
    boxShadow: "0 8px 20px rgba(41, 64, 83, 0.06)",
  },
  clinicSettingsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 12,
    flexWrap: "wrap",
  },
  moreMenuGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 155px), 1fr))",
  },
  moreMenuCard: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#52606d",
    display: "grid",
    gap: 5,
    minHeight: 82,
    padding: 12,
  },
  moreMenuLogout: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 8,
    color: "#be123c",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 900,
    minHeight: 82,
    padding: 12,
    textAlign: "left",
  },
  settingsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
    gap: 10,
  },
  settingsFieldLabel: {
    display: "grid",
    gridTemplateColumns: "1fr 52px",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    border: "1px solid #cfe0df",
    borderRadius: 8,
    padding: "0 12px",
    color: "#52606d",
    fontSize: 13,
    fontWeight: 800,
  },
  colorInput: {
    width: 42,
    height: 34,
    padding: 0,
    border: "none",
    borderRadius: 8,
    background: "transparent",
    cursor: "pointer",
  },
  settingsToggleRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  settingsToggle: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "#f0fbf8",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    padding: "10px 12px",
    color: "#087f78",
    fontSize: 13,
    fontWeight: 900,
  },
  integrationPanel: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    display: "grid",
    gap: 12,
    padding: 14,
  },
  integrationHeader: {
    alignItems: "start",
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  integrationSummaryGrid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 130px), 1fr))",
  },
  integrationSummaryCard: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#64717d",
    display: "grid",
    fontSize: 12,
    fontWeight: 800,
    gap: 4,
    padding: 10,
  },
  integrationProviderGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
  },
  integrationProviderCard: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    display: "grid",
    gap: 9,
    padding: 12,
  },
  integrationProviderHeader: {
    alignItems: "start",
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
  },
  integrationStatusPill: {
    background: "#fff8f1",
    border: "1px solid #fed7c2",
    borderRadius: 8,
    color: "#9a3412",
    fontSize: 10,
    fontWeight: 900,
    padding: "5px 7px",
    textAlign: "center",
    whiteSpace: "nowrap",
  },
  integrationStatusPillActive: {
    background: "#ecfdf3",
    border: "1px solid #bbf7d0",
    color: "#027a48",
  },
  integrationDescription: {
    color: "#52606d",
    fontSize: 12,
    lineHeight: 1.35,
    margin: 0,
  },
  integrationCapabilityList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  integrationCapabilityPill: {
    background: "#f0fbf8",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    color: "#087f78",
    fontSize: 11,
    fontWeight: 800,
    padding: "5px 7px",
  },
  integrationEventList: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#52606d",
    display: "grid",
    fontSize: 12,
    gap: 5,
    lineHeight: 1.35,
    padding: 12,
  },
  referralDashboardPanel: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    boxShadow: "0 8px 20px rgba(41, 64, 83, 0.06)",
    display: "grid",
    gap: 14,
    marginBottom: 18,
    padding: 16,
  },
  referralDashboardHeader: {
    alignItems: "start",
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  referralStatsGrid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 105px), 1fr))",
  },
  referralStatCard: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#64717d",
    display: "grid",
    fontSize: 12,
    fontWeight: 800,
    gap: 3,
    padding: "10px 8px",
  },
  referralStatCardActive: {
    background: "#e6f7f5",
    borderColor: "#13a89e",
    color: "#087f78",
  },
  referralCardGrid: {
    display: "grid",
    gap: 14,
  },
  referralCard: {
    background: "#fbffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    display: "grid",
    gap: 12,
    padding: 14,
  },
  referralCardHeader: {
    alignItems: "start",
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
  },
  referralPetName: {
    color: "#243447",
    fontSize: 20,
    margin: "0 0 4px",
  },
  referralStatusBadge: {
    background: "#e6f7f5",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    color: "#087f78",
    fontSize: 11,
    fontWeight: 900,
    padding: "6px 8px",
    textAlign: "center",
    whiteSpace: "nowrap",
  },
  referralMetaGrid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  },
  referralDocumentList: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#52606d",
    display: "grid",
    fontSize: 13,
    gap: 5,
    padding: 12,
  },
  referralMessageList: {
    background: "#f0fbf8",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    color: "#087f78",
    display: "grid",
    fontSize: 13,
    gap: 5,
    padding: 12,
  },
  referralActionGrid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 135px), 1fr))",
  },
  referralMessageComposer: {
    display: "grid",
    gap: 8,
  },
  referralDetailShell: {
    display: "grid",
    gap: 14,
  },
  referralDetailHero: {
    alignItems: "center",
    background: "linear-gradient(135deg, #f0fffb, #ffffff)",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    padding: 16,
  },
  referralUrgencyBadge: {
    background: "#fff8f1",
    border: "1px solid #fed7c2",
    borderRadius: 8,
    color: "#9a3412",
    padding: "8px 10px",
    textAlign: "center",
  },
  workflowSectionGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  },
  workflowSection: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    display: "grid",
    gap: 12,
    padding: 14,
  },
  workflowSectionTitle: {
    color: "#102a3a",
    fontSize: 16,
    fontWeight: 900,
    margin: 0,
  },
  clinicInfoList: {
    display: "grid",
    gap: 9,
  },
  attachmentGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  },
  attachmentCard: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#243447",
    display: "grid",
    gap: 4,
    padding: 12,
    textDecoration: "none",
  },
  contextActionRow: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 145px), 1fr))",
  },
  staffSignOutButton: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    color: "#087f78",
    borderRadius: 8,
    padding: "9px 12px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
  },
  resultCard: {
  border: "1px solid #dcecec",
  borderRadius: 8,
  padding: 12,
  marginTop: 10,
  cursor: "pointer",
  background: "#ffffff",
  transition: "0.2s",
},
  visitList: {
    display: "grid",
    gap: 18,
    marginTop: 18,
  },
  patientListPanel: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    boxShadow: "0 10px 24px rgba(41, 64, 83, 0.07)",
    display: "grid",
    gap: 12,
    marginTop: 14,
    padding: 12,
  },
  patientListHeader: {
    alignItems: "flex-start",
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
  },
  patientListGrid: {
    display: "grid",
    gap: 10,
  },
  patientListCard: {
    alignItems: "center",
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#102a3a",
    cursor: "pointer",
    display: "grid",
    gap: 8,
    gridTemplateColumns: "minmax(0, 1fr) auto",
    minHeight: 72,
    padding: 12,
    textAlign: "left",
  },
  patientListSummary: {
    display: "grid",
    gap: 3,
    minWidth: 0,
  },
  patientListMeta: {
    alignItems: "center",
    color: "#52606d",
    display: "flex",
    flexWrap: "wrap",
    fontSize: 12,
    fontWeight: 800,
    gap: 6,
    gridColumn: "1 / -1",
  },
  patientListTriageChip: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 999,
    color: "#52606d",
    fontSize: 11,
    fontWeight: 900,
    padding: "4px 8px",
  },
  patientListOpen: {
    background: "#e6f7f5",
    borderRadius: 999,
    color: "#087f78",
    fontSize: 12,
    fontWeight: 900,
    padding: "7px 10px",
  },
  patientDetailScreen: {
    display: "grid",
    gap: 10,
    marginTop: 14,
  },
  patientDetailBackButton: {
    alignSelf: "start",
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 999,
    color: "#087f78",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
    padding: "9px 12px",
  },
  patientWorkflowCard: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    boxShadow: "0 12px 30px rgba(41, 64, 83, 0.08)",
    display: "grid",
    gap: 10,
    padding: 10,
  },
  patientOverviewSticky: {
    background: "rgba(255, 255, 255, 0.98)",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    boxShadow: "0 10px 24px rgba(41, 64, 83, 0.08)",
    display: "grid",
    gap: 9,
    padding: 12,
    position: "sticky",
    top: 58,
    zIndex: 8,
  },
  patientHeaderCard: {
    alignItems: "start",
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  patientMetaLine: {
    color: "#52606d",
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.25,
    margin: "3px 0 0",
  },
  patientStatusColumn: {
    alignItems: "flex-start",
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  },
  patientOverviewMetaGrid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 135px), 1fr))",
  },
  patientOverviewMetaList: {
    color: "#52606d",
    display: "grid",
    fontSize: 13,
    gap: 4,
  },
  patientChipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  patientStatusChip: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 999,
    color: "#52606d",
    fontSize: 11,
    fontWeight: 900,
    padding: "5px 8px",
  },
  patientStatusChipTeal: {
    background: "#e6f7f5",
    borderColor: "#bfe9e0",
    color: "#087f78",
  },
  patientStatusChipOrange: {
    background: "#fff8f1",
    borderColor: "#fed7c2",
    color: "#c2410c",
  },
  patientStatusChipRed: {
    background: "#fff1f2",
    borderColor: "#fecdd3",
    color: "#be123c",
  },
  patientStatusChipBlue: {
    background: "#eff6ff",
    borderColor: "#bfdbfe",
    color: "#1d4ed8",
  },
  primaryClinicalActionCard: {
    alignItems: "center",
    background: "linear-gradient(135deg, #087f78, #0f766e)",
    borderRadius: 8,
    color: "#ffffff",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "minmax(0, 1fr) auto",
    padding: 12,
  },
  primaryClinicalActionButton: {
    background: "#ffffff",
    border: "none",
    borderRadius: 8,
    color: "#087f78",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 900,
    minHeight: 44,
    padding: "0 14px",
    whiteSpace: "nowrap",
  },
  primaryClinicalSelect: {
    background: "#ffffff",
    border: "none",
    borderRadius: 8,
    color: "#087f78",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 900,
    minHeight: 44,
    padding: "0 10px",
    width: "100%",
  },
  quickActionRow: {
    display: "grid",
    gap: 6,
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  },
  quickActionButton: {
    alignItems: "center",
    background: "#f0fbf8",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    color: "#087f78",
    cursor: "pointer",
    display: "flex",
    fontSize: 12,
    fontWeight: 900,
    gap: 4,
    justifyContent: "center",
    minHeight: 38,
    padding: "6px 5px",
    textAlign: "center",
    textDecoration: "none",
  },
  queueSafeCard: {
    background: "#fff8f1",
    border: "1px solid #fed7c2",
    borderRadius: 8,
    color: "#9a3412",
    display: "grid",
    gap: 4,
    padding: 12,
  },
  visitCard: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    padding: 22,
    boxShadow: "0 8px 20px rgba(41, 64, 83, 0.06)",
  },
  visitHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
  },
  petName: {
    margin: 0,
    fontSize: 26,
    color: "#243447",
  },
  speciesPill: {
    background: "#e8f2ff",
    color: "#2457a6",
    padding: "5px 10px",
    borderRadius: 8,
    fontSize: 14,
  },
  status: {
    background: "#fff0e8",
    color: "#c24124",
    padding: "8px 12px",
    borderRadius: 8,
    display: "inline-block",
    fontWeight: 700,
  },
  pill: {
    background: "#e6f7f5",
    color: "#0f766e",
    padding: "8px 12px",
    borderRadius: 8,
    display: "inline-block",
    marginLeft: 8,
  },
  notesBox: {
    width: "100%",
    padding: 14,
    borderRadius: 8,
    border: "1px solid #cfe0df",
    fontSize: 15,
    minHeight: 85,
    marginTop: 12,
  },
  intakeSummaryCard: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    padding: 14,
    marginTop: 12,
    marginBottom: 12,
    color: "#243447",
  },
  intakeSummaryText: {
    whiteSpace: "pre-wrap",
    margin: "8px 0 0",
    fontFamily: "inherit",
    fontSize: 14,
    lineHeight: 1.45,
    color: "#52606d",
  },
  intakeCardGrid: {
    display: "grid",
    gap: 9,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 145px), 1fr))",
  },
  intakeDataCard: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#64717d",
    display: "grid",
    fontSize: 12,
    fontWeight: 800,
    gap: 4,
    padding: 10,
  },
  clinicTimeline: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(82px, 1fr))",
  },
  clinicTimelineItem: {
    alignItems: "center",
    color: "#52606d",
    display: "grid",
    fontSize: 11,
    fontWeight: 800,
    gap: 6,
    justifyItems: "center",
    textAlign: "center",
  },
  clinicTimelineDot: {
    background: "#ffffff",
    border: "2px solid #dbe5e8",
    borderRadius: "50%",
    color: "#ffffff",
    display: "grid",
    fontSize: 9,
    fontWeight: 900,
    height: 28,
    placeItems: "center",
    width: 28,
  },
  clinicTimelineDotComplete: {
    background: "#087f78",
    borderColor: "#087f78",
  },
  clinicTimelineDotCurrent: {
    background: "#14b8a6",
    borderColor: "#14b8a6",
  },
  compactWorkflowTracker: {
    display: "grid",
    gap: 5,
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  },
  compactWorkflowItem: {
    alignItems: "center",
    color: "#52606d",
    display: "grid",
    fontSize: 10,
    fontWeight: 900,
    gap: 5,
    justifyItems: "center",
    lineHeight: 1.05,
    textAlign: "center",
  },
  compactWorkflowDot: {
    background: "#ffffff",
    border: "2px solid #dbe5e8",
    borderRadius: "50%",
    color: "#ffffff",
    display: "grid",
    fontSize: 10,
    fontWeight: 900,
    height: 24,
    placeItems: "center",
    width: 24,
  },
  compactWorkflowDotComplete: {
    background: "#087f78",
    borderColor: "#087f78",
  },
  compactWorkflowDotCurrent: {
    background: "#14b8a6",
    borderColor: "#14b8a6",
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
    gap: 12,
    marginTop: 18,
    marginBottom: 18,
    border: "none",
    padding: 0,
    minInlineSize: 0,
  },
  clinicWorkflowFieldset: {
    border: "none",
    display: "grid",
    gap: 12,
    margin: 0,
    minInlineSize: 0,
    padding: 0,
  },
  sectionHeaderRow: {
    alignItems: "start",
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  workflowAccordion: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    overflow: "hidden",
  },
  workflowAccordionSummary: {
    color: "#102a3a",
    cursor: "pointer",
    fontSize: 17,
    fontWeight: 900,
    padding: 14,
  },
  contextActionStack: {
    display: "grid",
    gap: 12,
  },
  careEventPanel: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    display: "grid",
    gap: 10,
    padding: 12,
  },
  communicationTabRow: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    display: "grid",
    gap: 6,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 110px), 1fr))",
    padding: 5,
  },
  communicationTabButton: {
    background: "transparent",
    border: "none",
    borderRadius: 8,
    color: "#52606d",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
    minHeight: 40,
    padding: "8px 10px",
  },
  communicationTabButtonActive: {
    background: "#087f78",
    color: "#ffffff",
  },
  communicationPanel: {
    display: "grid",
    gap: 12,
  },
  ownerUpdateTemplateGrid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
  },
  templateButton: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#243447",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 900,
    minHeight: 48,
    padding: "9px 10px",
    textAlign: "left",
  },
  mediaActionRow: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 155px), 1fr))",
  },
  mediaUploadButton: {
    alignItems: "center",
    background: "#ecfeff",
    border: "1px solid #a5f3fc",
    borderRadius: 8,
    color: "#0f766e",
    cursor: "pointer",
    display: "flex",
    fontSize: 13,
    fontWeight: 900,
    justifyContent: "center",
    minHeight: 44,
    padding: "9px 10px",
  },
  mediaPreviewCard: {
    alignItems: "center",
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    display: "grid",
    gap: 10,
    gridTemplateColumns: "72px minmax(0, 1fr)",
    padding: 10,
  },
  mediaPreviewImage: {
    borderRadius: 8,
    height: 72,
    objectFit: "cover",
    width: 72,
  },
  mediaPreviewIcon: {
    alignItems: "center",
    background: "#e6f7f5",
    borderRadius: 8,
    color: "#087f78",
    display: "flex",
    fontSize: 12,
    fontWeight: 900,
    height: 72,
    justifyContent: "center",
    textAlign: "center",
    width: 72,
  },
  approvalStatusGrid: {
    background: "#f8fbff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    color: "#52606d",
    display: "grid",
    fontSize: 13,
    fontWeight: 800,
    gap: 6,
    padding: 12,
  },
  disabledActionGrid: {
    opacity: 0.58,
    cursor: "wait",
  },
  pendingActionNotice: {
    background: "#f0fbf8",
    border: "1px solid #bfe9e0",
    color: "#087f78",
    borderRadius: 8,
    padding: "10px 12px",
    marginTop: 14,
    fontSize: 14,
    fontWeight: 800,
  },
  actionGroupTitle: {
    gridColumn: "1 / -1",
    color: "#243447",
    fontSize: 14,
    fontWeight: 800,
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1px solid #eef3f4",
  },
  greenAction: actionStyle("#ecfdf3", "#027a48"),
  blueAction: actionStyle("#eff6ff", "#1d4ed8"),
  purpleAction: actionStyle("#faf5ff", "#7e22ce"),
  orangeAction: actionStyle("#fff7ed", "#ea580c"),
  tealAction: actionStyle("#ecfeff", "#0f766e"),
  redAction: actionStyle("#fff1f2", "#e11d48"),
  doctorSelect: {
    minHeight: 44,
    border: "1px solid #e9d5ff",
    borderRadius: 8,
    background: "#faf5ff",
    color: "#7e22ce",
    padding: "0 12px",
    fontWeight: 800,
    cursor: "pointer",
  },
  clinicDoctorLink: {
    display: "inline-block",
    background: "#faf5ff",
    color: "#7e22ce",
    border: "1px solid #e9d5ff",
    borderRadius: 8,
    padding: "9px 12px",
    fontWeight: 800,
    fontSize: 14,
    textDecoration: "none",
    marginBottom: 10,
  },
  detailsBox: {
    background: "#f8fbff",
    borderRadius: 8,
    padding: 18,
    margin: "18px 0",
    border: "1px solid #dcefeb",
  },
  timeline: {
    display: "grid",
    gap: 12,
    marginBottom: 20,
  },
  timelineItem: {
    display: "grid",
    gridTemplateColumns: "40px 1fr",
    gap: 12,
    alignItems: "start",
  },
  timelineDot: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "#13a89e",
    color: "white",
    display: "grid",
    placeItems: "center",
    fontWeight: 700,
  },
  timelineContent: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    padding: 14,
  },
  timelineMessage: {
    margin: "0 0 8px",
  },

  statusHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
},

doctorProfileCard: {
  display: "grid",
  gap: 4,
  background: "#ffffff",
  border: "1px solid #e1ecec",
  borderRadius: 8,
  padding: 14,
  marginBottom: 16,
  textDecoration: "none",
  boxShadow: "0 8px 20px rgba(41, 64, 83, 0.06)",
},

doctorProfileLabel: {
  color: "#64717d",
  fontSize: 12,
  fontWeight: 700,
},

doctorProfileName: {
  color: "#102a3a",
  fontSize: 16,
},

doctorProfileAction: {
  color: "#087f78",
  fontSize: 13,
  fontWeight: 800,
},

ownerPortalShell: {
  display: "grid",
  gap: 14,
},

ownerPortalHeader: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 4,
},

ownerActionAlert: {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  borderRadius: 8,
  color: "#c2410c",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 900,
  padding: "8px 10px",
},

viewOnlyBadge: {
  background: "#f8fbff",
  border: "1px solid #b9d6da",
  borderRadius: 999,
  color: "#12485a",
  fontSize: 11,
  fontWeight: 900,
  padding: "7px 10px",
},

ownerTabPanel: {
  display: "grid",
  gap: 14,
},

ownerHeroStatusCard: {
  background: "linear-gradient(135deg, #f0fffb, #ffffff)",
  border: "1px solid #bfe9e0",
  borderRadius: 8,
  boxShadow: "0 12px 30px rgba(41, 64, 83, 0.08)",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 78px",
  gap: 12,
  alignItems: "center",
  padding: 16,
},

ownerHeroEyebrow: {
  color: "#087f78",
  display: "block",
  fontSize: 11,
  fontWeight: 900,
  marginBottom: 6,
  textTransform: "uppercase",
},

ownerHeroTitle: {
  color: "#102a3a",
  fontSize: 25,
  lineHeight: 1.08,
  margin: "0 0 8px",
},

ownerHeroText: {
  color: "#52606d",
  fontSize: 14,
  lineHeight: 1.4,
  margin: 0,
},

ownerHeroPetImage: {
  width: 78,
  height: 78,
  borderRadius: "50%",
  objectFit: "cover",
  border: "4px solid #d7f7f2",
},

ownerStatusCard: {
  background: "#ffffff",
  border: "1px solid #dcefeb",
  borderRadius: 8,
  display: "grid",
  gap: 10,
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  padding: 14,
},

ownerStatusLabel: {
  color: "#64717d",
  display: "block",
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 4,
},

ownerStatusValue: {
  color: "#102a3a",
  fontSize: 18,
  lineHeight: 1.2,
},

ownerReviewPill: {
  background: "#f0fbf8",
  border: "1px solid #bfe9e0",
  borderRadius: 8,
  color: "#087f78",
  fontSize: 11,
  fontWeight: 900,
  padding: "8px 9px",
  textAlign: "center",
},

ownerStageTracker: {
  background: "#ffffff",
  border: "1px solid #dcefeb",
  borderRadius: 8,
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: 4,
  padding: 12,
},

ownerStageItem: {
  color: "#64717d",
  display: "grid",
  fontSize: 10,
  fontWeight: 800,
  gap: 6,
  justifyItems: "center",
  lineHeight: 1.1,
  textAlign: "center",
},

ownerStageDot: {
  width: 27,
  height: 27,
  borderRadius: "50%",
  background: "#f8fafc",
  border: "1px solid #dbe5e8",
  display: "grid",
  placeItems: "center",
  color: "#ffffff",
  fontSize: 9,
  fontWeight: 900,
},

ownerStageDotActive: {
  background: "#14b8a6",
  borderColor: "#14b8a6",
},

ownerStageDotComplete: {
  background: "#087f78",
  borderColor: "#087f78",
},

latestUpdatePanel: {
  background: "#ffffff",
  border: "1px solid #dcefeb",
  borderRadius: 8,
  boxShadow: "0 8px 20px rgba(41, 64, 83, 0.06)",
  display: "grid",
  gap: 10,
  padding: 14,
},

ownerSectionHeader: {
  background: "#f8fbff",
  border: "1px solid #dcefeb",
  borderRadius: 8,
  padding: 14,
},

ownerTimeline: {
  display: "grid",
  gap: 10,
},

ownerTimelineItem: {
  display: "grid",
  gridTemplateColumns: "28px minmax(0, 1fr)",
  gap: 10,
  alignItems: "start",
},

ownerTimelineDot: {
  width: 16,
  height: 16,
  borderRadius: "50%",
  border: "2px solid #dbe5e8",
  background: "#ffffff",
  marginTop: 16,
  justifySelf: "center",
},

ownerTimelineDotActive: {
  background: "#14b8a6",
  borderColor: "#14b8a6",
},

ownerNoActionCard: {
  background: "#f0fbf8",
  border: "1px solid #bfe9e0",
  borderRadius: 8,
  color: "#087f78",
  display: "grid",
  gap: 5,
  padding: 14,
},

ownerPetProfileCard: {
  background: "#ffffff",
  border: "1px solid #dcefeb",
  borderRadius: 8,
  display: "grid",
  gridTemplateColumns: "72px minmax(0, 1fr)",
  gap: 12,
  alignItems: "center",
  padding: 14,
},

ownerPetProfileImage: {
  width: 72,
  height: 72,
  borderRadius: 8,
  objectFit: "cover",
  border: "3px solid #e7fbf7",
},

ownerInfoGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 145px), 1fr))",
  gap: 10,
},

ownerInfoCard: {
  background: "#ffffff",
  border: "1px solid #dcefeb",
  borderRadius: 8,
  display: "grid",
  gap: 4,
  padding: 12,
},

ownerFormCard: {
  background: "#ffffff",
  border: "1px solid #dcefeb",
  borderRadius: 8,
  display: "grid",
  gap: 12,
  marginBottom: 12,
  padding: 14,
},

ownerFormHeader: {
  alignItems: "flex-start",
  display: "flex",
  gap: 10,
  justifyContent: "space-between",
},

ownerFormBody: {
  background: "#f8fbff",
  border: "1px solid #e1ecec",
  borderRadius: 8,
  color: "#52606d",
  fontSize: 13,
  lineHeight: 1.4,
  padding: 12,
},

ownerFormActions: {
  display: "grid",
  gap: 10,
},

ownerCompletedText: {
  color: "#027a48",
  fontWeight: 800,
  margin: 0,
},

ownerDeclinedText: {
  color: "#b91c1c",
  fontWeight: 800,
  margin: 0,
},

ownerGreeting: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: 16,
  marginTop: 18,
  marginBottom: 16,
},

notificationBell: {
  width: 40,
  height: 40,
  borderRadius: "50%",
  background: "#fff1f2",
  color: "#e11d48",
  display: "grid",
  placeItems: "center",
  fontWeight: 800,
  border: "1px solid #fecdd3",
},

liveUpdateCard: {
  background: "#ffffff",
  border: "1px solid #e1ecec",
  borderRadius: 8,
  padding: 18,
  marginBottom: 18,
  boxShadow: "0 12px 30px rgba(41, 64, 83, 0.08)",
},

liveCardTop: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 14,
},

liveBadge: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 112,
  minHeight: 28,
  boxSizing: "border-box",
  background: "#dcfce7",
  color: "#047857",
  border: "1px solid #dcfce7",
  borderRadius: 8,
  padding: "7px 9px",
  fontSize: 10,
  fontWeight: 800,
  lineHeight: 1,
},

liveWaitPill: {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  width: 112,
  minHeight: 28,
  boxSizing: "border-box",
  background: "#f8fbff",
  border: "1px solid #dcefeb",
  borderRadius: 8,
  padding: "7px 9px",
  color: "#12485a",
  flexShrink: 0,
},

liveWaitLabel: {
  color: "#64717d",
  fontSize: 10,
  fontWeight: 700,
},

liveWaitValue: {
  color: "#12485a",
  fontSize: 10,
  fontWeight: 800,
  lineHeight: 1,
},

liveUpdateBody: {
  display: "grid",
  gridTemplateColumns: "1fr 92px",
  gap: 14,
  alignItems: "center",
},

liveUpdateTitle: {
  color: "#102a3a",
  fontSize: 14,
  lineHeight: 1.3,
  margin: 0,
},

previousUpdatesPanel: {
  borderTop: "1px solid #eef3f4",
  marginTop: 14,
  paddingTop: 12,
},

previousUpdatesButton: {
  width: "100%",
  background: "#f8fbff",
  border: "1px solid #dcefeb",
  color: "#087f78",
  borderRadius: 8,
  padding: "10px 12px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 800,
},

previousUpdatesList: {
  display: "grid",
  gap: 8,
  marginTop: 10,
},

previousUpdateItem: {
  background: "#f8fbff",
  border: "1px solid #e1ecec",
  borderRadius: 8,
  padding: 10,
  color: "#52606d",
  fontSize: 13,
  lineHeight: 1.35,
},

petAvatar: {
  width: 92,
  height: 92,
  borderRadius: "50%",
  objectFit: "cover",
  border: "4px solid #e7fbf7",
},

progressRail: {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 8,
  background: "#ffffff",
  border: "1px solid #e1ecec",
  borderRadius: 8,
  padding: 14,
  marginBottom: 20,
},

progressStep: {
  display: "grid",
  justifyItems: "center",
  gap: 8,
  color: "#64717d",
  fontSize: 12,
  textAlign: "center",
},

progressDot: {
  width: 34,
  height: 34,
  borderRadius: "50%",
  border: "1px solid #dbe5e8",
  display: "grid",
  placeItems: "center",
  color: "#94a3b8",
  background: "#f8fafc",
  fontWeight: 800,
},

progressDotActive: {
  background: "#14b8a6",
  color: "#ffffff",
  border: "1px solid #14b8a6",
},

ownerActionCard: {
  background: "#ffffff",
  border: "1px solid #e1ecec",
  borderRadius: 8,
  padding: 16,
  marginBottom: 20,
  boxShadow: "0 10px 25px rgba(41, 64, 83, 0.06)",
},

sectionTitle: {
  color: "#102a3a",
  fontSize: 20,
  margin: "0 0 12px",
},

ownerMenuButton: {
  width: "100%",
  minHeight: 56,
  background: "#ffffff",
  border: "1px solid #e1ecec",
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px",
  marginTop: 10,
  color: "#102a3a",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 15,
},

careHubButton: {
  width: "100%",
  minHeight: 48,
  background: "linear-gradient(135deg, #13a89e, #0f766e)",
  border: "none",
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 900,
  fontSize: 15,
},

careHubIntro: {
  color: "#52606d",
  fontSize: 14,
  lineHeight: 1.45,
  margin: "0 0 12px",
},

careHubPortal: {
  background: "#ffffff",
  border: "1px solid #dcefeb",
  borderRadius: 8,
  padding: 16,
  marginBottom: 20,
  boxShadow: "0 14px 34px rgba(41, 64, 83, 0.09)",
},

careHubHeader: {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 14,
},

careHubEyebrow: {
  color: "#087f78",
  fontSize: 11,
  fontWeight: 900,
  margin: "0 0 5px",
  textTransform: "uppercase",
},

careHubBackButton: {
  background: "#f8fbff",
  color: "#087f78",
  border: "1px solid #dcefeb",
  borderRadius: 8,
  padding: "8px 10px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 900,
},

careHubCategoryGrid: {
  display: "grid",
  gap: 10,
},

careHubCategoryCard: {
  background: "linear-gradient(135deg, #fbffff, #f2fbfa)",
  border: "1px solid #dcefeb",
  borderRadius: 8,
  padding: 14,
  cursor: "pointer",
  display: "grid",
  gap: 5,
  textAlign: "left",
  boxShadow: "0 8px 18px rgba(41, 64, 83, 0.05)",
},

careHubCategoryTitle: {
  color: "#102a3a",
  fontSize: 15,
  fontWeight: 900,
},

careHubCategoryText: {
  color: "#52606d",
  fontSize: 13,
  lineHeight: 1.35,
},

careHubCategoryMeta: {
  color: "#087f78",
  fontSize: 12,
  fontWeight: 900,
  marginTop: 2,
},

careHubCategoryHeader: {
  background: "#f8fbff",
  border: "1px solid #e1ecec",
  borderRadius: 8,
  padding: 12,
  marginBottom: 12,
},

careHubFormSectionTitle: {
  color: "#102a3a",
  fontSize: 18,
  fontWeight: 900,
  margin: "0 0 6px",
},

careHubFormList: {
  display: "grid",
  gap: 10,
},

careHubFormCard: {
  background: "#ffffff",
  border: "1px solid #e1ecec",
  borderRadius: 8,
  padding: 12,
  display: "grid",
  gap: 12,
},

careHubFormTitleRow: {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
},

careHubFormTitle: {
  color: "#102a3a",
  fontSize: 15,
  fontWeight: 900,
  margin: 0,
},

careHubFormDescription: {
  color: "#52606d",
  fontSize: 13,
  lineHeight: 1.4,
  margin: "6px 0 0",
},

careHubStatusBadge: {
  background: "#fff7ed",
  color: "#c2410c",
  border: "1px solid #fed7aa",
  borderRadius: 8,
  padding: "5px 8px",
  fontSize: 11,
  fontWeight: 900,
  whiteSpace: "nowrap",
},

careHubSignedBadge: {
  background: "#ecfdf3",
  color: "#027a48",
  border: "1px solid #bbf7d0",
},

careHubViewButton: {
  width: "100%",
  background: "#f0fbf8",
  color: "#087f78",
  border: "1px solid #bfe9e0",
  borderRadius: 8,
  padding: "10px 12px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 900,
},

careHubConsentShell: {
  display: "grid",
  gap: 12,
},

careHubConsentHeader: {
  background: "#f0fbf8",
  border: "1px solid #bfe9e0",
  borderRadius: 8,
  padding: 12,
},

careHubLegalBox: {
  background: "#ffffff",
  border: "1px solid #e1ecec",
  borderRadius: 8,
  padding: 14,
},

careHubMetaGrid: {
  display: "grid",
  gap: 6,
  background: "#f8fbff",
  borderRadius: 8,
  padding: 10,
  color: "#52606d",
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 12,
},

careHubLegalText: {
  color: "#243447",
  fontSize: 14,
  lineHeight: 1.5,
  margin: "0 0 10px",
},

careHubSignatureForm: {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 12,
},

careHubCheckRow: {
  background: "#f8fbff",
  border: "1px solid #dcefeb",
  borderRadius: 8,
  padding: 12,
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  color: "#243447",
  fontSize: 14,
  fontWeight: 800,
  lineHeight: 1.35,
},

careHubSignedBox: {
  display: "grid",
  gap: 5,
  background: "#ecfdf3",
  border: "1px solid #bbf7d0",
  borderRadius: 8,
  padding: 12,
  color: "#027a48",
  fontSize: 14,
},

careHubActionList: {
  display: "none",
  gap: 8,
  marginTop: 12,
},

careHubActionItem: {
  background: "#f8fbff",
  border: "1px solid #e1ecec",
  borderRadius: 8,
  padding: "10px 12px",
  color: "#102a3a",
  fontSize: 14,
  fontWeight: 800,
},

bottomNav: {
  position: "sticky",
  bottom: 0,
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: 4,
  background: "rgba(255, 255, 255, 0.96)",
  border: "1px solid #e1ecec",
  borderRadius: 8,
  padding: "8px 6px",
  marginTop: 18,
  boxShadow: "0 -8px 24px rgba(41, 64, 83, 0.08)",
  textAlign: "center",
  color: "#64717d",
},

bottomNavButton: {
  background: "transparent",
  border: "none",
  borderRadius: 8,
  color: "#64717d",
  cursor: "pointer",
  display: "grid",
  fontSize: 11,
  fontWeight: 900,
  gap: 2,
  minHeight: 42,
  padding: "7px 2px",
  placeItems: "center",
  position: "relative",
},

bottomNavActive: {
  background: "#f0fbf8",
  color: "#087f78",
},

bottomNavBadge: {
  background: "#fff1f2",
  border: "1px solid #fecdd3",
  borderRadius: 999,
  color: "#e11d48",
  fontSize: 10,
  fontWeight: 900,
  minWidth: 18,
  padding: "1px 5px",
},

petTitle: {
  fontSize: 24,
  fontWeight: 800,
  margin: 0,
},

statusBadge: {
  background: "#e6f7f5",
  color: "#0f766e",
  padding: "5px 9px",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 12,
},

detailsCard: {
  background: "#ffffff",
  borderRadius: 8,
  padding: 18,
  border: "1px solid #dcefeb",
  marginBottom: 18,
},
};


