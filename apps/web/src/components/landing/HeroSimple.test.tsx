import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeroSimple } from "./HeroSimple";

// Mock Next.js Link component
vi.mock("next/link", () => {
  return {
    __esModule: true,
    default: ({ children, href, ...props }: any) => (
      <a href={href} {...props}>
        {children}
      </a>
    ),
  };
});

// Mock Clerk components
vi.mock("@clerk/nextjs", () => ({
  SignedIn: ({ children }: any) => (
    <div data-testid="signed-in">{children}</div>
  ),
  SignedOut: ({ children }: any) => (
    <div data-testid="signed-out">{children}</div>
  ),
  SignUpButton: ({ children }: any) => (
    <button data-testid="sign-up-button">{children}</button>
  ),
}));

describe("HeroSimple Component", () => {
  it("renders hero content correctly", () => {
    render(<HeroSimple />);

    // Check main heading
    expect(screen.getByText(/Tu entrenador personal/i)).toBeInTheDocument();
    expect(
      screen.getByText(/con inteligencia artificial/i)
    ).toBeInTheDocument();

    // Check description
    expect(screen.getByText(/Rutinas personalizadas/i)).toBeInTheDocument();
    expect(screen.getByText(/seguimiento inteligente/i)).toBeInTheDocument();
  });

  it("shows sign up button for signed out users", () => {
    render(<HeroSimple />);

    expect(screen.getByTestId("signed-out")).toBeInTheDocument();
    expect(screen.getByTestId("sign-up-button")).toBeInTheDocument();
  });

  it("shows dashboard link for signed in users", () => {
    render(<HeroSimple />);

    expect(screen.getByTestId("signed-in")).toBeInTheDocument();

    const dashboardLink = screen.getByRole("link", {
      name: /ir al dashboard/i,
    });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
  });

  it("displays feature highlights", () => {
    render(<HeroSimple />);

    // Check for feature mentions
    expect(screen.getByText(/rutinas personalizadas/i)).toBeInTheDocument();
    expect(screen.getByText(/seguimiento inteligente/i)).toBeInTheDocument();
    expect(
      screen.getByText(/integración con apple health/i)
    ).toBeInTheDocument();
  });

  it("has proper semantic structure", () => {
    render(<HeroSimple />);

    // Check for main section
    const heroSection = screen.getByRole("main") || screen.getByRole("banner");
    expect(heroSection).toBeInTheDocument();

    // Check for proper heading hierarchy
    const mainHeading = screen.getByRole("heading", { level: 1 });
    expect(mainHeading).toBeInTheDocument();
  });

  it("renders call-to-action buttons", () => {
    render(<HeroSimple />);

    // Primary CTA for signed out users
    const signUpButton = screen.getByTestId("sign-up-button");
    expect(signUpButton).toBeInTheDocument();

    // Secondary CTA for signed in users
    const dashboardButton = screen.getByRole("link", {
      name: /ir al dashboard/i,
    });
    expect(dashboardButton).toBeInTheDocument();
  });
});
