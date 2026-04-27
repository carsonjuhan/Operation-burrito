import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  getMilestoneDate,
  isMilestoneComplete,
  MILESTONES,
  MilestoneTimeline,
  MilestoneCompletionData,
} from "@/components/MilestoneTimeline";

// Mock next/link to render as a plain anchor
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock lucide-react icons to simple spans
vi.mock("lucide-react", () => {
  function icon(name: string) {
    function MockIcon({ className }: { size?: number; className?: string }) {
      return <span data-testid={`icon-${name}`} className={className} />;
    }
    MockIcon.displayName = name;
    return MockIcon;
  }
  return {
    GraduationCap: icon("GraduationCap"),
    Briefcase: icon("Briefcase"),
    Car: icon("Car"),
    Package: icon("Package"),
    FileText: icon("FileText"),
    ClipboardCheck: icon("ClipboardCheck"),
    Baby: icon("Baby"),
    Check: icon("Check"),
  };
});

const defaultCompletionData: MilestoneCompletionData = {
  classesTotal: 0,
  classesDone: 0,
  bagTotal: 0,
  bagPacked: 0,
  birthPlanFilled: 0,
  birthPlanTotal: 20,
  carSeatPurchased: false,
  mustHaveRemaining: 5,
};

describe("getMilestoneDate", () => {
  it("returns the due date when weeksBefore is 0", () => {
    const result = getMilestoneDate("2026-08-15", 0);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(7); // August is 7
    expect(result.getDate()).toBe(15);
  });

  it("calculates 4 weeks before correctly", () => {
    const result = getMilestoneDate("2026-08-15", 4);
    // 4 weeks = 28 days before Aug 15 = July 18
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(6); // July
    expect(result.getDate()).toBe(18);
  });

  it("calculates 12 weeks before correctly", () => {
    const result = getMilestoneDate("2026-08-15", 12);
    // 12 weeks = 84 days before Aug 15 = May 23
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(4); // May
    expect(result.getDate()).toBe(23);
  });

  it("handles year boundaries", () => {
    const result = getMilestoneDate("2026-01-10", 8);
    // 8 weeks = 56 days before Jan 10 = Nov 15, 2025
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(10); // November
    expect(result.getDate()).toBe(15);
  });
});

describe("isMilestoneComplete", () => {
  const today = new Date("2026-07-01");
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date("2026-08-15");
  dueDate.setHours(0, 0, 0, 0);

  const findMilestone = (id: string) =>
    MILESTONES.find((m) => m.id === id)!;

  it("marks register-classes as complete when classes exist", () => {
    const data = { ...defaultCompletionData, classesTotal: 3, classesDone: 1 };
    expect(
      isMilestoneComplete(findMilestone("register-classes"), data, today, dueDate)
    ).toBe(true);
  });

  it("marks register-classes as incomplete when no classes", () => {
    expect(
      isMilestoneComplete(
        findMilestone("register-classes"),
        defaultCompletionData,
        today,
        dueDate
      )
    ).toBe(false);
  });

  it("marks start-hospital-bag as complete when bag items exist", () => {
    const data = { ...defaultCompletionData, bagTotal: 5, bagPacked: 2 };
    expect(
      isMilestoneComplete(findMilestone("start-hospital-bag"), data, today, dueDate)
    ).toBe(true);
  });

  it("marks install-car-seat as complete when purchased", () => {
    const data = { ...defaultCompletionData, carSeatPurchased: true };
    expect(
      isMilestoneComplete(findMilestone("install-car-seat"), data, today, dueDate)
    ).toBe(true);
  });

  it("marks pack-hospital-bag as complete when all items packed", () => {
    const data = { ...defaultCompletionData, bagTotal: 5, bagPacked: 5 };
    expect(
      isMilestoneComplete(findMilestone("pack-hospital-bag"), data, today, dueDate)
    ).toBe(true);
  });

  it("marks pack-hospital-bag as incomplete when not all packed", () => {
    const data = { ...defaultCompletionData, bagTotal: 5, bagPacked: 3 };
    expect(
      isMilestoneComplete(findMilestone("pack-hospital-bag"), data, today, dueDate)
    ).toBe(false);
  });

  it("marks finalize-birth-plan as complete at 80% fill", () => {
    const data = {
      ...defaultCompletionData,
      birthPlanFilled: 16,
      birthPlanTotal: 20,
    };
    expect(
      isMilestoneComplete(findMilestone("finalize-birth-plan"), data, today, dueDate)
    ).toBe(true);
  });

  it("marks finalize-birth-plan as incomplete below 80%", () => {
    const data = {
      ...defaultCompletionData,
      birthPlanFilled: 10,
      birthPlanTotal: 20,
    };
    expect(
      isMilestoneComplete(findMilestone("finalize-birth-plan"), data, today, dueDate)
    ).toBe(false);
  });

  it("marks final-check as complete when must-haves done and bag packed", () => {
    const data = {
      ...defaultCompletionData,
      mustHaveRemaining: 0,
      bagTotal: 5,
      bagPacked: 5,
    };
    expect(
      isMilestoneComplete(findMilestone("final-check"), data, today, dueDate)
    ).toBe(true);
  });

  it("marks due-date as complete when today is past due date", () => {
    const pastDue = new Date("2026-09-01");
    pastDue.setHours(0, 0, 0, 0);
    expect(
      isMilestoneComplete(findMilestone("due-date"), defaultCompletionData, pastDue, dueDate)
    ).toBe(true);
  });

  it("marks due-date as incomplete when today is before due date", () => {
    expect(
      isMilestoneComplete(findMilestone("due-date"), defaultCompletionData, today, dueDate)
    ).toBe(false);
  });
});

