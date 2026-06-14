"use client";

import { useState, useCallback } from "react";
import { useStoreContext } from "@/contexts/StoreContext";
import { BirthPlan } from "@/types";
import { Save, CheckCircle2, Heart, FileDown, Share2, Copy, Check as CheckIcon, X } from "lucide-react";
import clsx from "clsx";
import { PageTransition } from "@/components/PageTransition";
import { generateShareUrl } from "@/lib/birthPlanShare";

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
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

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

  const handleShare = () => {
    const url = generateShareUrl(plan);
    setShareUrl(url);
    setCopied(false);
    setShareOpen(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Progress: count non-empty string fields + true booleans across all sections
  const filledFields = countFilled(plan);

  if (!loaded) return null;

  return (
    <PageTransition className="max-w-3xl mx-auto">
      {/* ── Screen-only interactive form ────────────────────────────────── */}
      <div className="print-hide">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-stone-800">Birth Plan</h1>
            <p className="text-sm text-stone-400 mt-1">
              {filledFields} fields filled
              {plan.updatedAt && (
                <> · Last updated {new Date(plan.updatedAt).toLocaleDateString()}</>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleShare} className="btn-secondary" aria-label="Share birth plan">
              <Share2 size={16} /> Share
            </button>
            <button onClick={() => window.print()} className="btn-secondary" aria-label="Export birth plan as PDF">
              <FileDown size={16} /> Export PDF
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
            then export as PDF and bring a copy for your care team.
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

        {/* Tab panels */}
        <div className={clsx(tab !== "personal" && "hidden")}>
          <PersonalTab plan={plan} patch={patch} />
        </div>
        <div className={clsx(tab !== "labour" && "hidden")}>
          <LabourTab plan={plan} patchLabour={patchLabour} />
        </div>
        <div className={clsx(tab !== "afterBirth" && "hidden")}>
          <AfterBirthTab plan={plan} patchAfterBirth={patchAfterBirth} />
        </div>
        <div className={clsx(tab !== "interventions" && "hidden")}>
          <InterventionsTab plan={plan} patchInterventions={patchInterventions} />
        </div>

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

      {/* ── Print-only clean view ───────────────────────────────────────── */}
      <BirthPlanPrintView plan={plan} />

      {/* ── Share Dialog ───────────────────────────────────────────────── */}
      {shareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShareOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Share birth plan"
        >
          <div
            className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                <Share2 size={18} className="text-sage-600" />
                Share Birth Plan
              </h2>
              <button
                onClick={() => setShareOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
                aria-label="Close share dialog"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-stone-500 mb-4">
              Anyone with this link can view a read-only copy of your birth plan. The data is encoded in the URL itself -- no server or account needed.
            </p>

            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="input flex-1 text-xs font-mono bg-stone-50"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopyLink}
                className="btn-primary shrink-0"
                aria-label="Copy share link"
              >
                {copied ? <><CheckIcon size={16} /> Copied!</> : <><Copy size={16} /> Copy</>}
              </button>
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-xs text-amber-700">
                To revoke this link, simply edit your birth plan and share a new link. The old link will show outdated data.
              </p>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
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
        <Field label="Care Provider (Midwife / OB / GP)">
          <input className="input" value={pi.careProvider} onChange={(e) => set({ careProvider: e.target.value })} placeholder="Name of your primary care provider" />
        </Field>
        <Field label="Birth Location">
          <input className="input" value={pi.birthLocation} onChange={(e) => set({ birthLocation: e.target.value })} placeholder="e.g. BC Women's Hospital, home birth…" />
        </Field>
        <Field label="Previous Pregnancies / Births">
          <input className="input" value={pi.previousBirths} onChange={(e) => set({ previousBirths: e.target.value })} placeholder="e.g. First baby, previous vaginal birth…" />
        </Field>
      </Section>
      <Section title="Language & Communication">
        <Field label="Preferred Language">
          <input className="input" value={pi.preferredLanguage} onChange={(e) => set({ preferredLanguage: e.target.value })} placeholder="e.g. English, Cantonese…" />
        </Field>
        <Check checked={pi.interpreterNeeded} onChange={(v) => set({ interpreterNeeded: v })} label="I need an interpreter" />
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
  const setLI = (changes: Partial<typeof l.labourInterventions>) =>
    patchLabour({ labourInterventions: { ...l.labourInterventions, ...changes } });

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
          <Check checked={l.comfortMeasures.aromatherapy} onChange={(v) => setCM({ aromatherapy: v })} label="Aromatherapy / essential oils" />
          <Check checked={l.comfortMeasures.breathingTechniques} onChange={(v) => setCM({ breathingTechniques: v })} label="Breathing / relaxation techniques" />
          <Check checked={l.comfortMeasures.acupressure} onChange={(v) => setCM({ acupressure: v })} label="Acupressure / acupuncture" />
          <Check checked={l.comfortMeasures.hypnobirthing} onChange={(v) => setCM({ hypnobirthing: v })} label="Hypnobirthing / hypnotherapy" />
          <Check checked={l.comfortMeasures.sterileWaterInjections} onChange={(v) => setCM({ sterileWaterInjections: v })} label="Sterile water injections" />
        </div>
        <Field label="Other comfort measures">
          <input className="input" value={l.comfortMeasures.other} onChange={(e) => setCM({ other: e.target.value })} placeholder="Other…" />
        </Field>
      </Section>

      <Section title="Birth Positions & Pushing">
        <p className="text-xs text-stone-500 mb-1">Positions I would like to try:</p>
        <div className="grid grid-cols-2 gap-2 pl-2">
          <Check checked={l.pushingPreferences.handsAndKnees} onChange={(v) => setPP({ handsAndKnees: v })} label="Hands and knees" />
          <Check checked={l.pushingPreferences.squatting} onChange={(v) => setPP({ squatting: v })} label="Squatting" />
          <Check checked={l.pushingPreferences.sideLying} onChange={(v) => setPP({ sideLying: v })} label="Side-lying" />
          <Check checked={l.pushingPreferences.supportedSquat} onChange={(v) => setPP({ supportedSquat: v })} label="Supported squat" />
          <Check checked={l.pushingPreferences.waterBirth} onChange={(v) => setPP({ waterBirth: v })} label="Water birth" />
          <Check checked={l.pushingPreferences.varietyOfPositions} onChange={(v) => setPP({ varietyOfPositions: v })} label="Variety of positions" />
        </div>
        <p className="text-xs text-stone-500 mt-2 mb-1">Pushing style:</p>
        <div className="pl-2 space-y-1">
          <Check checked={l.pushingPreferences.selfDirected} onChange={(v) => setPP({ selfDirected: v })} label="Self-directed (breathe baby down)" />
          <Check checked={l.pushingPreferences.helpWithPushing} onChange={(v) => setPP({ helpWithPushing: v })} label="Coached / directed pushing" />
        </div>
        <p className="text-xs text-stone-500 mt-2 mb-1">Perineal care:</p>
        <div className="pl-2 space-y-1">
          <Check checked={l.pushingPreferences.perinealWarmCompress} onChange={(v) => setPP({ perinealWarmCompress: v })} label="Warm compress" />
          <Check checked={l.pushingPreferences.perinealMassage} onChange={(v) => setPP({ perinealMassage: v })} label="Perineal massage" />
          <Check checked={l.pushingPreferences.perinealNoTouch} onChange={(v) => setPP({ perinealNoTouch: v })} label="No perineal touch" />
          <Check checked={l.pushingPreferences.noEpisiotomy} onChange={(v) => setPP({ noEpisiotomy: v })} label="Prefer no episiotomy unless medically necessary" />
        </div>
        <Field label="Other">
          <input className="input" value={l.pushingPreferences.other} onChange={(e) => setPP({ other: e.target.value })} placeholder="Other…" />
        </Field>
      </Section>

      <Section title="Labour Interventions">
        <p className="text-xs text-stone-500 mb-1">IV / fluids:</p>
        <div className="pl-2 space-y-1">
          <Check checked={l.labourInterventions.preferNoIV} onChange={(v) => setLI({ preferNoIV: v })} label="Prefer to avoid IV unless medically necessary" />
          <Check checked={l.labourInterventions.preferHepLock} onChange={(v) => setLI({ preferHepLock: v })} label="Hep-lock (IV access without continuous drip)" />
        </div>
        <Field label="Fetal monitoring preference">
          <div className="space-y-1 mt-1">
            {(["intermittent", "continuous", ""] as const).map((opt) => (
              <label key={opt || "none"} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fetalMonitoring"
                  value={opt}
                  checked={l.labourInterventions.fetalMonitoring === opt}
                  onChange={() => setLI({ fetalMonitoring: opt })}
                  className="border-stone-300 text-sage-600 focus:ring-sage-400"
                />
                <span className="text-sm text-stone-600">
                  {opt === "intermittent" ? "Intermittent auscultation (wireless)" : opt === "continuous" ? "Continuous EFM" : "No preference"}
                </span>
              </label>
            ))}
          </div>
        </Field>
        <div className="space-y-1 mt-1">
          <Check checked={l.labourInterventions.preferNoAmniotomy} onChange={(v) => setLI({ preferNoAmniotomy: v })} label="Prefer membranes not artificially ruptured (no amniotomy)" />
          <Check checked={l.labourInterventions.preferNoOxytocin} onChange={(v) => setLI({ preferNoOxytocin: v })} label="Prefer to avoid Pitocin / oxytocin augmentation" />
        </div>
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
        <Check checked={ab.partnerSkinToSkinIfUnable} onChange={(v) => patchAfterBirth({ partnerSkinToSkinIfUnable: v })} label="If I'm unable, I'd like my partner to do skin-to-skin" />
        <Field label="Cord cutting — who would you like to cut the cord?">
          <input className="input" value={ab.cordCuttingPerson} onChange={(e) => patchAfterBirth({ cordCuttingPerson: e.target.value })} placeholder="e.g. Birth partner, midwife, I will decide at the time…" />
        </Field>
        <Field label="Delayed cord clamping">
          <div className="space-y-1 mt-1">
            {([
              { v: "untilPulsationStops", label: "Until cord stops pulsating" },
              { v: "timed", label: "Timed delay (ask care team)" },
              { v: "", label: "No preference" },
            ] as const).map(({ v, label }) => (
              <label key={v || "none"} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="cordClampingDuration"
                  value={v}
                  checked={ab.cordClampingDuration === v}
                  onChange={() => patchAfterBirth({ cordClampingDuration: v })}
                  className="border-stone-300 text-sage-600 focus:ring-sage-400"
                />
                <span className="text-sm text-stone-600">{label}</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="Third stage (placenta delivery)">
          <div className="space-y-1 mt-1">
            {([
              { v: "active", label: "Active management (oxytocin injection)" },
              { v: "physiological", label: "Physiological / expectant (no medication)" },
              { v: "", label: "No preference / discuss with care team" },
            ] as const).map(({ v, label }) => (
              <label key={v || "none"} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="thirdStageManagement"
                  value={v}
                  checked={ab.thirdStageManagement === v}
                  onChange={() => patchAfterBirth({ thirdStageManagement: v })}
                  className="border-stone-300 text-sage-600 focus:ring-sage-400"
                />
                <span className="text-sm text-stone-600">{label}</span>
              </label>
            ))}
          </div>
        </Field>
      </Section>

      <Section title="Feeding">
        <p className="text-xs text-stone-500 mb-2">How are you planning to feed baby?</p>
        {(["breastfeed", "formula", "combination", "other"] as const).map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="feedingPlan"
              value={opt}
              checked={ab.feedingPlan === opt}
              onChange={() => patchAfterBirth({ feedingPlan: opt })}
              className="border-stone-300 text-sage-600 focus:ring-sage-400"
            />
            <span className="text-sm text-stone-600">
              {opt === "breastfeed" ? "Breastfeed" : opt === "formula" ? "Formula" : opt === "combination" ? "Combination (breast + formula)" : "Other"}
            </span>
          </label>
        ))}
        <Field label="Feeding notes">
          <textarea className="textarea" rows={2} value={ab.feedingNotes} onChange={(e) => patchAfterBirth({ feedingNotes: e.target.value })} placeholder="Lactation consultant requested, no formula without asking…" />
        </Field>
        <Field label="Pacifier / soother">
          <div className="space-y-1 mt-1">
            {([
              { v: "offer", label: "Please offer a soother" },
              { v: "doNotOffer", label: "Please do not offer a soother" },
              { v: "", label: "No preference" },
            ] as const).map(({ v, label }) => (
              <label key={v || "none"} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="pacifierPreference"
                  value={v}
                  checked={ab.pacifierPreference === v}
                  onChange={() => patchAfterBirth({ pacifierPreference: v })}
                  className="border-stone-300 text-sage-600 focus:ring-sage-400"
                />
                <span className="text-sm text-stone-600">{label}</span>
              </label>
            ))}
          </div>
        </Field>
      </Section>

      <Section title="Newborn Treatments">
        <p className="text-xs text-stone-500 mb-1">I would like my baby to have:</p>
        <Check checked={ab.newbornTreatments.antibioticEyeOintment} onChange={(v) => setNT({ antibioticEyeOintment: v })} label="Antibiotic eye ointment" />
        <Check checked={ab.newbornTreatments.vitaminKInjection} onChange={(v) => setNT({ vitaminKInjection: v })} label="Vitamin K injection" />
        <Check checked={ab.newbornTreatments.hepatitisBVaccine} onChange={(v) => setNT({ hepatitisBVaccine: v })} label="Hepatitis B vaccine" />
        <Check checked={ab.newbornTreatments.hearingScreening} onChange={(v) => setNT({ hearingScreening: v })} label="Newborn hearing screening" />
        <Check checked={ab.newbornTreatments.pkuBloodSpot} onChange={(v) => setNT({ pkuBloodSpot: v })} label="PKU / newborn blood spot screening" />
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

      <Section title="Blood Transfusion & Other Medical Preferences">
        <Field label="Blood transfusion preferences">
          <textarea className="textarea" rows={2} value={inv.bloodTransfusionPreferences} onChange={(e) => patchInterventions({ bloodTransfusionPreferences: e.target.value })} placeholder="e.g. No objection / religious or personal reasons to decline…" />
        </Field>
      </Section>

      <Section title="Students & Observers">
        <Check checked={inv.studentsObservers} onChange={(v) => patchInterventions({ studentsObservers: v })} label="Medical students / residents are welcome to observe or participate in my care" />
      </Section>
    </div>
  );
}

// ── Print View ───────────────────────────────────────────────────────────

function PrintValue({ value, fallback = "Not specified" }: { value: string; fallback?: string }) {
  return <span className={value.trim() ? "text-stone-800" : "text-stone-400 italic"}>{value.trim() || fallback}</span>;
}

function PrintCheck({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={checked ? "text-sage-600" : "text-stone-300"}>{checked ? "\u2713" : "\u2717"}</span>
      <span className={checked ? "text-stone-800" : "text-stone-400"}>{label}</span>
    </div>
  );
}

function PrintSection({ title, children, isEmpty = false }: { title: string; children: React.ReactNode; isEmpty?: boolean }) {
  if (isEmpty) return null;
  return (
    <div className="print-view-section mb-4">
      <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5 border-b border-stone-200 pb-1">{title}</h3>
      <div className="space-y-1 text-sm">{children}</div>
    </div>
  );
}

function PrintField({ label, value, fallback = "Not specified" }: { label: string; value: string; fallback?: string }) {
  return (
    <div>
      <span className="font-medium text-stone-600">{label}: </span>
      <PrintValue value={value} fallback={fallback} />
    </div>
  );
}

function BirthPlanPrintView({ plan }: { plan: BirthPlan }) {
  const pi = plan.personalInfo;
  const l = plan.labour;
  const ab = plan.afterBirth;
  const inv = plan.interventions;

  const hasPersonalInfo = !!(pi.legalName || pi.preferredName || pi.dueDate || pi.careProvider || pi.birthLocation || pi.previousBirths || pi.preferredLanguage || pi.interpreterNeeded || pi.currentMedications || pi.allergies);
  const hasLabour = !!(l.birthPartner || l.doula || l.otherSupportPeople || l.labourGoal || l.atmosphereNotes ||
    l.photographyNotes || l.personalTouches || l.otherRequests || l.cordBloodTissueBankingNotes ||
    l.comfortMeasures.walking || l.comfortMeasures.labourBall || l.comfortMeasures.tub ||
    l.comfortMeasures.shower || l.comfortMeasures.heat || l.comfortMeasures.ice ||
    l.comfortMeasures.massage || l.comfortMeasures.tens || l.comfortMeasures.aromatherapy ||
    l.comfortMeasures.breathingTechniques || l.comfortMeasures.acupressure ||
    l.comfortMeasures.hypnobirthing || l.comfortMeasures.sterileWaterInjections || l.comfortMeasures.other ||
    l.pushingPreferences.varietyOfPositions || l.pushingPreferences.helpWithPushing ||
    l.pushingPreferences.selfDirected || l.pushingPreferences.handsAndKnees ||
    l.pushingPreferences.squatting || l.pushingPreferences.sideLying ||
    l.pushingPreferences.supportedSquat || l.pushingPreferences.waterBirth ||
    l.pushingPreferences.perinealWarmCompress || l.pushingPreferences.perinealMassage ||
    l.pushingPreferences.perinealNoTouch || l.pushingPreferences.noEpisiotomy || l.pushingPreferences.other ||
    l.painMedication.onlyIfAsked || l.painMedication.offerIfNotCoping ||
    l.painMedication.offerAsSoonAsPossible || l.painMedication.nitrous ||
    l.painMedication.morphineFentanyl || l.painMedication.epidural || l.painMedication.other ||
    l.labourInterventions.preferNoIV || l.labourInterventions.preferHepLock ||
    l.labourInterventions.fetalMonitoring || l.labourInterventions.preferNoAmniotomy ||
    l.labourInterventions.preferNoOxytocin ||
    l.cordBloodBankDonation);
  const hasAfterBirth = !!(ab.skinToSkin || ab.partnerSkinToSkinIfUnable || ab.cordCuttingPerson ||
    ab.cordClampingDuration || ab.thirdStageManagement || ab.feedingPlan || ab.feedingNotes ||
    ab.pacifierPreference || ab.newbornTreatments.antibioticEyeOintment || ab.newbornTreatments.vitaminKInjection ||
    ab.newbornTreatments.hearingScreening || ab.newbornTreatments.pkuBloodSpot ||
    ab.newbornTreatments.hepatitisBVaccine || ab.newbornTreatments.other ||
    ab.placentaPreferences || ab.circumcisionPreferences || ab.visitorsPreference);
  const hasInterventions = !!(inv.unexpectedEvents.includeInAllDecisions || inv.unexpectedEvents.partnerIncluded ||
    inv.unexpectedEvents.other || inv.continuousMonitoring.preferMobile || inv.continuousMonitoring.useShowerBath ||
    inv.prolongedLabour.tryNaturalMethods || inv.prolongedLabour.offerMedication ||
    inv.assistedBirthPreference || inv.caesarianWishes ||
    inv.specialCareForBaby.skinToSkinIfPossible || inv.specialCareForBaby.helpExpressing ||
    inv.specialCareForBaby.involvedInCare || inv.specialCareForBaby.other ||
    inv.bloodTransfusionPreferences || inv.studentsObservers);

  return (
    <div className="hidden print:block birth-plan-print-view">
      {/* Print Header */}
      <div className="mb-6 pb-4 border-b-2 border-stone-800">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-stone-900">Birth Plan</h1>
        {pi.legalName && (
          <p className="text-lg mt-1 text-stone-800">
            {pi.legalName}{pi.preferredName ? ` (${pi.preferredName})` : ""}
          </p>
        )}
        <div className="flex gap-4 mt-1 text-sm text-stone-500">
          {pi.dueDate && (
            <span>Due date: {new Date(pi.dueDate + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>
          )}
          <span>Generated: {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
      </div>

      {/* Personal Information */}
      {hasPersonalInfo && (
        <div className="mb-5">
          <h2 className="text-base font-bold text-stone-800 uppercase tracking-wide mb-3 border-b-2 border-stone-300 pb-1">Personal Information</h2>
          <PrintSection title="Identity">
            <PrintField label="Legal Name" value={pi.legalName} />
            <PrintField label="Preferred Name" value={pi.preferredName} />
            {pi.dueDate && <PrintField label="Due Date" value={new Date(pi.dueDate + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} />}
            {pi.careProvider && <PrintField label="Care Provider" value={pi.careProvider} />}
            {pi.birthLocation && <PrintField label="Birth Location" value={pi.birthLocation} />}
            {pi.previousBirths && <PrintField label="Previous Births" value={pi.previousBirths} />}
          </PrintSection>
          <PrintSection title="Language & Communication" isEmpty={!pi.preferredLanguage && !pi.interpreterNeeded}>
            {pi.preferredLanguage && <PrintField label="Preferred Language" value={pi.preferredLanguage} />}
            {pi.interpreterNeeded && <PrintCheck checked={true} label="Interpreter needed" />}
          </PrintSection>
          <PrintSection title="Medical Information" isEmpty={!pi.currentMedications && !pi.allergies}>
            <PrintField label="Current Medications" value={pi.currentMedications} />
            <PrintField label="Allergies" value={pi.allergies} />
          </PrintSection>
        </div>
      )}

      {/* Labour & Birth */}
      {hasLabour && (
        <div className="mb-5">
          <h2 className="text-base font-bold text-stone-800 uppercase tracking-wide mb-3 border-b-2 border-stone-300 pb-1">Labour &amp; Birth</h2>

          <PrintSection title="Labour Goal" isEmpty={!l.labourGoal}>
            <PrintField label="Approach" value={l.labourGoal} />
          </PrintSection>

          <PrintSection title="Support People" isEmpty={!l.birthPartner && !l.doula && !l.otherSupportPeople}>
            {l.birthPartner && <PrintField label="Birth Partner" value={l.birthPartner} />}
            {l.doula && <PrintField label="Doula" value={l.doula} />}
            {l.otherSupportPeople && <PrintField label="Other Support" value={l.otherSupportPeople} />}
          </PrintSection>

          <PrintSection title="Room Atmosphere & Personal Touches" isEmpty={!l.atmosphereNotes && !l.photographyNotes && !l.personalTouches}>
            {l.atmosphereNotes && <PrintField label="Atmosphere" value={l.atmosphereNotes} />}
            {l.photographyNotes && <PrintField label="Photography" value={l.photographyNotes} />}
            {l.personalTouches && <PrintField label="Personal Touches" value={l.personalTouches} />}
          </PrintSection>

          <PrintSection title="Comfort Measures" isEmpty={
            !l.comfortMeasures.walking && !l.comfortMeasures.labourBall && !l.comfortMeasures.tub &&
            !l.comfortMeasures.shower && !l.comfortMeasures.heat && !l.comfortMeasures.ice &&
            !l.comfortMeasures.massage && !l.comfortMeasures.tens && !l.comfortMeasures.aromatherapy &&
            !l.comfortMeasures.breathingTechniques && !l.comfortMeasures.acupressure &&
            !l.comfortMeasures.hypnobirthing && !l.comfortMeasures.sterileWaterInjections && !l.comfortMeasures.other
          }>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <PrintCheck checked={l.comfortMeasures.walking} label="Walking, rocking, leaning" />
              <PrintCheck checked={l.comfortMeasures.labourBall} label="Labour ball" />
              <PrintCheck checked={l.comfortMeasures.tub} label="Tub / hydrotherapy" />
              <PrintCheck checked={l.comfortMeasures.shower} label="Shower" />
              <PrintCheck checked={l.comfortMeasures.heat} label="Heat" />
              <PrintCheck checked={l.comfortMeasures.ice} label="Ice" />
              <PrintCheck checked={l.comfortMeasures.massage} label="Massage" />
              <PrintCheck checked={l.comfortMeasures.tens} label="TENS machine" />
              <PrintCheck checked={l.comfortMeasures.aromatherapy} label="Aromatherapy / essential oils" />
              <PrintCheck checked={l.comfortMeasures.breathingTechniques} label="Breathing / relaxation techniques" />
              <PrintCheck checked={l.comfortMeasures.acupressure} label="Acupressure / acupuncture" />
              <PrintCheck checked={l.comfortMeasures.hypnobirthing} label="Hypnobirthing / hypnotherapy" />
              <PrintCheck checked={l.comfortMeasures.sterileWaterInjections} label="Sterile water injections" />
            </div>
            {l.comfortMeasures.other && <PrintField label="Other" value={l.comfortMeasures.other} />}
          </PrintSection>

          <PrintSection title="Birth Positions & Pushing" isEmpty={
            !l.pushingPreferences.varietyOfPositions && !l.pushingPreferences.helpWithPushing &&
            !l.pushingPreferences.selfDirected && !l.pushingPreferences.handsAndKnees &&
            !l.pushingPreferences.squatting && !l.pushingPreferences.sideLying &&
            !l.pushingPreferences.supportedSquat && !l.pushingPreferences.waterBirth &&
            !l.pushingPreferences.perinealWarmCompress && !l.pushingPreferences.perinealMassage &&
            !l.pushingPreferences.perinealNoTouch && !l.pushingPreferences.noEpisiotomy && !l.pushingPreferences.other
          }>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <PrintCheck checked={l.pushingPreferences.handsAndKnees} label="Hands and knees" />
              <PrintCheck checked={l.pushingPreferences.squatting} label="Squatting" />
              <PrintCheck checked={l.pushingPreferences.sideLying} label="Side-lying" />
              <PrintCheck checked={l.pushingPreferences.supportedSquat} label="Supported squat" />
              <PrintCheck checked={l.pushingPreferences.waterBirth} label="Water birth" />
              <PrintCheck checked={l.pushingPreferences.varietyOfPositions} label="Variety of positions" />
              <PrintCheck checked={l.pushingPreferences.selfDirected} label="Self-directed pushing" />
              <PrintCheck checked={l.pushingPreferences.helpWithPushing} label="Coached pushing" />
              <PrintCheck checked={l.pushingPreferences.perinealWarmCompress} label="Perineal warm compress" />
              <PrintCheck checked={l.pushingPreferences.perinealMassage} label="Perineal massage" />
              <PrintCheck checked={l.pushingPreferences.perinealNoTouch} label="No perineal touch" />
              <PrintCheck checked={l.pushingPreferences.noEpisiotomy} label="No episiotomy unless necessary" />
            </div>
            {l.pushingPreferences.other && <PrintField label="Other" value={l.pushingPreferences.other} />}
          </PrintSection>

          <PrintSection title="Labour Interventions" isEmpty={
            !l.labourInterventions.preferNoIV && !l.labourInterventions.preferHepLock &&
            !l.labourInterventions.fetalMonitoring && !l.labourInterventions.preferNoAmniotomy &&
            !l.labourInterventions.preferNoOxytocin
          }>
            {l.labourInterventions.preferNoIV && <PrintCheck checked={true} label="Prefer to avoid IV unless medically necessary" />}
            {l.labourInterventions.preferHepLock && <PrintCheck checked={true} label="Prefer hep-lock (IV access without continuous drip)" />}
            {l.labourInterventions.fetalMonitoring && (
              <PrintField label="Fetal monitoring" value={l.labourInterventions.fetalMonitoring === "intermittent" ? "Intermittent auscultation" : "Continuous EFM"} />
            )}
            {l.labourInterventions.preferNoAmniotomy && <PrintCheck checked={true} label="Prefer membranes not artificially ruptured" />}
            {l.labourInterventions.preferNoOxytocin && <PrintCheck checked={true} label="Prefer to avoid Pitocin / oxytocin augmentation" />}
          </PrintSection>

          <PrintSection title="Pain Medication Preferences" isEmpty={
            !l.painMedication.onlyIfAsked && !l.painMedication.offerIfNotCoping &&
            !l.painMedication.offerAsSoonAsPossible && !l.painMedication.nitrous &&
            !l.painMedication.morphineFentanyl && !l.painMedication.epidural && !l.painMedication.other
          }>
            {l.painMedication.onlyIfAsked && <PrintCheck checked={true} label="Only if I ask -- do not offer" />}
            {l.painMedication.offerIfNotCoping && <PrintCheck checked={true} label="Offer if I appear not to be coping" />}
            {l.painMedication.offerAsSoonAsPossible && <PrintCheck checked={true} label="Offer as soon as possible" />}
            {(l.painMedication.nitrous || l.painMedication.morphineFentanyl || l.painMedication.epidural) && (
              <div className="mt-1">
                <span className="font-medium text-stone-600">Options to consider: </span>
                {[
                  l.painMedication.nitrous && "Nitrous oxide",
                  l.painMedication.morphineFentanyl && "Morphine / fentanyl",
                  l.painMedication.epidural && "Epidural",
                ].filter(Boolean).join(", ")}
              </div>
            )}
            {l.painMedication.other && <PrintField label="Other" value={l.painMedication.other} />}
          </PrintSection>

          <PrintSection title="Cord Blood" isEmpty={!l.cordBloodBankDonation && !l.cordBloodTissueBankingNotes}>
            {l.cordBloodBankDonation && <PrintCheck checked={true} label="Donate to the Canadian Cord Blood Bank" />}
            {l.cordBloodTissueBankingNotes && <PrintField label="Notes" value={l.cordBloodTissueBankingNotes} />}
          </PrintSection>

          <PrintSection title="Other Requests" isEmpty={!l.otherRequests}>
            <p className="text-stone-800">{l.otherRequests}</p>
          </PrintSection>
        </div>
      )}

      {/* After Birth */}
      {hasAfterBirth && (
        <div className="mb-5">
          <h2 className="text-base font-bold text-stone-800 uppercase tracking-wide mb-3 border-b-2 border-stone-300 pb-1">After Birth</h2>

          <PrintSection title="Immediately After Birth" isEmpty={!ab.skinToSkin && !ab.partnerSkinToSkinIfUnable && !ab.cordCuttingPerson && !ab.cordClampingDuration && !ab.thirdStageManagement}>
            {ab.skinToSkin && <PrintCheck checked={true} label="Skin-to-skin contact with baby right away" />}
            {ab.partnerSkinToSkinIfUnable && <PrintCheck checked={true} label="Partner to do skin-to-skin if I am unable" />}
            {ab.cordCuttingPerson && <PrintField label="Cord cutting" value={ab.cordCuttingPerson} />}
            {ab.cordClampingDuration && <PrintField label="Delayed cord clamping" value={ab.cordClampingDuration === "untilPulsationStops" ? "Until cord stops pulsating" : "Timed delay"} />}
            {ab.thirdStageManagement && <PrintField label="Third stage (placenta)" value={ab.thirdStageManagement === "active" ? "Active management (oxytocin)" : "Physiological / expectant (no medication)"} />}
          </PrintSection>

          <PrintSection title="Feeding" isEmpty={!ab.feedingPlan && !ab.feedingNotes && !ab.pacifierPreference}>
            {ab.feedingPlan && <PrintField label="Feeding plan" value={ab.feedingPlan === "breastfeed" ? "Breastfeed" : ab.feedingPlan === "formula" ? "Formula" : ab.feedingPlan === "combination" ? "Combination (breast + formula)" : "Other"} />}
            {ab.feedingNotes && <PrintField label="Notes" value={ab.feedingNotes} />}
            {ab.pacifierPreference && <PrintField label="Pacifier / soother" value={ab.pacifierPreference === "offer" ? "Please offer a soother" : "Please do not offer a soother"} />}
          </PrintSection>

          <PrintSection title="Newborn Treatments" isEmpty={
            !ab.newbornTreatments.antibioticEyeOintment && !ab.newbornTreatments.vitaminKInjection &&
            !ab.newbornTreatments.hearingScreening && !ab.newbornTreatments.pkuBloodSpot &&
            !ab.newbornTreatments.hepatitisBVaccine && !ab.newbornTreatments.other
          }>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <PrintCheck checked={ab.newbornTreatments.antibioticEyeOintment} label="Antibiotic eye ointment" />
              <PrintCheck checked={ab.newbornTreatments.vitaminKInjection} label="Vitamin K injection" />
              <PrintCheck checked={ab.newbornTreatments.hepatitisBVaccine} label="Hepatitis B vaccine" />
              <PrintCheck checked={ab.newbornTreatments.hearingScreening} label="Newborn hearing screening" />
              <PrintCheck checked={ab.newbornTreatments.pkuBloodSpot} label="PKU / blood spot screening" />
            </div>
            {ab.newbornTreatments.other && <PrintField label="Other" value={ab.newbornTreatments.other} />}
          </PrintSection>

          <PrintSection title="Circumcision & Other Procedures" isEmpty={!ab.circumcisionPreferences}>
            <p className="text-stone-800">{ab.circumcisionPreferences}</p>
          </PrintSection>

          <PrintSection title="Placenta" isEmpty={!ab.placentaPreferences}>
            <p className="text-stone-800">{ab.placentaPreferences}</p>
          </PrintSection>

          <PrintSection title="Visitors" isEmpty={!ab.visitorsPreference}>
            <p className="text-stone-800">{ab.visitorsPreference}</p>
          </PrintSection>
        </div>
      )}

      {/* Interventions */}
      {hasInterventions && (
        <div className="mb-5">
          <h2 className="text-base font-bold text-stone-800 uppercase tracking-wide mb-3 border-b-2 border-stone-300 pb-1">Interventions &amp; Unexpected Events</h2>

          <PrintSection title="If Unexpected Events Occur" isEmpty={!inv.unexpectedEvents.includeInAllDecisions && !inv.unexpectedEvents.partnerIncluded && !inv.unexpectedEvents.other}>
            {inv.unexpectedEvents.includeInAllDecisions && <PrintCheck checked={true} label="Include me in all decisions" />}
            {inv.unexpectedEvents.partnerIncluded && <PrintCheck checked={true} label="Include my partner in all decisions" />}
            {inv.unexpectedEvents.other && <PrintField label="Other" value={inv.unexpectedEvents.other} />}
          </PrintSection>

          <PrintSection title="If Continuous Monitoring is Needed" isEmpty={!inv.continuousMonitoring.preferMobile && !inv.continuousMonitoring.useShowerBath}>
            {inv.continuousMonitoring.preferMobile && <PrintCheck checked={true} label="I prefer to be mobile" />}
            {inv.continuousMonitoring.useShowerBath && <PrintCheck checked={true} label="I would like to use the shower or bath if possible" />}
          </PrintSection>

          <PrintSection title="If Labour is Prolonged" isEmpty={!inv.prolongedLabour.tryNaturalMethods && !inv.prolongedLabour.offerMedication}>
            {inv.prolongedLabour.tryNaturalMethods && <PrintCheck checked={true} label="Try natural methods as long as possible" />}
            {inv.prolongedLabour.offerMedication && <PrintCheck checked={true} label="Offer medication as soon as labour slows and it is safe" />}
          </PrintSection>

          <PrintSection title="Assisted Birth / Caesarian Wishes" isEmpty={!inv.assistedBirthPreference && !inv.caesarianWishes}>
            {inv.assistedBirthPreference && <p className="text-stone-800">{inv.assistedBirthPreference}</p>}
            {inv.caesarianWishes && <PrintField label="Caesarian wishes" value={inv.caesarianWishes} />}
          </PrintSection>

          <PrintSection title="If Baby Needs Special Care" isEmpty={
            !inv.specialCareForBaby.skinToSkinIfPossible && !inv.specialCareForBaby.helpExpressing &&
            !inv.specialCareForBaby.involvedInCare && !inv.specialCareForBaby.other
          }>
            {inv.specialCareForBaby.skinToSkinIfPossible && <PrintCheck checked={true} label="Skin-to-skin care if possible" />}
            {inv.specialCareForBaby.helpExpressing && <PrintCheck checked={true} label="Help to start expressing / pumping milk" />}
            {inv.specialCareForBaby.involvedInCare && <PrintCheck checked={true} label="Be involved in baby's care as much as possible" />}
            {inv.specialCareForBaby.other && <PrintField label="Other" value={inv.specialCareForBaby.other} />}
          </PrintSection>

          <PrintSection title="Blood Transfusion & Medical Preferences" isEmpty={!inv.bloodTransfusionPreferences}>
            <p className="text-stone-800">{inv.bloodTransfusionPreferences}</p>
          </PrintSection>

          <PrintSection title="Students & Observers" isEmpty={!inv.studentsObservers}>
            {inv.studentsObservers && <PrintCheck checked={true} label="Medical students / residents are welcome to observe or participate" />}
          </PrintSection>
        </div>
      )}

      {/* Notes */}
      {plan.notes.trim() && (
        <div className="mb-5">
          <h2 className="text-base font-bold text-stone-800 uppercase tracking-wide mb-3 border-b-2 border-stone-300 pb-1">Additional Notes</h2>
          <p className="text-sm text-stone-800 whitespace-pre-wrap">{plan.notes}</p>
        </div>
      )}

      {/* Print Footer */}
      <div className="birth-plan-print-footer">
        Generated by Operation Burrito
      </div>
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
  str(plan.personalInfo.careProvider);
  str(plan.personalInfo.birthLocation);
  str(plan.personalInfo.previousBirths);
  str(plan.personalInfo.preferredLanguage);
  bool(plan.personalInfo.interpreterNeeded);
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
  [cm.walking, cm.labourBall, cm.tub, cm.shower, cm.heat, cm.ice, cm.massage, cm.tens,
   cm.aromatherapy, cm.breathingTechniques, cm.acupressure, cm.hypnobirthing, cm.sterileWaterInjections].forEach(bool);
  const pp = plan.labour.pushingPreferences;
  [pp.varietyOfPositions, pp.helpWithPushing, pp.selfDirected, pp.handsAndKnees, pp.squatting,
   pp.sideLying, pp.supportedSquat, pp.waterBirth, pp.perinealWarmCompress, pp.perinealMassage,
   pp.perinealNoTouch, pp.noEpisiotomy].forEach(bool);
  const pm = plan.labour.painMedication;
  [pm.onlyIfAsked, pm.offerIfNotCoping, pm.offerAsSoonAsPossible, pm.nitrous, pm.morphineFentanyl, pm.epidural].forEach(bool);
  const li = plan.labour.labourInterventions;
  [li.preferNoIV, li.preferHepLock, li.preferNoAmniotomy, li.preferNoOxytocin].forEach(bool);
  if (li.fetalMonitoring) n++;
  bool(plan.labour.cordBloodBankDonation);

  // after birth
  bool(plan.afterBirth.skinToSkin);
  bool(plan.afterBirth.partnerSkinToSkinIfUnable);
  str(plan.afterBirth.cordCuttingPerson);
  if (plan.afterBirth.cordClampingDuration) n++;
  if (plan.afterBirth.thirdStageManagement) n++;
  if (plan.afterBirth.feedingPlan) n++;
  str(plan.afterBirth.feedingNotes);
  if (plan.afterBirth.pacifierPreference) n++;
  const nt = plan.afterBirth.newbornTreatments;
  [nt.antibioticEyeOintment, nt.vitaminKInjection, nt.hearingScreening, nt.pkuBloodSpot, nt.hepatitisBVaccine].forEach(bool);
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
  str(plan.interventions.bloodTransfusionPreferences);
  bool(plan.interventions.studentsObservers);

  str(plan.notes);

  return n;
}
