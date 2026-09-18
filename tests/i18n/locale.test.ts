import assert from "node:assert/strict";
import test from "node:test";
import { parseLocale } from "../../src/i18n/locale.js";
import { messagesFor } from "../../src/i18n/messages.js";

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
});
