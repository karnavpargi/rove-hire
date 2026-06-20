# ROVE Hire — AGENTS.md

## Project state

Pre-implementation. No code, config, or package manifests exist. This is the
spec-only phase for the ROVE Hire take-home exercise.

- **Project Category**: Full-Stack Recruitment Tool (HR Dashboard + Candidate Portal)

## Requirements

`requirements/excercise_full_stack.md` — the full exercise brief.
`requirements/JD.md` — job description (context for desired skills).
`requirements/phases/*` - Msst follow all phases
Read **both** before starting any implementation.

### Key Insights from JD.md for Implementation

- **Authentication & Security**: Implement secure auth flows (sessions/JWT/OAuth), API-layer authorization, and guard against common web vulnerabilities (OWASP Top 10).
- **Database Correctness**: RELATIONAL schema with transactions, correct indexes, and query efficiency.
- **Testing Discipline**: Focus on unit/integration/E2E testing (e.g. Vitest/Jest, Playwright) to verify components and endpoints.
- **Tooling Preferences**: Nice-to-haves include ORMs (Prisma, Drizzle) and structured logging/observability.

## Mandated tech

See [MANDATED_TECH.md](file:///Users/karnavpargi/Code/2026/markitdown/excercise/MANDATED_TECH.md) for the complete list of mandated technologies.

## Candidate status state machine & Pipeline Rules

See [PIPELINE.md](file:///Users/karnavpargi/Code/2026/markitdown/excercise/PIPELINE.md) for details on the candidate status states, rules, timeline events, and out-of-scope details.

## Pre-existing artifacts (ignore during build)

- `graphify-out/` — knowledge-graph analysis of requirements, not source code.
- `.taskmaster/tasks/` — empty.
- `raw/graphify-out/` — empty.

## Context & Graph Tooling

- **Context7 (`ctx7`)**: The development workflow must utilize `ctx7` to fetch real-time, version-specific external documentation and package examples, ensuring accurate API usage and preventing model hallucinations.
- **Graphify**: Use `graphify` to build, inspect, and maintain the project's knowledge graph. Ensure dependency analysis and structure diagrams are kept up-to-date in `graphify-out/`.
- **UI/UX Pro Max**: The development workflow must utilize the installed [.agent/skills/ui-ux-pro-max](.agent/skills/ui-ux-pro-max/SKILL.md) skill to ensure premium design quality, rich aesthetics, cohesive styling systems, and high-fidelity user flows.

## Design System Scaffold Power (daily use)

The `design-system-scaffold` Kiro Power is installed and provides a complete, technology-agnostic design system with 57 component specs, patterns, templates, and theme tooling. Use it as the authoritative reference for all UI implementation.

### When to activate this power

Activate the power (`design-system-scaffold`) before any of the following tasks:

| Task                                | What to load                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| Implement or modify a UI component  | `design-system.md` + `components/[name].md` + `default-theme.md`                  |
| Apply or validate the default theme | `default-theme.md` + `technical-guidelines.md`                                    |
| Generate a new theme for ROVE Hire  | `workflows.md` → "Generate a New Theme" + `default-theme.md`                      |
| Generate a Storybook                | `workflows.md` → "Generate a Storybook" + `storybook.md`                          |
| Run a design/heuristic review       | `workflows.md` → "Heuristic Review" + `design-guidelines.md` + `ui-guidelines.md` |
| Compose a layout or page            | Relevant template file + component files                                          |
| Write UI copy or microcopy          | `copy-guidelines.md` + `glossary.md`                                              |

### 5 Daily-Use Workflows

1. **Generate a new theme** — Say "generate a new theme" to create a custom branded theme (e.g., ROVE Hire brand). Walks through token-by-token population or bulk import from Figma/CSS. Output: theme `.md` file + CSS variable block for the project stylesheet.

2. **Generate a Storybook** — Say "generate a Storybook" to scaffold Storybook with theme/mode switching, accessibility addon, and story files for all installed shadCN components. Output: configured Storybook at `localhost:6006`.

3. **Run a heuristic review** — Say "run a heuristic review" after building a prototype. Three-tier audit (binary checks → signal detection → structural proxies) against design guidelines. Output: findings report with actionable fixes.

4. **Implement a component** — Say "implement [component name]" (e.g., "implement Dialog", "implement Data Table"). Loads the full spec (behavior, API, variants, accessibility, HTML, CSS, theme mapping) and generates compliant code. Always uses CSS variables, supports light/dark, and meets WCAG 2.2.

5. **Load a layout template** — Say "show me the [template] template" (Dashboard, Login, Calendar, Sidebar). Loads the layout blueprint for page-level structure without business logic, ready to compose with real components.

### Hard Rules (enforced by the power)

- Components use CSS variables only — no hardcoded hex/rgb/oklch in component code.
- All components must support both light and dark modes.
- WCAG 2.2 conformance required for all components.
- Theme variable names are fixed — never rename or restructure tokens.
- Templates define layout only — no behavior, state, or business logic.

## Config quirks

- `.agents/settings.local.json` disables the firecrawl MCP server.
- No `opencode.json` exists yet — create one if the project's build/lint/test
  commands become complex enough to warrant it.

## Submission requirements (for context)

Build must include:

- Seed data: 3 job openings, 5 candidates across all pipeline states.
- Test HR credentials pre-configured.
- README covering: hosting, tech stack choices, PDF approach, what's next, known issues.
