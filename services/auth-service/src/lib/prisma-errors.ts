import { Prisma } from "../generated/prisma/client.js";

export function formatPrismaError(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2021") {
      return (
        "Database tables are missing. Run migrations: " +
        "cd services/auth-service && npx prisma migrate deploy"
      );
    }
    return `Database error (${err.code}): ${err.message}`;
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    if (/Can't reach database|ECONNREFUSED|ENOTFOUND/i.test(err.message)) {
      return (
        "Cannot connect to the database. Start Postgres with " +
        "`docker compose up -d db` and check DATABASE_URL in .env."
      );
    }
    return `Database connection failed: ${err.message}`;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return "Invalid database query. Ensure Prisma client is generated (npx prisma generate).";
  }

  if (err instanceof Error) {
    if (/Invalid `prisma\./i.test(err.message) && /does not exist/i.test(err.message)) {
      return (
        "Database tables are missing. Run migrations: " +
        "cd services/auth-service && npx prisma migrate deploy"
      );
    }
    return err.message;
  }

  return "Unexpected database error";
}

export function isPrismaError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientValidationError ||
    (err instanceof Error && /Invalid `prisma\./i.test(err.message))
  );
}
