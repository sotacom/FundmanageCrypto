#!/bin/bash

# Test Script for Earn Interest Settings Feature

echo "🧪 Testing Earn Interest Settings Feature"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Initialize demo data and get fund ID
echo "1️⃣  Initializing demo data..."
INIT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/init)
FUND_ID=$(echo $INIT_RESPONSE | jq -r '.fundId')

if [ -z "$FUND_ID" ] || [ "$FUND_ID" == "null" ]; then
    echo -e "${RED}❌ Failed to initialize demo data${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Fund created: $FUND_ID${NC}"
echo ""

# 2. Get initial fund status
echo "2️⃣  Getting initial fund settings..."
NAV_RESPONSE=$(curl -s "http://localhost:3000/api/nav?fundId=$FUND_ID")
INITIAL_METHOD=$(echo $NAV_RESPONSE | jq -r '.fund.earnInterestMethod')
echo -e "   Initial method: ${YELLOW}$INITIAL_METHOD${NC}"
echo ""

# 3. Test changing to keep_avg_price
echo "3️⃣  Testing: Change to keep_avg_price..."
SETTINGS_RESPONSE=$(curl -s -X PUT http://localhost:3000/api/funds/settings \
  -H "Content-Type: application/json" \
  -d "{\"fundId\": \"$FUND_ID\", \"earnInterestMethod\": \"keep_avg_price\"}")

SUCCESS=$(echo $SETTINGS_RESPONSE | jq -r '.success')
if [ "$SUCCESS" == "true" ]; then
    echo -e "${GREEN}✅ Settings API returned success${NC}"
else
    echo -e "${RED}❌ Settings API failed${NC}"
    echo $SETTINGS_RESPONSE | jq '.'
    exit 1
fi
echo ""

# 4. Verify change was persisted
echo "4️⃣  Verifying change was saved..."
sleep 1
VERIFY_RESPONSE=$(curl -s "http://localhost:3000/api/nav?fundId=$FUND_ID")
NEW_METHOD=$(echo $VERIFY_RESPONSE | jq -r '.fund.earnInterestMethod')

if [ "$NEW_METHOD" == "keep_avg_price" ]; then
    echo -e "${GREEN}✅ Method changed to: $NEW_METHOD${NC}"
else
    echo -e "${RED}❌ Method did not change! Still: $NEW_METHOD${NC}"
    exit 1
fi
echo ""

# 5. Test changing back to reduce_avg_price
echo "5️⃣  Testing: Change back to reduce_avg_price..."
SETTINGS_RESPONSE2=$(curl -s -X PUT http://localhost:3000/api/funds/settings \
  -H "Content-Type: application/json" \
  -d "{\"fundId\": \"$FUND_ID\", \"earnInterestMethod\": \"reduce_avg_price\"}")

SUCCESS2=$(echo $SETTINGS_RESPONSE2 | jq -r '.success')
if [ "$SUCCESS2" == "true" ]; then
    echo -e "${GREEN}✅ Settings API returned success${NC}"
else
    echo -e "${RED}❌ Settings API failed${NC}"
    exit 1
fi
echo ""

# 6. Final verification
echo "6️⃣  Final verification..."
sleep 1
FINAL_RESPONSE=$(curl -s "http://localhost:3000/api/nav?fundId=$FUND_ID")
FINAL_METHOD=$(echo $FINAL_RESPONSE | jq -r '.fund.earnInterestMethod')

if [ "$FINAL_METHOD" == "reduce_avg_price" ]; then
    echo -e "${GREEN}✅ Method changed back to: $FINAL_METHOD${NC}"
else
    echo -e "${RED}❌ Method did not change back! Still: $FINAL_METHOD${NC}"
    exit 1
fi
echo ""

echo "=========================================="
echo -e "${GREEN}🎉 All tests passed!${NC}"
echo ""
echo "Summary:"
echo "  - Fund ID: $FUND_ID"
echo "  - Initial method: $INITIAL_METHOD"
echo "  - Changed to: keep_avg_price ✅"
echo "  - Changed back to: reduce_avg_price ✅"
