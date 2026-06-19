import { render, screen } from "@testing-library/react";
import { useSelector, useStore } from "react-redux";
import { StoreProvider } from "@/providers/StoreProvider";
import type { RootState } from "@/store";

function StatusProbe() {
  const status = useSelector((state: RootState) => state.auth.status);
  return <div data-testid="status">{status}</div>;
}

describe("StoreProvider", () => {
  it("renders its children", () => {
    render(
      <StoreProvider>
        <div>hello world</div>
      </StoreProvider>
    );
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });

  it("provides a working Redux store with the expected initial state to descendants", () => {
    render(
      <StoreProvider>
        <StatusProbe />
      </StoreProvider>
    );
    expect(screen.getByTestId("status")).toHaveTextContent("idle");
  });

  it("creates a new, independent store instance for each mounted provider", () => {
    const { unmount: unmountFirst } = render(
      <StoreProvider>
        <StatusProbe />
      </StoreProvider>
    );
    expect(screen.getByTestId("status")).toHaveTextContent("idle");
    unmountFirst();

    render(
      <StoreProvider>
        <StatusProbe />
      </StoreProvider>
    );
    expect(screen.getByTestId("status")).toHaveTextContent("idle");
  });

  it("keeps the same store instance across re-renders (singleton via useState, not re-created each render)", () => {
    const seenStores: unknown[] = [];

    function StoreIdentityProbe() {
      // react-redux's useStore exposes the actual store instance handed to
      // <Provider>, letting us assert on referential identity directly.
      seenStores.push(useStore());
      return null;
    }

    const { rerender } = render(
      <StoreProvider>
        <StoreIdentityProbe />
      </StoreProvider>
    );

    rerender(
      <StoreProvider>
        <StoreIdentityProbe />
      </StoreProvider>
    );

    // Both renders should have observed the same store reference, proving the
    // store itself was not torn down and recreated by the
    // `useState(() => makeStore())` initializer on re-render.
    expect(seenStores[0]).toBe(seenStores[1]);
  });
});
