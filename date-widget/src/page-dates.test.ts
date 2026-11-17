import { getPageDates } from "./page-dates";

const WEB_URL = "https://staffbase.showcase.com";
const PAGE_ID = "6afc78e4000e7511c05ac171";

function mockFetch(status: number, body: unknown): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

afterEach(() => jest.restoreAllMocks());

describe("getPageDates", () => {
  it("should return publishedAt and updatedAt from the Pages API", async () => {
    mockFetch(200, { id: PAGE_ID, publishedAt: "2026-11-17T10:00:00Z", updatedAt: "2026-12-03T08:30:00Z" });
    const dates = await getPageDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ publishedAt: "2026-11-17T10:00:00Z", updatedAt: "2026-12-03T08:30:00Z" });
    expect(global.fetch).toHaveBeenCalledWith(
      `${WEB_URL}/api/pages/${PAGE_ID}`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("should normalize a trailing slash in webUrl", async () => {
    mockFetch(200, { publishedAt: "2026-11-17T10:00:00Z" });
    await getPageDates(`${WEB_URL}/`, PAGE_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      `${WEB_URL}/api/pages/${PAGE_ID}`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("should map missing date fields to null", async () => {
    mockFetch(200, { id: PAGE_ID });
    const dates = await getPageDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ publishedAt: null, updatedAt: null });
  });

  it("should reject on non-2xx with the HTTP status", async () => {
    mockFetch(401, {});
    await expect(getPageDates(WEB_URL, PAGE_ID)).rejects.toThrow(/401/);
  });
});