describe("MilestoneTimeline component", () => {
  it("renders the Preparation Timeline heading", () => {
    render(
      <MilestoneTimeline
        dueDate="2026-08-15"
        completionData={defaultCompletionData}
      />
    );
    expect(screen.getByText("Preparation Timeline")).toBeInTheDocument();
  });

  it("renders all milestone labels", () => {
    render(
      <MilestoneTimeline
        dueDate="2026-08-15"
        completionData={defaultCompletionData}
      />
    );
    // Each label appears twice (desktop + mobile)
    expect(screen.getAllByText("Register for classes")).toHaveLength(2);
    expect(screen.getAllByText("Start hospital bag")).toHaveLength(2);
    expect(screen.getAllByText("Install car seat")).toHaveLength(2);
    expect(screen.getAllByText("Pack hospital bag")).toHaveLength(2);
    expect(screen.getAllByText("Finalize birth plan")).toHaveLength(2);
    expect(screen.getAllByText("Final check")).toHaveLength(2);
    expect(screen.getAllByText("Due date")).toHaveLength(2);
  });

  it("renders milestone links pointing to correct pages", () => {
    render(
      <MilestoneTimeline
        dueDate="2026-08-15"
        completionData={defaultCompletionData}
      />
    );
    const classesLinks = screen.getAllByText("Register for classes");
    // Check the parent link element
    expect(classesLinks[0].closest("a")).toHaveAttribute("href", "/classes");
  });

  it("shows check icons for completed milestones", () => {
    const data: MilestoneCompletionData = {
      ...defaultCompletionData,
      classesTotal: 3,
      classesDone: 2,
      bagTotal: 5,
      bagPacked: 5,
    };
    render(
      <MilestoneTimeline dueDate="2026-08-15" completionData={data} />
    );
    // register-classes, start-hospital-bag, and pack-hospital-bag should be complete
    // Check icons should be present for completed milestones
    const checkIcons = screen.getAllByTestId("icon-Check");
    // 3 completed milestones x 2 layouts (desktop + mobile) = 6
    expect(checkIcons.length).toBe(6);
  });

  it("displays formatted dates for milestones", () => {
    render(
      <MilestoneTimeline
        dueDate="2026-08-15"
        completionData={defaultCompletionData}
      />
    );
    // Due date milestone should show "Aug 15"
    expect(screen.getAllByText("Aug 15")).toHaveLength(2);
  });
});
