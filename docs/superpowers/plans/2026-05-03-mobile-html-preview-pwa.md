# 手机端纯前端 HTML 预览网站 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个面向手机浏览器的纯前端 HTML 预览 PWA，支持粘贴 HTML、一键预览、添加到主屏幕和离线打开工具本体。

**Architecture:** 采用原生 `HTML + CSS + JavaScript` 单页结构，以 `iframe.srcdoc` 承载用户输入的 HTML，并通过 `sandbox` 做最小权限隔离。站点通过 `manifest.json` 和 `Service Worker` 提供 PWA 安装与离线能力，自动化验证采用 Playwright 在移动端视口下做端到端测试。

**Tech Stack:** 原生 HTML、CSS、JavaScript、Playwright、Service Worker、Web App Manifest

---

## 文件结构与职责

- `package.json`
  - 声明最小 Node 工具链，只用于运行 Playwright 测试。
- `playwright.config.js`
  - 定义移动端视口、基于 `python3 -m http.server` 的本地静态服务，以及测试目录。
- `tests/app.spec.js`
  - 覆盖首页基础结构、预览流程、清空流程、PWA 元信息、离线能力、安全隔离等端到端验证。
- `index.html`
  - 提供应用外壳、标题说明、输入区、操作按钮、安装引导和预览容器。
- `style.css`
  - 提供移动端优先样式、编辑态与预览态切换样式、按钮和说明文案布局。
- `app.js`
  - 绑定 DOM 事件，处理预览、清空、返回编辑、状态切换和 Service Worker 注册。
- `manifest.json`
  - 定义 PWA 名称、图标、启动地址、主题色和显示模式。
- `sw.js`
  - 缓存应用静态资源，保证站点壳在离线状态下仍可打开。
- `icons/icon.svg`
  - 提供轻量级主图标资源，供 manifest 和页面图标使用。
- `README.md`
  - 补充本地运行、测试命令、产品边界和离线说明。

## 实施约束

- 不引入前端框架、状态管理库或打包器。
- 不加入本期范围外能力，例如历史记录、本地导出、云端存储、多文件联调。
- `iframe` 必须保留 `sandbox`，且不得启用 `allow-same-origin`。
- 离线能力只覆盖工具自身静态资源，不缓存用户粘贴的 HTML 或其外链资源。

### Task 1: 初始化测试工具链与页面骨架

**Files:**
- Create: `package.json`
- Create: `playwright.config.js`
- Create: `tests/app.spec.js`
- Create: `index.html`
- Create: `style.css`
- Create: `app.js`

- [ ] **Step 1: 创建最小测试工具链文件**

```json
{
  "name": "mobile-html-preview-pwa",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "test": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.53.0"
  }
}
```

```js
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    ...devices["Pixel 7"],
    baseURL: "http://127.0.0.1:4173"
  },
  webServer: {
    command: "python3 -m http.server 4173 --directory .",
    port: 4173,
    reuseExistingServer: !process.env.CI
  }
});
```

- [ ] **Step 2: 写首页骨架的失败测试**

```js
const { test, expect } = require("@playwright/test");

test("首页展示标题、输入框和主操作按钮", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("HTML 预览器");
  await expect(page.getByRole("heading", { name: "HTML 预览器" })).toBeVisible();
  await expect(page.getByLabel("HTML 输入框")).toBeVisible();
  await expect(page.getByRole("button", { name: "预览" })).toBeVisible();
  await expect(page.getByRole("button", { name: "清空" })).toBeVisible();
});
```

- [ ] **Step 3: 安装依赖并运行测试，确认失败**

Run:

```bash
npm install
npx playwright install chromium
npm test
```

Expected:

```text
FAIL tests/app.spec.js
Error: expect(page).toHaveTitle("HTML 预览器")
```

- [ ] **Step 4: 创建最小页面骨架，让首页测试转绿**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HTML 预览器</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <main class="app">
      <header class="hero">
        <h1>HTML 预览器</h1>
        <p>复制 AI 生成的 HTML，粘贴后即可在手机上预览。</p>
      </header>

      <section class="editor-panel">
        <label class="field-label" for="html-input">HTML 输入框</label>
        <textarea
          id="html-input"
          class="html-input"
          placeholder="请粘贴完整 HTML 代码"
        ></textarea>
        <div class="actions">
          <button id="preview-button" type="button">预览</button>
          <button id="clear-button" type="button">清空</button>
        </div>
      </section>
    </main>

    <script src="./app.js"></script>
  </body>
