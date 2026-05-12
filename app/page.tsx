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

export default function Home() {
  const [view, setView] = useState<
  "home" | "newPet" | "existingPet" | "ownerUpdates" | "clinic" | "status"
>("home");
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState("");
  const [searchError, setSearchError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedVisitType, setSelectedVisitType] = useState("");
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
        visit.visit_updates?.length > 0
          ? visit.visit_updates.map((update) => ({
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
    };
  });

  setVisits(formattedVisits);
}
  const getOwnerName = (visit: Visit) => `${visit.ownerFirstName} ${visit.ownerLastName}`;

  const getSpecies = (visit: Visit) =>
    visit.species === "Other" ? visit.otherSpecies : visit.species;

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
        reason: String(form.get("reason")),
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

  setSelectedVisitId(visit.id);
  setSelectedSpecies("");
  setSelectedVisitType("");
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
    
    setVisits((current) =>
      current.map((visit) =>
        visit.id === visitId ? { ...visit, clinicNotes: notes } : visit
      )
    );

    const { error } = await supabase
      .from("visits")
      .update({ clinic_notes: notes })
      .eq("id", visitId);

    if (error) {
      console.error("Error saving clinic notes:", error);
    }
  };
  const statusOrder = [
  "Request submitted",
  "Accepted",
  "Checked in",
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
      <section style={styles.hero}>
        <div style={styles.heroLeft}>
          <div style={styles.logoMark}>MPL</div>

          <h1 style={styles.logo}>MyPawLink</h1>
          <p style={styles.tagline}>Care updates, made calmer.</p>

          <h2 style={styles.heroTitle}>A friendlier way to stay connected during your pet&apos;s visit.</h2>

          <p style={styles.heroSubtitle}>
            MyPawLink helps emergency vet teams share updates, forms, and next steps with pet owners in one simple place.
          </p>

          <div style={styles.featureRow}>
            <InfoCard icon="💬" title="Real-time updates" text="Know what is happening every step of the way." />
            <InfoCard icon="🛡️" title="Better communication" text="Stay informed without the stress of calling." />
            <InfoCard icon="❤️" title="Stronger trust" text="Keep owners and clinics connected during care." />
          </div>
        </div>

        <div style={styles.heroRight}>
          <div style={styles.petImageBox}>
            <img src="/vet-hero.jpeg" alt="Dog with veterinarian" style={styles.heroImage} />
          </div>

          <div style={styles.buttonRow}>
  <button style={styles.primaryCardButton} onClick={() => setView("newPet")}>
    <span style={styles.bigIcon}>🐾</span>
    <div style={styles.buttonText}>
      <div style={styles.buttonTitle}>Register New Pet</div>
      <div style={styles.buttonSubtitle}>
        Create a new pet profile and submit a visit request.
      </div>
    </div>
  </button>

            <button style={styles.darkCardButton} onClick={() => setView("existingPet")}>
    <span style={styles.bigIcon}>🔎</span>
    <div style={styles.buttonText}>
      <div style={styles.buttonTitle}>Check In Existing Pet</div>
      <div style={styles.buttonSubtitle}>
        Search by pet name, phone number, and email.
      </div>
    </div>
  </button>
</div> <button
  style={styles.staffLinkButton}
  onClick={() => setView("clinic")}
>
  Clinic staff dashboard
</button>
        </div>
      </section>

      <section style={styles.mainGrid}>
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <button style={styles.smallButton} onClick={() => setView("home")}>
              ← Home
            </button>
          </div>

          {view === "home" && (
            <div style={styles.homeMessage}>
              <h2 style={styles.title}>Welcome to MyPawLink</h2>
              <p style={styles.text}>
                Start a new visit, find an existing pet, or open the clinic dashboard.
              </p>
            </div>
          )}

          {view === "newPet" && (
            <section>
              <h2 style={styles.title}>Pet Owner</h2>
              <p style={styles.text}>Submit a visit request</p>

              <div style={styles.noticeBox}>
                <strong>We’re here to help your pet.</strong>
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

        const phone = String(form.get("phone") || "").trim();
        const email = String(form.get("email") || "").trim().toLowerCase();

        if (!email && !phone) {
          setSearchError("Please enter an email or phone number.");
          setLoading(false);
          return;
        }

        let query = supabase.from("visits").select("*");

        if (email) {
          query = query.ilike("email", email);
        } else {
          query = query.eq("phone", phone);
        }

        const { data, error } = await query.order("created_at", {
          ascending: false,
        });

        setLoading(false);

        if (error) {
          setSearchError("Something went wrong. Please try again.");
          console.error(error);
          return;
        }

        if (!data || data.length === 0) {
          setSearchError("We couldn’t find your pet. Please check your details or register.");
          return;
        }

        const visitsList = data.map(convertFromSupabase);
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
            <strong>{visit.petName}</strong> — {visit.species}
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
  {activeVisits.length} Active • {closedVisits.length} Closed
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
                    <p style={styles.text}>Been here before: {visit.beenHereBefore}</p>
                    <p style={styles.text}>Breed: {visit.breed || "Not provided"}</p>
                    {visit.consentFormType && (
  <p style={styles.text}>Form sent: {visit.consentFormType}</p>
)}
                    <p style={styles.text}>Reason: {visit.reason}</p>

                    <textarea
                      style={styles.notesBox}
                      placeholder="Clinic notes — only visible to the clinic."
                      value={visit.clinicNotes}
                      onChange={(e) => saveClinicNotes(visit.id, e.target.value)}
                    />

                    <div style={styles.actionGrid}>
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
<button
  style={styles.purpleAction}
  onClick={() => {
    const doctorName = window.prompt("Doctor name");

    if (!doctorName) return;

    sendUpdate(
      visit.id,
      "Doctor assigned",
      `Dr. ${doctorName} is now assigned to ${visit.petName}'s case and will review the plan with you shortly.`
    );
  }}
>
  Doctor Assigned
</button>
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
              <button style={styles.smallButton} onClick={() => setView("clinic")}>
                ← Back to Dashboard
              </button>

              <div style={styles.statusHeader}>
  <h2 style={styles.petTitle}>{selectedVisit.petName}</h2>
  <p style={styles.statusBadge}>{selectedVisit.status}</p>
</div>

              <div style={styles.detailsCard}>
                <p>Pet: {selectedVisit.petName} ({getSpecies(selectedVisit)})</p>
                <p>Owner: {getOwnerName(selectedVisit)}</p>
                <p>Visit Type: {selectedVisit.visitType}</p>
                {selectedVisit.visitType === "Vet referral" && <p>Referral: {selectedVisit.referralName}</p>}
                <p>Been here before: {selectedVisit.beenHereBefore}</p>
              </div>
              {getQueueDetails(selectedVisit) && (
                <div style={styles.queueGrid}>
                  <div style={styles.queueCard}>
                    <span style={styles.queueLabel}>Place in line</span>
                    <strong style={styles.queueNumber}>
                      #{getQueueDetails(selectedVisit)?.position}
                    </strong>
                  </div>
                  <div style={styles.queueCard}>
                    <span style={styles.queueLabel}>Patients ahead</span>
                    <strong style={styles.queueNumber}>
                      {getQueueDetails(selectedVisit)?.patientsAhead}
                    </strong>
                  </div>
                  <div style={styles.queueCard}>
                    <span style={styles.queueLabel}>Estimated wait</span>
                    <strong style={styles.queueNumber}>
                      {getQueueDetails(selectedVisit)?.estimatedWaitMinutes} min
                    </strong>
                  </div>
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
              <div style={styles.timeline}>
                {selectedVisit.updates.map((update, index) => (
                  <div key={index} style={styles.timelineItem}>
                    <div style={styles.timelineDot}>✓</div>
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
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

function InfoCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div style={styles.infoCard}>
      <div style={styles.infoIcon}>{icon}</div>
      <h3>{title}</h3>
      <p style={styles.smallText}>{text}</p>
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
  };
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #fff8f1 0%, #eef9f7 48%, #f6fbff 100%)",
    fontFamily: "Arial, sans-serif",
    color: "#243447",
    padding: 18,
  },
  hero: {
    maxWidth: 1180,
    margin: "0 auto 18px",
    background: "rgba(255, 255, 255, 0.92)",
    border: "1px solid rgba(255, 255, 255, 0.75)",
    borderRadius: 8,
    padding: 34,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 30,
    boxShadow: "0 18px 45px rgba(41, 64, 83, 0.12)",
  },
  heroLeft: {},
  heroRight: {
    display: "grid",
    alignContent: "center",
    gap: 22,
  },
  logoMark: {
    width: 62,
    height: 62,
    borderRadius: 8,
    background: "linear-gradient(135deg, #13a89e, #f97352)",
    color: "white",
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 18,
    boxShadow: "0 10px 25px rgba(249, 115, 82, 0.22)",
  },
  logo: {
    fontSize: 54,
    margin: "16px 0 0",
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
    fontSize: 38,
    lineHeight: 1.1,
    marginTop: 30,
    marginBottom: 12,
    color: "#243447",
  },
  heroSubtitle: {
    color: "#526070",
    fontSize: 18,
    maxWidth: 500,
    lineHeight: 1.55,
  },
  petImageBox: {
    minHeight: 280,
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid #dcefeb",
    boxShadow: "0 10px 25px rgba(41, 64, 83, 0.12)",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    minHeight: 280,
    objectFit: "cover",
    display: "block",
  },
  featureRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
    marginTop: 30,
  },
  infoCard: {
    textAlign: "center",
  },
  infoIcon: {
    width: 56,
    height: 56,
    margin: "0 auto 10px",
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    background: "#fff0e8",
    color: "#c24124",
    fontSize: 18,
    fontWeight: 800,
  },
  smallText: {
    color: "#64717d",
    fontSize: 13,
    lineHeight: 1.4,
  },
  buttonRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  primaryCardButton: {
    background: "linear-gradient(135deg, #13a89e, #0f766e)",
    color: "white",
    border: "none",
    padding: 22,
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 16,
    textAlign: "left",
    fontSize: 18,
    minHeight: 130,
  },
  darkCardButton: {
    background: "linear-gradient(135deg, #3b82f6, #2457a6)",
    color: "white",
    border: "none",
    padding: 22,
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 16,
    textAlign: "left",
    fontSize: 18,
    minHeight: 130,
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
    fontSize: 34,
    flexShrink: 0,
  },
  buttonText: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  buttonTitle: {
    fontSize: 22,
    fontWeight: 800,
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
    padding: 28,
    boxShadow: "0 15px 40px rgba(41, 64, 83, 0.1)",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  homeMessage: {
    textAlign: "center",
    padding: 40,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
    color: "#243447",
  },
  text: {
    color: "#64717d",
    lineHeight: 1.5,
  },
  form: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    maxWidth: 780,
  },
  input: {
    padding: 15,
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
    minHeight: 115,
    outline: "none",
  },
  label: {
    fontWeight: 700,
    marginBottom: 10,
    color: "#243447",
  },
  radioRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
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
  noticeBox: {
    background: "#f0fbf8",
    border: "1px solid #bfe9e0",
    borderRadius: 8,
    padding: 18,
    marginBottom: 20,
  },
  queueGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    marginBottom: 20,
  },
  queueCard: {
    background: "#ffffff",
    border: "1px solid #dcefeb",
    borderRadius: 8,
    padding: 16,
    boxShadow: "0 6px 14px rgba(41, 64, 83, 0.06)",
  },
  queueLabel: {
    display: "block",
    color: "#64717d",
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
  },
  queueNumber: {
    color: "#12485a",
    fontSize: 28,
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
    borderRadius: 999,
    fontSize: 14,
  },
  status: {
    background: "#fff0e8",
    color: "#c24124",
    padding: "8px 12px",
    borderRadius: 999,
    display: "inline-block",
    fontWeight: 700,
  },
  pill: {
    background: "#e6f7f5",
    color: "#0f766e",
    padding: "8px 12px",
    borderRadius: 999,
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
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    marginTop: 18,
    marginBottom: 18,
  },
  greenAction: actionStyle("#ecfdf3", "#027a48"),
  blueAction: actionStyle("#eff6ff", "#1d4ed8"),
  purpleAction: actionStyle("#faf5ff", "#7e22ce"),
  orangeAction: actionStyle("#fff7ed", "#ea580c"),
  tealAction: actionStyle("#ecfeff", "#0f766e"),
  redAction: actionStyle("#fff1f2", "#e11d48"),
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

petTitle: {
  fontSize: 32,
  fontWeight: 800,
  margin: 0,
},

statusBadge: {
  background: "#e6f7f5",
  color: "#0f766e",
  padding: "8px 14px",
  borderRadius: 8,
  fontWeight: 700,
},

detailsCard: {
  background: "#ffffff",
  borderRadius: 8,
  padding: 18,
  border: "1px solid #dcefeb",
  marginBottom: 18,
},
};
