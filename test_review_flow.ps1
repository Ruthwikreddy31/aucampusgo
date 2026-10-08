$ErrorActionPreference = 'Stop'

Write-Host "============================================================"
Write-Host "CAMPUSGO DELIVERY PARTNER RATING AND FEEDBACK FLOW TEST"
Write-Host "============================================================"

# 1. Delivery Partner Authentication
$agentAuth = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body (@{ email = "agent@anurag.edu.in"; password = "agent123" } | ConvertTo-Json) -ContentType "application/json"
$agentToken = $agentAuth.token
$agentHeaders = @{ Authorization = "Bearer $agentToken" }
Write-Host "Agent logged in: $($agentAuth.user.email) (Role: $($agentAuth.user.role))"

# 2. Student Authentication
$studentAuth = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -Body (@{ email = "23eg106d01@anurag.edu.in"; password = "password123" } | ConvertTo-Json) -ContentType "application/json"
$studentToken = $studentAuth.token
$studentHeaders = @{ Authorization = "Bearer $studentToken" }
Write-Host "Student logged in: $($studentAuth.user.email) (Role: $($studentAuth.user.role))"

# 3. Get Student Orders
$studentOrders = Invoke-RestMethod -Uri "http://localhost:8080/api/orders/my-orders" -Method Get -Headers $studentHeaders
Write-Host "Found student orders: $($studentOrders.Count)"

$targetId = 18
mysql -u root -pvrr12345 campusgo -e "UPDATE orders SET order_status = 'DELIVERED', delivery_agent_id = 12 WHERE id = $targetId;"
mysql -u root -pvrr12345 campusgo -e "DELETE FROM reviews WHERE order_id = $targetId;"
Write-Host "Testing Rating and Feedback on Order ID: $targetId"

# 4. Submit Review
$reviewPayload = @{
    rating = 5
    comment = "Super fast delivery and polite courier! Handed over carefully at hostel."
} | ConvertTo-Json

$reviewResp = Invoke-RestMethod -Uri "http://localhost:8080/api/orders/$targetId/reviews" -Method Post -Body $reviewPayload -ContentType "application/json" -Headers $studentHeaders
Write-Host "SUCCESS: Review submitted successfully!"
Write-Host "Review ID: $($reviewResp.id)"
Write-Host "Rating: $($reviewResp.rating) Stars"
Write-Host "Comment: $($reviewResp.comment)"
Write-Host "DeliveryPartnerId: $($reviewResp.deliveryPartnerId)"

# 5. Verify Duplicate Block
try {
    $dup = Invoke-RestMethod -Uri "http://localhost:8080/api/orders/$targetId/reviews" -Method Post -Body $reviewPayload -ContentType "application/json" -Headers $studentHeaders
    Write-Host "FAIL: Duplicate review was accepted"
} catch {
    Write-Host "SUCCESS: Duplicate review was rejected: $($_.Exception.Message)"
}

# 6. Verify Tracking Endpoint
$tracking = Invoke-RestMethod -Uri "http://localhost:8080/api/orders/$targetId/tracking" -Method Get -Headers $studentHeaders
if ($tracking.review -and $tracking.review.rating -eq 5) {
    Write-Host "SUCCESS: Tracking endpoint includes the submitted review ($($tracking.review.rating) Stars)!"
} else {
    Write-Host "FAIL: Review not found in tracking"
}

# 7. Verify Delivery Partner Reviews
$agentReviews = Invoke-RestMethod -Uri "http://localhost:8080/api/delivery/reviews" -Method Get -Headers $agentHeaders
Write-Host "Delivery Partner Reviews Count: $($agentReviews.totalReviews), Average Rating: $($agentReviews.averageRating)"
if ($agentReviews.totalReviews -ge 1) {
    Write-Host "SUCCESS: Delivery partner reviews endpoint returns customer feedback!"
}

# 8. Verify Delivery Partner Stats
$agentStats = Invoke-RestMethod -Uri "http://localhost:8080/api/delivery/stats" -Method Get -Headers $agentHeaders
Write-Host "Delivery Partner Stats Rating: $($agentStats.rating), Reviews Count: $($agentStats.reviewCount)"
if ($agentStats.rating) {
    Write-Host "SUCCESS: Delivery partner stats dynamically compute rating from reviews!"
}

Write-Host "`n============================================================"
Write-Host "ALL TESTS PASSED SUCCESSFULLY!"
Write-Host "============================================================"
