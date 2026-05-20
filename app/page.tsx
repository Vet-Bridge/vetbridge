"use client";

import { useEffect, useRef, useState } from "react";

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
};

type DoctorOption = {
  name: string;
  profileUrl: string;
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
  const [selectedSpecies, setSelectedSpecies] = useState("");
  const [selectedReferralSpecies, setSelectedReferralSpecies] = useState("");
  const [searchError, setSearchError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittingVisit, setSubmittingVisit] = useState(false);
  const [submittingReferral, setSubmittingReferral] = useState(false);
  const [clinicLoading, setClinicLoading] = useState(false);
  const [pendingClinicActions, setPendingClinicActions] = useState<Record<string, string>>({});
  const [selectedVisitType, setSelectedVisitType] = useState("");
  const [petPhotoPreview, setPetPhotoPreview] = useState("");
  const [petPhotoByVisitId, setPetPhotoByVisitId] = useState<Record<string, string>>({});
  const [selectedAllergies, setSelectedAllergies] = useState("");
  const [petMediaName, setPetMediaName] = useState("");
  const [petMediaType, setPetMediaType] = useState("");
  const [referralDocumentNames, setReferralDocumentNames] = useState<string[]>([]);
  const [clinicPin, setClinicPin] = useState("");
  const [clinicUnlocked, setClinicUnlocked] = useState(false);
  const [clinicError, setClinicError] = useState("");
  const [expandedUpdatesVisitId, setExpandedUpdatesVisitId] = useState<string | null>(null);
  const [careHubOpen, setCareHubOpen] = useState(false);
  const [selectedCareHubCategoryId, setSelectedCareHubCategoryId] = useState<string | null>(null);
  const [selectedCareHubFormId, setSelectedCareHubFormId] = useState<string | null>(null);
  const [signedCareHubForms, setSignedCareHubForms] = useState<
    Record<string, { signedName: string; signedAt: string }>
  >({});
  const submittingVisitRef = useRef(false);
  const submittingReferralRef = useRef(false);
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
  const commonSymptoms = [
    "Vomiting",
    "Diarrhea",
    "Labored breathing",
    "Coughing",
    "Limping or unable to walk",
    "Seizure activity",
    "Pale gums",
    "Swollen abdomen",
    "Excessive drooling",
    "Lethargy or weakness",
  ];
  const [visits, setVisits] = useState<Visit[]>([]);
  const [searchResults, setSearchResults] = useState<Visit[]>([]);
  const selectedVisit = visits.find((v) => v.id === selectedVisitId) || null;
  const selectedUpdates = selectedVisit?.updates || [];
  const latestOwnerUpdate = selectedUpdates[selectedUpdates.length - 1];
  const previousOwnerUpdates = selectedUpdates.slice(0, -1).reverse();
  const showPreviousUpdates = Boolean(
    selectedVisitId && expandedUpdatesVisitId === selectedVisitId
  );
  const selectedCareHubCategory =
    careHubCategories.find((category) => category.id === selectedCareHubCategoryId) || null;
  const selectedCareHubForm =
    selectedCareHubCategory?.forms.find((form) => form.id === selectedCareHubFormId) || null;
  const signedCareHubCount = careHubCategories.reduce(
    (total, category) =>
      total + category.forms.filter((form) => signedCareHubForms[form.id]).length,
    0
  );
  const careHubFormCount = careHubCategories.reduce(
    (total, category) => total + category.forms.length,
    0
  );
  const activeVisits = visits.filter((visit) => visit.status !== "Closed");
  const closedVisits = visits.filter((visit) => visit.status === "Closed");
  const queueVisits = activeVisits
    .filter((visit) => visit.status !== "Ready for pickup")
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  const apiRequest = async <T,>(payload: Record<string, unknown>): Promise<T> => {
    const response = await fetch("/api/mypawlink", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(result?.error || "Request failed.");
    }

    return response.json() as Promise<T>;
  };

  useEffect(() => {
    loadVisits();
  }, []);

  async function loadVisits(pin = clinicPin) {
    if (!pin || clinicLoadingRef.current) return;

    clinicLoadingRef.current = true;
    setClinicLoading(true);

    try {
      const result = await apiRequest<{ visits: Visit[] }>({
        action: "loadVisits",
        clinicPin: pin,
      });
      setVisits(result.visits);
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
  const getOwnerName = (visit: Visit) => `${visit.ownerFirstName} ${visit.ownerLastName}`;

  const getSpecies = (visit: Visit) =>
    visit.species === "Other" ? visit.otherSpecies : visit.species;

  const getPetPhoto = (visit: Visit) =>
    visit.petPhotoUrl ||
    getPetPhotoFromNotes(visit.clinicNotes) ||
    petPhotoByVisitId[visit.id] ||
    "/vet-hero.jpeg";

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

  const handleReferralDocumentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setReferralDocumentNames(files.map((file) => file.name));
  };

  const getQueueDetails = (visit: Visit) => {
    if (visit.status === "Closed" || visit.status === "Ready for pickup") {
      return null;
    }

    const queueIndex = queueVisits.findIndex((queuedVisit) => queuedVisit.id === visit.id);
    const patientsAhead = Math.max(queueIndex, 0);
    const estimatedWaitMinutes = patientsAhead * 25 + 15;

    return {
      position: patientsAhead + 1,
      patientsAhead,
      estimatedWaitMinutes,
    };
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

  const createVisit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (submittingVisitRef.current) return;
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
    mediaFile && mediaFile.name
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
    `Started: ${String(form.get("whenStartedDays") || "Not provided")} day(s) ago`,
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
    alert(error instanceof Error ? error.message : "Error creating visit");
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
  setSelectedSpecies("");
  setSelectedVisitType("");
  setSelectedAllergies("");
  setPetMediaName("");
  setPetMediaType("");
  setPetPhotoPreview("");
  setView("status");
  submittingVisitRef.current = false;
  setSubmittingVisit(false);
};

  const createReferralVisit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (submittingReferralRef.current) return;
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
    const referralDocuments = form
      .getAll("referralDocuments")
      .filter((entry): entry is File => entry instanceof File && Boolean(entry.name));
    const transferTime = String(form.get("transferTime") || "").trim();
    const referralName = doctorName
      ? `${clinicName} - Dr. ${doctorName}`
      : clinicName;
    const uploadedDocumentNames = referralDocuments.map((file) => file.name);

    const referralSummary = [
      "Referral intake",
      `Referring clinic: ${clinicName}`,
      `Referring doctor: ${doctorName}`,
      `Doctor contact: ${doctorPhone || "No phone provided"} / ${doctorEmail || "No email provided"}`,
      `Pet owner: ${[ownerFirstName, ownerLastName].filter(Boolean).join(" ") || "Not provided"}`,
      `Owner contact: ${ownerPhone || "No phone provided"} / ${ownerEmail || "No email provided"}`,
      `Documents included: ${documentsIncluded.length ? documentsIncluded.join(", ") : "Not specified"}`,
      `Uploaded files selected: ${uploadedDocumentNames.length ? uploadedDocumentNames.join(", ") : "None selected"}`,
      `Referral notes: ${String(form.get("referralNotes") || "").trim() || "Not provided"}`,
      `Treatment already given: ${String(form.get("treatmentGiven") || "").trim() || "Not provided"}`,
      `Medications: ${String(form.get("medications") || "").trim() || "Not provided"}`,
      `IV fluids: ${String(form.get("ivFluids") || "Not provided")}`,
      `Time of transfer: ${transferTime || "Not provided"}`,
    ].join("\n");

    let visit: Visit;

    try {
      const result = await apiRequest<{ visit: Visit }>({
        action: "createReferral",
        owner: {
          first_name: ownerFirstName || "Referral",
          last_name: ownerLastName || clinicName,
          phone: ownerPhone || doctorPhone,
          email: ownerEmail || doctorEmail,
        },
        pet: {
          pet_name: String(form.get("petName")),
          species: String(form.get("species")),
          other_species: String(form.get("otherSpecies") || ""),
          breed: String(form.get("breed") || ""),
        },
        visit: {
          visit_type: "Vet referral",
          referral_name: referralName,
          been_here_before: "Unknown",
          reason: referralSummary,
          status: "Referral received",
        },
        firstUpdateMessage: `Referral intake submitted by ${clinicName}. The emergency team will review the transfer information.`,
        firstUpdateStatus: "Referral received",
      });
      visit = result.visit;
  } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Error creating referral");
      submittingReferralRef.current = false;
      setSubmittingReferral(false);
      return;
    }

    setVisits((current) => [visit, ...current.filter((item) => item.id !== visit.id)]);
    setSelectedReferralSpecies("");
    setReferralDocumentNames([]);
    alert("Referral intake sent to the clinic dashboard.");
    setView(clinicUnlocked ? "clinic" : "home");
    submittingReferralRef.current = false;
    setSubmittingReferral(false);
  };

  const sendUpdate = async (
    visitId: string,
    status: string,
    message: string,
    actionLabel = "Sending update..."
  ) => {
    if (!beginClinicAction(visitId, actionLabel)) return;

    try {
      const result = await apiRequest<{ visit: Visit }>({
        action: "sendUpdate",
        visitId,
        status,
        message,
        clinicPin,
      });
      setVisits((current) =>
        current.map((visit) => (visit.id === visitId ? result.visit : visit))
      );
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
        clinicPin,
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
      const result = await apiRequest<{ visit: Visit }>({
        action: "assignDoctor",
        visitId,
        clinicNotes: updatedNotes,
        message,
        clinicPin,
      });
      setVisits((current) =>
        current.map((item) => (item.id === visitId ? result.visit : item))
      );
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
      const result = await apiRequest<{ visit: Visit }>({
        action: "sendForm",
        visitId: visit.id,
        formType,
        formBody,
        status: visit.status,
        message: updateMessage,
        clinicPin,
      });
      setVisits((current) =>
        current.map((item) => (item.id === visit.id ? result.visit : item))
      );
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

  const sendEstimateApproval = (visit: Visit) => {
    const estimateTotal = window.prompt("Estimate total or range, for example $1,200-$1,800");
    if (!estimateTotal) return;

    const estimateDetails = window.prompt("What is included in the estimate?");
    if (!estimateDetails) return;

    sendFormToVisit(
      visit,
      "Estimate approval",
      [
        `Estimated total: ${estimateTotal}`,
        "",
        "Included items:",
        estimateDetails,
        "",
        "Owner may approve, decline, or request a doctor discussion before proceeding.",
      ].join("\n"),
      `An estimate is ready for ${visit.petName}. Please review and respond in MyPawLink.`
    );
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
        <div style={styles.heroLeft}>
          <div style={styles.brandRow}>
            <div style={styles.logoCrop}>
              <img src="/mypawlink-logo.png" alt="MyPawLink" style={styles.logoImage} />
            </div>
          </div>

          <h2 style={styles.heroTitle}>
            A calmer way to stay connected <span style={styles.accentText}>when it matters most.</span>
          </h2>

          <p style={styles.heroSubtitle}>
            Real-time updates from your emergency vet team so you&apos;re never left wondering.
          </p>
        </div>

        <div style={styles.heroRight}>
          <div style={styles.petHeroStage}>
            <div style={{ ...styles.floatBubble, left: 8, top: 56 }}>
              <MiniIcon type="chat" />
            </div>
            <div style={{ ...styles.floatBubble, right: 20, top: 4 }}>
              <MiniIcon type="plus" />
            </div>
            <div style={{ ...styles.floatBubble, right: 0, bottom: 96 }}>
              <MiniIcon type="heart" />
            </div>
            <img src="/vet-hero.jpeg" alt="Dog with veterinarian" style={styles.heroImage} />
          </div>

          <div style={styles.featurePanel}>
            <InfoCard icon={<MiniIcon type="chat" />} title="Real-time updates" text="Know what&apos;s happening every step of the way." />
            <InfoCard icon={<MiniIcon type="check" />} title="Better communication" text="Stay informed without the stress of calling." />
            <InfoCard icon={<MiniIcon type="heart" />} title="Stronger trust" text="Keep owners and clinics connected during care." />
            <div style={styles.secureLine}>
              <MiniIcon type="lock" />
              <span>Your pet&apos;s data is secure and private.</span>
            </div>
          </div>

          <div style={styles.startHeader}>
            <h2 style={styles.startHeaderTitle}>Let&apos;s get started</h2>
            <p style={styles.startHeaderText}>Choose an option below to connect with your pet&apos;s care team.</p>
          </div>

          <div style={styles.buttonRow}>
  <button style={styles.primaryCardButton} onClick={() => setView("newPet")}>
    <span style={styles.bigIcon}><MiniIcon type="paw" /></span>
      <div style={styles.buttonText}>
      <div style={styles.buttonTitle}>Start<br />New Visit</div>
      <div style={styles.buttonSubtitle}>
        Check your pet in before arrival or when you get to the hospital.
      </div>
    </div>
    <span style={styles.cardCta}>Start New Visit -&gt;</span>
  </button>

            <button style={styles.darkCardButton} onClick={() => setView("existingPet")}>
    <span style={styles.bigIcon}><MiniIcon type="search" /></span>
    <div style={styles.buttonText}>
      <div style={styles.buttonTitle}>Track Your<br />Pet&apos;s Visit</div>
      <div style={styles.buttonSubtitle}>
        Already checked in? Enter your pet&apos;s name and your email or phone number to view live updates.
      </div>
    </div>
    <span style={styles.cardCtaBlue}>Track Visit -&gt;</span>
  </button>

            <button style={styles.referralCardButton} onClick={() => setView("referral")}>
    <span style={styles.bigIcon}><MiniIcon type="referral" /></span>
    <div style={styles.buttonText}>
      <div style={styles.buttonTitle}>Referral<br />Intake</div>
      <div style={styles.buttonSubtitle}>
        Regular vets can send transfer notes, labs, imaging, medications, and doctor contact info.
      </div>
    </div>
    <span style={styles.cardCtaReferral}>Start Referral -&gt;</span>
  </button>
</div> <button
  style={styles.staffLinkButton}
  onClick={() => setView("clinic")}
>
  Clinic staff dashboard
</button>
        </div>
      </section>
      )}

      <section style={styles.mainGrid}>
        <div style={styles.panel}>
          {view === "newPet" && (
            <section>
              <h2 style={styles.title}>Pet Owner</h2>
              <p style={styles.text}>Submit a visit request</p>

              <div style={styles.noticeBox}>
                <strong>We&apos;re here to help your pet.</strong>
                <p>
                  Please provide the details below so our team can be prepared for your arrival.
                </p>
              </div>

              <form onSubmit={createVisit} style={styles.form}>
                <input style={styles.input} name="petName" placeholder="Pet name" required />

                <select
                  style={styles.input}
                  name="species" 
                  required
                  value={selectedSpecies} 
                  onChange={(e) => setSelectedSpecies(e.target.value)}
                >
                  <option value="">Species</option>
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                  <option value="Other">Other</option>
                </select> {selectedSpecies === "Dog" && (
  <select style={styles.input} name="breed" required>
    <option value="">Select Dog Breed</option>
    {dogBreeds.map((breed) => (
      <option key={breed} value={breed}>
        {breed}
      </option>
    ))}
  </select>
)}

{selectedSpecies === "Cat" && (
  <select style={styles.input} name="breed" required>
    <option value="">Select Cat Breed</option>
    {catBreeds.map((breed) => (
      <option key={breed} value={breed}>
        {breed}
      </option>
    ))}
  </select>
)}

                <input
                  style={styles.input}
                  name="petAge"
                  placeholder="Approx. age (optional)"
                />

                <select style={styles.input} name="sex" required>
                  <option value="">Sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Unknown">Unknown</option>
                </select>

                <select style={styles.input} name="spayedNeutered" required>
                  <option value="">Spayed/neutered?</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>

                <input
                  style={styles.input}
                  type="number"
                  min="0"
                  step="0.1"
                  name="weight"
                  placeholder="Weight in pounds (if known)"
                />

                {selectedSpecies === "Other" && (
                  <input
                    style={styles.input}
                    name="otherSpecies"
                    placeholder="Enter pet type, for example Rabbit or Bird"
                    required
                  />
                )}

                <select style={styles.input} name="emergencyReason" required>
                  <option value="">Emergency reason</option>
                  {emergencyReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>

                <select style={styles.input} name="symptoms" required>
                  <option value="">Main symptom</option>
                  {commonSymptoms.map((symptom) => (
                    <option key={symptom} value={symptom}>
                      {symptom}
                    </option>
                  ))}
                </select>

                <input
                  style={styles.input}
                  type="number"
                  min="0"
                  step="0.5"
                  name="whenStartedDays"
                  placeholder="When started (days ago)"
                  required
                />

                <select style={styles.input} name="isConscious" required>
                  <option value="">Is pet conscious?</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>

                <select style={styles.input} name="breathingNormally" required>
                  <option value="">Breathing normally?</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>

                <select style={styles.input} name="bleeding" required>
                  <option value="">Bleeding?</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>

                <select style={styles.input} name="canWalk" required>
                  <option value="">Can walk?</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>

                <textarea
                  style={styles.textarea}
                  name="currentMedications"
                  placeholder="Current medications (if any)"
                />

                <select
                  style={styles.input}
                  name="allergies"
                  required
                  value={selectedAllergies}
                  onChange={(e) => setSelectedAllergies(e.target.value)}
                >
                  <option value="">Allergies?</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>

                {selectedAllergies === "Yes" && (
                  <input
                    style={styles.input}
                    name="allergyDetails"
                    placeholder="List known allergies"
                    required
                  />
                )}

                <input style={styles.input} name="ownerFirstName" placeholder="Owner first name" required />
                <input style={styles.input} name="ownerLastName" placeholder="Owner last name" required />
                <input style={styles.input} name="phone" placeholder="Phone number" required />
                <input style={styles.input} name="email" placeholder="Email" required />

                <label style={styles.photoUploadBox}>
                  <span style={styles.photoUploadTitle}>Pet photo/video (optional)</span>
                  <span style={styles.photoUploadText}>
                    Add a picture or short video for the care team. Photos also show on the owner status page.
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
                  <img
                    src={petPhotoPreview || "/vet-hero.jpeg"}
                    alt="Pet preview"
                    style={styles.photoPreviewImage}
                  />
                  <span>
                    {petMediaName
                      ? `${petMediaType === "video" ? "Video" : "Photo"} selected: ${petMediaName}`
                      : "No photo yet - we'll use a sample pet image."}
                  </span>
                </div>

                <select
                  style={styles.input}
                  name="visitType"
                  required
                  value={selectedVisitType}
                  onChange={(e) => setSelectedVisitType(e.target.value)}
                >
                  <option value="">Visit type</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Vet referral">Vet referral</option>
                  <option value="Follow up">Follow up</option>
                </select>

                {selectedVisitType === "Vet referral" && (
                  <input
                    style={styles.input}
                    name="referralName"
                    placeholder="Referring vet or clinic name"
                    required
                  />
                )}

                <textarea
                  style={styles.textarea}
                  name="reason"
                  placeholder="Additional details for the care team (optional)"
                />

                <div>
                  <p style={styles.label}>Has your pet been in this location before?</p>
                  <div style={styles.radioRow}>
                    <label style={styles.radioBox}>
                      <input type="radio" name="beenHereBefore" value="Yes" required /> Yes
                    </label>
                    <label style={styles.radioBox}>
                      <input type="radio" name="beenHereBefore" value="No" required /> No
                    </label>
                  </div>
                </div>

                <button
                  style={{
                    ...styles.primaryButton,
                    ...(submittingVisit ? styles.disabledButton : {}),
                  }}
                  type="submit"
                  disabled={submittingVisit}
                >
                  {submittingVisit ? "Submitting Visit..." : "Submit Visit Request"}
                </button>
              </form>
            </section>
          )}
          {view === "referral" && (
            <section>
              <h2 style={styles.title}>Referral Intake Portal</h2>
              <p style={styles.text}>For regular vets sending an emergency transfer.</p>

              <div style={styles.noticeBox}>
                <strong>Send the receiving team what they need before arrival.</strong>
                <p>
                  Add notes, diagnostics, treatment already given, medications, IV fluid status,
                  transfer time, and direct doctor contact information.
                </p>
              </div>

              <form onSubmit={createReferralVisit} style={styles.form}>
                <input style={styles.input} name="referringClinic" placeholder="Referring clinic name" required />
                <input style={styles.input} name="referringDoctor" placeholder="Referring doctor name" required />
                <input style={styles.input} name="doctorPhone" placeholder="Doctor phone number" required />
                <input style={styles.input} name="doctorEmail" placeholder="Doctor email" required />

                <input style={styles.input} name="petName" placeholder="Pet name" required />
                <select
                  style={styles.input}
                  name="species"
                  required
                  value={selectedReferralSpecies}
                  onChange={(e) => setSelectedReferralSpecies(e.target.value)}
                >
                  <option value="">Species</option>
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                  <option value="Other">Other</option>
                </select>

                {selectedReferralSpecies === "Dog" && (
                  <select style={styles.input} name="breed" required>
                    <option value="">Select Dog Breed</option>
                    {dogBreeds.map((breed) => (
                      <option key={breed} value={breed}>
                        {breed}
                      </option>
                    ))}
                  </select>
                )}

                {selectedReferralSpecies === "Cat" && (
                  <select style={styles.input} name="breed" required>
                    <option value="">Select Cat Breed</option>
                    {catBreeds.map((breed) => (
                      <option key={breed} value={breed}>
                        {breed}
                      </option>
                    ))}
                  </select>
                )}

                {selectedReferralSpecies === "Other" && (
                  <input
                    style={styles.input}
                    name="otherSpecies"
                    placeholder="Enter pet type, for example Rabbit or Bird"
                    required
                  />
                )}

                <div style={styles.referralSubsection}>
                  <strong>Pet owner contact, if available</strong>
                  <input style={styles.input} name="ownerFirstName" placeholder="Owner first name" />
                  <input style={styles.input} name="ownerLastName" placeholder="Owner last name" />
                  <input style={styles.input} name="ownerPhone" placeholder="Owner phone number" />
                  <input style={styles.input} name="ownerEmail" placeholder="Owner email" />
                </div>

                <textarea
                  style={styles.textarea}
                  name="referralNotes"
                  placeholder="Referral notes"
                  required
                />

                <div style={styles.referralSubsection}>
                  <strong>Documents included</strong>
                  <div style={styles.checkboxGrid}>
                    {["Referral notes", "Lab results", "X-rays", "Ultrasound"].map((item) => (
                      <label key={item} style={styles.radioBox}>
                        <input type="checkbox" name="documentsIncluded" value={item} /> {item}
                      </label>
                    ))}
                  </div>
                </div>

                <label style={styles.photoUploadBox}>
                  <span style={styles.photoUploadTitle}>Upload documents</span>
                  <span style={styles.photoUploadText}>
                    Select notes, lab results, X-rays, ultrasound images/videos, or PDFs.
                  </span>
                  <input
                    style={styles.hiddenFileInput}
                    type="file"
                    name="referralDocuments"
                    accept=".pdf,.doc,.docx,.dcm,image/*,video/*"
                    multiple
                    onChange={handleReferralDocumentsChange}
                  />
                  <span style={styles.photoUploadButton}>
                    {referralDocumentNames.length > 0 ? "Change Documents" : "Choose Documents"}
                  </span>
                </label>

                {referralDocumentNames.length > 0 && (
                  <div style={styles.documentList}>
                    {referralDocumentNames.map((name) => (
                      <span key={name}>{name}</span>
                    ))}
                  </div>
                )}

                <textarea
                  style={styles.textarea}
                  name="treatmentGiven"
                  placeholder="Treatment already given"
                  required
                />

                <textarea
                  style={styles.textarea}
                  name="medications"
                  placeholder="Medications given or currently prescribed"
                  required
                />

                <select style={styles.input} name="ivFluids" required>
                  <option value="">IV fluids?</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>

                <input
                  style={styles.input}
                  type="datetime-local"
                  name="transferTime"
                  required
                />

                <button
                  style={{
                    ...styles.primaryButton,
                    ...(submittingReferral ? styles.disabledButton : {}),
                  }}
                  type="submit"
                  disabled={submittingReferral}
                >
                  {submittingReferral ? "Submitting Referral..." : "Submit Referral"}
                </button>
              </form>
            </section>
          )}
          {view === "existingPet" && (
  <section>
    <h2 style={styles.title}>Find Your Pet</h2>
    <p style={styles.text}>
      Enter your email or phone number to find your pet.
    </p>

    <form
      style={styles.form}
      onSubmit={async (e) => {
        e.preventDefault();

        setSearchError("");
        setSearchResults([]);
        setLoading(true);

        const form = new FormData(e.currentTarget);

        const petName = String(form.get("petName") || "").trim().toLowerCase();
        const phone = String(form.get("phone") || "").trim();
        const email = String(form.get("email") || "").trim().toLowerCase();

        if (!email && !phone && !petName) {
          setSearchError("Please enter a pet name, email, or phone number.");
          setLoading(false);
          return;
        }

        try {
          const result = await apiRequest<{ visits: Visit[] }>({
            action: "searchVisits",
            petName,
            phone,
            email,
          });
          setLoading(false);

          if (result.visits.length === 0) {
            setSearchError("We couldn't find your pet. Please check your details or register.");
            return;
          }

          setSearchResults(result.visits);
        } catch (error) {
          setLoading(false);
          setSearchError("Something went wrong. Please try again.");
          console.error(error);
        }
      }}
    >
      <input
        style={styles.input}
        name="petName"
        placeholder="Pet name (optional)"
      />

      <input
        style={styles.input}
        name="phone"
        placeholder="Phone number (optional)"
      />

      <input
        style={styles.input}
        name="email"
        placeholder="Email (recommended)"
      />

      <button
        style={{
          ...styles.primaryButton,
          ...(loading ? styles.disabledButton : {}),
        }}
        type="submit"
        disabled={loading}
      >
        {loading ? "Searching..." : "Find My Pet"}
      </button>
    </form>

    {loading && <p style={styles.text}>Searching...</p>}

    {searchError && (
      <div style={styles.errorBox}>
        {searchError}
      </div>
    )}

    {searchResults.length > 0 && (
      <div style={{ marginTop: 20 }}>
        <h3 style={styles.title}>Select your pet</h3>

        {searchResults.map((visit) => (
          <div
            key={visit.id}
            style={styles.resultCard}
            onClick={() => {
              setVisits((current) =>
                current.some((currentVisit) => currentVisit.id === visit.id)
                  ? current.map((currentVisit) =>
                      currentVisit.id === visit.id
                        ? { ...currentVisit, ...visit }
                        : currentVisit
                    )
                  : [visit, ...current]
              );
              setSelectedVisitId(visit.id);
              setView("status");
            }}
          >
            <strong>{visit.petName}</strong> - {visit.species}
            <br />
            Owner: {visit.ownerFirstName} {visit.ownerLastName}
          </div>
        ))}
      </div>
    )}
  </section>
)}
    {view === "clinic" && (
            <section>
              {!clinicUnlocked ? (
                <div style={styles.clinicLoginCard}>
                  <h2 style={styles.title}>Clinic Dashboard</h2>
                  <p style={styles.text}>Enter the clinic PIN to view requests and send updates.</p>
                  <form
                    style={styles.form}
                    onSubmit={(event) => {
                      event.preventDefault();
                      loadVisits(clinicPin);
                    }}
                  >
                    <input
                      style={styles.input}
                      type="password"
                      value={clinicPin}
                      onChange={(event) => setClinicPin(event.target.value)}
                      placeholder="Clinic PIN"
                      required
                    />
                    <button
                      style={{
                        ...styles.primaryButton,
                        ...(clinicLoading ? styles.disabledButton : {}),
                      }}
                      type="submit"
                      disabled={clinicLoading}
                    >
                      {clinicLoading ? "Opening..." : "Open Dashboard"}
                    </button>
                  </form>
                  {clinicError && <div style={styles.errorBox}>{clinicError}</div>}
                </div>
              ) : (
                <>
              <div style={styles.dashboardHeader}>
                <div>
                  <h2 style={styles.title}>Clinic Dashboard</h2>
                  <p style={styles.text}>Review visit requests and send updates.</p>
                </div>
                <span style={styles.counter}>
  {activeVisits.length} Active / {closedVisits.length} Closed
</span>
              </div>

              {visits.length === 0 && (
                <div style={styles.emptyBox}>
                  No visit requests yet. Submit one from the Pet Owner page.
                </div>
              )}

              <div style={styles.visitList}>
                {visits.map((visit) => (
                  <div key={visit.id} style={styles.visitCard}>
                    <div style={styles.visitHeader}>
                      <div>
                        <h3 style={styles.petName}>
                          {visit.petName} <span style={styles.speciesPill}>{getSpecies(visit)}</span>
                        </h3>
                        <p style={styles.text}>Owner: {getOwnerName(visit)}</p>
                        <p style={styles.text}>Phone: {visit.phone}</p>
                      </div>

                      <div>
                        <p style={styles.status}>{visit.status}</p>
                        <p style={styles.pill}>{visit.visitType}</p>
                      </div>
                    </div>

                    {visit.visitType === "Vet referral" && (
                      <p style={styles.text}>Referral: {visit.referralName}</p>
                    )}
<p style={styles.text}>
  Requested: {new Date(visit.createdAt).toLocaleString()}
</p>
                    {getQueueDetails(visit) && (
                      <div style={styles.queueMiniCard}>
                        <strong>Queue:</strong> #{getQueueDetails(visit)?.position} with{" "}
                        {getQueueDetails(visit)?.patientsAhead} patient(s) ahead. Estimated wait:{" "}
                        {getQueueDetails(visit)?.estimatedWaitMinutes} minutes.
                      </div>
                    )}
                    {getAssignedDoctorFromNotes(visit.clinicNotes) && (
                      <a
                        href={getAssignedDoctorFromNotes(visit.clinicNotes)?.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.clinicDoctorLink}
                      >
                        Assigned doctor: Dr. {getAssignedDoctorFromNotes(visit.clinicNotes)?.name} - View profile
                      </a>
                    )}
                    <p style={styles.text}>Been here before: {visit.beenHereBefore}</p>
                    <p style={styles.text}>Breed: {visit.breed || "Not provided"}</p>
                    {visit.consentFormType && (
  <p style={styles.text}>Form sent: {visit.consentFormType}</p>
)}
                    <div style={styles.intakeSummaryCard}>
                      <strong>Intake summary</strong>
                      <pre style={styles.intakeSummaryText}>{visit.reason}</pre>
                    </div>

                    <textarea
                      style={styles.notesBox}
                      placeholder="Clinic notes - only visible to the clinic."
                      value={removeAppMetadata(visit.clinicNotes)}
                      onChange={(e) => saveClinicNotes(visit.id, e.target.value)}
                    />

                    {pendingClinicActions[visit.id] && (
                      <div style={styles.pendingActionNotice}>
                        {pendingClinicActions[visit.id]}
                      </div>
                    )}

                    <fieldset
                      disabled={Boolean(pendingClinicActions[visit.id])}
                      style={{
                        ...styles.actionGrid,
                        ...(pendingClinicActions[visit.id] ? styles.disabledActionGrid : {}),
                      }}
                    >
                      <div style={styles.actionGroupTitle}>Phase 2 - Arrival / triage</div>
                      <button
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
                        style={styles.blueAction}
                        onClick={() =>
                          sendUpdate(
                            visit.id,
                            "Checked in",
                            `${visit.petName} has arrived and check-in has started.`
                          )
                        }
                      >
                        Checked In
                      </button>
                      <button
                        style={styles.redAction}
                        onClick={() =>
                          sendUpdate(
                            visit.id,
                            "RED triage",
                            `${visit.petName} has been triaged as critical and moved immediately to the treatment area. The team is providing urgent care now.`
                          )
                        }
                      >
                        RED Triage
                      </button>
                      <button
                        style={styles.orangeAction}
                        onClick={() =>
                          sendUpdate(
                            visit.id,
                            "Urgent triage",
                            `${visit.petName} has been triaged as urgent and is being stabilized by the medical team.`
                          )
                        }
                      >
                        Orange / Yellow
                      </button>
                      <button
                        style={styles.tealAction}
                        onClick={() =>
                          sendUpdate(
                            visit.id,
                            "Standard queue",
                            `${visit.petName} has been triaged as stable and placed in the standard emergency queue.`
                          )
                        }
                      >
                        Green / Stable
                      </button>
                      <button
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
                        Vitals Update
                      </button>

                      <div style={styles.actionGroupTitle}>Phases 3-5 - Registration, consent, deposit</div>
                      <button
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
                        Send Care Consent
                      </button>
                      <button
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
                        Send CPR / DNR
                      </button>
                      <button
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

                      <div style={styles.actionGroupTitle}>Phases 6-8 - Doctor, diagnostics, estimate</div>
                      <select
                        style={styles.doctorSelect}
                        defaultValue=""
                        onChange={(event) => {
                          if (!event.target.value) return;
                          assignDoctorToVisit(visit.id, event.target.value);
                          event.target.value = "";
                        }}
                      >
                        <option value="">Assign a doctor</option>
                        {doctors.map((doctor) => (
                          <option key={doctor.name} value={doctor.name}>
                            Dr. {doctor.name}
                          </option>
                        ))}
                      </select>
                      <button
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
                        style={styles.redAction}
                        onClick={() =>
                          sendUpdate(
                            visit.id,
                            "Stabilization in progress",
                            `${visit.petName} is being stabilized by the emergency team.`
                          )
                        }
                      >
                        Stabilizing
                      </button>
                      <button
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
                        style={styles.blueAction}
                        onClick={() =>
                          sendUpdate(
                            visit.id,
                            "Diagnostics underway",
                            `Bloodwork is in progress for ${visit.petName}.`
                          )
                        }
                      >
                        Bloodwork
                      </button>
                      <button
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
                      <button style={styles.greenAction} onClick={() => sendEstimateApproval(visit)}>
                        Send Estimate
                      </button>

                      <div style={styles.actionGroupTitle}>Phases 9-10 - Advanced consent / active treatment</div>
                      <button
                        style={styles.purpleAction}
                        onClick={() =>
                          sendFormToVisit(
                            visit,
                            "Surgery / anesthesia consent",
                            [
                              "I authorize anesthesia and/or surgery if recommended by the medical team.",
                              "I understand risks may include anesthesia complications, unexpected complications, blood transfusion needs, and death.",
                            ].join("\n\n"),
                            `A surgery/anesthesia consent is ready for ${visit.petName}.`
                          )
                        }
                      >
                        Surgery Consent
                      </button>
                      <button
                        style={styles.orangeAction}
                        onClick={() =>
                          sendUpdate(
                            visit.id,
                            "Treatment started",
                            `Treatment has started for ${visit.petName}. We will continue to keep you updated.`
                          )
                        }
                      >
                        Treatment Started
                      </button>
                      <button
                        style={styles.redAction}
                        onClick={() =>
                          sendUpdate(
                            visit.id,
                            "In surgery",
                            `${visit.petName} is in surgery. The team will provide an update when the procedure is complete.`
                          )
                        }
                      >
                        In Surgery
                      </button>
                      <button
                        style={styles.orangeAction}
                        onClick={() =>
                          sendUpdate(
                            visit.id,
                            "Recovering from anesthesia",
                            `${visit.petName} is recovering from anesthesia and is being closely monitored.`
                          )
                        }
                      >
                        Recovering
                      </button>
                      <button
                        style={styles.tealAction}
                        onClick={() =>
                          sendUpdate(
                            visit.id,
                            "Stable",
                            `${visit.petName} is currently stable and being monitored by the care team.`
                          )
                        }
                      >
                        Stable
                      </button>
                      <button
                        style={styles.redAction}
                        onClick={() =>
                          sendUpdate(
                            visit.id,
                            "Critical condition",
                            `${visit.petName} remains in critical condition and is receiving intensive care.`
                          )
                        }
                      >
                        Critical
                      </button>

                      <div style={styles.actionGroupTitle}>Phases 11-12 - Communication / hospitalization</div>
                      <button
                        style={styles.orangeAction}
                        onClick={() =>
                          sendUpdate(
                            visit.id,
                            "ICU monitoring",
                            `${visit.petName} has been hospitalized and is receiving ongoing monitoring.`
                          )
                        }
                      >
                        Hospitalized / ICU
                      </button>
                      <button
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
                      <button style={styles.blueAction} onClick={() => sendUpdate(visit.id, visit.status, `${visit.petName} was walked by the care team.`)}>
                        Walked
                      </button>
                      <button style={styles.blueAction} onClick={() => sendUpdate(visit.id, visit.status, `${visit.petName} urinated during the latest care check.`)}>
                        Urinated
                      </button>
                      <button style={styles.blueAction} onClick={() => sendUpdate(visit.id, visit.status, `${visit.petName} defecated during the latest care check.`)}>
                        Defecated
                      </button>

                      <div style={styles.actionGroupTitle}>Phases 14-16 - Discharge / checkout / aftercare</div>
                      <button style={styles.redAction} onClick={() => sendUpdate(visit.id, "Ready for pickup", `${visit.petName} is ready for pickup. Please check in at the front desk when you arrive.`)}>
                        Ready for Pickup
                      </button>
                      <button style={styles.purpleAction} onClick={() => sendDischargeInstructions(visit)}>
                        Send Discharge
                      </button>
                      <button style={styles.greenAction} onClick={() => sendUpdate(visit.id, visit.status, `A follow-up reminder has been set for ${visit.petName}.`)}>
                        Aftercare Reminder
                      </button>
                      <button style={styles.redAction} onClick={() => sendUpdate(visit.id, "Closed", `${visit.petName}'s visit has been completed and closed.`)}>
                        Close Request
                      </button>

                      <div style={styles.actionGroupTitle}>Custom communication</div>
                      <button
                        style={styles.blueAction}
                        onClick={async () => {
                          const formType = window.prompt("Enter form name (Consent, CPR, Treatment, etc)");
                          if (!formType) return;

                          const formBody = window.prompt("Enter the form details the customer needs to read before signing or declining");
                          if (!formBody) return;

                          sendFormToVisit(
                            visit,
                            formType,
                            formBody,
                            `A new ${formType} form is ready for ${visit.petName}.`
                          );
                        }}
                      >
                        Custom Form
                      </button>
                      <button
                        style={styles.tealAction}
                        onClick={() =>
                          sendCustomCareUpdate(
                            visit,
                            visit.status,
                            "Enter custom owner update",
                            `There is a new update for ${visit.petName}.`
                          )
                        }
                      >
                        Custom Update
                      </button>
                    </fieldset>

                    <button
                      style={styles.secondaryButton}
                      onClick={() => {
                        setSelectedVisitId(visit.id);
                        setView("status");
                      }}
                    >
                      View Owner Page
                    </button>
                  </div>
                ))}
              </div>
                </>
              )}
            </section>
          )}

          {view === "status" && selectedVisit && (
                        <section>
              <button style={styles.customerHomeButton} onClick={() => setView("home")}>
                Home
              </button>

              <div style={styles.ownerGreeting}>
                <div>
                  <h2 style={styles.title}>Hi, {selectedVisit.ownerFirstName || "there"}!</h2>
                  <p style={styles.text}>Here&apos;s the latest on {selectedVisit.petName}.</p>
                </div>
                <div style={styles.notificationBell}>2</div>
              </div>

              <div style={styles.liveUpdateCard}>
                <div style={styles.liveCardTop}>
                  <div style={styles.liveBadge}>Live Update</div>
                  {getQueueDetails(selectedVisit) && (
                    <div style={styles.liveWaitPill}>
                      <span style={styles.liveWaitLabel}>Wait time</span>
                      <strong style={styles.liveWaitValue}>
                        {getQueueDetails(selectedVisit)?.estimatedWaitMinutes} min
                      </strong>
                    </div>
                  )}
                </div>
                <div style={styles.liveUpdateBody}>
                  <div>
                    <h3 style={styles.liveUpdateTitle}>
                      {latestOwnerUpdate?.message ||
                        `${selectedVisit.petName}'s visit request has been received.`}
                    </h3>
                  </div>
                  <img src={getPetPhoto(selectedVisit)} alt={selectedVisit.petName} style={styles.petAvatar} />
                </div>
                {previousOwnerUpdates.length > 0 && (
                  <div style={styles.previousUpdatesPanel}>
                    <button
                      type="button"
                      style={styles.previousUpdatesButton}
                      onClick={() =>
                        setExpandedUpdatesVisitId((current) =>
                          current === selectedVisit.id ? null : selectedVisit.id
                        )
                      }
                    >
                      {showPreviousUpdates
                        ? "Hide previous updates"
                        : `Show previous updates (${previousOwnerUpdates.length})`}
                    </button>

                    {showPreviousUpdates && (
                      <div style={styles.previousUpdatesList}>
                        {previousOwnerUpdates.map((update, index) => (
                          <div key={`${update.message}-${index}`} style={styles.previousUpdateItem}>
                            {update.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={styles.statusHeader}>
  <h2 style={styles.petTitle}>{selectedVisit.petName}</h2>
  <p style={styles.statusBadge}>{selectedVisit.status}</p>
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

              <div style={styles.progressRail}>
                {["Received", "In Exam", "In Treatment", "Discharge"].map((step, index) => (
                  <div key={step} style={styles.progressStep}>
                    <div
                      style={{
                        ...styles.progressDot,
                        ...(index === 0 ? styles.progressDotActive : {}),
                      }}
                    >
                      {index === 0 ? "OK" : ""}
                    </div>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
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
                        {signedCareHubCount} of {careHubFormCount} forms signed for {selectedVisit.petName}.
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

              <div style={styles.noticeBox}>
                We will keep you updated every step of the way.
              </div>
              <div style={styles.bottomNav}>
                <span style={styles.bottomNavActive}>Home</span>
                <span>My Pets</span>
                <span>Updates</span>
                <span>Profile</span>
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

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div style={styles.infoCard}>
      <div style={styles.infoIcon}>{icon}</div>
      <div>
        <h3 style={styles.featureTitle}>{title}</h3>
        <p style={styles.smallText}>{text}</p>
      </div>
    </div>
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
    background: "linear-gradient(135deg, #fff8f1 0%, #eef9f7 48%, #f6fbff 100%)",
    fontFamily: "Arial, sans-serif",
    color: "#243447",
    padding: "6px 14px 14px",
  },
  hero: {
    maxWidth: 1180,
    margin: "0 auto 18px",
    background: "rgba(255, 255, 255, 0.92)",
    border: "1px solid rgba(255, 255, 255, 0.75)",
    borderRadius: 8,
    padding: "8px clamp(18px, 4vw, 34px) clamp(18px, 4vw, 34px)",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
    gap: 22,
    boxShadow: "0 18px 45px rgba(41, 64, 83, 0.12)",
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
    gap: 14,
    justifyContent: "center",
  },
  logoCrop: {
    width: "min(100%, 340px)",
    height: 112,
    overflow: "hidden",
    borderRadius: 8,
  },
  logoImage: {
    width: "100%",
    height: "auto",
    display: "block",
    transform: "translateY(-48px)",
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
    fontSize: "clamp(28px, 7vw, 38px)",
    lineHeight: 1.12,
    marginTop: 0,
    marginBottom: 12,
    color: "#243447",
    textAlign: "center",
  },
  accentText: {
    color: "#087f78",
    display: "block",
  },
  heroSubtitle: {
    color: "#526070",
    fontSize: 18,
    maxWidth: 500,
    lineHeight: 1.55,
    textAlign: "center",
    marginLeft: "auto",
    marginRight: "auto",
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
    borderTop: "1px solid #eef3f4",
    paddingTop: 14,
    color: "#087f78",
    display: "flex",
    alignItems: "center",
    gap: 10,
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
  cardCtaBlue: {
    display: "block",
    background: "linear-gradient(135deg, #1677f2, #0b62d8)",
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
    gap: 16,
  },
  primaryCardButton: {
    background: "linear-gradient(135deg, #f0fffb, #e7fbf7)",
    color: "#087f78",
    border: "1px solid #bfe9e0",
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
  darkCardButton: {
    background: "linear-gradient(135deg, #f8fbff, #edf5ff)",
    color: "#0b62d8",
    border: "1px solid #bdd7ff",
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
    width: 62,
    height: 62,
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
    fontSize: 15,
    fontWeight: 900,
    lineHeight: 1.2,
  },
  buttonSubtitle: {
    fontSize: 15,
    opacity: 0.92,
    lineHeight: 1.4,
  },
  mainGrid: {
    maxWidth: 1180,
    margin: "0 auto",
  },
  panel: {
    background: "rgba(255, 255, 255, 0.94)",
    border: "1px solid rgba(255, 255, 255, 0.75)",
    borderRadius: 8,
    padding: "clamp(16px, 4vw, 28px)",
    boxShadow: "0 15px 40px rgba(41, 64, 83, 0.1)",
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
  errorBox: {
  background: "#fff1f2",
  border: "1px solid #e11d48",
  color: "#b91c1c",
  padding: 12,
  borderRadius: 8,
  marginTop: 10,
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
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 8,
  background: "rgba(255, 255, 255, 0.96)",
  border: "1px solid #e1ecec",
  borderRadius: 8,
  padding: "12px 8px",
  marginTop: 18,
  boxShadow: "0 -8px 24px rgba(41, 64, 83, 0.08)",
  textAlign: "center",
  color: "#64717d",
  fontSize: 13,
  fontWeight: 700,
},

bottomNavActive: {
  color: "#087f78",
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


