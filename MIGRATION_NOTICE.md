# ⚠️ IMPORTANT: Prisma Schema Migration Notice

## Schema Changed to Support PostgreSQL

The Prisma schema now includes comments and instructions for using **PostgreSQL (Supabase)** as an alternative to SQLite.

### What This Means

**Current Setup**: The schema is configured for **SQLite** by default (no changes needed for existing users).

**To use Supabase (PostgreSQL)**:

1. Open `prisma/schema.prisma`
2. Change line 18 from:
   ```prisma
   provider = "sqlite"
   ```
   to:
   ```prisma
   provider = "postgresql"
   ```
3. Update your `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
   ```
4. Regenerate Prisma client:
   ```bash
   npm run db:generate
   npm run db:push
   ```

### Database Provider Detection

Prisma now automatically detects the database provider from the `DATABASE_URL`:
- `file:./dev.db` → Uses SQLite
- `postgresql://...` → Uses PostgreSQL

No code changes needed when switching between databases!

### Next Steps

1. **For SQLite users**: Keep your `.env` as is (no changes needed)
2. **For Supabase users**: Follow the guide at [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md)

### Need Help?

See [docs/SUPABASE_QUICKREF.md](./docs/SUPABASE_QUICKREF.md) for quick commands.
