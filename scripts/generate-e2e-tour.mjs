/**
 * E2E Visual Tour Generator
 *
 * Reads the e2e-tour-data.json produced by the E2E order lifecycle tests
 * and generates a standalone HTML page with a step-by-step visual tour.
 *
 * Usage:
 *   1. Run the E2E tests:  npx playwright test tests/e2e-order-lifecycle.spec.ts --project=chromium
 *   2. Generate the tour:  node scripts/generate-e2e-tour.mjs
 *   3. Open the tour:      open e2e-tour.html
 *
 * The output is a self-contained HTML file with embedded images (base64) so
 * it can be shared as a single file or hosted on any static server.
 */

import { readFileSync, readdirSync, existsSync, writeFileSync } from "fs";
import { join, resolve } from "path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SCREENSHOT_DIR = resolve("e2e-tour-screenshots");
const TOUR_DATA_PATH = resolve("e2e-tour-data.json");
const OUTPUT_PATH = resolve("e2e-tour.html");

// ---------------------------------------------------------------------------
// Load test data
// ---------------------------------------------------------------------------

if (!existsSync(TOUR_DATA_PATH)) {
  console.error(`❌ Tour data not found at ${TOUR_DATA_PATH}`);
  console.error("   Run the E2E tests first:");
  console.error("   E2E_BASE_URL=http://localhost:5173 npx playwright test tests/e2e-order-lifecycle.spec.ts --project=chromium");
  process.exit(1);
}

const raw = readFileSync(TOUR_DATA_PATH, "utf-8");
let steps;
try {
  steps = JSON.parse(raw);
} catch {
  console.error("❌ Failed to parse tour data JSON");
  process.exit(1);
}

if (!Array.isArray(steps) || steps.length === 0) {
  console.error("❌ No tour steps found in data file");
  process.exit(1);
}

console.log(`📸 Loaded ${steps.length} tour steps`);

// ---------------------------------------------------------------------------
// Group steps by scenario
// ---------------------------------------------------------------------------

const scenarios = new Map();
for (const step of steps) {
  if (!scenarios.has(step.scenario)) {
    scenarios.set(step.scenario, {
      id: step.scenario,
      label: getScenarioLabel(step.scenario),
      steps: [],
    });
  }
  scenarios.get(step.scenario).steps.push(step);
}

function getScenarioLabel(id) {
  const labels = {
    A: "A. Happy Path — New to Completed",
    B: "B. Complaint Flow — Quantity Adjustment",
    C: "C. Partial Delivery — Multi-Batch",
    D: "D. Vendor Shipment Workflow",
  };
  return labels[id] ?? `Scenario ${id}`;
}

// ---------------------------------------------------------------------------
// Build the HTML
// ---------------------------------------------------------------------------

let scnearioNavHtml = "";
let scenarioContentHtml = "";

