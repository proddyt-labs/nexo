<div align="center">
  <h1>📚 Nexo</h1>
  <p>Second brain colaborativo — notas, coleções, kanban e grafo de conhecimento</p>

  ![Vue 3](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vuedotjs&logoColor=white)
  ![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
  ![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
</div>

---

## ✨ Features

- **Notas ricas** com TipTap (markdown, formatação completa)
- **Coleções hierárquicas** — organize por pastas/projetos
- **Grafo de conhecimento** — visualize conexões entre notas
- **Kanban de tarefas** — gerencie tasks por workspace
- **Nota diária** — captura rápida com data automática
- **Multi-workspace** (vaults) com roles: OWNER · ADMIN · MEMBER · VIEWER
- **Import/Export** — importe vaults do Obsidian (.md) e exporte para ZIP
- **Real-time** — colaboração via Socket.io
- **Tags** — categorize e filtre notas

## 🏗 Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Vue 3 + Vite + TailwindCSS + TipTap |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Banco | PostgreSQL 16 |
| Real-time | Socket.io |
| Auth | JWT |

## 🚀 Desenvolvimento local

### Pré-requisitos
- Node.js 20+
- Docker (para PostgreSQL)

### Setup

```bash
# Clone
git clone https://github.com/Proddy-0/nexo.git
cd nexo

# Banco de dados
docker run -d --name nexo-dev-db \
  -e POSTGRES_USER=nexo \
  -e POSTGRES_PASSWORD=nexo_pass \
  -e POSTGRES_DB=nexo \
  -p 5433:5432 postgres:16-alpine

# Backend
cd backend
cp ../.env.example .env   # ajuste DATABASE_URL se necessário
npm install
npx prisma migrate dev
npm run dev               # porta 3200

# Frontend (novo terminal)
cd frontend
npm install
npm run dev               # porta 5173
```

Acesse: http://localhost:5173

### Importar vault Obsidian

```bash
# Na raiz do projeto
node import-vaults.mjs          # importa
node import-vaults.mjs --clean  # limpa e reimporta
```

## 🐳 Deploy (Docker)

```bash
# Copie e ajuste as variáveis
cp .env.example .env.prod

# Suba com docker compose
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

As imagens são publicadas automaticamente no GHCR via GitHub Actions a cada push na `main`.

## 📁 Estrutura

```
nexo/
├── backend/
│   ├── src/
│   │   ├── routes/       # auth, workspaces, notes, collections, tasks...
│   │   ├── middleware/
│   │   └── lib/
│   └── prisma/
│       └── schema.prisma
├── frontend/
│   └── src/
│       ├── views/        # NoteEditor, GraphView, KanbanView...
│       ├── components/
│       ├── stores/       # Pinia (auth, workspace)
│       └── router/
├── .github/workflows/
├── import-vaults.mjs     # script de importação Obsidian
└── docker-compose.prod.yml
```

## 📄 Licença

MIT © [Proddy-0](https://github.com/Proddy-0)
