/* nquery — next-gen jQuery
 * ESM build exporting `$` as default and named helpers.
 * No external dependencies.
 *
 * This version includes:
 * - Scoped, cleanup-aware reactive effects with batching and computed signals
 * - Global QueryClient (caching, dedup, stale-time, refetch-on-focus, etc.)
 * - Smarter DOM wrapper (delegated events, extra helpers, cleanup-aware bindings)
 * - Upgraded UI primitives (modals/sheets, forms, virtual list, toasts, layout)
 * - UX lint + devtools panel hooks
 * - Token/theming helpers with opt-in style injection
 */

const _win = typeof window !== "undefined" ? window : undefined;
const _doc = _win?.document;

// ------------------------------
// Utilities
// ------------------------------
const isFn = v => typeof v === "function";
const isStr = v => typeof v === "string";
const isObj = v => v != null && typeof v === "object" && !Array.isArray(v);
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const now = () => Date.now();
const raf = cb => (_win?.requestAnimationFrame || setTimeout)(cb, 16);
const uid = (p = "nq") => `${p}_${Math.random().toString(36).slice(2, 9)}`;
const toArray = v =>
  Array.isArray(v)
    ? v
    : v == null
    ? []
    : v.length != null && !isStr(v)
    ? Array.from(v)
    : [v];
const pick = (o, keys) =>
  keys.reduce((a, k) => (k in o ? ((a[k] = o[k]), a) : a), {});
const merge = (a, b) => Object.assign({}, a || {}, b || {});
const warn = (...args) => {
  if (nq.devtools._enabled && nq._config.dev) console.warn("[nquery]", ...args);
};
const info = (...args) => {
  if (nq.devtools._enabled && nq._config.dev) console.info("[nquery]", ...args);
};
const assert = (cond, msg) => {
  if (!cond) {
    console.error("[nquery]", msg);
    throw new Error(msg);
  }
};
const hashKey = key => {
  if (isStr(key)) return key;
  try {
    return JSON.stringify(key);
  } catch {
    return String(key);
  }
};
const queueMicrotaskSafe =
  typeof queueMicrotask === "function"
    ? queueMicrotask
    : fn => Promise.resolve().then(fn);

// ------------------------------
// Design Tokens (CSS Variables)
// ------------------------------
const defaultTokens = {
  radius: { sm: "6px", md: "10px", lg: "14px", full: "999px" },
  space: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    "2xl": "32px"
  },
  color: {
    bg: "var(--nq-bg, #0b0e14)",
    surface: "var(--nq-surface, #121826)",
    card: "var(--nq-card, #11151e)",
    text: "var(--nq-text, #e5e7eb)",
    textSoft: "var(--nq-text-soft, #cbd5e1)",
    textMute: "var(--nq-text-mute, #94a3b8)",
    primary: "var(--nq-primary, #3b82f6)",
    primaryFg: "var(--nq-primary-fg, #0b1020)",
    border: "var(--nq-border, #243043)",
    danger: "var(--nq-danger, #ef4444)",
    success: "var(--nq-success, #22c55e)",
    warning: "var(--nq-warning, #f59e0b)"
  },
  motion: {
    dur: { short: 120, medium: 200, long: 320 },
    easing: {
      standard: "cubic-bezier(0.2, 0, 0, 1)",
      decelerate: "cubic-bezier(0, 0, 0, 1)",
      emphasized: "cubic-bezier(0.3, 0, 0, 1.3)"
    }
  }
};

function injectBaseStyles() {
  if (!_doc) return;
  if (_doc.getElementById("nq-base-style")) return;
  const style = _doc.createElement("style");
  style.id = "nq-base-style";
  style.textContent = `
  :root {
    --nq-bg:#0b0e14; --nq-surface:#121826; --nq-card:#11151e;
    --nq-text:#e5e7eb; --nq-text-soft:#cbd5e1; --nq-text-mute:#94a3b8;
    --nq-primary:#3b82f6; --nq-primary-fg:#0b1020;
    --nq-border:#243043; --nq-danger:#ef4444; --nq-success:#22c55e; --nq-warning:#f59e0b;
  }
  .nq-card{
    background:${defaultTokens.color.card};
    color:${defaultTokens.color.text};
    border:1px solid ${defaultTokens.color.border};
    border-radius:${defaultTokens.radius.lg};
    padding:${defaultTokens.space.lg};
    box-shadow:0 1px 2px rgba(0,0,0,.2)
  }
  .nq-btn{
    display:inline-flex;
    align-items:center;
    justify-content:center;
    gap:8px;
    padding:8px 14px;
    border-radius:${defaultTokens.radius.md};
    border:1px solid ${defaultTokens.color.border};
    background:${defaultTokens.color.surface};
    color:${defaultTokens.color.text};
    cursor:pointer;
    transition:
      transform .12s ${defaultTokens.motion.easing.standard},
      box-shadow .12s ${defaultTokens.motion.easing.standard},
      background .12s,
      color .12s;
    user-select:none;
  }
  .nq-btn:focus-visible{
    outline:2px solid ${defaultTokens.color.primary};
    outline-offset:2px;
  }
  .nq-btn[disabled]{ opacity:.6; cursor:not-allowed }
  .nq-btn--primary{
    background:${defaultTokens.color.primary};
    color:#0b1020;
    border-color:rgba(0,0,0,.2);
  }
  .nq-btn--ghost{ background:transparent; }
  .nq-btn--danger{
    background:${defaultTokens.color.danger};
    color:#0b1020;
  }
  .nq-elevate:hover{
    transform:translateY(-1px);
    box-shadow:0 4px 18px rgba(0,0,0,.28);
  }
  .nq-input{
    width:100%;
    padding:10px 12px;
    border-radius:${defaultTokens.radius.md};
    border:1px solid ${defaultTokens.color.border};
    background:${defaultTokens.color.surface};
    color:${defaultTokens.color.text};
  }
  .nq-help{ color:${defaultTokens.color.textMute}; font-size:12px; margin-top:6px }
  .nq-error{ color:${defaultTokens.color.danger}; font-size:12px; margin-top:6px }
  .nq-toast-wrap{
    position:fixed;
    z-index:9999;
    left:50%;
    transform:translateX(-50%);
    bottom:24px;
    display:flex;
    flex-direction:column;
    gap:8px;
    pointer-events:none;
  }
  .nq-toast-wrap--top-right{
    left:auto;
    right:24px;
    top:24px;
    bottom:auto;
    transform:none;
  }
  .nq-toast-wrap--bottom-right{
    left:auto;
    right:24px;
    bottom:24px;
    transform:none;
  }
  .nq-toast-wrap--top-left{
    left:24px;
    right:auto;
    top:24px;
    bottom:auto;
    transform:none;
  }
  .nq-toast-wrap--bottom-left{
    left:24px;
    right:auto;
    bottom:24px;
    transform:none;
  }
  .nq-toast{
    pointer-events:auto;
    background:${defaultTokens.color.surface};
    color:${defaultTokens.color.text};
    border:1px solid ${defaultTokens.color.border};
    border-radius:${defaultTokens.radius.md};
    padding:10px 14px;
    box-shadow:0 8px 30px rgba(0,0,0,.35);
    display:flex;
    align-items:flex-start;
    gap:8px;
    max-width:360px;
  }
  .nq-toast__msg{ flex:1; font-size:14px; }
  .nq-toast__action{
    border:none;
    background:transparent;
    color:${defaultTokens.color.primary};
    font-size:13px;
    cursor:pointer;
  }
  .nq-modal-backdrop{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.5);
    display:none;
    align-items:center;
    justify-content:center;
    z-index:9998;
  }
  .nq-modal{
    background:${defaultTokens.color.card};
    color:${defaultTokens.color.text};
    border:1px solid ${defaultTokens.color.border};
    border-radius:${defaultTokens.radius.lg};
    min-width:320px;
    max-width:90vw;
    max-height:85vh;
    overflow:auto;
    padding:16px;
    outline:none;
  }
  .nq-modal--sheet{
    max-width:420px;
    height:100vh;
    border-radius:0;
  }
  .nq-hide{ display:none !important }
  .nq-tabs{
    display:flex;
    flex-direction:column;
    gap:8px;
  }
  .nq-tablist{
    display:flex;
    gap:8px;
  }
  .nq-tab{
    border:1px solid ${defaultTokens.color.border};
    padding:8px 12px;
    border-radius:${defaultTokens.radius.md};
    cursor:pointer;
    background:${defaultTokens.color.surface};
  }
  .nq-tab[aria-selected="true"]{
    background:${defaultTokens.color.primary};
    color:#0b1020;
  }
  .nq-accordion-item{
    border:1px solid ${defaultTokens.color.border};
    border-radius:${defaultTokens.radius.md};
    overflow:hidden;
  }
  .nq-accordion-header{
    background:${defaultTokens.color.surface};
    padding:10px 12px;
    cursor:pointer;
  }
  .nq-accordion-panel{
    padding:10px 12px;
    display:none;
  }
  .nq-accordion-panel[aria-hidden="false"]{ display:block; }
  .nq-skeleton{
    background:linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.10) 37%, rgba(255,255,255,0.06) 63%);
    background-size:400% 100%;
    animation:nq-shimmer 1.4s ease infinite;
    border-radius:${defaultTokens.radius.md};
  }
  @keyframes nq-shimmer{
    0%{background-position:100% 0}
    100%{background-position:0 0}
  }
  `;
  _doc.head.appendChild(style);
}

