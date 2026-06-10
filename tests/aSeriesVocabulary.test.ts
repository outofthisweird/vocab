import assert from "node:assert/strict";
import { test } from "node:test";
import { aSeriesVocabulary } from "../src/data/aSeriesVocabulary.ts";

test("includes the full A-series seed range", () => {
  const a1Count = aSeriesVocabulary.filter((vocab) => vocab.level === "A1").length;
  const a2Count = aSeriesVocabulary.filter((vocab) => vocab.level === "A2").length;

  assert.ok(a1Count >= 600);
  assert.ok(a2Count >= 1200);
});

test("keeps A-series seed ids and required fields valid", () => {
  const ids = new Set<string>();

  for (const vocab of aSeriesVocabulary) {
    assert.ok(vocab.id);
    assert.ok(vocab.lemma);
    assert.ok(vocab.display);
    assert.ok(vocab.koreanGloss);
    assert.ok(!ids.has(vocab.id), `duplicate vocab id: ${vocab.id}`);
    ids.add(vocab.id);
  }
});
