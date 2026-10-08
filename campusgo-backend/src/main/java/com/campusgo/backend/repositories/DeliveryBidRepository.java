package com.campusgo.backend.repositories;

import com.campusgo.backend.models.DeliveryBid;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryBidRepository extends JpaRepository<DeliveryBid, Long> {
    List<DeliveryBid> findByRequestId(Long requestId);
    List<DeliveryBid> findByOrderId(Long orderId);
    List<DeliveryBid> findByDeliveryPartnerIdOrderByCreatedAtDesc(Long deliveryPartnerId);
    Optional<DeliveryBid> findByRequestIdAndDeliveryPartnerId(Long requestId, Long deliveryPartnerId);
    Optional<DeliveryBid> findByRequestIdAndDeliveryPartnerIdAndStatus(Long requestId, Long deliveryPartnerId, String status);
    List<DeliveryBid> findByRequestIdAndStatus(Long requestId, String status);
}
