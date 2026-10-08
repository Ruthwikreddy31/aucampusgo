package com.campusgo.backend.repositories;

import com.campusgo.backend.models.WalletTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {
    List<WalletTransaction> findByDeliveryPartnerIdOrderByCreatedAtDesc(Long deliveryPartnerId);
}
