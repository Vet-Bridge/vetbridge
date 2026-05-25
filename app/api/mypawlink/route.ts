import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";
import { sendSmsNotification } from "../../../lib/sms";
import { recordAuditLog } from "../../../lib/audit/audit-service";
import {
  buildFallbackIntegrationReadiness,
  integrationProviderKeys,
  integrationSupportedEvents,
  type IntegrationProviderReadiness,
} from "../../../lib/integration-catalog";

export const runtime = "nodejs";

type Update = {
  message: string;
  time: string;
};

type StaffRole = "Front Desk" | "Technician" | "Veterinarian" | "Admin";

type StaffProfile = {
  email: string;
  fullName: string;
  role: StaffRole;
};

type RequestBody = Record<string, unknown>;
type DbRecord = Record<string, unknown>;

type OwnerNotificationSummary = {
  channel: "sms";
  status: "sent" | "skipped" | "failed";
  reason: string;
  error: string;
  link: string;
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

type CareHubSeedForm = {
  slug: string;
  title: string;
  description: string;
  htmlContent: string;
  formType: string;
  displayOrder: number;
};

type CareHubSeedCategory = {
  slug: string;
  name: string;
  description: string;
  displayOrder: number;
  forms: CareHubSeedForm[];
};

const visitSelect = `
  *,
  owners!visits_owner_id_fkey (
    first_name,
    last_name,
    phone,
    email
  ),
  pets!visits_pet_id_fkey (
    pet_name,
    species,
    other_species,
    breed
  ),
  visit_updates (
    message,
    status,
    created_at
  ),
  forms (
    id,
    form_type,
    form_body,
    form_status,
    signed_name,
    signed_at,
    decline_reason,
    declined_at
  )
`;

const stringValue = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const recordValue = (value: unknown): DbRecord => {
  if (Array.isArray(value)) return (value[0] as DbRecord | undefined) || {};
  if (value && typeof value === "object") return value as DbRecord;
  return {};
};

const arrayValue = (value: unknown): DbRecord[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is DbRecord => Boolean(item) && typeof item === "object");
};

const stringArrayValue = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => stringValue(item)).filter(Boolean);
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const booleanValue = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const numberValue = (value: unknown, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const demoClinicSlug = "demo-emergency-hospital";

const defaultClinicSettings: ClinicSettings = {
  id: "",
  slug: demoClinicSlug,
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

const buildVisitAccessUrl = (token: string) => {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://mypawlink.com").replace(
    /\/$/,
    ""
  );
  return `${siteUrl}/visit/${token}`;
};

const createVisitToken = () => randomBytes(18).toString("base64url");

const emergencyCareConsentTitle = "Emergency Care Consent";
const emergencyCareConsentBody =
  "Please review and sign this consent so the veterinary team can begin evaluating and stabilizing your pet.\n\nI authorize the veterinary team to examine my pet and provide initial emergency evaluation and stabilizing care as medically necessary. I understand that stabilization may include, but is not limited to, triage, physical examination, basic nursing care, oxygen support, pain management, IV catheter placement, fluids, emergency medications, or other immediate care needed to help stabilize my pet.\n\nI understand that emergency evaluation and stabilizing care may result in charges. I understand that additional diagnostics, treatments, hospitalization, procedures, or surgery may require a separate estimate and approval. I also understand that payment is due at the time services are provided, unless other arrangements are approved by the hospital.";

const getCheckedInMessage = (petName: string) =>
  petName + " has been checked in. The veterinary team has received your request and will update you here.";

const careHubSeedCategories: CareHubSeedCategory[] = [
  {
    slug: "admission-forms",
    name: "Admission Forms",
    description: "Start-of-visit paperwork and hospital admission permissions.",
    displayOrder: 1,
    forms: [
      {
        slug: "patient-admission-form",
        title: "Patient Admission Form",
        description: "Confirms owner and patient details for this emergency visit.",
        htmlContent:
          "I confirm that the information provided for this emergency visit is accurate to the best of my knowledge.\n\nI authorize the hospital team to receive my pet, review the presenting concern, and document information needed to support care during this visit.\n\nI understand that this admission form does not replace direct medical advice from the attending veterinarian.",
        formType: "admission",
        displayOrder: 1,
      },
      {
        slug: "treatment-authorization-form",
        title: "Treatment Authorization Form",
        description: "Allows the emergency team to examine and stabilize your pet.",
        htmlContent:
          "I authorize the emergency veterinary team to examine my pet and provide reasonable stabilization care when medically necessary.\n\nStabilization may include oxygen support, IV catheter placement, fluids, medications, monitoring, or other time-sensitive interventions discussed with me by the care team.\n\nI understand that additional diagnostics or treatments may require separate approval.",
        formType: "admission",
        displayOrder: 2,
      },
      {
        slug: "medical-history-intake-form",
        title: "Medical History Intake Form",
        description: "Captures important history, medications, and current symptoms.",
        htmlContent:
          "I confirm that I have shared all known medications, allergies, prior diagnoses, and relevant medical history for my pet.\n\nI understand that incomplete medical history may affect treatment decisions and agree to update the team if new information becomes available.\n\nThe care team may use this information to prioritize diagnostics, treatments, and communication during this visit.",
        formType: "admission",
        displayOrder: 3,
      },
    ],
  },
  {
    slug: "financial-forms",
    name: "Financial Forms",
    description: "Financial responsibility, deposits, and estimate approvals.",
    displayOrder: 2,
    forms: [
      {
        slug: "financial-responsibility-agreement",
        title: "Financial Responsibility Agreement",
        description: "Acknowledges responsibility for charges from emergency care.",
        htmlContent:
          "I understand that I am financially responsible for services authorized and provided during this emergency visit.\n\nI understand that emergency care costs may change as my pet's condition changes, and the hospital team will communicate major changes whenever possible.\n\nI agree to ask questions before authorizing care if I need clarification about fees or payment expectations.",
        formType: "financial",
        displayOrder: 1,
      },
      {
        slug: "deposit-authorization-form",
        title: "Deposit Authorization Form",
        description: "Approves an initial deposit toward recommended care.",
        htmlContent:
          "I authorize the hospital to collect or apply the discussed deposit toward my pet's emergency care.\n\nI understand that the deposit is not a final total and that additional charges may apply depending on diagnostics, treatment, hospitalization, or procedures.\n\nAny remaining balance or credit will be reviewed at checkout or discharge.",
        formType: "financial",
        displayOrder: 2,
      },
      {
        slug: "treatment-estimate-approval",
        title: "Treatment Estimate Approval",
        description: "Approves a treatment estimate or requests discussion.",
        htmlContent:
          "I have reviewed the treatment estimate provided for my pet.\n\nI understand the estimate is a good-faith range and may change if my pet's condition changes or if additional care becomes necessary.\n\nBy signing, I authorize the care team to proceed with the selected plan or understand that I may request further discussion before proceeding.",
        formType: "financial",
        displayOrder: 3,
      },
    ],
  },
  {
    slug: "emergency-decisions",
    name: "Emergency Decisions",
    description: "Critical care, CPR, and resuscitation preferences.",
    displayOrder: 3,
    forms: [
      {
        slug: "cpr-authorization",
        title: "CPR Authorization",
        description: "Authorizes full cardiopulmonary resuscitation if needed.",
        htmlContent:
          "I authorize the emergency team to perform CPR if my pet experiences cardiac or respiratory arrest.\n\nCPR may include chest compressions, intubation, emergency drugs, defibrillation, and advanced life support.\n\nI understand that CPR outcomes vary and that costs may be significant.",
        formType: "emergency_decision",
        displayOrder: 1,
      },
      {
        slug: "dnr-authorization",
        title: "DNR Authorization",
        description: "Documents a do-not-resuscitate preference.",
        htmlContent:
          "I request that the hospital team does not perform CPR if my pet experiences cardiac or respiratory arrest.\n\nI understand that comfort care and other agreed medical support may still be provided unless I choose otherwise.\n\nI understand I can update this preference by contacting the care team.",
        formType: "emergency_decision",
        displayOrder: 2,
      },
      {
        slug: "critical-care-consent",
        title: "Critical Care Consent",
        description: "Allows urgent stabilization for critical patients.",
        htmlContent:
          "I understand that my pet may require urgent interventions because of a serious or potentially life-threatening condition.\n\nI authorize the care team to begin medically necessary stabilization while continuing to communicate treatment options and costs.\n\nI understand that critical care carries risks, including complications or death despite appropriate treatment.",
        formType: "emergency_decision",
        displayOrder: 3,
      },
    ],
  },
  {
    slug: "treatment-consents",
    name: "Treatment Consents",
    description: "Medication, diagnostics, and hospitalization permissions.",
    displayOrder: 4,
    forms: [
      {
        slug: "medication-consent",
        title: "Medication Consent",
        description: "Allows medications recommended by the care team.",
        htmlContent:
          "I authorize the veterinary team to administer medications discussed with me or medically indicated for my pet's emergency care.\n\nMedications may include pain control, anti-nausea medication, antibiotics, sedatives, emergency drugs, or other prescribed treatments.\n\nI understand all medications can carry risks or side effects.",
        formType: "treatment",
        displayOrder: 1,
      },
      {
        slug: "diagnostic-testing-consent",
        title: "Diagnostic Testing Consent",
        description: "Approves recommended testing such as labs or imaging.",
        htmlContent:
          "I authorize the diagnostic testing discussed for my pet, which may include bloodwork, urinalysis, radiographs, ultrasound, ECG, or other tests.\n\nI understand that diagnostics help guide medical decisions but may not always provide a complete diagnosis.\n\nThe care team will discuss significant findings and next steps.",
        formType: "treatment",
        displayOrder: 2,
      },
      {
        slug: "hospitalization-consent",
        title: "Hospitalization Consent",
        description: "Approves inpatient monitoring and treatment.",
        htmlContent:
          "I authorize hospitalization for monitoring, nursing care, and treatments recommended by the veterinary team.\n\nHospitalization may include cage-side monitoring, medications, fluids, feeding support, pain scoring, and repeated vital sign checks.\n\nI understand that care plans may change based on my pet's response.",
        formType: "treatment",
        displayOrder: 3,
      },
    ],
  },
  {
    slug: "procedure-authorizations",
    name: "Procedure Authorizations",
    description: "Procedure-specific permissions for anesthesia, surgery, and transfusion.",
    displayOrder: 5,
    forms: [
      {
        slug: "anesthesia-consent",
        title: "Anesthesia Consent",
        description: "Reviews risks of sedation or anesthesia.",
        htmlContent:
          "I authorize sedation or anesthesia if recommended for my pet's diagnostics, treatment, or procedure.\n\nI understand anesthesia carries risks including reaction, complications, or death, especially in unstable emergency patients.\n\nThe care team will monitor my pet and take reasonable precautions based on the situation.",
        formType: "procedure",
        displayOrder: 1,
      },
      {
        slug: "surgery-consent",
        title: "Surgery Consent",
        description: "Authorizes an emergency or urgent procedure.",
        htmlContent:
          "I authorize the surgical or procedural care discussed with the veterinary team.\n\nI understand risks may include bleeding, infection, anesthesia complications, unexpected findings, need for additional procedures, or death.\n\nI authorize the veterinarian to make reasonable medical decisions if unexpected complications occur.",
        formType: "procedure",
        displayOrder: 2,
      },
      {
        slug: "blood-transfusion-consent",
        title: "Blood Transfusion Consent",
        description: "Authorizes blood products when medically needed.",
        htmlContent:
          "I authorize blood or blood product transfusion if recommended for my pet.\n\nI understand transfusions can be life-saving but may carry risks including allergic reaction, fever, infection risk, or other complications.\n\nThe team will monitor my pet for transfusion reactions whenever possible.",
        formType: "procedure",
        displayOrder: 3,
      },
    ],
  },
  {
    slug: "communication-preferences",
    name: "Communication Preferences",
    description: "SMS, media, and authorized contact preferences.",
    displayOrder: 6,
    forms: [
      {
        slug: "sms-consent",
        title: "SMS Consent",
        description: "Approves text updates related to this visit.",
        htmlContent:
          "I consent to receive SMS/text messages related to my pet's emergency visit.\n\nMessages may include status updates, forms, estimate notifications, discharge information, or requests to contact the clinic.\n\nMessage and data rates may apply, and I can ask the clinic to stop text updates.",
        formType: "communication",
        displayOrder: 1,
      },
      {
        slug: "photo-video-consent",
        title: "Photo/Video Consent",
        description: "Allows care-related photos or short videos to be shared.",
        htmlContent:
          "I authorize the hospital team to capture and share care-related photos or short videos of my pet through MyPawLink when appropriate.\n\nThese images are intended for owner communication during the visit and are not a substitute for medical records.\n\nI understand the clinic may limit media sharing during urgent care.",
        formType: "communication",
        displayOrder: 2,
      },
      {
        slug: "authorized-contact-form",
        title: "Authorized Contact Form",
        description: "Identifies who may receive updates or make decisions.",
        htmlContent:
          "I confirm the people authorized to receive updates or discuss my pet's care with the clinic.\n\nI understand that medical and financial decisions should be made by the owner or authorized decision-maker.\n\nI will notify the clinic if contact permissions change during this visit.",
        formType: "communication",
        displayOrder: 3,
      },
    ],
  },
  {
    slug: "discharge-documents",
    name: "Discharge Documents",
    description: "Discharge instructions, medication review, and follow-up care.",
    displayOrder: 7,
    forms: [
      {
        slug: "discharge-instructions",
        title: "Discharge Instructions",
        description: "Acknowledges discharge care instructions.",
        htmlContent:
          "I acknowledge that I received discharge instructions for my pet.\n\nI understand the diagnosis or assessment, home care instructions, warning signs, and recommended follow-up plan as explained by the care team.\n\nI agree to contact a veterinarian if my pet worsens or if I have questions after discharge.",
        formType: "discharge",
        displayOrder: 1,
      },
      {
        slug: "medication-acknowledgment",
        title: "Medication Acknowledgment",
        description: "Confirms medication dosing and instructions were reviewed.",
        htmlContent:
          "I acknowledge that my pet's medication instructions were reviewed with me.\n\nI understand the medication name, dose, route, frequency, duration, and any important side effects or precautions provided by the care team.\n\nI will contact the clinic or my veterinarian if I have medication questions.",
        formType: "discharge",
        displayOrder: 2,
      },
      {
        slug: "follow-up-care-plan",
        title: "Follow-Up Care Plan",
        description: "Reviews recheck and aftercare recommendations.",
        htmlContent:
          "I acknowledge the recommended follow-up care plan for my pet.\n\nThis may include recheck exams, primary veterinarian follow-up, specialist referral, lab rechecks, activity restrictions, or return precautions.\n\nI understand that failure to follow up may affect recovery.",
        formType: "discharge",
        displayOrder: 3,
      },
    ],
  },
];

const getPetPhotoFromNotes = (notes: string) => {
  const match = notes.match(/\n?\[\[MPL_PET_PHOTO\]\]([\s\S]*?)\[\[\/MPL_PET_PHOTO\]\]/);
  return match?.[1] || "";
};

const getIntakeFieldFromReason = (reason: string, label: string) => {
  const match = reason
    .split("\n")
    .find((line) => line.toLowerCase().startsWith(label.toLowerCase() + ":"));
  return match?.split(":").slice(1).join(":").trim() || "";
};

const getSecondaryContactsFromReason = (reason: string) => {
  const name = getIntakeFieldFromReason(reason, "Additional contact");
  const relationship = getIntakeFieldFromReason(reason, "Additional contact relationship");
  const phone = getIntakeFieldFromReason(reason, "Additional contact phone");
  const email = getIntakeFieldFromReason(reason, "Additional contact email");
  const permissionLevel = getIntakeFieldFromReason(reason, "Additional contact permission");

  if (![name, relationship, phone, email].some(Boolean)) return [];
  return [
    {
      name: name || "Not provided",
      relationship: relationship || "Not provided",
      phone,
      email,
      permissionLevel: permissionLevel || "Updates only",
    },
  ];
};

const getPetAgeFromReason = (reason: string) => {
  const display =
    getIntakeFieldFromReason(reason, "Pet age") ||
    getIntakeFieldFromReason(reason, "Approx. age");
  const birthdateLine = getIntakeFieldFromReason(reason, "Pet birthdate");

  return {
    ageValue: "",
    ageUnit: "",
    birthdate: birthdateLine,
    ageUnknown: display.toLowerCase() === "unknown",
    display,
  };
};

const mapVisit = (visit: DbRecord) => {
  const owner = recordValue(visit.owners);
  const pet = recordValue(visit.pets);
  const updateRows = arrayValue(visit.visit_updates);
  const sortedUpdateRows = [...updateRows].sort(
    (a, b) =>
      new Date(stringValue(a.created_at)).getTime() -
      new Date(stringValue(b.created_at)).getTime()
  );
  const updates =
    sortedUpdateRows.length > 0
      ? sortedUpdateRows.map((update) => ({
          message: stringValue(update.message),
          time: update.created_at
            ? new Date(String(update.created_at)).toLocaleTimeString()
            : "",
        }))
      : Array.isArray(visit.updates)
        ? (visit.updates as Update[])
        : [];
  const clinicNotes = stringValue(visit.clinic_notes);
  const reason = stringValue(visit.reason);

  return {
    id: stringValue(visit.id),
    createdAt: stringValue(visit.created_at),
    petName: stringValue(pet.pet_name) || stringValue(visit.pet_name) || "Unknown",
    species: stringValue(pet.species) || stringValue(visit.species),
    otherSpecies: stringValue(pet.other_species) || stringValue(visit.other_species),
    breed: stringValue(pet.breed) || stringValue(visit.breed),
    ownerFirstName: stringValue(owner.first_name) || stringValue(visit.owner_first_name),
    ownerLastName: stringValue(owner.last_name) || stringValue(visit.owner_last_name),
    ownerEmail: stringValue(owner.email),
    phone: stringValue(owner.phone) || stringValue(visit.phone),
    reason,
    visitType: stringValue(visit.visit_type),
    referralName: stringValue(visit.referral_name),
    beenHereBefore: stringValue(visit.been_here_before),
    clinicNotes,
    status: stringValue(visit.status, "Request submitted"),
    updates,
    consentFormType: stringValue(visit.consent_form_type),
    consentSignedName: stringValue(visit.consent_signed_name),
    consentSignedAt: stringValue(visit.consent_signed_at),
    estimateItems: Array.isArray(visit.estimate_items) ? visit.estimate_items : [],
    estimateTotal: typeof visit.estimate_total === "number" ? visit.estimate_total : 0,
    estimateStatus: stringValue(visit.estimate_status),
    workflowStep: stringValue(visit.workflow_step),
    forms: Array.isArray(visit.forms) ? visit.forms : [],
    petPhotoUrl: getPetPhotoFromNotes(clinicNotes),
    primaryContact: {
      firstName: stringValue(owner.first_name) || stringValue(visit.owner_first_name),
      lastName: stringValue(owner.last_name) || stringValue(visit.owner_last_name),
      phone: stringValue(owner.phone) || stringValue(visit.phone),
      email: stringValue(owner.email),
    },
    secondaryContacts: getSecondaryContactsFromReason(reason),
    petAge: getPetAgeFromReason(reason),
  };
};

const createVisitAccessToken = async ({
  visitId,
  ownerEmail,
}: {
  visitId: string;
  ownerEmail?: string;
}) => {
  const supabase = getSupabaseAdmin();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = createVisitToken();
    const { data, error } = await supabase
      .from("visit_access_tokens")
      .insert([
        {
          visit_id: visitId,
          token,
          owner_email: ownerEmail || null,
        },
      ])
      .select("token")
      .single();

    if (!error && data?.token) return String(data.token);
    if (error && error.code !== "23505") throw error;
  }

  throw new Error("Unable to create visit access token.");
};

