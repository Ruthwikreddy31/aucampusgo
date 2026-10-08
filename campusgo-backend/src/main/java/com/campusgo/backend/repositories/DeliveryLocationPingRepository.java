package com.campusgo.backend.repositories;

import com.campusgo.backend.models.DeliveryLocationPing;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeliveryLocationPingRepository extends JpaRepository<DeliveryLocationPing, Long> {
    List<DeliveryLocationPing> findByOrderIdOrderByCreatedAtAsc(Long orderId);
    Optional<DeliveryLocationPing> findTopByOrderIdOrderByCreatedAtDesc(Long orderId);
}
