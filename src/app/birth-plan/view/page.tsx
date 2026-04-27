"use client";

import { useState, useEffect } from "react";
import { BirthPlan } from "@/types";
import { decodeBirthPlan } from "@/lib/birthPlanShare";
import { Heart, AlertCircle, Eye } from "lucide-react";

// ── Reusable display components ─────────────────────────────────────────────

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

function ViewSection({ title, children, isEmpty = false }: { title: string; children: React.ReactNode; isEmpty?: boolean }) {
  if (isEmpty) return null;
  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5 border-b border-stone-200 pb-1">{title}</h3>
      <div className="space-y-1 text-sm">{children}</div>
    </div>
  );
}

function ViewField({ label, value, fallback = "Not specified" }: { label: string; value: string; fallback?: string }) {
  return (
    <div>
      <span className="font-medium text-stone-600">{label}: </span>
      <PrintValue value={value} fallback={fallback} />
    </div>
  );
}

// ── Read-Only Birth Plan Renderer ───────────────────────────────────────────

function ReadOnlyBirthPlan({ plan }: { plan: BirthPlan }) {
  const pi = plan.personalInfo;
  const l = plan.labour;
  const ab = plan.afterBirth;
  const inv = plan.interventions;

  const hasPersonalInfo = !!(pi.legalName || pi.preferredName || pi.dueDate || pi.currentMedications || pi.allergies);
  const hasLabour = !!(l.birthPartner || l.doula || l.otherSupportPeople || l.labourGoal || l.atmosphereNotes ||
    l.photographyNotes || l.personalTouches || l.otherRequests || l.cordBloodTissueBankingNotes ||
    l.comfortMeasures.walking || l.comfortMeasures.labourBall || l.comfortMeasures.tub ||
    l.comfortMeasures.shower || l.comfortMeasures.heat || l.comfortMeasures.ice ||
    l.comfortMeasures.massage || l.comfortMeasures.tens || l.comfortMeasures.other ||
    l.pushingPreferences.varietyOfPositions || l.pushingPreferences.helpWithPushing ||
    l.pushingPreferences.selfDirected || l.pushingPreferences.other ||
    l.painMedication.onlyIfAsked || l.painMedication.offerIfNotCoping ||
    l.painMedication.offerAsSoonAsPossible || l.painMedication.nitrous ||
    l.painMedication.morphineFentanyl || l.painMedication.epidural || l.painMedication.other ||
    l.cordBloodBankDonation);
  const hasAfterBirth = !!(ab.skinToSkin || ab.cordCuttingPerson || ab.feedingPlan || ab.feedingNotes ||
    ab.newbornTreatments.antibioticEyeOintment || ab.newbornTreatments.vitaminKInjection ||
    ab.newbornTreatments.other || ab.placentaPreferences || ab.circumcisionPreferences || ab.visitorsPreference);
  const hasInterventions = !!(inv.unexpectedEvents.includeInAllDecisions || inv.unexpectedEvents.partnerIncluded ||
    inv.unexpectedEvents.other || inv.continuousMonitoring.preferMobile || inv.continuousMonitoring.useShowerBath ||
    inv.prolongedLabour.tryNaturalMethods || inv.prolongedLabour.offerMedication ||
    inv.assistedBirthPreference || inv.caesarianWishes ||
    inv.specialCareForBaby.skinToSkinIfPossible || inv.specialCareForBaby.helpExpressing ||
    inv.specialCareForBaby.involvedInCare || inv.specialCareForBaby.other);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 pb-4 border-b-2 border-stone-300">
        <div className="flex items-center gap-2 mb-2">
          <Heart size={20} className="text-rose-400" />
          <h1 className="text-2xl font-bold text-stone-800">Birth Plan</h1>
        </div>
        {pi.legalName && (
          <p className="text-lg text-stone-700">
            {pi.legalName}{pi.preferredName ? ` (${pi.preferredName})` : ""}
          </p>
        )}
        <div className="flex flex-wrap gap-4 mt-1 text-sm text-stone-500">
          {pi.dueDate && (
            <span>Due date: {new Date(pi.dueDate + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>
          )}
        </div>
      </div>

      {/* Read-only banner */}
      <div className="card p-3 mb-5 flex items-center gap-2 bg-blue-50 border-blue-100">
        <Eye size={14} className="text-blue-500 shrink-0" />
        <p className="text-xs text-blue-700">This is a read-only view of a shared birth plan.</p>
      </div>

      {/* Personal Information */}
      {hasPersonalInfo && (
        <div className="mb-5">
          <h2 className="text-base font-bold text-stone-800 uppercase tracking-wide mb-3 border-b-2 border-stone-300 pb-1">Personal Information</h2>
          <ViewSection title="Identity">
            <ViewField label="Legal Name" value={pi.legalName} />
            <ViewField label="Preferred Name" value={pi.preferredName} />
            {pi.dueDate && <ViewField label="Due Date" value={new Date(pi.dueDate + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} />}
          </ViewSection>
          <ViewSection title="Medical Information" isEmpty={!pi.currentMedications && !pi.allergies}>
            <ViewField label="Current Medications" value={pi.currentMedications} />
            <ViewField label="Allergies" value={pi.allergies} />
          </ViewSection>
        </div>
      )}

      {/* Labour & Birth */}
      {hasLabour && (
        <div className="mb-5">
          <h2 className="text-base font-bold text-stone-800 uppercase tracking-wide mb-3 border-b-2 border-stone-300 pb-1">Labour &amp; Birth</h2>

          <ViewSection title="Labour Goal" isEmpty={!l.labourGoal}>
            <ViewField label="Approach" value={l.labourGoal} />
          </ViewSection>

          <ViewSection title="Support People" isEmpty={!l.birthPartner && !l.doula && !l.otherSupportPeople}>
            {l.birthPartner && <ViewField label="Birth Partner" value={l.birthPartner} />}
            {l.doula && <ViewField label="Doula" value={l.doula} />}
            {l.otherSupportPeople && <ViewField label="Other Support" value={l.otherSupportPeople} />}
          </ViewSection>

          <ViewSection title="Room Atmosphere & Personal Touches" isEmpty={!l.atmosphereNotes && !l.photographyNotes && !l.personalTouches}>
            {l.atmosphereNotes && <ViewField label="Atmosphere" value={l.atmosphereNotes} />}
            {l.photographyNotes && <ViewField label="Photography" value={l.photographyNotes} />}
            {l.personalTouches && <ViewField label="Personal Touches" value={l.personalTouches} />}
          </ViewSection>

          <ViewSection title="Comfort Measures" isEmpty={
            !l.comfortMeasures.walking && !l.comfortMeasures.labourBall && !l.comfortMeasures.tub &&
            !l.comfortMeasures.shower && !l.comfortMeasures.heat && !l.comfortMeasures.ice &&
            !l.comfortMeasures.massage && !l.comfortMeasures.tens && !l.comfortMeasures.other
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
            </div>
            {l.comfortMeasures.other && <ViewField label="Other" value={l.comfortMeasures.other} />}
          </ViewSection>

          <ViewSection title="Pushing Preferences" isEmpty={
            !l.pushingPreferences.varietyOfPositions && !l.pushingPreferences.helpWithPushing &&
            !l.pushingPreferences.selfDirected && !l.pushingPreferences.other
          }>
            <PrintCheck checked={l.pushingPreferences.varietyOfPositions} label="Try a variety of pushing positions" />
            <PrintCheck checked={l.pushingPreferences.helpWithPushing} label="Have help or direction with pushing" />
            <PrintCheck checked={l.pushingPreferences.selfDirected} label="Self-directed pushing" />
            {l.pushingPreferences.other && <ViewField label="Other" value={l.pushingPreferences.other} />}
          </ViewSection>

          <ViewSection title="Pain Medication Preferences" isEmpty={
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
            {l.painMedication.other && <ViewField label="Other" value={l.painMedication.other} />}
          </ViewSection>

          <ViewSection title="Cord Blood" isEmpty={!l.cordBloodBankDonation && !l.cordBloodTissueBankingNotes}>
            {l.cordBloodBankDonation && <PrintCheck checked={true} label="Donate to the Canadian Cord Blood Bank" />}
            {l.cordBloodTissueBankingNotes && <ViewField label="Notes" value={l.cordBloodTissueBankingNotes} />}
          </ViewSection>

          <ViewSection title="Other Requests" isEmpty={!l.otherRequests}>
            <p className="text-stone-800">{l.otherRequests}</p>
          </ViewSection>
        </div>
      )}

      {/* After Birth */}
      {hasAfterBirth && (
        <div className="mb-5">
          <h2 className="text-base font-bold text-stone-800 uppercase tracking-wide mb-3 border-b-2 border-stone-300 pb-1">After Birth</h2>

          <ViewSection title="Immediately After Birth" isEmpty={!ab.skinToSkin && !ab.cordCuttingPerson}>
            {ab.skinToSkin && <PrintCheck checked={true} label="Skin-to-skin contact with baby right away" />}
            {ab.cordCuttingPerson && <ViewField label="Cord cutting" value={ab.cordCuttingPerson} />}
          </ViewSection>

          <ViewSection title="Feeding" isEmpty={!ab.feedingPlan && !ab.feedingNotes}>
            {ab.feedingPlan && <ViewField label="Feeding plan" value={ab.feedingPlan === "breastfeed" ? "Breastfeed" : ab.feedingPlan === "formula" ? "Formula" : "Other"} />}
            {ab.feedingNotes && <ViewField label="Notes" value={ab.feedingNotes} />}
          </ViewSection>

          <ViewSection title="Newborn Treatments" isEmpty={!ab.newbornTreatments.antibioticEyeOintment && !ab.newbornTreatments.vitaminKInjection && !ab.newbornTreatments.other}>
            <PrintCheck checked={ab.newbornTreatments.antibioticEyeOintment} label="Antibiotic eye ointment" />
            <PrintCheck checked={ab.newbornTreatments.vitaminKInjection} label="Vitamin K injection" />
            {ab.newbornTreatments.other && <ViewField label="Other" value={ab.newbornTreatments.other} />}
          </ViewSection>

          <ViewSection title="Circumcision & Other Procedures" isEmpty={!ab.circumcisionPreferences}>
            <p className="text-stone-800">{ab.circumcisionPreferences}</p>
          </ViewSection>

          <ViewSection title="Placenta" isEmpty={!ab.placentaPreferences}>
            <p className="text-stone-800">{ab.placentaPreferences}</p>
          </ViewSection>

          <ViewSection title="Visitors" isEmpty={!ab.visitorsPreference}>
            <p className="text-stone-800">{ab.visitorsPreference}</p>
          </ViewSection>
        </div>
      )}

      {/* Interventions */}
      {hasInterventions && (
        <div className="mb-5">
          <h2 className="text-base font-bold text-stone-800 uppercase tracking-wide mb-3 border-b-2 border-stone-300 pb-1">Interventions &amp; Unexpected Events</h2>

          <ViewSection title="If Unexpected Events Occur" isEmpty={!inv.unexpectedEvents.includeInAllDecisions && !inv.unexpectedEvents.partnerIncluded && !inv.unexpectedEvents.other}>
            {inv.unexpectedEvents.includeInAllDecisions && <PrintCheck checked={true} label="Include me in all decisions" />}
            {inv.unexpectedEvents.partnerIncluded && <PrintCheck checked={true} label="Include my partner in all decisions" />}
            {inv.unexpectedEvents.other && <ViewField label="Other" value={inv.unexpectedEvents.other} />}
          </ViewSection>

          <ViewSection title="If Continuous Monitoring is Needed" isEmpty={!inv.continuousMonitoring.preferMobile && !inv.continuousMonitoring.useShowerBath}>
            {inv.continuousMonitoring.preferMobile && <PrintCheck checked={true} label="I prefer to be mobile" />}
            {inv.continuousMonitoring.useShowerBath && <PrintCheck checked={true} label="I would like to use the shower or bath if possible" />}
          </ViewSection>

          <ViewSection title="If Labour is Prolonged" isEmpty={!inv.prolongedLabour.tryNaturalMethods && !inv.prolongedLabour.offerMedication}>
            {inv.prolongedLabour.tryNaturalMethods && <PrintCheck checked={true} label="Try natural methods as long as possible" />}
            {inv.prolongedLabour.offerMedication && <PrintCheck checked={true} label="Offer medication as soon as labour slows and it is safe" />}
          </ViewSection>

          <ViewSection title="Assisted Birth / Caesarian Wishes" isEmpty={!inv.assistedBirthPreference && !inv.caesarianWishes}>
            {inv.assistedBirthPreference && <p className="text-stone-800">{inv.assistedBirthPreference}</p>}
            {inv.caesarianWishes && <ViewField label="Caesarian wishes" value={inv.caesarianWishes} />}
          </ViewSection>

          <ViewSection title="If Baby Needs Special Care" isEmpty={
            !inv.specialCareForBaby.skinToSkinIfPossible && !inv.specialCareForBaby.helpExpressing &&
            !inv.specialCareForBaby.involvedInCare && !inv.specialCareForBaby.other
          }>
            {inv.specialCareForBaby.skinToSkinIfPossible && <PrintCheck checked={true} label="Skin-to-skin care if possible" />}
            {inv.specialCareForBaby.helpExpressing && <PrintCheck checked={true} label="Help to start expressing / pumping milk" />}
            {inv.specialCareForBaby.involvedInCare && <PrintCheck checked={true} label="Be involved in baby's care as much as possible" />}
            {inv.specialCareForBaby.other && <ViewField label="Other" value={inv.specialCareForBaby.other} />}
          </ViewSection>
        </div>
      )}

      {/* Notes */}
      {plan.notes && plan.notes.trim() && (
        <div className="mb-5">
          <h2 className="text-base font-bold text-stone-800 uppercase tracking-wide mb-3 border-b-2 border-stone-300 pb-1">Additional Notes</h2>
          <p className="text-sm text-stone-800 whitespace-pre-wrap">{plan.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-stone-200 text-center">
        <p className="text-xs text-stone-400">Shared via Operation Burrito</p>
      </div>
    </div>
  );
}

// ── Main View Page ──────────────────────────────────────────────────────────

export default function BirthPlanViewPage() {
  const [plan, setPlan] = useState<BirthPlan | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hash = window.location.hash.slice(1); // remove the '#'
    if (!hash) {
      setError(true);
      setLoading(false);
      return;
    }
    const decoded = decodeBirthPlan(hash);
    if (decoded) {
      setPlan(decoded);
    } else {
      setError(true);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-400 text-sm">Loading birth plan...</div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <AlertCircle size={48} className="text-stone-300 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-stone-800 mb-2">Invalid or Expired Link</h1>
          <p className="text-sm text-stone-500">
            This birth plan link is invalid or has been revoked. Please ask the owner to share a new link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-stone-200 p-6 md:p-8">
        <ReadOnlyBirthPlan plan={plan} />
      </div>
    </div>
  );
}