const ensureVisitAccessToken = async (visitId: string, ownerEmail?: string) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("visit_access_tokens")
    .select("token")
    .eq("visit_id", visitId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (data?.token) return String(data.token);

  return createVisitAccessToken({ visitId, ownerEmail });
};

const withVisitAccess = async (visit: DbRecord) => {
  const mappedVisit = mapVisit(visit);
  const owner = recordValue(visit.owners);
  const token = await ensureVisitAccessToken(mappedVisit.id, stringValue(owner.email));

  return {
    ...mappedVisit,
    accessToken: token,
    accessUrl: buildVisitAccessUrl(token),
  };
};

const notifyVisitAccessChannels = async (visitId: string) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("visit_access_tokens")
      .select("token")
      .eq("visit_id", visitId);

    if (error) throw error;

    await Promise.all(
      ((data || []) as DbRecord[]).map(async (tokenRow) => {
        const token = stringValue(tokenRow.token);
        if (!token) return;

        const channel = supabase.channel(`visit-access:${token}`);

        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 1200);
          channel.subscribe((status) => {
            if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              clearTimeout(timeout);
              resolve();
            }
          });
        });

        await channel.send({
          type: "broadcast",
          event: "visit-updated",
          payload: {
            visitId,
            updatedAt: new Date().toISOString(),
          },
        });

        await supabase.removeChannel(channel);
      })
    );
  } catch (error) {
    console.error("Unable to notify realtime visit channel:", error);
  }
};

const isMissingCareHubTableError = (error: unknown) => {
  const dbError = error as { code?: string; message?: string } | null;
  return (
    dbError?.code === "42P01" ||
    Boolean(dbError?.message?.toLowerCase().includes("care_hub"))
  );
};

const isMissingEstimateTableError = (error: unknown) => {
  const dbError = error as { code?: string; message?: string } | null;
  return (
    dbError?.code === "42P01" ||
    dbError?.code === "42703" ||
    Boolean(dbError?.message?.toLowerCase().includes("estimate"))
  );
};

const isMissingNotificationTableError = (error: unknown) => {
  const dbError = error as { code?: string; message?: string } | null;
  return (
    dbError?.code === "42P01" ||
    Boolean(dbError?.message?.toLowerCase().includes("notification_events"))
  );
};

const isMissingClinicTableError = (error: unknown) => {
  const dbError = error as { code?: string; message?: string } | null;
  return (
    dbError?.code === "42P01" ||
    Boolean(dbError?.message?.toLowerCase().includes("clinics"))
  );
};

