-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundMember" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "invitedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fund" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT,
    "initialVnd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "initialCapital" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "additionalCapital" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "withdrawnCapital" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retainedEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "earnInterestMethod" TEXT NOT NULL DEFAULT 'reduce_avg_price',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "platform" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "accountId" TEXT,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "fee" DOUBLE PRECISION,
    "feeCurrency" TEXT,
    "fromLocation" TEXT,
    "toLocation" TEXT,
    "note" TEXT,
    "costBasis" DOUBLE PRECISION,
    "realizedPnL" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetHolding" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "accountId" TEXT,
    "asset" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "avgPrice" DOUBLE PRECISION,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetHolding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fee" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "transactionId" TEXT,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FundMember_fundId_userId_key" ON "FundMember"("fundId", "userId");

-- AddForeignKey
ALTER TABLE "FundMember" ADD CONSTRAINT "FundMember_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundMember" ADD CONSTRAINT "FundMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fund" ADD CONSTRAINT "Fund_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetHolding" ADD CONSTRAINT "AssetHolding_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetHolding" ADD CONSTRAINT "AssetHolding_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fee" ADD CONSTRAINT "Fee_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
