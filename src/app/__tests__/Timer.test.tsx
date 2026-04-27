import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createMockStoreValue,
  createMockContraction,
} from "@/test/mockStoreProvider";
import { Contraction } from "@/types";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock useStoreContext
const mockAddContraction = vi.fn();
const mockClearContractions = vi.fn();
const mockStoreValue = createMockStoreValue(
  {},
  { addContraction: mockAddContraction, clearContractions: mockClearContractions }
);

vi.mock("@/contexts/StoreContext", () => ({
  useStoreContext: () => mockStoreValue,
}));

import TimerPage from "@/app/timer/page";

describe("TimerPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    Object.assign(
      mockStoreValue,
      createMockStoreValue(
        {},
        { addContraction: mockAddContraction, clearContractions: mockClearContractions }
      )
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the Contraction Timer heading", () => {
    render(<TimerPage />);
    expect(screen.getByText("Contraction Timer")).toBeInTheDocument();
  });

  it("shows Start button and Ready badge in idle state", () => {
    render(<TimerPage />);
    expect(screen.getByText("Start Contraction")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("shows empty state message when no contractions", () => {
    render(<TimerPage />);
    expect(screen.getByText("Press Start when a contraction begins")).toBeInTheDocument();
  });

  it("switches to timing state when Start is clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TimerPage />);

    await user.click(screen.getByText("Start Contraction"));

    expect(screen.getByText("Stop Contraction")).toBeInTheDocument();
    expect(screen.getByText("Contraction in progress")).toBeInTheDocument();
  });

  it("calls addContraction when Stop is clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TimerPage />);

    // Start
    await user.click(screen.getByText("Start Contraction"));

    // Advance time by 5 seconds
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // Stop
    await user.click(screen.getByText("Stop Contraction"));

    expect(mockAddContraction).toHaveBeenCalledTimes(1);
    const contraction = mockAddContraction.mock.calls[0][0];
    expect(contraction).toHaveProperty("startTime");
    expect(contraction).toHaveProperty("endTime");
    expect(contraction).toHaveProperty("duration");
    expect(contraction.duration).toBeGreaterThanOrEqual(4); // Allow some timing slack
  });

  it("shows Between contractions after stopping", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TimerPage />);

    await user.click(screen.getByText("Start Contraction"));
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    await user.click(screen.getByText("Stop Contraction"));

    expect(screen.getByText("Between contractions")).toBeInTheDocument();
    expect(screen.getByText("Start Contraction")).toBeInTheDocument();
  });

  it("shows contraction history table when contractions exist", () => {
    const c1 = createMockContraction({ duration: 65, interval: 0 });
    const c2 = createMockContraction({ duration: 70, interval: 300 });
    Object.assign(
      mockStoreValue,
      createMockStoreValue(
        { contractions: [c1, c2] },
        { addContraction: mockAddContraction, clearContractions: mockClearContractions }
      )
    );

    render(<TimerPage />);
    expect(screen.getByText("Recent Contractions")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("shows 5-1-1 rule alert when criteria are met", () => {
    // Create contractions that meet the 5-1-1 rule:
    // - 5 minutes apart or less
    // - 1 minute or more each
    // - spanning over 1 hour
    const baseTime = new Date("2026-04-21T10:00:00").getTime();
    const contractions: Contraction[] = [];

    // Create 15 contractions over ~70 minutes, each 5 min apart, each 65s long
    for (let i = 0; i < 15; i++) {
      const start = new Date(baseTime + i * 5 * 60 * 1000);
      const end = new Date(start.getTime() + 65 * 1000);
      contractions.push({
        id: `c-${i}`,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        duration: 65,
        interval: i === 0 ? 0 : 5 * 60,
      });
    }

    Object.assign(
      mockStoreValue,
      createMockStoreValue(
        { contractions },
        { addContraction: mockAddContraction, clearContractions: mockClearContractions }
      )
    );

    render(<TimerPage />);
    expect(screen.getByText("5-1-1 Rule Active")).toBeInTheDocument();
    expect(screen.getByText(/Time to call your provider/)).toBeInTheDocument();
  });

  it("does not show 5-1-1 alert with insufficient contractions", () => {
    const c1 = createMockContraction({ duration: 30, interval: 0 });
    Object.assign(
      mockStoreValue,
      createMockStoreValue(
        { contractions: [c1] },
        { addContraction: mockAddContraction, clearContractions: mockClearContractions }
      )
    );

    render(<TimerPage />);
    expect(screen.queryByText("5-1-1 Rule Active")).not.toBeInTheDocument();
  });
});
