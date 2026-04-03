"use client";

import { useState, useCallback } from "react";
import { useStoreContext } from "@/contexts/StoreContext";
import { BirthPlan } from "@/types";
import { Save, CheckCircle2, Heart, Printer } from "lucide-react";
import clsx from "clsx";

type Tab = "personal" | "labour" | "afterBirth" | "interventions";

const TABS: { id: Tab; label: string }[] = [
  { id: "personal", label: "Personal Info" },
  { id: "labour", label: "Labour & Birth" },
  { id: "afterBirth", label: "After Birth" },
  { id: "interventions", label: "Interventions" },
];

// ── Reusable sub-components ────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">{title}</h3>
      <div className="card p-4 space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-stone-300 text-sage-600 focus:ring-sage-400"
      />
      <span className="text-sm text-stone-600">{label}</span>
    </label>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function BirthPlanPage() {
  const { store, loaded, updateBirthPlan } = useStoreContext();
  const [tab, setTab] = useState<Tab>("personal");
  const [saved, setSaved] = useState(false);

  const plan = store.birthPlan;

  const patch = useCallback(
    (changes: Partial<BirthPlan>) => {
      updateBirthPlan({ ...plan, ...changes });
    },
    [plan, updateBirthPlan]
  );

  const patchLabour = useCallback(
    (changes: Partial<BirthPlan["labour"]>) => {
      patch({ labour: { ...plan.labour, ...changes } });
    },
    [patch, plan.labour]
  );

  const patchAfterBirth = useCallback(
    (changes: Partial<BirthPlan["afterBirth"]>) => {
      patch({ afterBirth: { ...plan.afterBirth, ...changes } });
    },
    [patch, plan.afterBirth]
  );

  const patchInterventions = useCallback(
    (changes: Partial<BirthPlan["interventions"]>) => {
      patch({ interventions: { ...plan.interventions, ...changes } });
    },
    [patch, plan.interventions]
  );

  const handleSave = () => {
    updateBirthPlan(plan);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Progress: count non-empty string fields + true booleans across all sections
  const filledFields = countFilled(plan);

  if (!loaded) return null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Birth Plan</h1>
          <p className="text-sm text-stone-400 mt-1">
            {filledFields} fields filled
            {plan.updatedAt && (
              <> · Last updated {new Date(plan.updatedAt).toLocaleDateString()}</>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="btn-secondary">
            <Printer size={16} /> Print
          </button>
          <button onClick={handleSave} className="btn-primary">
            {saved ? <><CheckCircle2 size={16} /> Saved!</> : <><Save size={16} /> Save</>}
          </button>
        </div>
      </div>

      {/* Intro */}
      <div className="card p-4 mb-5 flex items-start gap-3 bg-rose-50 border-rose-100">
        <Heart size={16} className="text-rose-400 mt-0.5 shrink-0" />
        <p className="text-sm text-rose-700">
          Based on the BC Women&apos;s Hospital Labour &amp; Birth Guide. Fill in as much or as little as you like,
          then print and bring a copy for your care team.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-stone-100 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors",
              tab === t.id
                ? "bg-white text-stone-800 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "personal" && (
        <PersonalTab plan={plan} patch={patch} />
      )}
      {tab === "labour" && (
        <LabourTab plan={plan} patchLabour={patchLabour} />
      )}
      {tab === "afterBirth" && (
        <AfterBirthTab plan={plan} patchAfterBirth={patchAfterBirth} />
      )}
      {tab === "interventions" && (
        <InterventionsTab plan={plan} patchInterventions={patchInterventions} />
      )}

      {/* Global notes */}
      <div className="mt-6">
        <label className="label">Notes</label>
        <textarea
          className="textarea"
          rows={3}
          placeholder="Any other wishes or information for your care team…"
          value={plan.notes}
          onChange={(e) => patch({ notes: e.target.value })}
        />
      </div>
    </div>
  );
}

// ── Personal Info Tab ──────────────────────────────────────────────────────

