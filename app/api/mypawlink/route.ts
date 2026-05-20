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

const getPetPhotoFromNotes = (notes: string) => {
  const match = notes.match(/\n?\[\[MPL_PET_PHOTO\]\]([\s\S]*?)\[\[\/MPL_PET_PHOTO\]\]/);
  return match?.[1] || "";
};

const mapVisit = (visit: DbRecord) => {
  const owner = recordValue(visit.owners);
  const pet = recordValue(visit.pets);
  const updateRows = arrayValue(visit.visit_updates);
  const updates =
    updateRows.length > 0
      ? updateRows.map((update) => ({
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
}: {
  visitId: string;
  status: string;
  message: string;
  sendText?: boolean;
}) => {
  const supabase = getSupabaseAdmin();
  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .select(visitSelect)
    .eq("id", visitId)
    .single();

  if (visitError) throw visitError;

  const mappedVisit = mapVisit(visit as DbRecord);
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
    await sendSmsNotification({
      phone: mappedVisit.phone,
      petName: mappedVisit.petName,
      message,
    });
  }

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

      const { data: tokenRow, error: tokenError } = await supabase
        .from("visit_access_tokens")
        .select("visit_id, expires_at")
        .eq("token", token)
        .maybeSingle();

      if (tokenError) throw tokenError;

      const visitId = stringValue((tokenRow as DbRecord | null)?.visit_id);

      if (!visitId) {
        return NextResponse.json({ error: "Invalid visit access link." }, { status: 404 });
      }

      const expiresAt = stringValue((tokenRow as DbRecord).expires_at);
      if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
        return NextResponse.json(
          { error: "This visit access link has expired." },
          { status: 410 }
        );
      }

      await supabase
        .from("visit_access_tokens")
        .update({ last_used_at: new Date().toISOString() })
        .eq("token", token);

      return NextResponse.json({ visit: await fetchVisitById(visitId) });
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