const isMissingIntegrationTableError = (error: unknown) => {
  const dbError = error as { code?: string; message?: string } | null;
  const message = dbError?.message?.toLowerCase() || "";
  return (
    dbError?.code === "42P01" ||
    dbError?.code === "42703" ||
    message.includes("integration_") ||
    message.includes("clinic_integrations") ||
    message.includes("external_visit_mappings")
  );
};

const isMissingReferralTableError = (error: unknown) => {
  const dbError = error as { code?: string; message?: string } | null;
  const message = dbError?.message?.toLowerCase() || "";
  return (
    dbError?.code === "42P01" ||
    dbError?.code === "42703" ||
    message.includes("referrals") ||
    message.includes("referral_documents") ||
    message.includes("referral_messages")
  );
};

const isMissingFormSignatureColumnError = (error: unknown) => {
  const dbError = error as { code?: string; message?: string } | null;
  const message = dbError?.message?.toLowerCase() || "";
  return (
    dbError?.code === "42703" ||
    message.includes("signature_data") ||
    message.includes("relationship_to_pet") ||
    message.includes("authorization_confirmed")
  );
};

const isMissingIntegrationReadyModelError = (error: unknown) => {
  const dbError = error as { code?: string; message?: string } | null;
  const message = dbError?.message?.toLowerCase() || "";
  return (
    dbError?.code === "42P01" ||
    dbError?.code === "42703" ||
    message.includes("clients") ||
    message.includes("notification_messages") ||
    message.includes("secondary_contacts") ||
    message.includes("client_id") ||
    message.includes("reason_for_visit")
  );
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);

const logNotificationMessage = async ({
  visitId,
  channel,
  recipientPhone = "",
  recipientEmail = "",
  message,
  status,
  provider = "",
  providerMessageId = "",
  errorMessage = "",
}: {
  visitId: string;
  channel: "sms" | "email" | "portal";
  recipientPhone?: string;
  recipientEmail?: string;
  message: string;
  status: "pending" | "sent" | "skipped" | "failed";
  provider?: string;
  providerMessageId?: string;
  errorMessage?: string;
}) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: visitData, error: visitError } = await supabase
      .from("visits")
      .select("clinic_id, client_id")
      .eq("id", visitId)
      .maybeSingle();

    if (visitError) throw visitError;

    const visit = (visitData || {}) as DbRecord;
    const clinicId = stringValue(visit.clinic_id);
    if (!clinicId) return;

    const { error } = await supabase.from("notification_messages").insert([
      {
        clinic_id: clinicId,
        visit_id: visitId,
        client_id: stringValue(visit.client_id) || null,
        recipient_phone: recipientPhone || null,
        recipient_email: recipientEmail || null,
        channel: channel === "portal" ? "in_app" : channel,
        message_body: message,
        status,
        provider: provider || null,
        provider_message_id: providerMessageId || null,
        error_message: errorMessage || null,
        sent_at: status === "sent" ? new Date().toISOString() : null,
      },
    ]);

    if (error) throw error;

  } catch (error) {
    if (isMissingIntegrationReadyModelError(error)) return;
    console.error("Unable to log notification message:", error);
  }
};

const logNotificationEvent = async ({
  visitId,
  channel,
  triggerType,
  recipientPhone = "",
  recipientEmail = "",
  subject = "",
  message,
  link = "",
  status,
  provider = "",
  providerResponse = {},
  errorMessage = "",
}: {
  visitId: string;
  channel: "sms" | "email" | "portal";
  triggerType: string;
  recipientPhone?: string;
  recipientEmail?: string;
  subject?: string;
  message: string;
  link?: string;
  status: "pending" | "sent" | "skipped" | "failed";
  provider?: string;
  providerResponse?: DbRecord;
  errorMessage?: string;
}) => {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("notification_events").insert([
      {
        visit_id: visitId,
        channel,
        trigger_type: triggerType,
        recipient_phone: recipientPhone || null,
        recipient_email: recipientEmail || null,
        subject: subject || null,
        message,
        link: link || null,
        status,
        provider: provider || null,
        provider_response: providerResponse,
        error: errorMessage || null,
      },
    ]);

    if (error) throw error;

    await logNotificationMessage({
      visitId,
      channel,
      recipientPhone,
      recipientEmail,
      message,
      status,
      provider,
      providerMessageId: stringValue(providerResponse.providerMessageId),
      errorMessage,
    });
  } catch (error) {
    if (isMissingNotificationTableError(error)) {
      console.info("Notification log skipped. Run the Phase 8 SQL to enable notification history.");
      return;
    }

    console.error("Unable to log notification event:", error);
  }
};

const logEmailNotificationPlaceholder = async ({
  visitId,
  recipientEmail,
  subject,
  message,
  link,
  triggerType,
}: {
  visitId: string;
  recipientEmail: string;
  subject: string;
  message: string;
  link: string;
  triggerType: string;
}) => {
  if (!recipientEmail) {
    await logNotificationEvent({
      visitId,
      channel: "email",
      triggerType,
      recipientEmail,
      subject,
      message,
      link,
      status: "skipped",
      provider: "not-configured",
      errorMessage: "Owner email is not available.",
    });
    return;
  }

  const resendApiKey = process.env.RESEND_API_KEY || process.env.MYPAWLINK_RESEND_API_KEY;
  const fromAddress =
    process.env.MYPAWLINK_EMAIL_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    "MyPawLink <updates@mypawlink.com>";
  const textBody = [message, link ? "View updates:\n" + link : ""].filter(Boolean).join("\n\n");

  if (!resendApiKey) {
    await logNotificationEvent({
      visitId,
      channel: "email",
      triggerType,
      recipientEmail,
      subject,
      message: textBody,
      link,
      status: "skipped",
      provider: "not-configured",
      errorMessage: "Email provider is not configured yet.",
    });
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + resendApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipientEmail,
        subject,
        text: textBody,
      }),
    });
    const providerResponse = (await response.json().catch(() => ({}))) as DbRecord;

    await logNotificationEvent({
      visitId,
      channel: "email",
      triggerType,
      recipientEmail,
      subject,
      message: textBody,
      link,
      status: response.ok ? "sent" : "failed",
      provider: "resend",
      providerResponse,
      errorMessage: response.ok ? "" : stringValue(providerResponse.message, "Email send failed."),
    });
  } catch (error) {
    await logNotificationEvent({
      visitId,
      channel: "email",
      triggerType,
      recipientEmail,
      subject,
      message: textBody,
      link,
      status: "failed",
      provider: "resend",
      errorMessage: error instanceof Error ? error.message : "Email send failed.",
    });
  }
};

const mapClinicSettings = (clinic: DbRecord | null, setupRequired = false): ClinicSettings => {
  if (!clinic) return { ...defaultClinicSettings, setupRequired: true };

  const config = recordValue(clinic.config);

  return {
    id: stringValue(clinic.id),
    slug: stringValue(clinic.slug, demoClinicSlug),
    name: stringValue(clinic.name, defaultClinicSettings.name),
    logoUrl: stringValue(clinic.logo_url),
    primaryColor: stringValue(clinic.primary_color, defaultClinicSettings.primaryColor),
    secondaryColor: stringValue(clinic.secondary_color, defaultClinicSettings.secondaryColor),
    phone: stringValue(clinic.phone),
    email: stringValue(clinic.email),
    address: stringValue(clinic.address),
    city: stringValue(clinic.city),
    state: stringValue(clinic.state),
    zip: stringValue(clinic.zip),
    timezone: stringValue(clinic.timezone, defaultClinicSettings.timezone),
    formsEnabled: booleanValue(clinic.forms_enabled, true),
    smsEnabled: booleanValue(clinic.sms_enabled, true),
    emailEnabled: booleanValue(clinic.email_enabled, true),
    estimatedWaitMinutes: numberValue(
      config.estimatedWaitMinutes,
      defaultClinicSettings.estimatedWaitMinutes
    ),
    defaultUpdateCadence: stringValue(
      config.defaultUpdateCadence,
      defaultClinicSettings.defaultUpdateCadence
    ),
    cprDefault: stringValue(config.cprDefault, defaultClinicSettings.cprDefault),
    aftercareFollowupHours: numberValue(
      config.aftercareFollowupHours,
      defaultClinicSettings.aftercareFollowupHours
    ),
    setupRequired,
  };
};

const loadClinicSettings = async () => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("clinics")
      .select("*")
      .eq("slug", demoClinicSlug)
      .maybeSingle();

    if (error) throw error;
    return mapClinicSettings((data || null) as DbRecord | null, !data);
  } catch (error) {
    if (isMissingClinicTableError(error)) {
      return { ...defaultClinicSettings, setupRequired: true };
    }

    throw error;
  }
};

const updateClinicSettings = async (body: RequestBody) => {
  const settings = recordValue(body.settings);
  const config = {
    estimatedWaitMinutes: numberValue(
      settings.estimatedWaitMinutes,
      defaultClinicSettings.estimatedWaitMinutes
    ),
    defaultUpdateCadence: stringValue(
      settings.defaultUpdateCadence,
      defaultClinicSettings.defaultUpdateCadence
    ),
    cprDefault: stringValue(settings.cprDefault, defaultClinicSettings.cprDefault),
    aftercareFollowupHours: numberValue(
      settings.aftercareFollowupHours,
      defaultClinicSettings.aftercareFollowupHours
    ),
  };

  const payload = {
    slug: demoClinicSlug,
    name: stringValue(settings.name, defaultClinicSettings.name).trim(),
    logo_url: stringValue(settings.logoUrl).trim(),
    primary_color: stringValue(settings.primaryColor, defaultClinicSettings.primaryColor).trim(),
    secondary_color: stringValue(settings.secondaryColor, defaultClinicSettings.secondaryColor).trim(),
    phone: stringValue(settings.phone).trim(),
    email: normalizeEmail(stringValue(settings.email)),
    address: stringValue(settings.address).trim(),
    city: stringValue(settings.city).trim(),
    state: stringValue(settings.state).trim(),
    zip: stringValue(settings.zip).trim(),
    timezone: stringValue(settings.timezone, defaultClinicSettings.timezone).trim(),
    forms_enabled: booleanValue(settings.formsEnabled, true),
    sms_enabled: booleanValue(settings.smsEnabled, true),
    email_enabled: booleanValue(settings.emailEnabled, true),
    config,
    updated_at: new Date().toISOString(),
  };

  if (!payload.name) {
    throw new Error("Clinic name is required.");
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("clinics")
      .upsert(payload, { onConflict: "slug" })
      .select("*")
      .single();

    if (error) throw error;
    return mapClinicSettings((data || {}) as DbRecord);
  } catch (error) {
    if (isMissingClinicTableError(error)) {
      throw new Error("Clinic settings are not set up yet. Run the Phase 9 SQL first.");
    }

    throw error;
  }
};

const getDemoClinicId = async () => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("clinics")
      .select("id")
      .eq("slug", demoClinicSlug)
      .maybeSingle();

    if (error) throw error;
    return stringValue((data as DbRecord | null)?.id);
  } catch (error) {
    if (isMissingClinicTableError(error)) return "";
    throw error;
  }
};

const getIntegrationQueueSummary = (events: DbRecord[]) => ({
  queued: events.filter((event) =>
    ["queued", "received", "pending_review"].includes(stringValue(event.status, "received"))
  ).length,
  processed: events.filter((event) => stringValue(event.status) === "processed").length,
  failed: events.filter((event) => stringValue(event.status) === "failed").length,
  lastEventAt: stringValue(events[0]?.created_at),
});

