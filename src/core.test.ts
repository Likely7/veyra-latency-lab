import test from "node:test";
import assert from "node:assert/strict";
import {
  defaults,
  frameAt,
  makePrompt,
  refreshCompatible,
  configuredStandard,
  updateSetting,
  roundFinished,
  externalRound,
  type Signal,
  type RoundResult,
} from "./core";
const signal: Signal = {
  file: "signal.mp4",
  fps: 60,
  eventCount: 2,
  totalFrames: 130,
  duration: 130 / 60,
  sha256: "digest",
  events: [
    { id: 1, frame: 60, time: 1, bright: true, holdFrames: 30 },
    { id: 2, frame: 90, time: 1.5, bright: false, holdFrames: 40 },
  ],
};
test("Frame and event mapping is derived from encoded media time at event boundaries", () => {
  assert.equal(frameAt(59 / 60, signal).eventId, 0);
  assert.equal(frameAt(1, signal).id, 60);
  assert.equal(frameAt(1, signal).eventId, 1);
  assert.equal(frameAt(1.5, signal).eventId, 2);
  assert.equal(frameAt(99, signal).id, 129);
  assert.equal(frameAt(-1, signal).id, 0);
});
test("Only integer refresh multiples support uniform target frame cadence", () => {
  assert.ok(refreshCompatible(60, 60));
  assert.ok(refreshCompatible(120, 60));
  assert.ok(!refreshCompatible(144, 60));
  assert.ok(!refreshCompatible(60, 120));
  assert.ok(!refreshCompatible(0, 60));
  assert.ok(!refreshCompatible(119.88, 60));
  assert.ok(!refreshCompatible(59.94, 60));
});
test("Prompts preserve session settings, interrupted rounds, and epistemic limits in both languages", () => {
  const rounds: RoundResult[] = [
    {
      round: 1,
      diagnostics: {
        callbacks: 20,
        callbackGaps: 2,
        repeatedTimestamps: 0,
        dropped: null,
        finalFrame: 25,
        issues: ["Stopped by user"],
        cadence: 60,
        rvfc: true,
        complete: false,
      },
    },
  ];
  for (const lang of ["zh", "en"] as const) {
    const result = makePrompt(
      { ...defaults, card: "HD60 X", camera: 240 },
      "VL-TEST",
      rounds,
      signal,
      lang,
    );
    for (const text of [
      "VL-TEST",
      "HD60 X",
      "240 FPS",
      "NV12",
      "digest",
      "complete=false",
      "unavailable",
    ])
      assert.ok(result.includes(text), text);
    assert.ok(result.includes(lang === "zh" ? "不能编造" : "Never invent"));
    assert.ok(
      result.includes(
        lang === "zh" ? "0ms硬件延迟" : "zero milliseconds of hardware latency",
      ),
    );
  }
});

test("Source limits remain independent of high-FPS camera sampling", () => {
  assert.ok(configuredStandard(defaults));
  const phone = updateSetting(defaults, "camera", 240);
  assert.equal(phone.fps, 60);
  assert.ok(configuredStandard(phone));
  assert.equal(updateSetting(phone, "fps", 120).fps, 60);
  const faster = updateSetting(
    updateSetting(phone, "refresh", 120),
    "fps",
    120,
  );
  assert.equal(faster.fps, 120);
  const slower = updateSetting(faster, "refresh", 60);
  assert.equal(slower.fps, 60);
  assert.equal(slower.camera, 240);
  assert.ok(!configuredStandard({ ...defaults, fps: 120 }));
  assert.ok(!configuredStandard({ ...defaults, refresh: 144 }));
  assert.ok(!refreshCompatible(60, 0));
  assert.ok(!refreshCompatible(Infinity, 60));
});
test("External completion is user confirmation rather than observed browser playback", () => {
  const r = externalRound(1);
  assert.ok(roundFinished(r));
  assert.equal(r.diagnostics.complete, false);
  assert.equal(r.diagnostics.dropped, null);
  assert.equal(r.diagnostics.rvfc, false);
  const prompt = makePrompt(
    { ...defaults, source: "external" },
    "EXTERNAL",
    [r],
    signal,
    "zh",
  );
  assert.ok(prompt.includes("source=external"));
  assert.ok(prompt.includes("external_recording_confirmed=true"));
  assert.ok(prompt.includes("浏览器没有观察外部播放"));
  assert.equal(
    updateSetting({ ...defaults, method: "loop" }, "source", "external").method,
    "pbp",
  );
  assert.equal(
    updateSetting({ ...defaults, source: "external" }, "method", "loop").source,
    "pc",
  );
});
