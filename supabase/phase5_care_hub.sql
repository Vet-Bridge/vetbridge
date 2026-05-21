-- MyPawLink Phase 5 Care Hub document workflow.
--
-- Important:
-- The app already has a public.forms table for clinic-sent visit forms.
-- To avoid breaking existing functionality, the production Care Hub uses
-- care_hub_form_categories, care_hub_forms, and signed_care_hub_forms.
-- All browser access continues through /api/mypawlink and secure visit tokens.

create table if not exists public.care_hub_form_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  display_order integer not null default 0,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.care_hub_forms (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.care_hub_form_categories(id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text not null,
  html_content text not null,
  requires_signature boolean not null default true,
  requires_checkbox boolean not null default true,
  form_type text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.signed_care_hub_forms (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  form_id uuid not null references public.care_hub_forms(id) on delete cascade,
  owner_name text not null,
  signature_data text not null,
  signed_at timestamp with time zone not null default now(),
  status text not null default 'Signed' check (status in ('Needs Signature', 'Signed', 'Approved', 'Declined', 'Pending Review')),
  checkbox_agreed boolean not null default false,
  ip_address text,
  device_info text,
  created_at timestamp with time zone not null default now(),
  unique (visit_id, form_id)
);

create index if not exists care_hub_forms_category_idx
  on public.care_hub_forms(category_id, display_order);

create index if not exists signed_care_hub_forms_visit_idx
  on public.signed_care_hub_forms(visit_id);

alter table public.care_hub_form_categories enable row level security;
alter table public.care_hub_forms enable row level security;
alter table public.signed_care_hub_forms enable row level security;

insert into public.care_hub_form_categories (slug, name, description, display_order)
values
  ('admission-forms', 'Admission Forms', 'Start-of-visit paperwork and hospital admission permissions.', 1),
  ('financial-forms', 'Financial Forms', 'Financial responsibility, deposits, and estimate approvals.', 2),
  ('emergency-decisions', 'Emergency Decisions', 'Critical care, CPR, and resuscitation preferences.', 3),
  ('treatment-consents', 'Treatment Consents', 'Medication, diagnostics, and hospitalization permissions.', 4),
  ('procedure-authorizations', 'Procedure Authorizations', 'Procedure-specific permissions for anesthesia, surgery, and transfusion.', 5),
  ('communication-preferences', 'Communication Preferences', 'SMS, media, and authorized contact preferences.', 6),
  ('discharge-documents', 'Discharge Documents', 'Discharge instructions, medication review, and follow-up care.', 7)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  display_order = excluded.display_order;

insert into public.care_hub_forms (
  category_id,
  slug,
  title,
  description,
  html_content,
  requires_signature,
  requires_checkbox,
  form_type,
  display_order,
  is_active
)
values
  ((select id from public.care_hub_form_categories where slug = 'admission-forms'), 'patient-admission-form', 'Patient Admission Form', 'Confirms owner and patient details for this emergency visit.', 'I confirm that the information provided for this emergency visit is accurate to the best of my knowledge.

I authorize the hospital team to receive my pet, review the presenting concern, and document information needed to support care during this visit.

I understand that this admission form does not replace direct medical advice from the attending veterinarian.', true, true, 'admission', 1, true),
  ((select id from public.care_hub_form_categories where slug = 'admission-forms'), 'treatment-authorization-form', 'Treatment Authorization Form', 'Allows the emergency team to examine and stabilize your pet.', 'I authorize the emergency veterinary team to examine my pet and provide reasonable stabilization care when medically necessary.

Stabilization may include oxygen support, IV catheter placement, fluids, medications, monitoring, or other time-sensitive interventions discussed with me by the care team.

I understand that additional diagnostics or treatments may require separate approval.', true, true, 'admission', 2, true),
  ((select id from public.care_hub_form_categories where slug = 'admission-forms'), 'medical-history-intake-form', 'Medical History Intake Form', 'Captures important history, medications, and current symptoms.', 'I confirm that I have shared all known medications, allergies, prior diagnoses, and relevant medical history for my pet.

I understand that incomplete medical history may affect treatment decisions and agree to update the team if new information becomes available.

The care team may use this information to prioritize diagnostics, treatments, and communication during this visit.', true, true, 'admission', 3, true),

  ((select id from public.care_hub_form_categories where slug = 'financial-forms'), 'financial-responsibility-agreement', 'Financial Responsibility Agreement', 'Acknowledges responsibility for charges from emergency care.', 'I understand that I am financially responsible for services authorized and provided during this emergency visit.

I understand that emergency care costs may change as my pet''s condition changes, and the hospital team will communicate major changes whenever possible.

I agree to ask questions before authorizing care if I need clarification about fees or payment expectations.', true, true, 'financial', 1, true),
  ((select id from public.care_hub_form_categories where slug = 'financial-forms'), 'deposit-authorization-form', 'Deposit Authorization Form', 'Approves an initial deposit toward recommended care.', 'I authorize the hospital to collect or apply the discussed deposit toward my pet''s emergency care.

I understand that the deposit is not a final invoice and that additional charges may apply depending on diagnostics, treatment, hospitalization, or procedures.

Any remaining balance or credit will be reviewed at checkout or discharge.', true, true, 'financial', 2, true),
  ((select id from public.care_hub_form_categories where slug = 'financial-forms'), 'treatment-estimate-approval', 'Treatment Estimate Approval', 'Approves a treatment estimate or requests discussion.', 'I have reviewed the treatment estimate provided for my pet.

I understand the estimate is a good-faith range and may change if my pet''s condition changes or if additional care becomes necessary.

By signing, I authorize the care team to proceed with the selected plan or understand that I may request further discussion before proceeding.', true, true, 'financial', 3, true),

  ((select id from public.care_hub_form_categories where slug = 'emergency-decisions'), 'cpr-authorization', 'CPR Authorization', 'Authorizes full cardiopulmonary resuscitation if needed.', 'I authorize the emergency team to perform CPR if my pet experiences cardiac or respiratory arrest.

CPR may include chest compressions, intubation, emergency drugs, defibrillation, and advanced life support.

I understand that CPR outcomes vary and that costs may be significant.', true, true, 'emergency_decision', 1, true),
  ((select id from public.care_hub_form_categories where slug = 'emergency-decisions'), 'dnr-authorization', 'DNR Authorization', 'Documents a do-not-resuscitate preference.', 'I request that the hospital team does not perform CPR if my pet experiences cardiac or respiratory arrest.

I understand that comfort care and other agreed medical support may still be provided unless I choose otherwise.

I understand I can update this preference by contacting the care team.', true, true, 'emergency_decision', 2, true),
  ((select id from public.care_hub_form_categories where slug = 'emergency-decisions'), 'critical-care-consent', 'Critical Care Consent', 'Allows urgent stabilization for critical patients.', 'I understand that my pet may require urgent interventions because of a serious or potentially life-threatening condition.

I authorize the care team to begin medically necessary stabilization while continuing to communicate treatment options and costs.

I understand that critical care carries risks, including complications or death despite appropriate treatment.', true, true, 'emergency_decision', 3, true),

  ((select id from public.care_hub_form_categories where slug = 'treatment-consents'), 'medication-consent', 'Medication Consent', 'Allows medications recommended by the care team.', 'I authorize the veterinary team to administer medications discussed with me or medically indicated for my pet''s emergency care.

Medications may include pain control, anti-nausea medication, antibiotics, sedatives, emergency drugs, or other prescribed treatments.

I understand all medications can carry risks or side effects.', true, true, 'treatment', 1, true),
  ((select id from public.care_hub_form_categories where slug = 'treatment-consents'), 'diagnostic-testing-consent', 'Diagnostic Testing Consent', 'Approves recommended testing such as labs or imaging.', 'I authorize the diagnostic testing discussed for my pet, which may include bloodwork, urinalysis, radiographs, ultrasound, ECG, or other tests.

I understand that diagnostics help guide medical decisions but may not always provide a complete diagnosis.

The care team will discuss significant findings and next steps.', true, true, 'treatment', 2, true),
  ((select id from public.care_hub_form_categories where slug = 'treatment-consents'), 'hospitalization-consent', 'Hospitalization Consent', 'Approves inpatient monitoring and treatment.', 'I authorize hospitalization for monitoring, nursing care, and treatments recommended by the veterinary team.

Hospitalization may include cage-side monitoring, medications, fluids, feeding support, pain scoring, and repeated vital sign checks.

I understand that care plans may change based on my pet''s response.', true, true, 'treatment', 3, true),

  ((select id from public.care_hub_form_categories where slug = 'procedure-authorizations'), 'anesthesia-consent', 'Anesthesia Consent', 'Reviews risks of sedation or anesthesia.', 'I authorize sedation or anesthesia if recommended for my pet''s diagnostics, treatment, or procedure.

I understand anesthesia carries risks including reaction, complications, or death, especially in unstable emergency patients.

The care team will monitor my pet and take reasonable precautions based on the situation.', true, true, 'procedure', 1, true),
  ((select id from public.care_hub_form_categories where slug = 'procedure-authorizations'), 'surgery-consent', 'Surgery Consent', 'Authorizes an emergency or urgent procedure.', 'I authorize the surgical or procedural care discussed with the veterinary team.

I understand risks may include bleeding, infection, anesthesia complications, unexpected findings, need for additional procedures, or death.

I authorize the veterinarian to make reasonable medical decisions if unexpected complications occur.', true, true, 'procedure', 2, true),
  ((select id from public.care_hub_form_categories where slug = 'procedure-authorizations'), 'blood-transfusion-consent', 'Blood Transfusion Consent', 'Authorizes blood products when medically needed.', 'I authorize blood or blood product transfusion if recommended for my pet.

I understand transfusions can be life-saving but may carry risks including allergic reaction, fever, infection risk, or other complications.

The team will monitor my pet for transfusion reactions whenever possible.', true, true, 'procedure', 3, true),

  ((select id from public.care_hub_form_categories where slug = 'communication-preferences'), 'sms-consent', 'SMS Consent', 'Approves text updates related to this visit.', 'I consent to receive SMS/text messages related to my pet''s emergency visit.

Messages may include status updates, forms, estimate notifications, discharge information, or requests to contact the clinic.

Message and data rates may apply, and I can ask the clinic to stop text updates.', true, true, 'communication', 1, true),
  ((select id from public.care_hub_form_categories where slug = 'communication-preferences'), 'photo-video-consent', 'Photo/Video Consent', 'Allows care-related photos or short videos to be shared.', 'I authorize the hospital team to capture and share care-related photos or short videos of my pet through MyPawLink when appropriate.

These images are intended for owner communication during the visit and are not a substitute for medical records.

I understand the clinic may limit media sharing during urgent care.', true, true, 'communication', 2, true),
  ((select id from public.care_hub_form_categories where slug = 'communication-preferences'), 'authorized-contact-form', 'Authorized Contact Form', 'Identifies who may receive updates or make decisions.', 'I confirm the people authorized to receive updates or discuss my pet''s care with the clinic.

I understand that medical and financial decisions should be made by the owner or authorized decision-maker.

I will notify the clinic if contact permissions change during this visit.', true, true, 'communication', 3, true),

  ((select id from public.care_hub_form_categories where slug = 'discharge-documents'), 'discharge-instructions', 'Discharge Instructions', 'Acknowledges discharge care instructions.', 'I acknowledge that I received discharge instructions for my pet.

I understand the diagnosis or assessment, home care instructions, warning signs, and recommended follow-up plan as explained by the care team.

I agree to contact a veterinarian if my pet worsens or if I have questions after discharge.', true, true, 'discharge', 1, true),
  ((select id from public.care_hub_form_categories where slug = 'discharge-documents'), 'medication-acknowledgment', 'Medication Acknowledgment', 'Confirms medication dosing and instructions were reviewed.', 'I acknowledge that my pet''s medication instructions were reviewed with me.

I understand the medication name, dose, route, frequency, duration, and any important side effects or precautions provided by the care team.

I will contact the clinic or my veterinarian if I have medication questions.', true, true, 'discharge', 2, true),
  ((select id from public.care_hub_form_categories where slug = 'discharge-documents'), 'follow-up-care-plan', 'Follow-Up Care Plan', 'Reviews recheck and aftercare recommendations.', 'I acknowledge the recommended follow-up care plan for my pet.

This may include recheck exams, primary veterinarian follow-up, specialist referral, lab rechecks, activity restrictions, or return precautions.

I understand that failure to follow up may affect recovery.', true, true, 'discharge', 3, true)
on conflict (slug) do update set
  category_id = excluded.category_id,
  title = excluded.title,
  description = excluded.description,
  html_content = excluded.html_content,
  requires_signature = excluded.requires_signature,
  requires_checkbox = excluded.requires_checkbox,
  form_type = excluded.form_type,
  display_order = excluded.display_order,
  is_active = excluded.is_active,
  updated_at = now();
