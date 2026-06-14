require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL; // point to the test database!
const { EventEmitter } = require("events");
const httpMocks = require("node-mocks-http");
const prisma = require("../db/prisma");
const waitForRouteHandlerCompletion = require("./waitForRouteHandlerCompletion");
const { bulkUpdate, bulkDelete } = require("../controllers/taskController");

let user1 = null;
let user2 = null;
let user1TaskIds = [];
let user2TaskIds = [];

async function seedTasks(userId, titles) {
  const created = [];
  for (const title of titles) {
    const t = await prisma.task.create({
      data: { title, userId, priority: "medium" },
      select: { id: true },
    });
    created.push(t.id);
  }
  return created;
}

beforeAll(async () => {
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();

  user1 = await prisma.user.create({
    data: {
      name: "BulkBob",
      email: "bulkbob@sample.com",
      hashedPassword: "nonsense",
    },
  });
  user2 = await prisma.user.create({
    data: {
      name: "BulkAlice",
      email: "bulkalice@sample.com",
      hashedPassword: "nonsense",
    },
  });

  user1TaskIds = await seedTasks(user1.id, [
    "bulk task one",
    "bulk task two",
    "bulk task three",
    "bulk task four",
  ]);
  user2TaskIds = await seedTasks(user2.id, [
    "other user task one",
    "other user task two",
  ]);
});

afterAll(async () => {
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe("bulkUpdate validation", () => {
  it("rejects a missing ids array with 400", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      body: { data: { isCompleted: true } },
    });
    req.user = { id: user1.id };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(bulkUpdate, req, res);
    expect(res.statusCode).toBe(400);
  });

  it("rejects an empty ids array with 400", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      body: { ids: [], data: { isCompleted: true } },
    });
    req.user = { id: user1.id };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(bulkUpdate, req, res);
    expect(res.statusCode).toBe(400);
  });

  it("rejects non-integer ids with 400", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      body: { ids: ["abc"], data: { isCompleted: true } },
    });
    req.user = { id: user1.id };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(bulkUpdate, req, res);
    expect(res.statusCode).toBe(400);
  });

  it("rejects an empty data object with 400", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      body: { ids: user1TaskIds.slice(0, 1), data: {} },
    });
    req.user = { id: user1.id };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(bulkUpdate, req, res);
    expect(res.statusCode).toBe(400);
  });
});

describe("bulkUpdate behavior", () => {
  it("updates only the caller's own tasks", async () => {
    const idsToUpdate = [...user1TaskIds.slice(0, 2), ...user2TaskIds];
    const req = httpMocks.createRequest({
      method: "PATCH",
      body: { ids: idsToUpdate, data: { isCompleted: true } },
    });
    req.user = { id: user1.id };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(bulkUpdate, req, res);

    expect(res.statusCode).toBe(200);
    const body = res._getJSONData();
    expect(body.tasksUpdated).toBe(2);
    expect(body.totalRequested).toBe(idsToUpdate.length);

    // verify user2's tasks were NOT touched
    const otherUserTasks = await prisma.task.findMany({
      where: { id: { in: user2TaskIds } },
      select: { isCompleted: true },
    });
    expect(otherUserTasks.every((t) => t.isCompleted === false)).toBe(true);

    // verify user1's first two tasks were updated
    const updated = await prisma.task.findMany({
      where: { id: { in: user1TaskIds.slice(0, 2) } },
      select: { isCompleted: true },
    });
    expect(updated.every((t) => t.isCompleted === true)).toBe(true);
  });

  it("returns count 0 when none of the ids belong to the caller", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      body: { ids: user2TaskIds, data: { priority: "high" } },
    });
    req.user = { id: user1.id };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(bulkUpdate, req, res);

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData().tasksUpdated).toBe(0);
  });
});

describe("bulkDelete validation", () => {
  it("rejects a missing ids array with 400", async () => {
    const req = httpMocks.createRequest({ method: "DELETE", body: {} });
    req.user = { id: user1.id };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(bulkDelete, req, res);
    expect(res.statusCode).toBe(400);
  });
});

describe("bulkDelete behavior", () => {
  it("does not delete tasks belonging to other users", async () => {
    const req = httpMocks.createRequest({
      method: "DELETE",
      body: { ids: user2TaskIds },
    });
    req.user = { id: user1.id };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(bulkDelete, req, res);

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData().tasksDeleted).toBe(0);

    const stillThere = await prisma.task.count({
      where: { id: { in: user2TaskIds } },
    });
    expect(stillThere).toBe(user2TaskIds.length);
  });

  it("deletes the caller's tasks that match the provided ids", async () => {
    const idsToDelete = user1TaskIds.slice(2); // last two of user1
    const req = httpMocks.createRequest({
      method: "DELETE",
      body: { ids: [...idsToDelete, ...user2TaskIds] },
    });
    req.user = { id: user1.id };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(bulkDelete, req, res);

    expect(res.statusCode).toBe(200);
    const body = res._getJSONData();
    expect(body.tasksDeleted).toBe(idsToDelete.length);

    const remaining = await prisma.task.count({
      where: { id: { in: idsToDelete } },
    });
    expect(remaining).toBe(0);

    // user2's tasks should still exist
    const otherUserCount = await prisma.task.count({
      where: { id: { in: user2TaskIds } },
    });
    expect(otherUserCount).toBe(user2TaskIds.length);
  });
});
