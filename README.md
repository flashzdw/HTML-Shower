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