const loadIntegrationReadiness = async () => {
  try {
    const supabase = getSupabaseAdmin();
    const clinicId = await getDemoClinicId();

    if (!clinicId) return buildFallbackIntegrationReadiness(true);

    const { data: providerData, error: providerError } = await supabase
      .from("integration_providers")
      .select("provider_key, name, category, direction, description, capabilities, display_order")
      .in("provider_key", integrationProviderKeys)
      .order("display_order", { ascending: true });

    if (providerError) throw providerError;

    const { data: integrationData, error: integrationError } = await supabase
      .from("clinic_integrations")
      .select("provider_key, enabled, status, sync_mode, external_clinic_id, last_sync_at")
      .in("provider_key", integrationProviderKeys)
      .eq("clinic_id", clinicId);

    if (integrationError) throw integrationError;

    const integrationByProvider = new Map(
      ((integrationData || []) as DbRecord[]).map((integration) => [
        stringValue(integration.provider_key),
        integration,
      ])
    );

    const { data: eventData, error: eventError } = await supabase
      .from("integration_events")
      .select("status, created_at")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (eventError) throw eventError;

    const providers: IntegrationProviderReadiness[] = ((providerData || []) as DbRecord[]).map(
      (provider) => {
        const integration = integrationByProvider.get(stringValue(provider.provider_key)) || {};

        return {
          key: stringValue(provider.provider_key),
          name: stringValue(provider.name),
          category: stringValue(provider.category),
          direction: stringValue(provider.direction, "Two-way"),
          description: stringValue(provider.description),
          capabilities: stringArrayValue(provider.capabilities),
          enabled: integration.enabled === true,
          status: stringValue(integration.status, "Not connected"),
          syncMode: stringValue(integration.sync_mode, "planned connector"),
          externalClinicId: stringValue(integration.external_clinic_id),
          lastSyncAt: stringValue(integration.last_sync_at),
        };
      }
    );

    return {
      setupRequired: false,
      providers,
      queueSummary: getIntegrationQueueSummary((eventData || []) as DbRecord[]),
      supportedEvents: integrationSupportedEvents,
    };
  } catch (error) {
    if (isMissingIntegrationTableError(error) || isMissingClinicTableError(error)) {
      return buildFallbackIntegrationReadiness(true);
    }

    throw error;
  }
};

const logIntegrationEvent = async ({
  visitId = "",
  eventType,
  direction = "outbound",
  status = "received",
  payload = {},
}: {
  visitId?: string;
  eventType: string;
  direction?: "inbound" | "outbound";
  status?: "received" | "pending_review" | "processed" | "failed" | "ignored";
  payload?: DbRecord;
}) => {
  try {
    const clinicId = await getDemoClinicId();
    if (!clinicId) return;

    const supabase = getSupabaseAdmin();
    let { error } = await supabase.from("integration_events").insert([
      {
        clinic_id: clinicId,
        visit_id: visitId || null,
        provider_key: "mypawlink-api",
        external_system: "MyPawLink",
        direction,
        event_type: eventType,
        status,
        payload,
        payload_json: payload,
        normalized_payload_json: payload,
      },
    ]);

    if (error && isMissingIntegrationTableError(error)) {
      const fallbackResult = await supabase.from("integration_events").insert([
        {
          clinic_id: clinicId,
          visit_id: visitId || null,
          provider_key: "mypawlink-api",
          direction,
          event_type: eventType,
          status,
          payload,
        },
      ]);
      error = fallbackResult.error;
    }

    if (error) throw error;

    await recordAuditLog({
      clinicId,
      visitId,
      action: direction === "inbound" ? "integration_event_received" : "integration_sync_attempted",
      entityType: "integration_event",
      metadata: {
        eventType,
        direction,
        status,
        externalSystem: "MyPawLink",
      },
    });
  } catch (error) {
    if (isMissingIntegrationTableError(error) || isMissingClinicTableError(error)) {
      console.info("Integration event skipped. Run the Phase 12 SQL to enable integration history.");
      return;
    }

    console.error("Unable to log integration event:", error);
  }
};

const referralSelect = `
  *,
  referral_documents (
    id,
    file_name,
    file_url,
    file_type,
    uploaded_at
  ),
  referral_messages (
    id,
    sender_type,
    sender_name,
    message,
    created_at
  )
`;

const mapReferral = (referral: DbRecord) => {
  const documents = arrayValue(referral.referral_documents)
    .sort(
      (a, b) =>
        new Date(stringValue(a.uploaded_at)).getTime() -
        new Date(stringValue(b.uploaded_at)).getTime()
    )
    .map((document) => ({
      id: stringValue(document.id),
      fileName: stringValue(document.file_name),
      fileUrl: stringValue(document.file_url),
      fileType: stringValue(document.file_type),
      uploadedAt: stringValue(document.uploaded_at),
    }));
  const messages = arrayValue(referral.referral_messages)
    .sort(
      (a, b) =>
        new Date(stringValue(a.created_at)).getTime() -
        new Date(stringValue(b.created_at)).getTime()
    )
    .map((message) => ({
      id: stringValue(message.id),
      senderType: stringValue(message.sender_type),
      senderName: stringValue(message.sender_name),
      message: stringValue(message.message),
      createdAt: stringValue(message.created_at),
    }));

  return {
    id: stringValue(referral.id),
    clinicId: stringValue(referral.clinic_id),
    referringClinicName: stringValue(referral.referring_clinic_name),
    referringDoctorName: stringValue(referral.referring_doctor_name),
    referringPhone: stringValue(referral.referring_phone),
    referringEmail: stringValue(referral.referring_email),
    referringAddress: stringValue(referral.referring_address),
    preferredCallbackNumber: stringValue(referral.preferred_callback_number),
    petName: stringValue(referral.pet_name),
    species: stringValue(referral.species),
    breed: stringValue(referral.breed),
    age: stringValue(referral.age),
    sex: stringValue(referral.sex),
    weight:
      typeof referral.weight === "number"
        ? referral.weight
        : Number(stringValue(referral.weight, "0")) || 0,
    ownerFirstName: stringValue(referral.owner_first_name),
    ownerLastName: stringValue(referral.owner_last_name),
    ownerPhone: stringValue(referral.owner_phone),
    ownerEmail: stringValue(referral.owner_email),
    referralType: stringValue(referral.referral_type),
    reason: stringValue(referral.reason),
    presentingComplaint: stringValue(referral.presenting_complaint),
    history: stringValue(referral.history),
    currentSymptoms: stringValue(referral.current_symptoms),
    suspectedDiagnosis: stringValue(referral.suspected_diagnosis),
    clinicalSummary: stringValue(referral.clinical_summary),
    treatmentProvided: stringValue(referral.treatment_provided),
    medicationsGiven: stringValue(referral.medications_given),
    ivFluids: stringValue(referral.iv_fluids),
    transferTime: stringValue(referral.transfer_time),
    stabilityLevel: stringValue(referral.stability_level, "Stable"),
    status: stringValue(referral.status, "Referral Submitted"),
    convertedVisitId: stringValue(referral.converted_visit_id),
    createdAt: stringValue(referral.created_at),
    documents,
    messages,
  };
};

const fetchReferralById = async (referralId: string) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("referrals")
    .select(referralSelect)
    .eq("id", referralId)
    .single();

  if (error) throw error;
  return mapReferral((data || {}) as DbRecord);
};

