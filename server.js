const http = require("node:http");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT || 3000);

const users = [
  { role: "Super administrateur plateforme", email: "superadmin@sentinelle.local", password: "Sentinelle2026!", name: "Nora Plateforme" },
  { role: "Administrateur entreprise", email: "admin@ops.example", password: "Sentinelle2026!", name: "Claire Martin" },
  { role: "Contrôleur qualité", email: "controleur@ops.example", password: "Sentinelle2026!", name: "Yanis Benali" },
  { role: "Agent", email: "agent@ops.example", password: "Sentinelle2026!", name: "Lucas Morel" },
  { role: "Chef d’entreprise", email: "direction@ops.example", password: "Sentinelle2026!", name: "Sophie Dumont" },
  { role: "Client", email: "client@intermarche.example", password: "Sentinelle2026!", name: "Hugo Lefevre" }
];

const data = {
  stats: [
    ["Contrôles réalisés", "61", "+14 ce mois"],
    ["Note moyenne", "86 %", "+7 pts depuis janvier"],
    ["Non-conformités ouvertes", "9", "2 échéances < 48h"],
    ["Documents expirants", "12", "Alerte à 4 mois active"]
  ],
  controls: [
    ["21/05/2026 23:15", "Inopiné", "Intermarché Glisy - Galerie", "Lucas Morel", "Validé", "88 %"],
    ["18/05/2026 09:30", "Programmé", "Logiparc Amiens - Entrepôt A", "Marc Vidal", "En attente QCM", "72 %"]
  ],
  nonConformities: [
    ["Main courante incomplète", "Majeure", "En cours", "Lucas Morel", "Intermarché Glisy - Galerie", "48h"],
    ["SST expirant bientôt", "Mineure", "Ouverte", "Marc Vidal", "Logiparc Amiens - Entrepôt A", "7 jours"]
  ],
  documents: [
    ["Carte professionnelle Lucas Morel", "Carte professionnelle", "Valide", "30/09/2026"],
    ["SST Marc Vidal", "SST", "Expirant bientôt", "31/05/2026"],
    ["Consignes site - Galerie Glisy", "Consignes site", "Valide", "Non applicable"]
  ],
  qcm: [
    ["QCM OPS - Qualité et comportement", "OPS", "x1", "88 %"],
    ["QCM ligne métier APS", "Ligne métier", "x2", "79 %"],
    ["QCM client - Intermarché Glisy", "Client", "x3", "92 %"]
  ]
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    ...headers
  });
  res.end(body);
}

function json(res, status, body, headers = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function table(headers, rows) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;
}

