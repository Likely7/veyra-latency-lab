import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
async function prepare(page: Page) {
  await page.goto("./");
  await page.getByRole("button", { name: "开始测试", exact: true }).click();
}
async function quick(page: Page) {
  await page.getByText("高级设置", { exact: true }).click();
  await page.getByRole("button", { name: "20 快速", exact: true }).click();
  await page.getByText("高级设置", { exact: true }).click();
}
async function launch(page: Page) {
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "开始测试", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /进入全屏并开始/ }),
  ).toBeEnabled();
  await page.getByRole("button", { name: /进入全屏并开始/ }).click();
}
async function ended(page: Page) {
  await expect(
    page.getByRole("heading", { name: "录像就绪，交给你的 AI。" }),
  ).toBeVisible({ timeout: 26000 });
}
async function session(page: Page) {
  await page.getByText("高级设置：会话与播放诊断", { exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载会话 JSON" }).click();
  return JSON.parse(await readFile((await (await download).path())!, "utf8"));
}

test("Three-step ordinary flow: one real round leads directly to copy, advanced data stays closed", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "三步，把延迟变成证据。" }),
  ).toBeVisible();
  expect(await page.locator(".step-card").count()).toBe(3);
  await page.screenshot({ path: "artifacts/home-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Three steps. Evidence in every frame.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "切换中文" }).click();
  await page.getByRole("button", { name: "开始测试", exact: true }).click();
  expect(await page.locator(".workflow>button").count()).toBe(3);
  await expect(page.getByLabel("采集卡型号")).toBeHidden();
  await page.getByLabel("手机拍摄帧率").selectOption("240");
  await quick(page);
  await page.screenshot({
    path: "artifacts/setup-desktop.png",
    fullPage: true,
  });
  await launch(page);
  await expect(page.locator(".countdown strong")).toHaveText("5");
  await expect(page.locator(".countdown")).toBeHidden({ timeout: 8000 });
  await page.waitForFunction(
    () => document.querySelector("video")!.currentTime > 2,
  );
  await page.screenshot({ path: "artifacts/player.png" });
  await ended(page);
  await expect(page.locator("#analysis-prompt")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "复制完整分析提示词" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "继续第二轮" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "下载会话 JSON" }),
  ).toBeHidden();
  await page.getByRole("button", { name: "复制完整分析提示词" }).click();
  await expect(
    page.getByRole("button", { name: "已复制", exact: true }),
  ).toBeVisible();
  const prompt = await page.evaluate(() => navigator.clipboard.readText());
  expect(prompt).toContain("240 FPS");
  expect(prompt).toContain("Signal: V2");
  expect(prompt).toContain("CRC-8/SMBUS");
  expect(prompt).toContain("ROUND 1: complete=true");
  await page.screenshot({
    path: "artifacts/results-desktop.png",
    fullPage: true,
  });
  const data = await session(page);
  expect(data.rounds).toHaveLength(1);
  expect(data.rounds[0].diagnostics.callbacks).toBeGreaterThan(100);
  expect(data.rounds[0].diagnostics.finalFrame).toBeGreaterThan(700);
  expect(data.signal.frameCode.cells).toBe(32);
  expect(data.physicalOutputVerified).toBe(false);
  expect(errors).toEqual([]);
});
test("Second round is opt-in, requires physical swap, preserves both completed rounds", async ({
  page,
}) => {
  await prepare(page);
  await quick(page);
  await launch(page);
  await ended(page);
  await page
    .getByRole("button", { name: "推荐：交换位置再测第二轮（可选）" })
    .click();
  await expect(page.getByRole("button", { name: "继续第二轮" })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "继续第二轮" }).click();
  await page.getByRole("button", { name: /进入全屏并开始/ }).click();
  await ended(page);
  await expect(page.locator("#analysis-prompt")).toContainText(
    "ROUND 2: complete=true",
  );
  const data = await session(page);
  expect(data.rounds.map((r: { round: number }) => r.round)).toEqual([1, 2]);
  await page.getByRole("button", { name: "准备新的测试" }).click();
  await page.getByRole("button", { name: "30 FPS", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /03.*完成与复制提示词/ }),
  ).toBeDisabled();
});
test("Monitor Hz limits source FPS but does not limit phone FPS, and invalid standards are blocked", async ({
  page,
}) => {
  await prepare(page);
  await expect(page.getByLabel("显示器刷新率")).toHaveValue("60");
  await expect(
    page.getByRole("button", { name: "60 FPS", exact: true }),
  ).toHaveClass(/active/);
  await expect(
    page.getByRole("button", { name: "120 FPS", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("手机拍摄帧率").selectOption("240");
  await expect(page.getByLabel("手机拍摄帧率")).toHaveValue("240");
  await page.getByLabel("显示器刷新率").fill("120");
  await page.getByRole("button", { name: "120 FPS", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "120 FPS", exact: true }),
  ).toHaveClass(/active/);
  await page.getByLabel("显示器刷新率").fill("60");
  await expect(
    page.getByRole("button", { name: "60 FPS", exact: true }),
  ).toHaveClass(/active/);
  await expect(
    page.getByRole("button", { name: "120 FPS", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("显示器刷新率").fill("144");
  await page.getByRole("checkbox").check();
  await expect(
    page.getByRole("button", { name: "开始测试", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("不能启动标准测试");
  await page.getByLabel("显示器刷新率").fill("60");
  await page.getByLabel("手机拍摄帧率").selectOption("30");
  await expect(page.getByText("低采样精度：")).toBeVisible();
});
test("External/PS5 flow downloads actual signal and never treats preview-PC playback as external reference", async ({
  page,
}) => {
  await prepare(page);
  await quick(page);
  await page.getByRole("button", { name: "外部设备（PS5 等）" }).click();
  await expect(
    page.getByText("必须在外部 HDMI 信号源上播放下载视频"),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "下载源视频（在外部设备播放）" })
    .click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("signal-v2-60-20.mp4");
  const bytes = await readFile((await file.path())!);
  const manifest = JSON.parse(
    await readFile("public/signals/manifest.json", "utf8"),
  );
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    manifest.signals["60-20"].sha256,
  );
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "继续：在外部源拍摄" }).click();
  await expect(page.locator("video")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "完成拍摄，生成提示词" }),
  ).toBeDisabled();
  await expect(page.getByText("本页不播放伪参考画面")).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "完成拍摄，生成提示词" }).click();
  await ended(page);
  await expect(page.locator("#analysis-prompt")).toContainText(
    "source=external",
  );
  await expect(page.locator("#analysis-prompt")).toContainText(
    "external_recording_confirmed=true",
  );
  await expect(page.locator("#analysis-prompt")).toContainText(
    "complete=false",
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator.clipboard, "writeText", {
      value: () => Promise.reject(new Error("Clipboard blocked")),
    }),
  );
  await page.getByRole("button", { name: "复制完整分析提示词" }).click();
  await expect(page.getByRole("alert")).toContainText("自动复制不可用");
  await expect(page.locator("#analysis-prompt")).toBeVisible();
  expect(
    await page
      .locator("#analysis-prompt")
      .evaluate(
        (area: HTMLTextAreaElement) => area.selectionEnd - area.selectionStart,
      ),
  ).toBeGreaterThan(1000);
  const data = await session(page);
  expect(data.rounds[0].source).toBe("external");
  expect(data.rounds[0].diagnostics.dropped).toBeNull();
  expect(data.rounds[0].diagnostics.complete).toBe(false);
  expect(data.rounds[0].recordingConfirmed).toBe(true);
});
test("Mobile and interrupted run: no overflow, no completed claim and no compulsory round two", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "artifacts/setup-mobile.png", fullPage: true });
  await launch(page);
  await page.getByRole("button", { name: "停止", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "已保存异常记录。" }),
  ).toBeVisible();
  await expect(page.locator("#analysis-prompt")).toContainText(
    "complete=false",
  );
  await expect(
    page.getByRole("button", { name: "重新运行本轮" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "推荐：交换位置再测第二轮（可选）" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("Unavailable frame callbacks and quality APIs are recorded as unverified, without JS errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(
      HTMLVideoElement.prototype,
      "requestVideoFrameCallback",
      { value: undefined },
    );
    Object.defineProperty(
      HTMLVideoElement.prototype,
      "getVideoPlaybackQuality",
      { value: undefined },
    );
  });
  await prepare(page);
  await launch(page);
  await page.getByRole("button", { name: "停止", exact: true }).click();
  await expect(page.locator("#analysis-prompt")).toContainText(
    "browser decoder drops=unavailable",
  );
  await expect(page.locator("#analysis-prompt")).toContainText(
    "requestVideoFrameCallback unavailable",
  );
  expect(errors).toEqual([]);
});
