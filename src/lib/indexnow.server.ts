import { SITE_URL } from "@/lib/site";

/** Submit URLs to IndexNow (Bing, Yandex, Seznam, Naver share submissions). */
export async function pingIndexNow(urls: string[]): Promise<{ submitted: number; status: number | null }> {
  const key = process.env.INDEXNOW_KEY;
  const unique = [...new Set(urls)].filter((u) => u.startsWith(SITE_URL)).slice(0, 10000);
  if (!key || unique.length === 0) return { submitted: 0, status: null };
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(SITE_URL).host,
      key,
      keyLocation: `${SITE_URL}/indexnow-key.txt`,
      urlList: unique,
    }),
  });
  if (!res.ok && res.status !== 202) {
    console.error(`IndexNow failed [${res.status}]: ${await res.text()}`);
  }
  return { submitted: unique.length, status: res.status };
}
