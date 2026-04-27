import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockStoreValue } from "@/test/mockStoreProvider";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock gistSync module
const mockGetPAT = vi.fn(() => "");
const mockSetPAT = vi.fn();
const mockGetGistId = vi.fn(() => "");
const mockSetGistId = vi.fn();
const mockGetLastSynced = vi.fn(() => "");
const mockClearGistConfig = vi.fn();
const mockVerifyPAT = vi.fn();
const mockPushToGist = vi.fn();
const mockPullFromGist = vi.fn();

vi.mock("@/lib/gistSync", () => ({
  getPAT: () => mockGetPAT(),
  setPAT: (...args: any[]) => mockSetPAT(...args),
  getGistId: () => mockGetGistId(),
  setGistId: (...args: any[]) => mockSetGistId(...args),
  getLastSynced: () => mockGetLastSynced(),
  clearGistConfig: () => mockClearGistConfig(),
  verifyPAT: (...args: any[]) => mockVerifyPAT(...args),
  pushToGist: (...args: any[]) => mockPushToGist(...args),
  pullFromGist: (...args: any[]) => mockPullFromGist(...args),
}));

// Mock useStoreContext
const mockLoadFromExternal = vi.fn();
const mockUpdateRegistryUrl = vi.fn();
const mockStoreValue = createMockStoreValue(
  {},
  { loadFromExternal: mockLoadFromExternal, updateRegistryUrl: mockUpdateRegistryUrl }
);

vi.mock("@/contexts/StoreContext", () => ({
  useStoreContext: () => mockStoreValue,
}));

// Mock I18nContext for LanguageSelector
vi.mock("@/contexts/I18nContext", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "en",
    setLocale: vi.fn(),
    supportedLocales: [{ code: "en", label: "English" }],
  }),
}));

// Mock useActionHistory for ActionHistory component
vi.mock("@/hooks/useActionHistory", () => ({
  useActionHistory: () => ({
    history: [],
    recordAction: vi.fn(),
    revertTo: vi.fn(),
    clearHistory: vi.fn(),
  }),
}));

// Mock useNotifications for ReminderSettings
vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    supported: true,
    permission: "default",
    requestPermission: vi.fn(),
  }),
}));

import SettingsPage from "@/app/settings/page";

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPAT.mockReturnValue("");
    mockGetGistId.mockReturnValue("");
    mockGetLastSynced.mockReturnValue("");
    Object.assign(
      mockStoreValue,
      createMockStoreValue(
        {},
        { loadFromExternal: mockLoadFromExternal, updateRegistryUrl: mockUpdateRegistryUrl }
      )
    );
  });

  it("renders the Settings heading", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText(/Manage data backup and sync via GitHub Gist/)).toBeInTheDocument();
  });

  it("shows connect form when not connected (no PAT)", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Step 1 \u2014 Connect GitHub")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("ghp_xxxxxxxxxxxxxxxxxxxx")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
  });

  it("shows connected state when PAT is saved", () => {
    mockGetPAT.mockReturnValue("ghp_test123");
    mockGetGistId.mockReturnValue("abc123");
    mockGetLastSynced.mockReturnValue("2026-04-20T10:00:00Z");

    render(<SettingsPage />);
    expect(screen.getByText("GitHub Connected")).toBeInTheDocument();
    expect(screen.getByText(/Signed in as/)).toBeInTheDocument();
  });

  it("shows push/pull buttons when connected", () => {
    mockGetPAT.mockReturnValue("ghp_test123");
    mockGetGistId.mockReturnValue("abc123");

    render(<SettingsPage />);
    expect(screen.getByText("Push to GitHub")).toBeInTheDocument();
    expect(screen.getByText("Pull from GitHub")).toBeInTheDocument();
  });

  it("shows Gist ID when connected and has a gist", () => {
    mockGetPAT.mockReturnValue("ghp_test123");
    mockGetGistId.mockReturnValue("abc123def456");

    render(<SettingsPage />);
    expect(screen.getByText("abc123def456")).toBeInTheDocument();
    expect(screen.getByText("View on GitHub")).toBeInTheDocument();
  });

  it("shows disconnect button when connected", () => {
    mockGetPAT.mockReturnValue("ghp_test123");

    render(<SettingsPage />);
    expect(screen.getByText(/Disconnect/)).toBeInTheDocument();
  });

  it("renders Amazon Baby Registry section", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Amazon Baby Registry")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("https://www.amazon.ca/baby-reg/...")).toBeInTheDocument();
  });

  it("calls verifyPAT when connect button is clicked", async () => {
    const user = userEvent.setup();
    mockVerifyPAT.mockResolvedValue("testuser");

    render(<SettingsPage />);

    const patInput = screen.getByPlaceholderText("ghp_xxxxxxxxxxxxxxxxxxxx");
    await user.type(patInput, "ghp_newtoken");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    expect(mockVerifyPAT).toHaveBeenCalledWith("ghp_newtoken");
  });

  it("shows how it works info panel", () => {
    render(<SettingsPage />);
    expect(screen.getByText("How GitHub Gist sync works")).toBeInTheDocument();
  });
});
