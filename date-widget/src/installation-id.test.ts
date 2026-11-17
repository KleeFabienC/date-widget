import { resolveInstallationId } from "./installation-id";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("resolveInstallationId", () => {
  it("should find the id on a light-DOM ancestor", () => {
    const page = document.createElement("div");
    page.setAttribute("data-installation-id", "page123");
    const widget = document.createElement("date-widget");
    page.appendChild(widget);
    document.body.appendChild(page);
    expect(resolveInstallationId(widget)).toBe("page123");
  });

  it("should find the id across a shadow root boundary (new UX: id on <html>, widget in shadow)", () => {
    document.documentElement.setAttribute("data-installation-id", "page456");
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    const widget = document.createElement("date-widget");
    shadow.appendChild(widget);
    document.body.appendChild(host);
    expect(resolveInstallationId(widget)).toBe("page456");
    document.documentElement.removeAttribute("data-installation-id");
  });

  it("should return undefined when no ancestor carries the id", () => {
    const widget = document.createElement("date-widget");
    document.body.appendChild(widget);
    expect(resolveInstallationId(widget)).toBeUndefined();
  });
});