</html>
```

```css
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f5f7fb;
  color: #1f2937;
}

.app {
  padding: 16px;
}

.hero h1 {
  margin-bottom: 8px;
}

.html-input {
  width: 100%;
  min-height: 320px;
  box-sizing: border-box;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}
```

```js
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("html-input");
  const clearButton = document.getElementById("clear-button");

  clearButton.addEventListener("click", () => {
    input.value = "";
  });
});
```

- [ ] **Step 5: 重新运行首页测试，确认通过**

Run:

```bash
npm test
```

Expected:

```text
1 passed
```

- [ ] **Step 6: 提交页面骨架与测试工具链**

```bash
git add package.json playwright.config.js tests/app.spec.js index.html style.css app.js
git commit -m "chore: scaffold static app and playwright tests"
```

### Task 2: 实现 HTML 预览与 iframe 沙箱

**Files:**
- Modify: `tests/app.spec.js`
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`

- [ ] **Step 1: 为预览流程补充失败测试**

把下面这个测试追加到 `tests/app.spec.js`：

```js
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
```

- [ ] **Step 2: 运行测试，确认缺少预览容器导致失败**

Run:

```bash
npm test
```

Expected:

```text
FAIL tests/app.spec.js
locator("#preview-frame")
```

- [ ] **Step 3: 实现预览区、iframe 与预览逻辑**

在 `index.html` 的 `.editor-panel` 后追加：

```html
      <section class="preview-panel">
        <div class="preview-toolbar">
          <h2>预览结果</h2>
          <button id="back-button" type="button">返回编辑</button>
        </div>
        <iframe
          id="preview-frame"
          title="HTML 预览结果"
          sandbox="allow-scripts"
        ></iframe>
      </section>
```

在 `style.css` 末尾追加：

```css
.preview-panel {
  margin-top: 16px;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

#preview-frame {
  width: 100%;
  min-height: 360px;
  border: 1px solid #d0d7e2;
  border-radius: 16px;
  background: #ffffff;
}
```

将 `app.js` 替换为：

```js
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("html-input");
  const previewButton = document.getElementById("preview-button");
  const clearButton = document.getElementById("clear-button");
  const backButton = document.getElementById("back-button");
  const previewFrame = document.getElementById("preview-frame");

  const renderPreview = () => {
    const html = input.value.trim();
    previewFrame.srcdoc =
      html ||
      `
        <!doctype html>
        <html lang="zh-CN">
          <body>
            <p>请先粘贴 HTML 内容。</p>
          </body>
        </html>
      `;
  };

  previewButton.addEventListener("click", renderPreview);

  clearButton.addEventListener("click", () => {
    input.value = "";
    previewFrame.srcdoc = "";
  });

  backButton.addEventListener("click", () => {
    input.focus();
  });
});
```

- [ ] **Step 4: 重新运行测试，确认预览能力通过**

Run:

```bash
npm test
```

Expected:

```text
2 passed
```

- [ ] **Step 5: 提交预览能力**

```bash
git add tests/app.spec.js index.html style.css app.js
git commit -m "feat: add iframe html preview flow"
```

### Task 3: 完成清空流程、视图切换与移动端布局

**Files:**
- Modify: `tests/app.spec.js`
- Modify: `index.html`
- Modify: `style.css`
- Modify: `app.js`

- [ ] **Step 1: 补充清空与视图切换的失败测试**

把下面两个测试追加到 `tests/app.spec.js`：

```js
test("点击清空后输入框与预览内容都会被重置", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("HTML 输入框").fill("<p id='message'>会被清空</p>");
  await page.getByRole("button", { name: "预览" }).click();
  await expect(page.frameLocator("#preview-frame").locator("#message")).toHaveText("会被清空");

  await page.getByRole("button", { name: "清空" }).click();

  await expect(page.getByLabel("HTML 输入框")).toHaveValue("");
  await expect(page.frameLocator("#preview-frame").locator("body")).toContainText("请先粘贴 HTML 内容。");
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
```

- [ ] **Step 2: 运行测试，确认状态切换尚未实现**

Run:

```bash
npm test
```

Expected:

```text
FAIL tests/app.spec.js
Expected string: "editor"
Received: null
```

- [ ] **Step 3: 实现编辑态/预览态切换与移动端样式**

将 `index.html` 的 `<body>` 改为：

```html
  <body data-view="editor">
```

把 `style.css` 追加为：

