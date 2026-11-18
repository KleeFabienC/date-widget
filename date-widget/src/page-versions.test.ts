import { getPublishedDates } from "./page-versions";

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

describe("getPublishedDates", () => {
  it("should return the two latest published versions' dates (draft ignored)", async () => {
    mockFetch(200, {
      data: [
        { version: 99999, previousVersion: 8, createdAt: "2026-11-18T09:27:40Z", isDraft: true },
        { version: 8, previousVersion: 7, createdAt: "2026-11-18T09:21:17Z" },
        { version: 7, previousVersion: 6, createdAt: "2026-11-17T09:14:21Z" },
      ],
      cursor: "NA==",
    });
    const dates = await getPublishedDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ current: "2026-11-18T09:21:17Z", previous: "2026-11-17T09:14:21Z" });
    expect(global.fetch).toHaveBeenCalledWith(
      `${WEB_URL}/api/pages/${PAGE_ID}/versions?limit=5`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("should normalize a trailing slash in webUrl", async () => {
    mockFetch(200, { data: [], cursor: null });
    await getPublishedDates(`${WEB_URL}/`, PAGE_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      `${WEB_URL}/api/pages/${PAGE_ID}/versions?limit=5`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("should map a single published version to previous = null", async () => {
    mockFetch(200, {
      data: [
        { version: 99999, previousVersion: 1, createdAt: "2026-11-18T09:27:40Z", isDraft: true },
        { version: 1, previousVersion: null, createdAt: "2026-11-17T08:00:00Z" },
      ],
      cursor: "NA==",
    });
    const dates = await getPublishedDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ current: "2026-11-17T08:00:00Z", previous: null });
  });

  it("should map an unpublished page (draft only) to null dates", async () => {
    mockFetch(200, {
      data: [{ version: 99999, previousVersion: null, createdAt: "2026-11-18T09:27:40Z", isDraft: true }],
      cursor: "NA==",
    });
    const dates = await getPublishedDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ current: null, previous: null });
  });

  it("should ignore the virtual draft version 99999 even without isDraft", async () => {
    mockFetch(200, {
      data: [
        { version: 99999, previousVersion: 1, createdAt: "2026-11-18T09:27:40Z" },
        { version: 1, previousVersion: null, createdAt: "2026-11-17T08:00:00Z" },
      ],
      cursor: "NA==",
    });
    const dates = await getPublishedDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ current: "2026-11-17T08:00:00Z", previous: null });
  });

  it("should map a missing createdAt to null", async () => {
    mockFetch(200, { data: [{ version: 1, previousVersion: null }], cursor: null });
    const dates = await getPublishedDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ current: null, previous: null });
  });

  it("should map a malformed createdAt to null (never « Invalid Date » downstream)", async () => {
    mockFetch(200, {
      data: [
        { version: 2, previousVersion: 1, createdAt: "pas-une-date" },
        { version: 1, previousVersion: null, createdAt: "2026-11-17T08:00:00Z" },
      ],
      cursor: "NA==",
    });
    const dates = await getPublishedDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ current: null, previous: "2026-11-17T08:00:00Z" });
  });

  it("should map a non-string createdAt to null", async () => {
    mockFetch(200, {
      data: [{ version: 1, previousVersion: null, createdAt: 1234567890 }],
      cursor: "NA==",
    });
    const dates = await getPublishedDates(WEB_URL, PAGE_ID);
    expect(dates).toEqual({ current: null, previous: null });
  });

  it("should reject on non-2xx with the HTTP status (401 and 404)", async () => {
    mockFetch(401, {});
    await expect(getPublishedDates(WEB_URL, PAGE_ID)).rejects.toThrow(/401/);
    mockFetch(404, {});
    await expect(getPublishedDates(WEB_URL, PAGE_ID)).rejects.toThrow(/404/);
  });
});
