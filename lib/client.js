window.__ModuleLoader__.load({
	id: "@t7kai/dsh-client-ui-slingshot",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region dsh slingshot toy
		/**
		* A slingshot toy for the dsh web GUI.
		*
		* - A wooden slingshot sits in the bottom-right corner. Drag its pouch
		*   backwards to aim (a dotted trajectory previews the arc), then release
		*   to fire a stone.
		* - The stone smashes into whatever UI element it hits first: the element
		*   is cloned into shards that burst apart, and the whole cluster tumbles
		*   off the screen under gravity.
		* - Once the wreckage has left the viewport the original element is
		*   restored with a little pop — the GUI is never permanently damaged.
		*
		* Notes on the client sandbox: the dynamic client half shadows bare
		* `setTimeout`/`setInterval`/`fetch`/`require` with teaching traps, so
		* this bundle only uses `requestAnimationFrame`, DOM events and
		* `window.*` APIs. Everything is vanilla DOM — no React, no imports.
		*/
		const name = "dsh-slingshot";
		const PLUGIN_ID = "@t7kai/dsh-client-ui-slingshot";

		// ── tunables ────────────────────────────────────────────────────────────
		const GUN_W = 170;
		const GUN_H = 190;
		const REST = { x: 85, y: 96 };          // pouch rest position (gun-local)
		const TIP_L = { x: 56, y: 52 };         // left fork tip
		const TIP_R = { x: 114, y: 52 };        // right fork tip
		const MAX_PULL = 170;                   // max pouch drag radius (px)
		const MIN_PULL = 26;                    // below this the shot cancels
		const VELOCITY_K = 11;                  // pull (px) → velocity (px/s)
		const GRAVITY = 1400;                   // px/s² for stone and shards
		const STONE_R = 9;                      // stone radius

		// ── styles ─────────────────────────────────────────────────────────────
		const CSS = `
.dsh-ss-stage{position:fixed;inset:0;pointer-events:none;z-index:2147483000}
.dsh-ss-gun{position:absolute;width:${GUN_W}px;height:${GUN_H}px;pointer-events:none;animation:dsh-ss-pop .35s cubic-bezier(.2,1.5,.4,1)}
.dsh-ss-handle{position:absolute;left:50%;bottom:2px;transform:translateX(-50%);width:28px;height:38px;border-radius:6px;background:linear-gradient(180deg,#c96f2b,#8a4a1c);border:1px solid rgba(0,0,0,.35);box-shadow:0 2px 5px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.28);cursor:grab;pointer-events:auto;touch-action:none;z-index:2;display:flex;align-items:center;justify-content:center}
.dsh-ss-handle::after{content:"";width:14px;height:28px;border-radius:3px;background:repeating-linear-gradient(90deg,rgba(0,0,0,.3) 0 2px,transparent 2px 4px)}
.dsh-ss-handle:hover{border-color:rgba(255,255,255,.55);box-shadow:0 2px 7px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.3)}
.dsh-ss-handle:active{cursor:grabbing}
.dsh-ss-gun svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.dsh-ss-pouch{position:absolute;left:${REST.x}px;top:${REST.y}px;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;pointer-events:auto;cursor:grab;touch-action:none;z-index:3}
.dsh-ss-pouch:active{cursor:grabbing}
.dsh-ss-return{transition:left .16s cubic-bezier(.2,1.6,.4,1),top .16s cubic-bezier(.2,1.6,.4,1)}
.dsh-ss-stone{position:absolute;left:0;top:0;width:${STONE_R * 2}px;height:${STONE_R * 2}px;margin:-${STONE_R}px 0 0 -${STONE_R}px;border-radius:50%;background:radial-gradient(circle at 32% 30%,#9a9aa4,#3c3c46 68%);box-shadow:inset -2px -2px 4px rgba(0,0,0,.45),0 2px 5px rgba(0,0,0,.4);z-index:4;pointer-events:none}
.dsh-ss-dot{position:absolute;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;border-radius:50%;background:rgba(255,255,255,.92);border:1.5px solid rgba(30,30,40,.55);box-shadow:0 1px 3px rgba(0,0,0,.35);display:none}
.dsh-ss-head{position:absolute;left:2px;top:0;display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:10px;background:rgba(24,24,34,.62);backdrop-filter:blur(6px);color:#fff;font:12px/1 system-ui,sans-serif;pointer-events:auto;user-select:none;white-space:nowrap;z-index:5}
.dsh-ss-head button{border:0;background:transparent;color:#fff;font:inherit;padding:0 2px;cursor:pointer;opacity:.85}
.dsh-ss-head button:hover{opacity:1}
.dsh-ss-title{font-weight:600}
.dsh-ss-score{opacity:.85}
.dsh-ss-hint{position:absolute;left:50%;bottom:100%;transform:translateX(-50%);margin-bottom:8px;max-width:190px;padding:6px 10px;border-radius:10px;background:rgba(24,24,34,.78);backdrop-filter:blur(6px);color:#fff;font:12px/1.5 system-ui,sans-serif;text-align:center;pointer-events:none;z-index:5;animation:dsh-ss-pop .3s cubic-bezier(.2,1.5,.4,1)}
.dsh-ss-launcher{position:absolute;width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(24,24,34,.62);backdrop-filter:blur(6px);cursor:pointer;display:none;align-items:center;justify-content:center;pointer-events:auto;padding:0;animation:dsh-ss-pop .35s cubic-bezier(.2,1.5,.4,1),dsh-ss-bob 2.6s ease-in-out .6s infinite;z-index:5}
.dsh-ss-launcher:hover{background:rgba(40,40,56,.78)}
.dsh-ss-launcher.dsh-ss-nudge{animation:dsh-ss-nudge .9s ease-out}
.dsh-ss-launcher-tip{position:absolute;padding:6px 10px;border-radius:10px;background:rgba(24,24,34,.82);backdrop-filter:blur(6px);color:#fff;font:12px/1.5 system-ui,sans-serif;pointer-events:none;white-space:nowrap;z-index:5;display:none;animation:dsh-ss-pop .25s cubic-bezier(.2,1.5,.4,1)}
.dsh-ss-stage.dsh-ss-closed .dsh-ss-gun{display:none}
.dsh-ss-stage.dsh-ss-closed .dsh-ss-launcher{display:flex}
.dsh-ss-aiming{user-select:none}
.dsh-ss-wrapper{position:fixed;pointer-events:none;z-index:2147482990;will-change:transform}
.dsh-ss-shard{position:absolute;overflow:hidden;will-change:transform}
.dsh-ss-shard > *{pointer-events:none}
.dsh-ss-ring{position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;border:3px solid rgba(255,255,255,.9);border-radius:50%;will-change:transform,opacity}
.dsh-ss-particle{position:absolute;border-radius:2px;will-change:transform,opacity}
.dsh-ss-recoil{animation:dsh-ss-recoil .28s ease-out}
.dsh-ss-restore{animation:dsh-ss-restore .3s cubic-bezier(.2,1.5,.4,1)}
@keyframes dsh-ss-pop{from{transform:translateY(10px) scale(.85);opacity:0}to{transform:none;opacity:1}}
@keyframes dsh-ss-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes dsh-ss-nudge{0%{transform:scale(1)}25%{transform:scale(1.28)}60%{transform:scale(.94)}100%{transform:scale(1)}}
@keyframes dsh-ss-recoil{0%{transform:translate(0,0)}30%{transform:translate(4px,5px)}60%{transform:translate(-2px,-2px)}100%{transform:none}}
@keyframes dsh-ss-restore{from{transform:scale(.93);opacity:.4}to{transform:scale(1);opacity:1}}
`;
		const STYLE_ID = `${PLUGIN_ID}/style`;

		// ── tiny helpers ────────────────────────────────────────────────────────
		const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

		// ── runtime state ───────────────────────────────────────────────────────
		const state = {
			open: localStorage.getItem("dsh-slingshot:open") !== "0",
			sound: localStorage.getItem("dsh-slingshot:sound") !== "0",
			score: Number(localStorage.getItem("dsh-slingshot:score") || 0),
			taught: localStorage.getItem("dsh-slingshot:taught") === "1",
			aiming: false,
			pointerId: null,
			gunRect: null,
			pos: null,
			moving: null,
			effects: new Set(),
			hidden: new Set(),
			raf: 0,
			last: 0,
			stage: null,
			gun: null,
			pouch: null,
			handle: null,
			stone: null,
			bandL: null,
			bandR: null,
			dots: [],
			head: null,
			scoreEl: null,
			soundBtn: null,
			hintEl: null,
			launcher: null,
			launcherTip: null,
			tipTimer: 0
		};

		// ── position (moveable gun) ────────────────────────────────────────────
		function clampPos(p) {
			return {
				x: clamp(p.x, 0, Math.max(0, window.innerWidth - GUN_W)),
				y: clamp(p.y, 0, Math.max(0, window.innerHeight - GUN_H))
			};
		}
		function loadPos() {
			let p = { x: window.innerWidth - GUN_W - 14, y: window.innerHeight - GUN_H - 14 };
			try {
				const saved = JSON.parse(localStorage.getItem("dsh-slingshot:pos") || "null");
				if (saved !== null && Number.isFinite(saved.x) && Number.isFinite(saved.y)) p = { x: saved.x, y: saved.y };
			} catch { /* corrupted saved pos — fall back to default */ }
			return clampPos(p);
		}
		function placeLauncher() {
			if (!state.launcher || !state.launcherTip || !state.pos) return;
			const lx = clamp(state.pos.x, 0, Math.max(0, window.innerWidth - 46));
			const ly = clamp(state.pos.y, 0, Math.max(0, window.innerHeight - 46));
			state.launcher.style.left = lx + "px";
			state.launcher.style.top = ly + "px";
			state.launcherTip.style.left = lx + "px";
			state.launcherTip.style.top = Math.max(4, ly - 42) + "px";
		}
		function positionGun() {
			if (!state.gun || !state.pos) return;
			state.gun.style.left = state.pos.x + "px";
			state.gun.style.top = state.pos.y + "px";
			placeLauncher();
		}
		function savePos() {
			try { localStorage.setItem("dsh-slingshot:pos", JSON.stringify(state.pos)); } catch { /* ignore */ }
		}
		function updateHint() {
			if (!state.hintEl) return;
			state.hintEl.textContent = "按住皮兜向后拖瞄准，松手发射；按住底部手柄可移动弹弓";
			state.hintEl.style.display = state.open && !state.taught ? "block" : "none";
		}

		// ── audio (tiny WebAudio synth; never throws) ───────────────────────────
		let audio = null;
		function ensureAudio() {
			try {
				const AC = window.AudioContext || window.webkitAudioContext;
				if (!AC || audio) return;
				audio = new AC();
			} catch { /* audio unavailable — fine */ }
		}
		function playSound(kind) {
			if (!state.sound || !audio) return;
			try {
				if (audio.state === "suspended") audio.resume();
				const t0 = audio.currentTime;
				const master = audio.createGain();
				master.gain.value = 0.5;
				master.connect(audio.destination);
				if (kind === "release") {
					const o = audio.createOscillator();
					o.type = "sine";
					o.frequency.setValueAtTime(240, t0);
					o.frequency.exponentialRampToValueAtTime(90, t0 + 0.2);
					const g = audio.createGain();
					g.gain.setValueAtTime(0.16, t0);
					g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.24);
					o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 0.26);
					const o2 = audio.createOscillator();
					o2.type = "triangle";
					o2.frequency.setValueAtTime(520, t0);
					o2.frequency.exponentialRampToValueAtTime(180, t0 + 0.12);
					const g2 = audio.createGain();
					g2.gain.setValueAtTime(0.07, t0);
					g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
					o2.connect(g2); g2.connect(master); o2.start(t0); o2.stop(t0 + 0.16);
				} else if (kind === "hit") {
					const len = Math.floor(audio.sampleRate * 0.18);
					const buf = audio.createBuffer(1, len, audio.sampleRate);
					const data = buf.getChannelData(0);
					for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
					const src = audio.createBufferSource();
					src.buffer = buf;
					const filt = audio.createBiquadFilter();
					filt.type = "lowpass";
					filt.frequency.value = 2400;
					const g = audio.createGain();
					g.gain.setValueAtTime(0.3, t0);
					g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
					src.connect(filt); filt.connect(g); g.connect(master); src.start(t0);
					const o = audio.createOscillator();
					o.type = "sine";
					o.frequency.setValueAtTime(160, t0);
					o.frequency.exponentialRampToValueAtTime(45, t0 + 0.22);
					const g3 = audio.createGain();
					g3.gain.setValueAtTime(0.28, t0);
					g3.gain.exponentialRampToValueAtTime(0.001, t0 + 0.24);
					o.connect(g3); g3.connect(master); o.start(t0); o.stop(t0 + 0.26);
				} else if (kind === "restore") {
					const o = audio.createOscillator();
					o.type = "sine";
					o.frequency.setValueAtTime(520, t0);
					o.frequency.exponentialRampToValueAtTime(820, t0 + 0.09);
					const g = audio.createGain();
					g.gain.setValueAtTime(0.06, t0);
					g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.11);
					o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 0.12);
				}
			} catch { /* sound is a toy — ignore */ }
		}

		// ── DOM construction ────────────────────────────────────────────────────
		function buildSvg() {
			const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
			svg.setAttribute("viewBox", `0 0 ${GUN_W} ${GUN_H}`);
			const add = (tag, attrs) => {
				const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
				for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
				svg.appendChild(el);
				return el;
			};
			add("line", { x1: TIP_L.x, y1: TIP_L.y, x2: REST.x, y2: REST.y, stroke: "#d64545", "stroke-width": 5, "stroke-linecap": "round" });
			add("line", { x1: TIP_R.x, y1: TIP_R.y, x2: REST.x, y2: REST.y, stroke: "#d64545", "stroke-width": 5, "stroke-linecap": "round" });
			add("line", { x1: 85, y1: 188, x2: 85, y2: 108, stroke: "#8b5a2b", "stroke-width": 11, "stroke-linecap": "round" });
			add("line", { x1: 85, y1: 108, x2: TIP_L.x, y2: TIP_L.y, stroke: "#8b5a2b", "stroke-width": 11, "stroke-linecap": "round" });
			add("line", { x1: 85, y1: 108, x2: TIP_R.x, y2: TIP_R.y, stroke: "#8b5a2b", "stroke-width": 11, "stroke-linecap": "round" });
			add("circle", { cx: TIP_L.x, cy: TIP_L.y, r: 8, fill: "#6f4518" });
			add("circle", { cx: TIP_R.x, cy: TIP_R.y, r: 8, fill: "#6f4518" });
			const bands = svg.querySelectorAll("line");
			return { svg, bandL: bands[0], bandR: bands[1] };
		}

		function buildStage() {
			const stage = document.createElement("div");
			stage.className = "dsh-ss-stage";
			stage.dataset.dshSlingshotRoot = "1";
			state.stage = stage;

			const gun = document.createElement("div");
			gun.className = "dsh-ss-gun";
			const { bandL, bandR } = buildSvg();
			gun.appendChild(bandL.ownerSVGElement);
			state.bandL = bandL;
			state.bandR = bandR;

			const pouch = document.createElement("div");
			pouch.className = "dsh-ss-pouch";
			pouch.title = "拖拽皮兜瞄准";
			pouch.style.left = REST.x + "px";
			pouch.style.top = REST.y + "px";
			gun.appendChild(pouch);

			// resting stone (replaced after each shot)
			const stone = document.createElement("div");
			stone.className = "dsh-ss-stone";
			stone.style.left = REST.x + "px";
			stone.style.top = REST.y + "px";
			gun.appendChild(stone);
			state.stone = stone;

			// trajectory dots
			for (let i = 0; i < 26; i++) {
				const dot = document.createElement("div");
				dot.className = "dsh-ss-dot";
				gun.appendChild(dot);
				state.dots.push(dot);
			}

			// head chip
			const head = document.createElement("div");
			head.className = "dsh-ss-head";
			const title = document.createElement("span");
			title.className = "dsh-ss-title";
			title.textContent = "弹弓";
			const scoreEl = document.createElement("span");
			scoreEl.className = "dsh-ss-score";
			const soundBtn = document.createElement("button");
			soundBtn.type = "button";
			soundBtn.textContent = state.sound ? "🔊" : "🔇";
			soundBtn.title = "声音开关";
			soundBtn.setAttribute("aria-label", "声音开关");
			const closeBtn = document.createElement("button");
			closeBtn.type = "button";
			closeBtn.textContent = "✕";
			closeBtn.title = "收起弹弓";
			closeBtn.setAttribute("aria-label", "收起弹弓");
			head.append(title, scoreEl, soundBtn, closeBtn);
			gun.appendChild(head);
			state.head = head;
			state.scoreEl = scoreEl;

			// bottom grip handle — press & drag to move the whole slingshot
			const handle = document.createElement("div");
			handle.className = "dsh-ss-handle";
			handle.title = "按住拖动，移动弹弓位置";
			handle.setAttribute("aria-label", "拖动移动弹弓位置");
			gun.appendChild(handle);
			state.handle = handle;

			// hint bubble
			const hint = document.createElement("div");
			hint.className = "dsh-ss-hint";
			hint.textContent = "按住皮兜向后拖瞄准，松手发射；按住底部手柄可移动弹弓";
			gun.appendChild(hint);
			state.hintEl = hint;

			// collapsed launcher button + its "where did it go" tip
			const launcher = document.createElement("button");
			launcher.type = "button";
			launcher.className = "dsh-ss-launcher";
			launcher.title = "打开弹弓玩具";
			launcher.setAttribute("aria-label", "打开弹弓玩具");
			launcher.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"><path d="M12 21 V13"/><path d="M12 13 C 12 10, 9.5 8.5, 7 7.5"/><path d="M12 13 C 12 10, 14.5 8.5, 17 7.5"/><circle cx="7" cy="7.5" r="1.6" fill="#fff" stroke="none"/><circle cx="17" cy="7.5" r="1.6" fill="#fff" stroke="none"/><path d="M12 13 V 11.4" stroke-width="2.4"/></svg>`;
			const launcherTip = document.createElement("div");
			launcherTip.className = "dsh-ss-launcher-tip";
			launcherTip.textContent = "弹弓收起来了，点这里恢复 🪀";
			stage.appendChild(launcher);
			stage.appendChild(launcherTip);
			state.launcher = launcher;
			state.launcherTip = launcherTip;

			stage.appendChild(gun);
			state.gun = gun;
			state.pouch = pouch;

			updateScore();
			syncOpen();
			return stage;
		}

		function updateScore() {
			if (state.scoreEl) state.scoreEl.textContent = `💥 ${state.score}`;
		}

		function persistScore() {
			try { localStorage.setItem("dsh-slingshot:score", String(state.score)); } catch { /* ignore */ }
		}

		function syncOpen() {
			state.stage.classList.toggle("dsh-ss-closed", !state.open);
			try { localStorage.setItem("dsh-slingshot:open", state.open ? "1" : "0"); } catch { /* ignore */ }
			if (state.hintEl) state.hintEl.style.display = state.open && !state.taught ? "" : "none";
		}

		// ── aiming ──────────────────────────────────────────────────────────────
		function setBands(px, py) {
			state.bandL.setAttribute("x2", String(px));
			state.bandL.setAttribute("y2", String(py));
			state.bandR.setAttribute("x2", String(px));
			state.bandR.setAttribute("y2", String(py));
		}

		function renderTrajectory(px, py) {
			// The dots are children of the gun, so their coordinates are gun-local.
			const vx = (REST.x - px) * VELOCITY_K;
			const vy = (REST.y - py) * VELOCITY_K;
			let x = REST.x, y = REST.y, cvx = vx, cvy = vy;
			for (let i = 0; i < state.dots.length; i++) {
				cvy += GRAVITY * 0.02;
				x += cvx * 0.02;
				y += cvy * 0.02;
				const dot = state.dots[i];
				if (i % 2 === 0) {
					dot.style.display = "block";
					dot.style.left = x + "px";
					dot.style.top = y + "px";
				} else {
					dot.style.display = "none";
				}
			}
		}

		function clearDots() {
			for (const dot of state.dots) dot.style.display = "none";
		}

		function pouchRest() {
			state.aiming = false;
			state.pointerId = null;
			state.pouch.classList.add("dsh-ss-return");
			state.pouch.style.left = REST.x + "px";
			state.pouch.style.top = REST.y + "px";
			state.stone.style.left = REST.x + "px";
			state.stone.style.top = REST.y + "px";
			setBands(REST.x, REST.y);
			clearDots();
			document.body.classList.remove("dsh-ss-aiming");
		}

		function updatePouch(clientX, clientY) {
			const gr = state.gunRect;
			if (!gr) return;
			let dx = clientX - gr.left - REST.x;
			let dy = clientY - gr.top - REST.y;
			const d = Math.hypot(dx, dy);
			if (d > MAX_PULL) { dx = dx / d * MAX_PULL; dy = dy / d * MAX_PULL; }
			const px = REST.x + dx, py = REST.y + dy;
			state.pouch.style.left = px + "px";
			state.pouch.style.top = py + "px";
			state.stone.style.left = px + "px";
			state.stone.style.top = py + "px";
			setBands(px, py);
			renderTrajectory(px, py);
		}

		// ── physics engine ──────────────────────────────────────────────────────
		function wake() {
			if (!state.raf) {
				state.last = performance.now();
				state.raf = requestAnimationFrame(loop);
			}
		}

		function loop(now) {
			const dt = Math.min(0.05, Math.max(0.001, (now - state.last) / 1000));
			state.last = now;
			for (const fx of [...state.effects]) {
				try {
					fx.update(dt);
				} catch { /* a bad effect must never kill the loop */ }
				if (fx.done) {
					state.effects.delete(fx);
					if (fx.dispose) fx.dispose();
				}
			}
			if (state.effects.size > 0) {
				state.raf = requestAnimationFrame(loop);
			} else {
				state.raf = 0;
				state.last = 0;
			}
		}

		// ── hit detection & breaking ────────────────────────────────────────────
		function hitTest(x, y) {
			let list;
			try { list = document.elementsFromPoint(x, y); } catch { return null; }
			if (!list || list.length === 0) return null;
			let fallback = null;
			for (const el of list) {
				if (el === document.documentElement || el === document.body) continue;
				if (el.closest && el.closest(".dsh-ss-stage")) continue;
				const rect = el.getBoundingClientRect();
				const area = rect.width * rect.height;
				if (area < 500) continue;
				if (area > window.innerWidth * window.innerHeight * 0.72) { fallback = fallback || el; continue; }
				return el;
			}
			return fallback;
		}

		function doBreak(el, hx, hy, svx, svy) {
			if (state.hidden.has(el) || !document.contains(el)) return;
			const rect = el.getBoundingClientRect();
			if (rect.width < 10 || rect.height < 10) return;
			const W = rect.width, H = rect.height;
			const gap = 2;
			const cols = W > 340 ? 3 : W > 150 ? 2 : 1;
			const rows = H > 340 ? 3 : H > 150 ? 2 : 1;
			const cw = (W - gap * (cols - 1)) / cols;
			const ch = (H - gap * (rows - 1)) / rows;

			const wrapper = document.createElement("div");
			wrapper.className = "dsh-ss-wrapper";
			wrapper.style.left = rect.left + "px";
			wrapper.style.top = rect.top + "px";
			wrapper.style.width = W + "px";
			wrapper.style.height = H + "px";

			const cloneBase = () => {
				const c = el.cloneNode(true);
				c.style.position = "absolute";
				c.style.left = "0";
				c.style.top = "0";
				c.style.width = W + "px";
				c.style.height = H + "px";
				c.style.margin = "0";
				c.style.pointerEvents = "none";
				c.style.transformOrigin = "0 0";
				if (c.id) c.removeAttribute("id");
				for (const n of c.querySelectorAll("[id]")) n.removeAttribute("id");
				return c;
			};

			for (let row = 0; row < rows; row++) {
				for (let col = 0; col < cols; col++) {
					const shard = document.createElement("div");
					shard.className = "dsh-ss-shard";
					shard.style.width = cw + "px";
					shard.style.height = ch + "px";
					shard.style.left = col * (cw + gap) + "px";
					shard.style.top = row * (ch + gap) + "px";
					const cell = cloneBase();
					cell.style.transform = `translate(${-(col * (cw + gap))}px, ${-(row * (ch + gap))}px)`;
					shard.appendChild(cell);
					wrapper.appendChild(shard);

					const startX = rect.left + col * (cw + gap);
					const startY = rect.top + row * (ch + gap);
					const cx = startX + cw / 2, cy = startY + ch / 2;
					const ddx = cx - hx, ddy = cy - hy;
					const d = Math.hypot(ddx, ddy) || 1;
					const burst = 240 + Math.random() * 380;
					state.effects.add({
						el: shard,
						x: startX, y: startY,
						vx: (ddx / d) * burst + svx * 0.22,
						vy: (ddy / d) * burst - 120 + svy * 0.22,
						rot: 0,
						vr: (Math.random() - 0.5) * 16,
						t: 0,
						life: 0.7 + Math.random() * 0.5,
						done: false,
						update(dt) {
							this.t += dt;
							this.vy += 1350 * dt;
							this.vx *= 1 - 0.9 * dt;
							this.vy *= 1 - 0.7 * dt;
							this.x += this.vx * dt;
							this.y += this.vy * dt;
							this.rot += this.vr * dt;
							this.el.style.transform = `translate3d(${this.x - startX}px, ${this.y - startY}px, 0) rotate(${this.rot}deg)`;
							if (this.t > this.life) this.done = true;
						}
					});
				}
			}

			// the whole wreckage tumbles off screen, carrying the shards
			const spd = Math.hypot(svx, svy);
			const ang = Math.atan2(svy, svx);
			const wvx = Math.cos(ang) * (Math.min(spd, 1500) * 0.5 + 220) + (Math.random() - 0.5) * 130;
			const wvy = Math.sin(ang) * (Math.min(spd, 1500) * 0.5 + 220) - 120 - Math.random() * 150;
			state.effects.add({
				el: wrapper,
				target: el,
				x: rect.left, y: rect.top,
				vx: wvx, vy: wvy,
				rot: 0,
				vr: (Math.random() - 0.5) * 5,
				t: 0,
				done: false,
				update(dt) {
					this.t += dt;
					this.vy += 950 * dt;
					this.vx *= 1 - 0.45 * dt;
					this.x += this.vx * dt;
					this.y += this.vy * dt;
					this.rot += this.vr * dt;
					this.el.style.transform = `translate3d(${this.x - rect.left}px, ${this.y - rect.top}px, 0) rotate(${this.rot}deg)`;
					const r = this.el.getBoundingClientRect();
					if (this.t > 4 || r.right < -30 || r.bottom < -30 || r.left > window.innerWidth + 30 || r.top > window.innerHeight + 30) {
						this.done = true;
					}
				},
				dispose() {
					this.el.remove();
					restore(this.target);
				}
			});

			state.stage.appendChild(wrapper);
			state.hidden.add(el);
			el.style.visibility = "hidden";
			state.score++;
			updateScore();
			persistScore();
			playSound("hit");
			spawnImpact(hx, hy, svx, svy);
		}

		function spawnImpact(x, y, svx, svy) {
			const ring = document.createElement("div");
			ring.className = "dsh-ss-ring";
			ring.style.left = x + "px";
			ring.style.top = y + "px";
			state.stage.appendChild(ring);
			state.effects.add({
				el: ring, t: 0, life: 0.4, done: false,
				update(dt) {
					this.t += dt;
					this.el.style.transform = `translate(-50%,-50%) scale(${1 + this.t * 9})`;
					this.el.style.opacity = String(1 - this.t / this.life);
					if (this.t > this.life) this.done = true;
				},
				dispose() { this.el.remove(); }
			});
			for (let i = 0; i < 12; i++) {
				const p = document.createElement("div");
				p.className = "dsh-ss-particle";
				const size = 5 + Math.random() * 6;
				p.style.width = size + "px";
				p.style.height = size + "px";
				p.style.left = x + "px";
				p.style.top = y + "px";
				p.style.background = `hsl(${20 + Math.random() * 40}, 70%, ${50 + Math.random() * 30}%)`;
				state.stage.appendChild(p);
				const a = Math.random() * Math.PI * 2;
				const sp = 120 + Math.random() * 320;
				state.effects.add({
					el: p, x, y,
					vx: Math.cos(a) * sp + svx * 0.15,
					vy: Math.sin(a) * sp + svy * 0.15 - 60,
					t: 0,
					life: 0.45 + Math.random() * 0.3,
					done: false,
					update(dt) {
						this.t += dt;
						this.vy += 1000 * dt;
						this.x += this.vx * dt;
						this.y += this.vy * dt;
						this.el.style.transform = `translate(${this.x - x}px, ${this.y - y}px)`;
						this.el.style.opacity = String(1 - this.t / this.life);
						if (this.t > this.life) this.done = true;
					},
					dispose() { this.el.remove(); }
				});
			}
		}

		function restore(el) {
			if (!state.hidden.delete(el)) return;
			playSound("restore");
			if (!document.contains(el)) return;
			el.style.visibility = "visible";
			el.classList.remove("dsh-ss-restore");
			void el.offsetWidth;
			el.classList.add("dsh-ss-restore");
			el.addEventListener("animationend", () => el.classList.remove("dsh-ss-restore"), { once: true });
		}

		// ── firing ──────────────────────────────────────────────────────────────
		function fire(pouchX, pouchY) {
			const gr = state.gunRect;
			if (!gr) return;
			const vx = (REST.x - pouchX) * VELOCITY_K;
			const vy = (REST.y - pouchY) * VELOCITY_K;
			const stone = state.stone;
			state.stage.appendChild(stone); // reparent to stage coords
			stone.style.left = "0";
			stone.style.top = "0";
			// The stone launches from the fork mouth (the same origin the
			// trajectory preview simulates from), not from the pulled-back pouch.
			const sx = gr.left + REST.x, sy = gr.top + REST.y;
			stone.style.transform = `translate3d(${sx - STONE_R}px, ${sy - STONE_R}px, 0)`;
			// Spawn grace: no collisions until the stone leaves the gun's
			// footprint (plus a margin) — otherwise the first frame would hit the
			// UI sitting under the slingshot and "explode" on the spot.
			const gx0 = gr.left - 30, gy0 = gr.top - 30;
			const gx1 = gr.left + GUN_W + 30, gy1 = gr.top + GUN_H + 30;
			state.effects.add({
				el: stone,
				x: sx, y: sy,
				vx, vy,
				done: false,
				update(dt) {
					const prevX = this.x, prevY = this.y;
					this.vy += GRAVITY * dt;
					this.x += this.vx * dt;
					this.y += this.vy * dt;
					const dx = this.x - prevX, dy = this.y - prevY;
					const dist = Math.hypot(dx, dy);
					const steps = Math.max(1, Math.ceil(dist / 10));
					for (let i = 1; i <= steps; i++) {
						const px = prevX + dx * i / steps;
						const py = prevY + dy * i / steps;
						if (px >= gx0 && px <= gx1 && py >= gy0 && py <= gy1) continue; // still in the spawn zone
						const target = hitTest(px, py);
						if (target) {
							this.el.style.transform = `translate3d(${px - STONE_R}px, ${py - STONE_R}px, 0)`;
							doBreak(target, px, py, this.vx, this.vy);
							this.done = true;
							return;
						}
					}
					this.el.style.transform = `translate3d(${this.x - STONE_R}px, ${this.y - STONE_R}px, 0)`;
					if (this.x < -60 || this.x > window.innerWidth + 60 || this.y < -60 || this.y > window.innerHeight + 60) this.done = true;
				},
				dispose() { this.el.remove(); }
			});
			// a fresh stone appears on the pouch for the next shot
			const fresh = document.createElement("div");
			fresh.className = "dsh-ss-stone";
			fresh.style.left = REST.x + "px";
			fresh.style.top = REST.y + "px";
			state.gun.appendChild(fresh);
			state.stone = fresh;
			// little recoil for the gun
			state.gun.classList.remove("dsh-ss-recoil");
			void state.gun.offsetWidth;
			state.gun.classList.add("dsh-ss-recoil");
			if (!state.taught) {
				state.taught = true;
				try { localStorage.setItem("dsh-slingshot:taught", "1"); } catch { /* ignore */ }
				if (state.hintEl) state.hintEl.style.display = "none";
			}
			playSound("release");
		}

		// ── input wiring ────────────────────────────────────────────────────────
		function onPouchDown(e) {
			if (e.button !== undefined && e.button !== 0) return;
			e.preventDefault();
			e.stopPropagation();
			state.aiming = true;
			state.pointerId = e.pointerId;
			state.gunRect = state.gun.getBoundingClientRect();
			state.pouch.classList.remove("dsh-ss-return");
			document.body.classList.add("dsh-ss-aiming");
			try { state.pouch.setPointerCapture(e.pointerId); } catch { /* ok */ }
			ensureAudio();
			updatePouch(e.clientX, e.clientY);
		}

		function onPouchMove(e) {
			if (!state.aiming || e.pointerId !== state.pointerId) return;
			e.preventDefault();
			updatePouch(e.clientX, e.clientY);
		}

		function onPouchUp(e) {
			if (!state.aiming || e.pointerId !== state.pointerId) return;
			const px = parseFloat(state.pouch.style.left) || REST.x;
			const py = parseFloat(state.pouch.style.top) || REST.y;
			const pull = Math.hypot(REST.x - px, REST.y - py);
			pouchRest();
			if (pull >= MIN_PULL) fire(px, py);
			wake();
		}

		function onKeyDown(e) {
			if (state.aiming && e.key === "Escape") pouchRest();
		}

		function onBlur() {
			if (state.aiming) pouchRest();
			if (state.moving) {
				state.moving = null;
				savePos();
			}
		}

		// ── grip handle: press & drag to move the whole gun ────────────────────
		function onHandleDown(e) {
			if (e.button !== undefined && e.button !== 0) return;
			e.preventDefault();
			e.stopPropagation();
			state.moving = { pointerId: e.pointerId, sx: e.clientX, sy: e.clientY, ox: state.pos.x, oy: state.pos.y };
			document.body.classList.add("dsh-ss-aiming");
			try { state.handle.setPointerCapture(e.pointerId); } catch { /* ok */ }
		}

		function onHandleMove(e) {
			if (!state.moving || e.pointerId !== state.moving.pointerId) return;
			e.preventDefault();
			state.pos = clampPos({
				x: state.moving.ox + (e.clientX - state.moving.sx),
				y: state.moving.oy + (e.clientY - state.moving.sy)
			});
			positionGun();
		}

		function onHandleUp(e) {
			if (!state.moving || e.pointerId !== state.moving.pointerId) return;
			state.moving = null;
			document.body.classList.remove("dsh-ss-aiming");
			savePos();
		}

		function onResize() {
			if (!state.pos) return;
			state.pos = clampPos(state.pos);
			positionGun();
		}

		function mount(ctx) {
			const style = document.createElement("style");
			style.dataset.plugin = PLUGIN_ID;
			style.textContent = CSS;
			document.head.appendChild(style);

			const stage = buildStage();
			document.body.appendChild(stage);

			state.pos = loadPos();
			positionGun();
			updateHint();

			state.pouch.addEventListener("pointerdown", onPouchDown);
			state.pouch.addEventListener("pointermove", onPouchMove);
			state.pouch.addEventListener("pointerup", onPouchUp);
			state.pouch.addEventListener("pointercancel", onPouchUp);
			state.pouch.addEventListener("lostpointercapture", () => { if (state.aiming) pouchRest(); });
			state.handle.addEventListener("pointerdown", onHandleDown);
			state.handle.addEventListener("pointermove", onHandleMove);
			state.handle.addEventListener("pointerup", onHandleUp);
			state.handle.addEventListener("pointercancel", onHandleUp);
			state.handle.addEventListener("lostpointercapture", () => { if (state.moving) { state.moving = null; document.body.classList.remove("dsh-ss-aiming"); savePos(); } });
			window.addEventListener("keydown", onKeyDown);
			window.addEventListener("blur", onBlur);
			window.addEventListener("resize", onResize);

			state.soundBtn = stage.querySelector(".dsh-ss-head button:nth-child(3)");
			state.soundBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				state.sound = !state.sound;
				try { localStorage.setItem("dsh-slingshot:sound", state.sound ? "1" : "0"); } catch { /* ignore */ }
				state.soundBtn.textContent = state.sound ? "🔊" : "🔇";
			});
			const closeBtn = stage.querySelector(".dsh-ss-head button:nth-child(4)");
			closeBtn.title = "收起弹弓（点小按钮恢复）";
			closeBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				state.open = false;
				syncOpen();
				// make the collapsed launcher impossible to miss
				state.launcher.classList.remove("dsh-ss-nudge");
				void state.launcher.offsetWidth;
				state.launcher.classList.add("dsh-ss-nudge");
				if (state.launcherTip) {
					state.launcherTip.style.display = "block";
					if (state.tipTimer) window.clearTimeout(state.tipTimer);
					state.tipTimer = window.setTimeout(() => {
						if (state.launcherTip) state.launcherTip.style.display = "none";
					}, 2600);
				}
			});
			state.launcher.addEventListener("click", () => {
				if (state.launcherTip) state.launcherTip.style.display = "none";
				if (state.tipTimer) window.clearTimeout(state.tipTimer);
				state.open = true;
				syncOpen();
			});

			ctx.logger.info("dsh-slingshot: 弹弓玩具已就位 — 拖拽皮兜瞄准，松手发射；按住底部手柄移动弹弓");
		}

		// ── plugin ──────────────────────────────────────────────────────────────
		function apply(ctx) {
			// Defensive guard: if another instance of this toy already mounted (e.g.
			// a stale graph row from an old package name during a rename), do not
			// stack a second slingshot.
			if (document.querySelector(".dsh-ss-stage")) {
				ctx.logger.warn("dsh-slingshot: an instance is already mounted — skipping duplicate");
				return;
			}
			try {
				mount(ctx);
			} catch (error) {
				ctx.logger.error("dsh-slingshot: mount failed", error);
				try { console.error("[dsh-slingshot] mount failed:", error); } catch { /* ignore */ }
				return;
			}
			return () => {
				// restore everything before unloading (HMR reload / shutdown)
				if (state.aiming) pouchRest();
				state.moving = null;
				if (state.tipTimer) window.clearTimeout(state.tipTimer);
				for (const el of [...state.hidden]) {
					state.hidden.delete(el);
					if (document.contains(el)) el.style.visibility = "visible";
				}
				if (state.raf) cancelAnimationFrame(state.raf);
				state.raf = 0;
				state.effects.clear();
				state.stage?.remove();
				const style = document.querySelector(`style[data-plugin="${PLUGIN_ID}"]`);
				style?.remove();
				document.body.classList.remove("dsh-ss-aiming");
			};
		}
		//#endregion
		exports.name = name;
		exports.apply = apply;
		return module.exports;
	}
});
