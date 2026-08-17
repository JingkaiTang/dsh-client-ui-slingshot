# 弹弓玩具 · dsh slingshot toy 🪀

![弹弓玩具演示](assets/slingshot-demo.gif)

A playful, purely-visual toy for the dsh web GUI. A wooden slingshot lives in
the bottom-right corner of the page (drag it anywhere!):

1. **拖拽瞄准** — press and hold the leather pouch, drag it backwards (Angry-Birds
   style). A dotted arc previews where the stone will fly.
2. **松手发射** — release to fire the stone.
3. **打碎元素** — the stone shatters the first UI element it hits: the element
   is cloned into shards that burst apart, and the whole wreckage tumbles off
   the screen under gravity.
4. **自动恢复** — once it has fallen out of the viewport, the original element
   pops back with a small animation. Nothing in the GUI is ever permanently
   damaged — `html`/`body` and the toy itself are never targeted, and the
   layout is preserved the whole time (the original is only `visibility:hidden`
   while its clone flies).

Extra features:

- 🪵 **手柄拖动** — the slingshot has a leather grip handle at the bottom of
  the trunk (orange-brown, with grip ridges and a grab cursor). Press and drag
  it to move the slingshot anywhere on the screen (clamped to the viewport) —
  no mode toggles. The position is persisted in `localStorage` and restored
  after reload; the collapsed launcher button follows the gun.
- 🔊/🔇 sound toggle — WebAudio-synthesized boings, crashes and pops (no
  assets), muted and state persisted in `localStorage`.
- 💥 score counter (persisted).
- Collapsible widget: ✕ hides it into a small launcher button that pulses and
  shows a "where did it go" tip.
- The client bundle is part of the dsh client HMR chain: edit
  `lib/client.js` and the running page hot-swaps the plugin without a refresh.

## 安装（给使用者）

DSH 0811 起不再有官方 repository 插件机制，客户端插件统一挂进 web profile：

1. 把本包放进 profile 的模块解析路径（二选一）：
   - 直接把 `dsh-client-ui-slingshot` 目录复制/软链到 `~/.dsh/profiles/node_modules/@t7kai/` 下，或
   - 用 [plugin-registry](https://github.com/vlln/plugin-registry) 控制台 git 源安装：
     `dsh plugin --profile web add "github:<你的账号>/dsh-client-ui-slingshot#main"`
2. 在 `~/.dsh/profiles/web/cordis.patch.yml` 注册一行（配置层 HMR 热生效，无需重启）：

   ```yaml
   - insert:
       - id: ui-slingshot
         name: '@t7kai/dsh-client-ui-slingshot'
   ```

3. 刷新浏览器页面，右下角出现弹弓 🪀（点击 ✕ 可收起；位置、声音、得分自动记忆）。

## 发布到 dshfind 插件超市

1. 将本仓库推送到 GitHub（公开仓库）。
2. 给仓库添加 **`dsh-plugin`** topic（仓库页 → About → Topics，或
   `gh repo edit <owner>/<repo> --add-topic dsh-plugin`）。
3. [dshfind.com/zh/plugins](https://dshfind.com/zh/plugins) 每日自动同步该 topic 下的仓库
   （star、贡献者、增长数据），无需提交申请。可选：再打上
   `deepseek-harness`、`dsh`、`cordis` 等 topic 增加曝光。

## Files

| File | Purpose |
| --- | --- |
| `package.json` | Package manifest: `dsh.client.platform = "web"` + `dsh.bundle.client = "./lib/client.js"` declarations + `./client` export (the dsh client-modules contract) |
| `lib/index.js` | Host-side no-op plugin (the loader row needs a valid host entry; the toy is browser-only) |
| `lib/client.js` | The whole toy — vanilla DOM, no dependencies, ModuleLoader bundle format |
| `README.md` | This file |

## How it is wired in

- The package lives in the session workspace and is linked into the profile's
  module resolution:
  `~/.dsh/profiles/node_modules/@t7kai/dsh-client-ui-slingshot → <workspace>/dsh-client-ui-slingshot`
- `~/.dsh/profiles/web/cordis.patch.yml` registers the loader row
  `ui-slingshot` (`@t7kai/dsh-client-ui-slingshot`); the profile patch layer
  is hot-reloaded by the running server, so the row and its bundle are served
  without a restart (a one-time page refresh picks the new plugin up).

## Removing the toy

Delete the `ui-slingshot` row from `~/.dsh/profiles/web/cordis.patch.yml` and
remove the symlink
`~/.dsh/profiles/node_modules/@t7kai/dsh-client-ui-slingshot`. A page refresh
unloads it.
