import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronRight,
  ChevronDown,
  Copy,
  Download,
  Monitor,
  Smartphone,
  Activity,
  ShieldCheck,
  Clock3,
  Layers,
  SlidersHorizontal,
  Info,
  AlertTriangle,
  CheckCircle2,
  MoveHorizontal,
  Play,
  RotateCcw,
  Menu,
  X,
} from "lucide-react";
import TestPlayer from "./components/TestPlayer";
import {
  defaults,
  makePrompt,
  methodName,
  modeName,
  refreshCompatible,
  type Language,
  type Settings,
  type Signal,
  type RoundResult,
} from "./core";
type Page = "home" | "setup" | "filming" | "player" | "between" | "results";
function Wiring({
  lang,
  method,
}: {
  lang: Language;
  method: Settings["method"];
}) {
  const t = (z: string, e: string) => (lang === "zh" ? z : e);
  return (
    <svg
      viewBox="0 0 790 335"
      role="img"
      aria-label={t(
        "HDMI 信号源经过采集卡直通至参考屏；USB 至电脑，GPU 至采集预览屏",
        "Source HDMI through capture card to reference; USB to PC; GPU to preview display",
      )}
      className="wiring"
    >
      <defs>
        <marker
          id="arrow"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <path d="M0 0L8 4L0 8" fill="#b3f46b" />
        </marker>
        <marker
          id="dim-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <path d="M0 0L8 4L0 8" fill="#82909a" />
        </marker>
      </defs>
      <g fill="#13191e" stroke="#3a424a">
        <rect x="24" y="78" width="152" height="95" rx="7" />
        <rect x="288" y="81" width="158" height="90" rx="7" />
        <rect x="560" y="45" width="205" height="170" rx="7" />
        <rect x="578" y="64" width="169" height="117" rx="2" />
        <rect x="288" y="247" width="158" height="68" rx="7" />
      </g>
      <g
        fill="#e9eef1"
        fontSize="15"
        fontFamily="sans-serif"
        textAnchor="middle"
      >
        <text x="100" y="118">
          {t("HDMI 信号源", "HDMI source")}
        </text>
        <text x="100" y="144" fill="#82909a" fontSize="12">
          {method === "loop"
            ? t("同一台电脑", "Same PC")
            : t("电脑 / 外部播放器", "PC / external player")}
        </text>
        <text x="367" y="121">
          {t("采集卡", "Capture card")}
        </text>
        <text x="367" y="147" fill="#82909a" fontSize="12">
          HDMI IN → OUT
        </text>
        <text x="367" y="276">
          {t("采集电脑", "Capture PC")}
        </text>
        <text x="367" y="298" fill="#82909a" fontSize="12">
          Veyra / OBS
        </text>
        <text x="662" y="202" fontSize="12">
          {method === "pbp"
            ? t("显示器 · 开启 PBP", "Monitor · PBP enabled")
            : t("参考屏 + 预览屏", "Reference + preview screens")}
        </text>
      </g>
      <path
        d="M176 114H285M446 114H555"
        fill="none"
        stroke="#b3f46b"
        strokeWidth="2"
        markerEnd="url(#arrow)"
      />
      <path
        d="M367 174V240"
        stroke="#82909a"
        strokeWidth="2"
        fill="none"
        markerEnd="url(#dim-arrow)"
      />
      <path
        d="M446 280H526V159H556"
        stroke="#82909a"
        strokeWidth="2"
        strokeDasharray="5 4"
        fill="none"
        markerEnd="url(#dim-arrow)"
      />
      <g
        fill="#b3f46b"
        fontSize="11"
        textAnchor="middle"
        fontFamily="monospace"
      >
        <text x="231" y="98">
          HDMI
        </text>
        <text x="499" y="98">
          INPUT 1
        </text>
      </g>
      <g
        fill="#82909a"
        fontSize="11"
        textAnchor="middle"
        fontFamily="monospace"
      >
        <text x="396" y="214">
          USB
        </text>
        <text x="486" y="268">
          GPU
        </text>
        <text x="519" y="149">
          INPUT 2
        </text>
      </g>
      <path d="M662 65V180" stroke="#3a424a" />
      <g fontFamily="monospace" textAnchor="middle">
        <text x="620" y="112" fill="#b3f46b" fontSize="10">
          REFERENCE
        </text>
        <text x="706" y="112" fill="#82909a" fontSize="10">
          CAPTURE
        </text>
        <text x="620" y="145" fill="white" fontSize="14">
          00125
        </text>
        <text x="706" y="145" fill="white" fontSize="14">
          00124
        </text>
      </g>
      <text x="26" y="318" fill="#69767f" fontSize="11">
        {t("示意数字，不是测量结果", "Illustration only — not a measurement")}
      </text>
    </svg>
  );
}
function App() {
  const [lang, setLang] = useState<Language>("zh"),
    [page, setPage] = useState<Page>("home"),
    [settings, setSettings] = useState<Settings>(defaults),
    [manifest, setManifest] = useState<Record<string, Signal> | null>(null),
    [loadError, setLoadError] = useState(""),
    [rounds, setRounds] = useState<RoundResult[]>([]),
    [round, setRound] = useState(1),
    [swapped, setSwapped] = useState(false),
    [ack, setAck] = useState(false),
    [session, setSession] = useState(""),
    [copied, setCopied] = useState(false),
    [copyError, setCopyError] = useState(false),
    [mobileMenu, setMobileMenu] = useState(false);
  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const signal = manifest?.[`${settings.fps}-${settings.count}`];
  useEffect(() => {
    let live = true;
    fetch(`${import.meta.env.BASE_URL}signals/manifest.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!data.signals?.["60-50"]) throw new Error("Invalid manifest");
        if (live) setManifest(data.signals);
      })
      .catch((e) => {
        if (live) setLoadError(String(e));
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);
  function navigate(next: Page) {
    setPage(next);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function configure<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
    setAck(false);
    setRounds([]);
    setSession("");
    setRound(1);
    setSwapped(false);
  }
  function start() {
    setSession(
      `VL-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
    );
    setRounds([]);
    setRound(1);
    setSwapped(false);
    navigate("player");
  }
  function finished(result: RoundResult) {
    setRounds((old) => [
      ...old.filter((r) => r.round !== result.round),
      result,
    ]);
    navigate("between");
  }
  const prompt = signal
    ? makePrompt(settings, session, rounds, signal, lang)
    : "";
  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError(true);
      document.querySelector<HTMLTextAreaElement>("#analysis-prompt")?.select();
    }
  }
  function exportSession() {
    if (!signal) return;
    const blob = new Blob(
      [
        JSON.stringify(
          { session, settings, signal, rounds, physicalOutputVerified: false },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const steps = [
    t("准备设备", "Prepare"),
    t("运行测试", "Run test"),
    t("手机拍摄", "Film"),
    t("复制提示词", "Copy prompt"),
  ];
  if (page === "player" && signal)
    return (
      <TestPlayer
        key={`${session}-${round}`}
        {...{ signal, settings, session, round, lang }}
        onFinish={finished}
        onBack={() => navigate("filming")}
      />
    );
  return (
    <div className="app-shell">
      <header className="site-header">
        <button
          className="brand"
          onClick={() => navigate("home")}
          aria-label="Veyra Latency Lab home"
        >
          <span className="brand-mark">V</span>
          <span>
            veyra<span className="brand-divider">/</span>
            <span className="brand-sub">LATENCY LAB</span>
          </span>
        </button>
        <nav className={mobileMenu ? "nav-links open" : "nav-links"}>
          <button
            className={page === "home" ? "selected" : ""}
            onClick={() => navigate("home")}
          >
            {t("概览", "Overview")}
          </button>
          <button
            className={page === "setup" ? "selected" : ""}
            onClick={() => navigate("setup")}
          >
            {t("测试工作台", "Test bench")}
          </button>
          <button
            className={page === "filming" ? "selected" : ""}
            onClick={() => navigate("filming")}
          >
            {t("拍摄指南", "Filming guide")}
          </button>
          <button
            onClick={() => {
              navigate("home");
              setTimeout(
                () =>
                  document
                    .getElementById("principle")
                    ?.scrollIntoView({ behavior: "smooth" }),
                30,
              );
            }}
          >
            {t("测试原理", "The method")}
          </button>
        </nav>
        <div className="header-actions">
          <span className="local-status">
            <i />
            {t("浏览器本地运行", "LOCAL FIRST")}
          </span>
          <button
            className="language-toggle"
            onClick={() => setLang((l) => (l === "zh" ? "en" : "zh"))}
            aria-label={t("Switch to English", "切换中文")}
          >
            <span className={lang === "zh" ? "active" : ""}>中</span>
            <span>/</span>
            <span className={lang === "en" ? "active" : ""}>EN</span>
          </button>
          <button
            className="mobile-toggle"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label="Menu"
          >
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      {page === "home" ? (
        <main>
          <section className="hero content">
            <div className="hero-copy">
              <span className="eyebrow">
                <span className="tiny-line" />
                THE TRUTH IS IN THE FRAMES
              </span>
              <h1>
                How Much Latency
                <br />
                Does Your Capture Card
                <br />
                <span>Really Add?</span>
              </h1>
              <p className="hero-cn">
                {t(
                  "你的采集卡，究竟增加了多少延迟？",
                  "A real signal. Your phone. A measurable difference.",
                )}
              </p>
              <p className="hero-desc">
                {t(
                  "一部手机，一段慢动作。用真实逐帧信号，测量采集卡与 Veyra 视频链路的可见延迟。",
                  "Measure the visible latency of your capture card or Veyra video chain with a real frame-numbered signal and slow-motion recording.",
                )}
              </p>
              <div className="hero-buttons">
                <button
                  className="button primary"
                  onClick={() => navigate("setup")}
                >
                  {t("开始测试", "Start a test")}
                  <ArrowUpRight size={19} />
                </button>
                <button
                  className="button ghost"
                  onClick={() =>
                    document
                      .getElementById("principle")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  {t("了解测试原理", "How it works")}
                  <ArrowRight size={16} />
                </button>
              </div>
              <div className="hero-note">
                <ShieldCheck size={14} />
                {t("无需专业设备", "No specialist hardware")}
                <span /> {t("无需登录", "No account")}
                <span />
                {t("录像保留在你的设备", "Your recording stays with you")}
              </div>
            </div>
            <div
              className="hero-instrument"
              aria-label={t(
                "逐帧测试信号示意，非测量结果",
                "Frame signal illustration, not measured results",
              )}
            >
              <div className="instrument-bar">
                <span>
                  <i />
                  SIGNAL MONITOR
                </span>
                <span>
                  60 FPS <Activity size={13} />
                </span>
              </div>
              <div className="instrument-body">
                <div className="instrument-caption">
                  VEYRA / FRAME TIMING SIGNAL <span>V.01</span>
                </div>
                <div className="scope-corner tl" />
                <div className="scope-corner tr" />
                <div className="scope-corner bl" />
                <div className="scope-corner br" />
                <span className="instrument-frame-label">SOURCE FRAME ID</span>
                <div className="instrument-frame">
                  000125<span>FRAME</span>
                </div>
                <div className="signal-line">
                  <div className="signal-square" />
                  <div>
                    <span>EVENT ID</span>
                    <strong>007</strong>
                    <small>
                      {t("高对比度检测区域", "HIGH-CONTRAST REGION")}
                    </small>
                  </div>
                </div>
                <div className="instrument-bottom">
                  <span>DETERMINISTIC SEQUENCE</span>
                  <span>
                    16.67 <small>ms / frame</small>
                  </span>
                </div>
              </div>
              <div className="instrument-footer">
                <span>
                  {t(
                    "信号示意 · 非测量结果",
                    "SIGNAL ILLUSTRATION · NOT A RESULT",
                  )}
                </span>
                <span className="lime">● CFR SOURCE</span>
              </div>
              <div className="instrument-sticker">
                <Clock3 size={18} />
                <div>
                  <b>Measure the Frames.</b>
                  <span>Not the Hype.</span>
                </div>
              </div>
            </div>
          </section>
          <div className="spec-strip content">
            <div>
              <span className="spec-num">
                60<span> FPS</span>
              </span>
              <p>
                {t("标准源信号", "STANDARD SOURCE")}
                <b>16.67 ms / {t("帧", "frame")}</b>
              </p>
            </div>
            <div>
              <span className="spec-num">
                120<span> FPS</span>
              </span>
              <p>
                {t("推荐手机拍摄", "RECOMMENDED CAPTURE")}
                <b>8.33 ms / {t("采样", "sample")}</b>
              </p>
            </div>
            <div>
              <span className="spec-num">
                240<span> FPS</span>
              </span>
              <p>
                {t("更高采样精度", "FINER SAMPLING")}
                <b>4.17 ms / {t("采样", "sample")}</b>
              </p>
            </div>
            <div className="spec-principle">
              <span className="zero">
                0<span> {t("帧", "frames")}</span>
              </span>
              <p>
                ≠ 0 ms
                <b>
                  {t(
                    "看见的差距，不等于内部延迟",
                    "VISIBLE DIFFERENCE ≠ CHIP LATENCY",
                  )}
                </b>
              </p>
            </div>
          </div>
          <section className="content how-section" id="principle">
            <div className="section-heading">
              <div>
                <span className="eyebrow">THE METHOD</span>
                <h2>
                  {t(
                    "四步，把延迟变成证据。",
                    "Four steps. Evidence in every frame.",
                  )}
                </h2>
              </div>
              <p>
                {t(
                  "约 3 分钟完成准备，无需复杂工具。",
                  "Set up in about 3 minutes. No complex tools.",
                )}
              </p>
            </div>
            <div className="step-cards">
              {[
                {
                  icon: Monitor,
                  title: steps[0],
                  desc: t(
                    "让参考画面和采集预览同时可见。推荐单屏 PBP 分屏。",
                    "Show the reference and preview together. Single-monitor PBP is recommended.",
                  ),
                },
                {
                  icon: Activity,
                  title: steps[1],
                  desc: t(
                    "播放恒定帧率素材，每一帧拥有唯一编号。",
                    "Play a constant-frame-rate signal with a unique number burned into every frame.",
                  ),
                },
                {
                  icon: Smartphone,
                  title: steps[2],
                  desc: t(
                    "用 120FPS 或更高帧率拍摄两个画面，保留原始录像。",
                    "Film both regions at 120FPS or higher and keep the original recording.",
                  ),
                },
                {
                  icon: Copy,
                  title: steps[3],
                  desc: t(
                    "复制本次设置的提示词，交给你使用的视频分析 AI。",
                    "Copy your session prompt and use it with your preferred video analysis AI.",
                  ),
                },
              ].map((s, i) => (
                <button
                  className="step-card"
                  key={i}
                  onClick={() => navigate(i === 2 ? "filming" : "setup")}
                >
                  <div className="step-card-top">
                    <s.icon size={22} />
                    <span>0{i + 1}</span>
                  </div>
                  <h3>
                    {s.title}
                    <ArrowUpRight size={17} />
                  </h3>
                  <p>{s.desc}</p>
                </button>
              ))}
            </div>
            <div className="method-note">
              <Info size={17} />
              <p>
                {t(
                  "比较同一事件在两条路径中出现的时间。结果是此显示环境中的可见延迟差，包含显示、预览软件与链路的共同影响。",
                  "Compare when the same event appears in each path. The result is a visible latency difference in this setup, influenced by the display, preview software and complete chain.",
                )}
              </p>
            </div>
          </section>
          <section className="content faq-section">
            <div>
              <span className="eyebrow">BEFORE YOU MEASURE</span>
              <h2>
                {t("先搞清楚，再下结论。", "Understand the measurement.")}
              </h2>
              <p className="muted">
                {t(
                  "精确的数字，需要诚实的边界。",
                  "Precise numbers need honest limits.",
                )}
              </p>
            </div>
            <div className="faq-list">
              {[
                [
                  t(
                    "为什么 0 帧差不代表 0ms 延迟？",
                    "Why does zero frames not mean zero latency?",
                  ),
                  t(
                    "两条路径可能在同一次相机采样中更新，但更新的真实时间仍有差异。帧编号相同只能说明在当次采样中未观察到源帧差，不能证明零硬件延迟。",
                    "Both paths can update within one camera sample while still having different actual update times. Matching frame numbers do not prove zero hardware latency.",
                  ),
                ],
                [
                  t(
                    "手机帧率越高，结果就一定越准确吗？",
                    "Does a faster camera always mean more accurate results?",
                  ),
                  t(
                    "拍摄帧率决定相机时间采样间隔；显示刷新率、源帧率、显示扫描、滚动快门和曝光时间仍会限制准确性。240FPS 的采样间隔约 4.17ms，并不代表测量误差必定小于 4.17ms。",
                    "Camera FPS determines the sampling interval. Source FPS, display refresh and scan timing, rolling shutter and exposure still limit accuracy. 240FPS sampling does not guarantee a measurement error below 4.17ms.",
                  ),
                ],
                [
                  t(
                    "为什么推荐 PBP，并交换左右位置？",
                    "Why PBP, and why swap the physical sides?",
                  ),
                  t(
                    "同一显示器能减少两块面板差异，但不消除各输入处理和扫描时序差异。第二轮实际交换 PBP 输入位置，有助于发现位置相关偏差。网页移动元素不等于交换输入。",
                    "One monitor reduces panel-to-panel differences but does not remove input-processing or scan-timing bias. A second round with physically swapped PBP inputs helps expose position bias. Moving webpage elements does not swap inputs.",
                  ),
                ],
                [
                  t(
                    "浏览器能确认 HDMI 真正输出了每一帧吗？",
                    "Can a browser verify every physical HDMI frame?",
                  ),
                  t(
                    "不能。本站提供预编码的真实 CFR 素材，并记录视频回调、解码掉帧和播放异常。浏览器不能直接测量 HDMI 时序或真实显示器扫描，也无法证明没有物理重复帧。",
                    "No. This lab uses encoded CFR media and records video callbacks, browser-reported frame drops and interruptions. It cannot directly measure HDMI timing, physical display scanning, or rule out physical repeats.",
                  ),
                ],
                [
                  t("录像会被上传到哪里？", "Where is my recording uploaded?"),
                  t(
                    "本站不接收录像，也不调用 AI API。拍摄后，把原始视频或 ZIP 交给你自己的 ChatGPT、Claude、Gemini 等工具；AI 不具备逐帧分析能力时必须明确说明。",
                    "The site does not receive video or call AI APIs. Submit the original recording or ZIP to your own ChatGPT, Claude, Gemini or other tool. An AI without actual frame-analysis capability must say so.",
                  ),
                ],
              ].map(([q, a]) => (
                <details key={q}>
                  <summary>
                    {q}
                    <ChevronDown size={17} />
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </section>
        </main>
      ) : (
        <main className="content workspace">
          <div className="workflow">
            {steps.map((s, i) => (
              <button
                key={s}
                disabled={i === 3 && !rounds.length}
                className={
                  (page === "setup"
                    ? 0
                    : page === "filming"
                      ? 2
                      : page === "between"
                        ? 1
                        : 3) === i
                    ? "current"
                    : ""
                }
                onClick={() => {
                  if (i === 0) navigate("setup");
                  else if (i === 2) navigate("filming");
                  else if (i === 3 && rounds.length) navigate("results");
                  else if (i === 1) navigate("setup");
                }}
              >
                <span>0{i + 1}</span>
                {s}
                {i < 3 && <ChevronRight size={14} />}
              </button>
            ))}
          </div>
          {page === "setup" && (
            <>
              <div className="workspace-title">
                <span className="eyebrow">01 / PREPARE YOUR BENCH</span>
                <h1>
                  {t("从正确的接线开始。", "Start with the right connections.")}
                </h1>
                <p>
                  {t(
                    "让两条画面路径同框，再用同一段录像比较它们。",
                    "Bring both image paths into one recording, then compare the same events.",
                  )}
                </p>
              </div>
              <div className="setup-grid">
                <div>
                  <section className="panel connection-panel">
                    <div className="panel-heading">
                      <h3>
                        <Monitor size={18} />
                        {t("连接方式", "Connection method")}
                      </h3>
                      <span className="tag">
                        {t("PBP 推荐", "PBP RECOMMENDED")}
                      </span>
                    </div>
                    <div className="segmented">
                      {(["pbp", "dual", "loop"] as const).map((m) => (
                        <button
                          className={settings.method === m ? "active" : ""}
                          key={m}
                          onClick={() => configure("method", m)}
                        >
                          {methodName(m, lang)}
                        </button>
                      ))}
                    </div>
                    <Wiring lang={lang} method={settings.method} />
                    <div className="connection-steps">
                      {(settings.method === "pbp"
                        ? [
                            t(
                              "信号源 HDMI → 采集卡 HDMI IN",
                              "Source HDMI → Capture card HDMI IN",
                            ),
                            t(
                              "采集卡 HDMI OUT → 显示器输入 1",
                              "Capture card HDMI OUT → Monitor input 1",
                            ),
                            t("采集卡 USB → 电脑", "Capture card USB → PC"),
                            t(
                              "电脑 GPU 输出 → 显示器输入 2",
                              "PC GPU output → Monitor input 2",
                            ),
                            t(
                              "显示器开启 PBP 双输入分屏",
                              "Enable dual-input PBP on your monitor",
                            ),
                            t(
                              "一侧显示原始 HDMI，另一侧打开采集预览",
                              "Reference HDMI on one side; open capture preview on the other",
                            ),
                          ]
                        : settings.method === "dual"
                          ? [
                              t(
                                "信号源 → 采集卡 HDMI IN；HDMI OUT → 参考显示器",
                                "Source → Card HDMI IN; HDMI OUT → Reference monitor",
                              ),
                              t(
                                "采集卡 USB → 电脑；GPU → 预览显示器",
                                "Card USB → PC; GPU → Preview monitor",
                              ),
                              t(
                                "让两个画面处于相同垂直高度。不同面板可能引入额外偏差。",
                                "Align both regions vertically. Different panels can add measurement bias.",
                              ),
                            ]
                          : [
                              t(
                                "电脑的一个 HDMI 输出 → 采集卡 HDMI IN",
                                "One PC HDMI output → Card HDMI IN",
                              ),
                              t(
                                "采集卡 HDMI OUT → 参考屏；USB → 同一电脑",
                                "Card HDMI OUT → Reference screen; USB → Same PC",
                              ),
                              t(
                                "另一个 GPU 输出显示采集预览。使用扩展桌面，将测试页移到 HDMI 信号输出。",
                                "Use another GPU output for capture preview. Extend the desktop and move the signal page to the source HDMI output.",
                              ),
                            ]
                      ).map((line, i) => (
                        <div key={line}>
                          <span>{i + 1}</span>
                          <p>{line}</p>
                        </div>
                      ))}
                    </div>
                    <div className="inline-note">
                      <Info size={16} />
                      {t(
                        "如使用游戏机等外部源，请下载测试源视频并在该设备播放，不能在采集预览侧运行测试页来替代参考信号。",
                        "For an external source, download and play the signal video on that device. Running this page on the preview side does not replace the reference source.",
                      )}
                    </div>
                  </section>
                  <section className="panel compact-panel">
                    <h3>
                      <Smartphone size={18} />
                      {t(
                        "拍摄前，记住这三件事",
                        "Three things before you record",
                      )}
                    </h3>
                    <div className="mini-tips">
                      <span>
                        <Check size={15} />
                        {t("至少建议 120FPS", "120FPS minimum suggested")}
                      </span>
                      <span>
                        <Check size={15} />
                        {t("两个区域同高度", "Align regions vertically")}
                      </span>
                      <span>
                        <Check size={15} />
                        {t("保留真实原始录像", "Keep the original recording")}
                      </span>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => navigate("filming")}
                    >
                      {t("查看完整拍摄指南", "See the filming guide")}
                      <ArrowRight size={14} />
                    </button>
                  </section>
                </div>
                <aside className="panel settings-panel">
                  <div className="panel-heading">
                    <h3>
                      <SlidersHorizontal size={18} />
                      {t("测试参数", "Test parameters")}
                    </h3>
                    <span className="mono muted">CFR V1</span>
                  </div>
                  <div className="field">
                    <label>
                      {t("源信号帧率", "Source frame rate")}
                      <span className="tag">{t("60 标准", "60 STANDARD")}</span>
                    </label>
                    <div className="segmented">
                      {[30, 60, 120].map((n) => (
                        <button
                          className={settings.fps === n ? "active" : ""}
                          key={n}
                          onClick={() => configure("fps", n)}
                        >
                          {n} FPS
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="refresh">
                      {t("实际显示器刷新率", "Actual monitor refresh rate")}
                      <span className="unit">Hz</span>
                    </label>
                    <input
                      id="refresh"
                      type="number"
                      min="24"
                      max="1000"
                      value={settings.refresh}
                      onChange={(e) =>
                        configure("refresh", Number(e.target.value))
                      }
                    />
                    <small>
                      {t(
                        "请从系统显示设置中核对。此值由你填写，不是本站测量。",
                        "Confirm in system display settings. This value is user supplied, not measured.",
                      )}
                    </small>
                  </div>
                  <div className="field">
                    <label htmlFor="camera">
                      {t("手机拍摄帧率", "Camera recording frame rate")}
                    </label>
                    <select
                      id="camera"
                      value={settings.camera}
                      onChange={(e) =>
                        configure("camera", Number(e.target.value))
                      }
                    >
                      {[30, 60, 120, 240, 480, 960].map((n) => (
                        <option value={n} key={n}>
                          {n} FPS
                          {n === 120
                            ? t(" · 标准推荐", " · Recommended")
                            : n === 240
                              ? t(" · 更高精度", " · Finer sampling")
                              : ""}
                        </option>
                      ))}
                    </select>
                    <small className={settings.camera <= 60 ? "warning" : ""}>
                      {settings.camera <= 60
                        ? t(
                            "低采样精度：30/60FPS 可能遗漏事件起始时刻。",
                            "Low sampling precision: 30/60FPS may miss the start of an event.",
                          )
                        : t("采样间隔约", "Sampling interval ≈ ")}
                      {settings.camera > 60 &&
                        `${(1000 / settings.camera).toFixed(2)} ms`}
                    </small>
                  </div>
                  <div className="field">
                    <label htmlFor="card">
                      {t("采集卡型号", "Capture card model")}
                      <span className="unit">{t("选填", "Optional")}</span>
                    </label>
                    <input
                      id="card"
                      placeholder={t(
                        "例如：Elgato HD60 X",
                        "e.g. Elgato HD60 X",
                      )}
                      value={settings.card}
                      maxLength={120}
                      onChange={(e) => configure("card", e.target.value)}
                    />
                  </div>
                  <div className="field-pair">
                    <div className="field">
                      <label htmlFor="format">
                        {t("采集格式", "Capture format")}
                      </label>
                      <select
                        id="format"
                        value={settings.format}
                        onChange={(e) => configure("format", e.target.value)}
                      >
                        {["YUY2", "NV12", "MJPEG", "Other"].map((x) => (
                          <option key={x} value={x}>
                            {x === "Other" ? t("其他", "Other") : x}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="software">
                        {t("测试软件", "Test software")}
                      </label>
                      <select
                        id="software"
                        value={settings.software}
                        onChange={(e) => configure("software", e.target.value)}
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
                          className={settings.count === n ? "active" : ""}
                          key={n}
                          onClick={() => configure("count", n)}
                        >
                          <b>{n}</b>
                          <span>{modeName(n, lang)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="settings-footnote">
                    <Info size={15} />
                    <p>
                      {t(
                        "拍摄帧率决定相机采样间隔。源帧率、显示刷新率和扫描时序仍限制测量准确性。",
                        "Camera FPS determines the sampling interval. Source FPS, display refresh and scan timing still limit accuracy.",
                      )}
                    </p>
                  </div>
                  {!refreshCompatible(settings.refresh, settings.fps) && (
                    <p className="warning">
                      {t(
                        "刷新率不是源 FPS 的整数倍，无法保证均匀逐帧输出。",
                        "Refresh is not an integer multiple of source FPS. Uniform frame output is not guaranteed.",
                      )}
                    </p>
                  )}
                  {loadError && (
                    <p className="warning" role="alert">
                      {t("素材清单加载失败：", "Manifest loading failed: ")}
                      {loadError}
                    </p>
                  )}
                  <button
                    className="button primary full-width"
                    disabled={
                      !signal ||
                      settings.refresh < 24 ||
                      settings.refresh > 1000
                    }
                    onClick={() => navigate("filming")}
                  >
                    {t("下一步：拍摄检查", "Next: filming checklist")}
                    <ArrowRight size={17} />
                  </button>
                  <p className="center-note">
                    {signal
                      ? `${signal.duration.toFixed(1)}s / ${t("轮", "round")} · ${t("推荐拍摄两轮", "2 rounds recommended")}`
                      : t("正在加载素材清单…", "Loading signal manifest…")}
                  </p>
                </aside>
              </div>
            </>
          )}
          {page === "filming" && (
            <>
              <div className="workspace-title">
                <span className="eyebrow">03 / CAPTURE THE EVIDENCE</span>
                <h1>
                  {t("手机固定，证据清晰。", "Steady phone. Clear evidence.")}
                </h1>
                <p>
                  {t(
                    "先检查拍摄设置，再启动 5 秒倒计时。",
                    "Check your camera settings before starting the 5-second countdown.",
                  )}
                </p>
              </div>
              <div className="filming-grid">
                <section className="panel filming-visual">
                  <div className="phone-outline">
                    <div className="phone-lens" />
                    <div className="phone-screen">
                      <div className="record-dot">
                        REC <span>240 FPS</span>
                      </div>
                      <div className="film-monitors">
                        <div>
                          REFERENCE<b>000125</b>
                          <span />
                        </div>
                        <div>
                          CAPTURE<b>000124</b>
                          <span />
                        </div>
                      </div>
                      <div className="alignment-line" />
                      <div className="viewfinder-corner tl" />
                      <div className="viewfinder-corner br" />
                    </div>
                  </div>
                  <span className="eyebrow">
                    {t(
                      "同框 · 同高度 · 固定机位",
                      "BOTH PATHS · SAME HEIGHT · STEADY",
                    )}
                  </span>
                  <p>
                    {t(
                      "示意帧号仅用于说明拍摄构图。",
                      "Frame numbers illustrate composition only.",
                    )}
                  </p>
                  <div className="camera-specs">
                    <div>
                      <b>120 FPS</b>
                      <span>{t("最低建议", "Suggested minimum")}</span>
                    </div>
                    <div>
                      <b>240 FPS</b>
                      <span>{t("更高精度推荐", "Finer sampling")}</span>
                    </div>
                  </div>
                </section>
                <section className="panel filming-checklist">
                  <h3>
                    <Smartphone size={19} />
                    {t("拍摄检查清单", "Recording checklist")}
                  </h3>
                  {[
                    t(
                      "同时拍到 HDMI 参考画面与 USB 采集预览。",
                      "Include both HDMI reference and USB preview.",
                    ),
                    t(
                      "固定手机；左右测试区域处于相同垂直高度。",
                      "Fix the phone; align left/right regions vertically.",
                    ),
                    t(
                      "避免反光、过曝；确保 FRAME ID 数字清晰。",
                      "Avoid reflections and overexposure; keep FRAME IDs sharp.",
                    ),
                    t(
                      "尽量使用较短曝光，关闭自动特效和插帧。",
                      "Use a short exposure; disable effects and interpolation.",
                    ),
                    t(
                      "检查高帧率模式能连续拍摄至少一轮；部分 480/960FPS 只支持短片段。",
                      "Ensure high-FPS mode records a full round; some 480/960FPS modes only record brief bursts.",
                    ),
                  ].map((line) => (
                    <div className="check-line" key={line}>
                      <Check size={16} />
                      <p>{line}</p>
                    </div>
                  ))}
                  <div className="notice important">
                    <AlertTriangle size={20} />
                    <div>
                      <b>
                        {t(
                          "务必保留真实高帧率原始视频",
                          "Keep the actual original high-FPS video",
                        )}
                      </b>
                      <p>
                        {t(
                          "慢动作分享或导出可能降为 30FPS，或仅保留减速效果。不要用播放有多慢来判断采样帧率。建议把原始文件或 ZIP 交给 AI。",
                          "Sharing or export can reduce the video to 30FPS or preserve only slowed playback. Playback speed does not establish capture FPS. Submit the original file or ZIP to your AI.",
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="run-summary">
                    <span>
                      {settings.fps} FPS {t("源信号", "source")}
                    </span>
                    <span>
                      {settings.camera} FPS {t("拍摄", "camera")}
                    </span>
                    <span>
                      {settings.count} {t("事件", "events")}
                    </span>
                    <button
                      className="text-link"
                      onClick={() => navigate("setup")}
                    >
                      {t("修改", "Edit")}
                    </button>
                  </div>
                  <label className="checkbox-line">
                    <input
                      type="checkbox"
                      checked={ack}
                      onChange={(e) => setAck(e.target.checked)}
                    />
                    <span>
                      {t(
                        "我已核对设置，了解亮度变化的光敏性风险与测量局限。",
                        "I checked the settings and understand the photosensitivity risk and measurement limits.",
                      )}
                    </span>
                  </label>
                  <button
                    className="button primary full-width"
                    disabled={
                      !ack ||
                      !signal ||
                      settings.refresh < 24 ||
                      settings.refresh > 1000
                    }
                    onClick={start}
                  >
                    <Play size={17} />
                    {t("加载测试信号", "Load the test signal")}
                    <ArrowRight size={16} />
                  </button>
                  {!signal && (
                    <p className="warning">
                      {loadError ||
                        t("正在加载素材清单…", "Loading signal manifest…")}
                    </p>
                  )}
                  <small className="center-note">
                    {t(
                      "在下一屏点击全屏开始，倒计时 5 秒后自动播放。",
                      "Click fullscreen start on the next screen. Playback begins after 5 seconds.",
                    )}
                  </small>
                </section>
              </div>
            </>
          )}
          {page === "between" && (
            <section className="round-panel panel">
              <div
                className={
                  rounds.at(-1)?.diagnostics.complete
                    ? "success-symbol"
                    : "warning-symbol"
                }
              >
                {rounds.at(-1)?.diagnostics.complete ? (
                  <CheckCircle2 size={32} />
                ) : (
                  <AlertTriangle size={32} />
                )}
              </div>
              <span className="eyebrow">
                ROUND {round} / {session}
              </span>
              <h1>
                {rounds.at(-1)?.diagnostics.complete
                  ? t(
                      `第 ${round} 轮播放完成。`,
                      `Round ${round} playback complete.`,
                    )
                  : t(`第 ${round} 轮已中断。`, `Round ${round} interrupted.`)}
              </h1>
              <p>
                {t(
                  "本站记录播放状态，录像是否完整仍需你检查。",
                  "Playback status is recorded. Check that your phone recording is complete.",
                )}
              </p>
              {rounds.at(-1)?.diagnostics.issues.length !== 0 && (
                <div className="notice">
                  <AlertTriangle size={18} />
                  <span>
                    {t(
                      "检测到播放限制或异常。请在最终会话记录中查看，必要时重新测试。",
                      "Playback limitations or anomalies were observed. Review the session record and repeat if needed.",
                    )}
                  </span>
                </div>
              )}
              {!rounds.at(-1)?.diagnostics.complete ? (
                <button
                  className="button primary"
                  onClick={() => navigate("player")}
                >
                  <RotateCcw size={16} />
                  {t("重新运行本轮", "Retry this round")}
                </button>
              ) : round === 1 ? (
                <>
                  <div className="swap-advice">
                    <MoveHorizontal size={25} />
                    <h3>
                      {t(
                        "建议交换实际显示位置，再测一轮。",
                        "Swap the physical positions for a second round.",
                      )}
                    </h3>
                    <p>
                      {settings.method === "pbp"
                        ? t(
                            "在显示器 PBP 菜单中真正交换输入 1 / 输入 2 的左右位置，或交换对应输入连接。确认参考画面与采集预览已经换边。仅移动网页元素不算交换。",
                            "Use the monitor’s PBP menu to swap the physical input positions, or swap the corresponding connections. Confirm the reference and preview have changed sides. Moving webpage elements does not count.",
                          )
                        : t(
                            "实际交换参考屏与预览屏的左右位置，并保持相同垂直高度；记录面板差异。",
                            "Physically exchange the reference and preview screens’ positions, keep regions at the same height, and note panel differences.",
                          )}
                    </p>
                    <label className="checkbox-line">
                      <input
                        type="checkbox"
                        checked={swapped}
                        onChange={(e) => setSwapped(e.target.checked)}
                      />
                      <span>
                        {t(
                          "已实际交换两条画面路径的显示位置。",
                          "I physically swapped the positions of both image paths.",
                        )}
                      </span>
                    </label>
                  </div>
                  <button
                    className="button primary"
                    disabled={!swapped}
                    onClick={() => {
                      setRound(2);
                      navigate("player");
                    }}
                  >
                    {t("继续第二轮", "Continue to round 2")}
                    <ArrowRight size={16} />
                  </button>
                </>
              ) : null}
              <button
                className="button secondary"
                onClick={() => navigate("results")}
              >
                {t(
                  "结束并生成分析提示词",
                  "Finish and generate analysis prompt",
                )}
                <Copy size={16} />
              </button>
            </section>
          )}
          {page === "results" && (
            <>
              <div className="workspace-title">
                <span className="eyebrow">04 / READY FOR ANALYSIS</span>
                <h1>
                  {rounds.some((r) => r.diagnostics.complete)
                    ? t(
                        "录像就绪，交给你的 AI。",
                        "Bring the evidence to your AI.",
                      )
                    : t("已保存异常记录。", "Interrupted run recorded.")}
                </h1>
                <p>
                  {t(
                    "复制提示词，与真实高帧率原始录像一起提交。本站不会生成未经分析的延迟数值。",
                    "Submit the prompt with your original high-FPS recording. This site does not generate unmeasured latency numbers.",
                  )}
                </p>
              </div>
              <div className="results-grid">
                <aside>
                  <section className="panel">
                    <div className="panel-heading">
                      <h3>
                        <Layers size={18} />
                        {t("会话记录", "Session record")}
                      </h3>
                      <span className="tag">
                        {rounds.filter((r) => r.diagnostics.complete).length}{" "}
                        {t("轮完成", "COMPLETED")}
                      </span>
                    </div>
                    <dl className="session-data">
                      <dt>SESSION ID</dt>
                      <dd className="lime mono">{session || "—"}</dd>
                      <dt>{t("测试信号", "Source signal")}</dt>
                      <dd>{settings.fps} FPS CFR</dd>
                      <dt>{t("拍摄 / 刷新率", "Camera / refresh")}</dt>
                      <dd>
                        {settings.camera} FPS / {settings.refresh} Hz
                      </dd>
                      <dt>{t("测试方式", "Test method")}</dt>
                      <dd>{methodName(settings.method, lang)}</dd>
                      <dt>{t("测试模式", "Test mode")}</dt>
                      <dd>
                        {modeName(settings.count, lang)} · {settings.count}{" "}
                        {t("事件/轮", "events/round")}
                      </dd>
                      <dt>{t("已记录轮次", "Recorded rounds")}</dt>
                      <dd>
                        {rounds
                          .map(
                            (r) =>
                              `${r.round}${r.diagnostics.complete ? "" : " (interrupted)"}`,
                          )
                          .join(", ") || "—"}
                      </dd>
                      <dt>{t("软件 / 格式", "Software / format")}</dt>
                      <dd>
                        {settings.software} / {settings.format}
                      </dd>
                      <dt>{t("型号", "Model")}</dt>
                      <dd>{settings.card || t("未填写", "Unspecified")}</dd>
                    </dl>
                    <button
                      className="button secondary full-width"
                      onClick={exportSession}
                    >
                      <Download size={16} />
                      {t("下载会话 JSON", "Download session JSON")}
                    </button>
                  </section>
                  <section className="panel diagnostics-panel">
                    <h3>
                      <Activity size={18} />
                      {t("播放诊断", "Playback diagnostics")}
                    </h3>
                    {rounds.map((r) => (
                      <div key={r.round} className="diagnostic-round">
                        <b>
                          ROUND {r.round} ·{" "}
                          {r.diagnostics.complete
                            ? t("播放结束", "Ended")
                            : t("已中断", "Interrupted")}
                        </b>
                        <p>
                          {t("浏览器掉帧", "Browser drops")}:{" "}
                          {r.diagnostics.dropped ?? t("不可用", "unavailable")}{" "}
                          · {t("回调间隙", "Callback gaps")}:{" "}
                          {r.diagnostics.callbackGaps}
                        </p>
                        <p>
                          {t("重复时间戳", "Repeated timestamps")}:{" "}
                          {r.diagnostics.repeatedTimestamps} ·{" "}
                          {r.diagnostics.callbacks} callbacks
                        </p>
                        {r.diagnostics.issues.map((x) => (
                          <small key={x}>{translateIssue(x, lang)}</small>
                        ))}
                      </div>
                    ))}
                    <p className="warning">
                      {t(
                        "真实显示扫描、物理重复帧及 HDMI 内部延迟均未验证。",
                        "Physical scanning, physical repeats and internal HDMI latency are unverified.",
                      )}
                    </p>
                  </section>
                </aside>
                <section className="panel prompt-panel">
                  <div className="panel-heading">
                    <h3>
                      <Copy size={18} />
                      {t("AI 分析提示词", "AI analysis prompt")}
                    </h3>
                    <span className="mono muted">
                      {lang === "zh" ? "ZH-CN" : "EN"}
                    </span>
                  </div>
                  <div className="prompt-intro">
                    <ShieldCheck size={17} />
                    <p>
                      {t(
                        "使用你自己的 ChatGPT、Claude、Gemini 等支持视频分析的工具。其分析能力与上传限制由对应服务决定。",
                        "Use your own ChatGPT, Claude, Gemini or another video-capable tool. Analysis capability and upload limits depend on that service.",
                      )}
                    </p>
                  </div>
                  <textarea
                    id="analysis-prompt"
                    value={prompt}
                    readOnly
                    aria-label={t(
                      "可复制的 AI 分析提示词",
                      "AI analysis prompt to copy",
                    )}
                  />
                  <button className="button primary full-width" onClick={copy}>
                    {copied ? <Check size={17} /> : <Copy size={17} />}{" "}
                    {copied
                      ? t("已复制", "Copied")
                      : t(
                          "复制完整分析提示词",
                          "Copy complete analysis prompt",
                        )}
                  </button>
                  {copyError && (
                    <p role="alert" className="warning">
                      {t(
                        "自动复制不可用。提示词已选中，请按 Ctrl/Cmd+C 或长按复制。",
                        "Clipboard unavailable. Prompt selected; use Ctrl/Cmd+C or long-press to copy.",
                      )}
                    </p>
                  )}
                  <div className="inline-note">
                    <Info size={16} />
                    {t(
                      "不要发送仅保留慢动作效果的 30FPS 导出文件。原始文件或 ZIP 更能保留采样证据。",
                      "Avoid 30FPS exports that only preserve slowed playback. Original files or ZIP retain better timing evidence.",
                    )}
                  </div>
                </section>
              </div>
              <button
                className="text-link new-test"
                onClick={() => navigate("setup")}
              >
                <RotateCcw size={16} />
                {t("准备新的测试", "Prepare a new test")}
              </button>
            </>
          )}
        </main>
      )}
      <footer className="site-footer content">
        <div className="footer-brand">
          <span className="brand-mark small">V</span>
          <span>
            Veyra Latency Lab <small>Measure the Frames. Not the Hype.</small>
          </span>
        </div>
        <span>
          {t(
            "本地测试 · 无登录 · 无视频上传",
            "LOCAL TESTING · NO ACCOUNT · NO VIDEO UPLOAD",
          )}
        </span>
        <span className="mono">LAB / V1.0</span>
      </footer>
    </div>
  );
}
function translateIssue(issue: string, lang: Language) {
  if (lang === "en") return issue;
  const mapping: Record<string, string> = {
    "User supplied refresh is incompatible with uniform target-frame presentation":
      "填写的刷新率无法匹配均匀逐帧输出",
    "Browser callback cadence does not confirm supplied refresh; physical presentation unverified":
      "浏览器回调节奏无法确认填写的刷新率；物理输出未验证",
    "Mobile source screen: PC HDMI output is recommended":
      "当前为移动端信号源，推荐使用 PC HDMI 输出",
    "Fullscreen unavailable; windowed fallback": "全屏不可用，已使用窗口模式",
    "Fullscreen exited: verify image geometry and readability":
      "已退出全屏，请检查画面区域与可读性",
    "Page hidden during countdown or playback": "倒计时或播放期间页面进入后台",
    "Browser reported decoder/compositor frame drops":
      "浏览器报告了解码或合成掉帧",
    "requestVideoFrameCallback unavailable: playback stability unverified":
      "视频帧回调不可用，播放稳定性未验证",
    "No video frame callbacks observed: stability unverified":
      "没有观察到视频帧回调，稳定性未验证",
    "Media-time gaps observed (not proof of physical output drops)":
      "观察到媒体时间间隙，不代表物理输出掉帧",
    "Repeated callback media timestamps observed (physical repeats unverified)":
      "观察到重复回调时间戳，物理重复帧未验证",
    "Playback buffering observed": "播放期间发生缓冲",
    "Media fetch stalled": "媒体读取停滞",
    "Video decode or media loading error": "视频解码或加载失败",
    "Playback rate changed": "播放速度被修改",
    "Playback interrupted": "播放被中断",
    "Stopped by user": "用户手动停止",
  };
  return mapping[issue] || issue;
}
export default App;
