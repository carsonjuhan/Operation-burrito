import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useShowMore } from "../useShowMore";

describe("useShowMore", () => {
  it("returns all items when total is less than page size", () => {
    const { result } = renderHook(() => useShowMore(10, 50));
    expect(result.current.visibleCount).toBe(10);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.remaining).toBe(0);
  });

  it("limits visible count to page size when total exceeds it", () => {
    const { result } = renderHook(() => useShowMore(120, 50));
    expect(result.current.visibleCount).toBe(50);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.remaining).toBe(70);
  });

  it("showMore increments visible count by page size", () => {
    const { result } = renderHook(() => useShowMore(120, 50));
    act(() => result.current.showMore());
    expect(result.current.visibleCount).toBe(100);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.remaining).toBe(20);
  });

  it("showMore caps at total count", () => {
    const { result } = renderHook(() => useShowMore(80, 50));
    act(() => result.current.showMore());
    expect(result.current.visibleCount).toBe(80);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.remaining).toBe(0);
  });

  it("reset returns to initial page size", () => {
    const { result } = renderHook(() => useShowMore(120, 50));
    act(() => result.current.showMore());
    expect(result.current.visibleCount).toBe(100);
    act(() => result.current.reset());
    expect(result.current.visibleCount).toBe(50);
    expect(result.current.hasMore).toBe(true);
  });

  it("uses default page size of 50", () => {
    const { result } = renderHook(() => useShowMore(100));
    expect(result.current.visibleCount).toBe(50);
    expect(result.current.hasMore).toBe(true);
  });

  it("works with custom page size", () => {
    const { result } = renderHook(() => useShowMore(25, 10));
    expect(result.current.visibleCount).toBe(10);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.remaining).toBe(15);

    act(() => result.current.showMore());
    expect(result.current.visibleCount).toBe(20);
    expect(result.current.remaining).toBe(5);

    act(() => result.current.showMore());
    expect(result.current.visibleCount).toBe(25);
    expect(result.current.hasMore).toBe(false);
  });

  it("handles zero total count", () => {
    const { result } = renderHook(() => useShowMore(0, 50));
    expect(result.current.visibleCount).toBe(0);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.remaining).toBe(0);
  });

  it("handles total count equal to page size", () => {
    const { result } = renderHook(() => useShowMore(50, 50));
    expect(result.current.visibleCount).toBe(50);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.remaining).toBe(0);
  });
});
