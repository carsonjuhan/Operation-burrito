import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockStoreValue,
  createMockItem,
} from "@/test/mockStoreProvider";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock checklistData to avoid loading real data
vi.mock("@/lib/checklistData", () => ({
  CHECKLIST_ITEMS: [],
  TIMING_OPTIONS: ["Pregnancy", "Hospital (Pre-birth)", "Newborn (0-3 months)"],
  AMAZON_PURCHASED_ITEMS: [],
  MATCHED_CHECKLIST_IDS: new Set(),
  UNIQUE_INVENTORY_ITEMS: [],
  MATCH_LOG: [],
}));

// Mock useChecklistData hook to return data synchronously
vi.mock("@/hooks/useChecklistData", () => ({
  useChecklistData: () => ({
    data: {
      CHECKLIST_ITEMS: [],
      TIMING_OPTIONS: ["Pregnancy", "Hospital (Pre-birth)", "Newborn (0-3 months)"],
      AMAZON_PURCHASED_ITEMS: [],
      MATCHED_CHECKLIST_IDS: new Set(),
      UNIQUE_INVENTORY_ITEMS: [],
      MATCH_LOG: [],
    },
    loading: false,
  }),
}));

// Mock ToastContext for useUndoDelete
vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({
    addToast: vi.fn(),
    toasts: [],
    removeToast: vi.fn(),
  }),
}));

// Mock components that are heavy/irrelevant to test
vi.mock("@/components/ReceiptImportModal", () => ({
  ReceiptImportModal: () => null,
}));
vi.mock("@/components/CsvImportModal", () => ({
  CsvImportModal: () => null,
}));

// Mock useStoreContext
const mockActions = {
  addItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  restoreItem: vi.fn(),
  addBagItem: vi.fn(),
};
const mockStoreValue = createMockStoreValue({}, mockActions);

vi.mock("@/contexts/StoreContext", () => ({
  useStoreContext: () => mockStoreValue,
}));

import ItemsPage from "@/app/items/page";

function setMockStore(storeOverrides: Parameters<typeof createMockStoreValue>[0]) {
  const newValue = createMockStoreValue(storeOverrides, mockActions);
  Object.assign(mockStoreValue, newValue);
}

describe("ItemsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockStore({});
  });

  it("renders the page header", () => {
    render(<ItemsPage />);
    expect(screen.getByText("Baby Items & Checklist")).toBeInTheDocument();
  });

  it("opens add modal when Add Custom button is clicked", async () => {
    const user = userEvent.setup();
    render(<ItemsPage />);

    // The header button text includes "Add Custom" but not "item"
    const addButtons = screen.getAllByRole("button").filter(
      (btn) => btn.textContent?.includes("Add Custom") && !btn.textContent?.includes("item")
    );
    await user.click(addButtons[0]);

    // Modal title is in an h2
    expect(screen.getByRole("heading", { name: "Add Item" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Convertible car seat")).toBeInTheDocument();
  });

  it("calls addItem with correct payload when form is submitted", async () => {
    const user = userEvent.setup();
    render(<ItemsPage />);

    // Open modal - use header Add Custom button
    const addButtons = screen.getAllByRole("button", { name: /Add Custom/i });
    await user.click(addButtons[0]);

    // Fill in form
    const nameInput = screen.getByPlaceholderText("e.g. Convertible car seat");
    await user.type(nameInput, "Baby Monitor");

    const costInput = screen.getByPlaceholderText("0.00");
    await user.type(costInput, "59.99");

    // Submit
    await user.click(screen.getByRole("button", { name: "Add Item" }));

    expect(mockActions.addItem).toHaveBeenCalledTimes(1);
    expect(mockActions.addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Baby Monitor",
        category: "Nursery",
        priority: "Must Have",
        purchased: false,
        estimatedCost: 59.99,
      })
    );
  });

  it("calls deleteItem when delete button is clicked on a tracked item", async () => {
    const user = userEvent.setup();
    const testItem = createMockItem({
      id: "test-item-1",
      name: "Old Blanket",
      purchased: false,
    });
    setMockStore({ items: [testItem] });

    const { container } = render(<ItemsPage />);

    // The delete button has class containing "hover:text-red" and "hover:bg-red"
    const deleteBtn = container.querySelector('button[class*="hover:text-red"]');
    expect(deleteBtn).not.toBeNull();

    await user.click(deleteBtn!);
    expect(mockActions.deleteItem).toHaveBeenCalledWith("test-item-1");
  });

  it("renders tracked items in the list", () => {
    const item = createMockItem({ name: "Baby Crib", purchased: false });
    setMockStore({ items: [item] });

    render(<ItemsPage />);
    expect(screen.getByText("Baby Crib")).toBeInTheDocument();
  });

  it("shows empty state when no items match filters", () => {
    // With empty checklist (mocked) and empty items, switched to tracked view
    setMockStore({ items: [] });
    render(<ItemsPage />);

    // In "all" mode with empty checklist, should show empty state
    expect(screen.getByText(/No items match filters/)).toBeInTheDocument();
  });
});
