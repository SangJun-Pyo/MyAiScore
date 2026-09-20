import assert from "node:assert/strict";
import test from "node:test";
import { parseLocale } from "../../src/i18n/locale.js";
import { messagesFor } from "../../src/i18n/messages.js";
import { REPOSITORY_PROFILE_POLE_TONE, repositoryProfileNameCatalog } from "../../src/i18n/repositoryProfilePresentation.js";

test("locale parsing defaults invalid or missing cookie values to Korean", () => {
  assert.equal(parseLocale(undefined), "ko");
  assert.equal(parseLocale("ko"), "ko");
  assert.equal(parseLocale("en"), "en");
  assert.equal(parseLocale("EN"), "ko");
  assert.equal(parseLocale("javascript:alert(1)"), "ko");
});

test("both locale catalogs expose stable API-error and repository-axis keys", () => {
  const ko = messagesFor("ko");
  const en = messagesFor("en");
  assert.deepEqual(Object.keys(en.evaluate.errors).sort(), Object.keys(ko.evaluate.errors).sort());
  assert.deepEqual(Object.keys(en.presentation.axes).sort(), Object.keys(ko.presentation.axes).sort());
  assert.equal(en.presentation.axes.verification.label, "Verification basis");
  assert.equal(ko.presentation.axes.verification.label, "검증 기반");
  assert.equal(ko.presentation.axes.traceability.label, "기록");
});

test("SJTI presentation keeps complete descriptions and neutral left-right tones", () => {
  const profiles = repositoryProfileNameCatalog("ko");
  assert.equal(profiles.length, 16);
  assert.equal(profiles.every(profile => profile.description.length > 0), true);
  assert.deepEqual(REPOSITORY_PROFILE_POLE_TONE, {
    D: "gold", H: "gold", S: "gold", F: "gold",
    R: "violet", P: "violet", T: "violet", E: "violet",
  });
});
