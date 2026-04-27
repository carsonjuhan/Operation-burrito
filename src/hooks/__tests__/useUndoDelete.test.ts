import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUndoDelete } from "../useUndoDelete";

// Mock the toast context
const mockAddToast = vi.fn();
vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({
    addToast: mockAddToast,
    toasts: [],
    removeToast: vi.fn(),
  }),
}));

interface TestItem {
  id: string;
  name: string;
}

describe("useUndoDelete", () => {
  let deleteFromStore: ReturnType<typeof vi.fn>;
  let restoreToStore: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    deleteFromStore = vi.fn();
    restoreToStore = vi.fn();
    mockAddToast.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls deleteFromStore immediately when handleDelete is called", () => {
    const { result } = renderHook(() =>
      useUndoDelete<TestItem>(deleteFromStore, restoreToStore, (i) => i.name)
    );

    const item: TestItem = { id: "1", name: "Test Item" };
    act(() => {
      result.current.handleDelete(item);
    });

    expect(deleteFromStore).toHaveBeenCalledWith("1");
  });

  it("shows a toast with undo action when deleting", () => {
    const { result } = renderHook(() =>
      useUndoDelete<TestItem>(deleteFromStore, restoreToStore, (i) => i.name)
    );

    const item: TestItem = { id: "1", name: "Test Item" };
    act(() => {
      result.current.handleDelete(item);
    });

    expect(mockAddToast).toHaveBeenCalledWith(
      '"Test Item" deleted',
      "info",
      expect.objectContaining({ label: "Undo", onClick: expect.any(Function) }),
      5500
    );
  });

  it("restores item when undo action is clicked before timer expires", () => {
    const { result } = renderHook(() =>
      useUndoDelete<TestItem>(deleteFromStore, restoreToStore, (i) => i.name)
    );

    const item: TestItem = { id: "1", name: "Test Item" };
    act(() => {
      result.current.handleDelete(item);
    });

    // Get the undo action from the toast call
    const toastAction = mockAddToast.mock.calls[0][2];
    act(() => {
      toastAction.onClick();
    });

    expect(restoreToStore).toHaveBeenCalledWith(item);
  });

  it("cleans up pending reference after 5 seconds (no restore possible)", () => {
    const { result } = renderHook(() =>
      useUndoDelete<TestItem>(deleteFromStore, restoreToStore, (i) => i.name)
    );

    const item: TestItem = { id: "1", name: "Test Item" };
    act(() => {
      result.current.handleDelete(item);
    });

    // Advance past the undo window
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Now calling undo via the toast action should not restore
    const toastAction = mockAddToast.mock.calls[0][2];
    act(() => {
      toastAction.onClick();
    });

    // restoreToStore should NOT have been called since the pending was cleaned up
    expect(restoreToStore).not.toHaveBeenCalled();
  });

  it("handles multiple independent deletes correctly", () => {
    const { result } = renderHook(() =>
      useUndoDelete<TestItem>(deleteFromStore, restoreToStore, (i) => i.name)
    );

    const item1: TestItem = { id: "1", name: "Item One" };
    const item2: TestItem = { id: "2", name: "Item Two" };

    act(() => {
      result.current.handleDelete(item1);
    });
    act(() => {
      result.current.handleDelete(item2);
    });

    expect(deleteFromStore).toHaveBeenCalledTimes(2);
    expect(mockAddToast).toHaveBeenCalledTimes(2);

    // Undo the second delete
    const toastAction2 = mockAddToast.mock.calls[1][2];
    act(() => {
      toastAction2.onClick();
    });

    expect(restoreToStore).toHaveBeenCalledWith(item2);
    expect(restoreToStore).toHaveBeenCalledTimes(1);

    // Undo the first delete too
    const toastAction1 = mockAddToast.mock.calls[0][2];
    act(() => {
      toastAction1.onClick();
    });

    expect(restoreToStore).toHaveBeenCalledWith(item1);
    expect(restoreToStore).toHaveBeenCalledTimes(2);
  });

  it("cancels pending timers on unmount", () => {
    const { result, unmount } = renderHook(() =>
      useUndoDelete<TestItem>(deleteFromStore, restoreToStore, (i) => i.name)
    );

    const item: TestItem = { id: "1", name: "Test Item" };
    act(() => {
      result.current.handleDelete(item);
    });

    unmount();

    // Advancing time after unmount should not cause errors
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    // Only the initial delete should have happened, no extra calls
    expect(deleteFromStore).toHaveBeenCalledTimes(1);
  });

  it("uses default name when getItemName is not provided", () => {
    const { result } = renderHook(() =>
      useUndoDelete<TestItem>(deleteFromStore, restoreToStore)
    );

    const item: TestItem = { id: "1", name: "Test Item" };
    act(() => {
      result.current.handleDelete(item);
    });

    expect(mockAddToast).toHaveBeenCalledWith(
      '"Item" deleted',
      "info",
      expect.any(Object),
      5500
    );
  });
});
