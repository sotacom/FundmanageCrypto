#!/bin/bash

# Script to find and replace all toLocaleString() in page.tsx with formatNumber()

cd "/Users/sotacom/Downloads/workspace-6d2fcc32-1433-4b63-9a99-77c481efc748 (1)"

# Replace patterns
sed -i '' 's/fundData\.holdings\.usdt\.toLocaleString()/formatNumber(fundData.holdings.usdt, 2)/g' src/app/page.tsx
sed -i '' 's/fundData\.avgPrices\.usdt\.avgPrice\.toLocaleString()/formatNumber(fundData.avgPrices.usdt.avgPrice, 0)/g' src/app/page.tsx
sed -i '' 's/fundData\.avgPrices\.btc\.avgPrice\.toLocaleString()/formatNumber(fundData.avgPrices.btc.avgPrice, 2)/g' src/app/page.tsx
sed -i '' 's/(fundData\.holdings\.vnd\/ fundData\.avgPrices\.usdt\.avgPrice)\.toLocaleString()/formatNumber(fundData.holdings.vnd \/ fundData.avgPrices.usdt.avgPrice, 2)/g' src/app/page.tsx
sed -i '' 's/(fundData\.holdings\.btc \* fundData\.avgPrices\.btc\.avgPrice)\.toLocaleString()/formatNumber(fundData.holdings.btc * fundData.avgPrices.btc.avgPrice, 2)/g' src/app/page.tsx
sed -i '' 's/fundData\.currentNav\.usdt\.toLocaleString()/formatNumber(fundData.currentNav.usdt, 2)/g' src/app/page.tsx
sed -i '' 's/fundData\.avgPrices\.usdt\.totalBought\.toLocaleString()/formatNumber(fundData.avgPrices.usdt.totalBought, 2)/g' src/app/page.tsx
sed -i '' 's/fundData\.avgPrices\.usdt\.totalEarn\.toLocaleString()/formatNumber(fundData.avgPrices.usdt.totalEarn, 2)/g' src/app/page.tsx
sed -i '' 's/currentPrices?\.usdtVnd\.toLocaleString()/formatNumber(currentPrices?.usdtVnd || 0, 0)/g' src/app/page.tsx
sed -i '' 's/fundData\.avgPrices\.btc\.totalSpent\.toLocaleString()/formatNumber(fundData.avgPrices.btc.totalSpent, 2)/g' src/app/page.tsx
sed -i '' 's/currentPrices?\.btcUsdt\.toLocaleString()/formatNumber(currentPrices?.btcUsdt || 0, 2)/g' src/app/page.tsx

echo "✅ Replaced all toLocaleString() with formatNumber()"
