require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const request = require("supertest");
const prisma = require("../db/prisma");
let agent;
let csrfToken;
const { app, server } = require("../app");

beforeAll(async () => {
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  agent = request.agent(app);
});

afterAll(async () => {
  await prisma.$disconnect();
  server.close();
});

describe("register a user", () => {
  let saveRes = null;

  it("46. it creates the user entry", async () => {
    const newUser = {
      name: "John Deere",
      email: "jdeere@example.com",
      password: "Pa$$word20",
    };
    saveRes = await agent.post("/api/users/register").send(newUser);
    expect(saveRes.status).toBe(201);
  });

  it("47. Registration returns an object with the expected name.", () => {
    expect(saveRes.body.user.name).toBe("John Deere");
  });

  it("48. Returned object includes a csrfToken.", () => {
    csrfToken = saveRes.body.csrfToken;
    expect(csrfToken).toBeDefined();
  });

  it("49. You can logon as the newly registered user.", async () => {
    const res = await agent.post("/api/users/logon").send({
      email: "jdeere@example.com",
      password: "Pa$$word20",
    });
    csrfToken = res.body.csrfToken;
    expect(res.status).toBe(200);
  });

  it("50. Verify that you are logged in: /api/tasks should not return a 401", async () => {
    const res = await agent.get("/api/tasks");
    expect(res.status).not.toBe(401);
  });

  it("51. Verify that you can log out.", async () => {
    const res = await agent
      .post("/api/users/logoff")
      .set("X-CSRF-TOKEN", csrfToken);
    expect(res.status).toBe(200);
  });

  it("52. Make sure that you are really logged out: /api/tasks should now return a 401", async () => {
    const res = await agent.get("/api/tasks");
    expect(res.status).toBe(401);
  });
});
