# dsh-superpower

[English](./README.md) | [中文](./README.zh.md)

[![npm](https://img.shields.io/npm/v/@wenaixi%2Fdsh-superpower?label=npm)](https://www.npmjs.com/package/@wenaixi/dsh-superpower)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![DSH](https://img.shields.io/badge/DSH-Plugin-7c3aed)](https://github.com/deepseek-ai/deepseek-harness)

<img src="./icon.png" alt="@wenaixi/dsh-superpower" width="128" height="128">

A DSH port of [obra/superpowers](https://github.com/obra/superpowers). 15 skills are injected into `ctx.skills`. Skill bodies are the official English originals; the panel switches each skill's name and description between Chinese and English.

## Install

Node 20+, pnpm 11+, and the dsh runtime (`npm i -g @deepseek-ai/dsh`). Examples use the `web` profile; substitute your own profile name.

```bash
# A - npm (recommended, always latest)
dsh plugin --profile web add @wenaixi/dsh-superpower

# B - GitHub (bypasses mirror lag)
dsh plugin --profile web add github:Wenaixi/dsh-superpower

# Verify
dsh --profile web --dump-config | grep -A2 "@wenaixi/dsh-superpower"
# # == @wenaixi/dsh-superpower / - id: superpowers

dsh --profile web  # skills are available immediately
```

Pin a version by appending `@<version>` (`@wenaixi/dsh-superpower@7.5.7`) or `#v7.5.7`.

The old unscoped package name `dsh-superpower` is deprecated (`npm deprecate`); use the scoped one.

Local development or offline install:

```bash
git clone https://github.com/Wenaixi/dsh-superpower && cd dsh-superpower
pnpm install && pnpm build && node scripts/verify.mjs   # ALL PASS
dsh plugin --profile web add ./                           # install from local path
pnpm pack && dsh plugin --profile web add ./wenaixi-dsh-superpower-*.tgz

# Update / remove
dsh plugin --profile web add @wenaixi/dsh-superpower
dsh plugin --profile web remove @wenaixi/dsh-superpower
```

## What it is

A prescriptive engineering methodology: design first, slice the plan into verifiable steps, drive with tests, find the root cause before fixing, and run verification commands before claiming completion. It ships as a `dsh.bundle`, writes nothing into your home directory, uninstalls cleanly, and rebuilds itself through HMR.

Skill bodies are the upstream English originals (DSH-adapted: symbols, platform references, DSH-only sections). Each `SKILL.md` declares both an English `description` and a Chinese `description_zh`; the panel's language switch picks which one the model sees, without changing the body.

## Skills

| Skill | When to use |
|---|---|
| `using-superpowers` | Start of every conversation: check for applicable skills before anything else |
| `brainstorming` | Before creative work: clarify intent, requirements, and design |
| `writing-plans` | Once the design is settled, slice it into verifiable tasks |
| `using-git-worktrees` | When work needs an isolated workspace |
| `executing-plans` | Execute the plan yourself in this session |
| `subagent-driven-development` | A plan with independent tasks, dispatched to subagents |
| `dispatching-parallel-agents` | Two or more independent tasks, dispatched in parallel |
| `test-driven-development` | Write the test before the implementation |
| `systematic-debugging` | A bug appeared: find the root cause before proposing fixes |
| `verification-before-completion` | Run verification commands before claiming completion |
| `requesting-code-review` | Request review after finishing work, before a PR |
| `receiving-code-review` | Verify review feedback technically before implementing it |
| `diagnosing-superpowers` | A session went wrong or cost too much: find out why |
| `finishing-a-development-branch` | Decide whether to merge, open a PR, or keep the branch |
| `writing-skills` | Create or edit a skill |

Tool mapping (Bash to pwsh, Read/Write to fs, and so on) lives in `skills/using-superpowers/references/dsh-tools.md` and its English twin `dsh-tools.en.md`.

### Same-name precedence

The official registry arbitrates same-layer name collisions by ascending `rank`. This bundle registers at rank 10, below `dsh-skill-filesystem` project and user roots (100-500) and official bundled skills (600). Whenever a same-name skill exists, this bundle's copy wins and the two rule sets never fight.

## Skill switches and language

Open the `@wenaixi/dsh-superpower` card in the plugin manager; the panel sits at the bottom of its detail page.

- One switch per skill. Off means both sides lose it: the model no longer sees it in the available-skill catalog and `skill` tool calls are rejected; you can no longer reach it from slash-command completion or the CLI skill list.
- A single `中文 / English` button sits at the top of the panel, under the intro line, and switches the description language of all 15 skills at once — only the `Superpower Skill:` text users and the model see. The button label and the descriptions follow the preference; the rest of the panel stays in the Host UI language and skill bodies stay the English originals. The body is always the English original. Both descriptions start with `Superpower Skill:` / `Superpower Skill：`. The choice is per-language (a single `language` preference) and stored in the profile. Until you touch it, descriptions follow the Host UI language (settings language); once you switch it in the panel, the language stays fixed.
- The panel header also carries enable-all, disable-all, restore-defaults, and a search box. The head line shows this bundle's `provider`, `rank`, `source`, and panel build.
- Changes take effect immediately; the running turn is unaffected and the next turn sees the new catalog and language.
- State lives in the profile's `cordis.patch.yml` (`disabled` and `language` tables) and travels with the profile.
- Only this bundle's 15 skills are affected; official and third-party skills are untouched.

Before 7.4.0 there were two switches per skill (model-invocable / user-invocable) backed by `modelDisabled` and `userDisabled`. Both fields are deprecated: old values keep working after an upgrade, and your first panel interaction clears them, converging the config onto `disabled`.

## Usage

```
"Build me X"          -> brainstorming -> writing-plans -> subagent-driven-development
"Fix this bug"        -> systematic-debugging
"Review this"         -> requesting-code-review
"That session went wrong" -> diagnosing-superpowers
```

Check: `await ctx.skills.list({cwd})` should return 15 entries with `provider: superpowers`.

## Development

```bash
pnpm install && pnpm build && pnpm typecheck && node scripts/verify.mjs

# Same-name precedence, run one: self-built stub, no external dependency
node scripts/check-same-name-priority.mjs

# Same-name precedence, run two: load the official @deepseek-ai/dsh-skill-filesystem
#   That package is not a direct profile dependency; the script probes the profile
#   entry, the real .pnpm store directory, and the global dsh installation.
#   On a machine without dsh (plain CI), run the stub script above instead.
node scripts/check-same-name-priority-fs.mjs

# Skill switches end to end: real SkillRegistry, defaults, muting, hot invalidation
node scripts/check-skill-switches.mjs

# Full upstream sync review (deep + tokens both green)
node scripts/review-sync.mjs

dsh --profile web --dump-config  # assert "# == @wenaixi/dsh-superpower"
```

### Browser verification

Optional. Needs dsh and Python playwright installed locally. Both scripts take every address and path from the command line:

| Script | What it verifies |
|---|---|
| `scripts/browser/verify-switch-ui.py` | Real Web UI: open the plugin card, flip switches, click bulk buttons, search-filter, then read `cordis.patch.yml` back |
| `scripts/browser/verify-model-perception.py` | Four-phase loop: after a UI write, re-check both visibility sides through the Host's real `SkillRegistry` and compare UI rows against the Host catalog |

```bash
# 1. Start a Web server on a profile that has this plugin; note the token in the startup log
dsh --profile <profile> --no-open --port 3199

# 2. Full panel pass
python scripts/browser/verify-switch-ui.py \
  http://127.0.0.1:3199 <token> .verify-shots <profile>/cordis.patch.yml .verify-shots/expected.json

# 3. UI and Host four-phase loop
python scripts/browser/verify-model-perception.py \
  http://127.0.0.1:3199 <token> <profile dir> <profile>/cordis.patch.yml .verify-shots
```

`expected.json` is the array of 15 skill names, used to assert that UI row order matches the `skills/` directory:

```bash
node -e "import('./lib/superpowers.js').then(async m=>{const c=await m.SkillCatalog.fromDirectory('skills');require('fs').writeFileSync('expected.json',JSON.stringify(c.verifyIntegrity().entries.map(e=>e.document.name)))})"
```

Screenshots land in `.verify-shots/`, which is git-ignored.

## Layout

```
src/superpowers.ts  # plugin entry, SkillProvider rank 10
src/catalog.ts      # SkillCatalog: catalog, three-key fingerprint probe, snapshot reuse, spec self-test
src/document.ts     # SkillDocument: frontmatter parsing, contract mapping, built-in selfTest
src/switches.ts     # skill switches and language preference, built-in selfTest
src/client.js       # browser half: switch and language panel on the plugin card, hand-written CJS factory
skills/             # 15 skills, English bodies, bilingual frontmatter descriptions
lib/                # committed build artifacts so GitHub installs need no build
locale/             # plugin card title and description (zh/en); panel UI follows the Host locale
icon.png            # plugin card, README header, GitHub avatar
scripts/            # gates, precedence runs, switch runs, upstream sync review, browser verification
scripts/build-client.mjs      # copies the client artifact, then checks the inline catalog against skills/
```

## Version history

Since `v7.0.0` skill names follow upstream naming (no `superpower-` prefix) and the bundle syncs upstream `obra/superpowers v6.4.2`; the plugin became DSH-only, dropping compatibility layers for Claude Code, Codex, Gemini CLI, and other hosts. npm `7.0.0` was published before that specialization and is deprecated.

`v7.1.0` extracted the `SkillCatalog` and `SkillDocument` deep modules and pushed boundary self-tests down into the modules themselves.

`v7.1.1` fixed the official filesystem precedence script failing to locate `@deepseek-ai/dsh-skill-filesystem` under the pnpm isolated layout.

`v7.2.0` added the skill switch panel, turning the plugin into a dual-face form (Host side registers skills, browser side renders the panel) and adding the icon and card metadata.

`v7.3.0` upgraded snapshot invalidation to a three-key aggregate fingerprint (directory mtime + root directory names + per-skill SKILL.md mtime), closing two blind windows (content edits and incremental creation); the skill-count magic number became an exported constant; the bare-call guard regex was corrected against the real data domain and its self-test blind spot closed; client manifest comparison became name-keyed.

`v7.2.1` fixed the panel's language boundary: skill content (names and descriptions) stayed Chinese with no per-skill translation; all panel UI copy (titles, buttons, hints, meta labels) moved into `zh`/`en` dictionaries and follows the Host UI language through the official locale registry. The provider/rank/source labels stopped being hardcoded English.

`v7.4.0` merged each skill's two switches into one and converged configuration onto a single `disabled` table; brainstorming's visual collaboration moved to DSH's official document preview and the bundled HTTP server scripts were removed.

`v7.4.1` fixed switch saves failing: the `dsh-settings` write gate validates every `op.path` against a volatile node, and dropping `.volatile()` from the two legacy fields made the whole `mutate` batch fail; restoring the marker fixed it. The panel header gained a panel-build label.

`v7.5.0` shipped every skill with an English body (`SKILL.en.md`, upstream original adapted for DSH) beside the Chinese one, added a per-skill `中文 / English` switch, made English descriptions always start with `Superpower Skill: `, routed the same language preference to the model-side catalog and body, and made README.md English by default with a Chinese twin.

`v7.5.7` fixed the panel version label (7.5.6 showed 7.5.4 after the revert) and added a visible note next to the language button: it switches only the skill descriptions, the bodies stay English.: it switches the `Superpower Skill:` text users and the model see, the button label, and nothing else — the rest of the panel stays in the Host UI language, and skill bodies remain the English originals.: the panel's own copy (title, bulk buttons, search box, hints, meta labels) switches with the skill descriptions instead of following the Host UI language.

`v7.5.4` republished under a fresh version: the 7.5.3 release hit an npm staged-publish conflict; the code is identical to 7.5.3.

`v7.5.3` fixed the language button label: it now shows the target language based on the effective language (falling back to the Host language when the preference is unset), so an untouched panel correctly offers `English` and clicking it actually switches.

`v7.5.2` moved the language switch to a single button at the top of the panel: it now controls all 15 skills at once, and while the `language` preference is unset the descriptions follow the Host UI language (settings language); once set, they stay fixed.

`v7.5.1` makes skill bodies the official English originals (single `SKILL.md` per skill, DSH-adapted), keeps Chinese as the panel language via `description_zh`, so the language switch changes only the description the model sees. The `中文 / English` switch, the `Superpower Skill: ` prefixes, and the bilingual README remain.

Full history in [CHANGELOG.md](./CHANGELOG.md).

## FAQ

**404 after install, or wrong version?** Install from GitHub instead, or add `--registry https://registry.npmjs.org`. No allowlist is needed. Check the latest version with `npm view @wenaixi/dsh-superpower --registry https://registry.npmjs.org`.

**Empty card title, description, or icon?** Usually `package.json`'s `exports` does not expose `./package.json` and `./locale/*.json`, or `icon` points at an absolute path outside the package. `node scripts/verify.mjs` asserts both, plus whether `files` ships the icon.

## License

MIT, same as upstream [obra/superpowers](https://github.com/obra/superpowers). See [LICENSE](./LICENSE).

## Contributing

Issues and PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Credits

- Upstream author [Jesse Vincent](https://blog.fsck.com) and [Prime Radiant](https://primeradiant.com)
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) for the three-role plugin architecture
