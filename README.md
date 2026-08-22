# dsh-superpower

[![Version](https://img.shields.io/badge/version-6.3.0--dsh.2-blue)](./package.json)
[![npm](https://img.shields.io/npm/v/dsh-superpower?label=npm)](https://www.npmjs.com/package/dsh-superpower)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![DSH](https://img.shields.io/badge/DSH-Plugin-7c3aed)](https://github.com/deepseek-ai/deepseek-harness)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933)](./package.json)
[![Skills](https://img.shields.io/badge/skills-14-ff6b6b)](#鍖呭惈鎶€鑳?

[obra/superpowers](https://github.com/obra/superpowers) 鐨?**DSH 绉绘鐗?* 鈥?灏嗗畬鏁寸殑澶氭櫤鑳戒綋杞欢寮€鍙戞柟娉曡浠ュ師鐢?DSH 鎶€鑳界殑褰㈠紡寮€绠卞嵆鐢ㄣ€?
> 涓婃父 `obra/superpowers v6.3.0` 鐨勫畬鏁寸Щ妞嶏細14 涓柟娉曡鎶€鑳戒互 DSH 鍘熺敓 `SkillProvider` 娉ㄥ叆 `ctx.skills`锛宍rank 550` 鍙椤圭洰绾ц鐩栵紝瀹夎鍗崇敓鏁堛€傛墍鏈夋妧鑳芥鏂囧凡涓枃鍖栥€?
- **涓婃父**锛歨ttps://github.com/obra/superpowers
- **npm**锛歨ttps://www.npmjs.com/package/dsh-superpower
- **鐗堟湰鍚屾**锛氭湰浠撳簱鐗堟湰鍙蜂笌涓婃父 `package.json` 淇濇寔涓€鑷达紙褰撳墠 `6.3.0`锛?- **鍗忚**锛歁IT

---

> **3 绉掗€熻锛氫竴涓汉鎷垮埌鎬庝箞鐢紵**
>
> 宸茶濂?`dsh` 鐨勮瘽锛岄€変换鎰忎竴琛岋紙闆舵瀯寤恒€侀浂閰嶇疆銆侀浂鐧藉悕鍗曪級锛岃鍒颁富宸ヤ綔鍙?`web`锛?> ```bash
> # 鏂瑰紡 A 鈥?npm锛堟渶绠€锛屽凡鍙戝竷鍒板畼鏂规簮锛?> dsh plugin --profile web add dsh-superpower
>
> # 鏂瑰紡 B 鈥?GitHub 鐩磋锛堟棤闇€ npm 璐﹀彿/鐧诲綍锛?> dsh plugin --profile web add github:Wenaixi/dsh-superpower#v6.3.0-dsh.1
>
> dsh --profile web --dump-config   # 鐪嬪埌 "# == dsh-superpower" 鍗虫垚鍔?> dsh --profile web                 # 杩涗細璇濓紝鎶€鑳借嚜鍔ㄥ彲鐢?> ```
> > `web` 鏄?DSH 榛樿鐨勪富宸ヤ綔鍙帮紱涔熷彲鎹㈡垚浠绘剰 profile 鍚嶏紙濡?`demo`銆乣my-project`锛夛紝涓嬫枃鍧囦互 `web` 涓轰緥銆?> 涓ょ鏂瑰紡鍧囧凡鎻愪氦 `lib/` 浜х墿锛屽紑绠卞嵆鐢紝鏃犻渶 `onlyBuiltDependencies` 鐧藉悕鍗曘€?
---

## 鐩綍

- [鐗规€(#鐗规€?
- [鍖呭惈鎶€鑳絔(#鍖呭惈鎶€鑳?
- [瀹夎](#瀹夎)
  - [鍓嶇疆瑕佹眰](#鍓嶇疆瑕佹眰)
  - [鏂瑰紡 A锛歯pm 涓€閿畨瑁咃紙鎺ㄨ崘锛塢(#鏂瑰紡-a-npm-涓€閿畨瑁呮帹鑽?
  - [鏂瑰紡 B锛欸itHub 鐩磋锛堝閫夛級](#鏂瑰紡-b-github-鐩磋澶囬€夐浂閰嶇疆)
  - [鏂瑰紡 C锛氭湰鍦板厠闅嗭紙浜屾寮€鍙戯級](#鏂瑰紡-c鏈湴鍏嬮殕浜屾寮€鍙戣仈璋?
  - [鏂瑰紡 D锛歵arball 绂荤嚎鍒嗗彂](#鏂瑰紡-d-tarball-绂荤嚎鍒嗗彂)
  - [楠岃瘉瀹夎鎴愬姛](#楠岃瘉瀹夎鎴愬姛)
  - [鏇存柊涓庡嵏杞絔(#鏇存柊涓庡嵏杞?
- [浣跨敤](#浣跨敤)
- [涓?DSH 鍘熺敓鑳藉姏鐨勫垎宸(#涓?dsh-鍘熺敓鑳藉姏鐨勫垎宸?
- [鏈湴寮€鍙慮(#鏈湴寮€鍙?
- [鐩綍缁撴瀯](#鐩綍缁撴瀯)
- [鐗堟湰绛栫暐](#鐗堟湰绛栫暐)
- [甯歌闂](#甯歌闂)
- [璐＄尞](#璐＄尞)
- [鏇存柊鏃ュ織](#鏇存柊鏃ュ織)
- [鍗忚](#鍗忚)
- [鑷磋阿](#鑷磋阿)

## 鐗规€?
- **闆朵镜鍏?*锛氫互 DSH 鏍囧噯 `SkillProvider` 娉ㄥ唽锛屼笉鏂板 `ctx` 閿紝涓嶆薄鏌撳涓讳簨浠?- **鍙鐩?*锛歚rank 550` 浠嬩簬 `user-agents (500)` 涓?`bundled (600)` 涔嬮棿锛宍.dsh/skills` 涓?`~/.dsh/skills` 鍙寜鍚嶈鐩?- **鍏ㄤ腑鏂囧寲**锛?4 涓?`SKILL.md` 鍙?20+ 杈呭姪鏂囨。鍧囧凡璇戜负绠€浣撲腑鏂囷紝浠ｇ爜/鍛戒护/璺緞淇濇寔鍘熸枃
- **闆舵瀯寤哄畨瑁?*锛氫粨搴撳唴宸叉彁浜?`lib/` 浜х墿锛宍prepack` 浠呭湪鎵撳寘鏃惰Е鍙戯紝`dsh plugin add` 鏃犻渶 `onlyBuiltDependencies` 鐧藉悕鍗?- **DSH 宸ュ叿鏄犲皠**锛歚Bash鈫抪wsh/bash`銆乣Read/Write/Edit鈫抐s`銆乣Glob/Grep鈫抐s-search`銆乣Task/Subagent鈫抯ubagent/workflow` 绛夎瑙?[`skills/using-superpowers/references/dsh-tools.md`](./skills/using-superpowers/references/dsh-tools.md)
- **鐑洿鏂板弸濂?*锛歚ctx.skills.registerProvider` 璧?`ctx.effect`锛孒MR 鏃惰嚜鍔ㄦ竻鐞嗛噸寤?
## 鍖呭惈鎶€鑳?
| 鎶€鑳?| 瑙﹀彂鏃舵満 | 璇存槑 |
|---|---|---|
| `using-superpowers` | 浠绘剰浼氳瘽璧风偣锛?% 鍘熷垯锛?| 寮哄埗鍏堝仛鎶€鑳芥鏌ワ紝绂佹鏃犵害鏉熺洿鎺ョ紪鐮?|
| `brainstorming` | 浠讳綍鍒涙剰/鏂板姛鑳藉伐浣滃墠 | 涓夎矾寰勫垎绫伙紙Spike / Bounded / Architectural锛? 鑻忔牸鎷夊簳寮忚璁＄粏鍖?|
| `writing-plans` | 璁捐鑾锋壒鍚?| 鍒囩墖涓?2鈥? 鍒嗛挓鍙墽琛岀殑缁嗙矑搴︿换鍔?|
| `using-git-worktrees` | 璁捐鑾锋壒鍚庛€佺紪鐮佸墠 | 闅旂鍒嗘敮 + 骞插噣鍩虹嚎楠岃瘉 |
| `executing-plans` | 宸叉湁璁″垝鏃?| 鍒嗘壒鎵ц + 浜哄伐妫€鏌ョ偣 |
| `subagent-driven-development` | 宸叉湁璁″垝鏃讹紙鎺ㄨ崘锛?| 姣忎换鍔′竴瀛愭櫤鑳戒綋 + 涓ら樁娈佃瘎瀹?|
| `dispatching-parallel-agents` | 闇€瑕佸苟琛屾椂 | 骞跺彂瀛愭櫤鑳戒綋缂栨帓 |
| `test-driven-development` | 浠讳綍鍔熻兘/缂洪櫡淇鏃?| RED-GREEN-REFACTOR 閾佸緥 |
| `systematic-debugging` | 淇缂洪櫡鏃?| 4 闃舵鏍瑰洜杩借釜 + 绾垫繁闃插尽 + 鏉′欢绛夊緟 |
| `verification-before-completion` | 澹扮О瀹屾垚鍓?| 蹇呴』杩愯楠岃瘉鍛戒护骞剁敤璇佹嵁璇磋瘽 |
| `requesting-code-review` | 浠诲姟闂?| 鎸変弗閲嶅害鎶ュ憡闂锛孋ritical 绾у埆闃诲 |
| `receiving-code-review` | 鏀跺埌璇勫鍚?| 鍥炲簲鍙嶉 |
| `finishing-a-development-branch` | 鍏ㄩ儴浠诲姟瀹屾垚鍚?| 楠岃瘉娴嬭瘯 + 鍚堝苟/PR/淇濈暀/涓㈠純鍐崇瓥 |
| `writing-skills` | 鍒涘缓鏂版妧鑳芥椂 | 鎶€鑳界紪鍐欐渶浣冲疄璺?|

## 瀹夎

### 鍓嶇疆瑕佹眰

- **Node.js** `>=20`锛坄node -v` 妫€鏌ワ級
- **pnpm** `>=9`锛圖SH 鐨?profile 瀹夎渚濊禆瀹冿紝`pnpm -v` 妫€鏌ワ級
- **dsh CLI**锛坄dsh --version` 妫€鏌ワ紱鏈畨瑁呮墽琛?`npm i -g @deepseek-ai/dsh`锛?
> 棣栨浣跨敤 `dsh plugin` 浼氳嚜鍔ㄤ互 `@deepseek-ai/dsh-base` 鍒濆鍖栧搴?profile锛屾棤闇€鎵嬪姩鍒涘缓銆?
### 鏂瑰紡 A锛歯pm 涓€閿畨瑁咃紙鎺ㄨ崘锛?
> 宸插彂甯冨埌 [npm 瀹樻柟婧怾(https://www.npmjs.com/package/dsh-superpower)锛屽浗鍐呴暅鍍忥紙`npmmirror`锛夊悓姝ュ彲鑳芥湁鍑犲垎閽熷欢杩熴€?> 涓嬫枃浠ヤ富宸ヤ綔鍙?`web` 涓轰緥锛岃鍒板叾瀹?profile 鍙渶鏀?`--profile` 鍚庣殑鍚嶅瓧銆傚畨瑁呮椂鑷姩璧?`dsh.bundle`锛屾棤闇€鎵嬪姩閰嶇疆 `cordis.patch.yml`銆?
```bash
# 瀹夎鍒颁富宸ヤ綔鍙?web锛堣嚜鍔ㄨ蛋 dsh.bundle锛岄娆′細鑷姩鍒濆鍖栬 profile锛?dsh plugin --profile web add dsh-superpower

# 閿佸畾鍒扮簿纭増鏈紙鍙€夛紝鎺ㄨ崘鍥㈤槦鍗忎綔鏃堕攣瀹氾級
dsh plugin --profile web add dsh-superpower@6.3.0-dsh.1

# 鏂█灞傚凡鐢熸晥锛堝簲鑳界湅鍒?"# == dsh-superpower" 涓?"id: superpowers"锛?dsh --profile web --dump-config | grep -A2 "dsh-superpower"

# 鍚姩锛屾妧鑳借嚜鍔ㄥ彲鐢?dsh --profile web
```

### 鏂瑰紡 B锛欸itHub 鐩磋锛堝閫夛紝闆堕厤缃級

閫傚悎 **鈥滀笉鎯宠蛋 npm銆佹垨 npm 闀滃儚灏氭湭鍚屾鈥?* 鐨勫満鏅€傜洿鎺ヤ粠 GitHub 鎷夊彇锛屾棤闇€鏈満鏈夋湰浠撳簱鐨勬鍑恒€傚悓鏍疯嚜鍔ㄨ蛋 `dsh.bundle`銆?
```bash
# 閿佸畾鍒版爣绛撅紙鎺ㄨ崘锛岄伩鍏嶅悗缁帹閫佹倓鎮勬敼鍙樿繍琛屽唴瀹癸級
dsh plugin --profile web add github:Wenaixi/dsh-superpower#v6.3.0-dsh.1

# 鎯宠窡鏈€鏂?main 鍙幓鎺夊悗缂€
dsh plugin --profile web add github:Wenaixi/dsh-superpower
```

> **鏃犻渶鐧藉悕鍗?*锛氳嚜 `v6.3.0 (596b979)` 璧凤紝浠撳簱宸叉彁浜?`lib/` 浜х墿锛岃剼鏈敱 `prepare` 鏀逛负 `prepack`锛堜粎 `npm pack`/`npm publish` 鏃惰Е鍙戯級锛屽洜姝?`dsh plugin add github:...` 涓嶅啀瑙﹀彂 pnpm 鐨?`onlyBuiltDependencies` 鎷︽埅锛屽紑绠卞嵆鐢ㄣ€?
### 鏂瑰紡 C锛氭湰鍦板厠闅嗭紙浜屾寮€鍙?鑱旇皟锛?
閫傚悎瑕佹敼鎶€鑳芥鏂囥€佽皟 `rank`銆佹垨瀵圭収涓婃父鍋氫腑鏂囧寲鐨勫紑鍙戣€呫€傜ず渚嬭鍒颁富宸ヤ綔鍙?`web`锛屽叾瀹?profile 鍚岀悊銆?
```bash
git clone https://github.com/Wenaixi/dsh-superpower.git
cd dsh-superpower
pnpm install && pnpm build        # 浜х墿杈撳嚭鍒?lib/锛宭ib/ 宸叉彁浜や絾鏈湴鏀瑰姩鍚庨渶閲嶅缓
node scripts/verify.mjs            # 鍐掔儫锛氬簲杈撳嚭 14/14 PASS

# 浠ユ湰鍦拌矾寰勫畨瑁呭埌涓诲伐浣滃彴锛坧npm 浼氫互 link: 褰㈠紡渚濊禆锛屾敼鍔ㄥ悗閲嶆柊 pnpm build 鍗冲彲鐢熸晥锛?dsh plugin --profile web add ./
dsh --profile web --dump-config   # 鏂█ "# == dsh-superpower"
dsh --profile web
```

鍚庣画鏀瑰姩 `skills/` 鎴?`src/` 鍚庯紝鍙渶 `pnpm build`锛岄噸鍚搴?profile 鍗崇敓鏁堬紙`ctx.effect` 浼氳嚜鍔ㄦ竻鐞嗘棫 Provider锛夈€?
### 鏂瑰紡 D锛歵arball 绂荤嚎鍒嗗彂

```bash
pnpm build
pnpm pack                      # 浜у嚭 dsh-superpower-6.3.0-dsh.1.tgz锛堝凡鍖呭惈 lib/ + skills/锛?
# 鎺ユ敹鏂癸紙鏃犻渶鏈粨搴撱€佹棤闇€鏋勫缓锛夛紝绀轰緥瑁呭埌涓诲伐浣滃彴 web锛?dsh plugin --profile web add ./dsh-superpower-6.3.0-dsh.1.tgz
```

tarball 宸插寘鍚瀯寤轰骇鐗╋紝鍚屾牱鏃犻渶鐧藉悕鍗曘€?
### 楠岃瘉瀹夎鎴愬姛

```bash
# 1. 閰嶇疆灞傚彲瑙侊紙浠ヤ富宸ヤ綔鍙?web 涓轰緥锛?dsh --profile web --dump-config | grep -A2 "dsh-superpower"
# 鏈熸湜杈撳嚭锛?# # == dsh-superpower
# - id: superpowers
#   name: dsh-superpower

# 2. 鍐掔儫锛堟湰鍦版鍑烘椂锛?node scripts/verify.mjs
# 鏈熸湜锛歠ound 14 skill directories ... ALL PASS

# 3. 浼氳瘽鍐咃紙妯″瀷渚э紝瀹夎鍚庨噸鍚?profile 鍐嶉獙璇侊級
# await ctx.skills.list({ cwd: "/path/to/project" }) // 14 鏉★紝provider: superpowers, source: bundled
# await ctx.skills.get("brainstorming")               // 杩斿洖鍚腑鏂囨鏂囩殑瀹屾暣 SKILL.md

# 4. npm 鍙鎬?npm view dsh-superpower version --registry https://registry.npmjs.org
# 6.3.0-dsh.1
```

### 鏇存柊涓庡嵏杞?
涓诲伐浣滃彴涓?`web`锛屽叾瀹?profile 鍙渶鏇挎崲 `--profile` 鍚庡悕瀛椼€?
```bash
# 鏇存柊鍒版寚瀹氱増鏈紙npm锛?dsh plugin --profile web add dsh-superpower@6.3.0-dsh.1

# 鏇存柊鍒版寚瀹氱増鏈紙GitHub锛?dsh plugin --profile web add github:Wenaixi/dsh-superpower#v6.3.0-dsh.1

# 鏇存柊鍒版渶鏂?main锛堜笉鎺ㄨ崘闀挎湡閿佸畾鍦烘櫙锛?dsh plugin --profile web add github:Wenaixi/dsh-superpower

# 鍗歌浇
dsh plugin --profile web remove dsh-superpower
```

> 姣忎釜 profile 鐙珛锛歚demo`銆乣web`銆乣my-project` 绛?profile 闇€鍒嗗埆瀹夎銆?
## 浣跨敤

瀹夎鍚庢棤闇€棰濆閰嶇疆銆傛ā鍨嬩晶閫氳繃 `skill` 宸ュ叿鎴栫敤鎴锋樉寮忔寚浠?`/skill superpowers:<鍚嶇О>` 鍔犺浇锛?
- 鈥滃府鎴戝仛涓€涓?XXX 鍔熻兘鈥?鈫?鑷姩瑙﹀彂 `brainstorming`
- 鈥滀慨涓€涓嬭繖涓己闄封€?鈫?鑷姩瑙﹀彂 `systematic-debugging`
- 鈥滃厛鍑轰釜璁″垝鈥?鈫?瑙﹀彂 `writing-plans`

涓嶈蛋鎶€鑳戒篃鑳藉湪妯″瀷渚х洿鎺ラ獙璇侊細

```js
// 鍦?DSH 浼氳瘽涓紙妯″瀷渚э級
await ctx.skills.list({ cwd: "/path/to/project" }) // 14 鏉?superpowers/bundled
await ctx.skills.get("brainstorming")               // 瀹屾暣 SKILL.md 姝ｆ枃
```

## 涓?DSH 鍘熺敓鑳藉姏鐨勫垎宸?
- `dsh-plan-mode`锛堝彧璇昏鍒掗攣瀹氾級璐熻矗璁″垝妯″紡鐨勫紑鍏充笌杞杈圭晫锛涙湰鎻掍欢鐨?`writing-plans` 璐熻矗鎶婂凡鎵瑰噯璁捐鍒囩墖涓哄彲鎵ц浠诲姟
- `dsh-skill-filesystem` 鐨?`~/.dsh/skills` 涓?`.dsh/skills` 浼樺厛绾ч珮浜庢湰鎻掍欢锛坄rank 550`锛夛紝鍙湪椤圭洰绾ц鐩栧悓鍚?superpowers 鎶€鑳?- `subagent` / `workflow` / `todo` / `goal` / `ask-user` 绛?DSH 宸ュ叿涓庢妧鑳芥鏂囦腑鐨勬槧灏勮 `dsh-tools.md`

## 鏈湴寮€鍙?
```bash
pnpm install
pnpm build        # tsc -p tsconfig.build.json -> lib/
pnpm typecheck    # tsc --noEmit
node scripts/verify.mjs  # 鍐掔儫锛?4 涓妧鑳藉彲鍒椾妇 + 鍙姞杞?```

涓嶈蛋 profile 瀹夎鏃讹紝鍙敤琛ヤ竵鍙犲姞灞傛湰鍦拌皟璇曪細

```bash
pnpm dsh web --patch ./cordis.patch.yml
```

鎴栧湪 `cordis.patch.yml` 涓鐩栨妧鑳界洰褰曪紙鎸囧悜鏈湴涓婃父妫€鍑猴紝渚夸簬瀵圭収锛夛細

```yaml
- insert:
    - id: superpowers
      name: dsh-superpower
      config:
        skillDir: E:/tmp/superpowers/skills
```

### 浠ｇ爜瑙勮寖

- 鎻掍欢鍏ュ彛 `src/superpowers.ts`锛氬嚱鏁板舰鎬?`export function apply(ctx, config)`锛宍inject = ['skills']`锛岄厤缃蛋 Schemastery
- 澶辫触瑕佸搷浜細闈炴硶 frontmatter 浠呰烦杩囪鎶€鑳藉苟 `warn`锛屼笉鍚炴暣浣?- 娉ㄩ噴涓庢彁浜や俊鎭娇鐢ㄧ畝浣撲腑鏂囷紝浠ｇ爜娉ㄩ噴鍚?
## 鐩綍缁撴瀯

```
dsh-superpower/
鈹溾攢鈹€ src/superpowers.ts          # 鎻掍欢鍏ュ彛 + SuperpowersProvider (rank 550)
鈹溾攢鈹€ skills/                     # 14 涓妧鑳斤紙宸蹭腑鏂囧寲锛屽惈 references/scripts锛?鈹?  鈹溾攢鈹€ using-superpowers/references/dsh-tools.md
鈹?  鈹溾攢鈹€ brainstorming/
鈹?  鈹溾攢鈹€ writing-plans/
鈹?  鈹斺攢鈹€ ...
鈹溾攢鈹€ scripts/verify.mjs          # 鍐掔儫锛氭牎楠?14 鎶€鑳?+ 鍏抽敭鏂囦欢
鈹溾攢鈹€ cordis.patch.yml            # bundle 灞傦細insert superpowers
鈹溾攢鈹€ package.json                # dsh.bundle.patch 鎸囧悜 cordis.patch.yml
鈹溾攢鈹€ tsconfig.json
鈹斺攢鈹€ lib/                        # 鏋勫缓浜х墿锛堝凡鎻愪氦锛岀‘淇?GitHub 鐩磋闆舵瀯寤猴級
```

## 鐗堟湰绛栫暐

- 鏈粨搴?`version` 涓庝笂娓?`obra/superpowers` 鐨?`package.json#version` **涓ユ牸鍚屾**锛堝綋鍓?`6.3.0`锛?- 涓婃父鍙戠増鍚庯紝鏈粨搴撳悓姝?bump 鐗堟湰銆佸悓姝?`skills/` 鍐呭锛堜繚鐣?DSH 鏄犲皠涓庝腑鏂囧寲锛夛紝鍐嶅彂甯?- `CHANGELOG.md` 姹囨€讳笂娓?Release Notes 涓庢湰浠撳簱 DSH 閫傞厤鍙樻洿

## 甯歌闂

**Q锛氫竴涓汉鎷垮埌閾炬帴锛屾€庝箞鏈€蹇敤涓婏紵**

A锛氳濂?`dsh` 鍚庝竴琛屽嵆鍙細`dsh plugin --profile demo add dsh-superpower`锛坣pm 瀹樻柟婧愶級锛屾垨 `dsh plugin --profile demo add github:Wenaixi/dsh-superpower#v6.3.0`锛堟棤闇€ npm锛夈€傜劧鍚?`dsh --profile demo`銆?
**Q锛氬繀椤诲彂甯冨埌 npm 鍚楋紵宸茬粡鍙戝竷浜嗗悧锛?*

A锛氬凡鍙戝竷鍒?[npm 瀹樻柟婧怾(https://www.npmjs.com/package/dsh-superpower)锛坄dsh-superpower@6.3.0`锛夈€備袱绉嶆柟寮忓潎鍙敤锛歚npm` 鏈€绠€锛坄add dsh-superpower`锛夛紝`GitHub` 閫傚悎涓嶆兂璧?npm 鏃躲€?
**Q锛歚dsh plugin add dsh-superpower` 鎶?404锛?*

A锛氳嫢浣犵敤鐨勬槸鍥藉唴闀滃儚 `npmmirror`锛屽悓姝ュ埌鏂扮増鏈湁鍑犲垎閽熷欢杩燂紝鍙厛鐢?`github:Wenaixi/dsh-superpower#v6.3.0`锛屾垨鍒囧畼鏂规簮 `npm config set registry https://registry.npmjs.org` 鍚庨噸璇曘€俙npm view dsh-superpower --registry https://registry.npmjs.org` 鍙洿杩為獙璇併€?
**Q锛氶渶瑕侀厤缃?`onlyBuiltDependencies` / `allowBuilds` 鐧藉悕鍗曞悧锛?*

A锛氫笉闇€瑕併€傝嚜 `596b979` 璧?`lib/` 宸叉彁浜や笖鑴氭湰鏀逛负 `prepack`锛孏itHub 涓?npm锛堝惈 tarball锛夊潎闆剁櫧鍚嶅崟銆侀浂鐜板満鏋勫缓銆傚浠嶈 `Ignored build scripts` 鎻愮ず锛岃鏄庝綘鎷夊埌鐨勬槸鏃ф爣绛撅紝璇风敤 `#v6.3.0`锛堟柊锛夐噸瑁呫€?
**Q锛氬畨瑁呭悗濡備綍纭鐢熸晥锛?*

A锛歚dsh --profile demo --dump-config | grep dsh-superpower` 搴旇兘鐪嬪埌 `# == dsh-superpower` 灞傦紱杩涗細璇濆悗 `ctx.skills.list()` 搴旀湁 14 鏉?`superpowers`銆?
**Q锛歚pnpm install` 鏃?registry 鏄?`npmmirror` 鏈夊奖鍝嶅悧锛?*

A锛氬 GitHub 鐩磋鏃犲奖鍝嶏紙璧?git锛夈€備粎 `npm publish` 涓?`npm view --registry https://registry.npmjs.org` 闇€鐩磋繛瀹樻柟婧愩€?
## 璐＄尞

娆㈣繋鎻愪氦 Issue / PR锛?
1. Fork 鏈粨搴擄紝鍩轰簬 `main` 鏂板缓鍒嗘敮
2. 閬靛惊 `writing-skills` 鎶€鑳界殑缂栧啓涓庢祴璇曡鑼?3. `pnpm build && pnpm typecheck && node scripts/verify.mjs` 鍏ㄧ豢鍚庡啀鎻愪氦
4. 鎻愪氦 PR 鏃惰璇存槑鍏宠仈鐨勪笂娓哥増鏈笌鏀瑰姩鑼冨洿

璇﹁ [`CONTRIBUTING.md`](./CONTRIBUTING.md)銆?
## 鏇存柊鏃ュ織

瑙?[`CHANGELOG.md`](./CHANGELOG.md)锛堜笂娓?`v6.3.0` 鍙婁箣鍓嶇増鏈眹鎬?+ DSH 绉绘鍙樻洿锛夈€?
## 鍗忚

MIT锛屼笌涓婃父 [obra/superpowers](https://github.com/obra/superpowers) 淇濇寔涓€鑷淬€傝 [`LICENSE`](./LICENSE)銆?
## 鑷磋阿

- 涓婃父浣滆€?[Jesse Vincent](https://blog.fsck.com) 涓?[Prime Radiant](https://primeradiant.com)
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 鐨?`dsh-skill` 涓夎鑹叉灦鏋?