const loadReferrals = async () => {
  try {
    const supabase = getSupabaseAdmin();
    const clinicId = await getDemoClinicId();
    let query = supabase
      .from("referrals")
      .select(referralSelect)
      .order("created_at", { ascending: false });

    if (clinicId) {
      query = query.eq("clinic_id", clinicId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return {
      setupRequired: false,
      referrals: ((data || []) as DbRecord[]).map(mapReferral),
    };
  } catch (error) {
    if (isMissingReferralTableError(error)) {
      return { setupRequired: true, referrals: [] };
    }

    throw error;
  }
};

const createReferralRecord = async (body: RequestBody) => {
  const referral = recordValue(body.referral);
  const documents = arrayValue(body.documents);
  const clinicId = await getDemoClinicId();
  const weight = Number(referral.weight);
  const transferTime = stringValue(referral.transferTime).trim();
  const referringClinicName = stringValue(referral.referringClinicName).trim();
  const referringDoctorName = stringValue(referral.referringDoctorName).trim();
  const petName = stringValue(referral.petName).trim();
  const species = stringValue(referral.species).trim();
  const referralType = stringValue(referral.referralType).trim();
  const reason = stringValue(referral.reason).trim();

  if (!referringClinicName || !referringDoctorName || !petName || !species || !referralType || !reason) {
    throw new Error("Referring clinic, doctor, pet, referral type, and reason are required.");
  }

  const payload = {
    clinic_id: clinicId || null,
    referring_clinic_name: referringClinicName,
    referring_doctor_name: referringDoctorName,
    referring_phone: stringValue(referral.referringPhone).trim(),
    referring_email: normalizeEmail(stringValue(referral.referringEmail)),
    referring_address: stringValue(referral.referringAddress).trim(),
    preferred_callback_number: stringValue(referral.preferredCallbackNumber).trim(),
    pet_name: petName,
    species,
    breed: stringValue(referral.breed).trim(),
    age: stringValue(referral.age).trim(),
    sex: stringValue(referral.sex).trim(),
    weight: Number.isFinite(weight) && weight > 0 ? weight : null,
    owner_first_name: stringValue(referral.ownerFirstName).trim(),
    owner_last_name: stringValue(referral.ownerLastName).trim(),
    owner_phone: stringValue(referral.ownerPhone).trim(),
    owner_email: normalizeEmail(stringValue(referral.ownerEmail)),
    referral_type: referralType,
    reason,
    presenting_complaint: stringValue(referral.presentingComplaint).trim(),
    history: stringValue(referral.history).trim(),
    current_symptoms: stringValue(referral.currentSymptoms).trim(),
    suspected_diagnosis: stringValue(referral.suspectedDiagnosis).trim(),
    clinical_summary: stringValue(referral.clinicalSummary).trim(),
    treatment_provided: stringValue(referral.treatmentProvided).trim(),
    medications_given: stringValue(referral.medicationsGiven).trim(),
    iv_fluids: stringValue(referral.ivFluids).trim(),
    transfer_time: transferTime ? new Date(transferTime).toISOString() : null,
    stability_level: stringValue(referral.stabilityLevel, "Stable").trim(),
    status: "Referral Submitted",
  };

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("referrals").insert([payload]).select("id").single();

    if (error) throw error;

    const referralId = stringValue((data as DbRecord).id);
    const documentPayload = documents
      .map((document) => ({
        referral_id: referralId,
        file_name: stringValue(document.fileName).trim(),
        file_url: stringValue(document.fileUrl).trim(),
        file_type: stringValue(document.fileType).trim(),
      }))
      .filter((document) => document.file_name);

    if (documentPayload.length) {
      const { error: documentError } = await supabase
        .from("referral_documents")
        .insert(documentPayload);
      if (documentError) throw documentError;
    }

    const { error: messageError } = await supabase.from("referral_messages").insert([
      {
        referral_id: referralId,
        sender_type: "referring_clinic",
        sender_name: referringDoctorName
          ? `${referringClinicName} - Dr. ${referringDoctorName}`
          : referringClinicName,
        message: "Referral submitted for emergency hospital review.",
      },
    ]);

    if (messageError) throw messageError;

    await logIntegrationEvent({
      eventType: "referral.created",
      payload: {
        referralId,
        petName,
        referralType,
        stabilityLevel: payload.stability_level,
        source: "referral_intake_portal",
      },
    });

    return fetchReferralById(referralId);
  } catch (error) {
    if (isMissingReferralTableError(error)) {
      throw new Error("Referral workflow tables are not set up yet. Run the Phase 13 SQL first.");
    }

    throw error;
  }
};

const updateReferralStatus = async ({
  referralId,
  status,
  message,
  senderName,
}: {
  referralId: string;
  status: string;
  message: string;
  senderName: string;
}) => {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("referrals")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", referralId);

  if (error) throw error;

  if (message) {
    const { error: messageError } = await supabase.from("referral_messages").insert([
      {
        referral_id: referralId,
        sender_type: "emergency_clinic",
        sender_name: senderName || "Emergency hospital",
        message,
      },
    ]);

    if (messageError) throw messageError;
  }

  await logIntegrationEvent({
    eventType: "referral.status_changed",
    payload: {
      referralId,
      status,
      message,
      source: "clinic_dashboard",
    },
  });

  return fetchReferralById(referralId);
};

const convertReferralToVisit = async (referralId: string) => {
  const referral = await fetchReferralById(referralId);
  const referringName = referral.referringDoctorName
    ? `${referral.referringClinicName} - Dr. ${referral.referringDoctorName}`
    : referral.referringClinicName;
  const referralSummary = [
    "Converted referral intake",
    `Referral type: ${referral.referralType}`,
    `Stability: ${referral.stabilityLevel}`,
    `Referring clinic: ${referringName}`,
    `Callback: ${referral.preferredCallbackNumber || referral.referringPhone || "Not provided"}`,
    `Reason: ${referral.reason}`,
    `Presenting complaint: ${referral.presentingComplaint || "Not provided"}`,
    `History: ${referral.history || "Not provided"}`,
    `Current symptoms: ${referral.currentSymptoms || "Not provided"}`,
    `Suspected diagnosis: ${referral.suspectedDiagnosis || "Not provided"}`,
    `Clinical summary: ${referral.clinicalSummary || "Not provided"}`,
    `Treatment provided: ${referral.treatmentProvided || "Not provided"}`,
    `Medications: ${referral.medicationsGiven || "Not provided"}`,
    `IV fluids: ${referral.ivFluids || "Not provided"}`,
    `Transfer time: ${
      referral.transferTime ? new Date(referral.transferTime).toLocaleString() : "Not provided"
    }`,
    `Documents: ${
      referral.documents.length
        ? referral.documents.map((document) => document.fileName).join(", ")
        : "None listed"
    }`,
  ].join("\n");

  const visit = await createOwnerPetVisit({
    owner: {
      first_name: referral.ownerFirstName || "Referral",
      last_name: referral.ownerLastName || referral.referringClinicName,
      phone: referral.ownerPhone || referral.referringPhone,
      email: referral.ownerEmail || referral.referringEmail,
    },
    pet: {
      pet_name: referral.petName,
      species: referral.species,
      other_species: "",
      breed: referral.breed,
    },
    visit: {
      visit_type: "Vet referral",
      referral_name: referringName,
      been_here_before: "Unknown",
      reason: referralSummary,
      status: "Referral converted to visit",
    },
    firstUpdate: {
      message: `Referral for ${referral.petName} was converted to an active visit.`,
      status: "Referral converted to visit",
    },
  });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("referrals")
    .update({
      status: "Converted to Visit",
      converted_visit_id: visit.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", referralId);

  if (error) throw error;

  const { error: messageError } = await supabase.from("referral_messages").insert([
    {
      referral_id: referralId,
      sender_type: "emergency_clinic",
      sender_name: "Emergency hospital",
      message: `Converted to active MyPawLink visit for ${referral.petName}.`,
    },
  ]);

  if (messageError) throw messageError;

  await logIntegrationEvent({
    visitId: visit.id,
    eventType: "referral.converted_to_visit",
    payload: {
      referralId,
      visitId: visit.id,
      petName: referral.petName,
      source: "clinic_dashboard",
    },
  });

  return {
    referral: await fetchReferralById(referralId),
    visit,
  };
};

const sendOwnerNotification = async ({
  visit,
  message,
  triggerType,
}: {
  visit: DbRecord;
  message: string;
  triggerType: string;
}) => {
  const mappedVisit = mapVisit(visit);
  const owner = recordValue(visit.owners);
  const ownerEmail = stringValue(owner.email);
  const ownerPhone = mappedVisit.phone;
  const token = await ensureVisitAccessToken(mappedVisit.id, ownerEmail);
  const link = buildVisitAccessUrl(token);
  const subject = `MyPawLink update for ${mappedVisit.petName}`;

  const smsResult = await sendSmsNotification({
    phone: ownerPhone,
    petName: mappedVisit.petName,
    message,
    link,
  });
  const smsStatus = smsResult.sent
    ? "sent"
    : smsResult.reason === "not-configured"
      ? "skipped"
      : "failed";

  await logNotificationEvent({
    visitId: mappedVisit.id,
    channel: "sms",
    triggerType,
    recipientPhone: ownerPhone,
    subject,
    message,
    link,
    status: smsStatus,
    provider: smsResult.provider || "twilio",
    providerResponse: {
      reason: smsResult.reason || "",
      providerMessageId: smsResult.providerMessageId || "",
    },
    errorMessage: smsResult.error || "",
  });

  await recordAuditLog({
    clinicId: stringValue(visit.clinic_id),
    visitId: mappedVisit.id,
    action: smsStatus === "sent" ? "text_message_sent" : "text_message_failed",
    entityType: "notification_message",
    metadata: {
      channel: "sms",
      triggerType,
      recipientPhone: ownerPhone,
      status: smsStatus,
      provider: smsResult.provider || "twilio",
      providerMessageId: smsResult.providerMessageId || "",
      error: smsResult.error || "",
    },
  });

  if (ownerEmail) {
    await logEmailNotificationPlaceholder({
      visitId: mappedVisit.id,
      recipientEmail: ownerEmail,
      subject,
      message,
      link,
      triggerType,
    });
  }

  return {
    channel: "sms",
    status: smsStatus,
    reason: smsResult.reason || "",
    error: smsResult.error || "",
    link,
  } satisfies OwnerNotificationSummary;
};

const getVisitIdForToken = async (token: string) => {
  const supabase = getSupabaseAdmin();
  const { data: tokenRow, error: tokenError } = await supabase
    .from("visit_access_tokens")
    .select("visit_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (tokenError) throw tokenError;

  const visitId = stringValue((tokenRow as DbRecord | null)?.visit_id);

  if (!visitId) {
    return {
      visitId: "",
      error: NextResponse.json({ error: "Invalid visit access link." }, { status: 404 }),
    };
  }

  const expiresAt = stringValue((tokenRow as DbRecord).expires_at);
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return {
      visitId: "",
      error: NextResponse.json(
        { error: "This visit access link has expired." },
        { status: 410 }
      ),
    };
  }

  await supabase
    .from("visit_access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token", token);

  return { visitId, error: null };
};

const mapSeedCareHub = () => ({
  setupRequired: true,
  categories: careHubSeedCategories.map((category) => ({
    id: category.slug,
    slug: category.slug,
    name: category.name,
    description: category.description,
    displayOrder: category.displayOrder,
    forms: category.forms.map((form) => ({
      id: form.slug,
      slug: form.slug,
      title: form.title,
      description: form.description,
      htmlContent: form.htmlContent,
      requiresSignature: true,
      requiresCheckbox: true,
      formType: form.formType,
      displayOrder: form.displayOrder,
      status: "Needs Signature",
      signedName: "",
      signedAt: "",
    })),
  })),
});

const loadCareHubForVisit = async (visitId: string) => {
  const supabase = getSupabaseAdmin();

  const { data: categoriesData, error: categoriesError } = await supabase
    .from("care_hub_form_categories")
    .select("id, slug, name, description, display_order")
    .order("display_order", { ascending: true });

  if (categoriesError) {
    if (isMissingCareHubTableError(categoriesError)) return mapSeedCareHub();
    throw categoriesError;
  }

  const { data: formsData, error: formsError } = await supabase
    .from("care_hub_forms")
    .select(
      "id, category_id, slug, title, description, html_content, requires_signature, requires_checkbox, form_type, display_order, is_active"
    )
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (formsError) {
    if (isMissingCareHubTableError(formsError)) return mapSeedCareHub();
    throw formsError;
  }

  const { data: signedFormsData, error: signedFormsError } = await supabase
    .from("signed_care_hub_forms")
    .select("id, form_id, owner_name, signed_at, status, checkbox_agreed")
    .eq("visit_id", visitId);

  if (signedFormsError) {
    if (isMissingCareHubTableError(signedFormsError)) return mapSeedCareHub();
    throw signedFormsError;
  }

  const signedByFormId = new Map(
    ((signedFormsData || []) as DbRecord[]).map((signedForm) => [
      stringValue(signedForm.form_id),
      signedForm,
    ])
  );
  const forms = (formsData || []) as DbRecord[];

  return {
    setupRequired: false,
    categories: ((categoriesData || []) as DbRecord[]).map((category) => ({
      id: stringValue(category.id),
      slug: stringValue(category.slug),
      name: stringValue(category.name),
      description: stringValue(category.description),
      displayOrder:
        typeof category.display_order === "number" ? category.display_order : 0,
      forms: forms
        .filter((form) => stringValue(form.category_id) === stringValue(category.id))
        .map((form) => {
          const signedForm = signedByFormId.get(stringValue(form.id));

          return {
            id: stringValue(form.id),
            slug: stringValue(form.slug),
            title: stringValue(form.title),
            description: stringValue(form.description),
            htmlContent: stringValue(form.html_content),
            requiresSignature: form.requires_signature !== false,
            requiresCheckbox: form.requires_checkbox !== false,
            formType: stringValue(form.form_type),
            displayOrder:
              typeof form.display_order === "number" ? form.display_order : 0,
            status: signedForm ? stringValue(signedForm.status, "Signed") : "Needs Signature",
            signedName: signedForm ? stringValue(signedForm.owner_name) : "",
            signedAt: signedForm ? stringValue(signedForm.signed_at) : "",
          };
        }),
    })),
  };
};

const signCareHubFormForVisit = async ({
  visitId,
  formId,
  ownerName,
  signatureData,
  checkboxAgreed,
  ipAddress,
  deviceInfo,
}: {
  visitId: string;
  formId: string;
  ownerName: string;
  signatureData: string;
  checkboxAgreed: boolean;
  ipAddress: string;
  deviceInfo: string;
}) => {
  const supabase = getSupabaseAdmin();
  const signedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("signed_care_hub_forms")
    .upsert(
      [
        {
          visit_id: visitId,
          form_id: formId,
          owner_name: ownerName,
          signature_data: signatureData,
          signed_at: signedAt,
          status: "Signed",
          checkbox_agreed: checkboxAgreed,
          ip_address: ipAddress,
          device_info: deviceInfo,
        },
      ],
      { onConflict: "visit_id,form_id" }
    )
    .select("id, form_id, owner_name, signed_at, status, checkbox_agreed")
    .single();

  if (error) throw error;

  await notifyVisitAccessChannels(visitId);

  const signedForm = (data || {}) as DbRecord;
  return {
    id: stringValue(signedForm.id),
    formId: stringValue(signedForm.form_id, formId),
    ownerName: stringValue(signedForm.owner_name, ownerName),
    signedAt: stringValue(signedForm.signed_at, signedAt),
    status: stringValue(signedForm.status, "Signed"),
    checkboxAgreed: signedForm.checkbox_agreed === true,
  };
};

const mapEstimate = (estimate: DbRecord) => ({
  id: stringValue(estimate.id),
  visitId: stringValue(estimate.visit_id),
  title: stringValue(estimate.title, "Treatment Estimate"),
  amount:
    typeof estimate.amount === "number"
      ? estimate.amount
      : Number(stringValue(estimate.amount, "0")) || 0,
  description: stringValue(estimate.description),
  status: stringValue(estimate.status, "Pending Owner Review"),
  approvedAt: stringValue(estimate.approved_at),
  declinedAt: stringValue(estimate.declined_at),
  discussionRequestedAt: stringValue(estimate.discussion_requested_at),
  notes: stringValue(estimate.notes),
  responseNotes: stringValue(estimate.response_notes),
  ownerName: stringValue(estimate.owner_name),
  createdAt: stringValue(estimate.created_at),
});

const estimateSelect = `
  id,
  visit_id,
  title,
  amount,
  description,
  status,
  approved_at,
  declined_at,
  discussion_requested_at,
  notes,
  response_notes,
  owner_name,
  created_at
`;

const loadEstimatesForVisit = async (visitId: string) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("estimates")
    .select(estimateSelect)
    .eq("visit_id", visitId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingEstimateTableError(error)) {
      return { setupRequired: true, estimates: [] };
    }
    throw error;
  }

  return {
    setupRequired: false,
    estimates: ((data || []) as DbRecord[]).map(mapEstimate),
  };
};

const createEstimateForVisit = async ({
  visitId,
  title,
  amount,
  description,
}: {
  visitId: string;
  title: string;
  amount: number;
  description: string;
}) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("estimates")
    .insert([
      {
        visit_id: visitId,
        title: title || "Treatment Estimate",
        amount,
        description,
        status: "Pending Owner Review",
      },
    ])
    .select(estimateSelect)
    .single();

  if (error) throw error;

  const updateResult = await addVisitUpdate({
    visitId,
    status: "Awaiting Estimate Approval",
    message: `A treatment estimate for ${formatMoney(amount)} is ready for review in MyPawLink.`,
    triggerType: "estimate_sent",
  });

  return {
    estimate: mapEstimate((data || {}) as DbRecord),
    visit: updateResult.visit,
    notification: updateResult.notification,
  };
};

