import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("Responsive bilingual setup, honest warnings and full two-round flow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /How Much Latency/ }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/home-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(
    page.getByRole("button", { name: "Start a test", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "切换中文" }).click();
  await page.getByRole("button", { name: "开始测试", exact: true }).click();
  await page.getByLabel("实际显示器刷新率").fill("144");
  await expect(page.getByText("刷新率不是源 FPS 的整数倍")).toBeVisible();
  await page.getByLabel("实际显示器刷新率").fill("60");
  await page.getByLabel("手机拍摄帧率").selectOption("30");
  await expect(page.getByText("低采样精度：")).toBeVisible();
  await page.getByLabel("手机拍摄帧率").selectOption("240");
  await page.getByLabel("采集卡型号").fill("Test Card");
  await page.getByRole("button", { name: "20 快速", exact: true }).click();
  await page.screenshot({
    path: "artifacts/setup-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "下一步：拍摄检查" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "加载测试信号" }).click();
  await expect(
    page.getByRole("button", { name: /进入全屏并开始/ }),
  ).toBeEnabled();
  await page.getByRole("button", { name: /进入全屏并开始/ }).click();
  await expect(page.locator(".countdown strong")).toHaveText("5");
  await expect(page.locator(".countdown")).toBeHidden({ timeout: 8000 });
  await page.screenshot({ path: "artifacts/player.png" });
  await expect(
    page.getByRole("heading", { name: "第 1 轮播放完成。" }),
  ).toBeVisible({ timeout: 25000 });
  await expect(page.getByRole("button", { name: "继续第二轮" })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "继续第二轮" }).click();
  await page.getByRole("button", { name: /进入全屏并开始/ }).click();
  await expect(
    page.getByRole("heading", { name: "第 2 轮播放完成。" }),
  ).toBeVisible({ timeout: 25000 });
  await page.getByRole("button", { name: "结束并生成分析提示词" }).click();
  await expect(page.locator("#analysis-prompt")).toContainText("Test Card");
  await expect(page.locator("#analysis-prompt")).toContainText(
    "ROUND 2: complete=true",
  );
  await expect(page.locator("#analysis-prompt")).not.toContainText(
    "callbacks=0",
  );
  await page.getByRole("button", { name: "复制完整分析提示词" }).click();
  await expect(
    page.getByRole("button", { name: "已复制", exact: true }),
  ).toBeVisible();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toContain("240 FPS");
  expect(clipboard).toContain("绝对不要");
  await page.screenshot({
    path: "artifacts/results-desktop.png",
    fullPage: true,
  });
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载会话 JSON" }).click();
  const file = await downloaded;
  const data = JSON.parse(await readFile((await file.path())!, "utf8"));
  expect(data.rounds).toHaveLength(2);
  for (const r of data.rounds) {
    expect(r.diagnostics.callbacks).toBeGreaterThan(100);
    expect(r.diagnostics.finalFrame).toBeGreaterThan(700);
    expect(r.diagnostics.complete).toBe(true);
  }
  expect(data.physicalOutputVerified).toBe(false);
  await page.getByRole("button", { name: "准备新的测试" }).click();
  await page.getByRole("button", { name: "30 FPS", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /04.*复制提示词/ }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});
test("Mobile layout and deliberate stop preserves incomplete status", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "artifacts/home-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "开始测试", exact: true }).click();
  await expect(page.getByLabel("手机拍摄帧率")).toHaveValue("120");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "artifacts/setup-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "下一步：拍摄检查" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "加载测试信号" }).click();
  await page.getByRole("button", { name: /进入全屏并开始/ }).click();
  await page.getByRole("button", { name: "停止", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "第 1 轮已中断。" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "结束并生成分析提示词" }).click();
  await expect(page.locator("#analysis-prompt")).toContainText(
    "complete=false",
  );
});
