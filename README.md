# Inventory Decision Workspace

A focused prototype for the Aetos Digilog AI Engineer assessment. It demonstrates two connected workflows:

- AI-assisted mapping of ERP/WMS fields into a canonical supply-chain model.
- Explainable identification of SKU-location stockouts over a selected horizon.

**Built by Satvik Pandey · Prepared for Aetos Digilog**

## Live prototype

[Open the Inventory Decision Workspace](https://satvik20pandey.github.io/AI-Assignment-Aetos-Digilog/)

The site is a static GitHub Pages application, so it has no server dependency and loads immediately. All data is representative. Inventory projections are deterministic and run locally in the browser.

## Run locally

Open `index.html` directly, or serve the directory with any static web server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Verify the calculation engine

Node.js 20 or newer is sufficient; there are no packages to install.

```bash
npm test
```

## Calculation used by the prototype

For each SKU-location-day:

```text
Projected available inventory
= usable on-hand
- reservations
+ confirmed receipts due by that day
- cumulative forecast demand
```

The first day where projected available inventory reaches zero is reported as the stockout day. Planned or unconfirmed receipts are excluded. Falling below safety stock is shown separately from a true stockout.

## Scope

This is a decision-support prototype, not a production ERP/WMS integration. It intentionally excludes live connectors, user authentication, model training, and purchase-order execution. The architecture and production controls are described in `Satvik_Pandey_Aetos_AI_Assignment.docx`.
