import { useEffect, useRef, useState } from "react";
import { Maximize, X, AlertTriangle, Play, Download } from "lucide-react";
import {
  frameAt,
  refreshCompatible,
  type Diagnostics,
  type Language,
  type RoundResult,
  type Settings,
  type Signal,
} from "../core";
interface Props {
  signal: Signal;
  settings: Settings;
  session: string;
  round: number;
  lang: Language;
  onFinish: (r: RoundResult) => void;
  onBack: () => void;
}
export default function TestPlayer({
  signal,
  settings,
  session,
  round,
  lang,
  onFinish,
  onBack,
}: Props) {
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const container = useRef<HTMLDivElement>(null),
    video = useRef<HTMLVideoElement>(null),
    active = useRef(false),
    callback = useRef(0),
    previous = useRef<number | null>(null),
    lastUI = useRef(0),
    baseline = useRef(0),
    deadline = useRef(0);
  const [phase, setPhase] = useState<
    "loading" | "ready" | "countdown" | "playing" | "error"
  >("loading");
  const [countdown, setCountdown] = useState(5),
    [error, setError] = useState(""),
    [frame, setFrame] = useState(frameAt(0, signal)),
    [cadence, setCadence] = useState<number | null>(null),
    [fullscreen, setFullscreen] = useState(false),
    [snapshot, setSnapshot] = useState<{
      gaps: number;
      dropped: number | null;
    }>({ gaps: 0, dropped: null });
  const diag = useRef<Diagnostics>({
    callbacks: 0,
    callbackGaps: 0,
    repeatedTimestamps: 0,
    dropped: null,
    finalFrame: 0,
    issues: [],
    cadence: null,
    rvfc: false,
    complete: false,
  });
  useEffect(
    () => () => {
      active.current = false;
    },
    [],
  );
  const asset = `${import.meta.env.BASE_URL}signals/${signal.file}`;
  function issue(value: string) {
    if (!diag.current.issues.includes(value)) diag.current.issues.push(value);
  }
  function finish(complete: boolean, reason?: string) {
    if (!active.current) return;
    active.current = false;
    if (reason) issue(reason);
    const v = video.current!;
    v.pause();
    diag.current.complete = complete;
    const q = v.getVideoPlaybackQuality?.();
    diag.current.dropped = q
      ? Math.max(0, q.droppedVideoFrames - baseline.current)
      : null;
    if ((diag.current.dropped ?? 0) > 0)
      issue("Browser reported decoder/compositor frame drops");
    if (!diag.current.rvfc)
      issue(
        "requestVideoFrameCallback unavailable: playback stability unverified",
      );
    if (diag.current.callbacks === 0)
      issue("No video frame callbacks observed: stability unverified");
    if (diag.current.callbackGaps > 0)
      issue("Media-time gaps observed (not proof of physical output drops)");
    if (diag.current.repeatedTimestamps > 0)
      issue(
        "Repeated callback media timestamps observed (physical repeats unverified)",
      );
    if (document.fullscreenElement === container.current)
      void document.exitFullscreen().catch(() => {});
    onFinish({
      round,
      diagnostics: { ...diag.current, issues: [...diag.current.issues] },
    });
  }
  useEffect(() => {
    let id = 0;
    const intervals: number[] = [];
    let last = 0;
    function sample(now: number) {
      if (last && now - last < 100) intervals.push(now - last);
      last = now;
      if (intervals.length < 90) {
        id = requestAnimationFrame(sample);
      } else {
        const sorted = intervals.sort((a, b) => a - b);
        setCadence(Math.round(1000 / sorted[Math.floor(sorted.length / 2)]));
      }
    }
    id = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    const v = video.current!;
    let disposed = false;
    function tick(now: number, meta: VideoFrameCallbackMetadata) {
      if (disposed) return;
      if (active.current && phase === "playing") {
        const d = diag.current;
        d.callbacks++;
        const f = frameAt(meta.mediaTime, signal);
        f.presentedFrames = meta.presentedFrames;
        d.finalFrame = f.id;
        if (previous.current !== null) {
          const delta = Math.round(
            (meta.mediaTime - previous.current) * signal.fps,
          );
          if (delta === 0) d.repeatedTimestamps++;
          if (delta > 1) d.callbackGaps += delta - 1;
        }
        previous.current = meta.mediaTime;
        if (now - lastUI.current > 200) {
          lastUI.current = now;
          setFrame(f);
          setSnapshot({
            gaps: d.callbackGaps,
            dropped: v.getVideoPlaybackQuality
              ? Math.max(
                  0,
                  v.getVideoPlaybackQuality().droppedVideoFrames -
                    baseline.current,
                )
              : null,
          });
        }
      }
      if (!disposed) callback.current = v.requestVideoFrameCallback(tick);
    }
    if ("requestVideoFrameCallback" in v)
      callback.current = v.requestVideoFrameCallback(tick);
    const hidden = () => {
      if (document.hidden && active.current)
        finish(false, "Page hidden during countdown or playback");
    };
    const full = () => {
      const state = document.fullscreenElement === container.current;
      setFullscreen(state);
      if (active.current && !state)
        issue("Fullscreen exited: verify image geometry and readability");
    };
    document.addEventListener("visibilitychange", hidden);
    document.addEventListener("fullscreenchange", full);
    return () => {
      disposed = true;
      v.cancelVideoFrameCallback?.(callback.current);
      document.removeEventListener("visibilitychange", hidden);
      document.removeEventListener("fullscreenchange", full);
    };
    // The callback is renewed on phase changes; diagnostic storage survives them.
  }, [phase, signal]);
  useEffect(() => {
    if (phase !== "countdown") return;
    const timer = window.setInterval(() => {
      const left = Math.max(
        0,
        Math.ceil((deadline.current - performance.now()) / 1000),
      );
      setCountdown(left);
      if (left === 0) {
        clearInterval(timer);
        setPhase("playing");
        video.current!.play().catch(() => {
          active.current = false;
          setError(
            t(
              "浏览器拒绝播放，请重新点击开始。",
              "Playback rejected. Click start again.",
            ),
          );
          setPhase("error");
        });
      }
    }, 80);
    return () => clearInterval(timer);
  }, [phase]);
  async function begin() {
    const v = video.current!;
    setError("");
    diag.current = {
      callbacks: 0,
      callbackGaps: 0,
      repeatedTimestamps: 0,
      dropped: null,
      finalFrame: 0,
      issues: [],
      cadence,
      rvfc: typeof v.requestVideoFrameCallback === "function",
      complete: false,
    };
    previous.current = null;
    baseline.current = v.getVideoPlaybackQuality?.().droppedVideoFrames ?? 0;
    v.currentTime = 0;
    if (!refreshCompatible(settings.refresh, settings.fps))
      issue(
        "User supplied refresh is incompatible with uniform target-frame presentation",
      );
    if (
      cadence === null ||
      Math.abs(cadence - settings.refresh) > settings.refresh * 0.08
    )
      issue(
        "Browser callback cadence does not confirm supplied refresh; physical presentation unverified",
      );
    if (window.innerWidth < 768)
      issue("Mobile source screen: PC HDMI output is recommended");
    try {
      await container.current?.requestFullscreen();
    } catch {
      issue("Fullscreen unavailable; windowed fallback");
      setError(
        t(
          "浏览器无法进入全屏，使用窗口模式。请确保信号区域完整可见。",
          "Fullscreen unavailable. Windowed fallback; keep the entire signal visible.",
        ),
      );
    }
    active.current = true;
    deadline.current = performance.now() + 5000;
    setCountdown(5);
    setPhase("countdown");
  }
  return (
    <div className="test-player" ref={container}>
      <video
        ref={video}
        src={asset}
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        controls={false}
        onCanPlay={() => setPhase((p) => (p === "loading" ? "ready" : p))}
        onError={() => {
          if (active.current)
            finish(false, "Video decode or media loading error");
          else {
            setError(
              t(
                "测试素材加载或解码失败。请检查网络或换用最新版 Chrome / Edge。",
                "Signal failed to load or decode. Check network or use current Chrome / Edge.",
              ),
            );
            setPhase("error");
          }
        }}
        onEnded={() => finish(true)}
        onWaiting={() => {
          if (active.current && phase === "playing")
            issue("Playback buffering observed");
        }}
        onStalled={() => {
          if (active.current) issue("Media fetch stalled");
        }}
        onRateChange={() => {
          if (video.current?.playbackRate !== 1 && active.current)
            finish(false, "Playback rate changed");
        }}
        onPause={() => {
          if (active.current && phase === "playing" && !video.current?.ended)
            finish(false, "Playback interrupted");
        }}
      />
      {phase === "loading" || phase === "ready" || phase === "error" ? (
        <div className="player-gate">
          <button className="back-link" onClick={onBack}>
            <X size={16} />
            {t("返回设置", "Back to setup")}
          </button>
          <span className="eyebrow">SIGNAL CHECK / ROUND {round}</span>
          <h2>{t("让每一帧，有据可查。", "Make every frame count.")}</h2>
          <p>
            {signal.fps} FPS · {signal.eventCount} {t("次变化", "events")} ·{" "}
            {signal.duration.toFixed(1)}s · H.264 CFR
          </p>
          <div className="notice">
            <AlertTriangle size={18} />
            <span>
              {t(
                "光敏性提示：测试方块每 0.4–0.8 秒改变亮度。对闪光敏感者请勿观看。",
                "Photosensitivity: a local square changes brightness every 0.4–0.8 s. Do not watch if sensitive to flashes.",
              )}
            </span>
          </div>
          <p className="muted">
            {t(
              "将此页面放在 HDMI 信号源电脑上，手机同时拍到参考画面与采集预览。页面不会自动打开采集预览。",
              "Run this page on the HDMI source PC. Film both the reference and capture preview. Open your preview separately.",
            )}
          </p>
          <div className="preflight">
            <span>
              {t(
                "浏览器回调节奏（估计）",
                "Browser callback cadence (estimate)",
              )}
            </span>
            <b>{cadence ?? "—"} Hz</b>
            <span>
              {t("真实显示扫描 / HDMI 输出", "Physical scan / HDMI output")}
            </span>
            <b>{t("无法验证", "Unverified")}</b>
          </div>
          {(!refreshCompatible(settings.refresh, settings.fps) ||
            cadence === null ||
            Math.abs((cadence ?? 0) - settings.refresh) >
              settings.refresh * 0.08) && (
            <p className="warning">
              {t(
                "刷新率不匹配或无法确认，无法保证逐帧输出。本次仅可作为带限制的观察记录，不能宣称测试有效。",
                "Refresh mismatch or unconfirmed cadence: uniform frame output is not guaranteed. This run is limited observation, not a validated test.",
              )}
            </p>
          )}
          {error && (
            <p role="alert" className="warning">
              {error}
            </p>
          )}
          <button
            className="button primary"
            disabled={
              phase === "loading" ||
              (phase === "error" && video.current?.readyState === 0)
            }
            onClick={begin}
          >
            <Maximize size={17} />
            {phase === "loading"
              ? t("正在加载真实测试素材…", "Loading encoded signal…")
              : t(
                  "进入全屏并开始 · 5 秒倒计时",
                  "Enter fullscreen · 5-second countdown",
                )}
          </button>
          <a className="back-link" href={asset} download={signal.file}>
            <Download size={15} />
            {t(
              "下载源视频，用于外部 HDMI 信号源",
              "Download signal for an external HDMI source",
            )}
          </a>
        </div>
      ) : (
        <>
          <div className="session-overlay">
            <span>
              SESSION <b>{session}</b>
            </span>
            <span>
              ROUND {round}/2 · TARGET {settings.fps} FPS
            </span>
          </div>
          {phase === "countdown" && (
            <div className="countdown">
              <span>{t("手机开始录制", "Start recording on your phone")}</span>
              <strong>{countdown}</strong>
              <span>
                {t(
                  "保持两个区域处于相同垂直高度",
                  "Align both regions at the same vertical height",
                )}
              </span>
            </div>
          )}
          <div className="player-diagnostics">
            <span>
              FRAME {String(frame.id).padStart(6, "0")} · EVENT{" "}
              {String(frame.eventId).padStart(3, "0")}{" "}
              <small>{t("回调快照", "callback snapshot")}</small>
            </span>
            <span>
              {t("浏览器掉帧", "Browser drops")}{" "}
              {snapshot.dropped ?? t("不可用", "unavailable")} ·{" "}
              {t("回调间隙", "Callback gaps")} {snapshot.gaps} ·{" "}
              {t("物理输出未验证", "Physical output unverified")}
            </span>
            <button onClick={() => finish(false, "Stopped by user")}>
              <X size={15} />
              {t("停止", "Stop")}
            </button>
          </div>
          {error && !fullscreen && <div className="fallback-note">{error}</div>}
        </>
      )}
    </div>
  );
}
