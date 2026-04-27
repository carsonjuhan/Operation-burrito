import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageErrorFallback } from "@/components/PageErrorFallback";

// A component that throws on render
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div>Normal content</div>;
}

// Suppress console.error in tests since ErrorBoundary logs caught errors
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
});

describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("renders default fallback UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
    expect(screen.queryByText("Normal content")).not.toBeInTheDocument();
  });

  it("logs the error to console.error", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(console.error).toHaveBeenCalled();
  });

  it("calls onError callback when an error is caught", () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Test error message" }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it("renders custom fallback ReactNode when provided", () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
  });

  it("renders custom fallback function with error and reset", () => {
    render(
      <ErrorBoundary
        fallback={({ error, reset }) => (
          <div>
            <p>Error: {error.message}</p>
            <button onClick={reset}>Reset</button>
          </div>
        )}
      >
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Error: Test error message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });

  it("resets error state when Try Again is clicked", () => {
    // We need a component whose throw behavior we can control
    let shouldThrow = true;

    function ConditionalThrower() {
      if (shouldThrow) {
        throw new Error("Conditional error");
      }
      return <div>Recovered content</div>;
    }

    const { rerender } = render(
      <ErrorBoundary>
        <ConditionalThrower />
      </ErrorBoundary>
    );

    // Error state should be showing
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Fix the error condition and click Try Again
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));

    // Should now render the recovered content
    expect(screen.getByText("Recovered content")).toBeInTheDocument();
  });
});

describe("PageErrorFallback", () => {
  it("renders the error fallback with heading and buttons", () => {
    const mockReset = vi.fn();
    const error = new Error("Page error");

    render(<PageErrorFallback error={error} reset={mockReset} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(/An unexpected error occurred/)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try Again/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reload Page/ })).toBeInTheDocument();
  });

  it("calls reset when Try Again is clicked", () => {
    const mockReset = vi.fn();
    const error = new Error("Page error");

    render(<PageErrorFallback error={error} reset={mockReset} />);

    fireEvent.click(screen.getByRole("button", { name: /Try Again/ }));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("calls window.location.reload when Reload Page is clicked", () => {
    const mockReset = vi.fn();
    const error = new Error("Page error");
    const reloadMock = vi.fn();

    // Mock window.location.reload
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    });

    render(<PageErrorFallback error={error} reset={mockReset} />);

    fireEvent.click(screen.getByRole("button", { name: /Reload Page/ }));
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
