import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Download,
  Info,
  SlidersHorizontal,
} from "lucide-react";
import {
  configuredStandard,
  refreshCompatible,
  modeName,
  type Settings,
  type Signal,
  type Language,
} from "../core";
interface Props {
  settings: Settings;
  signal?: Signal;
  lang: Language;
  loadError: string;
  ack: boolean;
  onAck: (ack: boolean) => void;
  onStart: () => void;
  onChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}
export default function PreparationControls({
  settings: s,
  signal,
  lang,
  loadError,
  ack,
  onAck,
  onStart,
  onChange,
}: Props) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  return (
    <aside className="panel settings-panel">
      <div className="panel-heading">
        <h3>
          <SlidersHorizontal size={18} />
          {t("测试参数", "Test parameters")}
        </h3>
        <span className="mono muted">CFR V2</span>
      </div>
      <div className="field">
        <label htmlFor="refresh">
          {t("显示器刷新率", "Monitor refresh rate")}
          <span className="unit">Hz</span>
        </label>
        <input
          id="refresh"
          type="number"
          min="24"
          max="1000"
          value={s.refresh}
          onChange={(e) => onChange("refresh", Number(e.target.value))}
        />
        <small>
          {t(
            "从系统显示设置核对实际 Hz；此值不是浏览器测量。",
            "Confirm actual Hz in system display settings; this is not a browser measurement.",
          )}
        </small>
      </div>
      <div className="field">
        <label>
          {t("源视频帧率", "Source video frame rate")}
          <span className="tag">{t("60FPS 标准", "60FPS STANDARD")}</span>
        </label>
        <div className="segmented">
          {[30, 60, 120].map((fps) => (
            <button
              key={fps}
              className={s.fps === fps ? "active" : ""}
              disabled={!refreshCompatible(s.refresh, fps)}
              onClick={() => onChange("fps", fps)}
            >
              {fps} FPS
            </button>
          ))}
        </div>
        <small>
          {t(
            "60Hz 显示器使用 60FPS 源；120FPS 源需匹配 120/240Hz 等刷新率。",
            "Use a 60FPS source at 60Hz. A 120FPS source needs compatible 120/240Hz refresh.",
          )}
        </small>
      </div>
      <div className="field">
        <label htmlFor="camera">
          {t("手机拍摄帧率", "Phone recording frame rate")}
          <span className="unit">FPS</span>
        </label>
        <select
          id="camera"
          value={s.camera}
          onChange={(e) => onChange("camera", Number(e.target.value))}
        >
          {[30, 60, 120, 240, 480, 960].map((fps) => (
            <option key={fps} value={fps}>
              {fps} FPS
              {fps === 120
                ? t(" · 标准推荐", " · Recommended")
                : fps === 240
                  ? t(" · 更高精度", " · Finer sampling")
                  : ""}
            </option>
          ))}
        </select>
        <small className={s.camera <= 60 ? "warning" : ""}>
          {s.camera <= 60
            ? t(
                "低采样精度：30/60FPS 可能遗漏变化起始时刻。",
                "Low sampling precision: 30/60FPS may miss event onset.",
              )
            : t(
                `相机采样间隔约 ${(1000 / s.camera).toFixed(2)} ms，与源 FPS 和显示器 Hz 不同。`,
                `Camera sampling ≈ ${(1000 / s.camera).toFixed(2)} ms; independent of source FPS and monitor Hz.`,
              )}
        </small>
      </div>
      <details className="advanced-settings">
        <summary>
          {t("高级设置", "Advanced settings")}
          <ChevronDown size={16} />
        </summary>
        <div className="advanced-content">
          <div className="field">
            <label htmlFor="card">
              {t("采集卡型号", "Capture card model")}
              <span className="unit">{t("选填", "Optional")}</span>
            </label>
            <input
              id="card"
              placeholder="Elgato HD60 X"
              maxLength={120}
              value={s.card}
              onChange={(e) => onChange("card", e.target.value)}
            />
          </div>
          <div className="field-pair">
            <div className="field">
              <label htmlFor="format">{t("采集格式", "Capture format")}</label>
              <select
                id="format"
                value={s.format}
                onChange={(e) => onChange("format", e.target.value)}
              >
                {["YUY2", "NV12", "MJPEG", "Other"].map((x) => (
                  <option key={x} value={x}>
                    {x === "Other" ? t("其他", "Other") : x}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="software">{t("测试软件", "Test software")}</label>
              <select
                id="software"
                value={s.software}
                onChange={(e) => onChange("software", e.target.value)}
              >
                {["Veyra", "OBS", "Other"].map((x) => (
                  <option key={x} value={x}>
                    {x === "Other" ? t("其他", "Other") : x}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>{t("事件数量", "Event count")}</label>
            <div className="segmented mode-options">
              {[20, 50, 100].map((n) => (
                <button
                  key={n}
                  className={s.count === n ? "active" : ""}
                  onClick={() => onChange("count", n)}
                >
                  <b>{n}</b>
                  <span>{modeName(n, lang)}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="muted technical-note">
            {t(
              "V2 素材：逐帧大号数字 + FRAME16 / CRC-8 校验码。CRC 仅检测读码错误，不证明物理输出。",
              "V2 signal: large digits + FRAME16 / CRC-8. CRC detects reading errors, not physical output stability.",
            )}
          </p>
        </div>
      </details>
      {!configuredStandard(s) && (
        <p role="alert" className="warning">
          {t(
            "此刷新率无法匹配所选源 FPS，不能启动标准测试。请先在系统中切换到 60/120Hz 等匹配刷新率，并如实填写。",
            "Refresh does not match the source FPS; standard testing is blocked. Switch the display to compatible 60/120Hz refresh and enter the actual value.",
          )}
        </p>
      )}
      <div className="settings-footnote">
        <Info size={15} />
        <p>
          {t(
            "源 FPS 决定内容步进，显示器 Hz 决定刷新，手机 FPS 决定相机采样。真实扫描和 HDMI 输出仍无法由浏览器验证。",
            "Source FPS controls content steps, monitor Hz controls refresh, phone FPS controls sampling. Physical scan and HDMI output remain unverified.",
          )}
        </p>
      </div>
      {s.source === "external" && signal && (
        <a
          className="button secondary full-width"
          href={`${import.meta.env.BASE_URL}signals/${signal.file}`}
          download={signal.file}
        >
          <Download size={16} />
          {t(
            "下载源视频（在外部设备播放）",
            "Download signal (play on external source)",
          )}
        </a>
      )}
      <div className="notice compact-notice">
        <AlertTriangle size={16} />
        <span>
          {t(
            "亮度方块与小型帧码会变化。对闪光敏感者请勿观看。固定手机，两个画面同高度，保留高帧率原始文件。",
            "The brightness square and small frame-code strip change. Avoid viewing if sensitive to flashes. Fix the phone, align both images, keep the original high-FPS file.",
          )}
        </span>
      </div>
      <label className="checkbox-line">
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => onAck(e.target.checked)}
        />
        <span>
          {t(
            "已核对连接与拍摄设置，了解光敏性提醒和测量局限。",
            "I checked connections and recording settings and understand the photosensitivity notice and measurement limits.",
          )}
        </span>
      </label>
      {loadError && (
        <p className="warning" role="alert">
          {t("素材清单加载失败：", "Manifest failed: ")}
          {loadError}
        </p>
      )}
      <button
        className="button primary full-width"
        disabled={!signal || !ack || !configuredStandard(s)}
        onClick={onStart}
      >
        {s.source === "external"
          ? t("继续：在外部源拍摄", "Continue: film external source")
          : t("开始测试", "Start test")}
        <ArrowRight size={17} />
      </button>
      <p className="center-note">
        {signal
          ? `${signal.duration.toFixed(1)}s · ${s.count} ${t("事件 · 第二轮可选", "events · round 2 optional")}`
          : t("正在加载素材清单…", "Loading signal manifest…")}
      </p>
    </aside>
  );
}
