type Env = {
  DB?: D1Database;
  thevault?: D1Database;
};

type PagesContext = {
  env: Env;
};

function getD1(env: Env): D1Database | undefined {
  return env.DB || env.thevault;
}

export const onRequestGet = async (context: PagesContext) => {
  const db = getD1(context.env);

  if (!db) {
    return Response.json({ ok: false, error: "D1 binding missing" }, { status: 500 });
  }

  try {
    const result = await db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name LIMIT 100")
      .all();

    return Response.json({ ok: true, tables: result.results ?? [] });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "D1 query failed",
      },
      { status: 500 },
    );
  }
};
