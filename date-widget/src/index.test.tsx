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
    mockFetch(200, {
      data: [{ version: 1, previousVersion: null, createdAt: "2026-11-17T10:00:00Z" }],
      cursor: "NA==",
    });
    const page = document.createElement("div");
    page.setAttribute("data-installation-id", "6afc78e4000e7511c05ac171");
    const widget = document.createElement("date-widget");
    page.appendChild(widget);
    document.body.appendChild(page);
    // contentLanguage du bootstrap de test = "en_US"
    expect(await screen.findByText("Publié le Nov 17, 2026")).toBeInTheDocument();
  });

  it("should show the dates when the widget is rendered inside a shadow root (new UX)", async () => {
    mockFetch(200, {
      data: [{ version: 1, previousVersion: null, createdAt: "2026-11-17T10:00:00Z" }],
      cursor: "NA==",
    });
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

  it("should strip the platform widget-card decoration around the content", async () => {
    mockFetch(200, {
      data: [{ version: 1, previousVersion: null, createdAt: "2026-11-17T10:00:00Z" }],
      cursor: "NA==",
    });
    // Topologie de la nouvelle UX : id sur <html>, contenu enveloppé dans .widget-card
    document.documentElement.setAttribute("data-installation-id", "6afc78e4000e7511c05ac171");
    const widget = document.createElement("date-widget");
    const card = document.createElement("div");
    card.className = "widget-card";
    widget.appendChild(card);
    document.body.appendChild(widget);
    await waitFor(() => expect(widget.textContent).toContain("Publié le Nov 17, 2026"));
    expect(card.style.boxShadow).toBe("none");
    expect(card.style.borderWidth).toBe("0px");
    expect(card.style.backgroundColor).toBe("transparent");
    expect(card.style.borderRadius).toBe("0px");
    expect(card.style.padding).toBe("0px");
    expect(card.style.margin).toBe("0px");
    document.documentElement.removeAttribute("data-installation-id");
  });

  it("should strip the designer-branding shadow from the block wrapper above the shadow root", async () => {
    mockFetch(200, {
      data: [{ version: 1, previousVersion: null, createdAt: "2026-11-17T10:00:00Z" }],
      cursor: "NA==",
    });
    // Topologie réelle observée dans l'app (dump Studio) : l'ombre « carte » vient du
    // wrapper du bloc en light DOM (au-dessus de <sb-custom-block> et de la shadow
    // root de la plateforme), via les classes designer-branding-*
    document.documentElement.setAttribute("data-installation-id", "6afc78e4000e7511c05ac171");
    const wrapper = document.createElement("div");
    wrapper.className = "mb-6 overflow-hidden last:mb-0 designer-branding-border-radius designer-branding-shadow";
    const sbCustomBlock = document.createElement("sb-custom-block");
    const host = document.createElement("div");
    host.setAttribute("data-sb-custom-block-widget-host", "");
    const shadow = host.attachShadow({ mode: "open" });
    const widget = document.createElement("date-widget");
    shadow.appendChild(widget);
    sbCustomBlock.appendChild(host);
    wrapper.appendChild(sbCustomBlock);
    document.body.appendChild(wrapper);
    await waitFor(() => {
      expect(shadow.textContent).toContain("Publié le Nov 17, 2026");
    });
    expect(wrapper.style.boxShadow).toBe("none");
    expect(wrapper.style.borderRadius).toBe("0px");
    document.documentElement.removeAttribute("data-installation-id");
  });

  it("should not touch a block wrapper without designer branding", async () => {
    mockFetch(200, {
      data: [{ version: 1, previousVersion: null, createdAt: "2026-11-17T10:00:00Z" }],
      cursor: "NA==",
    });
    document.documentElement.setAttribute("data-installation-id", "6afc78e4000e7511c05ac171");
    const wrapper = document.createElement("div");
    wrapper.className = "mb-6 overflow-hidden last:mb-0";
    const sbCustomBlock = document.createElement("sb-custom-block");
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    const widget = document.createElement("date-widget");
    shadow.appendChild(widget);
    sbCustomBlock.appendChild(host);
    wrapper.appendChild(sbCustomBlock);
    document.body.appendChild(wrapper);
    await waitFor(() => {
      expect(shadow.textContent).toContain("Publié le Nov 17, 2026");
    });
    expect(wrapper.style.boxShadow).toBe("");
    expect(wrapper.style.borderRadius).toBe("");
    document.documentElement.removeAttribute("data-installation-id");
  });

  it("should render nothing outside a page (no data-installation-id)", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    const widget = document.createElement("date-widget");
    document.body.appendChild(widget);
    expect(widget.textContent).toBe("");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
