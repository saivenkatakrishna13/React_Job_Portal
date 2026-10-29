#!/usr/bin/env node
// Unit test for the multi-key Groq pool (report §9.4b).
// Runs entirely offline: a fake clock drives createKeyPool, and requestChat
// is exercised through its injectable transport with FAKE keys — the real
// keys in backend/.env are never read (dotenv is not loaded here) and no
// network call is made.
//
// Assertions:
//  (1) round-robin LRU order k1 → k2 → k3 → k1 under normal load
//  (2) a 429 cools only that key and the SAME model retries on the next key
//  (3) simulated 429s advance key 1 → key 2 → key 3 BEFORE the model chain
//      moves to the fallback model (the §9.4b requirement)
//  (4) cooldowns expire on their own; a permanent (auth-rejected) key never
//      comes back and never stalls the chain
import { createKeyPool, requestChat } from "../services/aiService.js";

let PASS = 0;
let FAIL = 0;
const check = (label, ok) => {
  if (ok) {
    console.log(`PASS  ${label}`);
    PASS += 1;
  } else {
    console.log(`FAIL  ${label}`);
    FAIL += 1;
  }
};

// ---- (1) pure pool behaviour with an injectable clock ---------------------
let clock = 1_000_000;
const pool = createKeyPool(["k1", "k2", "k3"], () => clock);
check("pool starts with 3 usable keys", pool.size() === 3);

const first = pool.pick();
const second = pool.pick();
const third = pool.pick();
const fourth = pool.pick();
check(
  "LRU round-robin order k1 → k2 → k3 → k1",
  [first, second, third, fourth].map((e) => e && e.key).join(",") === "k1,k2,k3,k1"
);

// ---- (4) cooldown lifecycle ----------------------------------------------
pool.cool(first, 5000);
check("cooled key excluded from picks", pool.size() === 2);
pool.cool(second, 5000);
pool.cool(third, 5000);
check("all keys cooling → nothing usable", pool.size() === 0 && pool.hasUsable() === false);
check(
  "shortest cooldown reported in ms (≤ 5000)",
  pool.shortestCooldownMs() > 4000 && pool.shortestCooldownMs() <= 5000
);
clock += 5001;
check("cooldowns expire with the clock (auto-recovery)", pool.size() === 3);

const dead = createKeyPool(["only-key"], () => clock);
dead.cool(dead.entries[0], 0, { permanent: true });
check(
  "permanently cooled (auth-rejected) key never recovers and reports 0 ms",
  dead.size() === 0 && dead.shortestCooldownMs() === 0
);

// ---- (2)+(3) full requestChat wiring with a fake transport ----------------
// Distinct fake key sets per scenario: the pool rebuilds whenever the
// configured key signature changes, giving each scenario a fresh pool.
const seen = []; // { key, model }
const runChat = async (keySet, plan) => {
  process.env.GROQ_API_KEY_1 = `${keySet}-1`;
  process.env.GROQ_API_KEY_2 = `${keySet}-2`;
  process.env.GROQ_API_KEY_3 = `${keySet}-3`;
  seen.length = 0;
  const transport = async (url, body, cfg) => {
    const key = String(cfg.headers.Authorization).replace("Bearer ", "");
    seen.push({ key, model: body.model });
    const action = plan(seen.length, key, body.model);
    if (action === "429") {
      const err = new Error("rate limited");
      err.response = { status: 429, headers: { "retry-after": "1" } }; // 1 s cooldown
      throw err;
    }
    return {
      data: {
        choices: [{ message: { content: '{"ok":true}', finish_reason: 'stop' } }],
      },
    };
  };
  return requestChat({ messages: [] }, transport);
};

process.env.GROQ_MODEL = "m-primary";
process.env.GROQ_MODEL_FALLBACKS = "m-fallback1,m-fallback2";

// Scenario 2: first call 429s on key 1 — the retry must stay on the SAME
// model and move to key 2 (no model change yet).
await runChat("A", (n) => (n === 1 ? "429" : "ok"));
check(
  "429 on key 1 → immediate retry on key 2, same model",
  seen.length === 2 &&
    seen[0].key === "A-1" &&
    seen[1].key === "A-2" &&
    seen[0].model === "m-primary" &&
    seen[1].model === "m-primary"
);

// Scenario 3 (the §9.4b assertion): 429 on EVERY key for the primary model.
// The pool must walk 1 → 2 → 3 on m-primary, and only then may the chain
// touch m-fallback1 (after waiting out the soonest 1 s cooldown).
await runChat("B", (n) => (n <= 3 ? "429" : "ok"));
const primaryKeyAttempts = seen.filter((s) => s.model === "m-primary");
const fallbackAttempts = seen.filter((s) => s.model !== "m-primary");
check(
  "all-429: keys advance 1 → 2 → 3 on the primary model",
  primaryKeyAttempts.length === 3 &&
    primaryKeyAttempts.map((s) => s.key).join(",") === "B-1,B-2,B-3"
);
check(
  "model fallback only AFTER all 3 keys were tried",
  fallbackAttempts.length >= 1 && fallbackAttempts[0].model === "m-fallback1"
);
check(
  "pool recovers after cooldown and serves the fallback",
  fallbackAttempts[0].key === "B-1" && seen[seen.length - 1].key === "B-1"
);

console.log(`\nKeypool: Passed: ${PASS}   Failed: ${FAIL}`);
process.exit(FAIL === 0 ? 0 : 1);