function PersonalTab({
  plan,
  patch,
}: {
  plan: BirthPlan;
  patch: (c: Partial<BirthPlan>) => void;
}) {
  const pi = plan.personalInfo;
  const set = (changes: Partial<typeof pi>) =>
    patch({ personalInfo: { ...pi, ...changes } });

  return (
    <div>
      <Section title="Identity">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Legal Name">
            <input className="input" value={pi.legalName} onChange={(e) => set({ legalName: e.target.value })} placeholder="Legal name" />
          </Field>
          <Field label="Preferred Name">
            <input className="input" value={pi.preferredName} onChange={(e) => set({ preferredName: e.target.value })} placeholder="Name to be called" />
          </Field>
        </div>
        <Field label="Due Date">
          <input className="input" type="date" value={pi.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />
        </Field>
      </Section>
      <Section title="Medical Information">
        <Field label="Current Medications">
          <textarea className="textarea" rows={2} value={pi.currentMedications} onChange={(e) => set({ currentMedications: e.target.value })} placeholder="List any current medications…" />
        </Field>
        <Field label="Allergies">
          <textarea className="textarea" rows={2} value={pi.allergies} onChange={(e) => set({ allergies: e.target.value })} placeholder="Known allergies…" />
        </Field>
      </Section>
    </div>
  );
}

// ── Labour & Birth Tab ─────────────────────────────────────────────────────

function LabourTab({
  plan,
  patchLabour,
}: {
  plan: BirthPlan;
  patchLabour: (c: Partial<BirthPlan["labour"]>) => void;
}) {
  const l = plan.labour;
  const setCM = (changes: Partial<typeof l.comfortMeasures>) =>
    patchLabour({ comfortMeasures: { ...l.comfortMeasures, ...changes } });
  const setPP = (changes: Partial<typeof l.pushingPreferences>) =>
    patchLabour({ pushingPreferences: { ...l.pushingPreferences, ...changes } });
  const setPain = (changes: Partial<typeof l.painMedication>) =>
    patchLabour({ painMedication: { ...l.painMedication, ...changes } });

  return (
    <div>
      <Section title="Labour Goal">
        <Field label="How would you like to approach your labour?">
          <input className="input" value={l.labourGoal} onChange={(e) => patchLabour({ labourGoal: e.target.value })} placeholder="e.g. Natural birth, open to options…" />
        </Field>
      </Section>

      <Section title="Support People">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Birth Partner">
            <input className="input" value={l.birthPartner} onChange={(e) => patchLabour({ birthPartner: e.target.value })} placeholder="Partner name" />
          </Field>
          <Field label="Doula">
            <input className="input" value={l.doula} onChange={(e) => patchLabour({ doula: e.target.value })} placeholder="Doula name" />
          </Field>
        </div>
        <Field label="Others">
          <input className="input" value={l.otherSupportPeople} onChange={(e) => patchLabour({ otherSupportPeople: e.target.value })} placeholder="Other support people…" />
        </Field>
      </Section>

      <Section title="Room Atmosphere & Personal Touches">
        <Field label="Physical space & mood preferences">
          <textarea className="textarea" rows={2} value={l.atmosphereNotes} onChange={(e) => patchLabour({ atmosphereNotes: e.target.value })} placeholder="Music, lighting, privacy, personal objects…" />
        </Field>
        <Field label="Photography / video">
          <textarea className="textarea" rows={2} value={l.photographyNotes} onChange={(e) => patchLabour({ photographyNotes: e.target.value })} placeholder="Who may take photos, what moments to capture…" />
        </Field>
        <Field label="Cultural, religious, or personal requests">
          <textarea className="textarea" rows={2} value={l.personalTouches} onChange={(e) => patchLabour({ personalTouches: e.target.value })} placeholder="Any special ceremonies, traditions, language needs…" />
        </Field>
      </Section>

      <Section title="Comfort Measures During Labour">
        <div className="grid grid-cols-2 gap-2">
          <Check checked={l.comfortMeasures.walking} onChange={(v) => setCM({ walking: v })} label="Walking, rocking, leaning" />
          <Check checked={l.comfortMeasures.labourBall} onChange={(v) => setCM({ labourBall: v })} label="Labour ball" />
          <Check checked={l.comfortMeasures.tub} onChange={(v) => setCM({ tub: v })} label="Tub / hydrotherapy" />
          <Check checked={l.comfortMeasures.shower} onChange={(v) => setCM({ shower: v })} label="Shower" />
          <Check checked={l.comfortMeasures.heat} onChange={(v) => setCM({ heat: v })} label="Heat" />
          <Check checked={l.comfortMeasures.ice} onChange={(v) => setCM({ ice: v })} label="Ice" />
          <Check checked={l.comfortMeasures.massage} onChange={(v) => setCM({ massage: v })} label="Massage" />
          <Check checked={l.comfortMeasures.tens} onChange={(v) => setCM({ tens: v })} label="TENS machine" />
        </div>
        <Field label="Other comfort measures">
          <input className="input" value={l.comfortMeasures.other} onChange={(e) => setCM({ other: e.target.value })} placeholder="Other…" />
        </Field>
      </Section>

      <Section title="Pushing Preferences">
        <Check checked={l.pushingPreferences.varietyOfPositions} onChange={(v) => setPP({ varietyOfPositions: v })} label="Try a variety of pushing positions" />
        <Check checked={l.pushingPreferences.helpWithPushing} onChange={(v) => setPP({ helpWithPushing: v })} label="Have help or direction with pushing" />
        <Check checked={l.pushingPreferences.selfDirected} onChange={(v) => setPP({ selfDirected: v })} label="Self-directed pushing" />
        <Field label="Other">
          <input className="input" value={l.pushingPreferences.other} onChange={(e) => setPP({ other: e.target.value })} placeholder="Other…" />
        </Field>
      </Section>

      <Section title="Preferences for Pain Medication">
        <Check checked={l.painMedication.onlyIfAsked} onChange={(v) => setPain({ onlyIfAsked: v })} label="Only if I ask — do not offer pain medication to me" />
        <Check checked={l.painMedication.offerIfNotCoping} onChange={(v) => setPain({ offerIfNotCoping: v })} label="Offer if I appear not to be coping" />
        <Check checked={l.painMedication.offerAsSoonAsPossible} onChange={(v) => setPain({ offerAsSoonAsPossible: v })} label="Offer as soon as possible" />
        <p className="text-xs text-stone-400 pt-1">Options I would like to consider:</p>
        <div className="grid grid-cols-2 gap-2 pl-2">
          <Check checked={l.painMedication.nitrous} onChange={(v) => setPain({ nitrous: v })} label="Nitrous oxide (Entonox)" />
          <Check checked={l.painMedication.morphineFentanyl} onChange={(v) => setPain({ morphineFentanyl: v })} label="Morphine / fentanyl" />
          <Check checked={l.painMedication.epidural} onChange={(v) => setPain({ epidural: v })} label="Epidural" />
        </div>
        <Field label="Other">
          <input className="input" value={l.painMedication.other} onChange={(e) => setPain({ other: e.target.value })} placeholder="Other…" />
        </Field>
      </Section>

      <Section title="Cord Blood">
        <Check checked={l.cordBloodBankDonation} onChange={(v) => patchLabour({ cordBloodBankDonation: v })} label="I wish to donate to the Canadian Cord Blood Bank" />
        <Field label="Cord blood / tissue banking notes">
          <textarea className="textarea" rows={2} value={l.cordBloodTissueBankingNotes} onChange={(e) => patchLabour({ cordBloodTissueBankingNotes: e.target.value })} placeholder="Private banking details, instructions…" />
        </Field>
      </Section>

      <Section title="Other Requests">
        <textarea className="textarea" rows={3} value={l.otherRequests} onChange={(e) => patchLabour({ otherRequests: e.target.value })} placeholder="Personal, religious, cultural, or language requests…" />
      </Section>
    </div>
  );
}

// ── After Birth Tab ────────────────────────────────────────────────────────

function AfterBirthTab({
  plan,
  patchAfterBirth,
}: {
  plan: BirthPlan;
  patchAfterBirth: (c: Partial<BirthPlan["afterBirth"]>) => void;
}) {
  const ab = plan.afterBirth;
  const setNT = (changes: Partial<typeof ab.newbornTreatments>) =>
    patchAfterBirth({ newbornTreatments: { ...ab.newbornTreatments, ...changes } });

  return (
    <div>
      <Section title="Immediately After Birth">
        <Check checked={ab.skinToSkin} onChange={(v) => patchAfterBirth({ skinToSkin: v })} label="I would like skin-to-skin contact with baby right away" />
        <Field label="Cord cutting — who would you like to cut the cord?">
          <input className="input" value={ab.cordCuttingPerson} onChange={(e) => patchAfterBirth({ cordCuttingPerson: e.target.value })} placeholder="e.g. Birth partner, midwife, I will decide at the time…" />
        </Field>
      </Section>

      <Section title="Feeding">
        <p className="text-xs text-stone-500 mb-2">How are you planning to feed baby?</p>
        {(["breastfeed", "formula", "other"] as const).map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="feedingPlan"
              value={opt}
              checked={ab.feedingPlan === opt}
              onChange={() => patchAfterBirth({ feedingPlan: opt })}
              className="border-stone-300 text-sage-600 focus:ring-sage-400"
            />
            <span className="text-sm text-stone-600 capitalize">{opt === "breastfeed" ? "Breastfeed" : opt === "formula" ? "Formula" : "Other"}</span>
          </label>
        ))}
        <Field label="Feeding notes">
          <textarea className="textarea" rows={2} value={ab.feedingNotes} onChange={(e) => patchAfterBirth({ feedingNotes: e.target.value })} placeholder="Lactation consultant requested, no formula without asking…" />
        </Field>
      </Section>

      <Section title="Newborn Treatments">
        <p className="text-xs text-stone-500 mb-1">I would like my baby to have:</p>
        <Check checked={ab.newbornTreatments.antibioticEyeOintment} onChange={(v) => setNT({ antibioticEyeOintment: v })} label="Antibiotic eye ointment" />
        <Check checked={ab.newbornTreatments.vitaminKInjection} onChange={(v) => setNT({ vitaminKInjection: v })} label="Vitamin K injection" />
        <Field label="Other / notes">
          <input className="input" value={ab.newbornTreatments.other} onChange={(e) => setNT({ other: e.target.value })} placeholder="Other treatments or preferences…" />
        </Field>
      </Section>

      <Section title="Circumcision & Other Newborn Procedures">
        <textarea className="textarea" rows={2} value={ab.circumcisionPreferences} onChange={(e) => patchAfterBirth({ circumcisionPreferences: e.target.value })} placeholder="Your preferences around circumcision and other newborn procedures…" />
      </Section>

      <Section title="Placenta">
        <textarea className="textarea" rows={2} value={ab.placentaPreferences} onChange={(e) => patchAfterBirth({ placentaPreferences: e.target.value })} placeholder="Preferences for birth of the placenta, keeping it, donation…" />
      </Section>

      <Section title="Visitors">
        <textarea className="textarea" rows={2} value={ab.visitorsPreference} onChange={(e) => patchAfterBirth({ visitorsPreference: e.target.value })} placeholder="Who may visit, when, how to manage visits…" />
      </Section>
    </div>
  );
}

