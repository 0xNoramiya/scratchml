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

  // ================= Scenario L: LANDING PAGE =================
  {
    const { ctx, page, errors } = await newPage(browser);
    try {
      await page.goto(URL, { waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: /Teach a computer/i }).waitFor({ timeout: 15000 });
      await shot(page, "L1-landing");
      await page.getByRole("link", { name: /Start building/i }).click();
      await page.waitForURL("**/studio", { timeout: 15000 });
      await page.getByText(/Drawing demo: no camera needed/i).waitFor({ timeout: 15000 });
      log("L: ✅ landing renders, CTA reaches the studio + onboarding");

      // regression: picking a demo AFTER the model loaded must not reset
      // modelStatus to idle and strand the GO button on "loading brain…"
      await page.getByRole("button", { name: /Train & Play/i }).waitFor({ timeout: 90000 });
      await page.getByText(/Drawing demo: no camera needed/i).click();
      await page.waitForTimeout(2500);
      const goText = await page
        .getByRole("button", { name: /Train & Play|loading brain/i })
        .first()
        .innerText();
      if (/Train & Play/i.test(goText)) log("L: ✅ demo picked after model-ready keeps GO ready");
      else { log("L: ❌ GO stuck after picking demo: " + goText); failures++; }
      log("L errors:", errors.length);
      if (errors.length) { errors.slice(0, 8).forEach((e) => log("   " + e)); failures++; }
    } catch (e) {
      log("L FAILED:", e.message);
      await shot(page, "L-failure");
      failures++;
    }
    await ctx.close();
  }

  // ================= Scenario A: SKETCH PATH (no webcam) =================
  {
    const { ctx, page, errors } = await newPage(browser);
    try {
      await page.goto(URL + "/studio?demo=sketch", { waitUntil: "domcontentloaded" });
      log("A: sketch demo loaded (deep link)");
      await page.getByRole("button", { name: /Train & Play/i }).waitFor({ timeout: 90000 });
      log("A: model ready");
      await shot(page, "A1-sketch-studio");

      const pad = page.getByTestId("sketchpad");
      const box = await pad.boundingBox();
      if (!box) throw new Error("no sketchpad box");

      for (let i = 0; i < 6; i++) {
        await drawCircle(page, box, box.width / 2 + (i - 2) * 8, box.height / 2, 56 + i * 6);
        await page.getByText(/add this drawing/i).nth(0).click();
        await page.waitForTimeout(250);
      }
      log("A: added 6 circles");

      await page.getByRole("button", { name: /Delete this example/i }).first().click();
      await page.waitForTimeout(300);
      const counts = await page
        .locator("span.shrink-0.rounded-full")
        .filter({ hasText: /^\d+$/ })
        .allInnerTexts();
      if (counts[0] === "5") log("A: ✅ per-image delete works (6 → 5)");
      else { log(`A: ❌ per-image delete failed, count chip: ${JSON.stringify(counts)}`); failures++; }

      await page.getByRole("button", { name: /Red crayon/i }).click();
      for (let i = 0; i < 5; i++) {
        await drawSquare(page, box, box.width / 2 + (i - 2) * 8, box.height / 2, 45 + i * 7);
        await page.getByText(/add this drawing/i).nth(1).click();
        await page.waitForTimeout(250);
      }
      log("A: added 5 red squares");

      await drawCircle(page, box, box.width / 4, box.height / 4, 20);
      await page.getByRole("button", { name: /^Undo$/i }).click();
      await page.waitForTimeout(200);
      const addBtnText = await page.getByText(/draw on the pad first|add this drawing/i).first().innerText();
      if (/draw on the pad first/i.test(addBtnText)) log("A: ✅ undo restores a clean pad");
      else { log("A: ❌ undo did not clean the pad: " + addBtnText); failures++; }
      await shot(page, "A2-samples");

      await page.getByRole("button", { name: /Train & Play/i }).click();
      await page.getByRole("button", { name: /Add more examples/i }).waitFor({ timeout: 90000 });
      log("A: trained, live");
      // Layout shifts when live view renders (bars + toast) — re-query the pad box.
      await page.waitForTimeout(600);
      const liveBox = await pad.boundingBox();
      if (!liveBox) throw new Error("no live sketchpad box");

      await page.getByRole("button", { name: "Ink crayon", exact: true }).click();
      await drawCircle(page, liveBox, liveBox.width / 2, liveBox.height / 2, 72);
      await page.waitForTimeout(2600); // let EMA settle
      await shot(page, "A3-live-guess");
      const badge = await page.locator(".wiggle").first().innerText().catch(() => "");
      log("A: badge:", JSON.stringify(badge.replace(/\n/g, " ")));
      if (/circle/i.test(badge)) log("A: ✅ correctly recognized the drawn circle");
      else { log("A: ❌ did not recognize circle"); failures++; }

      await page.getByRole("button", { name: /Clear the pad/i }).click();
      await page.getByRole("button", { name: /Red crayon/i }).click();
      await page.waitForTimeout(300);
      await drawSquare(page, liveBox, liveBox.width / 2, liveBox.height / 2, 60);
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
      await page.goto(URL + "/studio?demo=camera", { waitUntil: "domcontentloaded" });
      const turnOn = page.getByRole("button", { name: /Turn on camera/i });
      await turnOn.first().waitFor({ timeout: 30000 });
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
      await page.getByRole("button", { name: /Add more examples/i }).waitFor({ timeout: 90000 });
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
      await page.goto(URL + "/studio?demo=sketch", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      await shot(page, "C1-mobile");
      const hScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      );
      log("C: horizontal overflow?", hScroll ? "❌ YES" : "✅ no");
      if (hScroll) failures++;

      // Primary CTA must be reachable on small phones, not stranded below an inner-scroll cap.
      const go = page.getByRole("button", { name: /Train & Play/i });
      await go.scrollIntoViewIfNeeded();
      const goBox = await go.boundingBox();
      const vp = page.viewportSize();
      const goVisible = !!goBox && goBox.y >= 0 && goBox.y + goBox.height <= vp.height + 2;
      log("C: GO button reachable on mobile?", goVisible ? "✅ yes" : "❌ no");
      if (!goVisible) failures++;

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