let _baseStylesInjected = false;
function ensureBaseStyles() {
  if (_baseStylesInjected) return;
  if (!nq._config.injectStyles) return;
  injectBaseStyles();
  _baseStylesInjected = true;
}

// ------------------------------
// Reactive system
// ------------------------------
let _currentEffect = null;
const _effectStack = [];
let _effectQueue = new Set();
let _effectScheduled = false;

function scheduleEffect(effectFn) {
  _effectQueue.add(effectFn);
  if (_effectScheduled) return;
  _effectScheduled = true;
  queueMicrotaskSafe(() => {
    _effectScheduled = false;
    const toRun = Array.from(_effectQueue);
    _effectQueue.clear();
    toRun.forEach(fn => {
      try {
        fn();
      } catch (e) {
        console.error("[nquery] effect error", e);
      }
    });
  });
}

function cleanupEffect(effectFn) {
  if (!effectFn._deps) return;
  effectFn._deps.forEach(depSet => depSet.delete(effectFn));
  effectFn._deps.clear();
}

function effect(fn) {
  let active = true;
  const runner = () => {
    if (!active) return;
    cleanupEffect(runner);
    _effectStack.push(runner);
    _currentEffect = runner;
    try {
      fn();
    } finally {
      _effectStack.pop();
      _currentEffect = _effectStack[_effectStack.length - 1] || null;
    }
  };
  runner._deps = new Set();
  runner();
  const dispose = () => {
    active = false;
    cleanupEffect(runner);
  };
  return dispose;
}

// Backwards-compatible helper for internal bindings
function runEffect(fn) {
  return effect(fn);
}

function signal(initial, options = {}) {
  let _val = initial;
  const subs = new Set();
  const equals =
    typeof options.equals === "function" ? options.equals : (a, b) => a === b;

  const sig = {
    get value() {
      if (_currentEffect) {
        subs.add(_currentEffect);
        if (!_currentEffect._deps) _currentEffect._deps = new Set();
        _currentEffect._deps.add(subs);
      }
      return _val;
    },
    set value(v) {
      if (equals(_val, v)) return;
      _val = v;
      subs.forEach(effectFn => scheduleEffect(effectFn));
      if (nq._config.dev && nq.devtools._trackSignals) {
        nq.devtools._trackSignals(sig);
      }
    },
    update(updater) {
      sig.value = updater(_val);
    },
    subscribe(fn) {
      const wrapper = () => fn(_val);
      subs.add(wrapper);
      if (nq._config.dev && nq.devtools._trackSignals) {
        nq.devtools._trackSignals(sig);
      }
      return () => subs.delete(wrapper);
    }
  };
  if (nq._config.dev && nq.devtools._registerSignal) {
    nq.devtools._registerSignal(sig);
  }
  return sig;
}

function computed(getter) {
  const out = signal(undefined);
  const dispose = effect(() => {
    out.value = getter();
  });
  // expose a way to dispose if needed
  out.dispose = dispose;
  return out;
}

// Simple immutable store with path-based updates
function store(initial) {
  const state = signal(initial);
  function setPath(obj, path, value) {
    const parts = Array.isArray(path) ? path : String(path).split(".");
    const clone = Array.isArray(obj) ? obj.slice() : { ...(obj || {}) };
    let cur = clone;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      const next = cur[key];
      cur[key] =
        next == null
          ? isNaN(parts[i + 1])
            ? {}
            : []
          : Array.isArray(next)
          ? next.slice()
          : { ...next };
      cur = cur[key];
    }
    cur[parts[parts.length - 1]] = value;
    return clone;
  }
  const api = {
    get value() {
      return state.value;
    },
    set value(v) {
      state.value = v;
    },
    update(fn) {
      state.update(fn);
    },
    set(path, value) {
      state.value = setPath(state.value, path, value);
    },
    subscribe: fn => state.subscribe(fn)
  };
  return api;
}

// ------------------------------
// Binding metadata + cleanup
// ------------------------------
function getMeta(node) {
  if (!node) return null;
  if (!node.__nqMeta) {
    Object.defineProperty(node, "__nqMeta", {
      value: {
        disposers: [],
        listeners: [],
        bindings: []
      },
      enumerable: false,
      configurable: true
    });
  }
  return node.__nqMeta;
}

let bindingObserver;

function startBindingGC() {
  if (!_doc || bindingObserver) return;
  bindingObserver = new MutationObserver(mutations => {
    for (const m of mutations) {
      m.removedNodes &&
        m.removedNodes.forEach(node => {
          cleanupNodeAndDescendants(node);
        });
    }
  });
  bindingObserver.observe(_doc.documentElement, {
    childList: true,
    subtree: true
  });
}

function cleanupNodeAndDescendants(node) {
  if (!node) return;
  if (node.__nqMeta) {
    const meta = node.__nqMeta;
    meta.disposers.forEach(d => {
      try {
        d();
      } catch (e) {
        console.error("[nquery] binding dispose error", e);
      }
    });
    meta.disposers.length = 0;
    meta.listeners.forEach(({ type, listener }) => {
      node.removeEventListener(type, listener);
    });
    meta.listeners.length = 0;
    meta.bindings.length = 0;
  }
  if (node.childNodes && node.childNodes.length) {
    node.childNodes.forEach(child => cleanupNodeAndDescendants(child));
  }
}

// ------------------------------
// Motion engine
// ------------------------------
function durationMs(tag) {
  return typeof tag === "number"
    ? tag
    : nq._config.motion.dur[tag] ?? defaultTokens.motion.dur.short;
}

function presetToMotion(name) {
  switch (name) {
    case "elevateOnHover":
      return {
        hover: true,
        transform: "scale(1.01)",
        shadow: "0 6px 24px rgba(0,0,0,.3)",
        duration: "short"
      };
    case "slideInBottom":
      return {
        enter: "translateY(8px)",
        fromOpacity: 0,
        toOpacity: 1,
        duration: "medium"
      };
    case "reorderSmooth":
      return { transition: "transform 160ms, opacity 160ms" };
    default:
      return { duration: "short" };
  }
}

function applyMotion(el, opts = {}) {
  const d = durationMs(opts.duration || "short");
  const easing = nq._config.motion.easing.standard;
  if (opts.hover) {
    el.classList.add("nq-elevate");
    return;
  }
  if (opts.enter) {
    el.style.opacity = String(opts.fromOpacity ?? 0);
    el.style.transform = opts.enter;
    raf(() => {
      el.style.transition = `transform ${d}ms ${easing}, opacity ${d}ms ${easing}`;
      el.style.opacity = String(opts.toOpacity ?? 1);
      el.style.transform = "none";
      setTimeout(() => {
        el.style.transition = "";
      }, d + 20);
    });
  } else if (opts.transition) {
    el.style.transition = opts.transition;
  }
}

// ------------------------------
// Toast manager
// ------------------------------
let toastWrap;
let toastPosition = "bottom";

function ensureToastContainer(position = toastPosition) {
  if (!_doc) return;
  if (!toastWrap) {
    toastWrap = _doc.createElement("div");
    toastWrap.className = "nq-toast-wrap";
    _doc.body.appendChild(toastWrap);
  }
  toastWrap.className = "nq-toast-wrap";
  toastPosition = position;
  switch (position) {
    case "top-right":
      toastWrap.classList.add("nq-toast-wrap--top-right");
      break;
    case "bottom-right":
      toastWrap.classList.add("nq-toast-wrap--bottom-right");
      break;
    case "top-left":
      toastWrap.classList.add("nq-toast-wrap--top-left");
      break;
    case "bottom-left":
      toastWrap.classList.add("nq-toast-wrap--bottom-left");
      break;
    default:
      break;
  }
}

