(function (root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) module.exports = engine;
  else root.InventoryEngine = engine;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function projectInventory(item, horizon) {
    let available = item.onHand - item.reserved;
    let stockoutDay = null;
    let belowSafetyDay = null;
    const projection = [available];

    for (let day = 1; day <= horizon; day += 1) {
      const confirmed = item.receipts
        .filter((receipt) => receipt.status === "confirmed" && receipt.day === day)
        .reduce((sum, receipt) => sum + receipt.qty, 0);
      available += confirmed - (item.demand[day - 1] || item.demand[item.demand.length - 1]);
      projection.push(available);
      if (belowSafetyDay === null && available <= item.safetyStock) belowSafetyDay = day;
      if (stockoutDay === null && available <= 0) stockoutDay = day;
    }

    return {
      ...item,
      stockoutDay,
      belowSafetyDay,
      projectedEnd: available,
      shortage: Math.max(0, -available),
      projection
    };
  }

  function classifyRisk(result) {
    if (result.stockoutDay !== null && result.stockoutDay <= 7) return "Critical";
    if (result.stockoutDay !== null) return "High";
    if (result.belowSafetyDay !== null) return "Watch";
    return "Healthy";
  }

  function analyzeInventory(items, horizon, location) {
    return items
      .filter((item) => location === "all" || item.location === location)
      .map((item) => ({ ...projectInventory(item, horizon), risk: null }))
      .map((item) => ({ ...item, risk: classifyRisk(item) }))
      .sort((a, b) => (a.stockoutDay ?? 999) - (b.stockoutDay ?? 999));
  }

  return { projectInventory, classifyRisk, analyzeInventory };
});
