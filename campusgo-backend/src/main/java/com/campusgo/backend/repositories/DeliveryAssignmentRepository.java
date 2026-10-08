package com.campusgo.backend.repositories;

import com.campusgo.backend.models.DeliveryAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryAssignmentRepository extends JpaRepository<DeliveryAssignment, Long> {
    Optional<DeliveryAssignment> findByOrderId(Long orderId);
    List<DeliveryAssignment> findByDeliveryPartnerIdOrderByCreatedAtDesc(Long deliveryPartnerId);
    Optional<DeliveryAssignment> findTopByOrderIdAndStatusOrderByCreatedAtDesc(Long orderId, String status);
    Optional<DeliveryAssignment> findTopByDeliveryPartnerIdAndStatusOrderByCreatedAtDesc(Long deliveryPartnerId, String status);
    List<DeliveryAssignment> findByStatus(String status);
}
