package com.campusgo.backend.controllers;

import com.campusgo.backend.models.DeliveryPartnerDailyFee;
import com.campusgo.backend.models.Role;
import com.campusgo.backend.models.User;
import com.campusgo.backend.models.OrderStatus;
import com.campusgo.backend.models.WalletTransaction;
import com.campusgo.backend.repositories.*;
import com.campusgo.backend.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final DeliveryPartnerDailyFeeRepository dailyFeeRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final DeliveryAgentRepository deliveryAgentRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final ReviewRepository reviewRepository;

    @GetMapping("/partner/{partnerId}/daily-fee-status")
    public ResponseEntity<?> getDailyFeeStatus(@PathVariable Long partnerId, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!canAccessPartner(partnerId, userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));
        }
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        Optional<DeliveryPartnerDailyFee> feeOpt = dailyFeeRepository.findByDeliveryPartnerIdAndFeeDate(partnerId, today);
        boolean paidToday = feeOpt.map(fee -> "PAID".equalsIgnoreCase(fee.getStatus())).orElse(false);
        deliveryAgentRepository.findByUserId(partnerId).ifPresent(agent -> {
            if (!"SUSPENDED".equalsIgnoreCase(agent.getPartnerStatus())) {
                agent.setPartnerStatus(paidToday ? "ACTIVE" : "INACTIVE");
                deliveryAgentRepository.save(agent);
            }
        });

        Map<String, Object> response = new HashMap<>();
        response.put("partnerId", partnerId);
        response.put("date", today.toString());
        response.put("isPaid", paidToday);
        response.put("feeAmount", 10.0);
        response.put("status", paidToday ? "PAID" : "PENDING");
        response.put("partnerStatus", paidToday ? "ACTIVE" : "INACTIVE");
        feeOpt.ifPresent(fee -> response.put("paidAt", fee.getPaidAt()));

        return ResponseEntity.ok(response);
    }

    @PostMapping("/partner/{partnerId}/pay-daily-fee")
    @Transactional
    public ResponseEntity<?> payDailyFee(@PathVariable Long partnerId, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!canAccessPartner(partnerId, userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));
        }
        if (!hasRole(userDetails, Role.DELIVERY_PARTNER)) {
            return ResponseEntity.status(403).body(Map.of("message", "Only approved delivery partners can activate a daily pass"));
        }
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        Optional<DeliveryPartnerDailyFee> existingFee = dailyFeeRepository.findByDeliveryPartnerIdAndFeeDate(partnerId, today);
        if (existingFee.isPresent() && "PAID".equalsIgnoreCase(existingFee.get().getStatus())) {
            deliveryAgentRepository.findByUserId(partnerId).ifPresent(agent -> {
                if (!"SUSPENDED".equalsIgnoreCase(agent.getPartnerStatus())) {
                    agent.setPartnerStatus("ACTIVE");
                    deliveryAgentRepository.save(agent);
                }
            });
            return ResponseEntity.ok(existingFee.get());
        }

        DeliveryPartnerDailyFee fee = DeliveryPartnerDailyFee.builder()
                .deliveryPartnerId(partnerId)
                .feeDate(today)
                .amount(10.0)
                .status("PAID")
                .paidAt(LocalDateTime.now(ZoneId.of("Asia/Kolkata")))
                .build();
        DeliveryPartnerDailyFee saved = dailyFeeRepository.save(fee);

        deliveryAgentRepository.findByUserId(partnerId).ifPresent(agent -> {
            if (!"SUSPENDED".equalsIgnoreCase(agent.getPartnerStatus())) {
                agent.setPartnerStatus("ACTIVE");
                agent.setAvailabilityStatus("AVAILABLE");
                deliveryAgentRepository.save(agent);
            }
        });

        List<WalletTransaction> txns = walletTransactionRepository.findByDeliveryPartnerIdOrderByCreatedAtDesc(partnerId);
        double currentBalance = txns.isEmpty() ? 0.0 : txns.get(0).getBalanceAfter();
        double newBalance = currentBalance - 10.0;

        WalletTransaction debitTxn = WalletTransaction.builder()
                .deliveryPartnerId(partnerId)
                .type("DEBIT_DAILY_FEE")
                .amount(10.0)
                .description("Campus Access Daily Fee (INR 10) for " + today)
                .balanceAfter(newBalance)
                .timestamp(LocalDateTime.now(ZoneId.of("Asia/Kolkata")))
                .build();
        walletTransactionRepository.save(debitTxn);

        return ResponseEntity.ok(saved);
    }

    @GetMapping("/partner/{partnerId}/transactions")
    public ResponseEntity<?> getTransactions(@PathVariable Long partnerId, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!canAccessPartner(partnerId, userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));
        }
        List<WalletTransaction> txns = walletTransactionRepository.findByDeliveryPartnerIdOrderByCreatedAtDesc(partnerId);
        return ResponseEntity.ok(txns);
    }

    @GetMapping({"/partner/{partnerId}/wallet", "/courier/{partnerId}/wallet"})
    public ResponseEntity<?> getWallet(@PathVariable Long partnerId, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!canAccessPartner(partnerId, userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));
        }

        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        Optional<DeliveryPartnerDailyFee> feeOpt = dailyFeeRepository.findByDeliveryPartnerIdAndFeeDate(partnerId, today);
        boolean paidToday = feeOpt.map(fee -> "PAID".equalsIgnoreCase(fee.getStatus())).orElse(false);

        List<WalletTransaction> txns = walletTransactionRepository.findByDeliveryPartnerIdOrderByCreatedAtDesc(partnerId);
        double currentBalance = txns.isEmpty() ? 0.0 : txns.get(0).getBalanceAfter();

        double todayEarnings = txns.stream()
                .filter(t -> ("DELIVERY_EARNING".equalsIgnoreCase(t.getType()) || "CREDIT_EARNING".equalsIgnoreCase(t.getType()))
                        && ((t.getCreatedAt() != null && t.getCreatedAt().toLocalDate().isEqual(today))
                                || (t.getTimestamp() != null && t.getTimestamp().toLocalDate().isEqual(today))))
                .mapToDouble(WalletTransaction::getAmount)
                .sum();

        long totalDeliveries = orderRepository.findByDeliveryAgentUserIdOrderByCreatedAtDesc(partnerId).stream()
                .filter(o -> o.getOrderStatus() == OrderStatus.DELIVERED)
                .count();

        Double avgRating = reviewRepository.averageRatingForPartner(partnerId);
        double rating = avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 4.9;

        List<Map<String, Object>> txnList = new ArrayList<>();
        for (WalletTransaction t : txns) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", t.getId());
            map.put("userId", partnerId);
            map.put("type", t.getType());
            map.put("amount", t.getAmount());
            map.put("referenceType", t.getOrderId() != null ? "ORDER" : "SYSTEM");
            map.put("referenceId", t.getOrderId() != null ? String.valueOf(t.getOrderId()) : null);
            map.put("description", t.getDescription());
            LocalDateTime txTime = t.getCreatedAt() != null ? t.getCreatedAt() : t.getTimestamp();
            map.put("createdAt", txTime != null ? txTime.toString() : LocalDateTime.now().toString());
            txnList.add(map);
        }

        Map<String, Object> wallet = new LinkedHashMap<>();
        wallet.put("userId", partnerId);
        wallet.put("balance", currentBalance);
        wallet.put("todayEarnings", todayEarnings);
        wallet.put("todayDailyFeePaid", paidToday);
        wallet.put("totalDeliveries", totalDeliveries);
        wallet.put("rating", rating);
        wallet.put("transactions", txnList);

        return ResponseEntity.ok(wallet);
    }

    @PostMapping("/partner/{partnerId}/credit-earning")
    public ResponseEntity<?> creditEarning(
            @PathVariable Long partnerId,
            @RequestParam Long orderId,
            @RequestParam Double amount,
            @RequestParam(required = false) String description,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!hasRole(userDetails, Role.ADMIN) && !hasRole(userDetails, Role.MANAGER) && !hasRole(userDetails, Role.CANTEEN_MEMBER)) {
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));
        }

        List<WalletTransaction> txns = walletTransactionRepository.findByDeliveryPartnerIdOrderByCreatedAtDesc(partnerId);
        double currentBalance = txns.isEmpty() ? 0.0 : txns.get(0).getBalanceAfter();
        double newBalance = currentBalance + amount;

        WalletTransaction creditTxn = WalletTransaction.builder()
                .deliveryPartnerId(partnerId)
                .orderId(orderId)
                .type("CREDIT_EARNING")
                .amount(amount)
                .description(description != null ? description : "Delivery payout for Order #" + orderId)
                .balanceAfter(newBalance)
                .timestamp(LocalDateTime.now())
                .build();

        WalletTransaction saved = walletTransactionRepository.save(creditTxn);
        return ResponseEntity.ok(saved);
    }

    private boolean canAccessPartner(Long partnerId, UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return false;
        }
        if (hasRole(userDetails, Role.ADMIN) || hasRole(userDetails, Role.MANAGER) || hasRole(userDetails, Role.CANTEEN_MEMBER)) {
            return true;
        }
        if (partnerId.equals(userDetails.getId())) {
            return userRepository.findById(userDetails.getId())
                    .map(user -> user.hasRole(Role.DELIVERY_PARTNER))
                    .orElse(false);
        }
        return deliveryAgentRepository.findById(partnerId)
                .map(agent -> agent.getUser() != null && agent.getUser().getId().equals(userDetails.getId()))
                .orElse(false);
    }

    private boolean hasRole(UserDetailsImpl userDetails, Role role) {
        if (userDetails == null) {
            return false;
        }
        return userRepository.findById(userDetails.getId())
                .map(User::getRoles)
                .map(roles -> roles.contains(role))
                .orElse(false);
    }
}
