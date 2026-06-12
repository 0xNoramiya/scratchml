const { chromium } = require("playwright");

const URL = process.env.BASE_URL || "http://localhost:3000";
const shot = (p, name) => p.screenshot({ path: `/tmp/scratchml-e2e-${name}.png` }).catch(() => {});
const log = (...a) => console.log("[e2e]", ...a);

async function newPage(browser) {
  const ctx = await browser.newContext({
    permissions: ["camera"],
    viewport: { width: 1320, height: 860 },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push("CONSOLE: " + m.text()));
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  return { ctx, page, errors };
}

async function drawCircle(page, box, cx, cy, r) {
  const X = box.x + cx, Y = box.y + cy;
  const steps = 26;
  await page.mouse.move(X + r, Y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    await page.mouse.move(X + r * Math.cos(a), Y + r * Math.sin(a));
  }
  await page.mouse.up();
}

async function drawSquare(page, box, cx, cy, half) {
  const X = box.x + cx, Y = box.y + cy;
  const pts = [
    [X - half, Y - half], [X + half, Y - half],
    [X + half, Y + half], [X - half, Y + half], [X - half, Y - half],
  ];
  await page.mouse.move(pts[0][0], pts[0][1]);
  await page.mouse.down();
  for (const [x, y] of pts.slice(1)) {
    await page.mouse.move(x, y, { steps: 6 });
  }
  await page.mouse.up();
}

(async () => {
  const browser = await chromium.launch({
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--autoplay-policy=no-user-gesture-required",
      "--use-gl=swiftshader",
      // newer headless Chromium disallows software WebGL without this:
      "--enable-unsafe-swiftshader",
      "--use-angle=swiftshader",
    ],
  });

  let failures = 0;

  // ================= Scenario A: SKETCH PATH (no webcam) =================
  {
    const { ctx, page, errors } = await newPage(browser);
    try {
      await page.goto(URL, { waitUntil: "domcontentloaded" });
      await page.getByText(/Drawing demo: no camera needed/i).click({ timeout: 15000 });
      log("A: sketch demo loaded");
      await page.getByRole("button", { name: /Train & Play/i }).waitFor({ timeout: 90000 });
      log("A: model ready");
      await shot(page, "A1-sketch-studio");

      const pad = page.getByTestId("sketchpad");
      const box = await pad.boundingBox();
      if (!box) throw new Error("no sketchpad box");

      // 5 circles for class 1, 5 squares for class 2
      for (let i = 0; i < 5; i++) {
        await drawCircle(page, box, box.width / 2 + (i - 2) * 8, box.height / 2, 60 + i * 7);
        await page.getByText(/add this drawing/i).nth(0).click();
        await page.waitForTimeout(250);
      }
      log("A: added 5 circles");
      for (let i = 0; i < 5; i++) {
        await drawSquare(page, box, box.width / 2 + (i - 2) * 8, box.height / 2, 45 + i * 7);
        await page.getByText(/add this drawing/i).nth(1).click();
        await page.waitForTimeout(250);
      }
      log("A: added 5 squares");
      await shot(page, "A2-samples");

      await page.getByRole("button", { name: /Train & Play/i }).click();
      await page.getByRole("button", { name: /Teach me more/i }).waitFor({ timeout: 90000 });
      log("A: trained, live");

      // draw a NEW circle and see what it guesses
      await drawCircle(page, box, box.width / 2, box.height / 2, 72);
      await page.waitForTimeout(2600); // let EMA settle
      await shot(page, "A3-live-guess");
      const badge = await page.locator(".wiggle").first().innerText().catch(() => "");
      log("A: badge:", JSON.stringify(badge.replace(/\n/g, " ")));
      if (/circle/i.test(badge)) log("A: ✅ correctly recognized the drawn circle");
      else { log("A: ❌ did not recognize circle"); failures++; }

      // and a square
      await page.getByText(/clear/i).first().click().catch(() => {});
      await page.waitForTimeout(300);
      await drawSquare(page, box, box.width / 2, box.height / 2, 60);
      await page.waitForTimeout(2600);
      const badge2 = await page.locator(".wiggle").first().innerText().catch(() => "");
      log("A: badge2:", JSON.stringify(badge2.replace(/\n/g, " ")));
      if (/square/i.test(badge2)) log("A: ✅ correctly recognized the drawn square");
      else { log("A: ❌ did not recognize square"); failures++; }
      await shot(page, "A4-square-guess");

      log("A errors:", errors.length);
      errors.slice(0, 8).forEach((e) => log("   " + e));
      if (errors.length) failures++;
    } catch (e) {
      log("A FAILED:", e.message);
      await shot(page, "A-failure");
      failures++;
    }
    await ctx.close();
  }

  // ================= Scenario B: CAMERA PATH (regression) =================
  {
    const { ctx, page, errors } = await newPage(browser);
    try {
      await page.goto(URL, { waitUntil: "domcontentloaded" });
      await page.getByText(/Camera demo: Happy vs Sad/i).click({ timeout: 15000 });
      const turnOn = page.getByRole("button", { name: /Turn on camera/i });
      if (await turnOn.count()) await turnOn.first().click();
      await page.getByRole("button", { name: /Train & Play/i }).waitFor({ timeout: 90000 });
      log("B: camera demo ready");

      const cap = page.getByText(/hold to add examples/i);
      for (let i = 0; i < 2; i++) {
        const b = await cap.nth(i).boundingBox();
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(4000);
        await page.mouse.up();
        await page.waitForTimeout(300);
      }
      log("B: captured both classes");
      await page.getByRole("button", { name: /Train & Play/i }).click();
      await page.getByRole("button", { name: /Teach me more/i }).waitFor({ timeout: 90000 });
      log("B: ✅ camera path still works end-to-end");
      await shot(page, "B1-camera-live");

      log("B errors:", errors.length);
      errors.slice(0, 8).forEach((e) => log("   " + e));
      if (errors.length) failures++;
    } catch (e) {
      log("B FAILED:", e.message);
      await shot(page, "B-failure");
      failures++;
    }
    await ctx.close();
  }

  // ================= Scenario C: MOBILE VIEWPORT =================
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      permissions: ["camera"],
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      await page.goto(URL, { waitUntil: "domcontentloaded" });
      await page.getByText(/Drawing demo: no camera needed/i).click({ timeout: 15000 });
      await page.waitForTimeout(1500);
      await shot(page, "C1-mobile");
      const hScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      );
      log("C: horizontal overflow?", hScroll ? "❌ YES" : "✅ no");
      if (hScroll) failures++;
      log("C errors:", errors.length);
      if (errors.length) failures++;
    } catch (e) {
      log("C FAILED:", e.message);
      failures++;
    }
    await ctx.close();
  }

  await browser.close();
  log(failures === 0 ? "ALL SCENARIOS PASSED ✅" : `FAILURES: ${failures} ❌`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
