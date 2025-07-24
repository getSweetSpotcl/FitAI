import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button Component", () => {
  it("renders with default props", () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-blue-600");
    expect(button).not.toBeDisabled();
  });

  it("renders with custom variant", () => {
    render(<Button variant="secondary">Secondary Button</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-gray-200");
  });

  it("renders with custom size", () => {
    render(<Button size="sm">Small Button</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("px-3", "py-1.5", "text-sm");
  });

  it("handles click events", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders as disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled Button</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveClass("opacity-50", "cursor-not-allowed");
  });

  it("shows loading state", () => {
    render(<Button loading>Loading Button</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Loading...");
  });

  it("renders as different HTML elements", () => {
    render(
      <Button as="a" href="/test">
        Link Button
      </Button>
    );

    const link = screen.getByRole("link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/test");
  });

  it("applies custom className", () => {
    render(<Button className="custom-class">Custom Button</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });

  it("forwards ref correctly", () => {
    const ref = vi.fn();
    render(<Button ref={ref}>Ref Button</Button>);

    expect(ref).toHaveBeenCalled();
  });
});