const respondToEstimateForVisit = async ({
  visitId,
  estimateId,
  response,
  ownerName,
  responseNotes,
}: {
  visitId: string;
  estimateId: string;
  response: string;
  ownerName: string;
  responseNotes: string;
}) => {
  const normalizedResponse = response.toLowerCase();
  const now = new Date().toISOString();
  const status =
    normalizedResponse === "approved"
      ? "Approved"
      : normalizedResponse === "declined"
        ? "Declined"
        : "Discussion Requested";

  const update =
    status === "Approved"
      ? {
          status,
          approved_at: now,
          declined_at: null,
          discussion_requested_at: null,
          owner_name: ownerName,
          response_notes: responseNotes,
        }
      : status === "Declined"
        ? {
            status,
            approved_at: null,
            declined_at: now,
            discussion_requested_at: null,
            owner_name: ownerName,
            response_notes: responseNotes,
          }
        : {
            status,
            approved_at: null,
            declined_at: null,
            discussion_requested_at: now,
            owner_name: ownerName,
            response_notes: responseNotes,
          };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("estimates")
    .update(update)
    .eq("id", estimateId)
    .eq("visit_id", visitId)
    .select(estimateSelect)
    .single();

  if (error) throw error;

  await addVisitUpdate({
    visitId,
    status: `Estimate ${status.toLowerCase()}`,
    message:
      status === "Approved"
        ? `${ownerName} approved the treatment estimate.`
        : status === "Declined"
          ? `${ownerName} declined the treatment estimate.`
          : `${ownerName} requested a discussion about the treatment estimate.`,
    sendText: false,
  });

  return mapEstimate((data || {}) as DbRecord);
};

const staffRoles: StaffRole[] = ["Front Desk", "Technician", "Veterinarian", "Admin"];

const getStaffProfileFromSession = async (body: RequestBody) => {
  const authToken = stringValue(body.authToken);

  if (!authToken) {
    return { allowed: false, profile: null as StaffProfile | null, reason: "No staff session." };
  }

  const supabase = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabase.auth.getUser(authToken);
  const user = userData.user;

  if (userError || !user?.email) {
    return {
      allowed: false,
      profile: null as StaffProfile | null,
      reason: "Invalid staff session.",
    };
  }

  const email = normalizeEmail(user.email);

  const { data: profileData, error: profileError } = await supabase
    .from("clinic_staff_profiles")
    .select("email, full_name, role, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      allowed: false,
      profile: null as StaffProfile | null,
      reason: "Staff profile is not configured.",
    };
  }

  const profile = (profileData || {}) as DbRecord;
  const roleValue = stringValue(profile.role);
  const role = staffRoles.includes(roleValue as StaffRole)
    ? (roleValue as StaffRole)
    : "Front Desk";
  const isActive = profile.is_active !== false;

  if (profileData && isActive) {
    return {
      allowed: true,
      profile: {
        email: normalizeEmail(stringValue(profile.email, email)),
        fullName: stringValue(profile.full_name, email),
        role,
      },
      reason: "",
    };
  }

  return {
    allowed: false,
    profile: null as StaffProfile | null,
    reason: profileData ? "This staff account is not active." : "This account is not a clinic staff member.",
  };
};

const requireClinicAccess = async (
  body: RequestBody,
  allowedRoles: StaffRole[] = staffRoles
) => {
  const staffAccess = await getStaffProfileFromSession(body);

  if (staffAccess.allowed && staffAccess.profile && allowedRoles.includes(staffAccess.profile.role)) {
    return null;
  }

  if (staffAccess.allowed && staffAccess.profile) {
    return NextResponse.json(
      { error: "Your clinic role does not allow this action." },
      { status: 403 }
    );
  }

  return NextResponse.json(
    { error: staffAccess.reason || "Please sign in as clinic staff." },
    { status: 401 }
  );
};

const fetchVisitById = async (visitId: string) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("visits")
    .select(visitSelect)
    .eq("id", visitId)
    .single();

  if (error) throw error;
  return withVisitAccess(data as DbRecord);
};

const addVisitUpdate = async ({
  visitId,
  status,
  message,
  sendText = true,
  triggerType = "status_changed",
}: {
  visitId: string;
  status: string;
  message: string;
  sendText?: boolean;
  triggerType?: string;
}) => {
  const supabase = getSupabaseAdmin();
  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .select(visitSelect)
    .eq("id", visitId)
    .single();

  if (visitError) throw visitError;

  const currentUpdates = Array.isArray((visit as DbRecord).updates)
    ? ((visit as DbRecord).updates as Update[])
    : [];
  const updatedUpdates = [
    ...currentUpdates,
    {
      message,
      time: new Date().toLocaleTimeString(),
    },
  ];

  const { error } = await supabase
    .from("visits")
    .update({
      status,
      updates: updatedUpdates,
    })
    .eq("id", visitId);

  if (error) throw error;

  const { error: updateError } = await supabase.from("visit_updates").insert([
    {
      visit_id: visitId,
      message,
      status,
    },
  ]);

  if (updateError) throw updateError;

  await recordAuditLog({
    clinicId: stringValue((visit as DbRecord).clinic_id),
    visitId,
    action: "client_update_created",
    entityType: "visit_update",
    metadata: {
      status,
      triggerType,
      approvedForClient: sendText,
    },
  });

  await logIntegrationEvent({
    visitId,
    eventType:
      triggerType === "status_changed"
        ? "visit.status_changed"
        : `visit.${triggerType}`,
    payload: {
      status,
      message,
      triggerType,
      source: "clinic_dashboard",
    },
  });

  let notification: OwnerNotificationSummary | null = null;

  if (sendText) {
    notification = await sendOwnerNotification({
      visit: visit as DbRecord,
      message,
      triggerType,
    });
  }

  await notifyVisitAccessChannels(visitId);

  return {
    visit: await fetchVisitById(visitId),
    notification,
  };
};

const ensureEmergencyCareConsentForm = async (visitId: string) => {
  const supabase = getSupabaseAdmin();
  const { data: existingForms, error: existingError } = await supabase
    .from("forms")
    .select("id, form_status, form_body")
    .eq("visit_id", visitId)
    .eq("form_type", emergencyCareConsentTitle)
    .limit(1);

  if (existingError) throw existingError;

  const existingForm = ((existingForms || []) as DbRecord[])[0];
  if (existingForm?.id) {
    if (
      stringValue(existingForm.form_status) === "Sent" &&
      stringValue(existingForm.form_body) !== emergencyCareConsentBody
    ) {
      await supabase
        .from("forms")
        .update({ form_body: emergencyCareConsentBody })
        .eq("id", stringValue(existingForm.id));
    }
    return existingForm;
  }

  const { data, error } = await supabase
    .from("forms")
    .insert([
      {
        visit_id: visitId,
        form_type: emergencyCareConsentTitle,
        form_body: emergencyCareConsentBody,
        form_status: "Sent",
      },
    ])
    .select("id, form_status")
    .single();

  if (error) throw error;
  return (data || {}) as DbRecord;
};

const splitContactName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
};

const getPetAgeColumnsFromReason = (reason: string) => {
  const petAge = getPetAgeFromReason(reason);
  const ageMatch = petAge.display.match(/^(\d+)\s*(year|years|month|months|week|weeks)/i);
  const value = ageMatch ? Number(ageMatch[1]) : null;
  const unit = ageMatch?.[2]?.toLowerCase() || "";

  return {
    age_years: value && unit.startsWith("year") ? value : null,
    age_months: value && unit.startsWith("month") ? value : null,
    age_unknown: petAge.ageUnknown || petAge.display.toLowerCase() === "unknown",
  };
};

