# 🏛️ CMS Headless

---

## 🏗️ Arquitetura

```
src/
├── domain/                     ← Núcleo da aplicação (zero dependências externas)
│   ├── entities/               ← Aggregates & Entities
│   │   ├── Content.ts          ← Aggregate Root principal
│   │   ├── Author.ts           ← Aggregate Root de usuários
│   │   └── Category.ts
│   ├── value-objects/          ← Value Objects imutáveis
│   │   ├── ContentSlug.ts      ← Garante slugs sempre válidos
│   │   ├── ContentStatus.ts    ← Enum + regras de transição
│   │   └── Email.ts
│   ├── repositories/           ← Interfaces (Ports) — contratos sem implementação
│   │   ├── IContentRepository.ts
│   │   ├── IAuthorRepository.ts
│   │   └── ICategoryRepository.ts
│   └── errors/
│       └── DomainError.ts      ← Hierarquia de erros do domínio
│
├── application/                ← Casos de uso (orquestra o domínio)
│   ├── use-cases/
│   │   ├── content/
│   │   │   ├── CreateContentUseCase.ts
│   │   │   └── ContentUseCases.ts   ← Get, List, Update, Publish, Delete
│   │   └── auth/
│   │       └── AuthUseCases.ts      ← Register, Login
│   ├── dtos/                   ← Zod schemas + TypeScript types
│   ├── mappers/                ← Entity → DTO
│   └── ports/
│       └── services.ts         ← IHashService, ITokenService, ILogger
│
└── infrastructure/             ← Detalhes de implementação (plugável)
    ├── database/
    │   ├── in-memory/          ← Para testes e dev sem banco
    │   ├── postgres/           ← Implementação PostgreSQL
    │   └── mongodb/            ← Implementação MongoDB
    ├── http/
    │   ├── app.ts              ← Express configurado
    │   ├── controllers/        ← Thin controllers (só orquestram)
    │   ├── middlewares/        ← Auth, Validation, Error handling
    │   └── routes/
    ├── services/               ← Bcrypt, JWT, Winston
    ├── container/              ← Injeção de dependência (tsyringe)
    └── config/
        └── env.ts              ← Validação de variáveis de ambiente (Zod)
```

### Princípios Aplicados

| Princípio | Como foi aplicado |
|-----------|------------------|
| **Dependency Inversion** | Domínio define interfaces; infra implementa |
| **Single Responsibility** | Cada classe tem exatamente uma razão para mudar |
| **Open/Closed** | Novo banco? Implemente a interface e registre no container |
| **Aggregate Root** | `Content` e `Author` protegem seus invariantes |
| **Value Objects** | `Email`, `ContentSlug`, `ContentStatus` — imutáveis e auto-validados |
| **Repository Pattern** | Abstração completa de persistência |
| **Factory Methods** | `.create()` vs `.reconstitute()` — criação explícita vs hidratação |

---

## 🔄 Trocar de Banco Sem Tocar em Nada

Esta é a prova do desacoplamento. Para trocar o banco de dados, basta mudar **uma variável de ambiente**:

```bash
# PostgreSQL
DB_DRIVER=postgres

# MongoDB
DB_DRIVER=mongodb

# In-Memory (testes, dev)
DB_DRIVER=in-memory
```

**O domínio e os casos de uso não sabem qual banco está sendo usado.** O container de DI seleciona a implementação correta em tempo de inicialização.

---

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 20+
- Docker & Docker Compose (opcional)

### 1. Instalação

```bash
git clone https://github.com/seu-usuario/cms-headless.git
cd cms-headless
npm install
cp .env.example .env
```

### 2. Modo mais simples (sem banco de dados)

```bash
# DB_DRIVER=in-memory — roda direto, sem configurar banco
npm run dev
```

### 3. Com Docker (PostgreSQL + MongoDB)

```bash
docker-compose up -d
npm run dev
```

### 4. Servidor disponível

```
http://localhost:3000/api/v1
```

