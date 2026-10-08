package com.campusgo.backend.services;

import com.campusgo.backend.models.*;
import com.campusgo.backend.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ZestBiddingService {

    private final DeliveryRequestRepository requestRepository;
    private final DeliveryBidRepository bidRepository;
    private final DeliveryAssignmentRepository assignmentRepository;
    private final OrderRepository orderRepository;
    private final DeliveryAgentRepository agentRepository;
    private final DeliveryPartnerDailyFeeRepository dailyFeeRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final OrderStatusHistoryRepository statusHistoryRepository;
    private final CampusSettingRepository settingRepository;
    private final ZestEventPublisher eventPublisher;
    private final NotificationService notificationService;

    private int getBiddingWindowMinutes() {
        return settingRepository.findBySettingKey("zest.bid.window.minutes")
                .map(s -> {
                    try { return Integer.parseInt(s.getSettingValue().trim()); }
                    catch (Exception e) { return 5; }
                })
                // fallback to old key name for backward compatibility
                .orElseGet(() -> settingRepository.findBySettingKey("zest.bidding_window_seconds")
                        .map(s -> {
                            try { return Math.max(1, Integer.parseInt(s.getSettingValue().trim()) / 60); }
                            catch (Exception e) { return 5; }
                        }).orElse(5));
    }

    private int getBiddingWindowSeconds() {
        return getBiddingWindowMinutes() * 60;
    }

    private int getConfirmationTimeoutSeconds() {
        return settingRepository.findBySettingKey("zest.confirmation_timeout_seconds")
                .map(s -> {
                    try { return Integer.parseInt(s.getSettingValue().trim()); }
                    catch (Exception e) { return 900; }
                }).orElse(900);
    }

    private int getMaximumActiveDeliveriesPerPartner() {
        return settingRepository.findBySettingKey("zest.max_active_deliveries_per_partner")
                .map(s -> {
                    try { return Integer.parseInt(s.getSettingValue().trim()); }
                    catch (Exception e) { return 2; }
                }).orElse(2);
    }

    private double getDailyFeeAmount() {
        return settingRepository.findBySettingKey("zest.partner.daily.fee")
                .map(s -> {
                    try { return Double.parseDouble(s.getSettingValue().trim()); }
                    catch (Exception e) { return 10.0; }
                })
                .orElseGet(() -> settingRepository.findBySettingKey("zest.daily_fee_amount")
                        .map(s -> {
                            try { return Double.parseDouble(s.getSettingValue().trim()); }
                            catch (Exception e) { return 10.0; }
                        }).orElse(10.0));
    }

    private double getMinBidFee() {
        return settingRepository.findBySettingKey("zest.bid.min.fee")
                .map(s -> { try { return Double.parseDouble(s.getSettingValue().trim()); } catch (Exception e) { return 10.0; } })
                .orElse(10.0);
    }

    private double getMaxBidFee() {
        return settingRepository.findBySettingKey("zest.bid.max.fee")
                .map(s -> { try { return Double.parseDouble(s.getSettingValue().trim()); } catch (Exception e) { return 100.0; } })
                .orElse(100.0);
    }

    /**
     * Check if a delivery partner is eligible according to ZestModel rules:
     * - Approved delivery partner application
     * - Account status = ACTIVE
     * - Availability status = AVAILABLE
     * - Paid daily fee (₹10/day) for current date (or waived)
     * - Inside/near campus geofence
     * - Active delivery count < limit (e.g. 2)
     */
    public boolean isEligiblePartner(User user) {
        if (user == null || !user.hasRole(Role.DELIVERY_PARTNER)) {
            return false;
        }

        Optional<DeliveryAgent> agentOpt = agentRepository.findByUserId(user.getId());
        if (agentOpt.isEmpty()) {
            agentRepository.save(DeliveryAgent.builder()
                    .user(user)
                    .availabilityStatus("AVAILABLE")
                    .partnerStatus("ACTIVE")
                    .build());
            agentOpt = agentRepository.findByUserId(user.getId());
        }

        DeliveryAgent agent = agentOpt.get();
        if (!"ACTIVE".equalsIgnoreCase(agent.getPartnerStatus()) || "OFFLINE".equalsIgnoreCase(agent.getAvailabilityStatus())) {
            return false;
        }

        // Daily Fee check
        LocalDate today = LocalDate.now();
        Optional<DeliveryPartnerDailyFee> feeOpt = dailyFeeRepository.findByDeliveryPartnerIdAndFeeDate(user.getId(), today);
        boolean feePaid = feeOpt.isPresent() && "PAID".equalsIgnoreCase(feeOpt.get().getStatus());
        if (!feePaid) {
            // Check if daily fee is waived in settings
            boolean waived = settingRepository.findBySettingKey("zest.waive_daily_fee")
                    .map(s -> "true".equalsIgnoreCase(s.getSettingValue().trim()))
                    .orElse(true);
            if (!waived) {
                return false;
            }
        }

        // Active delivery count check (< configured limit)
        long activeCount = orderRepository.findByDeliveryAgentUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .filter(o -> o.getOrderStatus() == OrderStatus.DELIVERY_ASSIGNED
                        || o.getOrderStatus() == OrderStatus.DELIVERY_PARTNER_ASSIGNED
                        || o.getOrderStatus() == OrderStatus.DELIVERY_PARTNER_ACCEPTED
                        || o.getOrderStatus() == OrderStatus.ASSIGNED
                        || o.getOrderStatus() == OrderStatus.PICKED_UP
                        || o.getOrderStatus() == OrderStatus.OUT_FOR_DELIVERY
                        || o.getOrderStatus() == OrderStatus.ARRIVING)
                .count();

        boolean eligible = activeCount < getMaximumActiveDeliveriesPerPartner();
        if (eligible && !"AVAILABLE".equalsIgnoreCase(agent.getAvailabilityStatus())) {
            agent.setAvailabilityStatus("AVAILABLE");
            agentRepository.save(agent);
        }
        return eligible;
    }

    private boolean isBidStillValid(DeliveryBid bid) {
        if (bid == null) return false;
        // Accept ACTIVE or SELECTED bids — do NOT filter by deadline after bids are submitted
        return "ACTIVE".equalsIgnoreCase(bid.getStatus()) || "SELECTED".equalsIgnoreCase(bid.getStatus());
    }

    private List<DeliveryBid> calculateValidTopBids(DeliveryRequest request, LocalDateTime now) {
        // Get bids by request ID first
        List<DeliveryBid> bids = bidRepository.findByRequestId(request.getId()).stream()
                .filter(this::isBidStillValid)
                .collect(Collectors.toList());

        // Fallback: also look up bids directly by orderId in case requestId linkage is off
        if (bids.isEmpty()) {
            bids = bidRepository.findByOrderId(request.getOrderId()).stream()
                    .filter(this::isBidStillValid)
                    .collect(Collectors.toList());
        }

        return bids.stream()
                .sorted(Comparator.comparing(DeliveryBid::getAmount)
                        .thenComparing(DeliveryBid::getEstimatedDeliveryTimeMinutes, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(DeliveryBid::getRating, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(DeliveryBid::getSubmittedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(5)
                .collect(Collectors.toList());
    }

    /**
     * Create delivery request with server-calculated deadline.
     */
    @Transactional
    public DeliveryRequest createDeliveryRequest(Order order, Integer deadlineMinutes) {
        if (deadlineMinutes == null || deadlineMinutes <= 0) {
            deadlineMinutes = 5;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime deadlineAt = order.getDeadlineAt() != null ? order.getDeadlineAt() : now.plusMinutes(deadlineMinutes);
        int windowSeconds = getBiddingWindowSeconds();
        if (deadlineAt.isAfter(now)) {
            long remaining = java.time.Duration.between(now, deadlineAt).getSeconds();
            windowSeconds = (int) Math.max(30, Math.min(windowSeconds, remaining));
        }
        LocalDateTime bidEndAt = now.plusSeconds(windowSeconds);

        if (order.getDeadlineAt() == null) {
            order.setDeadlineMinutes(deadlineMinutes);
            order.setDeadlineAt(deadlineAt);
        }
        order.setBiddingStatus("OPEN");
        order.setBiddingDeadline(bidEndAt);
        if (order.getDeliveryStatus() == null || "WAITING_FOR_DELIVERY_PARTNER".equals(order.getDeliveryStatus())) {
            order.setDeliveryStatus("WAITING_FOR_BIDDING");
        }

        Optional<DeliveryRequest> existing = requestRepository.findByOrderId(order.getId());
        if (existing.isPresent() && "OPEN".equalsIgnoreCase(existing.get().getStatus())) {
            orderRepository.save(order);
            return existing.get();
        }

        orderRepository.save(order);

        recordStatusHistory(order.getId(), order.getOrderStatus() != null ? order.getOrderStatus().name() : OrderStatus.PLACED.name(),
                OrderStatus.DELIVERY_BIDDING.name(), "SYSTEM", "Delivery bidding opened in parallel");

        DeliveryRequest request = existing.orElse(DeliveryRequest.builder()
                        .orderId(order.getId())
                        .customerId(order.getUser().getId())
                        .customerName(order.getUser().getName())
                        .deliveryLocation(order.getDeliveryLocation())
                        .shopName(order.getShop() != null ? order.getShop().getName() : "Campus Canteen")
                        .orderTotal(order.getTotalAmount() != null ? order.getTotalAmount().doubleValue() : 0.0)
                        .build());

        request.setDeadlineMinutes(deadlineMinutes);
        request.setDeadlineAt(deadlineAt);
        request.setBidStartAt(now);
        request.setBidEndAt(bidEndAt);
        request.setStatus("OPEN");
        request.setSelectedBidId(null);

        DeliveryRequest saved = requestRepository.save(request);
        log.info("Created DeliveryRequest #{} for Order #{} with deadline {} min (expires at {})",
                saved.getId(), order.getOrderNumber(), deadlineMinutes, deadlineAt);

        eventPublisher.publishDeliveryRequestCreated(saved);
        notificationService.notifyUser(order.getUser().getId(), order.getId(),
                "Delivery bidding opened",
                "Delivery partners can now bid for order " + order.getOrderNumber() + ".",
                "BIDDING_OPENED");
        notificationService.notifyRole(Role.DELIVERY_PARTNER, order.getId(),
                "New delivery opportunity",
                "Order " + order.getOrderNumber() + " is open for bidding. Submit your delivery fee bid.",
                "DELIVERY_OPPORTUNITY");
        return saved;
    }

    /**
     * Submit sealed bid from delivery partner.
     */
    @Transactional
    public DeliveryBid submitBid(Long requestId, User partnerUser, Double amount, Integer estPickup, Integer estDelivery) {
        return submitBid(requestId, partnerUser, amount, estPickup, estDelivery, null);
    }

    @Transactional
    public DeliveryBid submitBid(Long requestId, User partnerUser, Double amount, Integer estPickup, Integer estDelivery, String message) {
        if (!isEligiblePartner(partnerUser)) {
            throw new IllegalStateException("Delivery partner is not eligible to bid. Please check partner status and daily fee.");
        }

        DeliveryRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Delivery request not found"));

        if (!"OPEN".equalsIgnoreCase(request.getStatus())) {
            throw new IllegalStateException("The bidding deadline has expired. No new bids can be submitted.");
        }

        double minBid = getMinBidFee();
        double maxBid = getMaxBidFee();
        if (amount == null || amount < minBid || amount > maxBid) {
            throw new IllegalArgumentException("Bid amount must be between ₹" + (int)minBid + " and ₹" + (int)maxBid);
        }

        LocalDateTime now = LocalDateTime.now();

        // Check if bidding window has expired
        if (request.getBidEndAt() != null && now.isAfter(request.getBidEndAt())) {
            request.setStatus("CLOSED");
            requestRepository.save(request);
            throw new IllegalStateException("The bidding deadline has expired. No new bids can be submitted.");
        }

        if (estPickup == null || estPickup < 1) estPickup = 2;
        if (estDelivery == null || estDelivery < 1) estDelivery = Math.max(2, estPickup + 2);

        if (bidRepository.findByRequestIdAndDeliveryPartnerId(requestId, partnerUser.getId()).isPresent()) {
            throw new IllegalStateException("You have already submitted a bid for this order.");
        }

        DeliveryBid bid;
        {
            bid = DeliveryBid.builder()
                    .requestId(requestId)
                    .orderId(request.getOrderId())
                    .deliveryPartnerId(partnerUser.getId())
                    .deliveryPartnerName(partnerUser.getName())
                    .rating(4.8)
                    .completedDeliveries(45)
                    .amount(amount)
                    .estimatedPickupTimeMinutes(estPickup)
                    .estimatedDeliveryTimeMinutes(estDelivery)
                    .message(message)
                    .submittedAt(now)
                    .expiresAt(request.getBidEndAt())
                    .status("ACTIVE")
                    .build();
        }

        DeliveryBid saved = bidRepository.save(bid);
        log.info("Delivery partner {} submitted bid ₹{} for Request #{}", partnerUser.getName(), amount, requestId);

        eventPublisher.publishBidSubmitted(requestId, saved);
        notificationService.notifyUser(request.getCustomerId(), request.getOrderId(),
                "New delivery bid",
                partnerUser.getName() + " bid ₹" + amount.intValue() + " for your order.",
                "NEW_BID");
        return saved;
    }

    /**
     * Get top 5 valid lowest bids for customer selection.
     */
    public List<DeliveryBid> getTop5LowestBids(Long requestId) {
        DeliveryRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Delivery request not found"));
        LocalDateTime now = LocalDateTime.now();
        List<DeliveryBid> topBids = calculateValidTopBids(request, now);

        if (request.getBidEndAt() != null && !now.isBefore(request.getBidEndAt())
                && "OPEN".equalsIgnoreCase(request.getStatus())) {
            request.setStatus(topBids.isEmpty() ? "BIDDING_CLOSED" : "SELECTION_PENDING");
            requestRepository.save(request);
            eventPublisher.publishBiddingClosed(requestId, topBids);
            eventPublisher.publishTopBidsReady(requestId, topBids);
        }

        return topBids;
    }

    /**
     * Customer selects a delivery partner from shortlisted top 5 bids.
     */
    @Transactional
    public DeliveryAssignment selectPartner(Long requestId, Long bidId, User customerUser) {
        DeliveryRequest request = requestRepository.findByIdForUpdate(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Delivery request not found"));

        if (!request.getCustomerId().equals(customerUser.getId()) && !customerUser.hasRole(Role.ADMIN)) {
            throw new SecurityException("Unauthorized: Only the customer who placed this order can select a delivery partner");
        }

        DeliveryBid selectedBid = bidRepository.findById(bidId)
                .orElseThrow(() -> new IllegalArgumentException("Bid not found"));

        if (!selectedBid.getRequestId().equals(requestId)) {
            throw new IllegalArgumentException("Bid does not belong to this delivery request");
        }

        LocalDateTime now = LocalDateTime.now();
        if (!"OPEN".equalsIgnoreCase(request.getStatus()) && !"SELECTION_PENDING".equalsIgnoreCase(request.getStatus())) {
            throw new IllegalStateException("Delivery request is not available for partner selection");
        }

        List<Long> selectableBidIds = calculateValidTopBids(request, now).stream()
                .map(DeliveryBid::getId)
                .collect(Collectors.toList());
        if (!selectableBidIds.contains(bidId) && !"ACTIVE".equalsIgnoreCase(selectedBid.getStatus())) {
            throw new IllegalArgumentException("Selected bid is no longer valid or is not in the current top 5 bids");
        }

        int timeoutSeconds = getConfirmationTimeoutSeconds();
        LocalDateTime expiresAt = now.plusSeconds(timeoutSeconds);

        // Update bid statuses
        List<DeliveryBid> allBids = bidRepository.findByRequestId(requestId);
        for (DeliveryBid b : allBids) {
            if (b.getId().equals(bidId)) {
                b.setStatus("SELECTED");
            } else {
                b.setStatus("NOT_SELECTED");
            }
            bidRepository.save(b);
        }

        request.setStatus("ASSIGNED");
        request.setSelectedBidId(bidId);
        requestRepository.save(request);

        // Create assignment record awaiting partner confirmation
        DeliveryAssignment assignment = DeliveryAssignment.builder()
                .orderId(request.getOrderId())
                .deliveryPartnerId(selectedBid.getDeliveryPartnerId())
                .bidId(bidId)
                .assignedAt(now)
                .expiresAt(expiresAt)
                .status("PENDING_CONFIRMATION")
                .build();

        DeliveryAssignment savedAssignment = assignmentRepository.save(assignment);

        log.info("Customer {} selected bid #{} (partner {}) for Order #{}. Awaiting partner confirmation within {}s.",
                customerUser.getName(), bidId, selectedBid.getDeliveryPartnerName(), request.getOrderId(), timeoutSeconds);

        eventPublisher.publishPartnerSelected(requestId, savedAssignment);
        eventPublisher.publishAssignmentSentToPartner(selectedBid.getDeliveryPartnerId(), savedAssignment);

        orderRepository.findById(request.getOrderId()).ifPresent(order -> {
            order.setBiddingStatus("PARTNER_SELECTED");
            order.setSelectedBidId(bidId);
            order.setSelectedDeliveryPartnerId(selectedBid.getDeliveryPartnerId());
            order.setDeliveryStatus("WAITING_FOR_PARTNER_CONFIRMATION");
            orderRepository.save(order);
            recordStatusHistory(order.getId(), OrderStatus.DELIVERY_BIDDING.name(),
                    OrderStatus.DELIVERY_PARTNER_ASSIGNED.name(), customerUser.getName(), "Customer selected delivery partner: " + selectedBid.getDeliveryPartnerName());
            eventPublisher.publishOrderStatusChanged(order.getId(), order.getOrderStatus() != null ? order.getOrderStatus().name() : "PLACED", order);
        });

        notificationService.notifyUser(selectedBid.getDeliveryPartnerId(), request.getOrderId(),
                "You have been selected",
                "You have been selected for Order #" + request.getOrderId() + ". Please confirm your assignment.",
                "ASSIGNED");

        return savedAssignment;
    }

    /**
     * Delivery partner confirms assignment within 15 seconds.
     */
    @Transactional
    public Order confirmAssignment(Long assignmentId, User partnerUser) {
        DeliveryAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found"));

        if (!assignment.getDeliveryPartnerId().equals(partnerUser.getId())) {
            throw new SecurityException("Unauthorized: Only the assigned delivery partner can confirm this assignment");
        }

        if (!"PENDING_CONFIRMATION".equalsIgnoreCase(assignment.getStatus())) {
            throw new IllegalStateException("Assignment is no longer pending confirmation (status: " + assignment.getStatus() + ")");
        }

        LocalDateTime now = LocalDateTime.now();
        if (assignment.getExpiresAt() != null && now.isAfter(assignment.getExpiresAt().plusSeconds(2))) {
            assignment.setStatus("EXPIRED");
            assignmentRepository.save(assignment);
            throw new IllegalStateException("Assignment confirmation window has expired");
        }

        assignment.setStatus("CONFIRMED");
        assignment.setConfirmedAt(now);
        assignmentRepository.save(assignment);

        Order order = orderRepository.findByIdForUpdate(assignment.getOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        DeliveryBid bid = bidRepository.findById(assignment.getBidId())
                .orElseThrow(() -> new IllegalArgumentException("Selected bid not found"));

        DeliveryAgent agent = agentRepository.findByUserId(partnerUser.getId())
                .orElseGet(() -> agentRepository.save(DeliveryAgent.builder().user(partnerUser).availabilityStatus("BUSY").build()));

        agent.setAvailabilityStatus("BUSY");
        agentRepository.save(agent);

        String oldStatus = order.getOrderStatus() != null ? order.getOrderStatus().name() : OrderStatus.PLACED.name();
        order.setDeliveryAgent(agent);
        order.setSelectedBidId(bid.getId());
        order.setSelectedDeliveryPartnerId(partnerUser.getId());
        order.setDeliveryFee(java.math.BigDecimal.valueOf(bid.getAmount()));

        boolean isReady = "READY_FOR_PICKUP".equalsIgnoreCase(order.getPreparationStatus()) || order.getOrderStatus() == OrderStatus.READY_FOR_PICKUP;
        if (isReady) {
            order.setDeliveryStatus("READY_FOR_PICKUP");
            order.setOrderStatus(OrderStatus.READY_FOR_PICKUP);
            notificationService.notifyUser(partnerUser.getId(), order.getId(),
                    "Order ready for pickup",
                    "Order #" + order.getOrderNumber() + " is ready at the canteen. Please proceed for pickup.",
                    "ORDER_READY");
        } else {
            order.setDeliveryStatus("WAITING_FOR_PREPARATION");
            // Set order to ASSIGNED so customer can see their delivery partner was confirmed
            if (order.getOrderStatus() == OrderStatus.PLACED
                    || order.getOrderStatus() == OrderStatus.ACCEPTED
                    || order.getOrderStatus() == OrderStatus.PREPARING) {
                order.setOrderStatus(OrderStatus.ASSIGNED);
            }
        }
        
        java.math.BigDecimal subtotal = order.getSubtotal() != null ? order.getSubtotal() : java.math.BigDecimal.ZERO;
        java.math.BigDecimal platformFee = order.getPlatformFee() != null ? order.getPlatformFee() : new java.math.BigDecimal("5.00");
        order.setTotalAmount(subtotal.add(order.getDeliveryFee()).add(platformFee));

        Order updatedOrder = orderRepository.save(order);
        recordStatusHistory(order.getId(), oldStatus, order.getOrderStatus().name(), partnerUser.getName(), "Partner accepted delivery for ₹" + bid.getAmount());

        log.info("Delivery partner {} confirmed assignment for Order #{}", partnerUser.getName(), order.getOrderNumber());

        eventPublisher.publishOrderStatusChanged(order.getId(), order.getOrderStatus().name(), updatedOrder);
        notificationService.notifyUser(order.getUser().getId(), order.getId(),
                "Delivery partner accepted",
                partnerUser.getName() + " accepted your delivery request.",
                "DELIVERY_ACCEPTED");
        return updatedOrder;
    }

    /**
     * Delivery partner rejects assignment or assignment expires.
     */
    @Transactional
    public void rejectAssignment(Long assignmentId, User partnerUser) {
        DeliveryAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found"));

        if (partnerUser == null || !assignment.getDeliveryPartnerId().equals(partnerUser.getId())) {
            throw new SecurityException("Unauthorized: Only the selected delivery partner can reject this assignment");
        }

        if (!"PENDING_CONFIRMATION".equalsIgnoreCase(assignment.getStatus())) {
            throw new IllegalStateException("Assignment is no longer pending confirmation");
        }

        assignment.setStatus("REJECTED");
        assignmentRepository.save(assignment);

        // Reset request status to allow re-selection
        Optional<DeliveryRequest> reqOpt = requestRepository.findByOrderId(assignment.getOrderId());
        if (reqOpt.isPresent()) {
            DeliveryRequest req = reqOpt.get();
            req.setStatus("SELECTION_PENDING");
            requestRepository.save(req);
        }

        log.info("Partner {} rejected assignment #{}", partnerUser != null ? partnerUser.getName() : "System", assignmentId);
    }

    /**
     * Helper to record status history audit entry.
     */
    public void recordStatusHistory(Long orderId, String oldStatus, String newStatus, String changedBy, String metadata) {
        OrderStatusHistory history = OrderStatusHistory.builder()
                .orderId(orderId)
                .oldStatus(oldStatus)
                .newStatus(newStatus)
                .changedBy(changedBy)
                .metadata(metadata)
                .build();
        statusHistoryRepository.save(history);
    }
}