const persistIntegrationReadyIntake = async ({
  clinicId,
  createdPet,
  createdVisit,
  owner,
  pet,
  visit,
}: {
  clinicId: string;
  createdPet: DbRecord;
  createdVisit: DbRecord;
  owner: DbRecord;
  pet: DbRecord;
  visit: DbRecord;
}) => {
  if (!clinicId) return;

  try {
    const supabase = getSupabaseAdmin();
    const reason = stringValue(visit.reason);
    const ownerEmail = normalizeEmail(stringValue(owner.email));
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .insert([
        {
          clinic_id: clinicId,
          first_name: stringValue(owner.first_name),
          last_name: stringValue(owner.last_name),
          phone: stringValue(owner.phone) || null,
          email: ownerEmail || stringValue(owner.email) || null,
          preferred_contact_method: stringValue(owner.phone) ? "sms" : "email",
        },
      ])
      .select("id")
      .single();

    if (clientError) throw clientError;

    const clientId = stringValue((clientData as DbRecord | null)?.id);
    const ageColumns = getPetAgeColumnsFromReason(reason);

    const { error: petUpdateError } = await supabase
      .from("pets")
      .update({
        clinic_id: clinicId,
        client_id: clientId || null,
        name: stringValue(pet.pet_name),
        sex: getIntakeFieldFromReason(reason, "Sex") || null,
        ...ageColumns,
      })
      .eq("id", stringValue(createdPet.id));

    if (petUpdateError) throw petUpdateError;

    const { error: visitUpdateError } = await supabase
      .from("visits")
      .update({
        client_id: clientId || null,
        reason_for_visit: stringValue(visit.reason),
        referral_source: stringValue(visit.referral_name) || null,
        referral_clinic_name: stringValue(visit.referral_name) || null,
        client_visible_status: stringValue(visit.status, "Request submitted"),
        check_in_completed_at: new Date().toISOString(),
        sync_status: "not_synced",
      })
      .eq("id", stringValue(createdVisit.id));

    if (visitUpdateError) throw visitUpdateError;

    const secondaryContacts = getSecondaryContactsFromReason(reason);
    if (secondaryContacts.length) {
      const { error: contactError } = await supabase.from("secondary_contacts").insert(
        secondaryContacts.map((contact) => {
          const name = splitContactName(contact.name);
          return {
            clinic_id: clinicId,
            client_id: clientId || null,
            visit_id: stringValue(createdVisit.id),
            first_name: name.firstName,
            last_name: name.lastName,
            relationship: contact.relationship,
            phone: contact.phone || null,
            email: contact.email || null,
            can_receive_updates: true,
            can_authorize_care: contact.permissionLevel === "Can approve estimates/forms",
          };
        })
      );

      if (contactError) throw contactError;
    }
  } catch (error) {
    if (isMissingIntegrationReadyModelError(error)) {
      console.info("Integration-ready intake mirror skipped. Run Phase 15 SQL to enable it.");
      return;
    }

    console.error("Unable to persist integration-ready intake mirror:", error);
  }
};

const sendCheckInConfirmationEmail = async ({
  visitId,
  ownerEmail,
  petName,
  link,
}: {
  visitId: string;
  ownerEmail: string;
  petName: string;
  link: string;
}) => {
  await logEmailNotificationPlaceholder({
    visitId,
    recipientEmail: ownerEmail,
    subject: petName + " has been checked in",
    message:
      getCheckedInMessage(petName) +
      "\n\nIf action is needed, please review and sign the Emergency Care Consent.",
    link,
    triggerType: "check_in_confirmation",
  });
};

const createOwnerPetVisit = async ({
  owner,
  pet,
  visit,
  firstUpdate,
}: {
  owner: DbRecord;
  pet: DbRecord;
  visit: DbRecord;
  firstUpdate: { message: string; status: string };
}) => {
  const supabase = getSupabaseAdmin();
  const ownerEmail = normalizeEmail(stringValue(owner.email));
  const ownerPayload = {
    ...owner,
    email: ownerEmail || stringValue(owner.email),
  };

  const { data: createdOwner, error: ownerError } = await supabase
    .from("owners")
    .insert([ownerPayload])
    .select()
    .single();

  if (ownerError) throw ownerError;

  const { data: createdPet, error: petError } = await supabase
    .from("pets")
    .insert([{ ...pet, owner_id: createdOwner.id }])
    .select()
    .single();

  if (petError) throw petError;

  const clinicId = await getDemoClinicId();
  const visitPayload = {
    ...visit,
    owner_id: createdOwner.id,
    pet_id: createdPet.id,
    ...(clinicId ? { clinic_id: clinicId } : {}),
  };

  const { data: createdVisit, error: visitError } = await supabase
    .from("visits")
    .insert([visitPayload])
    .select()
    .single();

  if (visitError) throw visitError;

  const { error: updateError } = await supabase.from("visit_updates").insert([
    {
      visit_id: createdVisit.id,
      message: firstUpdate.message,
      status: firstUpdate.status,
    },
  ]);

  if (updateError) throw updateError;

  const visitId = String(createdVisit.id);
  const petName = stringValue(pet.pet_name, "Your pet");
  await persistIntegrationReadyIntake({
    clinicId,
    createdPet: createdPet as DbRecord,
    createdVisit: createdVisit as DbRecord,
    owner,
    pet,
    visit,
  });
  await ensureEmergencyCareConsentForm(visitId);
  const accessToken = await ensureVisitAccessToken(visitId, ownerEmail);
  await sendCheckInConfirmationEmail({
    visitId,
    ownerEmail,
    petName,
    link: buildVisitAccessUrl(accessToken),
  });

  await logIntegrationEvent({
    visitId: stringValue(createdVisit.id),
    eventType: stringValue(visit.visit_type).toLowerCase().includes("referral")
      ? "referral.created"
      : "visit.created",
    payload: {
      status: firstUpdate.status,
      visitType: stringValue(visit.visit_type),
      ownerEmail,
      petName: stringValue(pet.pet_name),
      source: "mypawlink_intake",
    },
  });

  await recordAuditLog({
    clinicId,
    visitId,
    action: "visit_created",
    entityType: "visit",
    entityId: visitId,
    metadata: {
      source: "owner_check_in",
      visitType: stringValue(visit.visit_type),
      petName,
    },
  });

  return fetchVisitById(String(createdVisit.id));
};

