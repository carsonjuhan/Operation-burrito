import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockStoreValue,
  createMockItem,
  createMockBagItem,
  createMockAppointment,
  createMockNote,
} from "@/test/mockStoreProvider";

// Mock next/link to render a plain anchor
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock useStoreContext
const mockStoreValue = createMockStoreValue();
vi.mock("@/contexts/StoreContext", () => ({
  useStoreContext: () => mockStoreValue,
}));

import DashboardPage from "@/app/page";

function setMockStore(overrides: Parameters<typeof createMockStoreValue>[0]) {
  Object.assign(mockStoreValue, createMockStoreValue(overrides));
}

describe("DashboardPage", () => {
  beforeEach(() => {
    Object.assign(mockStoreValue, createMockStoreValue());
  });

  it("renders the Dashboard heading", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Your baby prep command center.")).toBeInTheDocument();
  });

  it("shows due date countdown when birth plan has a due date", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    setMockStore({
      birthPlan: {
        ...createMockStoreValue().store.birthPlan,
        personalInfo: {
          ...createMockStoreValue().store.birthPlan.personalInfo,
          dueDate: futureDate.toISOString().split("T")[0],
        },
      },
    });
    render(<DashboardPage />);
    expect(screen.getByText(/until due date/)).toBeInTheDocument();
  });

  it("renders stat cards with correct item counts", () => {
    const purchasedItem = createMockItem({ purchased: true, name: "Purchased Item" });
    const unpurchasedItem = createMockItem({ purchased: false, name: "Unpurchased Item" });
    setMockStore({
      items: [purchasedItem, unpurchasedItem],
    });
    render(<DashboardPage />);
    expect(screen.getByText("Items Purchased")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("renders bag packed stat card", () => {
    const packedBag = createMockBagItem({ packed: true });
    const unpackedBag = createMockBagItem({ packed: false });
    setMockStore({
      hospitalBag: [packedBag, unpackedBag],
    });
    render(<DashboardPage />);
    expect(screen.getByText("Bag Packed")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("shows budget strip when items have estimated costs", () => {
    const item1 = createMockItem({ estimatedCost: 50, purchased: true, actualCost: 45 });
    const item2 = createMockItem({ estimatedCost: 100, purchased: false });
    setMockStore({ items: [item1, item2] });
    render(<DashboardPage />);
    expect(screen.getByText("Estimated Total")).toBeInTheDocument();
    expect(screen.getByText("Spent So Far")).toBeInTheDocument();
    expect(screen.getByText("Still Needed")).toBeInTheDocument();
  });

  it("shows must-have items that are not purchased", () => {
    const mustHave = createMockItem({ name: "Car Seat", priority: "Must Have", purchased: false });
    setMockStore({ items: [mustHave] });
    render(<DashboardPage />);
    expect(screen.getByText("Car Seat")).toBeInTheDocument();
  });

  it("shows upcoming appointments sorted by date", () => {
    const appt1 = createMockAppointment({ title: "Ultrasound", date: "2026-07-01", completed: false });
    const appt2 = createMockAppointment({ title: "OB Visit", date: "2026-06-15", completed: false });
    setMockStore({ appointments: [appt1, appt2] });
    render(<DashboardPage />);
    expect(screen.getByText("OB Visit")).toBeInTheDocument();
    expect(screen.getByText("Ultrasound")).toBeInTheDocument();
  });

  it("shows pinned notes", () => {
    const pinnedNote = createMockNote({ title: "Important Note", pinned: true });
    setMockStore({ notes: [pinnedNote] });
    render(<DashboardPage />);
    expect(screen.getByText("Important Note")).toBeInTheDocument();
  });

  it("handles empty store gracefully", () => {
    setMockStore({});
    render(<DashboardPage />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("All must-have items purchased!")).toBeInTheDocument();
    expect(screen.getByText("No upcoming appointments")).toBeInTheDocument();
    expect(screen.getByText("No pinned notes")).toBeInTheDocument();
  });

  it("shows loading state when not loaded", () => {
    Object.assign(mockStoreValue, createMockStoreValue({}, {}, { loaded: false }));
    render(<DashboardPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
