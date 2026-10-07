# dsh-superpower

[English](./README.md) | [中文](./README.zh.md)

[![npm](https://img.shields.io/npm/v/@wenaixi%2Fdsh-superpower?label=npm)](https://www.npmjs.com/package/@wenaixi/dsh-superpower)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![DSH](https://img.shields.io/badge/DSH-Plugin-7c3aed)](https://github.com/deepseek-ai/deepseek-harness)
[![Node](https://img.shields.io/badge/node-%3E%3D20-5FA04E)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D11-F69220)](https://pnpm.io)

<img src="./icon.png" alt="@wenaixi/dsh-superpower" width="128" height="128">

A DSH port of [obra/superpowers](https://github.com/obra/superpowers). 15 skills are injected into `ctx.skills`. Skill bodies are the official English originals; the panel switches the description each skill shows in the model catalog and the slash-command (`/`) skill menu between Chinese and English, while skill names stay as upstream English.

## Install

Needs the dsh runtime (`npm i -g @deepseek-ai/dsh`); Node and pnpm floors are in the badges above. Examples use the `web` profile; substitute your own profile name.

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

Pin a version by appending `@<version>` or `#v<version>` (the version currently published; check `npm view @wenaixi/dsh-superpower version`).


Local development or offline install:

```bash
git clone https://github.com/Wenaixi/dsh-superpower && cd dsh-superpower
pnpm install && pnpm build && node scripts/verify.mjs   # prints ALL PASS
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

Tool mapping (Bash to pwsh, Read/Write to fs, and so on) lives in `skills/using-superpowers/references/dsh-tools.md`.

### Same-name precedence

The official registry arbitrates same-layer name collisions by ascending `rank`. This bundle registers at rank 10, below `dsh-skill-filesystem` project and user roots (100-500) and official bundled skills (600). Whenever a same-name skill exists, this bundle's copy wins and the two rule sets never fight.

## Skill switches and language

Open the `@wenaixi/dsh-superpower` card in the plugin manager; the panel sits at the bottom of its detail page.

- One switch per skill. Off means both sides lose it: the model no longer sees it in the available-skill catalog and `skill` tool calls are rejected; you can no longer reach it from slash-command completion or the CLI skill list.
- A 3-state segmented control (`中文 / English / 跟随宿主（自动）`) at the top of the panel switches the description language of all 15 skills at once. It changes only the `Superpower Skill:` text: the rest of the panel stays in the Host UI language and skill bodies stay English. Both descriptions carry the `Superpower Skill:` / `Superpower Skill：` prefix. When unset, descriptions follow the Host UI language (the language chosen in settings) and the control displays an indicator; picking `中文` or `English` locks the selection, and picking `跟随宿主（自动）` resets to following the Host. The choice is stored as a `language` preference in the profile (unset when following the Host).
- The panel header carries enable-all, disable-all, restore-defaults, and a search box.
- Changes take effect immediately; the running turn is unaffected and the next turn sees the new catalog and language.
- State lives in the profile's `cordis.patch.yml` (`disabled` and `language` tables) and travels with the profile.
- Only this bundle's 15 skills are affected; official and third-party skills are untouched.


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
scripts/lib/contract.mjs         # skill content contract checks, all rules in one place
scripts/lib/sync-engine.mjs      # upstream sync engine, returns structured diagnostics
scripts/lib/harness-common.mjs   # shared skeleton for the two same-name arbitration runs
scripts/lib/client-manifest.mjs  # inline catalog vs skills/ drift check
scripts/lib/sync-common.mjs      # shared sync primitives: normalization, code fences, walk
```

## Changelog

Release notes live in [CHANGELOG.md](./CHANGELOG.md), newest first, one section per version.

## FAQ

**404 after install, or wrong version?** Install from GitHub instead, or add `--registry https://registry.npmjs.org`. No allowlist is needed. Check the latest version with `npm view @wenaixi/dsh-superpower --registry https://registry.npmjs.org`.

**Empty card title, description, or icon?** Usually `package.json`'s `exports` does not expose `./package.json` and `./locale/*.json`, or `icon` points at an absolute path outside the package. `node scripts/verify.mjs` asserts both, plus whether `files` ships the icon.

## License

MIT. Full text in [LICENSE](./LICENSE).

## Contributing

Issues and PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Credits

- Upstream [obra/superpowers](https://github.com/obra/superpowers) by [Jesse Vincent](https://blog.fsck.com) and [Prime Radiant](https://primeradiant.com), also MIT licensed
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) for the three-role plugin architecture
