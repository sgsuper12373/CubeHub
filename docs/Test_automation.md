# CubeHub Automated Test Suite Walkthrough & Usage Guide

We have implemented a comprehensive, automated continuous integration testing infrastructure for CubeHub on the new `test-suite-ci` branch! This suite protects core business logic, replaces manual smoke testing checklists from `auth-verification.md` with headless browser tests, and automatically checks code quality on every git commit or pull request via GitHub Actions.

---

## 🚀 How to Use the Testing Suite

All testing commands have been integrated directly into `package.json` for effortless day-to-day developer usage.

### 1. Run Unit & DOM Tests (Vitest)
Executes all unit tests in `tests/unit/` using **Vitest** and **React Testing Library (JSDOM)**. Designed for sub-second execution during iterative coding.
```bash
npm run test
```
* **Watch Mode**: During active test-driven development, you can run tests in interactive watch mode:
  ```bash
  npm run test:watch
  ```
  *(Press `u` to update snapshots or filter tests by filename).*

---

### 2. Run Automated UI Smoke Tests (Playwright)
Spins up your local Next.js dev server on `localhost:3000` and executes real browser end-to-end (E2E) tests against Chromium using **Playwright**.
```bash
npm run test:e2e
```
* **Interactive / Debug UI Mode**: To open Playwright's visual interactive runner (allowing you to step through browser interactions line by line and inspect DOM trees), run:
  ```bash
  npx playwright test --ui
  ```
* **Viewing Reports**: If any browser test fails, an HTML report with trace diagnostics is automatically generated:
  ```bash
  npx playwright show-report
  ```

---

### 3. Complete CI Verification Suite (`npm run validate`)
Runs the exact pipeline used by GitHub Actions CI before committing or opening a pull request. Verifies TypeScript type consistency, executes ESLint code linting, and runs all Vitest unit tests in strict mode.
```bash
npm run validate
```
*(Recommended before git committing changes!)*

---

## 📂 Test Suite Structure & What Was Accomplished

| Suite & Framework | File Location | Covered Functionality | Pass Rate |
| :--- | :--- | :--- | :---: |
| **Timer Display & Penalties**<br>*(Vitest Unit)* | `tests/unit/format.test.ts` | Tested centisecond decimal alignment, zero-rounding prevention under 1m, 3-decimal formatting, `+2000ms` / `DNF` penalty formatting, and average formatting. | **10 / 10** |
| **JSON Backup Ingestion**<br>*(Vitest Unit)* | `tests/unit/import-cstimer.test.ts` | Validated standard csTimer session importing, native CubeHub `ExportEnvelope` roundtrip restores with UUID conservation, puzzle mismatch warnings, and unsupported puzzle filtering. | **4 / 4** |
| **Handle Onboarding Modal**<br>*(React RTL / JSDOM)* | `tests/unit/username-onboarding.test.tsx` | Assured modal visibility triggers automatically for default `user_<12 hex>` database usernames, remains hidden for customized profiles, and saves dismissal state to `sessionStorage`. | **3 / 3** |
| **Auth Verification Smoke**<br>*(Playwright Browser)* | `tests/e2e/auth-smoke.spec.ts` | Automated the checklists in `auth-verification.md`: Logged-out navbar Sign In triggers, form inputs & cross-links, browser native `minLength={8}` form validation, and `?next=` route gating. | **4 / 4** |
| **GitHub Actions Pipeline**<br>*(Continuous Integration)* | `.github/workflows/ci.yml` | Configured dual CI jobs (`validate` & `e2e-smoke`) on pushes and PRs to `main` and `test-suite-ci`, ensuring broken changes cannot merge without failing tests. | **Active** |

---

## 🛠️ Configuration References
- **Vitest Configuration**: `vitest.config.ts` (configures `@vitejs/plugin-react`, JSDOM test environment, and native TypeScript path alias mapping).
- **Playwright Configuration**: `playwright.config.ts` (sets local dev webserver startup timeout, parallelism, retry strategies, and Chromium target profiles).
- **CI Workflow**: `.github/workflows/ci.yml` (automates CI runner setup across Node 20 environments).
