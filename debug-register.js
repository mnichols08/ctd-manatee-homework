const prisma = require("./db/prisma");

(async () => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: "Mike Temp",
          email: `mike-temp-${Date.now()}@test.com`,
          hashedPassword: "salt:hash"
        },
        select: { id: true, email: true, name: true }
      });

      await tx.task.createMany({
        data: [
          { title: "Complete your profile", userId: user.id, priority: "medium" },
          { title: "Add your first task", userId: user.id, priority: "high" },
          { title: "Explore the app", userId: user.id, priority: "low" }
        ]
      });

      return user;
    });

    console.log("transaction ok", result);
  } catch (e) {
    console.error("transaction failed");
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