function makeToast(msg, kind = "info", options = {}) {
  ensureToastContainer(options.position || toastPosition);
  const t = _doc.createElement("div");
  t.className = "nq-toast";
  const msgEl = _doc.createElement("div");
  msgEl.className = "nq-toast__msg";
  msgEl.textContent = msg;
  t.appendChild(msgEl);

  if (options.action && isFn(options.action.onClick)) {
    const btn = _doc.createElement("button");
    btn.type = "button";
    btn.className = "nq-toast__action";
    btn.textContent = options.action.label || "Undo";
    btn.addEventListener("click", e => {
      e.stopPropagation();
      options.action.onClick();
      t.remove();
    });
    t.appendChild(btn);
  }

  if (kind === "success") t.style.borderColor = defaultTokens.color.success;
  if (kind === "error") t.style.borderColor = defaultTokens.color.danger;
  toastWrap.appendChild(t);
  const d = clamp(options.duration ?? 2200, 800, 8000);
  let timeout = setTimeout(() => t.remove(), d);

  // pause on hover
  t.addEventListener("mouseenter", () => {
    clearTimeout(timeout);
  });
  t.addEventListener("mouseleave", () => {
    timeout = setTimeout(() => t.remove(), d);
  });
}

// ------------------------------
// Accessibility helpers
// ------------------------------
function cssEscape(str) {
  return (str || "").replace(/["\\]/g, "\\$&");
}

const a11y = {
  focusTrap(container) {
    if (!container) return;
    const getFocusable = () =>
      container.querySelectorAll(
        "a, button, input, textarea, select, [tabindex]:not([tabindex='-1'])"
      );
    container.addEventListener("keydown", e => {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && _doc.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && _doc.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  },
  role(el, r) {
    el.setAttribute("role", r);
  }
};

// ------------------------------
// Attention motion (success/error)
// ------------------------------
function hexToRgba(hex, a) {
  if (!hex) return `rgba(255,255,255,${a})`;
  if (hex.startsWith("var(")) return `rgba(255,255,255,${a})`;
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(x => x + x).join("") : h;
  const bigint = parseInt(full, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${a})`;
}

function attention(el, kind = "success") {
  const color =
    kind === "success" ? defaultTokens.color.success : defaultTokens.color.danger;
  const old = el.style.boxShadow;
  el.style.boxShadow = `0 0 0 3px ${hexToRgba(color, 0.35)}`;
  setTimeout(() => {
    el.style.boxShadow = old || "";
  }, 420);
}

// ------------------------------
// nQuery core
// ------------------------------
function valOf(v) {
  return isFn(v) ? v() : v && v.value !== undefined ? v.value : v;
}

function $(sel) {
  if (!_doc) return new NQObject([]);
  if (sel instanceof NQObject) return sel;
  if (isStr(sel)) return new NQObject(Array.from(_doc.querySelectorAll(sel)));
  if (sel?.nodeType === 1 || sel === _win || sel === _doc)
    return new NQObject([sel]);
  if (sel && sel.length != null) return new NQObject(Array.from(sel));
  return new NQObject([]);
}

$.ready = fn => {
  if (!_doc) return;
  if (_doc.readyState === "loading")
    _doc.addEventListener("DOMContentLoaded", fn);
  else fn();
};

// ------------------------------
// Config & Tokens & Theme
// ------------------------------
const nq = $; // namespace alias
const _themes = { default: defaultTokens };

nq._config = {
  tokens: defaultTokens,
  motion: defaultTokens.motion,
  dev: true,
  injectStyles: true
};

function deepMerge(a, b) {
  const out = { ...(a || {}) };
  for (const k in b) {
    if (isObj(b[k]) && isObj(a?.[k])) out[k] = deepMerge(a[k], b[k]);
    else out[k] = b[k];
  }
  return out;
}

function token(cat, name) {
  return (
    nq._config.tokens?.[cat]?.[name] ||
    defaultTokens[cat]?.[name] ||
    name
  );
}

function mapAlign(a) {
  return a === "start"
    ? "flex-start"
    : a === "end"
    ? "flex-end"
    : a === "stretch"
    ? "stretch"
    : "center";
}

nq.config = (options = {}) => {
  if (options.tokens)
    nq._config.tokens = deepMerge(defaultTokens, options.tokens);
  if (options.motion)
    nq._config.motion = deepMerge(defaultTokens.motion, options.motion);
  if (options.dev != null) nq._config.dev = !!options.dev;
  if (options.injectStyles != null)
    nq._config.injectStyles = !!options.injectStyles;
  if (options.toastPosition) toastPosition = options.toastPosition;
  return nq._config;
};

nq.theme = {
  set(name, tokens) {
    _themes[name] = deepMerge(defaultTokens, tokens || {});
  },
  apply(name, root) {
    const t = _themes[name];
    if (!t || !_doc) return;
    const target = root || _doc.documentElement;
    nq._config.tokens = t;
    const map = {
      bg: "--nq-bg",
      surface: "--nq-surface",
      card: "--nq-card",
      text: "--nq-text",
      textSoft: "--nq-text-soft",
      textMute: "--nq-text-mute",
      primary: "--nq-primary",
      primaryFg: "--nq-primary-fg",
      border: "--nq-border",
      danger: "--nq-danger",
      success: "--nq-success",
      warning: "--nq-warning"
    };
    Object.keys(map).forEach(k => {
      const v = t.color?.[k];
      if (v != null) target.style.setProperty(map[k], v);
    });
  }
};

nq.motion = {
  setDefaults(options = {}) {
    if (options.dur)
      nq._config.motion.dur = { ...nq._config.motion.dur, ...options.dur };
    if (options.easing)
      nq._config.motion.easing = {
        ...nq._config.motion.easing,
        ...options.easing
      };
  }
};

// ------------------------------
// Query Client & Async
// ------------------------------
class Query {
  constructor(client, key, fetcher, options = {}) {
    this.client = client;
    this.key = key;
    this.hash = hashKey(key);
    this.fetcher = fetcher;
    this.options = options;
    this.data = signal(options.initialData);
    this.error = signal(null);
    this.status = signal(
      options.initialData !== undefined ? "success" : "idle"
    ); // idle|loading|success|error
    this.isFetching = signal(false);
    this.lastUpdated = 0;
    this.requestId = 0;
    this.abortController = null;
    this.subCount = 0;
    this.refetchIntervalId = null;
    this._setupRefetchInterval();
  }

  _setupRefetchInterval() {
    const interval = this.options.refetchInterval;
    if (!interval || !_win) return;
    if (this.refetchIntervalId) clearInterval(this.refetchIntervalId);
    this.refetchIntervalId = _win.setInterval(() => {
      if (this.subCount > 0) this.refetch();
    }, interval);
  }

  get staleTime() {
    return this.options.staleTime ?? this.client.defaultOptions.staleTime;
  }

  get select() {
    return this.options.select ?? this.client.defaultOptions.select;
  }

  isStale() {
    return now() - this.lastUpdated > this.staleTime;
  }

  async _run(force = false) {
    const allowStale =
      !force &&
      !this.isStale() &&
      this.status.value === "success" &&
      !this.options.forceRefetch;
    if (allowStale) return this.data.value;

    const currentId = ++this.requestId;
    if (this.abortController) this.abortController.abort();
    this.abortController =
      typeof AbortController !== "undefined"
        ? new AbortController()
        : null;

    const isBackground = this.status.value === "success";
    this.isFetching.value = true;
    if (!isBackground || !this.options.keepPreviousData) {
      this.status.value = "loading";
    }

    const ctx = {
      signal: this.abortController?.signal,
      queryKey: this.key
    };

    const fetchFn =
      this.fetcher.length > 0 ? () => this.fetcher(ctx) : () => this.fetcher();

    try {
      const raw = await fetchFn();
      if (currentId !== this.requestId) return this.data.value;
      const selected = this.select ? this.select(raw) : raw;
      this.data.value = selected;
      this.status.value = "success";
      this.error.value = null;
      this.lastUpdated = now();
      this.isFetching.value = false;
      this.options.onSuccess?.(selected);
      this.options.onSettled?.(selected, null);
      return selected;
    } catch (e) {
      if (this.abortController && e?.name === "AbortError") {
        // ignore cancellation
        return this.data.value;
      }
      if (currentId !== this.requestId) return this.data.value;
      this.error.value = e;
      this.status.value = "error";
      this.isFetching.value = false;
      this.options.onError?.(e);
      this.options.onSettled?.(undefined, e);
      throw e;
    }
  }

  refetch(force = false) {
    return this._run(force);
  }

  subscribe(listener) {
    const u1 = this.data.subscribe(() => listener(this));
    const u2 = this.status.subscribe(() => listener(this));
    const u3 = this.error.subscribe(() => listener(this));
    const u4 = this.isFetching.subscribe(() => listener(this));
    this.subCount++;
    return () => {
      u1();
      u2();
      u3();
      u4();
      this.subCount = Math.max(0, this.subCount - 1);
    };
  }
}

class QueryClient {
  constructor(options = {}) {
    this.queries = new Map();
    this.defaultOptions = {
      staleTime: 60_000,
      cacheTime: 5 * 60_000,
      select: null,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      ...options.defaultOptions
    };
    this._setupGlobalListeners();
  }

  _setupGlobalListeners() {
    if (!_win) return;
    if (!this._focusListener) {
      this._focusListener = () => {
        this.queries.forEach(q => {
          const opts = q.options;
          const should =
            (opts.refetchOnWindowFocus ??
              this.defaultOptions.refetchOnWindowFocus) && q.subCount > 0;
          if (should && q.status.value === "success" && q.isStale()) {
            q.refetch();
          }
        });
      };
      _win.addEventListener("focus", this._focusListener);
    }
    if (!this._onlineListener) {
      this._onlineListener = () => {
        this.queries.forEach(q => {
          const opts = q.options;
          const should =
            (opts.refetchOnReconnect ??
              this.defaultOptions.refetchOnReconnect) && q.subCount > 0;
          if (should && q.status.value === "error") {
            q.refetch(true);
          }
        });
      };
      _win.addEventListener("online", this._onlineListener);
    }
  }

  createQuery(key, fetcher, options = {}) {
    const hash = hashKey(key);
    const existing = this.queries.get(hash);
    if (existing) return existing;
    const q = new Query(this, key, fetcher, options);
    this.queries.set(hash, q);
    if (options.initialFetch !== false) {
      q.refetch(true).catch(() => {});
    }
    return q;
  }

  getQuery(key) {
    return this.queries.get(hashKey(key)) || null;
  }

  invalidateQueries(predicateOrKey) {
    const predicate = isFn(predicateOrKey)
      ? predicateOrKey
      : q => hashKey(predicateOrKey) === q.hash;
    this.queries.forEach(q => {
      if (predicate(q)) q.refetch(true);
    });
  }

  // basic GC stub (could be expanded)
  removeUnused() {
    const nowMs = now();
    this.queries.forEach((q, hash) => {
      const ct = q.options.cacheTime ?? this.defaultOptions.cacheTime;
      if (q.subCount === 0 && nowMs - q.lastUpdated > ct) {
        this.queries.delete(hash);
      }
    });
  }
}

const defaultQueryClient = new QueryClient();

function createQuery(key, fetcher, options = {}) {
  return defaultQueryClient.createQuery(key, fetcher, options);
}

// Simple mutation primitive
function createMutation(fn, options = {}) {
  const status = signal("idle"); // idle|loading|success|error
  const data = signal(options.initialData);
  const error = signal(null);
  let currentId = 0;

  async function mutate(variables) {
    const id = ++currentId;
    status.value = "loading";
    error.value = null;
    try {
      const res = fn.length > 1 ? await fn(variables, { id }) : await fn(variables);
      if (id !== currentId) return data.value;
      data.value = res;
      status.value = "success";
      options.onSuccess?.(res, variables);
      options.onSettled?.(res, null, variables);
      return res;
    } catch (e) {
      if (id !== currentId) return data.value;
      error.value = e;
      status.value = "error";
      options.onError?.(e, variables);
      options.onSettled?.(undefined, e, variables);
      throw e;
    }
  }

  return { status, data, error, mutate };
}

// ------------------------------
// Devtools UX Lint
// ------------------------------
nq.devtools = {
  _enabled: true,
  _uxConfig: {
    root: null,
    rules: {
      clickableDiv: true,
      iconOnlyButtons: true,
      tapTargets: true
    }
  },
  _registerSignal: null,
  _trackSignals: null,
  signals: new Set(),
  enableUXLint(opts = {}) {
    this._enabled = true;
    startUXLint(opts);
  },
  disableUXLint() {
    this._enabled = false;
    stopUXLint();
  },
  highlightIssue(id) {
    const el = _doc.querySelector(
      `[data-nq-issue="${cssEscape(id)}"]`
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.outline = `2px solid ${defaultTokens.color.warning}`;
      setTimeout(() => {
        el.style.outline = "";
      }, 1200);
    }
  },
  warn(code, details) {
    warn("[UX]", code, details);
  }
};

let lintObserver;

function startUXLint(opts = {}) {
  if (!_doc) return;
  nq.devtools._uxConfig = {
    root: opts.root || _doc.documentElement,
    rules: { ...nq.devtools._uxConfig.rules, ...(opts.rules || {}) }
  };
  if (lintObserver) return;
  const root = nq.devtools._uxConfig.root;
  const check = () => {
    if (!nq._config.dev || !nq.devtools._enabled) return;
    const rules = nq.devtools._uxConfig.rules;

    if (rules.clickableDiv) {
      root.querySelectorAll("div[onclick]").forEach(el => {
        if (!el.hasAttribute("role") || !el.hasAttribute("tabindex")) {
          nq.devtools.warn("clickable-div-missing-a11y", el);
          el.dataset.nqIssue = "clickable-div-missing-a11y";
        }
      });
    }

    if (rules.iconOnlyButtons) {
      root.querySelectorAll("button").forEach(btn => {
        const onlyIcon =
          btn.children.length === 1 && btn.textContent.trim() === "";
        if (onlyIcon && !btn.getAttribute("aria-label")) {
          nq.devtools.warn("icon-only-button-missing-aria", btn);
          btn.dataset.nqIssue = "icon-only-button-missing-aria";
        }
      });
    }

    if (rules.tapTargets) {
      const MIN = 40;
      root
        .querySelectorAll("button, a, [role='button']")
        .forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width < MIN || rect.height < MIN) {
            nq.devtools.warn("tap-target-small", { el, rect });
            el.dataset.nqIssue = "tap-target-small";
          }
        });
    }
  };

  lintObserver = new MutationObserver(() => check());
  lintObserver.observe(root, {
    subtree: true,
    childList: true,
    attributes: true
  });
  $.ready(check);
}

function stopUXLint() {
  if (lintObserver) {
    lintObserver.disconnect();
    lintObserver = null;
  }
}

// basic signal tracking for devtools
nq.devtools._registerSignal = sig => {
  nq.devtools.signals.add(sig);
};
nq.devtools._trackSignals = () => {};

// ------------------------------
// DOM Wrapper
// ------------------------------
class NQObject {
  constructor(nodes) {
    this.nodes = nodes;
  }

  // ----- DOM Read/Write -----
  text(v) {
    if (v === undefined) return this.nodes[0]?.textContent;
    this.nodes.forEach(n => {
      if (n) n.textContent = v;
    });
    return this;
  }

  html(v) {
    if (v === undefined) return this.nodes[0]?.innerHTML;
    this.nodes.forEach(n => {
      if (n) n.innerHTML = v;
    });
    return this;
  }

  attr(name, v) {
    if (isObj(name)) {
      this.nodes.forEach(n => {
        if (!n) return;
        for (const k in name) n.setAttribute(k, valOf(name[k]));
      });
      return this;
    }
    if (v === undefined) return this.nodes[0]?.getAttribute(name);
    this.nodes.forEach(n => {
      if (!n) return;
      if (v == null) n.removeAttribute(name);
      else n.setAttribute(name, valOf(v));
    });
    return this;
  }

  addClass(c) {
    this.nodes.forEach(n => n && n.classList.add(c));
    return this;
  }

  removeClass(c) {
    this.nodes.forEach(n => n && n.classList.remove(c));
    return this;
  }

  toggleClass(c, force) {
    this.nodes.forEach(n => {
      if (!n) return;
      n.classList.toggle(
        c,
        force === undefined ? !n.classList.contains(c) : !!force
      );
    });
    return this;
  }

  css(name, v) {
    if (isObj(name)) {
      this.nodes.forEach(n => {
        if (!n) return;
        for (const k in name) n.style[k] = valOf(name[k]);
      });
      return this;
    }
    if (v === undefined) return getComputedStyle(this.nodes[0])[name];
    this.nodes.forEach(n => {
      if (!n) return;
      n.style[name] = valOf(v);
    });
    return this;
  }

  show() {
    this.nodes.forEach(n => n && n.classList.remove("nq-hide"));
    return this;
  }

  hide() {
    this.nodes.forEach(n => n && n.classList.add("nq-hide"));
    return this;
  }

  toggle(show) {
    this.nodes.forEach(n => {
      if (!n) return;
      const hide =
        show === false
          ? true
          : show === true
          ? false
          : n.classList.contains("nq-hide");
      n.classList.toggle("nq-hide", hide);
    });
    return this;
  }

  // ----- DOM traversal helpers -----
  val(v) {
    const el = this.nodes[0];
    if (!el) return undefined;
    if (v === undefined) {
      if (el.type === "checkbox") return !!el.checked;
      if (el.type === "radio") return el.checked ? el.value : undefined;
      return el.value;
    }
    this.nodes.forEach(n => {
      if (!n) return;
      if (n.type === "checkbox") n.checked = !!v;
      else n.value = v;
    });
    return this;
  }

  data(name, v) {
    const el = this.nodes[0];
    if (!el) return undefined;
    if (!name) return el.dataset;
    if (v === undefined) return el.dataset[name];
    this.nodes.forEach(n => {
      if (!n) return;
      n.dataset[name] = v;
    });
    return this;
  }

  find(selector) {
    if (!selector) return new NQObject([]);
    const found = [];
    this.nodes.forEach(n => {
      if (!n) return;
      found.push(...n.querySelectorAll(selector));
    });
    return new NQObject(found);
  }

  closest(selector) {
    const el = this.nodes[0];
    if (!el) return new NQObject([]);
    const c = el.closest(selector);
    return new NQObject(c ? [c] : []);
  }

  parents(selector) {
    const out = [];
    this.nodes.forEach(n => {
      let cur = n?.parentElement;
      while (cur) {
        if (!selector || cur.matches(selector)) out.push(cur);
        cur = cur.parentElement;
      }
    });
    return new NQObject(Array.from(new Set(out)));
  }

  siblings(selector) {
    const out = [];
    this.nodes.forEach(n => {
      if (!n || !n.parentElement) return;
      n.parentElement.childNodes.forEach(sib => {
        if (sib === n || sib.nodeType !== 1) return;
        if (!selector || sib.matches(selector)) out.push(sib);
      });
    });
    return new NQObject(Array.from(new Set(out)));
  }

  append(content) {
    this.nodes.forEach(n => {
      if (!n) return;
      if (isStr(content)) n.insertAdjacentHTML("beforeend", content);
      else if (content instanceof NQObject) content.nodes.forEach(c => c && n.appendChild(c));
      else if (content?.nodeType) n.appendChild(content);
    });
    return this;
  }

  prepend(content) {
    this.nodes.forEach(n => {
      if (!n) return;
      if (isStr(content)) n.insertAdjacentHTML("afterbegin", content);
      else if (content instanceof NQObject) {
        content.nodes
          .slice()
          .reverse()
          .forEach(c => c && n.insertBefore(c, n.firstChild));
      } else if (content?.nodeType) {
        n.insertBefore(content, n.firstChild);
      }
    });
    return this;
  }

  before(content) {
    this.nodes.forEach(n => {
      if (!n || !n.parentNode) return;
      if (isStr(content))
        n.insertAdjacentHTML("beforebegin", content);
      else if (content instanceof NQObject)
        content.nodes.forEach(c => c && n.parentNode.insertBefore(c, n));
      else if (content?.nodeType) n.parentNode.insertBefore(content, n);
    });
    return this;
  }

  after(content) {
    this.nodes.forEach(n => {
      if (!n || !n.parentNode) return;
      if (isStr(content))
        n.insertAdjacentHTML("afterend", content);
      else if (content instanceof NQObject)
        content.nodes
          .slice()
          .reverse()
          .forEach(c => c && n.parentNode.insertBefore(c, n.nextSibling));
      else if (content?.nodeType)
        n.parentNode.insertBefore(content, n.nextSibling);
    });
    return this;
  }

  remove() {
    this.nodes.forEach(n => {
      if (!n) return;
      cleanupNodeAndDescendants(n);
      n.remove();
    });
    return this;
  }

  // ----- Events (with optional delegation) -----
  on(evt, selectorOrHandler, maybeHandler) {
    const useDelegation = isStr(selectorOrHandler);
    const handler = useDelegation ? maybeHandler : selectorOrHandler;
    assert(isFn(handler), "on(event, handler) or on(event, selector, handler)");

    this.nodes.forEach(root => {
      if (!root) return;
      const meta = getMeta(root);
      let listener;
      if (useDelegation) {
        const selector = selectorOrHandler;
        listener = e => {
          const target = e.target?.closest(selector);
          if (target && root.contains(target)) {
            handler.call(target, e);
          }
        };
        meta.listeners.push({ type: evt, listener, original: handler, selector });
      } else {
        listener = handler;
        meta.listeners.push({ type: evt, listener, original: handler, selector: null });
      }
      root.addEventListener(evt, listener);
    });
    return this;
  }

  off(evt, handler) {
    this.nodes.forEach(root => {
      if (!root || !root.__nqMeta) return;
      const meta = root.__nqMeta;
      meta.listeners = meta.listeners.filter(l => {
        const matchType = !evt || l.type === evt;
        const matchHandler = !handler || l.original === handler || l.listener === handler;
        if (matchType && matchHandler) {
          root.removeEventListener(l.type, l.listener);
          return false;
        }
        return true;
      });
    });
    return this;
  }

  once(evt, handler) {
    const wrap = e => {
      handler(e);
      this.off(evt, wrap);
    };
    return this.on(evt, wrap);
  }

  trigger(evt, detail) {
    this.nodes.forEach(n => {
      if (!n) return;
      n.dispatchEvent(new CustomEvent(evt, { detail, bubbles: true }));
    });
    return this;
  }

  // ----- Bindings -----
  bindText(src) {
    if (isFn(src)) {
      this.nodes.forEach(n => {
        const dispose = effect(() => {
          n.textContent = src();
        });
        const meta = getMeta(n);
        meta.disposers.push(dispose);
        meta.bindings.push({ type: "text" });
      });
      return this;
    }

    if (src && src.subscribe && "value" in src) {
      this.nodes.forEach(n => {
        const update = v => {
          n.textContent = v;
        };
        update(src.value);
        const unsub = src.subscribe(update);
        const meta = getMeta(n);
        meta.disposers.push(unsub);
        meta.bindings.push({ type: "text" });
      });
      return this;
    }

    this.text(src);
    return this;
  }

  bindAttr(map) {
    this.nodes.forEach(n => {
      const meta = getMeta(n);
      for (const k in map) {
        const v = map[k];
        if (isFn(v)) {
          const dispose = effect(() => {
            const val = v();
            if (val == null) n.removeAttribute(k);
            else n.setAttribute(k, val);
          });
          meta.disposers.push(dispose);
          meta.bindings.push({ type: "attr", key: k });
          continue;
        }
        if (v && v.subscribe && "value" in v) {
          n.setAttribute(k, v.value);
          const unsub = v.subscribe(val => {
            if (val == null) n.removeAttribute(k);
            else n.setAttribute(k, val);
          });
          meta.disposers.push(unsub);
          meta.bindings.push({ type: "attr", key: k });
          continue;
        }
        if (v == null) n.removeAttribute(k);
        else n.setAttribute(k, v);
      }
    });
    return this;
  }

  bindClass(map) {
    this.nodes.forEach(n => {
      const meta = getMeta(n);
      const apply = () => {
        for (const cls in map) {
          const v = map[cls];
          const value = isFn(v)
            ? v()
            : v && v.value !== undefined
            ? v.value
            : v;
          n.classList.toggle(cls, !!value);
        }
      };
      const dispose = effect(apply);
      meta.disposers.push(dispose);
      meta.bindings.push({ type: "class" });
    });
    return this;
  }

  /**
   * bindList(store, renderItem, options)
   * - store: object with data.signal
   * - renderItem: (item, idx) => string | HTMLElement
   * - options:
   *   - key: (item, idx) => key
   *   - mode: "innerHTML" | "component"
   *   - mount(el, item, idx)
   *   - patch(el, item, idx)
   *   - unmount(el, item, idx)
   */
  bindList(store, renderItem, options = {}) {
    const container = this.nodes[0];
    assert(container, "bindList requires at least one container element");
    container.setAttribute("role", "list");
    const keyFn =
      options.key ||
      ((item, idx) =>
        item?.id ?? item?.key ?? `${JSON.stringify(item).slice(0, 20)}_${idx}`);
    const mode = options.mode || "innerHTML";
    let keyed = new Map();

    const renderAll = () => {
      const data = store.data?.value || [];
      const used = new Set();

      data.forEach((it, idx) => {
        const k = keyFn(it, idx);
        used.add(k);
        let entry = keyed.get(k);
        if (!entry) {
          const wrapper = _doc.createElement("div");
          wrapper.setAttribute("role", "listitem");
          wrapper.dataset.key = k;
          let contentNode = null;

          if (mode === "component" && options.mount) {
            options.mount(wrapper, it, idx);
            contentNode = wrapper;
          } else {
            const html = renderItem(it, idx);
            if (isStr(html)) wrapper.innerHTML = html;
            else if (html?.nodeType) wrapper.appendChild(html);
            contentNode = wrapper;
          }

          container.appendChild(wrapper);
          keyed.set(k, wrapper);
          if (mode === "component" && options.afterMount) {
            options.afterMount(wrapper, it, idx);
          }
        } else {
          if (mode === "component" && options.patch) {
            options.patch(entry, it, idx);
          } else if (options.alwaysPatch !== false) {
            const html = renderItem(it, idx);
            if (isStr(html)) entry.innerHTML = html;
            else if (html?.nodeType) {
              entry.innerHTML = "";
              entry.appendChild(html);
            }
          }
        }
      });

      keyed.forEach((el, k) => {
        if (!used.has(k)) {
          const meta = getMeta(el);
          meta.disposers.forEach(d => d());
          meta.disposers.length = 0;
          if (mode === "component" && options.unmount) {
            const idx = Array.from(container.children).indexOf(el);
            const it = store.data.value[idx];
            options.unmount(el, it, idx);
          }
          el.remove();
          keyed.delete(k);
        }
      });
    };

    renderAll();
    store.subscribe?.(() => renderAll());
    return this;
  }

  // ----- UI primitives -----
  uiCard(opts = {}) {
    ensureBaseStyles();
    this.addClass("nq-card");
    if (opts.elevateOnHover) this.addClass("nq-elevate");
    return this;
  }

  uiButton(variantOrOpts = "primary") {
    ensureBaseStyles();
    this.addClass("nq-btn");
    const variant = isObj(variantOrOpts)
      ? variantOrOpts.variant ?? "primary"
      : variantOrOpts;
    const iconOnly = isObj(variantOrOpts)
      ? !!variantOrOpts.iconOnly
      : false;
    const ariaLabel = this.attr("aria-label");
    this.toggleClass("nq-btn--primary", variant === "primary");
    this.toggleClass("nq-btn--ghost", variant === "ghost");
    this.toggleClass("nq-btn--danger", variant === "danger");
    if (iconOnly && !ariaLabel) {
      nq.devtools.warn("icon-only-button-missing-aria", {
        element: this.nodes[0]
      });
    }
    return this;
  }

  uiInput(opts = {}) {
    ensureBaseStyles();
    this.addClass("nq-input");
    if (opts.placeholder) this.attr("placeholder", opts.placeholder);
    return this;
  }

  uiSelect() {
    ensureBaseStyles();
    this.addClass("nq-input");
    return this;
  }

  uiCheckboxGroup() {
    ensureBaseStyles();
    this.addClass("nq-card");
    return this;
  }

  uiList() {
    ensureBaseStyles();
    return this;
  }

  // ----- Virtual List -----
  uiVirtualList(store, renderItem, opts = {}) {
    ensureBaseStyles();
    const container = this.nodes[0];
    assert(container, "uiVirtualList requires container");
    const rowHeight = opts.rowHeight ?? 40;
    let data = store.data?.value || [];
    const viewport = _doc.createElement("div");
    const spacer = _doc.createElement("div");
    viewport.style.position = "relative";
    spacer.style.height = `${data.length * rowHeight}px`;
    container.innerHTML = "";
    container.appendChild(viewport);
    container.appendChild(spacer);

    let scheduled = false;
    function renderWindow() {
      if (scheduled) return;
      scheduled = true;
      raf(() => {
        scheduled = false;
        const top = container.scrollTop;
        const height = container.clientHeight;
        const start = Math.floor(top / rowHeight);
        const end = Math.min(
          data.length,
          Math.ceil((top + height) / rowHeight) + (opts.overscan ?? 2)
        );
        viewport.innerHTML = "";
        for (let i = start; i < end; i++) {
          const y = i * rowHeight;
          const row = _doc.createElement("div");
          row.style.position = "absolute";
          row.style.left = "0";
          row.style.right = "0";
          row.style.top = `${y}px`;
          row.style.height = `${rowHeight}px`;
          const html = renderItem(data[i], i);
          if (isStr(html)) row.innerHTML = html;
          else if (html?.nodeType) row.appendChild(html);
          viewport.appendChild(row);
        }
      });
    }

    container.addEventListener("scroll", renderWindow);
    store.subscribe?.(() => {
      data = store.data?.value || [];
      spacer.style.height = `${data.length * rowHeight}px`;
      renderWindow();
    });
    renderWindow();
    return this;
  }

  // ----- Toasts -----
  uiToast(opts = {}) {
    ensureBaseStyles();
    ensureToastContainer(opts.position);
    return this;
  }

  // ----- Modal & Sheet -----
  uiModal(options = {}) {
    ensureBaseStyles();
    const el = this.nodes[0];
    assert(el, "uiModal needs an element");

    let backdrop = el.closest(".nq-modal-backdrop");
    let modalEl;
    if (!backdrop) {
      backdrop = _doc.createElement("div");
      backdrop.className = "nq-modal-backdrop";
      modalEl = _doc.createElement("div");
      modalEl.className = "nq-modal";
      modalEl.setAttribute("role", "dialog");
      modalEl.setAttribute("aria-modal", "true");
      modalEl.tabIndex = -1;
      modalEl.appendChild(el);
      backdrop.appendChild(modalEl);
      _doc.body.appendChild(backdrop);
    } else {
      modalEl = backdrop.querySelector(".nq-modal");
    }

    const focusableSelector =
      "a, button, input, textarea, select, [tabindex]:not([tabindex='-1'])";

    let open = false;
    const api = {
      isOpen: () => open,
      open(data) {
        if (open) return;
        open = true;
        backdrop.style.display = "flex";
        lockBodyScroll();
        raf(() => modalEl.focus());
        el.dispatchEvent(
          new CustomEvent("nq:modalOpen", { detail: data })
        );
        _doc.addEventListener("keydown", escHandler);
      },
      close(reason) {
        if (!open) return;
        open = false;
        backdrop.style.display = "none";
        unlockBodyScroll();
        _doc.removeEventListener("keydown", escHandler);
        el.dispatchEvent(
          new CustomEvent("nq:modalClose", { detail: reason })
        );
      },
      toggle() {
        open ? api.close("toggle") : api.open();
      }
    };

    function escHandler(e) {
      if (e.key === "Escape" && options.escapeToClose !== false) {
        api.close("esc");
      }
    }

    // backdrop click
    backdrop.addEventListener("mousedown", e => {
      if (
        e.target === backdrop &&
        options.backdropToClose !== false
      ) {
        api.close("backdrop");
      }
    });

    // focus trap
    a11y.focusTrap(modalEl);

    this._modal = api;
    return api;
  }

  uiSheet(options = { side: "right" }) {
    const api = this.uiModal(options);
    const el = this.nodes[0];
    const backdrop = el.closest(".nq-modal-backdrop");
    const modalEl = backdrop.querySelector(".nq-modal");
    modalEl.classList.add("nq-modal--sheet");
    if (options.side === "left") {
      modalEl.style.marginRight = "auto";
      modalEl.style.marginLeft = "0";
    } else {
      modalEl.style.marginLeft = "auto";
      modalEl.style.marginRight = "0";
    }
    return api;
  }

  // ----- Tabs -----
  uiTabs(opts = {}) {
    ensureBaseStyles();
    const root = this.nodes[0];
    assert(root, "uiTabs requires root element");
    root.classList.add("nq-tabs");
    const tablist =
      root.querySelector("[data-tablist]") ||
      root.querySelector(".nq-tablist") ||
      root.children[0];
    tablist.classList.add("nq-tablist");
    tablist.setAttribute("role", "tablist");
    let tabs = Array.from(tablist.querySelectorAll("[data-tab]"));
    if (!tabs.length) tabs = Array.from(tablist.children);
    let panels = Array.from(root.querySelectorAll("[data-panel]"));

    const activate = index => {
      tabs.forEach((t, idx) => {
        t.setAttribute("aria-selected", idx === index ? "true" : "false");
        t.tabIndex = idx === index ? 0 : -1;
      });
      panels.forEach((p, idx) => {
        p.style.display = idx === index ? "block" : "none";
      });
      opts.onChange?.(index);
    };

    tabs.forEach((t, i) => {
      t.classList.add("nq-tab");
      t.setAttribute("role", "tab");
      if (!t.id) t.id = uid("tab");
      const panel = panels[i];
      if (panel) {
        if (!panel.id) panel.id = uid("panel");
        t.setAttribute("aria-controls", panel.id);
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-labelledby", t.id);
      }
      t.tabIndex = i === 0 ? 0 : -1;
      t.setAttribute("aria-selected", i === 0 ? "true" : "false");
      t.addEventListener("click", () => activate(i));
      t.addEventListener("keydown", e => {
        const cur = tabs.indexOf(_doc.activeElement);
        if (e.key === "ArrowRight") {
          e.preventDefault();
          const ni = (cur + 1) % tabs.length;
          if (opts.activation === "automatic") activate(ni);
          tabs[ni].focus();
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          const ni = (cur - 1 + tabs.length) % tabs.length;
          if (opts.activation === "automatic") activate(ni);
          tabs[ni].focus();
        }
        if (e.key === "Home") {
          e.preventDefault();
          if (opts.activation === "automatic") activate(0);
          tabs[0].focus();
        }
        if (e.key === "End") {
          e.preventDefault();
          if (opts.activation === "automatic") activate(tabs.length - 1);
          tabs[tabs.length - 1].focus();
        }
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const idx = tabs.indexOf(t);
          activate(idx);
        }
      });
    });

    activate(0);
    return this;
  }

  // ----- Accordion -----
  uiAccordion(opts = { multi: false }) {
    ensureBaseStyles();
    const root = this.nodes[0];
    assert(root, "uiAccordion requires root");
    const items = Array.from(root.querySelectorAll("[data-accordion-item]"));
    items.forEach((it, idx) => {
      it.classList.add("nq-accordion-item");
      const hdr = it.querySelector("[data-accordion-header]");
      const pnl = it.querySelector("[data-accordion-panel]");
      hdr.classList.add("nq-accordion-header");
      pnl.classList.add("nq-accordion-panel");
      hdr.tabIndex = 0;
      pnl.setAttribute("aria-hidden", "true");
      hdr.addEventListener("click", () => toggle(idx));
      hdr.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle(idx);
        }
      });
    });

    const toggle = i => {
      items.forEach((it, idx) => {
        const hdr = it.querySelector("[data-accordion-header]");
        const pnl = it.querySelector("[data-accordion-panel]");
        if (idx === i) {
          const open = pnl.getAttribute("aria-hidden") === "false";
          pnl.setAttribute("aria-hidden", open ? "true" : "false");
          opts.onToggle?.(idx, !open, it);
          if (!open) opts.onOpen?.(idx, it);
          else opts.onClose?.(idx, it);
        } else if (!opts.multi) {
          const wasOpen = pnl.getAttribute("aria-hidden") === "false";
          pnl.setAttribute("aria-hidden", "true");
          if (wasOpen) opts.onClose?.(idx, it);
        }
      });
    };

    return this;
  }

  // ----- Async Button -----
  uiAsyncButton(asyncFn, options = {}) {
    ensureBaseStyles();
    const el = this.nodes[0];
    assert(
      el && isFn(asyncFn),
      "uiAsyncButton requires an element and async function"
    );
    this.uiButton(options.variant || "primary");
    let busy = false;
    const originalText = el.textContent;
    const setBusy = (b, label) => {
      busy = b;
      el.setAttribute("aria-busy", b ? "true" : "false");
      el.disabled = b;
      el.textContent = b
        ? options.loadingText || "Working…"
        : label ?? originalText;
    };
    this.on("click", async e => {
      if (busy) return;
      try {
        setBusy(true);
        await asyncFn(e);
        attention(el, "success");
        if (options.successText) {
          el.textContent = options.successText;
          setTimeout(() => (el.textContent = originalText), 1200);
        }
      } catch (err) {
        attention(el, "error");
        nq.toast.error(
          options.errorText || err?.message || "Something went wrong"
        );
      } finally {
        setBusy(false);
      }
    });
    return this;
  }

  // ----- Forms -----
  uiForm(config) {
    ensureBaseStyles();
    const form = this.nodes[0];
    assert(form?.tagName === "FORM", "uiForm must be applied to a <form>");
    const schema = config.schema || {};
    const fields = Array.from(
      form.querySelectorAll("input,select,textarea")
    );
    const errors = {};
    const values = {};
    const touched = {};
    const dirty = {};
    let submitCount = 0;

    const setError = (name, msg) => {
      const field = form.querySelector(
        `[name="${cssEscape(name)}"]`
      );
      const fieldWrapper =
        field?.closest("[data-field]") || field?.parentElement || form;
      let errEl =
        fieldWrapper.querySelector(".nq-error") ||
        fieldWrapper.querySelector('[data-role="error"]');
      if (!errEl) {
        errEl = _doc.createElement("div");
        errEl.className = "nq-error";
        fieldWrapper.appendChild(errEl);
      }
      errEl.textContent = msg || "";
      if (field) {
        if (msg) {
          field.setAttribute("aria-invalid", "true");
          const id = `${field.name}-error`;
          errEl.id = id;
          field.setAttribute("aria-describedby", id);
        } else {
          field.removeAttribute("aria-invalid");
          const desc = field.getAttribute("aria-describedby") || "";
          if (desc === `${field.name}-error`)
            field.removeAttribute("aria-describedby");
        }
      }
    };

    const getValues = () => {
      const v = {};
      fields.forEach(f => {
        if (!f.name) return;
        if (f.type === "checkbox") {
          if (f.hasAttribute("value")) {
            // checkbox group
            const group = form.querySelectorAll(
              `input[type="checkbox"][name="${cssEscape(f.name)}"]`
            );
            v[f.name] = Array.from(group)
              .filter(x => x.checked)
              .map(x => x.value);
          } else {
            v[f.name] = f.checked;
          }
        } else if (f.type === "radio") {
          if (f.checked) v[f.name] = f.value;
        } else {
          v[f.name] = f.value;
        }
      });
      return v;
    };

    const checkRule = (name, rule, val) => {
      if (!rule) return null;
      if (rule.required && (val == null || val === "" || (Array.isArray(val) && !val.length))) {
        return rule.messages?.required || "This field is required.";
      }
      if (val != null && val !== "" && rule.type === "number") {
        const num = Number(val);
        if (Number.isNaN(num)) return rule.messages?.type || "Enter a valid number.";
        if (rule.min != null && num < rule.min)
          return rule.messages?.min || `Minimum is ${rule.min}.`;
        if (rule.max != null && num > rule.max)
          return rule.messages?.max || `Maximum is ${rule.max}.`;
      } else {
        if (rule.min != null && (val?.length || 0) < rule.min)
          return (
            rule.messages?.min ||
            `Minimum ${rule.min} ${rule.type === "number" ? "value" : "characters"}.`
          );
        if (rule.max != null && (val?.length || 0) > rule.max)
          return (
            rule.messages?.max ||
            `Maximum ${rule.max} ${rule.type === "number" ? "value" : "characters"}.`
          );
      }
      if (rule.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val))) {
        return rule.messages?.email || "Enter a valid email.";
      }
      if (rule.pattern && !new RegExp(rule.pattern).test(String(val))) {
        return rule.messages?.pattern || "Invalid format.";
      }
      if (rule.validate) {
        const r = rule.validate(val, values, { touched, dirty });
        if (isStr(r)) return r;
        if (r === false) return rule.messages?.validate || "Invalid value.";
      }
      return null;
    };

    const validate = () => {
      Object.keys(schema).forEach(name => {
        const rule = schema[name];
        const v = (values[name] = getValues()[name]);
        const msg = checkRule(name, rule, v);
        errors[name] = msg;
        setError(name, msg);
      });
      const firstErrorName = Object.keys(errors).find(n => errors[n]);
      if (firstErrorName) {
        const field = form.querySelector(
          `[name="${cssEscape(firstErrorName)}"]`
        );
        field?.focus();
      }
      return {
        ok: !firstErrorName,
        errors: { ...errors },
        values: { ...values },
        touched: { ...touched },
        dirty: { ...dirty },
        submitCount
      };
    };

    const reset = () => {
      form.reset();
      Object.keys(errors).forEach(name => setError(name, null));
      Object.keys(touched).forEach(k => delete touched[k]);
      Object.keys(dirty).forEach(k => delete dirty[k]);
      submitCount = 0;
    };

    const setValues = partial => {
      for (const k in partial) {
        const field = form.querySelector(
          `[name="${cssEscape(k)}"]`
        );
        if (!field) continue;
        if (field.type === "checkbox") {
          if (Array.isArray(partial[k])) {
            const group = form.querySelectorAll(
              `input[type="checkbox"][name="${cssEscape(k)}"]`
            );
            group.forEach(f => {
              f.checked = partial[k].includes(f.value);
            });
          } else {
            field.checked = !!partial[k];
          }
        } else {
          field.value = partial[k];
        }
      }
    };

    const setErrors = errs => {
      for (const k in errs) setError(k, errs[k]);
    };

    const mode = config.mode || "onSubmit";
    if (mode === "onChange") {
      form.addEventListener("input", e => {
        if (!e.target?.name) return;
        dirty[e.target.name] = true;
        validate();
      });
    }
    if (mode === "onBlur") {
      form.addEventListener(
        "blur",
        e => {
          if (!e.target?.name) return;
          touched[e.target.name] = true;
          validate();
        },
        true
      );
    }

    form.addEventListener("submit", async e => {
      e.preventDefault();
      submitCount++;
      const result = validate();
      if (!result.ok) return;
      try {
        await config.onSubmit?.(getValues(), {
          success: m => nq.toast.success(m),
          error: m => nq.toast.error(m)
        });
      } catch (err) {
        nq.toast.error(err?.message || "Submit failed");
      }
    });

    return {
      reset,
      validate,
      getValues,
      setValues,
      setErrors,
      get state() {
        return {
          values: { ...values },
          errors: { ...errors },
          touched: { ...touched },
          dirty: { ...dirty },
          submitCount
        };
      }
    };
  }

  // ----- Layout -----
  uiStack(opts = { gap: "md", align: "stretch" }) {
    ensureBaseStyles();
    this.css({
      display: "flex",
      flexDirection: "column",
      gap: token("space", opts.gap || "md"),
      alignItems: mapAlign(opts.align)
    });
    return this;
  }

  uiCluster(opts = { gap: "sm", align: "center", wrap: true }) {
    ensureBaseStyles();
    this.css({
      display: "flex",
      flexWrap: opts.wrap ? "wrap" : "nowrap",
      gap: token("space", opts.gap || "sm"),
      alignItems: mapAlign(opts.align)
    });
    return this;
  }

  uiSidebar(opts = { min: 260, max: 360, gap: "md" }) {
    ensureBaseStyles();
    this.css({
      display: "grid",
      gridTemplateColumns: `minmax(${opts.min}px, ${opts.max}px) 1fr`,
      gap: token("space", opts.gap || "md")
    });
    return this;
  }

  uiResponsiveLayout(config) {
    ensureBaseStyles();
    const root = this.nodes[0];
    assert(root, "uiResponsiveLayout needs a root");
    if (typeof ResizeObserver === "undefined") return this;
    const apply = () => {
      const w = _win.innerWidth;
      let mode = "desktop";
      if (w < 640) mode = "mobile";
      else if (w < 1024) mode = "tablet";
      const pattern = config[mode];
      if (pattern === "stack") {
        root.style.display = "flex";
        root.style.flexDirection = "column";
        root.style.gap = token("space", "md");
      } else if (pattern === "sidebar-left") {
        root.style.display = "grid";
        root.style.gridTemplateColumns = "300px 1fr";
        root.style.gap = token("space", "md");
      } else if (pattern === "sidebar-right") {
        root.style.display = "grid";
        root.style.gridTemplateColumns = "1fr 300px";
        root.style.gap = token("space", "md");
      }
    };
    const ro = new ResizeObserver(() => apply());
    ro.observe(_doc.documentElement);
    apply();
    return this;
  }

  // ----- Motion -----
  uiMotion(presetOrOpts) {
    ensureBaseStyles();
    const el = this.nodes[0];
    const opts = isStr(presetOrOpts)
      ? presetToMotion(presetOrOpts)
      : presetOrOpts;
    applyMotion(el, opts);
    return this;
  }

  // ----- A11y helpers -----
  uiFocusRing() {
    ensureBaseStyles();
    this.css({
      outline: `2px solid ${defaultTokens.color.primary}`,
      outlineOffset: "2px"
    });
    return this;
  }

  uiFocusable(opts = {}) {
    ensureBaseStyles();
    this.attr("role", opts.role || "button").attr("tabindex", 0);
    this.on("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.trigger("click");
      }
    });
    return this;
  }
}

// ----- Global Plugins -----
nq.plugin = (name, factory) => {
  assert(isStr(name) && isFn(factory), "plugin(name, factory) required");
  const fn = function (options, helpers) {
    return factory(this, options || {}, {
      tokens: nq._config.tokens,
      motion: nq._config.motion,
      a11y,
      devtools: nq.devtools
    });
  };
  NQObject.prototype[name] = function (options) {
    return fn.call(this, options);
  };
};

// ----- Binding to Queries UI helper -----
NQObject.prototype.uiLoadable = function (store, options = {}) {
  ensureBaseStyles();
  const el = this.nodes[0];
  assert(el, "uiLoadable needs a container");
  const render = () => {
    const st = store.status.value;
    if (st === "loading") {
      el.innerHTML = `<div class="nq-skeleton" style="height:${options.skeletonHeight || "16px"}"></div>`;
    } else if (st === "error") {
      el.innerHTML = `<div class="nq-card"><div>${
        options.errorText || "Failed to load."
      }</div><button class="nq-btn">Retry</button></div>`;
      el
        .querySelector("button")
        .addEventListener("click", () => store.refetch(true));
    } else if (st === "success") {
      if (options.showUpdated !== false) {
        const tag = _doc.createElement("div");
        tag.style.fontSize = "12px";
        tag.style.color = defaultTokens.color.textMute;
        tag.style.marginTop = "6px";
        tag.textContent = options.updatedLabel || "Updated now";
        el.appendChild(tag);
        setTimeout(() => tag.remove(), 800);
      }
    }
  };
  render();
  store.subscribe(() => render());
  return this;
};

// ------------------------------
// Modal body scroll lock
// ------------------------------
let bodyLockCount = 0;
function lockBodyScroll() {
  if (!_doc) return;
  bodyLockCount++;
  if (bodyLockCount === 1) {
    _doc.body.dataset.nqScrollLock = "true";
    _doc.body.style.overflow = "hidden";
  }
}
function unlockBodyScroll() {
  if (!_doc) return;
  bodyLockCount = Math.max(0, bodyLockCount - 1);
  if (bodyLockCount === 0) {
    delete _doc.body.dataset.nqScrollLock;
    _doc.body.style.overflow = "";
  }
}

// ------------------------------
// Toast API
// ------------------------------
nq.toast = {
  success(m, o) {
    makeToast(m, "success", o);
  },
  error(m, o) {
    makeToast(m, "error", o);
  },
  info(m, o) {
    makeToast(m, "info", o);
  },
  position(pos) {
    ensureToastContainer(pos);
  }
};

// ------------------------------
// Public reactive APIs
// ------------------------------
nq.signal = signal;
nq.computed = computed;
nq.store = store;
nq.effect = effect;
nq.queryClient = defaultQueryClient;
nq.query = createQuery;
nq.mutation = createMutation;

// ------------------------------
// Bootstrap: styles, toast, binding GC, UX lint
// ------------------------------
$.ready(() => {
  if (nq._config.injectStyles) ensureBaseStyles();
  ensureToastContainer();
  startBindingGC();
});

// UX lint default in dev, off in production
if (
  typeof process !== "undefined" &&
  process.env &&
  process.env.NODE_ENV === "production"
) {
  nq.devtools.disableUXLint();
} else {
  nq.devtools.enableUXLint();
}

// ------------------------------
// Exported Globals
// ------------------------------
// $(), $.ready, $.config, $.plugin, $.signal, $.query, $.mutation, $.store, $.computed
// Collection: text, html, attr, addClass, removeClass, toggleClass, css, show, hide, toggle,
// val, data, find, closest, parents, siblings, append, prepend, before, after, remove,
// on, off, once, trigger, bindText, bindAttr, bindClass, bindList,
// uiCard, uiButton, uiInput, uiSelect, uiCheckboxGroup, uiList, uiVirtualList,
// uiToast, uiModal, uiSheet, uiTabs, uiAccordion,
// uiAsyncButton, uiForm,
// uiStack, uiCluster, uiSidebar, uiResponsiveLayout,
// uiMotion, uiFocusRing, uiFocusable
// Globals: toast.success/error/info, motion.setDefaults, devtools.enableUXLint/disableUXLint/highlightIssue

export default nq;
export { nq as $, signal as createSignal, createQuery as query, createMutation };