```css
.app {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px 16px 32px;
}

.hero p {
  margin-top: 0;
  line-height: 1.5;
  color: #4b5563;
}

.editor-panel,
.preview-panel {
  background: #ffffff;
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.field-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

.html-input {
  border: 1px solid #d0d7e2;
  border-radius: 16px;
  padding: 14px;
  font-size: 16px;
  line-height: 1.5;
  resize: vertical;
}

.actions button,
.preview-toolbar button {
  border: 0;
  border-radius: 999px;
  padding: 12px 18px;
  font-size: 15px;
  font-weight: 600;
}

#preview-button {
  background: #2563eb;
  color: #ffffff;
}

#clear-button,
#back-button {
  background: #e5e7eb;
  color: #111827;
}

body[data-view="editor"] .preview-panel {
  display: none;
}

body[data-view="preview"] .editor-panel {
  display: none;
}

body[data-view="preview"] .preview-panel {
  display: block;
}
```

将 `app.js` 替换为：

```js
document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const input = document.getElementById("html-input");
  const previewButton = document.getElementById("preview-button");
  const clearButton = document.getElementById("clear-button");
  const backButton = document.getElementById("back-button");
  const previewFrame = document.getElementById("preview-frame");

  const emptyDoc = `
    <!doctype html>
    <html lang="zh-CN">
      <body>
        <p>请先粘贴 HTML 内容。</p>
      </body>
    </html>
  `;

  const showEditor = () => {
    body.setAttribute("data-view", "editor");
    input.focus();
  };

  const showPreview = () => {
    body.setAttribute("data-view", "preview");
  };

  const renderPreview = () => {
    previewFrame.srcdoc = input.value.trim() || emptyDoc;
    showPreview();
  };

  previewButton.addEventListener("click", renderPreview);

  clearButton.addEventListener("click", () => {
    input.value = "";
    previewFrame.srcdoc = emptyDoc;
    showEditor();
  });

  backButton.addEventListener("click", showEditor);

  previewFrame.srcdoc = emptyDoc;
});
```

- [ ] **Step 4: 重新运行测试，确认清空与视图切换通过**

Run:

```bash
npm test
```

Expected:

```text
4 passed
```

- [ ] **Step 5: 提交交互完善与移动端样式**

```bash
git add tests/app.spec.js index.html style.css app.js
git commit -m "feat: add mobile layout and view switching"
```

### Task 4: 增加 PWA 元信息、安装引导与图标

**Files:**
- Modify: `tests/app.spec.js`
- Modify: `index.html`
- Create: `manifest.json`
- Create: `icons/icon.svg`

- [ ] **Step 1: 为 PWA 元信息和安装引导补充失败测试**

把下面两个测试追加到 `tests/app.spec.js`：

```js
test("页面暴露 manifest、主题色和主屏幕引导文案", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "./manifest.json");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#111827");
  await expect(page.getByText("Android 建议使用浏览器的安装或添加到主屏幕功能。")).toBeVisible();
  await expect(page.getByText("iPhone 请在 Safari 分享菜单中选择“添加到主屏幕”。")).toBeVisible();
});

test("manifest 文件返回正确的应用名称与显示模式", async ({ request }) => {
  const response = await request.get("http://127.0.0.1:4173/manifest.json");
  expect(response.ok()).toBeTruthy();

  const manifest = await response.json();
  expect(manifest.name).toBe("HTML 预览器");
  expect(manifest.display).toBe("standalone");
});
```

- [ ] **Step 2: 运行测试，确认 manifest 尚未提供**

Run:

```bash
npm test
```

Expected:

```text
FAIL tests/app.spec.js
404 Not Found /manifest.json
```

- [ ] **Step 3: 实现 manifest、图标与安装引导**

在 `index.html` 的 `<head>` 中追加：

```html
    <meta name="theme-color" content="#111827" />
    <link rel="manifest" href="./manifest.json" />
    <link rel="icon" href="./icons/icon.svg" type="image/svg+xml" />
```

在 `index.html` 的 `.app` 底部追加：

```html
      <section class="install-panel" aria-label="安装说明">
        <h2>添加到主屏幕</h2>
        <p>Android 建议使用浏览器的安装或添加到主屏幕功能。</p>
        <p>iPhone 请在 Safari 分享菜单中选择“添加到主屏幕”。</p>
      </section>
```

在 `manifest.json` 中写入：

```json
{
  "name": "HTML 预览器",
  "short_name": "HTML预览",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#f5f7fb",
  "theme_color": "#111827",
  "icons": [
    {
      "src": "./icons/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml"
    }
  ]
}
```

