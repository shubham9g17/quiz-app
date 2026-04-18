# Plan: Better Logging + Sonnet Model + Parallel Batches

## Context
The pipeline currently:
1. Shows minimal output during Claude CLI calls — feels stuck for minutes
2. Uses default model instead of Sonnet
3. Runs batches **sequentially** via `execSync` — 13 images = 3 batches × ~5 min = **~15 min total**

The biggest win is parallelizing batch execution: all batches run simultaneously → ~5 min total regardless of batch count.

## Files to Modify
- **`scripts/pipeline.ts`** only

---

## Change 1: Use Sonnet model

```typescript
// In Config section (after IMAGE_EXTENSIONS)
const CLAUDE_MODEL = "claude-sonnet-4-6";

// In callClaude() — add --model flag
const cmd = `claude -p ${toolsFlag} --model ${CLAUDE_MODEL} --output-format text`;
```

---

## Change 2: Add timestamps to log()

```typescript
function log(msg: string) {
  const t = new Date().toTimeString().slice(0, 8);
  console.log(`[pipeline ${t}] ${msg}`);
}
```

---

## Change 3: Parallelize batch extraction (BIGGEST WIN)

Switch `callClaude` from `execSync` → async `exec`, then run all batches with `Promise.all`.

### 3a. Make `callClaude` async

```typescript
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

async function callClaude(prompt: string, allowRead = false): Promise<string> {
  const toolsFlag = allowRead ? '--allowedTools "Read"' : "--allowedTools ''";
  const cmd = `claude -p ${toolsFlag} --model ${CLAUDE_MODEL} --output-format text`;
  const strictPrompt = prompt + "\n\nCRITICAL: Output ONLY what was requested above. No commentary, no insights, no explanations about formatting, no backtick blocks with ★, no preamble, no postamble. Raw output only.";

  try {
    const { stdout } = await execAsync(cmd, {
      input: strictPrompt,
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
      timeout: 600_000,
      cwd: ROOT,
    });
    return cleanOutput(stdout);
  } catch (err: any) {
    if (err.stdout) return cleanOutput(err.stdout);
    throw new Error(`Claude CLI failed: ${err.message}`);
  }
}
```

### 3b. Make `extractFromPhotos` async with parallel batches

```typescript
async function extractFromPhotos(subject: SubjectConfig, images: string[]): Promise<ChapterExtract[]> {
  const batches: string[][] = [];
  for (let i = 0; i < images.length; i += MAX_IMAGES_PER_BATCH) {
    batches.push(images.slice(i, i + MAX_IMAGES_PER_BATCH));
  }

  log(`Sending ${images.length} image(s) in ${batches.length} parallel batch(es) (model: ${CLAUDE_MODEL})...`);

  // Log each batch's images upfront
  batches.forEach((batch, b) => {
    log(`  Batch ${b + 1}: ${batch.map(img => path.basename(img)).join(", ")}`);
  });

  const batchStart = Date.now();

  // Run ALL batches in parallel
  const results = await Promise.all(
    batches.map(async (batch, b) => {
      const imageList = batch.map((img) => `- ${img}`).join("\n");
      const prompt = /* same prompt as before */;
      const result = await callClaude(prompt, true);
      const elapsed = ((Date.now() - batchStart) / 1000).toFixed(1);
      const found = (result.match(/===CHAPTER/g) || []).length;
      log(`  Batch ${b + 1}/${batches.length} done in ${elapsed}s — ${found} chapter block(s)`);
      return result;
    })
  );

  const allRawContent = results.join("\n");
  // ... rest of parsing logic unchanged
}
```

### 3c. Make `convertToQuizFormat` async (log elapsed time)

```typescript
async function convertToQuizFormat(...): Promise<string> {
  const start = Date.now();
  const result = await callClaude(prompt, false);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  log(`  Converted in ${elapsed}s → content/${subject.id}/${chKey}.md`);
  return result;
}
```

### 3d. Make `main` async, convert loops to await

```typescript
async function main() {
  // ... setup unchanged ...
  const chapters = await extractFromPhotos(subject, images);
  // ...
  for (const file of questionFiles) {
    const quiz = await convertToQuizFormat(subject, chKey, meta, questionsRaw);
    // ...
  }
}

main().catch(err => { console.error(err); process.exit(1); });
```

---

## Expected output after changes

```
[pipeline 14:32:01] Found 13 image(s) in uploads/history-ncert/
[pipeline 14:32:01] Sending 13 image(s) in 3 parallel batch(es) (model: claude-sonnet-4-6)...
[pipeline 14:32:01]   Batch 1: img1.jpeg, img2.jpeg, img3.jpeg, img4.jpeg, img5.jpeg
[pipeline 14:32:01]   Batch 2: img6.jpeg, img7.jpeg, img8.jpeg, img9.jpeg, img10.jpeg
[pipeline 14:32:01]   Batch 3: img11.jpeg, img12.jpeg, img13.jpeg
[pipeline 14:36:44]   Batch 3/3 done in 283.1s — 1 chapter block(s)
[pipeline 14:37:02]   Batch 1/3 done in 301.4s — 2 chapter block(s)
[pipeline 14:37:18]   Batch 2/3 done in 317.2s — 1 chapter block(s)
```
All 3 batches complete in ~5 min instead of ~15 min.

---

## Verification

1. Run `npm run pipeline -- history-ncert`
2. Confirm all 3 batches start immediately (timestamps close together)
3. Confirm batches finish out-of-order (proving parallel execution)
4. Confirm total time is ~1 batch duration, not 3x
5. Confirm model shows `claude-sonnet-4-6` in logs
