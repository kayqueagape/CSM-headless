import "reflect-metadata";
import request from "supertest";
import { createApp } from "../../src/infrastructure/http/app";
import { setupContainer } from "../../src/infrastructure/container";
import { Application } from "express";

let app: Application;

beforeAll(async () => {
  process.env["DB_DRIVER"] = "in-memory";
  process.env["JWT_SECRET"] = "test-secret-key-for-integration-tests-32ch";
  process.env["NODE_ENV"] = "test";

  await setupContainer();
  app = createApp();
});

describe("Auth Flow", () => {
  const credentials = {
    name: "Test Author",
    email: `test.${Date.now()}@example.com`,
    password: "StrongPass123!",
  };

  let authToken: string;

  it("POST /auth/register — should register a new author", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send(credentials)
      .expect(201);

    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.author.email).toBe(credentials.email);
    expect(res.body.data.author.role).toBe("AUTHOR");

    authToken = res.body.data.token as string;
  });

  it("POST /auth/register — should reject duplicate email", async () => {
    await request(app)
      .post("/api/v1/auth/register")
      .send(credentials)
      .expect(409);
  });

  it("POST /auth/login — should login with valid credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);

    expect(res.body.data.token).toBeDefined();
  });

  it("POST /auth/login — should reject invalid password", async () => {
    await request(app)
      .post("/api/v1/auth/login")
      .send({ email: credentials.email, password: "WrongPassword" })
      .expect(401);
  });

  it("GET /auth/me — should return current user", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.data.email).toBe(credentials.email);
  });

  it("GET /auth/me — should reject missing token", async () => {
    await request(app).get("/api/v1/auth/me").expect(401);
  });
});

describe("Content CRUD Flow", () => {
  let token: string;
  let contentId: string;

  // Register and get token
  beforeAll(async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Content Author",
        email: `content.${Date.now()}@test.com`,
        password: "StrongPass123!",
      });
    token = res.body.data.token as string;
  });

  it("POST /contents — should create content", async () => {
    const res = await request(app)
      .post("/api/v1/contents")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Meu Primeiro Artigo",
        body: "Este é o corpo do artigo com conteúdo suficiente.",
        tags: ["typescript", "clean-architecture"],
      })
      .expect(201);

    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe("DRAFT");
    expect(res.body.data.slug).toBe("meu-primeiro-artigo");
    expect(res.body.data.tags).toContain("typescript");

    contentId = res.body.data.id as string;
  });

  it("POST /contents — should reject without auth", async () => {
    await request(app)
      .post("/api/v1/contents")
      .send({ title: "Title", body: "Body" })
      .expect(401);
  });

  it("POST /contents — should reject invalid body", async () => {
    await request(app)
      .post("/api/v1/contents")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Ti" }) // title too short, body missing
      .expect(422);
  });

  it("GET /contents/:id — should return content", async () => {
    const res = await request(app)
      .get(`/api/v1/contents/${contentId}`)
      .expect(200);

    expect(res.body.data.id).toBe(contentId);
    expect(res.body.data.title).toBe("Meu Primeiro Artigo");
  });

  it("GET /contents/:id — should return 404 for nonexistent content", async () => {
    await request(app)
      .get("/api/v1/contents/00000000-0000-0000-0000-000000000000")
      .expect(404);
  });

  it("PATCH /contents/:id — should update content", async () => {
    const res = await request(app)
      .patch(`/api/v1/contents/${contentId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Título Atualizado" })
      .expect(200);

    expect(res.body.data.title).toBe("Título Atualizado");
  });

  it("POST /contents/:id/publish — should publish content", async () => {
    const res = await request(app)
      .post(`/api/v1/contents/${contentId}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.status).toBe("PUBLISHED");
    expect(res.body.data.publishedAt).toBeDefined();
  });

  it("GET /contents — should list contents with pagination", async () => {
    const res = await request(app)
      .get("/api/v1/contents?page=1&limit=10")
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
  });

  it("GET /contents?status=PUBLISHED — should filter by status", async () => {
    const res = await request(app)
      .get("/api/v1/contents?status=PUBLISHED")
      .expect(200);

    const allPublished = res.body.data.every(
      (c: { status: string }) => c.status === "PUBLISHED"
    );
    expect(allPublished).toBe(true);
  });

  it("DELETE /contents/:id — should reject deleting published content as non-admin", async () => {
    // Non-admin cannot delete published content
    await request(app)
      .delete(`/api/v1/contents/${contentId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("GET /health — should return health check", async () => {
    const res = await request(app).get("/api/v1/health").expect(200);
    expect(res.body.status).toBe("ok");
  });
});