---

## 📡 Endpoints da API

### Auth

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/auth/register` | Registrar novo autor |
| `POST` | `/auth/login` | Login e obter JWT |
| `GET` | `/auth/me` | Perfil do usuário logado |

### Conteúdo

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `GET` | `/contents` | — | Listar com filtros e paginação |
| `GET` | `/contents/:id` | — | Buscar por ID |
| `GET` | `/contents/slug/:slug` | — | Buscar por slug |
| `POST` | `/contents` | ✅ | Criar conteúdo |
| `PATCH` | `/contents/:id` | ✅ | Atualizar conteúdo |
| `POST` | `/contents/:id/publish` | ✅ | Publicar |
| `DELETE` | `/contents/:id` | ✅ | Deletar |

### Exemplos com cURL

```bash
# Registrar
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Dev Silva","email":"dev@example.com","password":"MinhaSenh@123"}'

# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"MinhaSenh@123"}' \
  | jq -r '.data.token')

# Criar conteúdo
curl -X POST http://localhost:3000/api/v1/contents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Arquitetura Limpa com TypeScript",
    "body": "Neste artigo vamos explorar...",
    "tags": ["typescript", "clean-architecture", "ddd"]
  }'

# Listar com filtros
curl "http://localhost:3000/api/v1/contents?status=PUBLISHED&page=1&limit=10"
```

---

## 🧪 Testes

```bash
# Todos os testes com coverage
npm test

# Apenas unitários (sem dependências externas)
npm run test:unit

# Integração (usa in-memory por padrão)
npm run test:integration

# Verificação de tipos
npm run typecheck
```

### Estrutura de Testes

```
tests/
├── unit/
│   ├── domain/
│   │   ├── Content.spec.ts          ← Regras de negócio da entidade
│   │   ├── Author.spec.ts           ← Regras de negócio do autor
│   │   └── ValueObjects.spec.ts     ← Email, Slug, Status
│   └── application/
│       ├── ContentUseCases.spec.ts  ← Use cases com mocks
│       └── InMemoryRepository.spec.ts
├── integration/
│   └── content.integration.spec.ts  ← Fluxo HTTP completo (sem banco real)
└── setup.ts
```

---

## 🔁 CI/CD (GitHub Actions)

O pipeline `.github/workflows/ci-cd.yml` possui 7 jobs:

```
push/PR
  └─► 🔍 Quality Gate (typecheck + lint)
        └─► 🧪 Unit Tests (coverage + PR comment)
              └─► 🔗 Integration Tests (Postgres + MongoDB em paralelo)
              └─► 🏗️  Build TypeScript
                    └─► 🐳 Docker (build + push → ghcr.io)
                          └─► 🚀 Deploy Staging  (branch: develop)
                                └─► 🏭 Deploy Production (branch: main)
```

**Diferenciais do pipeline:**
- Testa contra PostgreSQL **e** MongoDB em paralelo nos testes de integração
- Build multi-stage Docker com cache (`type=gha`)
- Multi-platform: `linux/amd64` + `linux/arm64`
- Coverage report comentado automaticamente em PRs
- Deploy com environment protection (aprovação manual em produção)

---

## 🐳 Docker

```bash
# Build da imagem
docker build -t cms-headless .

# Rodar com PostgreSQL
docker run -p 3000:3000 \
  -e DB_DRIVER=postgres \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=seu-segredo-aqui \
  cms-headless
```

---

## 📁 Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `DB_DRIVER` | `in-memory` | `postgres` \| `mongodb` \| `in-memory` |
| `DATABASE_URL` | — | Connection string PostgreSQL |
| `MONGODB_URI` | — | Connection string MongoDB |
| `JWT_SECRET` | — | **Obrigatório em prod** (mín. 32 chars) |
| `JWT_EXPIRES_IN` | `7d` | Expiração do token |
| `PORT` | `3000` | Porta do servidor |
| `RATE_LIMIT_MAX` | `100` | Requests por janela |

---