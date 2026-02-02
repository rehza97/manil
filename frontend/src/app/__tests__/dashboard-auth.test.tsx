/**
 * Regression tests: unauthenticated users must not access dashboard routes.
 * ProtectedRoute redirects to /login when !isAuthenticated || !user.
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { ProtectedRoute } from "@/modules/auth";

vi.mock("@/shared/store", () => ({
  useAuthStore: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
  })),
}));

const minimalRoutes = [
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <div>Dashboard</div>
      </ProtectedRoute>
    ),
  },
  {
    path: "/login",
    element: <div>Login page</div>,
  },
];

function renderDashboardAsUnauthenticated() {
  const router = createMemoryRouter(minimalRoutes, {
    initialEntries: ["/dashboard"],
    initialIndex: 0,
  });
  render(<RouterProvider router={router} />);
}

describe("Dashboard auth redirect", () => {
  it("redirects unauthenticated user from /dashboard to /login", () => {
    renderDashboardAsUnauthenticated();

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });
});
