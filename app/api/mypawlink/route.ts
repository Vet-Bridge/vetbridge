import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";
import { sendSmsNotification } from "../../../lib/sms";

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

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const buildVisitAccessUrl = (token: string) => {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://mypawlink.com").replace(
    /\/$/,
    ""
  );
  return `${siteUrl}/visit/${token}`;
};

const createVisitToken = () => randomBytes(18).toString("base64url");

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
          "I authorize the hospital to collect or apply the discussed deposit toward my pet's emergency care.\n\nI understand that the deposit is not a final invoice and that additional charges may apply depending on diagnostics, treatment, hospitalization, or procedures.\n\nAny remaining balance or credit will be reviewed at checkout or discharge.",
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

  return {
    id: stringValue(visit.id),
    createdAt: stringValue(visit.created_at),
    petName: stringValue(pet.pet_name) || stringValue(visit.pet_name) || "Unknown",
    species: stringValue(pet.species) || stringValue(visit.species),
    otherSpecies: stringValue(pet.other_species) || stringValue(visit.other_species),
    breed: stringValue(pet.breed) || stringValue(visit.breed),
    ownerFirstName: stringValue(owner.first_name) || stringValue(visit.owner_first_name),
    ownerLastName: stringValue(owner.last_name) || stringValue(visit.owner_last_name),
    phone: stringValue(owner.phone) || stringValue(visit.phone),
    reason: stringValue(visit.reason),
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

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);

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
    errorMessage: "Email provider is not configured yet.",
  });
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

  await logNotificationEvent({
    visitId: mappedVisit.id,
    channel: "sms",
    triggerType,
    recipientPhone: ownerPhone,
    subject,
    message,
    link,
    status: smsResult.sent ? "sent" : smsResult.reason === "not-configured" ? "skipped" : "failed",
    provider: "twilio",
    providerResponse: {
      reason: smsResult.reason || "",
      providerMessageId: smsResult.providerMessageId || "",
    },
    errorMessage: smsResult.error || "",
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

  const visit = await addVisitUpdate({
    visitId,
    status: "Awaiting Estimate Approval",
    message: `A treatment estimate for ${formatMoney(amount)} is ready for review in MyPawLink.`,
    triggerType: "estimate_sent",
  });

  return {
    estimate: mapEstimate((data || {}) as DbRecord),
    visit,
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

  if (sendText) {
    await sendOwnerNotification({
      visit: visit as DbRecord,
      message,
      triggerType,
    });
  }

  await notifyVisitAccessChannels(visitId);

  return fetchVisitById(visitId);
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

  const { data: createdOwner, error: ownerError } = await supabase
    .from("owners")
    .insert([owner])
    .select()
    .single();

  if (ownerError) throw ownerError;

  const { data: createdPet, error: petError } = await supabase
    .from("pets")
    .insert([{ ...pet, owner_id: createdOwner.id }])
    .select()
    .single();

  if (petError) throw petError;

  const { data: createdVisit, error: visitError } = await supabase
    .from("visits")
    .insert([
      {
        ...visit,
        owner_id: createdOwner.id,
        pet_id: createdPet.id,
      },
    ])
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

  return fetchVisitById(String(createdVisit.id));
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
      const visit = await createOwnerPetVisit({
        owner: recordValue(body.owner),
        pet: recordValue(body.pet),
        visit: recordValue(body.visit),
        firstUpdate: {
          message: stringValue(body.firstUpdateMessage),
          status: stringValue(body.firstUpdateStatus, "Referral received"),
        },
      });

      return NextResponse.json({ visit });
    }

    if (action === "searchVisits") {
      return NextResponse.json(
        { error: "Pet-name lookup has been replaced with secure visit access links." },
        { status: 410 }
      );
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

      const visit = await addVisitUpdate({
        visitId: stringValue(body.visitId),
        status: stringValue(body.status),
        message: stringValue(body.message),
      });

      return NextResponse.json({ visit });
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

      const visit = await addVisitUpdate({
        visitId,
        status: "Doctor assigned",
        message,
      });

      return NextResponse.json({ visit });
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

      const visit = await addVisitUpdate({
        visitId,
        status: stringValue(body.status),
        message: stringValue(body.message),
        triggerType: "form_sent",
      });

      return NextResponse.json({ visit });
    }

    if (action === "respondForm") {
      const formStatus = stringValue(body.formStatus);
      const update =
        formStatus === "Signed"
          ? {
              form_status: "Signed",
              signed_name: stringValue(body.signedName),
              signed_at: new Date().toISOString(),
            }
          : {
              form_status: "Declined",
              decline_reason: stringValue(body.declineReason),
              declined_at: new Date().toISOString(),
            };

      const { error } = await supabase
        .from("forms")
        .update(update)
        .eq("id", stringValue(body.formId));

      if (error) throw error;
      return NextResponse.json({ ok: true });
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