// ── Interventions Tab ──────────────────────────────────────────────────────

function InterventionsTab({
  plan,
  patchInterventions,
}: {
  plan: BirthPlan;
  patchInterventions: (c: Partial<BirthPlan["interventions"]>) => void;
}) {
  const inv = plan.interventions;
  const setUE = (changes: Partial<typeof inv.unexpectedEvents>) =>
    patchInterventions({ unexpectedEvents: { ...inv.unexpectedEvents, ...changes } });
  const setCM = (changes: Partial<typeof inv.continuousMonitoring>) =>
    patchInterventions({ continuousMonitoring: { ...inv.continuousMonitoring, ...changes } });
  const setPL = (changes: Partial<typeof inv.prolongedLabour>) =>
    patchInterventions({ prolongedLabour: { ...inv.prolongedLabour, ...changes } });
  const setSC = (changes: Partial<typeof inv.specialCareForBaby>) =>
    patchInterventions({ specialCareForBaby: { ...inv.specialCareForBaby, ...changes } });

  return (
    <div>
      <Section title="If Unexpected Events Occur">
        <p className="text-xs text-stone-500 mb-1">It is important to me:</p>
        <Check checked={inv.unexpectedEvents.includeInAllDecisions} onChange={(v) => setUE({ includeInAllDecisions: v })} label="To be included in all decisions" />
        <Check checked={inv.unexpectedEvents.partnerIncluded} onChange={(v) => setUE({ partnerIncluded: v })} label="To have my partner included in all decisions" />
        <Field label="Other">
          <input className="input" value={inv.unexpectedEvents.other} onChange={(e) => setUE({ other: e.target.value })} placeholder="Other…" />
        </Field>
      </Section>

      <Section title="If Continuous Monitoring is Needed">
        <Check checked={inv.continuousMonitoring.preferMobile} onChange={(v) => setCM({ preferMobile: v })} label="I prefer to be mobile" />
        <Check checked={inv.continuousMonitoring.useShowerBath} onChange={(v) => setCM({ useShowerBath: v })} label="I would like to use the shower or bath if possible" />
      </Section>

      <Section title="If My Labour is Prolonged">
        <Check checked={inv.prolongedLabour.tryNaturalMethods} onChange={(v) => setPL({ tryNaturalMethods: v })} label="Try natural methods as long as possible" />
        <Check checked={inv.prolongedLabour.offerMedication} onChange={(v) => setPL({ offerMedication: v })} label="Offer medication as soon as labour slows and it is safe" />
      </Section>

      <Section title="Assisted Birth / Caesarian Wishes">
        <p className="text-xs text-stone-500 mb-2">
          In the case of vacuum, forceps, or caesarian birth:
        </p>
        <textarea
          className="textarea"
          rows={4}
          value={inv.assistedBirthPreference}
          onChange={(e) => patchInterventions({ assistedBirthPreference: e.target.value })}
          placeholder="e.g. I will discuss the best method with my care team. In the case of caesarian — can my partner be present? Can I have skin-to-skin in the OR if possible?…"
        />
        <Field label="Additional caesarian wishes">
          <textarea className="textarea" rows={2} value={inv.caesarianWishes} onChange={(e) => patchInterventions({ caesarianWishes: e.target.value })} placeholder="Medication preferences, who is in the room, holding baby…" />
        </Field>
      </Section>

      <Section title="If Baby Needs Special Care">
        <p className="text-xs text-stone-500 mb-1">I would like:</p>
        <Check checked={inv.specialCareForBaby.skinToSkinIfPossible} onChange={(v) => setSC({ skinToSkinIfPossible: v })} label="Skin-to-skin care if possible" />
        <Check checked={inv.specialCareForBaby.helpExpressing} onChange={(v) => setSC({ helpExpressing: v })} label="Help to start expressing / pumping milk" />
        <Check checked={inv.specialCareForBaby.involvedInCare} onChange={(v) => setSC({ involvedInCare: v })} label="To be involved in baby's care as much as possible" />
        <Field label="Other">
          <input className="input" value={inv.specialCareForBaby.other} onChange={(e) => setSC({ other: e.target.value })} placeholder="Other…" />
        </Field>
      </Section>
    </div>
  );
}

