process.env.TZ = "UTC";

import { screen, waitFor } from "@testing-library/dom";

import "../dev/bootstrap";

function mockFetch(status: number, body: unknown): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

describe("Widget integration", () => {
  beforeAll(async () => {
    document.body.innerHTML = `
        <div id="preview"></div>
        <div id="config"></div>
        `;
    await import("./index");
  });

  it("should show the dates of the hosting page", async () => {
    mockFetch(200, { publishedAt: "2026-11-17T10:00:00Z", updatedAt: "2026-11-17T10:00:00Z" });
    const page = document.createElement("div");
    page.setAttribute("data-installation-id", "6afc78e4000e7511c05ac171");
    const widget = document.createElement("date-widget");
    page.appendChild(widget);
    document.body.appendChild(page);
    // contentLanguage du bootstrap de test = "en_US"
    expect(await screen.findByText("Publié le Nov 17, 2026")).toBeInTheDocument();
  });

  it("should show the dates when the widget is rendered inside a shadow root (new UX)", async () => {
    mockFetch(200, { publishedAt: "2026-11-17T10:00:00Z", updatedAt: "2026-11-17T10:00:00Z" });
    // Topologie réelle de la nouvelle UX : id sur <html>, widget dans une shadow root
    document.documentElement.setAttribute("data-installation-id", "6afc78e4000e7511c05ac171");
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    const widget = document.createElement("date-widget");
    shadow.appendChild(widget);
    document.body.appendChild(host);
    await waitFor(() => {
      expect(shadow.textContent).toContain("Publié le Nov 17, 2026");
    });
    document.documentElement.removeAttribute("data-installation-id");
  });

  it("should render nothing outside a page (no data-installation-id)", async () => {
    const callsBefore = (global.fetch as jest.Mock).mock.calls.length;
    const widget = document.createElement("date-widget");
    document.body.appendChild(widget);
    expect(widget.textContent).toBe("");
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(callsBefore);
  });
});
