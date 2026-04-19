import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import App from "./App";

const mocks = vi.hoisted(() => {
  return {
    mockNavigate: vi.fn(),
    mockToggleTheme: vi.fn(),
    mockSignOut: vi.fn(),
    mockUnsubscribe: vi.fn(),
  };
});

vi.mock("react-router-dom", () => ({
  Outlet: ({ context }) => (
    <div data-testid="outlet">
      Outlet - session: {context?.session ? "yes" : "no"}
    </div>
  ),
  useNavigate: () => mocks.mockNavigate,
  useLocation: () => ({ pathname: "/" }),
}));

vi.mock("../lib/useTheme", () => ({
  useTheme: () => ({
    theme: "dark",
    toggleTheme: mocks.mockToggleTheme,
  }),
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({
          data: {
            session: { user: { id: "123" } },
          },
        })
      ),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: mocks.mockUnsubscribe,
          },
        },
      })),
      signOut: mocks.mockSignOut,
    },
  },
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("afiseaza titlul To-Do", () => {
    render(<App />);
    expect(screen.getByText("To-Do")).toBeInTheDocument();
  });

  test("afiseaza butonul de tema", () => {
    render(<App />);
    expect(screen.getByTitle("Schimbă tema")).toBeInTheDocument();
  });

  test("apeleaza toggleTheme la click pe butonul de tema", () => {
    render(<App />);
    fireEvent.click(screen.getByTitle("Schimbă tema"));
    expect(mocks.mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  test("afiseaza butonul Logout cand exista sesiune", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Logout")).toBeInTheDocument();
    });
  });

  test("apeleaza signOut la click pe Logout", async () => {
    render(<App />);

    const logoutBtn = await screen.findByText("Logout");
    fireEvent.click(logoutBtn);

    expect(mocks.mockSignOut).toHaveBeenCalledTimes(1);
  });
});