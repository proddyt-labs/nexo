/**
 * Script de importação dos vaults locais → Nexo
 * Uso: node import-vaults.mjs [--clean]
 *  --clean : apaga todas as notas/coleções existentes dos vaults antes de importar
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, extname } from "path";

const API   = "http://localhost:3200/api";
const CLEAN = process.argv.includes("--clean");

const VAULTS = [
  {
    name: "Pessoal",
    path: "/home/proddyt/Documentos/secondbrain main",
    wsId: "64bf2f3d-0930-48b4-be13-e156936e27b1",
  },
  {
    name: "CTI",
    path: "/home/proddyt/Documentos/CTI/secondbrain CTI",
    wsId: "4e10fe1c-0028-4060-b691-9b17f4992587",
  },
  {
    name: "Innovation",
    path: "/home/proddyt/Documentos/innovations/secondbrain Innovation",
    wsId: "4f3543f1-756d-4039-a84d-154488a2b99a",
  },
  {
    name: "Zopone",
    path: "/home/proddyt/Documentos/Estagio/secondbrain Zopone",
    wsId: "506ba674-cdac-4a5b-8230-d33989fca5f7",
  },
];

async function login() {
  const r = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: "proddyt", password: "nexo123" }),
  });
  const d = await r.json();
  if (!d.token) throw new Error("Login falhou: " + JSON.stringify(d));
  return d.token;
}

function collectMd(dir, base = dir) {
  const results = [];
  try {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith(".")) continue;
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) results.push(...collectMd(full, base));
      else if (extname(entry) === ".md") results.push({ full, rel: relative(base, full) });
    }
  } catch { /* dir may not exist */ }
  return results;
}

async function cleanVault(wsId, token) {
  // Delete all notes
  const notesRes = await fetch(`${API}/workspaces/${wsId}/notes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const notes = await notesRes.json();
  if (Array.isArray(notes)) {
    for (const n of notes) {
      await fetch(`${API}/workspaces/${wsId}/notes/${n.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    console.log(`    🗑  ${notes.length} notas removidas`);
  }
  // Delete all collections
  const colRes = await fetch(`${API}/workspaces/${wsId}/collections`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const cols = await colRes.json();
  if (Array.isArray(cols)) {
    for (const c of cols) {
      await fetch(`${API}/workspaces/${wsId}/collections/${c.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    console.log(`    🗑  ${cols.length} coleções removidas`);
  }
}

async function importVault(vault, token) {
  const mdFiles = collectMd(vault.path);
  if (!mdFiles.length) { console.log(`  ⚠️  nenhum .md encontrado`); return; }

  const BATCH = 40;
  let totalImported = 0, totalCols = 0;

  for (let i = 0; i < mdFiles.length; i += BATCH) {
    const batch = mdFiles.slice(i, i + BATCH).map(({ full, rel }) => ({
      path:    rel,
      content: readFileSync(full, "utf-8"),
    }));

    const r = await fetch(`${API}/workspaces/${vault.wsId}/import-json`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ files: batch }),
    });

    const data = await r.json();
    if (!r.ok) { console.error(`    ✗ Lote ${Math.floor(i/BATCH)+1}:`, data); continue; }
    totalImported += data.imported ?? 0;
    totalCols     += data.collections ?? 0;
    process.stdout.write(`    lote ${Math.floor(i/BATCH)+1}/${Math.ceil(mdFiles.length/BATCH)} ✓\r`);
  }

  console.log(`  ✓ ${totalImported} notas · ${totalCols} coleções (${mdFiles.length} arquivos)   `);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
console.log("🔐 Autenticando...");
const token = await login();
console.log("✓ Token OK\n");

for (const vault of VAULTS) {
  console.log(`📦 ${vault.name}`);
  if (CLEAN) {
    console.log(`  🧹 Limpando vault...`);
    await cleanVault(vault.wsId, token);
  }
  await importVault(vault, token);
}

console.log("\n✅ Concluído! Acesse http://localhost:5173");