在 `icons/icon.svg` 中写入：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="120" fill="#111827" />
  <path
    d="M150 156h212c30.928 0 56 25.072 56 56v88c0 30.928-25.072 56-56 56H150c-30.928 0-56-25.072-56-56v-88c0-30.928 25.072-56 56-56Z"
    fill="#2563eb"
  />
  <path
    d="M188 226h136M188 286h96"
    stroke="#ffffff"
    stroke-linecap="round"
    stroke-width="28"
  />
</svg>
```

- [ ] **Step 4: 重新运行测试，确认 PWA 元信息通过**

Run:

```bash
npm test
```

Expected:

```text
6 passed
```

- [ ] **Step 5: 提交 PWA 元信息与安装说明**

```bash
git add tests/app.spec.js index.html manifest.json icons/icon.svg
git commit -m "feat: add pwa metadata and install guidance"
```

### Task 5: 注册 Service Worker 并验证离线打开

**Files:**
- Modify: `tests/app.spec.js`
- Modify: `app.js`
- Create: `sw.js`

- [ ] **Step 1: 为 Service Worker 注册和离线重载补充失败测试**

把下面两个测试追加到 `tests/app.spec.js`：

```js
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
```

- [ ] **Step 2: 运行测试，确认尚未注册 Service Worker**

Run:

```bash
npm test
```

Expected:

```text
FAIL tests/app.spec.js
navigator.serviceWorker.ready
```

- [ ] **Step 3: 实现 Service Worker 注册与静态缓存**

在 `app.js` 文件末尾追加：

```js
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("service worker register failed", error);
    });
  });
}
```

创建 `sw.js`：

```js
const CACHE_NAME = "html-preview-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse.ok) {
          return networkResponse;
        }

        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      });
    })
  );
});
```

- [ ] **Step 4: 重新运行测试，确认离线打开能力通过**

Run:

```bash
npm test
```

Expected:

```text
8 passed
```

- [ ] **Step 5: 提交离线能力**

```bash
git add tests/app.spec.js app.js sw.js
git commit -m "feat: add offline app shell caching"
```

### Task 6: 校验安全边界并补充使用文档

**Files:**
- Modify: `tests/app.spec.js`
- Modify: `README.md`

- [ ] **Step 1: 补充 iframe 隔离与 README 内容的失败测试**

把下面的安全测试追加到 `tests/app.spec.js`：

```js
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
```

- [ ] **Step 2: 运行完整测试，确认安全断言通过，再补使用文档**

Run:

```bash
npm test
```

Expected:

```text
9 passed
```

- [ ] **Step 3: 将 README 更新为可交付说明**

把 `README.md` 替换为：

````md
# HTML-Shower

手机端纯前端 HTML 预览工具。

## 功能范围

- 粘贴 AI 生成的 HTML 后一键预览
- 支持添加到主屏幕
- 支持离线打开工具本体

## 非目标

- 不保存用户粘贴的 HTML
- 不提供云端同步
- 不支持多文件项目

## 本地开发

1. 安装依赖

```bash
npm install
npx playwright install chromium
```

2. 启动本地静态服务

```bash
python3 -m http.server 4173 --directory .
```

3. 打开浏览器访问

```text
http://127.0.0.1:4173
```

## 测试

```bash
npm test
```

## 离线说明

- 离线可用的是本站工具页面
- 用户 HTML 若依赖远程图片、样式或脚本，断网时可能无法完整显示
- 若想提高离线成功率，请尽量使用单文件 HTML
````

- [ ] **Step 4: 再次运行完整测试，确认 README 变更未引入回归**

Run:

```bash
npm test
```

Expected:

```text
9 passed
```

- [ ] **Step 5: 提交安全验证与文档**

```bash
git add tests/app.spec.js README.md
git commit -m "docs: clarify usage and security boundaries"
```

## 自检清单

- 规格要求“粘贴 HTML + 一键预览”由 Task 1 到 Task 3 覆盖。
- 规格要求“添加到主屏幕”由 Task 4 的 manifest、图标和引导文案覆盖。
- 规格要求“离线可用”由 Task 5 的 Service Worker 与离线重载测试覆盖。
- 规格要求“安全隔离”由 Task 2 的 `sandbox="allow-scripts"` 和 Task 6 的隔离测试覆盖。
- 本计划未引入超出规格的历史记录、导出文件、云端能力或复杂框架，符合范围约束。