// ── Progress helper ────────────────────────────────────────────────────────

function countFilled(plan: BirthPlan): number {
  let n = 0;
  const str = (v: string) => { if (v.trim()) n++; };
  const bool = (v: boolean) => { if (v) n++; };

  // personal
  str(plan.personalInfo.legalName);
  str(plan.personalInfo.preferredName);
  str(plan.personalInfo.dueDate);
  str(plan.personalInfo.currentMedications);
  str(plan.personalInfo.allergies);

  // labour
  str(plan.labour.birthPartner);
  str(plan.labour.doula);
  str(plan.labour.labourGoal);
  str(plan.labour.atmosphereNotes);
  str(plan.labour.photographyNotes);
  str(plan.labour.otherRequests);
  const cm = plan.labour.comfortMeasures;
  [cm.walking, cm.labourBall, cm.tub, cm.shower, cm.heat, cm.ice, cm.massage, cm.tens].forEach(bool);
  const pp = plan.labour.pushingPreferences;
  [pp.varietyOfPositions, pp.helpWithPushing, pp.selfDirected].forEach(bool);
  const pm = plan.labour.painMedication;
  [pm.onlyIfAsked, pm.offerIfNotCoping, pm.offerAsSoonAsPossible, pm.nitrous, pm.morphineFentanyl, pm.epidural].forEach(bool);
  bool(plan.labour.cordBloodBankDonation);

  // after birth
  bool(plan.afterBirth.skinToSkin);
  str(plan.afterBirth.cordCuttingPerson);
  if (plan.afterBirth.feedingPlan) n++;
  str(plan.afterBirth.feedingNotes);
  const nt = plan.afterBirth.newbornTreatments;
  [nt.antibioticEyeOintment, nt.vitaminKInjection].forEach(bool);
  str(plan.afterBirth.placentaPreferences);
  str(plan.afterBirth.circumcisionPreferences);
  str(plan.afterBirth.visitorsPreference);

  // interventions
  const ue = plan.interventions.unexpectedEvents;
  [ue.includeInAllDecisions, ue.partnerIncluded].forEach(bool);
  const mon = plan.interventions.continuousMonitoring;
  [mon.preferMobile, mon.useShowerBath].forEach(bool);
  const pl = plan.interventions.prolongedLabour;
  [pl.tryNaturalMethods, pl.offerMedication].forEach(bool);
  str(plan.interventions.assistedBirthPreference);
  str(plan.interventions.caesarianWishes);
  const sc = plan.interventions.specialCareForBaby;
  [sc.skinToSkinIfPossible, sc.helpExpressing, sc.involvedInCare].forEach(bool);

  str(plan.notes);

  return n;
}
