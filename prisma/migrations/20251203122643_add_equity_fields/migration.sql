-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Fund" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "initialVnd" REAL NOT NULL DEFAULT 0,
    "initialCapital" REAL NOT NULL DEFAULT 0,
    "additionalCapital" REAL NOT NULL DEFAULT 0,
    "withdrawnCapital" REAL NOT NULL DEFAULT 0,
    "retainedEarnings" REAL NOT NULL DEFAULT 0,
    "earnInterestMethod" TEXT NOT NULL DEFAULT 'reduce_avg_price',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Fund" ("createdAt", "description", "earnInterestMethod", "id", "initialVnd", "name", "updatedAt") SELECT "createdAt", "description", "earnInterestMethod", "id", "initialVnd", "name", "updatedAt" FROM "Fund";
DROP TABLE "Fund";
ALTER TABLE "new_Fund" RENAME TO "Fund";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
