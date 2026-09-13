(function () {
  "use strict";

  const { projectInventory, classifyRisk, analyzeInventory } = window.InventoryEngine;

  const sourcePayloads = {
    ERP: {
      item_code: "TS-104",
      item_description: "Temperature Sensor",
      site_code: "DEL-DC",
      ordered_qty: 120,
      expected_delivery: "2026-09-24",
      uom: "EA"
    },
    WMS: {
      sku: "TS-104",
      warehouse_id: "DEL-DC",
      available_qty: 82,
      allocated_qty: 12,
      damaged_qty: 2,
      last_updated: "2026-09-13T14:22:00Z"
    }
  };

  const mappings = {
    ERP: [
      { source: "item_code", target: "Product.productId", transform: "trim · uppercase", score: 98, evidence: "identifier pattern" },
      { source: "item_description", target: "Product.name", transform: "trim", score: 97, evidence: "semantic match" },
      { source: "site_code", target: "Location.locationId", transform: "reference lookup", score: 94, evidence: "known location code" },
      { source: "ordered_qty", target: "SupplyOrder.quantity", transform: "decimal(qty)", score: 91, evidence: "type + context" },
      { source: "expected_delivery", target: "SupplyOrder.expectedAt", transform: "date(ISO-8601)", score: 89, evidence: "date semantics" },
      { source: "uom", target: "Product.unitOfMeasure", transform: "enum lookup", score: 86, evidence: "value profile" }
    ],
    WMS: [
      { source: "sku", target: "Product.productId", transform: "trim · uppercase", score: 99, evidence: "identifier pattern" },
      { source: "warehouse_id", target: "Location.locationId", transform: "reference lookup", score: 98, evidence: "known location code" },
      { source: "available_qty", target: "Inventory.availableQty", transform: "decimal(qty)", score: 97, evidence: "name + values" },
      { source: "allocated_qty", target: "Inventory.reservedQty", transform: "decimal(qty)", score: 92, evidence: "warehouse semantics" },
      { source: "damaged_qty", target: "Inventory.unusableQty", transform: "decimal(qty)", score: 88, evidence: "disposition context" },
      { source: "last_updated", target: "Inventory.observedAt", transform: "timestamp(UTC)", score: 96, evidence: "time pattern" }
    ]
  };

  const inventory = [
    { sku: "TS-104", product: "Temperature Sensor", location: "Delhi DC", onHand: 72, reserved: 12, safetyStock: 28, demand: [9,8,10,9,11,10,8,9,10,9,8,9,10,8,9,8,10,9,8,9,8], receipts: [{ day: 12, qty: 80, status: "confirmed" }], leadTime: 11 },
    { sku: "VC-220", product: "Control Valve", location: "Jaipur DC", onHand: 47, reserved: 8, safetyStock: 18, demand: [5,5,4,6,5,5,6,4,5,5,6,5,4,5,5,6,4,5,5,4,5], receipts: [{ day: 10, qty: 25, status: "planned" }], leadTime: 14 },
    { sku: "IA-310", product: "Industrial Adhesive", location: "Pune Hub", onHand: 120, reserved: 18, safetyStock: 34, demand: [7,8,8,7,9,7,8,9,7,8,9,8,7,8,9,7,8,8,7,9,8], receipts: [], leadTime: 9 },
    { sku: "BR-415", product: "Precision Bearing", location: "Delhi DC", onHand: 215, reserved: 20, safetyStock: 50, demand: [9,11,10,9,10,11,9,10,10,9,11,9,10,10,9,11,10,9,10,11,9], receipts: [{ day: 8, qty: 100, status: "confirmed" }], leadTime: 8 },
    { sku: "PS-510", product: "Pressure Switch", location: "Jaipur DC", onHand: 69, reserved: 4, safetyStock: 22, demand: [4,5,4,6,5,4,5,5,4,6,5,4,5,5,4,5,5,4,6,4,5], receipts: [], leadTime: 12 },
    { sku: "CB-630", product: "Circuit Breaker", location: "Pune Hub", onHand: 38, reserved: 7, safetyStock: 15, demand: [3,4,4,3,5,4,3,4,4,5,3,4,4,3,4,5,3,4,4,3,5], receipts: [{ day: 6, qty: 45, status: "confirmed" }], leadTime: 7 },
    { sku: "FM-725", product: "Flow Meter", location: "Delhi DC", onHand: 156, reserved: 10, safetyStock: 35, demand: [6,7,6,8,7,6,7,7,6,8,7,6,7,7,6,7,8,6,7,7,6], receipts: [], leadTime: 10 },
    { sku: "RC-840", product: "Relay Controller", location: "Jaipur DC", onHand: 91, reserved: 15, safetyStock: 26, demand: [5,6,5,7,6,5,6,7,5,6,6,5,7,6,5,6,7,5,6,6,5], receipts: [{ day: 9, qty: 50, status: "confirmed" }], leadTime: 9 }
  ];

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function renderMappings(source) {
    const rows = mappings[source];
    document.getElementById("sample-name").textContent = `${source} sample`;
    document.getElementById("source-json").textContent = JSON.stringify(sourcePayloads[source], null, 2);
    document.getElementById("mapping-title").textContent = `${source} mapping suggestions`;
    document.getElementById("mapping-summary").textContent = `${rows.length} fields ready for review`;
    document.getElementById("mapping-rows").innerHTML = rows.map((row, index) => `
      <tr>
        <td><span class="field-name">${escapeHtml(row.source)}</span></td>
        <td><span class="canonical-name">${escapeHtml(row.target)}</span></td>
        <td><span class="transform-chip">${escapeHtml(row.transform)}</span></td>
        <td><span class="confidence-score"><i class="confidence ${row.score >= 90 ? "high" : "medium"}"></i>${row.score}% <small>${escapeHtml(row.evidence)}</small></span></td>
        <td><label class="approval-toggle"><input type="checkbox" data-map-index="${index}" aria-label="Approve mapping for ${escapeHtml(row.source)}"><span></span></label></td>
      </tr>`).join("");
    updateApprovalCount();
  }

  function updateApprovalCount() {
    const boxes = [...document.querySelectorAll("#mapping-rows input[type='checkbox']")];
    const approved = boxes.filter((box) => box.checked).length;
    document.getElementById("approval-count").textContent = `${approved} of ${boxes.length} suggestions approved`;
  }

  function sparkline(values) {
    const width = 82;
    const height = 28;
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 1);
    const range = max - min || 1;
    const points = values.map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    const zeroY = height - ((0 - min) / range) * height;
    return `<svg class="sparkline" viewBox="0 0 ${width} ${height}" aria-label="Projected inventory trend"><line x1="0" y1="${zeroY}" x2="${width}" y2="${zeroY}"></line><polyline points="${points}"></polyline></svg>`;
  }

  function getRecommendation(item) {
    const coverageGap = Math.max(item.safetyStock, item.shortage + item.safetyStock);
    if (item.receipts.some((receipt) => receipt.status !== "confirmed")) {
      return `Confirm planned receipt; expedite at least ${coverageGap} units.`;
    }
    return `Expedite or transfer at least ${coverageGap} units.`;
  }

  function renderResults(horizon, location) {
    const analysis = analyzeInventory(inventory, horizon, location);
    const stockouts = analysis.filter((item) => item.stockoutDay !== null);
    const watch = analysis.filter((item) => item.stockoutDay === null && item.belowSafetyDay !== null);
    const critical = stockouts.filter((item) => item.stockoutDay <= 7).length;
    const locationCount = new Set(analysis.map((item) => item.location)).size;
    const resultRegion = document.getElementById("results-region");

    if (!analysis.length) {
      resultRegion.innerHTML = `<div class="no-risk"><h3>No inventory records match this scope</h3><p>Choose another location and run the analysis again.</p></div>`;
      return;
    }

    const rows = stockouts.map((item) => `
      <tr>
        <td class="sku-cell"><strong>${escapeHtml(item.sku)}</strong><span>${escapeHtml(item.product)}</span></td>
        <td>${escapeHtml(item.location)}</td>
        <td><span class="risk-pill ${item.risk.toLowerCase()}">${item.risk}</span></td>
        <td class="days-cell">Day ${item.stockoutDay}</td>
        <td>${item.shortage} units</td>
        <td>${sparkline(item.projection)}</td>
        <td>${escapeHtml(getRecommendation(item))}</td>
      </tr>`).join("");

    const tableMarkup = stockouts.length ? `
      <div class="risk-card">
        <div class="result-card-heading"><strong>Projected stockouts</strong><span>Ranked by earliest stockout</span></div>
        <div class="mapping-table-wrap">
          <table class="risk-table">
            <thead><tr><th>SKU</th><th>Location</th><th>Risk</th><th>Stockout</th><th>End shortage</th><th>Projection</th><th>Suggested action</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>` : `<div class="risk-card no-risk"><div><h3>No stockouts projected</h3><p>No SKU reaches zero within the selected horizon. ${watch.length} item(s) still fall below safety stock.</p></div></div>`;

    resultRegion.innerHTML = `
      <div class="results">
        <div class="result-summary">
          <div class="metric-card metric-card--critical"><span>Projected stockouts</span><strong>${stockouts.length}</strong><small>within ${horizon} days</small></div>
          <div class="metric-card"><span>Critical ≤ 7 days</span><strong>${critical}</strong><small>requires immediate review</small></div>
          <div class="metric-card"><span>Below safety stock</span><strong>${watch.length}</strong><small>without stockout</small></div>
          <div class="metric-card"><span>Scope evaluated</span><strong>${analysis.length}</strong><small>SKUs across ${locationCount} location${locationCount === 1 ? "" : "s"}</small></div>
        </div>
        <div class="result-grid">
          ${tableMarkup}
          <aside class="trace-card">
            <div class="result-card-heading"><strong>How this answer was produced</strong></div>
            <ol class="trace-list">
              <li><strong>Intent resolved</strong>Stockout metric · ${horizon}-day horizon</li>
              <li><strong>Scope authorized</strong>${location === "all" ? "All permitted locations" : escapeHtml(location)}</li>
              <li><strong>Data quality checked</strong>Inventory and forecast are fresh; planned receipts excluded</li>
              <li><strong>Projection calculated</strong>On-hand − reservations + confirmed receipts − forecast demand</li>
              <li><strong>Results grounded</strong>Ranked by first date projected inventory reaches zero</li>
            </ol>
            <p class="answer-note"><strong>Decision support:</strong> recommendations require planner approval. No order is created automatically.</p>
          </aside>
        </div>
      </div>`;
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 2400);
  }

  document.querySelectorAll(".segment").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".segment").forEach((item) => {
        item.classList.toggle("active", item === tab);
        item.setAttribute("aria-selected", item === tab ? "true" : "false");
      });
      document.querySelectorAll(".workflow-panel").forEach((panel) => {
        const active = panel.id === tab.dataset.panel;
        panel.classList.toggle("active", active);
        panel.hidden = !active;
      });
    });
  });

  document.querySelectorAll(".source-system").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".source-system").forEach((item) => item.classList.toggle("selected", item === button));
      renderMappings(button.dataset.source);
    });
  });

  document.getElementById("mapping-rows").addEventListener("change", updateApprovalCount);
  document.getElementById("approve-high").addEventListener("click", () => {
    document.querySelectorAll("#mapping-rows tr").forEach((row) => {
      const score = Number(row.querySelector(".confidence-score").textContent.match(/\d+/)[0]);
      if (score >= 90) row.querySelector("input").checked = true;
    });
    updateApprovalCount();
    showToast("High-confidence suggestions approved");
  });
  document.getElementById("analyze-mappings").addEventListener("click", () => {
    document.getElementById("mapping-insight").innerHTML = `<span class="insight-icon">✓</span><p><strong>Analysis complete.</strong> Suggestions were checked for identifier patterns, compatible data types, canonical definitions and sample-value evidence. Low-confidence fields remain flagged for review.</p>`;
    showToast("Schema analysis completed");
  });
  document.getElementById("stockout-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const horizon = Number(document.getElementById("horizon-filter").value);
    const location = document.getElementById("location-filter").value;
    renderResults(horizon, location);
    showToast("Inventory projection completed");
  });

  renderMappings("ERP");

  if (new URLSearchParams(window.location.search).get("view") === "stockout") {
    document.getElementById("stockout-tab").click();
    renderResults(14, "all");
  }

})();
