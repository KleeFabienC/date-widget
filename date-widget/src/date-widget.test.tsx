process.env.TZ = "UTC";

import React from "react";
import { screen, render, waitFor } from "@testing-library/react";

import { DateWidget } from "./date-widget";

const PROPS = { pageId: "p1", webUrl: "https://staffbase.showcase.com", contentLanguage: "fr_FR" } as const;

function mockFetch(status: number, body: unknown): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

afterEach(() => jest.restoreAllMocks());

describe("DateWidget", () => {
  it("should render the publish date and no modified date when dates are equal", async () => {
    mockFetch(200, { publishedAt: "2026-11-17T10:00:00Z", updatedAt: "2026-11-17T10:00:00Z" });
    render(<DateWidget {...PROPS} />);
    expect(await screen.findByText("Publié le 17 nov. 2026")).toBeInTheDocument();
    expect(screen.queryByText(/Modifié le/)).not.toBeInTheDocument();
  });

  it("should append the modified date only when it is strictly later", async () => {
    mockFetch(200, { publishedAt: "2026-11-17T10:00:00Z", updatedAt: "2026-12-03T08:30:00Z" });
    render(<DateWidget {...PROPS} />);
    expect(await screen.findByText("Publié le 17 nov. 2026 · Modifié le 3 déc. 2026")).toBeInTheDocument();
  });

  it("should render only the modified date when the page is unpublished", async () => {
    mockFetch(200, { updatedAt: "2026-12-03T08:30:00Z" });
    render(<DateWidget {...PROPS} />);
    expect(await screen.findByText("Modifié le 3 déc. 2026")).toBeInTheDocument();
    expect(screen.queryByText(/Publié le/)).not.toBeInTheDocument();
  });

  it("should render nothing and warn when the API fails", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    global.fetch = jest.fn().mockRejectedValue(new Error("network")) as unknown as typeof fetch;
    render(<DateWidget {...PROPS} />);
    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(document.body.textContent).toBe("");
  });

  it("should render nothing and not fetch without pageId", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    render(<DateWidget contentLanguage="fr_FR" />);
    expect(document.body.textContent).toBe("");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
