import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./Card";

describe("Card Component", () => {
  it("renders with default props", () => {
    render(
      <Card>
        <Card.Header>
          <Card.Title>Test Title</Card.Title>
        </Card.Header>
        <Card.Content>
          <p>Test content</p>
        </Card.Content>
      </Card>
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <Card className="custom-card-class">
        <Card.Content>Content</Card.Content>
      </Card>
    );

    const card = screen.getByText("Content").closest("div");
    expect(card).toHaveClass("custom-card-class");
  });

  it("renders header with title and description", () => {
    render(
      <Card>
        <Card.Header>
          <Card.Title>Main Title</Card.Title>
          <Card.Description>Card description</Card.Description>
        </Card.Header>
      </Card>
    );

    expect(screen.getByText("Main Title")).toBeInTheDocument();
    expect(screen.getByText("Card description")).toBeInTheDocument();
  });

  it("renders footer content", () => {
    render(
      <Card>
        <Card.Content>Main content</Card.Content>
        <Card.Footer>
          <button>Action</button>
        </Card.Footer>
      </Card>
    );

    expect(screen.getByText("Main content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
  });

  it("supports nested content structure", () => {
    render(
      <Card>
        <Card.Header>
          <Card.Title>Complex Card</Card.Title>
          <Card.Description>With multiple sections</Card.Description>
        </Card.Header>
        <Card.Content>
          <div>Section 1</div>
          <div>Section 2</div>
        </Card.Content>
        <Card.Footer>
          <button>Cancel</button>
          <button>Save</button>
        </Card.Footer>
      </Card>
    );

    expect(screen.getByText("Complex Card")).toBeInTheDocument();
    expect(screen.getByText("With multiple sections")).toBeInTheDocument();
    expect(screen.getByText("Section 1")).toBeInTheDocument();
    expect(screen.getByText("Section 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});
