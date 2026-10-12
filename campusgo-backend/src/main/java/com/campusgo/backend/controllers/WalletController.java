package com.campusgo.backend.controllers;

import com.campusgo.backend.models.DeliveryPartnerDailyFee;
import com.campusgo.backend.models.Role;
import com.campusgo.backend.models.User;
import com.campusgo.backend.models.WalletTransaction;
import com.campusgo.backend.repositories.DeliveryAgentRepository;
import com.campusgo.backend.repositories.DeliveryPartnerDailyFeeRepository;
import com.campusgo.backend.repositories.UserRepository;
import com.campusgo.backend.repositories.WalletTransactionRepository;
import com.campusgo.backend.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final DeliveryPartnerDailyFeeRepository dailyFeeRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final DeliveryAgentRepository deliveryAgentRepository;
    private final UserRepository userRepository;

    @GetMapping("/partner/{partnerId}/daily-fee-status")
    public ResponseEntity<?> getDailyFeeStatus(@PathVariable Long partnerId, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!canAccessPartner(partnerId, userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));
        }
        LocalDate today = LocalDate.now();
        Optional<DeliveryPartnerDailyFee> feeOpt = dailyFeeRepository.findByDeliveryPartnerIdAndFeeDate(partnerId, today);

        Map<String, Object> response = new HashMap<>();
        response.put("partnerId", partnerId);
        response.put("date", today.toString());
        response.put("isPaid", feeOpt.isPresent() && "PAID".equalsIgnoreCase(feeOpt.get().getStatus()));
        response.put("feeAmount", 10.0);
        feeOpt.ifPresent(fee -> response.put("paidAt", fee.getPaidAt()));

        return ResponseEntity.ok(response);
    }

    @PostMapping("/partner/{partnerId}/pay-daily-fee")
    public ResponseEntity<?> payDailyFee(@PathVariable Long partnerId, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (!canAccessPartner(partnerId, userDetails)) {
            return ResponseEntity.status(403).body(Map.of("message", "Access denied"));
        }
        LocalDate today = LocalDate.now();
        Optional<DeliveryPartnerDailyFee> existingFee = dailyFeeRepository.findByDeliveryPartnerIdAndFeeDate(partnerId, today);
        if (existingFee.isPresent() && "PAID".equalsIgnoreCase(existingFee.get().getStatus())) {
            return ResponseEntity.ok(existingFee.get());
        }

        DeliveryPartnerDailyFee fee = DeliveryPartnerDailyFee.builder()
                .deliveryPartnerId(partnerId)
                .feeDate(today)
                .amount(10.0)
                .status("PAID")
                .paidAt(LocalDateTime.now())
                .build();
        DeliveryPartnerDailyFee saved = dailyFeeRepository.save(fee);

        List<WalletTransaction> txns = walletTransactionRepository.findByDeliveryPartnerIdOrderByCreatedAtDesc(partnerId);
        double currentBalance = txns.isEmpty() ? 0.0 : txns.get(0).getBalanceAfter();
        double newBalance = currentBalance - 10.0;

        WalletTransaction debitTxn = WalletTransaction.builder()
                .deliveryPartnerId(partnerId)
                .type("DEBIT_DAILY_FEE")
                .amount(10.0)
                .description("Campus Access Daily Fee (INR 10) for " + today)
                .balanceAfter(newBalance)
                .timestamp(LocalDateTime.now())
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
