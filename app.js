// app.js — nQuery marketing site + docs + playground
// This file assumes nquery.js sits next to index.html.

import nq from "./nquery.js";

/**
 * This site is a public marketing/docs/playground, not a dev sandbox.
 * Turn OFF heavy dev mode / UX lint to avoid MutationObserver + full-DOM scans
 * that can spike CPU/GPU on large pages.
 */
try {
  if (typeof nq.config === "function") {
    nq.config({ dev: false });
  }
  if (nq.devtools && typeof nq.devtools.disableUXLint === "function") {
    nq.devtools.disableUXLint();
  }
} catch (err) {
  // Non-fatal – if devtools aren't present, just continue.
}

/**
 * View switching (Website / Docs / Playground)
 */
function setupViews() {
  const views = {
    website: document.getElementById("view-website"),
    docs: document.getElementById("view-docs"),
    playground: document.getElementById("view-playground"),
  };

  const switches = Array.from(
    document.querySelectorAll("[data-view].js-view-switch")
  );

  const scrollTargets = {
    website: document.getElementById("hero"),
    docs: document.getElementById("docs"),
    playground: document.getElementById("playground"),
  };

  function setView(name) {
    Object.entries(views).forEach(([key, el]) => {
      if (!el) return;
      const active = key === name;
      el.hidden = !active;
      el.classList.toggle("view-active", active);
    });

    switches.forEach((el) => {
      const v = el.getAttribute("data-view");
      el.classList.toggle("is-active", v === name);
    });

    const target = scrollTargets[name];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  switches.forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const view = el.getAttribute("data-view");
      if (view) setView(view);
    });
  });

  // Default view: website
  setView("website");
}

/**
 * Docs live examples (counter + query list)
 */
function setupDocsExamples() {
  const counterCard = document.getElementById("doc-counter-card");
  const incBtn = document.getElementById("doc-inc");
  const decBtn = document.getElementById("doc-dec");
  const refetchBtn = document.getElementById("doc-refetch");
  const statusEl = document.getElementById("doc-query-status");
  const loadableEl = document.getElementById("doc-query-loadable");
  const listEl = document.getElementById("doc-query-list");

  // Counter demo
  if (counterCard && incBtn && decBtn) {
    const count = nq.signal(0);

    // Style the card
    nq(counterCard).uiCard({ elevateOnHover: true });

    // Manual reactive binding: "Count: X"
    const renderCount = (v) => {
      counterCard.textContent = `Count: ${v}`;
    };
    renderCount(count.value);
    count.subscribe(renderCount);

    nq(incBtn)
      .uiButton("primary")
      .on("click", () => count.update((n) => n + 1));

    nq(decBtn)
      .uiButton("ghost")
      .on("click", () => count.update((n) => (n > 0 ? n - 1 : 0)));
  }

  // Query + list demo
  if (refetchBtn && statusEl && loadableEl && listEl) {
    const demoTeam = [
      { id: 1, name: "Ada Lovelace", role: "Research" },
      { id: 2, name: "Alan Turing", role: "Security" },
      { id: 3, name: "Grace Hopper", role: "Compiler Engineering" },
      { id: 4, name: "Margaret Hamilton", role: "Flight Software" },
    ];

    const team = nq.query(
      "docs-team",
      async () => {
        // Simulated latency + occasional failure
        await new Promise((r) => setTimeout(r, 600));
        if (Math.random() < 0.12) {
          throw new Error("Random demo error — try again");
        }
        return demoTeam;
      },
      { initialFetch: true }
    );

    // Reactive status label
    nq(statusEl).bindText(() => `status: ${team.status.value}`);

    // List binding
    nq(listEl).bindList(
      team,
      (member) => `
        <div class="example-member">
          <div class="example-member-name">${member.name}</div>
          <div class="example-member-role">${member.role}</div>
        </div>
      `
    );

    // Loadable skeleton wrapper
    nq(loadableEl).uiLoadable(team, { skeletonHeight: "20px" });

    // Async refetch button
    nq(refetchBtn).uiAsyncButton(
      async () => {
        await team.refetch(true);
      },
      {
        loadingText: "Refetching…",
        successText: "Refreshed",
        errorText: "Could not refetch",
      }
    );
  }
}

/**
 * Playground
 * - Simple textarea-based editor
 * - Buttons for curated examples
 * - Executes user code in a sandbox function with (nq, root)
 */
