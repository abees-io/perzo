import { test } from "node:test";
import assert from "node:assert/strict";
import { getGreeting } from "../src/lib/greeting";

test("greeting changes at each local time boundary", () => {
  assert.match(getGreeting(4), /late-night/);
  assert.equal(getGreeting(5), "Good morning.");
  assert.equal(getGreeting(11), "Good morning.");
  assert.equal(getGreeting(12), "Good afternoon.");
  assert.equal(getGreeting(16), "Good afternoon.");
  assert.equal(getGreeting(17), "Good evening.");
  assert.equal(getGreeting(20), "Good evening.");
  assert.match(getGreeting(21), /late-night/);
  assert.match(getGreeting(0), /late-night/);
});

test("personalizes with an optional name without an empty comma", () => {
  assert.equal(getGreeting(8, " Alex "), "Good morning, Alex.");
  assert.equal(getGreeting(15, ""), "Good afternoon.");
  assert.equal(getGreeting(23, "Sam"), "It’s a late-night jam session, Sam.");
});
