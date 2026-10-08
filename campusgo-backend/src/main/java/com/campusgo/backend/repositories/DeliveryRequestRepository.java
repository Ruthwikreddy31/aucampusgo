package com.campusgo.backend.repositories;

import com.campusgo.backend.models.DeliveryRequest;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryRequestRepository extends JpaRepository<DeliveryRequest, Long> {
    Optional<DeliveryRequest> findByOrderId(Long orderId);
    List<DeliveryRequest> findByStatusOrderByCreatedAtDesc(String status);
    List<DeliveryRequest> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<DeliveryRequest> findByStatusAndBidEndAtBefore(String status, LocalDateTime time);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from DeliveryRequest r where r.id = :id")
    Optional<DeliveryRequest> findByIdForUpdate(Long id);
}
