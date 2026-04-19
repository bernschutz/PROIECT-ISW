import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Dashboard from "./Dashboard";
import React from "react";

const mocks = vi.hoisted(() => {
  return {
    mockSelect: vi.fn(),
    mockOrder: vi.fn(),
    mockInsert: vi.fn(),
    mockUpdate: vi.fn(),
    mockDelete: vi.fn(),
    mockEq: vi.fn(),
    mockSingle: vi.fn(),
    mockChannel: vi.fn(),
    mockOn: vi.fn(),
    mockSubscribe: vi.fn(),
    mockRemoveChannel: vi.fn(),
  };
});

vi.mock("react-router-dom", () => ({
  useOutletContext: () => ({
    session: {
      user: { id: "user-1" },
    },
  }),
}));

vi.mock("../lib/taskUtils", () => ({
  computeStatus: vi.fn((task) => task.status || "upcoming"),
  nextDue: vi.fn(() => new Date("2026-04-20T10:00:00.000Z")),
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mocks.mockSelect,
      insert: mocks.mockInsert,
      update: mocks.mockUpdate,
      delete: mocks.mockDelete,
    })),
    channel: mocks.mockChannel,
    removeChannel: mocks.mockRemoveChannel,
  },
}));

vi.mock("react-flatpickr", () => ({
  default: ({ value, onChange, className, placeholder }) => (
    <input
      data-testid="flatpickr"
      className={className}
      placeholder={placeholder}
      value={value ? "mock-date" : ""}
      onChange={() => onChange([new Date("2026-04-19T12:00:00.000Z")])}
      readOnly
    />
  ),
}));

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.mockOrder.mockResolvedValue({
      data: [
        {
          id: 1,
          title: "Task test 1",
          description: "Descriere 1",
          priority: "high",
          due_at: "2026-04-19T10:00:00.000Z",
          recurrence: "none",
          user_id: "user-1",
          status: "upcoming",
          created_at: "2026-04-19T09:00:00.000Z",
        },
        {
          id: 2,
          title: "Task test 2",
          description: "Descriere 2",
          priority: "low",
          due_at: null,
          recurrence: "none",
          user_id: "user-1",
          status: "completed",
          created_at: "2026-04-18T09:00:00.000Z",
        },
      ],
      error: null,
    });

    mocks.mockSelect.mockReturnValue({
      order: mocks.mockOrder,
    });

    mocks.mockSingle.mockResolvedValue({
      data: {
        id: 3,
        title: "Task nou",
        description: "Noua descriere",
        priority: "medium",
        due_at: null,
        recurrence: "none",
        user_id: "user-1",
        status: "upcoming",
      },
      error: null,
    });

    mocks.mockInsert.mockReturnValue({
      select: () => ({
        single: mocks.mockSingle,
      }),
    });

    mocks.mockEq.mockResolvedValue({ error: null });

    mocks.mockUpdate.mockReturnValue({
      eq: mocks.mockEq,
    });

    mocks.mockDelete.mockReturnValue({
      eq: mocks.mockEq,
    });

    mocks.mockSubscribe.mockImplementation((cb) => {
      if (cb) cb();
      return "mock-channel-instance";
    });

    mocks.mockOn.mockReturnValue({
      subscribe: mocks.mockSubscribe,
    });

    mocks.mockChannel.mockReturnValue({
      on: mocks.mockOn,
    });

    window.confirm = vi.fn(() => true);
  });

  it("afișează task-urile încărcate", async () => {
    render(<Dashboard />);

    expect(await screen.findByText("Task test 1")).toBeInTheDocument();
    expect(await screen.findByText("Task test 2")).toBeInTheDocument();
  });

  it("afișează câmpurile formularului de adăugare", async () => {
    render(<Dashboard />);

    expect(await screen.findByPlaceholderText("Titlu")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Descriere")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("dd/mm/yyyy hh:mm")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adaugă" })).toBeInTheDocument();
  });

  it("poate deschide modalul de editare", async () => {
    render(<Dashboard />);

    expect(await screen.findByText("Task test 1")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);

    expect(screen.getByText("Edit Task")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvează" })).toBeInTheDocument();
  });

  it("poate filtra task-urile după căutare", async () => {
    render(<Dashboard />);

    expect(await screen.findByText("Task test 1")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Caută..."), {
      target: { value: "Task test 2" },
    });

    expect(screen.queryByText("Task test 1")).not.toBeInTheDocument();
    expect(screen.getByText("Task test 2")).toBeInTheDocument();
  });

  it("poate șterge un task", async () => {
    render(<Dashboard />);

    expect(await screen.findByText("Task test 1")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(mocks.mockDelete).toHaveBeenCalled();
    });
  });

  it("poate marca un task drept completed", async () => {
    render(<Dashboard />);

    expect(await screen.findByText("Task test 1")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /Complete|Undo/i })[0]);

    await waitFor(() => {
      expect(mocks.mockUpdate).toHaveBeenCalled();
    });
  });

  it("poate marca un task drept canceled", async () => {
    render(<Dashboard />);

    expect(await screen.findByText("Task test 1")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /Cancel|Uncancel/i })[0]);

    await waitFor(() => {
      expect(mocks.mockUpdate).toHaveBeenCalled();
    });
  });
});