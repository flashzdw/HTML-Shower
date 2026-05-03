const { test, expect } = require("@playwright/test");

test("首页展示标题、输入框和主操作按钮", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("HTML 预览器");
  await expect(page.getByRole("heading", { name: "HTML 预览器" })).toBeVisible();
  await expect(page.getByLabel("HTML 输入框")).toBeVisible();
  await expect(page.getByRole("button", { name: "预览" })).toBeVisible();
  await expect(page.getByRole("button", { name: "清空" })).toBeVisible();
});

test("用户粘贴 HTML 后可以在 iframe 中预览结果", async ({ page }) => {
  await page.goto("/");

  const sampleHtml = `
    <!doctype html>
    <html>
      <body>
        <h2 id="preview-title">你好，预览</h2>
      </body>
    </html>
  `;

  await page.getByLabel("HTML 输入框").fill(sampleHtml);
  await page.getByRole("button", { name: "预览" }).click();

  const frame = page.frameLocator("#preview-frame");
  await expect(frame.locator("#preview-title")).toHaveText("你好，预览");
  await expect(page.locator("#preview-frame")).toHaveAttribute("sandbox", "allow-scripts");
});

test("点击清空后输入框与预览内容都会被重置", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("HTML 输入框").fill("<p id='message'>会被清空</p>");
  await page.getByRole("button", { name: "预览" }).click();
  await expect(page.frameLocator("#preview-frame").locator("#message")).toHaveText("会被清空");

  await page.getByRole("button", { name: "清空" }).click();

  await expect(page.getByLabel("HTML 输入框")).toHaveValue("");
  await expect(page.frameLocator("#preview-frame").locator("body")).toContainText(
    "请先粘贴 HTML 内容。"
  );
});

test("点击预览后进入预览态，点击返回编辑后回到编辑态", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("body")).toHaveAttribute("data-view", "editor");

  await page.getByLabel("HTML 输入框").fill("<p>切换视图</p>");
  await page.getByRole("button", { name: "预览" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-view", "preview");

  await page.getByRole("button", { name: "返回编辑" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-view", "editor");
});

test("页面暴露 manifest、主题色和主屏幕引导文案", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "./manifest.json");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#111827");
  await expect(
    page.getByText("Android 建议使用浏览器的安装或添加到主屏幕功能。")
  ).toBeVisible();
  await expect(
    page.getByText("iPhone 请在 Safari 分享菜单中选择“添加到主屏幕”。")
  ).toBeVisible();
});

test("manifest 文件返回正确的应用名称与显示模式", async ({ request }) => {
  const response = await request.get("http://127.0.0.1:4173/manifest.json");
  expect(response.ok()).toBeTruthy();

  const manifest = await response.json();
  expect(manifest.name).toBe("HTML 预览器");
  expect(manifest.display).toBe("standalone");
});

test("页面加载后成功注册 service worker", async ({ page }) => {
  await page.goto("/");

  const controller = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active !== null;
  });

  expect(controller).toBeTruthy();
});

test("缓存应用壳后，离线重新加载仍能打开首页", async ({ page, context }) => {
  await page.goto("/");

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole("heading", { name: "HTML 预览器" })).toBeVisible();
  await expect(page.getByLabel("HTML 输入框")).toBeVisible();
});

test("预览脚本可以在 iframe 内执行，但不能改写宿主页面标题", async ({ page }) => {
  await page.goto("/");

  const sampleHtml = `
    <!doctype html>
    <html>
      <body>
        <div id="status">before</div>
        <script>
          document.getElementById("status").textContent = "after";
          try {
            parent.document.title = "被篡改";
          } catch (error) {
            document.body.dataset.parentBlocked = "yes";
          }
        </script>
      </body>
    </html>
  `;

  await page.getByLabel("HTML 输入框").fill(sampleHtml);
  await page.getByRole("button", { name: "预览" }).click();

  const frame = page.frameLocator("#preview-frame");
  await expect(frame.locator("#status")).toHaveText("after");
  await expect(frame.locator("body")).toHaveAttribute("data-parent-blocked", "yes");
  await expect(page).toHaveTitle("HTML 预览器");
});
