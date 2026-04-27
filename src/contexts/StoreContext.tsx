"use client";

import { createContext, useContext, ReactNode } from "react";
import { useStore } from "@/hooks/useStore";
import type {
  ItemsContextValue,
  ClassesContextValue,
  MaterialsContextValue,
  BirthPlanContextValue,
  NotesContextValue,
  HospitalBagContextValue,
  AppointmentsContextValue,
  ContactsContextValue,
  ContractionsContextValue,
  CoreContextValue,
} from "@/hooks/useStore";

// ── Domain-specific contexts (S-033) ──────────────────────────────────────
// Each context only triggers re-renders for components that consume it.

const ItemsContext = createContext<ItemsContextValue | null>(null);
const ClassesContext = createContext<ClassesContextValue | null>(null);
const MaterialsContext = createContext<MaterialsContextValue | null>(null);
const BirthPlanContext = createContext<BirthPlanContextValue | null>(null);
const NotesContext = createContext<NotesContextValue | null>(null);
const HospitalBagContext = createContext<HospitalBagContextValue | null>(null);
const AppointmentsContext = createContext<AppointmentsContextValue | null>(null);
const ContactsContext = createContext<ContactsContextValue | null>(null);
const ContractionsContext = createContext<ContractionsContextValue | null>(null);
const CoreContext = createContext<CoreContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: ReactNode }) {
  const storeHook = useStore();

  return (
    <CoreContext.Provider value={storeHook.coreValue}>
      <ItemsContext.Provider value={storeHook.itemsValue}>
        <ClassesContext.Provider value={storeHook.classesValue}>
          <MaterialsContext.Provider value={storeHook.materialsValue}>
            <BirthPlanContext.Provider value={storeHook.birthPlanValue}>
              <NotesContext.Provider value={storeHook.notesValue}>
                <HospitalBagContext.Provider value={storeHook.hospitalBagValue}>
                  <AppointmentsContext.Provider value={storeHook.appointmentsValue}>
                    <ContactsContext.Provider value={storeHook.contactsValue}>
                      <ContractionsContext.Provider value={storeHook.contractionsValue}>
                        {children}
                      </ContractionsContext.Provider>
                    </ContactsContext.Provider>
                  </AppointmentsContext.Provider>
                </HospitalBagContext.Provider>
              </NotesContext.Provider>
            </BirthPlanContext.Provider>
          </MaterialsContext.Provider>
        </ClassesContext.Provider>
      </ItemsContext.Provider>
    </CoreContext.Provider>
  );
}

// ── Domain-specific hooks ─────────────────────────────────────────────────

export function useItemsContext(): ItemsContextValue {
  const ctx = useContext(ItemsContext);
  if (!ctx) throw new Error("useItemsContext must be used within StoreProvider");
  return ctx;
}

export function useClassesContext(): ClassesContextValue {
  const ctx = useContext(ClassesContext);
  if (!ctx) throw new Error("useClassesContext must be used within StoreProvider");
  return ctx;
}

export function useMaterialsContext(): MaterialsContextValue {
  const ctx = useContext(MaterialsContext);
  if (!ctx) throw new Error("useMaterialsContext must be used within StoreProvider");
  return ctx;
}

export function useBirthPlanContext(): BirthPlanContextValue {
  const ctx = useContext(BirthPlanContext);
  if (!ctx) throw new Error("useBirthPlanContext must be used within StoreProvider");
  return ctx;
}

export function useNotesContext(): NotesContextValue {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotesContext must be used within StoreProvider");
  return ctx;
}

export function useHospitalBagContext(): HospitalBagContextValue {
  const ctx = useContext(HospitalBagContext);
  if (!ctx) throw new Error("useHospitalBagContext must be used within StoreProvider");
  return ctx;
}

export function useAppointmentsContext(): AppointmentsContextValue {
  const ctx = useContext(AppointmentsContext);
  if (!ctx) throw new Error("useAppointmentsContext must be used within StoreProvider");
  return ctx;
}

export function useContactsContext(): ContactsContextValue {
  const ctx = useContext(ContactsContext);
  if (!ctx) throw new Error("useContactsContext must be used within StoreProvider");
  return ctx;
}

export function useContractionsContext(): ContractionsContextValue {
  const ctx = useContext(ContractionsContext);
  if (!ctx) throw new Error("useContractionsContext must be used within StoreProvider");
  return ctx;
}

export function useCoreContext(): CoreContextValue {
  const ctx = useContext(CoreContext);
  if (!ctx) throw new Error("useCoreContext must be used within StoreProvider");
  return ctx;
}

// ── Backward-compatible hook ──────────────────────────────────────────────
// Composes all domain hooks into the original flat interface.
// Existing consumers can keep using useStoreContext() without changes.
// For performance gains, migrate to domain-specific hooks over time.

export function useStoreContext() {
  const core = useCoreContext();
  const items = useItemsContext();
  const classes = useClassesContext();
  const materials = useMaterialsContext();
  const birthPlan = useBirthPlanContext();
  const notes = useNotesContext();
  const hospitalBag = useHospitalBagContext();
  const appointments = useAppointmentsContext();
  const contacts = useContactsContext();
  const contractions = useContractionsContext();

  return {
    ...core,
    ...items,
    ...classes,
    ...materials,
    ...birthPlan,
    ...notes,
    ...hospitalBag,
    ...appointments,
    ...contacts,
    ...contractions,
  };
}
