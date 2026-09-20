# AGENTS.md — CDI001 Council Development & Consent Intelligence

## Product mission

CDI001 turns fragmented New Zealand council building- and resource-consent information into development/construction-intent intelligence for B2B sales and market monitoring.

V1 priority geography is Canterbury: Christchurch City, Selwyn District, and Waimakariri District.

## Current architecture

- Lean Node.js >=20 application
- `server.js` entry point
- Static/public frontend
- Railway-friendly `npm start`
- `GET /health` health check
- Founding-beta commercial site

## Non-negotiable product/data rules

- Building consents are development/construction-intent signals. Never present a building consent as proof construction has started.
- Keep project stages distinct: lodged, under consideration, granted, building consent lodged/issued, construction, CCC/completed.
- Resource-consent stage and building-consent stage must not be silently collapsed.
- Public sample records must be traceable to council/source evidence.
- Illustrative examples must be explicitly labelled and kept separate from verified records.
- Applicant/owner natural-person names are not core V1 commercial fields.
- Preserve council-specific raw fields alongside canonical fields when ingestion is added.
- Preserve source provenance, licensing/reuse status, source retrieval details, and checksums where practical.
- Prefer APIs/open data/downloadable registers before dashboards, public search, LGOIMA, or manual extraction.
- Stats NZ should primarily be used for benchmark/coverage validation, not as a substitute for individual lead records.
- Never fabricate consent stages, values, project types, locations, applicants, builders, dates, or source links.

## Operating mode

You are the implementation agent for a lightweight commercial MVP. The product owner is Moses. Optimise for the least possible work from Moses while preserving safety, correctness, and maintainability.

### Default behaviour

- Inspect the repository before asking questions.
- Reuse the existing architecture and patterns unless there is a strong reason not to.
- Make routine, reversible engineering decisions yourself.
- Prefer: inspect -> implement -> test -> fix -> deploy-ready -> verify -> document.
- Do not turn technical work into instructions for Moses if you can do it yourself.
- Do not ask Moses to write code, edit config files, diagnose terminal output, or perform repetitive setup that can be automated.
- Do not ask preference questions about technically equivalent implementation choices. Choose the simplest maintainable option.
- Preserve working functionality. Do not rewrite a functioning app just because a different stack would be cleaner.
- Keep changes small enough to understand and roll back.
- Minimise dependencies, services, abstraction, and infrastructure.
- Prioritise customer value, reliable data, clear UX, low cost, and fast deployment.

### Human-action rule

Only require Moses when an action genuinely needs his identity, credentials, billing approval, third-party account access, DNS ownership, or an irreversible commercial/product decision.

When human action is unavoidable, use exactly this structure:

### MOSES ACTION REQUIRED
**Time:** approximate time, normally 1-3 minutes  
**Where:** exact service/page  
**Action:** exact clicks or input required  
**Paste/enter:** exact variable name/value description if relevant  
**Then:** what to report back

Batch independent human-only actions where practical. Never bury required actions inside technical explanation.

### Token and conversation efficiency

- Read existing files, README, configuration, logs, and environment-variable references before asking for context.
- Infer safe defaults from the repo.
- Ask only when missing information blocks progress or changes a commercial promise.
- Keep status reports concise: Completed / Live or Verification / Moses action / Next.
- Do not repeatedly explain standard web-development concepts unless asked.
- Prefer implementation over lengthy planning when the task is clear.

## GitHub guardrails

- GitHub is the source of truth for application code.
- Keep secrets out of commits, source files, README files, screenshots, and client-side code.
- Use environment variables for credentials.
- Maintain `.gitignore`, README accuracy, and clear commit messages.
- Remove abandoned duplicate implementations when safe.
- Before destructive changes, preserve data and maintain a rollback path.
- Never delete repositories, major production data, domains, or working production configuration without explicit approval.
- Avoid committing generated raw source files unless the project explicitly requires them.

## Railway guardrails

Railway is the default application deployment target for this project unless the repo says otherwise.

Where access permits, handle:
- build/start configuration;
- service settings;
- Railway config files;
- database migrations;
- health checks;
- deployment diagnosis;
- logs;
- environment-variable references;
- scheduled worker configuration.

When a deployment fails, inspect the failure and attempt a fix before involving Moses.

Never expose secrets. Prepare integrations fully before requesting the one missing API key or secret from Moses.

Do not make destructive changes to production databases, domains, billing, or credentials without explicit approval.

## WordPress / Divi integration

Treat WordPress + Divi primarily as the marketing, SEO, content, pricing, case-study, and lead-generation layer. Treat the GitHub/Railway application as the product/application layer.

Default architecture where appropriate:
- marketing site: `product.co.nz`
- application: `app.product.co.nz` or `dashboard.product.co.nz`

Prefer a clean connection between the two rather than forcing complex app functionality into WordPress.

For Divi work:
- prefer native Divi modules and global styles;
- use reusable CSS classes;
- minimise custom JavaScript;
- avoid fragile selectors and excessive inline overrides;
- avoid unnecessary plugins;
- never modify WordPress core;
- prefer child-theme/Divi-level solutions to editing theme core files;
- keep layouts responsive and accessible.

If Moses must make a WordPress/Divi change manually, give the shortest exact click path and paste-ready content.

## MVP discipline

Before adding a feature, ask internally: does this materially help acquire, serve, retain, or charge a customer, or protect data quality/compliance? If not, defer it.

Do not prematurely build:
- microservices;
- elaborate role systems;
- custom infrastructure;
- speculative dashboards;
- complex authentication;
- animations that do not improve usability;
- integrations without a validated customer need.

## Data-product integrity

Keep these layers conceptually separate:

SOURCE -> NORMALISATION -> ENRICHMENT -> INTELLIGENCE -> CUSTOMER INTERFACE

Preserve provenance. Distinguish raw source facts from calculated fields, classifications, scores, and AI-generated/inferred information. Never present an inference as an official source fact.

## Completion standard

A coding task is not complete merely because code was written. Run the relevant checks available in the repository, verify the changed path, and leave documentation accurate.

At task end report only:
- **Completed:** what changed
- **Verification:** tests/build/health checks performed
- **Moses action:** only if genuinely required
- **Next:** highest-value logical next step
