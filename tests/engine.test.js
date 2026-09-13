const test = require("node:test");
const assert = require("node:assert/strict");
const { projectInventory, classifyRisk, analyzeInventory } = require("../assets/engine.js");

function item(overrides = {}) {
  return {
    sku: "SKU-1",
    location: "Delhi DC",
    onHand: 20,
    reserved: 5,
    safetyStock: 8,
    demand: [4, 4, 4, 4, 4],
    receipts: [],
    ...overrides
  };
}

test("subtracts reservations before projecting demand", () => {
  const result = projectInventory(item(), 4);
  assert.deepEqual(result.projection, [15, 11, 7, 3, -1]);
  assert.equal(result.belowSafetyDay, 2);
  assert.equal(result.stockoutDay, 4);
  assert.equal(result.shortage, 1);
});

test("includes confirmed receipts and excludes planned receipts", () => {
  const result = projectInventory(item({
    receipts: [
      { day: 2, qty: 10, status: "confirmed" },
      { day: 3, qty: 100, status: "planned" }
    ]
  }), 4);
  assert.deepEqual(result.projection, [15, 11, 17, 13, 9]);
  assert.equal(result.stockoutDay, null);
});

test("classifies risk using the first stockout day", () => {
  assert.equal(classifyRisk({ stockoutDay: 7, belowSafetyDay: 2 }), "Critical");
  assert.equal(classifyRisk({ stockoutDay: 10, belowSafetyDay: 4 }), "High");
  assert.equal(classifyRisk({ stockoutDay: null, belowSafetyDay: 8 }), "Watch");
  assert.equal(classifyRisk({ stockoutDay: null, belowSafetyDay: null }), "Healthy");
});

test("filters locations and sorts earliest stockout first", () => {
  const results = analyzeInventory([
    item({ sku: "LATE", onHand: 25 }),
    item({ sku: "EARLY", onHand: 13 }),
    item({ sku: "OTHER", location: "Jaipur DC", onHand: 8 })
  ], 5, "Delhi DC");
  assert.deepEqual(results.map((result) => result.sku), ["EARLY", "LATE"]);
});