const loadOwnerVisitsForSession = async (body: RequestBody) => {
  const authToken = stringValue(body.authToken);

  if (!authToken) {
    return {
      error: NextResponse.json(
        { error: "Please sign in with your owner magic link first." },
        { status: 401 }
      ),
      visits: [] as unknown[],
    };
  }

  const supabase = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabase.auth.getUser(authToken);
  const ownerEmail = normalizeEmail(userData.user?.email || "");

  if (userError || !ownerEmail) {
    return {
      error: NextResponse.json(
        { error: "Please sign in with your owner magic link first." },
        { status: 401 }
      ),
      visits: [] as unknown[],
    };
  }

  const { data: ownerRows, error: ownerError } = await supabase
    .from("owners")
    .select("id")
    .ilike("email", ownerEmail);

  if (ownerError) throw ownerError;

  const ownerIds = ((ownerRows || []) as DbRecord[])
    .map((ownerRow) => stringValue(ownerRow.id))
    .filter(Boolean);

  if (!ownerIds.length) {
    return { error: null, visits: [] as unknown[] };
  }

  const { data, error } = await supabase
    .from("visits")
    .select(visitSelect)
    .in("owner_id", ownerIds)
    .neq("status", "Closed")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const visits = await Promise.all(((data || []) as DbRecord[]).map(withVisitAccess));
  return { error: null, visits };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const action = stringValue(body.action);
    const supabase = getSupabaseAdmin();

    if (action === "getStaffProfile") {
      const staffAccess = await getStaffProfileFromSession(body);
      return NextResponse.json({ staffProfile: staffAccess.profile });
    }

    if (action === "loadVisits") {
      const accessError = await requireClinicAccess(body);
      if (accessError) return accessError;

      const { data, error } = await supabase
        .from("visits")
        .select(visitSelect)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const visits = await Promise.all(((data || []) as DbRecord[]).map(withVisitAccess));
      return NextResponse.json({ visits });
    }

    if (action === "loadClinicSettings") {
      const accessError = await requireClinicAccess(body);
      if (accessError) return accessError;

      return NextResponse.json({ clinicSettings: await loadClinicSettings() });
    }

    if (action === "updateClinicSettings") {
      const accessError = await requireClinicAccess(body);
      if (accessError) return accessError;

      return NextResponse.json({
        clinicSettings: await updateClinicSettings(body),
      });
    }

    if (action === "loadIntegrationReadiness") {
      const accessError = await requireClinicAccess(body);
      if (accessError) return accessError;

      return NextResponse.json({
        integrationReadiness: await loadIntegrationReadiness(),
      });
    }

    if (action === "loadReferrals") {
      const accessError = await requireClinicAccess(body);
      if (accessError) return accessError;

      return NextResponse.json({
        referralWorkflow: await loadReferrals(),
      });
    }

    if (action === "createVisit") {
      const visit = await createOwnerPetVisit({
        owner: recordValue(body.owner),
        pet: recordValue(body.pet),
        visit: recordValue(body.visit),
        firstUpdate: {
          message: stringValue(body.firstUpdateMessage),
          status: stringValue(body.firstUpdateStatus, "Request submitted"),
        },
      });

      return NextResponse.json({ visit });
    }

    if (action === "createReferral") {
      return NextResponse.json({ referral: await createReferralRecord(body) });
    }

    if (action === "searchVisits") {
      return NextResponse.json(
        { error: "Pet-name lookup has been replaced with secure visit access links." },
        { status: 410 }
      );
    }

    if (action === "loadOwnerVisits") {
      const ownerVisits = await loadOwnerVisitsForSession(body);
      if (ownerVisits.error) return ownerVisits.error;

      return NextResponse.json({ visits: ownerVisits.visits });
    }

    if (action === "loadVisitByToken") {
      const token = stringValue(body.token).trim();

      if (!token) {
        return NextResponse.json(
          { error: "Visit access code is required." },
          { status: 400 }
        );
      }

      const tokenAccess = await getVisitIdForToken(token);
      if (tokenAccess.error) return tokenAccess.error;

      return NextResponse.json({ visit: await fetchVisitById(tokenAccess.visitId) });
    }

    if (action === "loadCareHubByToken") {
      const token = stringValue(body.token).trim();

      if (!token) {
        return NextResponse.json(
          { error: "Visit access code is required." },
          { status: 400 }
        );
      }

      const tokenAccess = await getVisitIdForToken(token);
      if (tokenAccess.error) return tokenAccess.error;

      return NextResponse.json({
        careHub: await loadCareHubForVisit(tokenAccess.visitId),
      });
    }

    if (action === "signCareHubForm") {
      const token = stringValue(body.token).trim();
      const formId = stringValue(body.formId).trim();
      const ownerName = stringValue(body.ownerName).trim();
      const signatureData = stringValue(body.signatureData).trim();
      const checkboxAgreed = body.checkboxAgreed === true;

      if (!token || !formId || !ownerName || !signatureData || !checkboxAgreed) {
        return NextResponse.json(
          { error: "Printed name, agreement checkbox, and signature are required." },
          { status: 400 }
        );
      }

      const tokenAccess = await getVisitIdForToken(token);
      if (tokenAccess.error) return tokenAccess.error;

      try {
        const signedForm = await signCareHubFormForVisit({
          visitId: tokenAccess.visitId,
          formId,
          ownerName,
          signatureData,
          checkboxAgreed,
          ipAddress: stringValue(request.headers.get("x-forwarded-for")).split(",")[0]?.trim(),
          deviceInfo: stringValue(request.headers.get("user-agent")),
        });

        return NextResponse.json({
          signedForm,
          careHub: await loadCareHubForVisit(tokenAccess.visitId),
        });
      } catch (error) {
        if (isMissingCareHubTableError(error)) {
          return NextResponse.json(
            { error: "Care Hub database tables are not set up yet. Run the Phase 5 SQL first." },
            { status: 500 }
          );
        }

        throw error;
      }
    }

    if (action === "loadEstimatesByToken") {
      const token = stringValue(body.token).trim();

      if (!token) {
        return NextResponse.json(
          { error: "Visit access code is required." },
          { status: 400 }
        );
      }

      const tokenAccess = await getVisitIdForToken(token);
      if (tokenAccess.error) return tokenAccess.error;

      return NextResponse.json({
        estimateWorkflow: await loadEstimatesForVisit(tokenAccess.visitId),
      });
    }

    if (action === "respondEstimate") {
      const token = stringValue(body.token).trim();
      const estimateId = stringValue(body.estimateId).trim();
      const response = stringValue(body.response).trim();
      const ownerName = stringValue(body.ownerName).trim();
      const responseNotes = stringValue(body.responseNotes).trim();

      if (!token || !estimateId || !response || !ownerName) {
        return NextResponse.json(
          { error: "Estimate response and owner name are required." },
          { status: 400 }
        );
      }

      if (!["approved", "declined", "discussion"].includes(response.toLowerCase())) {
        return NextResponse.json(
          { error: "Estimate response must be approved, declined, or discussion." },
          { status: 400 }
        );
      }

      const tokenAccess = await getVisitIdForToken(token);
      if (tokenAccess.error) return tokenAccess.error;

      try {
        const estimate = await respondToEstimateForVisit({
          visitId: tokenAccess.visitId,
          estimateId,
          response,
          ownerName,
          responseNotes,
        });

        return NextResponse.json({
          estimate,
          estimateWorkflow: await loadEstimatesForVisit(tokenAccess.visitId),
        });
      } catch (error) {
        if (isMissingEstimateTableError(error)) {
          return NextResponse.json(
            { error: "Estimate database columns are not set up yet. Run the Phase 7 SQL first." },
            { status: 500 }
          );
        }

        throw error;
      }
    }

    if (action === "sendUpdate") {
      const accessError = await requireClinicAccess(body);
      if (accessError) return accessError;

      const result = await addVisitUpdate({
        visitId: stringValue(body.visitId),
        status: stringValue(body.status),
        message: stringValue(body.message),
      });

      return NextResponse.json(result);
    }

    if (action === "updateReferralStatus") {
      const accessError = await requireClinicAccess(body);
      if (accessError) return accessError;

      const referralId = stringValue(body.referralId);
      const status = stringValue(body.status).trim();
      const message = stringValue(body.message).trim();

      if (!referralId || !status) {
        return NextResponse.json(
          { error: "Referral and status are required." },
          { status: 400 }
        );
      }

      try {
        const staffAccess = await getStaffProfileFromSession(body);
        return NextResponse.json({
          referral: await updateReferralStatus({
            referralId,
            status,
            message,
            senderName: staffAccess.profile?.fullName || "Emergency hospital",
          }),
        });
      } catch (error) {
        if (isMissingReferralTableError(error)) {
          return NextResponse.json(
            { error: "Referral workflow tables are not set up yet. Run the Phase 13 SQL first." },
            { status: 500 }
          );
        }

        throw error;
      }
    }

    if (action === "convertReferralToVisit") {
      const accessError = await requireClinicAccess(body);
      if (accessError) return accessError;

      const referralId = stringValue(body.referralId);
      if (!referralId) {
        return NextResponse.json({ error: "Referral is required." }, { status: 400 });
      }

      try {
        return NextResponse.json(await convertReferralToVisit(referralId));
      } catch (error) {
        if (isMissingReferralTableError(error)) {
          return NextResponse.json(
            { error: "Referral workflow tables are not set up yet. Run the Phase 13 SQL first." },
            { status: 500 }
          );
        }

        throw error;
      }
    }

    if (action === "createEstimate") {
      const accessError = await requireClinicAccess(body);
      if (accessError) return accessError;

      const visitId = stringValue(body.visitId);
      const title = stringValue(body.title, "Treatment Estimate").trim();
      const description = stringValue(body.description).trim();
      const amount = Number(body.amount);

      if (!visitId || !title || !description || !Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json(
          { error: "Visit, title, amount, and description are required." },
          { status: 400 }
        );
      }

      try {
        const result = await createEstimateForVisit({
          visitId,
          title,
          amount,
          description,
        });

        return NextResponse.json(result);
      } catch (error) {
        if (isMissingEstimateTableError(error)) {
          return NextResponse.json(
            { error: "Estimate database columns are not set up yet. Run the Phase 7 SQL first." },
            { status: 500 }
          );
        }

        throw error;
      }
    }

    if (action === "saveClinicNotes") {
      const accessError = await requireClinicAccess(body, [
        "Technician",
        "Veterinarian",
        "Admin",
      ]);
      if (accessError) return accessError;

      const { error } = await supabase
        .from("visits")
        .update({ clinic_notes: stringValue(body.clinicNotes) })
        .eq("id", stringValue(body.visitId));

      if (error) throw error;
      return NextResponse.json({ visit: await fetchVisitById(stringValue(body.visitId)) });
    }

    if (action === "assignDoctor") {
      const accessError = await requireClinicAccess(body);
      if (accessError) return accessError;

      const visitId = stringValue(body.visitId);
      const message = stringValue(body.message);
      const { error } = await supabase
        .from("visits")
        .update({
          clinic_notes: stringValue(body.clinicNotes),
        })
        .eq("id", visitId);

      if (error) throw error;

      const result = await addVisitUpdate({
        visitId,
        status: "Doctor assigned",
        message,
        triggerType: "doctor_assigned",
      });

      return NextResponse.json(result);
    }

    if (action === "sendEmergencyConsent") {
      const accessError = await requireClinicAccess(body);
      if (accessError) return accessError;

      const visitId = stringValue(body.visitId);
      if (!visitId) {
        return NextResponse.json({ error: "Visit is required." }, { status: 400 });
      }

      await ensureEmergencyCareConsentForm(visitId);
      const result = await addVisitUpdate({
        visitId,
        status: stringValue(body.status, "Request Submitted / Waiting for Team Review"),
        message: "Emergency Care Consent reminder sent to the owner.",
        triggerType: "emergency_consent_sent",
        sendText: false,
      });

      await logEmailNotificationPlaceholder({
        visitId,
        recipientEmail: result.visit.ownerEmail,
        subject: result.visit.petName + " needs Emergency Care Consent",
        message:
          "Please review and sign the Emergency Care Consent so the veterinary team can continue care for " +
          result.visit.petName +
          ".",
        link: result.visit.accessUrl,
        triggerType: "emergency_consent_sent",
      });

      return NextResponse.json(result);
    }

    if (action === "sendForm") {
      const accessError = await requireClinicAccess(body);
      if (accessError) return accessError;

      const visitId = stringValue(body.visitId);
      const { error } = await supabase.from("forms").insert([
        {
          visit_id: visitId,
          form_type: stringValue(body.formType),
          form_body: stringValue(body.formBody),
          form_status: "Sent",
        },
      ]);

      if (error) throw error;

      const result = await addVisitUpdate({
        visitId,
        status: stringValue(body.status),
        message: stringValue(body.message),
        triggerType: "form_sent",
      });

      return NextResponse.json(result);
    }

    if (action === "respondForm") {
      const formId = stringValue(body.formId).trim();
      const formStatus = stringValue(body.formStatus);
      const token = stringValue(body.token).trim();
      const signedName = stringValue(body.signedName).trim();
      const signatureData = stringValue(body.signatureData).trim();
      const relationshipToPet = stringValue(body.relationshipToPet).trim();
      const authorizationConfirmed = booleanValue(body.authorizationConfirmed);
      const chargesAcknowledged = booleanValue(body.chargesAcknowledged);
      const paymentDueAcknowledged = booleanValue(body.paymentDueAcknowledged);
      const separateEstimateAcknowledged = booleanValue(body.separateEstimateAcknowledged);

      if (!formId || !["Signed", "Declined"].includes(formStatus)) {
        return NextResponse.json({ error: "A valid form response is required." }, { status: 400 });
      }

      if (formStatus === "Signed" && (!signedName || !signatureData)) {
        return NextResponse.json(
          { error: "Owner name and signature are required to sign this form." },
          { status: 400 }
        );
      }

      let tokenVisitId = "";
      if (token) {
        const tokenAccess = await getVisitIdForToken(token);
        if (tokenAccess.error) return tokenAccess.error;
        tokenVisitId = tokenAccess.visitId;
      }

      const { data: formRow, error: formError } = await supabase
        .from("forms")
        .select("id, visit_id, form_type")
        .eq("id", formId)
        .maybeSingle();

      if (formError) throw formError;
      const formRecord = (formRow || {}) as DbRecord;
      const visitId = stringValue(formRecord.visit_id);
      const isEmergencyConsent =
        stringValue(formRecord.form_type).toLowerCase() === emergencyCareConsentTitle.toLowerCase();

      if (!visitId || (tokenVisitId && visitId !== tokenVisitId)) {
        return NextResponse.json({ error: "This form is not available for this visit." }, { status: 403 });
      }

      if (
        formStatus === "Signed" &&
        isEmergencyConsent &&
        (!authorizationConfirmed || !chargesAcknowledged || !paymentDueAcknowledged || !separateEstimateAcknowledged)
      ) {
        return NextResponse.json(
          { error: "All Emergency Care Consent acknowledgments are required." },
          { status: 400 }
        );
      }

      const baseUpdate =
        formStatus === "Signed"
          ? {
              form_status: "Signed",
              signed_name: signedName,
              signed_at: new Date().toISOString(),
            }
          : {
              form_status: "Declined",
              signed_name: signedName,
              decline_reason: stringValue(body.declineReason),
              declined_at: new Date().toISOString(),
            };

      const update =
        formStatus === "Signed"
          ? {
              ...baseUpdate,
              relationship_to_pet: relationshipToPet,
              authorization_confirmed: authorizationConfirmed,
              signature_data: signatureData,
            }
          : baseUpdate;

      let { error } = await supabase.from("forms").update(update).eq("id", formId);

      if (error && formStatus === "Signed" && isMissingFormSignatureColumnError(error)) {
        console.warn("Form signature columns are not installed yet. Run Phase 14 SQL.");
        const fallbackResult = await supabase.from("forms").update(baseUpdate).eq("id", formId);
        error = fallbackResult.error;
      }

      if (error) throw error;

      await supabase.from("visit_updates").insert([
        {
          visit_id: visitId,
          status: formStatus === "Signed" ? "Form signed" : "Form declined",
          message:
            stringValue(formRecord.form_type, "Form") +
            (formStatus === "Signed" ? " signed by owner." : " declined by owner."),
        },
      ]);

      await recordAuditLog({
        clinicId: await getDemoClinicId(),
        visitId,
        action: formStatus === "Signed" ? "form_signed" : "form_declined",
        entityType: "form",
        entityId: formId,
        metadata: {
          formType: stringValue(formRecord.form_type),
          signerName: signedName,
          relationshipToPet,
          signatureMethod: signatureData.startsWith("typed-signature:") ? "typed" : "drawn",
        },
      });

      await notifyVisitAccessChannels(visitId);

      return NextResponse.json({ ok: true, visit: await fetchVisitById(visitId) });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error("MyPawLink API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}
