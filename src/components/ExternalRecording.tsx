import { useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download } from "lucide-react";
import {
  configuredStandard,
  externalRound,
  type Signal,
  type Language,
  type RoundResult,
  type Settings,
} from "../core";
interface Props {
  signal: Signal;
  settings: Settings;
  lang: Language;
  round: number;
  onFinish: (result: RoundResult) => void;
  onBack: () => void;
}
export default function ExternalRecording({
  signal,
  settings,
  lang,
  round,
  onFinish,
  onBack,
}: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const t = (z: string, e: string) => (lang === "zh" ? z : e);
  return (
    <section className="panel external-recording">
      <span className="eyebrow">
        02 / FILM THE EXTERNAL SOURCE · ROUND {round}
      </span>
      <h1>
        {t(
          "测试视频，必须在信号源上播放。",
          "Play the signal on the HDMI source.",
        )}
      </h1>
      <div className="notice important">
        <AlertTriangle size={20} />
        <p>
          {t(
            "PS5 等外部设备 → HDMI 参考画面；电脑 Veyra/OBS → USB 采集预览。只在预览电脑打开网页，不能测试这条外部 HDMI 路径。",
            "External device such as PS5 → HDMI reference. PC Veyra/OBS → USB preview. Opening this page only on the preview PC does not test the external HDMI path.",
          )}
        </p>
      </div>
      <ol>
        <li>
          {t(
            "下载素材并传到外部设备，用支持该格式和帧率的播放器全屏、1×速度播放。",
            "Transfer the downloaded signal to the external device; play fullscreen at 1× using a compatible player.",
          )}
        </li>
        <li>
          {t(
            "确认设备能实际播放该素材；部分 PS5 应用或设备不支持此文件/帧率，不能仅假设支持。若不支持，请改用兼容的 HDMI 播放器或 PC 信号源。",
            "Confirm support for this file and FPS. Some PS5 apps/devices cannot play it; do not assume support. Use a compatible HDMI player or a PC source instead.",
          )}
        </li>
        <li>
          {t(
            "手机同时拍到 HDMI 参考与 USB 预览，同高度、固定机位，并保留原始录像。",
            "Film both HDMI reference and USB preview, aligned vertically with a steady phone. Keep the original recording.",
          )}
        </li>
      </ol>
      <div className="run-summary">
        <span>
          {settings.fps} FPS {t("源", "source")}
        </span>
        <span>
          {settings.refresh} Hz {t("显示", "monitor")}
        </span>
        <span>
          {settings.camera} FPS {t("手机", "phone")}
        </span>
      </div>
      <a
        className="button secondary"
        href={`${import.meta.env.BASE_URL}signals/${signal.file}`}
        download={signal.file}
      >
        <Download size={16} />
        {t("下载源视频", "Download source signal")}
      </a>
      <p className="muted technical-note">
        {t(
          "本页不播放伪参考画面，也没有观察外部播放器。完成状态只记录你的拍摄确认，外部帧输出和稳定性均未验证。",
          "This page does not show a substitute reference or observe the external player. Completion records your confirmation only; external frame output and stability remain unverified.",
        )}
      </p>
      <label className="checkbox-line">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span>
          {t(
            "我已在真实 HDMI 信号源上播放下载素材，并完成本轮手机拍摄。",
            "I played the downloaded signal on the actual HDMI source and finished filming this round.",
          )}
        </span>
      </label>
      <button
        className="button primary"
        disabled={!confirmed || !configuredStandard(settings)}
        onClick={() => onFinish(externalRound(round))}
      >
        <CheckCircle2 size={17} />
        {t("完成拍摄，生成提示词", "Finish recording and generate prompt")}
      </button>
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={15} />
        {t("返回准备", "Back to preparation")}
      </button>
    </section>
  );
}
