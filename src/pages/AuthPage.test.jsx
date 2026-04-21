import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthPage from "./AuthPage";

const mocks = vi.hoisted(() => {
  return {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
  };
});

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
    },
  },
}));

describe("AuthPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("afișează formularul de autentificare", () => {
    render(<AuthPage />);

    expect(screen.getByText("Autentificare")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("email@exemplu.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Autentifică-te" })).toBeInTheDocument();
  });

  it("permite scrierea în inputuri", () => {
    render(<AuthPage />);

    const emailInput = screen.getByPlaceholderText("email@exemplu.com");
    const passwordInput = screen.getByPlaceholderText("••••••••");

    fireEvent.change(emailInput, { target: { value: "test@mail.com" } });
    fireEvent.change(passwordInput, { target: { value: "parola123" } });

    expect(emailInput.value).toBe("test@mail.com");
    expect(passwordInput.value).toBe("parola123");
  });

  it("apelează signInWithPassword la submit în modul signIn", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });

    render(<AuthPage />);

    fireEvent.change(screen.getByPlaceholderText("email@exemplu.com"), {
      target: { value: "test@mail.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "parola123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Autentifică-te" }));

    await waitFor(() => {
      expect(mocks.signInWithPassword).toHaveBeenCalledWith({
        email: "test@mail.com",
        password: "parola123",
      });
    });

    expect(await screen.findByText("Autentificat.")).toBeInTheDocument();
  });

  it("poate schimba în modul signUp", () => {
    render(<AuthPage />);

    fireEvent.click(screen.getByRole("button", { name: "Nu ai cont? Creează unul" }));

    expect(screen.getByRole("button", { name: "Creează cont" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ai cont? Intră în cont" })).toBeInTheDocument();
  });

  it("apelează signUp la submit în modul signUp", async () => {
    mocks.signUp.mockResolvedValue({ error: null });

    render(<AuthPage />);

    fireEvent.click(screen.getByRole("button", { name: "Nu ai cont? Creează unul" }));

    fireEvent.change(screen.getByPlaceholderText("email@exemplu.com"), {
      target: { value: "nou@mail.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "parolaNoua" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Creează cont" }));

    await waitFor(() => {
      expect(mocks.signUp).toHaveBeenCalledWith({
        email: "nou@mail.com",
        password: "parolaNoua",
      });
    });

    expect(
      await screen.findByText("Cont creat. Verifică emailul dacă e necesar.")
    ).toBeInTheDocument();
  });

  it("afișează mesaj dacă resetarea parolei se încearcă fără email", async () => {
    render(<AuthPage />);

    fireEvent.click(screen.getByRole("button", { name: "Ți-ai uitat parola? Reseteaz-o" }));

    expect(
      await screen.findByText("Introdu emailul ca să-ți pot trimite linkul de resetare.")
    ).toBeInTheDocument();
  });

  it("apelează resetPasswordForEmail când există email", async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });

    render(<AuthPage />);

    fireEvent.change(screen.getByPlaceholderText("email@exemplu.com"), {
      target: { value: "reset@mail.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Ți-ai uitat parola? Reseteaz-o" }));

    await waitFor(() => {
      expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith("reset@mail.com", {
        redirectTo: window.location.origin,
      });
    });

    expect(
      await screen.findByText("Ți-am trimis un email de resetare (dacă există acest cont).")
    ).toBeInTheDocument();
  });
});
