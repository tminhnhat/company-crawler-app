import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  let dbUrl = process.env.DATABASE_URL || 'file:./dev.db';

  // Handling Vercel Serverless environment where root filesystem is read-only
  if (process.env.VERCEL) {
    const tmpDbPath = path.join('/tmp', 'dev.db');
    const localDbPath = path.join(process.cwd(), 'prisma', 'dev.db');

    try {
      if (!fs.existsSync(tmpDbPath)) {
        if (fs.existsSync(localDbPath)) {
          fs.copyFileSync(localDbPath, tmpDbPath);
        } else {
          fs.writeFileSync(tmpDbPath, '');
        }
      }
      dbUrl = `file:${tmpDbPath}`;
    } catch (e) {
      console.warn('Vercel /tmp DB initialization warning:', e);
    }
  }

  const client = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl
      }
    },
    log: ['error']
  });

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client;

  return client;
}

export const prisma = getPrismaClient();
