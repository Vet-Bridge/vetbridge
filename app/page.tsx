"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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

const doctorMetaStart = "[[MPL_DOCTOR_ASSIGNMENT]]";
const doctorMetaEnd = "[[/MPL_DOCTOR_ASSIGNMENT]]";
const doctorMetaPattern = new RegExp(
  `\\n?${doctorMetaStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([\\s\\S]*?)${doctorMetaEnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
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

const withDoctorMetadata = (notes: string, doctor: DoctorOption) => {
  const visibleNotes = removeDoctorMetadata(notes);
  const metadata = `${doctorMetaStart}${JSON.stringify(doctor)}${doctorMetaEnd}`;
  return visibleNotes ? `${visibleNotes}\n${metadata}` : metadata;
};

type SupabaseVisit = {
  id: string;
  created_at: string;
  pet_name: string;
  species: string;
  other_species: string | null;
  owner_first_name: string;
  owner_last_name: string;
  phone: string;
  reason: string;
  visit_type: string;
  referral_name: string | null;
  been_here_before: string;
  clinic_notes: string | null;
  status: string;
  updates: Update[];

  breed: string | null;
consent_form_type: string | null;
consent_signed_name: string | null;
consent_signed_at: string | null;
estimate_items: EstimateItem[] | null;
estimate_total: number | null;
estimate_status: string | null;
workflow_step: string | null;
forms?: VisitForm[];
};

type LoadedVisitUpdate = {
  message: string;
  created_at: string;
};

type LoadedVisit = {
  id: string;
  created_at: string;
  pet_name: string | null;
  species: string | null;
  other_species: string | null;
  owner_first_name: string | null;
  owner_last_name: string | null;
  phone: string | null;
  reason: string | null;
  visit_type: string | null;
  referral_name: string | null;
  been_here_before: string | null;
  clinic_notes: string | null;
  status: string | null;
  updates: Update[] | null;
  breed: string | null;
  consent_form_type: string | null;
  consent_signed_name: string | null;
  consent_signed_at: string | null;
  estimate_items: EstimateItem[] | null;
  estimate_total: number | null;
  estimate_status: string | null;
  workflow_step: string | null;
  owners: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  pets: {
    pet_name: string | null;
    species: string | null;
    other_species: string | null;
    breed: string | null;
  } | null;
  visit_updates: LoadedVisitUpdate[] | null;
  forms: VisitForm[] | null;
};

type OwnerSearchResult = {
  id: string;
  created_at: string;
  reason: string | null;
  visit_type: string | null;
  referral_name: string | null;
  been_here_before: string | null;
  clinic_notes: string | null;
  status: string | null;
  updates: Update[] | null;
  owners: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
  } | {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
  }[] | null;
  pets: {
    pet_name: string | null;
    species: string | null;
    other_species: string | null;
    breed: string | null;
  } | {
    pet_name: string | null;
    species: string | null;
    other_species: string | null;
    breed: string | null;
  }[] | null;
};

export default function Home() {
  const [view, setView] = useState<
  "home" | "newPet" | "existingPet" | "ownerUpdates" | "clinic" | "status"
>("home");
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState("");
  const [searchError, setSearchError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedVisitType, setSelectedVisitType] = useState("");
  const [petPhotoPreview, setPetPhotoPreview] = useState("");
  const [petPhotoByVisitId, setPetPhotoByVisitId] = useState<Record<string, string>>({});
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
  const [visits, setVisits] = useState<Visit[]>([]);
  const [searchResults, setSearchResults] = useState<Visit[]>([]);
  const selectedVisit = visits.find((v) => v.id === selectedVisitId) || null;
  const activeVisits = visits.filter((visit) => visit.status !== "Closed");
  const closedVisits = visits.filter((visit) => visit.status === "Closed");
  const queueVisits = activeVisits
    .filter((visit) => visit.status !== "Ready for pickup")
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  useEffect(() => {
    loadVisits();
  }, []);

  const convertFromSupabase = (visit: SupabaseVisit): Visit => ({
  id: visit.id,
  createdAt: visit.created_at,
  petName: visit.pet_name,
  species: visit.species,
  otherSpecies: visit.other_species || "",
  ownerFirstName: visit.owner_first_name,
  ownerLastName: visit.owner_last_name,
  phone: visit.phone,
  reason: visit.reason,
  visitType: visit.visit_type,
  referralName: visit.referral_name || "",
  beenHereBefore: visit.been_here_before,
  clinicNotes: visit.clinic_notes || "",
  status: visit.status,
  updates: visit.updates || [],

  // new fields
  breed: visit.breed || "",
  consentFormType: visit.consent_form_type || "",
  consentSignedName: visit.consent_signed_name || "",
  consentSignedAt: visit.consent_signed_at || "",
  estimateItems: visit.estimate_items || [],
  estimateTotal: visit.estimate_total || 0,
  estimateStatus: visit.estimate_status || "",
  workflowStep: visit.workflow_step || "Request submitted",
  forms: visit.forms || [],
  petPhotoUrl: "",
});

  async function loadVisits() {
  const { data, error } = await supabase
    .from("visits")
    .select(`
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
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading visits:", error);
    return;
  }

  const formattedVisits = ((data || []) as LoadedVisit[]).map((visit) => {
    return {
      id: visit.id,
      createdAt: visit.created_at,

      petName: visit.pets?.pet_name || visit.pet_name || "Unknown",
      species: visit.pets?.species || visit.species || "",
      otherSpecies: visit.pets?.other_species || visit.other_species || "",
      breed: visit.pets?.breed || visit.breed || "",

      ownerFirstName: visit.owners?.first_name || visit.owner_first_name || "",
      ownerLastName: visit.owners?.last_name || visit.owner_last_name || "",
      phone: visit.owners?.phone || visit.phone || "",

      reason: visit.reason || "",
      visitType: visit.visit_type || "",
      referralName: visit.referral_name || "",
      beenHereBefore: visit.been_here_before || "",
      clinicNotes: visit.clinic_notes || "",
      status: visit.status || "Request submitted",

      updates:
        (visit.visit_updates ?? []).length > 0
          ? (visit.visit_updates ?? []).map((update) => ({
              message: update.message,
              time: new Date(update.created_at).toLocaleTimeString(),
            }))
          : visit.updates || [],

      consentFormType: visit.consent_form_type || "",
      consentSignedName: visit.consent_signed_name || "",
      consentSignedAt: visit.consent_signed_at || "",
      estimateItems: visit.estimate_items || [],
      estimateTotal: visit.estimate_total || 0,
      estimateStatus: visit.estimate_status || "",
      workflowStep: visit.workflow_step || "",
      forms: visit.forms || [],
      petPhotoUrl: petPhotoByVisitId[visit.id] || "",
    };
  });

  setVisits(formattedVisits);
}
  const getOwnerName = (visit: Visit) => `${visit.ownerFirstName} ${visit.ownerLastName}`;

  const getSpecies = (visit: Visit) =>
    visit.species === "Other" ? visit.otherSpecies : visit.species;

  const getPetPhoto = (visit: Visit) =>
    visit.petPhotoUrl || petPhotoByVisitId[visit.id] || "/vet-hero.jpeg";

  const handlePetPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      setPetPhotoPreview("");
      return;
    }

    setPetPhotoPreview(URL.createObjectURL(file));
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

  const createVisit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  const form = new FormData(e.currentTarget);
  const petAge = String(form.get("petAge") || "").trim();
  const reason = String(form.get("reason"));
  const reasonWithAge = petAge ? `Approx. age: ${petAge}\n\n${reason}` : reason;

  const firstUpdate = {
    message: "Visit request submitted. The clinic will review it shortly.",
    status: "Request submitted",
  };

  const { data: owner, error: ownerError } = await supabase
    .from("owners")
    .insert([
      {
        first_name: String(form.get("ownerFirstName")),
        last_name: String(form.get("ownerLastName")),
        phone: String(form.get("phone")),
        email: String(form.get("email")),
      },
    ])
    .select()
    .single();

  if (ownerError) {
    console.error(ownerError);
    alert("Error creating owner");
    return;
  }

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .insert([
      {
        owner_id: owner.id,
        pet_name: String(form.get("petName")),
        species: String(form.get("species")),
        other_species: String(form.get("otherSpecies") || ""),
        breed: String(form.get("breed") || ""),
      },
    ])
    .select()
    .single();

  if (petError) {
    console.error(petError);
    alert("Error creating pet");
    return;
  }

  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .insert([
      {
        owner_id: owner.id,
        pet_id: pet.id,
        visit_type: String(form.get("visitType")),
        referral_name: String(form.get("referralName") || ""),
        been_here_before: String(form.get("beenHereBefore")),
        reason: reasonWithAge,
        status: "Request submitted",
      },
    ])
    .select()
    .single();

  if (visitError) {
    console.error(visitError);
    alert("Error creating visit");
    return;
  }

  await supabase.from("visit_updates").insert([
    {
      visit_id: visit.id,
      message: firstUpdate.message,
      status: firstUpdate.status,
    },
  ]);

  await loadVisits();

  if (petPhotoPreview) {
    setPetPhotoByVisitId((current) => ({
      ...current,
      [visit.id]: petPhotoPreview,
    }));
  }

  setSelectedVisitId(visit.id);
  setSelectedSpecies("");
  setSelectedVisitType("");
  setPetPhotoPreview("");
  setView("status");
};

  const sendUpdate = async (visitId: string, status: string, message: string) => {
    const visit = visits.find((v) => v.id === visitId);
    if (!visit) return;

    const updatedUpdates = [
      ...visit.updates,
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

    if (error) {
      alert("There was an error updating the visit.");
      console.error("Error updating visit:", error);
      return;
    }

    const { error: updateError } = await supabase.from("visit_updates").insert([
      {
        visit_id: visitId,
        message,
        status,
      },
    ]);

    if (updateError) {
      console.error("Error saving visit update:", updateError);
    }

    setVisits((current) =>
      current.map((v) =>
        v.id === visitId ? { ...v, status, updates: updatedUpdates } : v
      )
    );
  };

  const saveClinicNotes = async (visitId: string, notes: string) => {
    const currentVisit = visits.find((visit) => visit.id === visitId);
    const assignedDoctor = currentVisit
      ? getAssignedDoctorFromNotes(currentVisit.clinicNotes)
      : null;
    const notesToSave = assignedDoctor
      ? withDoctorMetadata(notes, assignedDoctor)
      : notes;
    
    setVisits((current) =>
      current.map((visit) =>
        visit.id === visitId ? { ...visit, clinicNotes: notesToSave } : visit
      )
    );

    const { error } = await supabase
      .from("visits")
      .update({ clinic_notes: notesToSave })
      .eq("id", visitId);

    if (error) {
      console.error("Error saving clinic notes:", error);
    }
  };

  const assignDoctorToVisit = async (visitId: string, doctorName: string) => {
    const doctor = doctors.find((item) => item.name === doctorName);
    const visit = visits.find((item) => item.id === visitId);
    if (!doctor || !visit) return;

    const message = `Dr. ${doctor.name} is now assigned to ${visit.petName}'s case and will review the plan with you shortly.`;
    const updatedUpdates = [
      ...visit.updates,
      {
        message,
        time: new Date().toLocaleTimeString(),
      },
    ];
    const updatedNotes = withDoctorMetadata(visit.clinicNotes, doctor);

    const { error } = await supabase
      .from("visits")
      .update({
        clinic_notes: updatedNotes,
        status: "Doctor assigned",
        updates: updatedUpdates,
      })
      .eq("id", visitId);

    if (error) {
      alert("There was an error assigning the doctor.");
      console.error("Error assigning doctor:", error);
      return;
    }

    const { error: updateError } = await supabase.from("visit_updates").insert([
      {
        visit_id: visitId,
        message,
        status: "Doctor assigned",
      },
    ]);

    if (updateError) {
      console.error("Error saving doctor assignment update:", updateError);
    }

    setVisits((current) =>
      current.map((item) =>
        item.id === visitId
          ? {
              ...item,
              clinicNotes: updatedNotes,
              status: "Doctor assigned",
              updates: updatedUpdates,
            }
          : item
      )
    );
  };

  const statusOrder = [
  "Request submitted",
  "Accepted",
  "Checked in",
  "Doctor assigned",
  "Doctor reviewing",
  "Treatment started",
  "In observation",
  "Ready for pickup",
  "Closed",
];

const isStepLocked = (currentStatus: string, buttonStatus: string) => {
  const currentIndex = statusOrder.indexOf(currentStatus);
  const buttonIndex = statusOrder.indexOf(buttonStatus);

  if (currentIndex === -1 || buttonIndex === -1) return false;

  return currentIndex >= buttonIndex;
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
      <div style={styles.buttonTitle}>New Pet<br />Check-in</div>
      <div style={styles.buttonSubtitle}>
        Create your pet&apos;s profile and start receiving live care updates.
      </div>
    </div>
    <span style={styles.cardCta}>New Pet Check-in -&gt;</span>
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

                {selectedSpecies === "Other" && (
                  <input
                    style={styles.input}
                    name="otherSpecies"
                    placeholder="Enter pet type, for example Rabbit or Bird"
                    required
                  />
                )}

                <input style={styles.input} name="ownerFirstName" placeholder="Owner first name" required />
                <input style={styles.input} name="ownerLastName" placeholder="Owner last name" required />
                <input style={styles.input} name="phone" placeholder="Phone number" required />
                <input style={styles.input} name="email" placeholder="Email" required />

                <label style={styles.photoUploadBox}>
                  <span style={styles.photoUploadTitle}>Pet photo (optional)</span>
                  <span style={styles.photoUploadText}>
                    Add a picture so the care team and owner page can show the right pet.
                  </span>
                  <input
                    style={styles.hiddenFileInput}
                    type="file"
                    name="petPhoto"
                    accept="image/*"
                    onChange={handlePetPhotoChange}
                  />
                  <span style={styles.photoUploadButton}>
                    {petPhotoPreview ? "Change Photo" : "Choose Photo"}
                  </span>
                </label>

                <div style={styles.photoPreviewCard}>
                  <img
                    src={petPhotoPreview || "/vet-hero.jpeg"}
                    alt="Pet preview"
                    style={styles.photoPreviewImage}
                  />
                  <span>
                    {petPhotoPreview ? "Photo selected" : "No photo yet - we'll use a sample pet image."}
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
                  placeholder="What is going on with your pet?"
                  required
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

                <button style={styles.primaryButton} type="submit">
                  Submit Visit Request
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

        const { data, error } = await supabase
          .from("visits")
          .select(`
            id,
            created_at,
            reason,
            visit_type,
            referral_name,
            been_here_before,
            clinic_notes,
            status,
            updates,
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
            )
          `)
          .order("created_at", {
          ascending: false,
        });

        setLoading(false);

        if (error) {
          setSearchError("Something went wrong. Please try again.");
          console.error(error);
          return;
        }

        const matches = ((data || []) as unknown as OwnerSearchResult[]).filter((visit) => {
          const owner = Array.isArray(visit.owners) ? visit.owners[0] : visit.owners;
          const pet = Array.isArray(visit.pets) ? visit.pets[0] : visit.pets;
          const ownerEmail = (owner?.email || "").toLowerCase();
          const ownerPhone = owner?.phone || "";
          const visitPetName = (pet?.pet_name || "").toLowerCase();

          const emailMatches = email ? ownerEmail === email : true;
          const phoneMatches = phone ? ownerPhone.replace(/\D/g, "") === phone.replace(/\D/g, "") : true;
          const petMatches = petName ? visitPetName.includes(petName) : true;

          return emailMatches && phoneMatches && petMatches;
        });

        if (matches.length === 0) {
          setSearchError("We couldn't find your pet. Please check your details or register.");
          return;
        }

        const visitsList = matches.map((visit) => {
          const owner = Array.isArray(visit.owners) ? visit.owners[0] : visit.owners;
          const pet = Array.isArray(visit.pets) ? visit.pets[0] : visit.pets;

          return {
          id: visit.id,
          createdAt: visit.created_at,
          petName: pet?.pet_name || "Unknown",
          species: pet?.species || "",
          otherSpecies: pet?.other_species || "",
          breed: pet?.breed || "",
          ownerFirstName: owner?.first_name || "",
          ownerLastName: owner?.last_name || "",
          phone: owner?.phone || "",
          reason: visit.reason || "",
          visitType: visit.visit_type || "",
          referralName: visit.referral_name || "",
          beenHereBefore: visit.been_here_before || "",
          clinicNotes: visit.clinic_notes || "",
          status: visit.status || "Request submitted",
          updates: visit.updates || [],
          consentFormType: "",
          consentSignedName: "",
          consentSignedAt: "",
          estimateItems: [],
          estimateTotal: 0,
          estimateStatus: "",
          workflowStep: "",
          forms: [],
          petPhotoUrl: "",
        };
        });
        setSearchResults(visitsList);
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

      <button style={styles.primaryButton} type="submit">
        Find My Pet
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
                    <p style={styles.text}>Reason: {visit.reason}</p>

                    <textarea
                      style={styles.notesBox}
                      placeholder="Clinic notes - only visible to the clinic."
                      value={removeDoctorMetadata(visit.clinicNotes)}
                      onChange={(e) => saveClinicNotes(visit.id, e.target.value)}
                    />

                    <div style={styles.actionGrid}>
                      <div style={styles.actionGroupTitle}>Visit flow</div>
                     <button
  style={{
    ...styles.greenAction,
    opacity: isStepLocked(visit.status, "Accepted") ? 0.5 : 1,
    cursor: isStepLocked(visit.status, "Accepted") ? "not-allowed" : "pointer",
  }}
  disabled={isStepLocked(visit.status, "Accepted")}
  onClick={() =>
    sendUpdate(
      visit.id,
      "Accepted",
      `Your visit request for ${visit.petName} has been accepted.`
    )
  }
>
  Accept Visit
</button>

                      <button
  style={{
    ...styles.blueAction,
    opacity: visit.status !== "Accepted" ? 0.5 : 1,
    cursor: visit.status !== "Accepted" ? "not-allowed" : "pointer",
  }}
  disabled={visit.status !== "Accepted"}
  onClick={() =>
    sendUpdate(
      visit.id,
      "Checked in",
      `${visit.petName} has been checked in and is waiting for the medical team.`
    )
  }
>
  Checked In
</button>

                      <button
  style={{
    ...styles.purpleAction,
    opacity: isStepLocked(visit.status, "Doctor reviewing") ? 0.5 : 1,
    cursor: isStepLocked(visit.status, "Doctor reviewing") ? "not-allowed" : "pointer",
  }}
  disabled={isStepLocked(visit.status, "Doctor reviewing")}
  onClick={() =>
    sendUpdate(
      visit.id,
      "Doctor reviewing",
      `The doctor is reviewing ${visit.petName}'s case now.`
    )
  }
>
  Doctor Reviewing
</button>

                      <button
  style={{
    ...styles.orangeAction,
    opacity: visit.status !== "Doctor reviewing" ? 0.5 : 1,
    cursor: visit.status !== "Doctor reviewing" ? "not-allowed" : "pointer",
  }}
  disabled={visit.status !== "Doctor reviewing"}
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
  style={{
    ...styles.tealAction,
    opacity: visit.status !== "Treatment started" ? 0.5 : 1,
    cursor: visit.status !== "Treatment started" ? "not-allowed" : "pointer",
  }}
  disabled={visit.status !== "Treatment started"}
  onClick={() =>
    sendUpdate(
      visit.id,
      "In observation",
      `${visit.petName} is resting and being monitored by the team.`
    )
  }
>
  In Observation
</button>
                      <button style={styles.redAction} onClick={() => sendUpdate(visit.id, "Ready for pickup", `${visit.petName} is ready for pickup. Please check in at the front desk when you arrive.`)}>
                        Ready for Pickup
                      </button>
                      <button
  style={{
    ...styles.redAction,
    opacity: visit.status !== "Ready for pickup" ? 0.5 : 1,
    cursor: visit.status !== "Ready for pickup" ? "not-allowed" : "pointer",
  }}
  disabled={visit.status !== "Ready for pickup"}
  onClick={() =>
    sendUpdate(
      visit.id,
      "Closed",
      `${visit.petName}'s visit has been completed and closed.`
    )
  }
>
  Close Request
</button>
<div style={styles.actionGroupTitle}>Forms and approvals</div>
<button
  style={styles.blueAction}
  onClick={async () => {
    const formType = window.prompt(
      "Enter form name (Consent, CPR, Treatment, etc)"
    );

    if (!formType) return;

    const formBody = window.prompt(
      "Enter the form details the customer needs to read before signing or declining"
    );

    if (!formBody) return;

    const { error } = await supabase.from("forms").insert([
      {
        visit_id: visit.id,
        form_type: formType,
        form_body: formBody,
        form_status: "Sent",
      },
    ]);

    if (error) {
      console.error(error);
      alert("Error sending form");
      return;
    }

    alert("Form sent to customer");
    loadVisits();
  }}
>
  Send Form
</button>
<div style={styles.actionGroupTitle}>Care updates</div>
<button
  style={styles.tealAction}
  onClick={() =>
    sendUpdate(
      visit.id,
      visit.status,
      `${visit.petName}'s vital signs were checked and are stable at this time.`
    )
  }
>
  Vitals Stable
</button>
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
  style={styles.orangeAction}
  onClick={() =>
    sendUpdate(
      visit.id,
      "Hospitalized",
      `${visit.petName} has been hospitalized and the care team will continue sharing treatment updates here.`
    )
  }
>
  Hospitalized
</button>
<button
  style={styles.blueAction}
  onClick={() =>
    sendUpdate(
      visit.id,
      visit.status,
      `${visit.petName} was walked by the care team.`
    )
  }
>
  Walked
</button>
<button
  style={styles.blueAction}
  onClick={() =>
    sendUpdate(
      visit.id,
      visit.status,
      `${visit.petName} urinated during the latest care check.`
    )
  }
>
  Urinated
</button>
<button
  style={styles.blueAction}
  onClick={() =>
    sendUpdate(
      visit.id,
      visit.status,
      `${visit.petName} defecated during the latest care check.`
    )
  }
>
  Defecated
</button>
<button
  style={styles.greenAction}
  onClick={() =>
    sendUpdate(
      visit.id,
      visit.status,
      `${visit.petName}'s scheduled treatment was completed.`
    )
  }
>
  Treatment Done
</button>
                    </div>

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
                </div>
                <div style={styles.liveUpdateBody}>
                  <div>
                    <h3 style={styles.liveUpdateTitle}>
                      {selectedVisit.updates[selectedVisit.updates.length - 1]?.message ||
                        `${selectedVisit.petName}'s visit request has been received.`}
                    </h3>
                  </div>
                  <img src={getPetPhoto(selectedVisit)} alt={selectedVisit.petName} style={styles.petAvatar} />
                </div>
                <div style={styles.liveCardBottom}>
                  {getQueueDetails(selectedVisit) && (
                    <div style={styles.liveWaitPill}>
                      <span style={styles.liveWaitLabel}>Wait time</span>
                      <strong style={styles.liveWaitValue}>
                        {getQueueDetails(selectedVisit)?.estimatedWaitMinutes} min
                      </strong>
                    </div>
                  )}
                </div>
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

                const { error } = await supabase
                  .from("forms")
                  .update({
                    form_status: "Signed",
                    signed_name: signedName,
                    signed_at: new Date().toISOString(),
                  })
                  .eq("id", form.id);

                if (error) {
                  console.error(error);
                  alert("Error signing form");
                  return;
                }

                alert("Form signed successfully");
                loadVisits();
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

                const { error } = await supabase
                  .from("forms")
                  .update({
                    form_status: "Declined",
                    decline_reason: reason,
                    declined_at: new Date().toISOString(),
                  })
                  .eq("id", form.id);

                if (error) {
                  console.error(error);
                  alert("Error declining form");
                  return;
                }

                alert("Form declined. The clinic has been notified.");
                loadVisits();
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
                <h3 style={styles.sectionTitle}>What you can do</h3>
                <button style={styles.ownerMenuButton}>View All Updates <span>&gt;</span></button>
                <button style={styles.ownerMenuButton}>Clinic Information <span>&gt;</span></button>
                <button style={styles.ownerMenuButton}>Contact the Clinic <span>&gt;</span></button>
              </div>
              <div style={styles.timeline}>
                {selectedVisit.updates.map((update, index) => (
                  <div key={index} style={styles.timelineItem}>
                    <div style={styles.timelineDot}>OK</div>
                    <div style={styles.timelineContent}>
                      <p style={styles.timelineMessage}>{update.message}</p>
                      <small>{update.time}</small>
                    </div>
                  </div>
                ))}
              </div>

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

function MiniIcon({ type }: { type: "chat" | "check" | "heart" | "lock" | "paw" | "search" | "plus" }) {
  const stroke = type === "search" ? "#0b62d8" : "#087f78";

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
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
    gap: 12,
    marginTop: 18,
    marginBottom: 18,
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
  justifyContent: "flex-start",
  gap: 10,
  marginBottom: 14,
},

liveCardBottom: {
  display: "flex",
  justifyContent: "flex-start",
  marginTop: 12,
},

liveBadge: {
  display: "inline-flex",
  alignItems: "center",
  background: "#dcfce7",
  color: "#047857",
  borderRadius: 8,
  padding: "7px 9px",
  fontSize: 10,
  fontWeight: 800,
  lineHeight: 1,
},

liveWaitPill: {
  display: "flex",
  alignItems: "center",
  gap: 6,
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
  fontSize: 14,
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
  fontSize: 17,
  lineHeight: 1.35,
  margin: "0 0 12px",
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


