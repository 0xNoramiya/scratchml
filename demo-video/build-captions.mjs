// Builds captions.js (window.__CAPTIONS) from whisper word-level transcripts,
// offset to each VO segment's start on the master timeline.
import { readFileSync, writeFileSync } from "node:fs";

// Master timeline: VO segment -> absolute start (seconds). Keep in sync with index.html.
const VO_STARTS = {
  "01_hook": 0.6,
  "02_title": 7.9,
  "03_promise": 12.3,
  "04_blocks": 20.0,
  "05_sketch": 35.8,
  "06_train": 54.3,
  "07_wow": 62.6,
  "08_robot": 77.3,
  "09_camera": 80.4,
  "10_privacy": 91.5,
  "11_cta": 100.9,
};

// Words that get the accent treatment in captions
const ACCENT = new Set([
  "scratchml", "see", "go", "learned", "knows", "real", "you", "draw",
  "free", "never", "brain", "ai", "play", "circle", "square", "promise",
]);

const groups = [];
for (const [seg, offset] of Object.entries(VO_STARTS)) {
  const data = JSON.parse(readFileSync(`transcripts/${seg}.json`, "utf8"));
  const words = data.segments.flatMap((s) => s.words ?? []);
  let cur = [];
  const flush = () => {
    if (!cur.length) return;
    groups.push({
      text: cur.map((w) => w.word.trim()).join(" "),
      words: cur.map((w) => ({
        t: w.word.trim(),
        accent: ACCENT.has(w.word.trim().toLowerCase().replace(/[^a-z]/g, "")),
      })),
      start: +(offset + cur[0].start).toFixed(2),
      end: +(offset + cur[cur.length - 1].end).toFixed(2),
      robot: seg === "08_robot",
    });
    cur = [];
  };
  for (const w of words) {
    const prev = cur[cur.length - 1];
    const gap = prev ? w.start - prev.end : 0;
    const sentenceEnd = prev && /[.!?…]$/.test(prev.word.trim());
    if (cur.length >= 4 || gap > 0.55 || sentenceEnd) flush();
    cur.push(w);
  }
  flush();
}

// guarantee no overlaps (clamp each end to next start)
groups.sort((a, b) => a.start - b.start);
for (let i = 0; i < groups.length - 1; i++) {
  if (groups[i].end > groups[i + 1].start) groups[i].end = +(groups[i + 1].start - 0.02).toFixed(2);
}

writeFileSync("captions.js", "window.__CAPTIONS = " + JSON.stringify(groups, null, 1) + ";\n");
console.log(`captions.js: ${groups.length} groups, ${groups[0].start}s -> ${groups[groups.length - 1].end}s`);
