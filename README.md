# Veyra Latency Lab

**Measure the Frames. Not the Hype.**

React + TypeScript + Vite + Tailwind CSS 的浏览器本地延迟测试工作台。默认中文，支持英文、PC 和手机。无账户、数据库、录像上传、AI API 或服务器分析。

## 运行

需要 Node.js 20.19+（推荐 22）。真实测试视频已包含在 `public/signals/`，日常构建不依赖 FFmpeg。

```bash
npm ci
npm run dev
```

打开终端打印的地址。生产构建和本地预览：

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

## 测试流程

1. 接线：源 HDMI → 采集卡 IN，OUT → 显示器输入 1；USB → 采集电脑，GPU → 显示器输入 2。开启 PBP，在另一路打开 Veyra/OBS 采集预览。
2. 在**信号源的 HDMI 输出桌面**打开本站，核对源 FPS、系统实际刷新率及拍摄 FPS。默认 60FPS / 60Hz / 120FPS / 50 事件。
3. 阅读拍摄检查和光敏性提醒，加载素材，点击全屏开始。5 秒准备后自动播放。使用手机同时拍到参考及预览，尽量让两区处于同一高度。
4. 第一轮结束，建议在显示器菜单中实际交换 PBP 两个输入的位置，再测第二轮。第二轮可跳过。
5. 复制包含设置、素材哈希和播放诊断的提示词，将它和原始视频/ZIP 提交给自己的 AI。可下载会话 JSON，保留每次运行的诊断与事件表。

双屏和同机 HDMI 回环也有独立说明。外部播放器可在测试预检屏下载对应源视频；会话叠加信息来自网页，不会写入下载视频。外部播放器输出稳定性需另行核对，网页诊断仅描述网页播放。

## 生成测试素材

需要 Python 3、FFmpeg（libx264 / drawtext）和 DejaVu Sans Mono Bold 字体。字体路径可在生成脚本中修改。

```bash
npm run generate:signals
# 或只生成一种帧率
python3 scripts/generate-signals.py --fps 60
npm run verify:signals
```

30/60/120FPS 各包含 20/50/100 事件素材，固定种子，帧号与事件号直接烧录到 CFR 视频中。清单保存逐帧事件边界和 SHA-256。播放器使用媒体时间读取对应帧数据，JavaScript 计时器只用于准备倒计时。

验证脚本检查全部素材的帧数、每帧 PTS、帧率和摘要，并对完整序列解码验证编号区域唯一性与全部亮度变化。视频与清单必须一起更新并重新构建。

[信号设计、播放器结构和完整测量边界](docs/measurement.md)。本站不能验证真实 HDMI 输出、物理扫描或采集芯片内部延迟；回调间隙不等于 HDMI 掉帧。0 帧差不等于 0ms。手机慢动作导出可能改变采样信息，请保留原始文件。

## 浏览器测试

```bash
# 使用本机 Chromium；默认 Linux /usr/bin/chromium
npm run dev
# 另一个终端
npx playwright test
# 其他系统指定 Chromium 路径
CHROMIUM_PATH=/path/to/chromium npx playwright test
```

覆盖中英文、参数警告、两轮真实正常速度视频播放、实际换位确认、剪贴板、手机布局及中断状态。截图位于忽略的 `artifacts/`，不会进入生产站点。

## 部署

`npm run build` 生成完全静态的 `dist/`，包含全部视频和清单。默认相对资源路径支持子目录部署。无需 SPA 路由重写、环境密钥或服务端。

**GitHub Pages**：将项目推入仓库，Settings → Pages → Source 选择 GitHub Actions。仓库内 `.github/workflows/pages.yml` 会执行安装、类型检查、核心测试、构建并发布 `dist/`。如果需要固定绝对子路径，可使用 `BASE_PATH=/your-repo/ npm run build`。

**Vercel**：导入仓库，选择 Vite；Build command 为 `npm run build`，Output directory 为 `dist`。`vercel.json` 为测试视频设置可重验证缓存，避免修改后持有旧素材。本站本身不需要身份验证；托管平台的访问控制由部署者决定。

请不要把原始录像提交到网站仓库；网站仅提供信号素材与分析提示词。
