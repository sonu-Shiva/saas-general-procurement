# Validation Script for API Endpoints
# Run this before making any changes to verify system health

echo 'Testing core API endpoints...'

# Test authentication
curl -s -f http://localhost:5000/api/auth/user > /dev/null && echo '✓ Auth endpoint working' || echo '✗ Auth endpoint failed'

# Test products API
curl -s -f http://localhost:5000/api/products > /dev/null && echo '✓ Products endpoint working' || echo '✗ Products endpoint failed'

# Test vendors API  
curl -s -f http://localhost:5000/api/vendors > /dev/null && echo '✓ Vendors endpoint working' || echo '✗ Vendors endpoint failed'

# Test categories API
curl -s -f http://localhost:5000/api/product-categories/hierarchy > /dev/null && echo '✓ Categories endpoint working' || echo '✗ Categories endpoint failed'

# Test dashboard stats
curl -s -f http://localhost:5000/api/dashboard/stats > /dev/null && echo '✓ Dashboard endpoint working' || echo '✗ Dashboard endpoint failed'

echo 'Validation complete!'

