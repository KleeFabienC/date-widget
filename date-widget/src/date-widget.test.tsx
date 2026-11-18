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
  it("should show the previous publication as « Publié le » and the current one as « Mis à jour le » when the days differ", async () => {
    mockFetch(200, {
      data: [
        { version: 99999, previousVersion: 8, createdAt: "2026-11-18T09:27:40Z", isDraft: true },
        { version: 8, previousVersion: 7, createdAt: "2026-11-18T09:21:17Z" },
        { version: 7, previousVersion: 6, createdAt: "2026-11-17T09:14:21Z" },
      ],
      cursor: "NA==",
    });
    render(<DateWidget {...PROPS} />);
    expect(await screen.findByText("Publié le 17 nov. 2026 · Mis à jour le 18 nov. 2026")).toBeInTheDocument();
  });

  it("should show a single date when both publications fall on the same displayed day", async () => {
    mockFetch(200, {
      data: [
        { version: 8, previousVersion: 7, createdAt: "2026-11-18T09:21:17Z" },
        { version: 7, previousVersion: 6, createdAt: "2026-11-18T09:14:21Z" },
      ],
      cursor: "NA==",
    });
    render(<DateWidget {...PROPS} />);
    expect(await screen.findByText("Publié le 18 nov. 2026")).toBeInTheDocument();
    expect(screen.queryByText(/Mis à jour le/)).not.toBeInTheDocument();
  });

  it("should show only « Publié le » when there is a single published version", async () => {
    mockFetch(200, {
      data: [{ version: 1, previousVersion: null, createdAt: "2026-11-17T08:00:00Z" }],
      cursor: "NA==",
    });
    render(<DateWidget {...PROPS} />);
    expect(await screen.findByText("Publié le 17 nov. 2026")).toBeInTheDocument();
    expect(screen.queryByText(/Mis à jour le/)).not.toBeInTheDocument();
  });

  it("should render nothing when the page is unpublished (draft only)", async () => {
    mockFetch(200, {
      data: [{ version: 99999, previousVersion: null, createdAt: "2026-11-18T09:27:40Z", isDraft: true }],
      cursor: "NA==",
    });
    render(<DateWidget {...PROPS} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0)); // laisser la promesse résoudre + re-render
    expect(document.body.textContent).toBe("");
    expect(screen.queryByText(/Publié le/)).not.toBeInTheDocument();
  });

  it("should render nothing when a createdAt is malformed (no « Invalid Date » visible)", async () => {
    mockFetch(200, {
      data: [{ version: 1, previousVersion: null, createdAt: "pas-une-date" }],
      cursor: "NA==",
    });
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

  it("should render nothing and not fetch without pageId", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    render(<DateWidget contentLanguage="fr_FR" />);
    expect(document.body.textContent).toBe("");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
