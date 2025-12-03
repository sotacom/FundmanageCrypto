#!/bin/bash

# Automated Test: Earn Interest Method Verification

echo "🧪 Testing Earn Interest Method Implementation"
echo "=============================================="
echo ""

# Get Fund ID
echo "1️⃣  Getting Fund ID..."
FUND_ID=$(curl -s -X POST http://localhost:3000/api/init | jq -r '.fundId')
echo "   Fund ID: $FUND_ID"
echo ""

# Get initial state
echo "2️⃣  Getting initial USDT avg price..."
INITIAL_NAV=$(curl -s "http://localhost:3000/api/nav?fundId=$FUND_ID")
INITIAL_AVG=$(echo $INITIAL_NAV | jq -r '.avgPrices.usdt.avgPrice')
INITIAL_AMOUNT=$(echo $INITIAL_NAV | jq -r '.avgPrices.usdt.totalBought')
INITIAL_EARN=$(echo $INITIAL_NAV | jq -r '.avgPrices.usdt.totalEarn')
echo "   Initial Avg Price: $INITIAL_AVG VND/USDT"
echo "   Total USDT Bought: $INITIAL_AMOUNT USDT"
echo "   Total Earn: $INITIAL_EARN USDT"
echo ""

# Test 1: Reduce Avg Price Method (Default)
echo "3️⃣  Testing Method 1: REDUCE AVG PRICE"
echo "   Setting method to reduce_avg_price..."
curl -s -X PUT http://localhost:3000/api/funds/settings \
  -H "Content-Type: application/json" \
  -d "{\"fundId\": \"$FUND_ID\", \"earnInterestMethod\": \"reduce_avg_price\"}" > /dev/null

# Add Earn Interest transaction
echo "   Adding 100 USDT from Earn Interest..."
EARN_TX=$(curl -s -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d "{
    \"fundId\": \"$FUND_ID\",
    \"type\": \"earn_interest\",
    \"amount\": 100,
    \"currency\": \"USDT\",
    \"toLocation\": \"Binance Earn\"
  }")

echo "   Transaction created: $(echo $EARN_TX | jq -r '.id')"
sleep 1

# Check new avg price
METHOD1_NAV=$(curl -s "http://localhost:3000/api/nav?fundId=$FUND_ID")
METHOD1_AVG=$(echo $METHOD1_NAV | jq -r '.avgPrices.usdt.avgPrice')
METHOD1_TOTAL=$(echo $METHOD1_NAV | jq -r '.avgPrices.usdt.totalBought')
METHOD1_EARN=$(echo $METHOD1_NAV | jq -r '.avgPrices.usdt.totalEarn')

echo ""
echo "   📊 RESULTS (Reduce Method):"
echo "   ├─ Original: $INITIAL_AMOUNT USDT @ $INITIAL_AVG VND/USDT"
echo "   ├─ After Earn: $METHOD1_TOTAL USDT (bought) + $METHOD1_EARN USDT (earn)"
echo "   └─ New Avg Price: $METHOD1_AVG VND/USDT"

# Calculate expected
EXPECTED_METHOD1=$(echo "scale=2; ($INITIAL_AMOUNT * $INITIAL_AVG + 100 * 0) / ($INITIAL_AMOUNT + 100)" | bc)
echo "   └─ Expected: ~$EXPECTED_METHOD1 VND/USDT"
echo ""

# Test 2: Keep Avg Price Method
echo "4️⃣  Testing Method 2: KEEP AVG PRICE"
echo "   Setting method to keep_avg_price..."
curl -s -X PUT http://localhost:3000/api/funds/settings \
  -H "Content-Type: application/json" \
  -d "{\"fundId\": \"$FUND_ID\", \"earnInterestMethod\": \"keep_avg_price\"}" > /dev/null

sleep 1

# Check avg price after method change
METHOD2_NAV=$(curl -s "http://localhost:3000/api/nav?fundId=$FUND_ID")
METHOD2_AVG=$(echo $METHOD2_NAV | jq -r '.avgPrices.usdt.avgPrice')

echo ""
echo "   📊 RESULTS (Keep Method):"
echo "   ├─ Total USDT: $(echo $METHOD2_NAV | jq -r '.avgPrices.usdt.totalBought') (bought) + $(echo $METHOD2_NAV | jq -r '.avgPrices.usdt.totalEarn') (earn)"
echo "   └─ Avg Price: $METHOD2_AVG VND/USDT"
echo "   └─ Expected: $INITIAL_AVG VND/USDT (unchanged)"
echo ""

# Comparison
echo "=============================================="
echo "📈 COMPARISON:"
echo "   Method 1 (Reduce): $METHOD1_AVG VND/USDT"
echo "   Method 2 (Keep):   $METHOD2_AVG VND/USDT"
echo ""

# Verify
if [ "$METHOD1_AVG" != "$METHOD2_AVG" ]; then
    echo "✅ SUCCESS: Methods produce different results as expected!"
    echo ""
    DIFF=$(echo "scale=2; (($METHOD2_AVG - $METHOD1_AVG) / $METHOD1_AVG) * 100" | bc)
    echo "   Difference: ${DIFF}%"
else
    echo "❌ FAILURE: Both methods produce same result!"
    echo "   This suggests the setting is not working correctly."
fi
echo ""
