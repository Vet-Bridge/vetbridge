import type {
  NormalizedClient,
  NormalizedPet,
  NormalizedSecondaryContact,
  NormalizedVisit,
} from "./types";

type DbRecord = Record<string, unknown>;

const stringValue = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const recordValue = (value: unknown): DbRecord => {
  if (Array.isArray(value)) return (value[0] as DbRecord | undefined) || {};
  if (value && typeof value === "object") return value as DbRecord;
  return {};
};

const arrayValue = (value: unknown): DbRecord[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is DbRecord => Boolean(item) && typeof item === "object");
};

const normalizeContactName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
};

const mapClient = (visit: DbRecord): NormalizedClient => {
  const owner = recordValue(visit.owners);
  const client = recordValue(visit.clients);

  return {
    id: stringValue(visit.client_id) || stringValue(client.id),
    firstName: stringValue(client.first_name) || stringValue(owner.first_name),
    lastName: stringValue(client.last_name) || stringValue(owner.last_name),
    phone: stringValue(client.phone) || stringValue(owner.phone),
    email: stringValue(client.email) || stringValue(owner.email),
    preferredContactMethod: stringValue(client.preferred_contact_method, "sms"),
  };
};

const mapPet = (visit: DbRecord): NormalizedPet => {
  const pet = recordValue(visit.pets);

  return {
    id: stringValue(visit.pet_id) || stringValue(pet.id),
    name: stringValue(pet.name) || stringValue(pet.pet_name),
    species: stringValue(pet.species),
    breed: stringValue(pet.breed),
    sex: stringValue(pet.sex),
    dateOfBirth: stringValue(pet.date_of_birth),
    ageYears: numberValue(pet.age_years),
    ageMonths: numberValue(pet.age_months),
    ageUnknown: pet.age_unknown === true,
  };
};

const mapSecondaryContacts = (visit: DbRecord): NormalizedSecondaryContact[] =>
  arrayValue(visit.secondary_contacts).map((contact) => {
    const normalizedName = normalizeContactName(
      [stringValue(contact.first_name), stringValue(contact.last_name)].filter(Boolean).join(" ")
    );

    return {
      firstName: stringValue(contact.first_name) || normalizedName.firstName,
      lastName: stringValue(contact.last_name) || normalizedName.lastName,
      relationship: stringValue(contact.relationship),
      phone: stringValue(contact.phone),
      email: stringValue(contact.email),
      canReceiveUpdates: contact.can_receive_updates !== false,
      canAuthorizeCare: contact.can_authorize_care === true,
    };
  });

export const mapVisitRecordToNormalizedVisit = (visit: DbRecord): NormalizedVisit => ({
  id: stringValue(visit.id),
  clinicId: stringValue(visit.clinic_id),
  client: mapClient(visit),
  pet: mapPet(visit),
  secondaryContacts: mapSecondaryContacts(visit),
  visitType: stringValue(visit.visit_type),
  reasonForVisit: stringValue(visit.reason_for_visit) || stringValue(visit.reason),
  referralSource: stringValue(visit.referral_source),
  referralClinicName: stringValue(visit.referral_clinic_name) || stringValue(visit.referral_name),
  status: stringValue(visit.status),
  clientVisibleStatus: stringValue(visit.client_visible_status),
  checkInCompletedAt: stringValue(visit.check_in_completed_at),
  externalClientId: stringValue(visit.external_client_id),
  externalPatientId: stringValue(visit.external_patient_id),
  externalVisitId: stringValue(visit.external_visit_id),
  externalAppointmentId: stringValue(visit.external_appointment_id),
});
