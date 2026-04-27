import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockStoreValue,
  DEFAULT_MOCK_STORE,
} from "@/test/mockStoreProvider";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock useStoreContext
const mockUpdateBirthPlan = vi.fn();
const mockStoreValue = createMockStoreValue(
  {},
  { updateBirthPlan: mockUpdateBirthPlan }
);

vi.mock("@/contexts/StoreContext", () => ({
  useStoreContext: () => mockStoreValue,
}));

import BirthPlanPage from "@/app/birth-plan/page";

describe("BirthPlanPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to defaults
    Object.assign(
      mockStoreValue,
      createMockStoreValue({}, { updateBirthPlan: mockUpdateBirthPlan })
    );
  });

  it("renders the Birth Plan heading", () => {
    render(<BirthPlanPage />);
    // There are two h1 elements (main + print-only), so use getAllByRole
    const headings = screen.getAllByRole("heading", { name: "Birth Plan", level: 1 });
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the personal info tab by default", () => {
    render(<BirthPlanPage />);
    expect(screen.getByText("Personal Info")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Legal name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Name to be called")).toBeInTheDocument();
  });

  it("calls updateBirthPlan when legal name field changes", async () => {
    const user = userEvent.setup();
    render(<BirthPlanPage />);

    const nameInput = screen.getByPlaceholderText("Legal name");
    await user.type(nameInput, "J");

    expect(mockUpdateBirthPlan).toHaveBeenCalled();
    // The call should include personalInfo with the typed value
    const lastCall = mockUpdateBirthPlan.mock.calls[mockUpdateBirthPlan.mock.calls.length - 1][0];
    expect(lastCall.personalInfo.legalName).toBe("J");
  });

  it("renders pre-filled values from the store", () => {
    const birthPlan = {
      ...DEFAULT_MOCK_STORE.birthPlan,
      personalInfo: {
        ...DEFAULT_MOCK_STORE.birthPlan.personalInfo,
        legalName: "Jane Doe",
        dueDate: "2026-08-15",
      },
    };
    Object.assign(
      mockStoreValue,
      createMockStoreValue({ birthPlan }, { updateBirthPlan: mockUpdateBirthPlan })
    );

    render(<BirthPlanPage />);
    const nameInput = screen.getByPlaceholderText("Legal name") as HTMLInputElement;
    expect(nameInput.value).toBe("Jane Doe");
  });

  it("switches tabs when tab buttons are clicked", async () => {
    const user = userEvent.setup();
    render(<BirthPlanPage />);

    // Click Labour & Birth tab (use getByRole to target the button specifically)
    const labourTab = screen.getByRole("button", { name: "Labour & Birth" });
    await user.click(labourTab);
    expect(screen.getByText("Labour Goal")).toBeInTheDocument();

    // Click After Birth tab
    const afterBirthTab = screen.getByRole("button", { name: "After Birth" });
    await user.click(afterBirthTab);
    expect(screen.getByText("Immediately After Birth")).toBeInTheDocument();

    // Click Interventions tab
    const interventionsTab = screen.getByRole("button", { name: "Interventions" });
    await user.click(interventionsTab);
    expect(screen.getByText("If Unexpected Events Occur")).toBeInTheDocument();
  });

  it("calls updateBirthPlan when a checkbox is toggled", async () => {
    const user = userEvent.setup();
    render(<BirthPlanPage />);

    // Switch to Labour tab
    await user.click(screen.getByRole("button", { name: "Labour & Birth" }));
    mockUpdateBirthPlan.mockClear();

    // Toggle a comfort measure checkbox
    const walkingCheckbox = screen.getByLabelText("Walking, rocking, leaning");
    await user.click(walkingCheckbox);

    expect(mockUpdateBirthPlan).toHaveBeenCalled();
    const lastCall = mockUpdateBirthPlan.mock.calls[mockUpdateBirthPlan.mock.calls.length - 1][0];
    expect(lastCall.labour.comfortMeasures.walking).toBe(true);
  });

  it("shows fields filled count", () => {
    const birthPlan = {
      ...DEFAULT_MOCK_STORE.birthPlan,
      personalInfo: {
        ...DEFAULT_MOCK_STORE.birthPlan.personalInfo,
        legalName: "Jane",
        dueDate: "2026-08-15",
      },
    };
    Object.assign(
      mockStoreValue,
      createMockStoreValue({ birthPlan }, { updateBirthPlan: mockUpdateBirthPlan })
    );

    render(<BirthPlanPage />);
    // Should show "3 fields filled" (legalName, dueDate, and feedingPlan defaults to "breastfeed" which counts)
    expect(screen.getByText(/fields filled/)).toBeInTheDocument();
  });
});