function html() {
  const credentialButtons = users
    .map(
      (user) =>
        `<button class="demo-account" data-email="${user.email}"><span>${user.role}</span><strong>${user.email}</strong></button>`
    )
    .join("");

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>SENTINELLE - Démo locale</title>
  <style>
    :root { color-scheme: light; --bg:#f7faf9; --ink:#111722; --muted:#5d6878; --line:#dce3ea; --panel:#fff; --brand:#147768; --brand2:#22a58f; --danger:#991b1b; --amber:#b45309; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:var(--bg); color:var(--ink); }
    .login { min-height:100vh; display:grid; grid-template-columns:1fr 440px; }
    .hero { background:#111722; color:white; padding:48px; display:flex; flex-direction:column; justify-content:space-between; gap:48px; }
    .brand { display:flex; align-items:center; gap:14px; font-weight:800; letter-spacing:0; }
    .logo { width:44px; height:44px; border-radius:10px; background:var(--brand2); display:grid; place-items:center; }
    .logo svg { width:24px; height:24px; }
    h1 { margin:0; font-size:42px; line-height:1.08; max-width:820px; letter-spacing:0; }
    .hero p { color:#c8d2df; line-height:1.7; max-width:720px; }
    .login-panel { display:flex; align-items:center; justify-content:center; padding:28px; }
    .card { border:1px solid var(--line); background:var(--panel); border-radius:8px; box-shadow:0 18px 50px rgba(15,23,42,.08); }
    .form-card { width:100%; max-width:360px; padding:24px; }
    label { display:block; font-size:12px; font-weight:800; color:var(--muted); text-transform:uppercase; margin:16px 0 8px; }
    input, select, textarea { width:100%; height:44px; border:1px solid var(--line); border-radius:8px; padding:0 12px; font:inherit; }
    textarea { height:90px; padding-top:10px; }
    button { border:0; border-radius:8px; height:42px; padding:0 14px; font-weight:750; cursor:pointer; }
    .primary { background:var(--brand); color:white; width:100%; margin-top:18px; }
    .secondary { background:white; border:1px solid var(--line); color:var(--ink); }
    .demo-account { width:100%; height:auto; display:flex; justify-content:space-between; gap:12px; background:#f3f6f8; margin-top:8px; padding:10px; text-align:left; }
    .demo-account strong { color:var(--muted); font-size:12px; font-weight:650; }
    .app { display:none; min-height:100vh; grid-template-columns:280px 1fr; }
    aside { background:#111722; color:white; padding:18px; }
    nav { margin-top:24px; display:grid; gap:6px; }
    nav button { text-align:left; background:transparent; color:#c8d2df; width:100%; }
    nav button.active, nav button:hover { background:rgba(34,165,143,.18); color:white; }
    main { padding:24px; }
    header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:24px; }
    .eyebrow { font-size:12px; font-weight:850; color:var(--brand); text-transform:uppercase; }
    h2 { margin:6px 0; font-size:28px; letter-spacing:0; }
    .subtitle { color:var(--muted); line-height:1.6; margin:0; max-width:900px; }
    .stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin:22px 0; }
    .stat { padding:18px; }
    .stat span { color:var(--muted); font-size:13px; }
    .stat strong { display:block; font-size:28px; margin-top:8px; }
    .stat em { display:block; font-style:normal; margin-top:8px; color:var(--brand); font-size:12px; font-weight:800; }
    .grid { display:grid; grid-template-columns:1.25fr .75fr; gap:16px; }
    section { margin-top:18px; }
    section h3 { margin:0 0 12px; font-size:17px; }
    .table-wrap { overflow:auto; border:1px solid var(--line); border-radius:8px; background:white; }
    table { width:100%; border-collapse:collapse; font-size:14px; min-width:720px; }
    th { text-align:left; font-size:12px; text-transform:uppercase; color:var(--muted); background:#f3f6f8; }
    th, td { padding:13px 14px; border-bottom:1px solid #edf1f4; }
    tr:last-child td { border-bottom:0; }
    .pill { display:inline-flex; align-items:center; border-radius:999px; padding:5px 9px; font-size:12px; font-weight:800; background:#edf7f4; color:#116556; }
    .warn { background:#fff7ed; color:var(--amber); }
    .crit { background:#fee2e2; color:var(--danger); }
    .panel { padding:18px; }
    .modules { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
    .module { padding:16px; }
    .module p { color:var(--muted); line-height:1.55; margin-bottom:0; }
    .form-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
    .score { display:flex; align-items:center; gap:12px; margin:12px 0; }
    .bar { height:8px; flex:1; background:#edf1f4; border-radius:999px; overflow:hidden; }
    .bar span { display:block; height:100%; background:var(--brand2); }
    .status { margin-top:12px; color:var(--brand); font-weight:800; }
    .hidden { display:none; }
    @media (max-width: 980px) { .login { grid-template-columns:1fr; } .app { grid-template-columns:1fr; } aside { position:static; } .stats, .grid, .modules, .form-grid { grid-template-columns:1fr; } h1 { font-size:32px; } }
  </style>
</head>
<body>
  <div class="login" id="login">
    <section class="hero">
      <div class="brand"><span class="logo"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3 20 7v5c0 5.3-3.2 8.6-8 10-4.8-1.4-8-4.7-8-10V7l8-4Z" fill="currentColor"/></svg></span><div>SENTINELLE<br><small>Qualité & conformité</small></div></div>
      <div><p class="eyebrow">Démo locale sans dépendances</p><h1>Contrôle qualité, conformité CNAPS, audit terrain et pilotage opérationnel.</h1><p>Cette page confirme que le serveur local fonctionne. Le projet Next.js complet est dans le dossier et se lance avec npm dès que les dépendances sont installées.</p></div>
      <p>Mode sombre, PWA, RBAC, multi-entreprise, rapports PDF, QCM, documentaire et synchronisation hors ligne sont prévus dans le socle applicatif.</p>
    </section>
    <section class="login-panel">
      <div class="card form-card">
        <h2>Connexion</h2>
        <p class="subtitle">Compte de démonstration</p>
        <form id="loginForm">
          <label>Email</label><input id="email" value="admin@ops.example" autocomplete="email" />
          <label>Mot de passe</label><input id="password" type="password" value="Sentinelle2026!" autocomplete="current-password" />
          <button class="primary">Se connecter</button>
        </form>
        <div style="margin-top:18px">${credentialButtons}</div>
      </div>
    </section>
  </div>
  <div class="app" id="app">
    <aside>
      <div class="brand"><span class="logo">✓</span><div>SENTINELLE<br><small id="userRole">Administration</small></div></div>
      <nav id="nav">
        ${["Tableau de bord","Contrôles","Non-conformités","QCM agents","Documents","Planning","Rapports","Statistiques","Administration"].map((item, index) => `<button data-view="${index}" class="${index === 0 ? "active" : ""}">${item}</button>`).join("")}
      </nav>
    </aside>
    <main>
      <header>
        <div><p class="eyebrow">SENTINELLE</p><h2 id="title">Tableau de bord</h2><p class="subtitle" id="subtitle">Vue entreprise, alertes qualité, conformité documentaire et activité terrain.</p></div>
        <button class="secondary" id="logout">Déconnexion</button>
      </header>
      <div id="content"></div>
    </main>
  </div>
  <script>
    const data = ${JSON.stringify(data)};
    const users = ${JSON.stringify(users.map(({ password, ...user }) => user))};
    const views = [
      ["Tableau de bord", "Vue entreprise, alertes qualité, conformité documentaire et activité terrain."],
      ["Contrôles qualité", "Contrôles programmés ou inopinés avec notes, preuves, signatures et géolocalisation."],
      ["Non-conformités", "Workflow de validation, notification maîtrisée, levée et clôture."],
      ["QCM agents", "QCM OPS, ligne métier et client, coefficients et historique agent."],
      ["Documents", "Documents agents, entreprise, clients, sites et consignes avec alertes d'expiration."],
      ["Planning", "Demandes de contrôle sur plage de dates et horaires."],
      ["Rapports", "Rapports PDF complets internes et simplifiés client."],
      ["Statistiques", "Indicateurs qualité, QCM, documents, activité et exports."],
      ["Administration", "Entreprises, utilisateurs, rôles, items, coefficients, alertes et modèles."]
    ];
    function rows(headers, rows) {
      return '<div class="table-wrap"><table><thead><tr>' + headers.map(h => '<th>'+h+'</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => '<td>'+c+'</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
    }
    function stats() {
      return '<div class="stats">' + data.stats.map(s => '<div class="card stat"><span>'+s[0]+'</span><strong>'+s[1]+'</strong><em>'+s[2]+'</em></div>').join('') + '</div>';
    }
    function render(view) {
      document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', Number(b.dataset.view) === view));
      title.textContent = views[view][0]; subtitle.textContent = views[view][1];
      if (view === 0) content.innerHTML = stats() + '<div class="grid"><section><h3>Contrôles récents</h3>'+rows(["Date","Type","Site","Agent","Statut","Note"], data.controls)+'</section><section><h3>Priorités</h3><div class="card panel"><p><span class="pill">CNAPS</span></p><p>Documents expirants, main courante et QCM client à suivre.</p><div class="score"><strong>Qualité</strong><div class="bar"><span style="width:86%"></span></div><strong>86 %</strong></div></div></section></div>';
      if (view === 1) content.innerHTML = stats() + '<section><h3>Historique des contrôles</h3>'+rows(["Date","Type","Site","Agent","Statut","Note"], data.controls)+'</section><section><h3>Nouveau contrôle terrain</h3><div class="card panel"><div class="form-grid"><input value="Intermarché Glisy - Galerie"><input value="Lucas Morel"><input value="Contrôle inopiné"></div><label>Observations</label><textarea>Agent présent, poste tenu, consigne à relire.</textarea><button class="primary" onclick="document.querySelector(\\'.status\\').textContent=\\'Contrôle enregistré en mode démonstration.\\'">Enregistrer le contrôle</button><p class="status"></p></div></section>';
      if (view === 2) content.innerHTML = '<section><h3>Registre</h3>'+rows(["Titre","Gravité","Statut","Agent","Site","Délai"], data.nonConformities)+'</section>';
      if (view === 3) content.innerHTML = '<section><h3>Bibliothèque QCM</h3>'+rows(["Titre","Type","Coefficient","Score moyen"], data.qcm)+'</section>';
      if (view === 4) content.innerHTML = '<section><h3>Registre documentaire</h3>'+rows(["Document","Catégorie","Statut","Échéance"], data.documents)+'</section>';
      if (view === 5) content.innerHTML = '<div class="card panel"><h3>Demande de contrôle</h3><div class="form-grid"><input value="05/06/2026 - 12/06/2026"><input value="20h - 2h"><input value="Intermarché Glisy"></div><button class="primary">Planifier</button></div>';
      if (view === 6) content.innerHTML = '<div class="modules"><div class="card module"><h3>Rapport complet interne</h3><p>Détails du contrôle, non-conformités, preuves, signatures, QCM et historique.</p></div><div class="card module"><h3>Rapport simplifié client</h3><p>Sans sanctions, données RH sensibles ni commentaires internes.</p></div><div class="card module"><h3>Export PDF</h3><p>Endpoint PDF prêt dans le projet Next.js.</p></div></div>';
      if (view === 7) content.innerHTML = stats() + '<section><h3>Exports</h3><div class="card panel"><button class="secondary" onclick="location.href=\\'/api/exports/csv\\'">Télécharger CSV</button></div></section>';
      if (view === 8) content.innerHTML = '<div class="modules"><div class="card module"><h3>Utilisateurs & rôles</h3><p>Super admin, admin entreprise, contrôleur, agent, direction, client.</p></div><div class="card module"><h3>Items personnalisables</h3><p>Coefficient, gravité, couleur, délai, preuve obligatoire et visibilité client.</p></div><div class="card module"><h3>Sécurité</h3><p>Séparation par entreprise, journal d’activité et contrôle d’accès fichiers.</p></div></div>';
    }
    document.querySelectorAll('.demo-account').forEach(b => b.onclick = () => { email.value = b.dataset.email; password.value = 'Sentinelle2026!'; });
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      const res = await fetch('/api/auth/login', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ email:email.value, password:password.value }) });
      if (!res.ok) return alert('Identifiants invalides');
      const body = await res.json();
      login.style.display = 'none'; app.style.display = 'grid'; userRole.textContent = body.user.role; render(0);
    };
    logout.onclick = () => { app.style.display='none'; login.style.display='grid'; };
    nav.onclick = (e) => { if (e.target.matches('button')) render(Number(e.target.dataset.view)); };
  </script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/") return send(res, 200, html());
  if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/api/health") return json(res, 200, { ok: true, app: "SENTINELLE", mode: "demo-server" });
  if (req.method === "GET" && url.pathname === "/api/bootstrap") return json(res, 200, data);
  if (req.method === "GET" && url.pathname === "/api/exports/csv") {
    const csv = ["date,type,site,agent,statut,note", ...data.controls.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))].join("\n");
    res.writeHead(200, { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="sentinelle-demo.csv"' });
    return res.end(csv);
  }
  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const user = users.find((candidate) => candidate.email === body.email && candidate.password === body.password);
    if (!user) return json(res, 401, { error: "Email ou mot de passe incorrect" });
    return json(res, 200, { user: { email: user.email, name: user.name, role: user.role } }, { "set-cookie": `sentinelle_demo=${encodeURIComponent(user.email)}; Path=/; SameSite=Lax` });
  }
  if (req.method === "POST" && url.pathname === "/api/auth/logout") return json(res, 200, { ok: true }, { "set-cookie": "sentinelle_demo=; Max-Age=0; Path=/" });

  return send(res, 404, "<h1>404</h1><p>Page introuvable.</p>");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`SENTINELLE demo locale: http://localhost:${PORT}`);
});
