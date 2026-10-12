export type Language = "zh" | "en";
export type Method = "pbp" | "dual" | "loop";
export interface Settings {
  fps: number;
  refresh: number;
  camera: number;
  card: string;
  format: string;
  software: string;
  method: Method;
  count: number;
}
export const defaults: Settings = {
  fps: 60,
  refresh: 60,
  camera: 120,
  card: "",
  format: "NV12",
  software: "Veyra",
  method: "pbp",
  count: 50,
};
export interface SignalEvent {
  id: number;
  frame: number;
  time: number;
  bright: boolean;
  holdFrames: number;
}
export interface Signal {
  file: string;
  fps: number;
  eventCount: number;
  totalFrames: number;
  duration: number;
  sha256: string;
  events: SignalEvent[];
}
export interface FrameData {
  id: number;
  eventId: number;
  mediaTime: number;
  presentedFrames: number;
}
export interface Diagnostics {
  callbacks: number;
  callbackGaps: number;
  repeatedTimestamps: number;
  dropped: number | null;
  finalFrame: number;
  issues: string[];
  cadence: number | null;
  rvfc: boolean;
  complete: boolean;
}
export interface RoundResult {
  round: number;
  diagnostics: Diagnostics;
}
export function frameAt(time: number, signal: Signal): FrameData {
  const id = Math.max(
    0,
    Math.min(signal.totalFrames - 1, Math.round(time * signal.fps)),
  );
  let eventId = 0;
  for (const e of signal.events) {
    if (e.frame > id) break;
    eventId = e.id;
  }
  return { id, eventId, mediaTime: time, presentedFrames: 0 };
}
export function refreshCompatible(refresh: number, fps: number) {
  const ratio = refresh / fps;
  return ratio >= 1 && Math.abs(ratio - Math.round(ratio)) < 0.000001;
}
export function methodName(method: Method, lang: Language = "zh") {
  return {
    pbp: ["单显示器 PBP 分屏", "Single monitor PBP"],
    dual: ["双显示器", "Dual monitors"],
    loop: ["电脑 HDMI 回环", "PC HDMI loopback"],
  }[method][lang === "zh" ? 0 : 1];
}
export function modeName(count: number, lang: Language = "zh") {
  return ({
    20: ["快速", "Quick"],
    50: ["标准", "Standard"],
    100: ["严格", "Strict"],
  }[count] || ["自定义", "Custom"])[lang === "zh" ? 0 : 1];
}
export function makePrompt(
  s: Settings,
  session: string,
  rounds: RoundResult[],
  signal: Signal,
  lang: Language,
): string {
  const details = rounds
    .map(
      (r) =>
        `ROUND ${r.round}: complete=${r.diagnostics.complete}; browser decoder drops=${r.diagnostics.dropped ?? "unavailable"}; callback gaps=${r.diagnostics.callbackGaps}; repeated callback timestamps=${r.diagnostics.repeatedTimestamps}; issues=${r.diagnostics.issues.join(", ") || "none observed"}; physical output NOT verified`,
    )
    .join("\n");
  const info = `SESSION ID: ${session}\n${lang === "zh" ? "测试模式" : "Test method"}: ${methodName(s.method, lang)} / ${modeName(s.count, lang)} (${s.count} events/round)\n${lang === "zh" ? "测试源帧率" : "Source FPS"}: ${s.fps} FPS\n${lang === "zh" ? "显示器刷新率（用户填写，未测量）" : "Monitor refresh (user supplied, not measured)"}: ${s.refresh} Hz\n${lang === "zh" ? "预期拍摄帧率" : "Expected camera FPS"}: ${s.camera} FPS\n${lang === "zh" ? "采集卡型号" : "Capture card"}: ${s.card || (lang === "zh" ? "未填写" : "Unspecified")}\n${lang === "zh" ? "采集格式" : "Capture format"}: ${s.format}\n${lang === "zh" ? "测试软件" : "Software"}: ${s.software}\n${lang === "zh" ? "测试轮次" : "Recorded rounds"}: ${rounds.map((r) => r.round).join(", ") || "none"}\nSignal: V1 / seed 0x56455952 / SHA256 ${signal.sha256}\n${details}`;
  if (lang === "en")
    return `You are a video timing analysis engineer. I uploaded a Veyra Latency Lab recording. Use actual frame-by-frame analysis wherever possible, rather than estimating latency by eye.\n\nTest information:\n${info}\n\n1. Inspect actual resolution, frame rate, timestamps and frame count. Check for transcoding and slow-motion repackaging. Playback timestamps in a slowed file may not be original capture timestamps; only convert when the capture rate/time mapping is independently established.\n2. Identify HDMI reference and USB preview regions. Ask me if uncertain.\n3. Read FRAME ID and EVENT ID frame by frame wherever possible.\n4. Match each event's appearance in both regions.\n5. Calculate the time difference using original capture timestamps preferentially.\n6. Report valid events, median, mean, P95, minimum and maximum latency.\n7. Check fluctuations, dropped and repeated frames.\n8. Report the distribution of visible source-frame differences separately from actual time differences.\n9. Explain confidence, uncertainties and limitations, including rolling shutter and display scanning.\n\nUse Python, FFmpeg or OpenCV for programmatic frame analysis if available. If you cannot read the complete frame sequence or actually execute frame analysis, say so clearly. Never invent analyzed frame counts or statistics. Never interpret a zero-frame difference as zero milliseconds of hardware latency. This measures the visible difference between two image paths in this display setup, not necessarily the capture chip's internal latency. Callback gaps are browser observations, not proof of HDMI drops. If physical positions were swapped in round 2, map the regions again and report rounds separately before combining.\n\nOutput:\n[TEST RESULTS]\nTypical visible latency: XX ms\nP95 latency: XX ms\nMinimum/maximum: XX–XX ms\nTypical source-frame difference: X frames\nValid events: XX/XX\nConfidence: High/Medium/Low\n[DETAILED ANALYSIS]\nEvent IDs, appearance times in left/right regions, differences and anomalies.\n[FINAL CONCLUSION]\nReliability and whether additional testing is needed. Use unavailable for metrics you cannot establish.`;
  return `你是一名视频时序分析工程师。\n\n我上传了一段Veyra Latency Lab延迟测试录像，请尽可能使用真实的逐帧分析，而不是通过肉眼猜测延迟。\n\n测试信息：\n${info}\n\n请执行：\n\n1. 检查视频实际分辨率、帧率、视频时间戳和帧数，判断是否经过转码或慢动作重新封装。\n2. 确定HDMI参考画面和USB采集预览画面的区域。如果无法确定，请询问我。\n3. 尽可能逐帧读取FRAME ID与EVENT ID。\n4. 找到同一个画面变化事件分别在参考画面和采集画面出现的时间。\n5. 计算两者的时间差，优先使用真实拍摄时间戳。\n6. 统计有效事件数量、延迟中位数、平均值、P95、最小值、最大值。\n7. 分析是否存在明显的延迟波动、掉帧或重复帧。\n8. 给出可见源帧差的分布，并区分源帧差与实际时间差。\n9. 说明测试可信度、误差来源与结论的局限。\n\n如果具备Python、FFmpeg、OpenCV等工具，应优先使用程序化逐帧分析。\n\n如果不能读取完整视频帧序列，或者不能实际执行逐帧分析，必须明确说明，不能编造已经分析过的帧数和统计数据。\n\n绝对不要把“0帧差距”解释为“0ms硬件延迟”。\n\n注意：测量结果是指定显示环境中的两条画面路径的可见延迟差，不一定等于采集卡自身内部延迟。\n慢动作封装中的播放时间戳可能不是真实拍摄时间戳；只有确认原始采样帧率和时间映射后才可换算，否则明确报告时间差无法确定。\n浏览器回调间隙不等于HDMI掉帧。显示扫描、相机滚动快门与曝光时间仍会引入误差。第二轮如交换了实际输入位置，请重新识别左右区域，先分别报告每轮，再考虑合并。未完成或异常轮次应剔除或降级可信度。\n\n最终使用以下格式输出：\n\n【测试结果】\n典型可见延迟：XX ms\nP95延迟：XX ms\n最小/最大：XX–XX ms\n典型源帧差：X帧\n有效事件：XX/XX\n测试可信度：高/中/低\n\n【详细分析】\n提供事件编号、左右出现时间、延迟差值和异常事件解释。\n\n【最终结论】\n说明测试结果是否可靠，以及是否需要补充测试。无法确定的统计项请写“无法确定”。`;
}