function setupPlayground() {
  const editor = document.getElementById("pg-editor");
  const runBtn = document.getElementById("pg-run");
  const resetBtn = document.getElementById("pg-reset");
  const previewRoot = document.getElementById("pg-preview-root");
  const status = document.getElementById("pg-preview-status");
  const exampleButtons = Array.from(
    document.querySelectorAll("[data-example].playground-example-btn")
  );

  if (!editor || !runBtn || !resetBtn || !previewRoot || !status) return;

  const examples = {
    signals: `// Signals + bindings
const count = nq.signal(0);

root.innerHTML = \`
  <div class="demo-stack">
    <div id="pg-card" class="card demo-card">Count: 0</div>
    <div class="demo-row">
      <button id="pg-inc" class="btn-primary">+1</button>
      <button id="pg-dec" class="btn-secondary">-1</button>
    </div>
  </div>
\`;

// Style + behavior with nQuery
nq("#pg-card")
  .uiCard({ elevateOnHover: true })
  .uiMotion("slideInBottom");

// Manual reactive binding for "Count: X"
const render = (v) => {
  document.getElementById("pg-card").textContent = "Count: " + v;
};
render(count.value);
count.subscribe(render);

nq("#pg-inc")
  .uiButton("primary")
  .on("click", () => count.update((n) => n + 1));

nq("#pg-dec")
  .uiButton("ghost")
  .on("click", () => count.update((n) => Math.max(0, n - 1)));`,

    queries: `// Query store + list + uiLoadable
const users = nq.query("pg-users", async () => {
  await new Promise(r => setTimeout(r, 650));
  if (Math.random() < 0.15) {
    throw new Error("Random demo failure");
  }
  return [
    { id: 1, name: "Ada Lovelace", team: "Research" },
    { id: 2, name: "Alan Turing", team: "Security" },
    { id: 3, name: "Grace Hopper", team: "Compilers" },
    { id: 4, name: "Margaret Hamilton", team: "Flight Software" }
  ];
}, { initialFetch: true });

root.innerHTML = \`
  <div class="demo-stack">
    <div class="demo-row">
      <button id="pg-users-refetch" class="btn-primary">Refetch</button>
      <span id="pg-users-status" class="example-output">status: idle</span>
    </div>
    <div id="pg-users-loadable"></div>
    <div id="pg-users-list"></div>
  </div>
\`;

nq("#pg-users-status").bindText(() => "status: " + users.status.value);

nq("#pg-users-list").bindList(
  users,
  user => \`
    <div class="example-member">
      <div class="example-member-name">\${user.name}</div>
      <div class="example-member-role">\${user.team}</div>
    </div>
  \`
);

nq("#pg-users-loadable").uiLoadable(users, { skeletonHeight: "22px" });

nq("#pg-users-refetch").uiAsyncButton(
  async () => { await users.refetch(true); },
  {
    loadingText: "Refreshing…",
    successText: "Refreshed",
    errorText: "Could not refresh"
  }
);`,

    forms: `// Forms + validation + toasts
root.innerHTML = \`
  <form id="pg-form" class="pg-form">
    <div data-field>
      <label>Full name</label>
      <input name="name" placeholder="Ada Lovelace" />
      <div class="nq-error" aria-live="polite"></div>
    </div>
    <div data-field>
      <label>Email</label>
      <input name="email" type="email" placeholder="you@example.com" />
      <div class="nq-error" aria-live="polite"></div>
    </div>
    <div data-field>
      <label>Role</label>
      <select name="role">
        <option value="">Choose role</option>
        <option value="research">Research</option>
        <option value="product">Product</option>
        <option value="engineering">Engineering</option>
      </select>
      <div class="nq-error" aria-live="polite"></div>
    </div>
    <div class="demo-row">
      <button id="pg-form-submit" type="submit">Create account</button>
    </div>
  </form>
\`;

const api = nq("#pg-form").uiForm({
  mode: "onBlur",
  schema: {
    name:  { required: true, min: 3 },
    email: { required: true, email: true },
    role:  { required: true }
  },
  async onSubmit(values, ctx) {
    await new Promise(r => setTimeout(r, 700));
    ctx.success("Account created for " + values.name);
    nq.toast.success("Welcome, " + values.name + "!");
  }
});

nq("#pg-form-submit").uiAsyncButton(
  async () => {
    // Delegate to form submit
    await api.submit();
  },
  {
    loadingText: "Creating…",
    successText: "Created",
    errorText: "Fix validation errors"
  }
);`,
  };

  let currentExample = "signals";

  function setExample(name) {
    const src = examples[name] || "";
    currentExample = name;
    editor.value = src;
    status.textContent = "Ready. Click “Run code” to render this example.";
    previewRoot.innerHTML = "";

    exampleButtons.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.example === name);
    });
  }

  function runCurrent() {
    const code = editor.value;
    previewRoot.innerHTML = "";
    status.textContent = "Running…";

    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function("nq", "root", code);
      fn(nq, previewRoot);
      status.textContent = "Rendered successfully.";
    } catch (err) {
      console.error(err);
      status.textContent = "Error: " + (err && err.message ? err.message : err);
    }
  }

  exampleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.example;
      if (name) setExample(name);
    });
  });

  runBtn.addEventListener("click", (e) => {
    e.preventDefault();
    runCurrent();
  });

  resetBtn.addEventListener("click", (e) => {
    e.preventDefault();
    setExample(currentExample);
  });

  // Initial state
  setExample("signals");
}

/**
 * Wire everything once DOM + nQuery are ready.
 */
nq.ready(() => {
  setupViews();
  setupDocsExamples();
  setupPlayground();
});
