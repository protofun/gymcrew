import { chromium } from "playwright";
const dir = process.argv[2] || "/tmp";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
page.on("pageerror", (err) => console.log("PAGE EXCEPTION:", err.message));
await page.goto("http://localhost:8099/dev-preview", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2500);
await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll("div"));
  const target = els.find((el) => el.scrollHeight > el.clientHeight + 200);
  if (target) target.scrollTop = target.scrollHeight;
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${dir}/home-r3-bottom.png` });
await browser.close();
