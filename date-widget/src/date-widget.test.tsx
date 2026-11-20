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
  it("should show « Publié le » (createdAt) and « Mis à jour le » (publishedAt) when the displayed days differ", async () => {
    mockFetch(200, { id: "p1", createdAt: "2021-06-23T08:07:13.178Z", updatedAt: "2021-09-03T11:37:01.760Z", publishedAt: "2026-11-18T09:21:17Z" });
    render(<DateWidget {...PROPS} />);
    expect(await screen.findByText("Publié le 23 juin 2021 · Mis à jour le 18 nov. 2026")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Modifié le/);
  });

  it("should show a single « Publié le » when both dates fall on the same displayed day", async () => {
    mockFetch(200, { id: "p1", createdAt: "2026-11-18T06:00:00Z", publishedAt: "2026-11-18T09:21:17Z" });
    render(<DateWidget {...PROPS} />);
    expect(await screen.findByText("Publié le 18 nov. 2026")).toBeInTheDocument();
    expect(screen.queryByText(/Mis à jour le/)).not.toBeInTheDocument();
  });

  it("should show only « Mis à jour le » when createdAt is absent", async () => {
    mockFetch(200, { id: "p1", publishedAt: "2026-11-18T09:21:17Z" });
    render(<DateWidget {...PROPS} />);
    expect(await screen.findByText("Mis à jour le 18 nov. 2026")).toBeInTheDocument();
    expect(screen.queryByText(/Publié le/)).not.toBeInTheDocument();
  });

  it("should render nothing when the page is unpublished (publishedAt absent)", async () => {
    mockFetch(200, { id: "p1", createdAt: "2021-06-23T08:07:13.178Z" });
    render(<DateWidget {...PROPS} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0)); // laisser la promesse résoudre + re-render
    expect(document.body.textContent).toBe("");
    expect(screen.queryByText(/Publié le/)).not.toBeInTheDocument();
  });

  it("should render nothing when publishedAt is malformed (no « Invalid Date » visible)", async () => {
    mockFetch(200, { id: "p1", createdAt: "2021-06-23T08:07:13.178Z", publishedAt: "pas-une-date" });
    render(<DateWidget {...PROPS} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0)); // laisser la promesse résoudre + re-render
    expect(document.body.textContent).toBe("");
    expect(screen.queryByText(/Publié le|Invalid Date/)).not.toBeInTheDocument();
  });

  it("should render nothing and warn when the API fails", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    global.fetch = jest.fn().mockRejectedValue(new Error("network")) as unknown as typeof fetch;
    render(<DateWidget {...PROPS} />);
    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(document.body.textContent).toBe("");
  });

  it("should refetch and show the new page's dates when pageId changes (no stale state)", async () => {
    mockFetch(200, { id: "p1", createdAt: "2021-06-23T08:07:13.178Z", publishedAt: "2026-11-18T09:21:17Z" });
    const { rerender } = render(<DateWidget {...PROPS} />);
    expect(await screen.findByText("Publié le 23 juin 2021 · Mis à jour le 18 nov. 2026")).toBeInTheDocument();
    mockFetch(200, { id: "p2", createdAt: "2022-01-05T08:00:00Z", publishedAt: "2026-11-20T09:00:00Z" });
    rerender(<DateWidget pageId="p2" webUrl={PROPS.webUrl} contentLanguage={PROPS.contentLanguage} />);
    expect(await screen.findByText("Publié le 5 janv. 2022 · Mis à jour le 20 nov. 2026")).toBeInTheDocument();
  });

  it("should render nothing and not fetch without pageId", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    render(<DateWidget contentLanguage="fr_FR" />);
    expect(document.body.textContent).toBe("");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
