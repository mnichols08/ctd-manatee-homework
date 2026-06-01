const { StatusCodes } = require("http-status-codes");
const prisma = require("../db/prisma");

exports.getUserAnalytics = async (req, res, next) => {
  const userId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(userId)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid user ID" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found" });
    }

    const taskStats = await prisma.task.groupBy({
      by: ["isCompleted"],
      where: { userId },
      _count: { id: true },
    });

    const recentTasks = await prisma.task.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        userId: true,
        User: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyProgress = await prisma.task.groupBy({
      by: ["createdAt"],
      where: {
        userId,
        createdAt: { gte: oneWeekAgo },
      },
      _count: { id: true },
      orderBy: { createdAt: "asc" },
    });

    return res.status(StatusCodes.OK).json({
      taskStats,
      recentTasks,
      weeklyProgress,
    });
  } catch (err) {
    return next(err);
  }
};

exports.getUsersWithStats = async (req, res, next) => {
  const page = Number.parseInt(req.query.page, 10) || 1;
  const limit = Number.parseInt(req.query.limit, 10) || 10;

  if (page < 1 || limit < 1 || limit > 100) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      error: "Invalid pagination parameters. page must be >= 1 and limit must be 1-100.",
    });
  }

  const skip = (page - 1) * limit;

  try {
    const usersRaw = await prisma.user.findMany({
      include: {
        Task: {
          where: { isCompleted: false },
          select: { id: true },
          take: 5,
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            Task: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const users = usersRaw.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      _count: user._count,
      Task: user.Task,
    }));

    const totalUsers = await prisma.user.count();
    const pages = Math.ceil(totalUsers / limit);

    return res.status(StatusCodes.OK).json({
      users,
      pagination: {
        page,
        limit,
        total: totalUsers,
        pages,
        hasNext: page * limit < totalUsers,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    return next(err);
  }
};

exports.searchTasks = async (req, res, next) => {
  const searchQuery = req.query.q;

  if (!searchQuery || searchQuery.trim().length < 2) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      error: "Search query must be at least 2 characters long",
    });
  }

  const limit = Number.parseInt(req.query.limit, 10) || 20;
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  const searchPattern = `%${searchQuery}%`;
  const exactMatch = searchQuery;
  const startsWith = `${searchQuery}%`;

  try {
    const results = await prisma.$queryRaw`
      SELECT
        t.id,
        t.title,
        t.is_completed as "isCompleted",
        t.priority,
        t.created_at as "createdAt",
        t.user_id as "userId",
        u.name as "user_name"
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      WHERE t.title ILIKE ${searchPattern}
         OR u.name ILIKE ${searchPattern}
      ORDER BY
        CASE
          WHEN t.title ILIKE ${exactMatch} THEN 1
          WHEN t.title ILIKE ${startsWith} THEN 2
          WHEN t.title ILIKE ${searchPattern} THEN 3
          ELSE 4
        END,
        t.created_at DESC
      LIMIT ${safeLimit}
    `;

    return res.status(StatusCodes.OK).json({
      results,
      query: searchQuery,
      count: results.length,
    });
  } catch (err) {
    return next(err);
  }
};
