# Veyra Latency Lab

**Measure the Frames. Not the Hype.**

[在线测试](https://likely7.github.io/veyra-latency-lab/) · [GitHub 源码](https://github.com/Likely7/veyra-latency-lab)

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

## 三步测试

1. **准备连接与参数**：PBP 推荐。HDMI OUT 是参考画面，电脑 Veyra/OBS 是 USB 采集预览。核对显示 Hz、源视频 FPS、手机 FPS；默认 60Hz / 60FPS / 手机 120FPS。详细参数与事件数量在折叠的高级设置里。
2. **播放并拍摄**：PC 模式在真实 HDMI 信号源电脑启动网页，全屏倒计时 5 秒后自动播放；手机同时拍两区。外部设备模式下载并在真实 HDMI 设备播放，网页只记录用户的拍摄确认，不播放替代参考。PS5 等设备必须先确认播放器支持该文件与帧率，否则改用兼容 HDMI 播放器/PC。
3. **完成与复制**：第一轮直接进入结果，复制提示词并连同原始录像/ZIP 交给自己的 AI。第二轮可选：点击推荐按钮后实际交换显示位置。会话 JSON 和播放诊断默认收起，提示词预览可展开；复制失败会展开并选中全文。

60Hz 禁用 120FPS 源视频，但手机 120/240FPS 支持不变。刷新率不匹配会阻止标准测试，不能把配置匹配当成物理输出已经验证。无登录、数据库、排行榜、云视频分析或 AI API。

## 生成测试素材

需要 Python 3、FFmpeg（libx264 / drawtext）和 DejaVu Sans Mono Bold 字体。字体路径可在生成脚本中修改。

```bash
npm run generate:signals
# 或只生成一种帧率
python3 scripts/generate-signals.py --fps 60
npm run verify:signals
```

30/60/120FPS 各包含 20/50/100 事件素材，固定种子，V2 大号帧编号、事件号、FRAME16/CRC-8 机器码直接编码到 CFR 视频中。清单保存逐帧事件边界和 SHA-256。播放器使用媒体时间读取对应帧数据，JavaScript 计时器只用于准备倒计时。

验证脚本检查全部素材的帧数、每帧 PTS、帧率和摘要，并逐帧验证全部 9 份素材的编号区域唯一性、亮度变化、机器帧号及 CRC。生成器只在全部新增素材通过后才发布清单。视频与清单必须一起更新并重新构建。

[信号设计、播放器结构和完整测量边界](docs/measurement.md)。本站不能验证真实 HDMI 输出、物理扫描或采集芯片内部延迟；回调间隙不等于 HDMI 掉帧。0 帧差不等于 0ms。手机慢动作导出可能改变采样信息，请保留原始文件。

## 浏览器测试

```bash
# 使用本机 Chromium；默认 Linux /usr/bin/chromium
npm run dev
# 另一个终端
npm run test:e2e
# 其他系统指定 Chromium 路径
CHROMIUM_PATH=/path/to/chromium npm run test:e2e
```

覆盖三步单轮直达复制、第二轮可选与实际换位确认、源 FPS/Hz/手机 FPS 独立限制、外部源下载与未观察状态、剪贴板/手动复制、手机布局、中断和缺失诊断 API。截图位于忽略的 `artifacts/`，不会进入生产站点。

## 部署

`npm run build` 生成完全静态的 `dist/`，包含全部视频和清单。默认相对资源路径支持子目录部署。无需 SPA 路由重写、环境密钥或服务端。

**GitHub Pages**：将项目推入仓库，Settings → Pages → Source 选择 GitHub Actions。仓库内 `.github/workflows/pages.yml` 会执行安装、类型检查、核心测试、构建并发布 `dist/`。如果需要固定绝对子路径，可使用 `BASE_PATH=/your-repo/ npm run build`。

**Vercel**：导入仓库，选择 Vite；Build command 为 `npm run build`，Output directory 为 `dist`。`vercel.json` 为测试视频设置可重验证缓存，避免修改后持有旧素材。本站本身不需要身份验证；托管平台的访问控制由部署者决定。

请不要把原始录像提交到网站仓库；网站仅提供信号素材与分析提示词。

## 许可证

[MIT License](LICENSE)，Copyright (c) 2026 Likely7。