for (const [scenarioId, scenario] of scenarios) {
  const firstStep = scenario.steps[0];

  // Build step cards
  let stepsHtml = "";
  for (const step of scenario.steps) {
    const screenshotPath = join(SCREENSHOT_DIR, step.screenshot);
    let imgBase64 = "";

    if (existsSync(screenshotPath)) {
      const imgBuffer = readFileSync(screenshotPath);
      imgBase64 = imgBuffer.toString("base64");
    } else {
      console.warn(`⚠️  Screenshot not found: ${screenshotPath}`);
    }

    const statusIcon =
      step.status === "pass"
        ? "✅"
        : step.status === "fail"
          ? "❌"
          : "⏭️";

    const stepNum = step.step.replace(/^0+/, "") || step.step;

    stepsHtml += `
      <div class="step-card" data-scenario="${scenarioId}">
        <div class="step-header">
          <span class="step-badge">${statusIcon} Step ${stepNum}</span>
          <span class="step-label">${escapeHtml(step.label)}</span>
          <span class="step-status status-${step.status}">${step.status.toUpperCase()}</span>
        </div>
        ${
          step.detail
            ? `<div class="step-detail">${escapeHtml(step.detail)}</div>`
            : ""
        }
        ${
          imgBase64
            ? `<div class="step-screenshot">
                <img src="data:image/png;base64,${imgBase64}" alt="${escapeHtml(step.label)}" loading="lazy" />
               </div>`
            : `<div class="step-screenshot step-screenshot-empty">
                <span>📷 Screenshot not available</span>
               </div>`
        }
      </div>
    `;
  }

  const scenarioTabId = `scenario-${scenarioId.toLowerCase()}`;

  scnearioNavHtml += `
    <button class="nav-btn ${firstStep === steps[0] ? "active" : ""}"
            data-tab="${scenarioTabId}"
            onclick="switchScenario('${scenarioTabId}')">
      ${escapeHtml(scenario.label)}
      <span class="step-count">${scenario.steps.length} steps</span>
    </button>
  `;

  scenarioContentHtml += `
    <div id="${scenarioTabId}" class="scenario-content"
         ${firstStep === steps[0] ? 'style="display: block;"' : 'style="display: none;"'}>
      <div class="steps-container">
        ${stepsHtml}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Overall stats
// ---------------------------------------------------------------------------

const totalSteps = steps.length;
const passedSteps = steps.filter((s) => s.status === "pass").length;
const failedSteps = steps.filter((s) => s.status === "fail").length;

// ---------------------------------------------------------------------------
// Assemble the full HTML
// ---------------------------------------------------------------------------

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>E2E Order Lifecycle — Visual Tour</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0f1117;
      --surface: #1a1d27;
      --surface-hover: #242838;
      --border: #2a2d3a;
      --text: #e4e6ef;
      --text-muted: #8b8fa3;
      --accent: #6366f1;
      --accent-hover: #818cf8;
      --success: #22c55e;
      --warning: #f59e0b;
      --danger: #ef4444;
      --radius: 12px;
      --radius-sm: 8px;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }

    /* Header */
    .tour-header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 32px 24px 24px;
      text-align: center;
    }
    .tour-header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .tour-header p {
      color: var(--text-muted);
      margin-top: 6px;
      font-size: 0.95rem;
    }

    /* Stats bar */
    .stats-bar {
      display: flex;
      justify-content: center;
      gap: 24px;
      padding: 16px 24px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
    }
    .stat-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .stat-item strong {
      color: var(--text);
      font-size: 1.1rem;
    }
    .stat-pass strong { color: var(--success); }
    .stat-fail strong { color: var(--danger); }

    /* Scenario navigation */
    .scenario-nav {
      display: flex;
      gap: 8px;
      padding: 16px 24px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      overflow-x: auto;
    }
    .nav-btn {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: 12px 18px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .nav-btn:hover {
      background: var(--surface-hover);
      color: var(--text);
    }
    .nav-btn.active {
      background: var(--accent);
      border-color: var(--accent);
      color: white;
    }
    .nav-btn .step-count {
      font-size: 0.7rem;
      font-weight: 400;
      opacity: 0.7;
    }
    .nav-btn.active .step-count { opacity: 0.8; }

    /* Scenario content */
    .scenario-content {
      display: none;
      padding: 24px;
      max-width: 1100px;
      margin: 0 auto;
    }

    /* Step cards */
    .steps-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .step-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      transition: border-color 0.2s;
    }
    .step-card:hover {
      border-color: var(--accent);
    }

    .step-header {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .step-badge {
      font-size: 0.85rem;
      font-weight: 600;
    }
    .step-label {
      font-size: 1rem;
      font-weight: 500;
      flex: 1;
    }
    .step-status {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 3px 10px;
      border-radius: 999px;
      text-transform: uppercase;
    }
    .status-pass {
      background: rgba(34, 197, 94, 0.12);
      color: var(--success);
    }
    .status-fail {
      background: rgba(239, 68, 68, 0.12);
      color: var(--danger);
    }
    .status-skip {
      background: rgba(245, 158, 11, 0.12);
      color: var(--warning);
    }

    .step-detail {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 12px;
      padding: 8px 12px;
      background: rgba(99, 102, 241, 0.06);
      border-radius: 6px;
    }

    .step-screenshot {
      border-radius: var(--radius-sm);
      overflow: hidden;
      border: 1px solid var(--border);
    }
    .step-screenshot img {
      display: block;
      width: 100%;
      height: auto;
      max-height: 600px;
      object-fit: contain;
      background: #fff;
    }
    .step-screenshot-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 60px 24px;
      background: var(--surface-hover);
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    /* Footer */
    .tour-footer {
      text-align: center;
      padding: 24px;
      color: var(--text-muted);
      font-size: 0.8rem;
      border-top: 1px solid var(--border);
      margin-top: 16px;
    }
    .tour-footer a {
      color: var(--accent);
      text-decoration: none;
    }
    .tour-footer a:hover {
      text-decoration: underline;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .scenario-nav { flex-direction: column; }
      .nav-btn { width: 100%; }
      .stats-bar { gap: 12px; }
    }
  </style>
</head>
<body>

  <div class="tour-header">
    <h1>🧪 E2E Order Lifecycle — Visual Tour</h1>
    <p>Step-by-step walkthrough of the VA Trace order lifecycle tests</p>
  </div>

  <div class="stats-bar">
    <div class="stat-item">Total: <strong>${totalSteps}</strong></div>
    <div class="stat-item stat-pass">Passed: <strong>${passedSteps}</strong></div>
    <div class="stat-item stat-fail">Failed: <strong>${failedSteps}</strong></div>
    <div class="stat-item">Scenarios: <strong>${scenarios.size}</strong></div>
  </div>

  <div class="scenario-nav">
    ${scnearioNavHtml}
  </div>

  ${scenarioContentHtml}

  <div class="tour-footer">
    Generated from Playwright E2E tests ·
    <a href="https://github.com/perdanahary/va-trace" target="_blank">va-trace</a>
  </div>

  <script>
    function switchScenario(tabId) {
      // Hide all scenarios
      document.querySelectorAll('.scenario-content').forEach(el => {
        el.style.display = 'none';
      });
      // Deactivate all nav buttons
      document.querySelectorAll('.nav-btn').forEach(el => {
        el.classList.remove('active');
      });
      // Show the selected scenario
      document.getElementById(tabId).style.display = 'block';
      // Activate the clicked button
      event.currentTarget.classList.add('active');
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      const btns = Array.from(document.querySelectorAll('.nav-btn'));
      const active = btns.findIndex(b => b.classList.contains('active'));
      if (e.key === 'ArrowRight' && active < btns.length - 1) {
        btns[active + 1].click();
        btns[active + 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else if (e.key === 'ArrowLeft' && active > 0) {
        btns[active - 1].click();
        btns[active - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  </script>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Helper: escape HTML in user-facing text
// ---------------------------------------------------------------------------

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------

writeFileSync(OUTPUT_PATH, html, "utf-8");

console.log(`✅ Visual tour generated: ${OUTPUT_PATH}`);
console.log(`   ${scenarios.size} scenarios, ${totalSteps} steps (${passedSteps} passed, ${failedSteps} failed)`);
console.log("");
console.log(`   Open in browser:   open ${OUTPUT_PATH}`);
console.log("   Or just double-click the file to open it.");
