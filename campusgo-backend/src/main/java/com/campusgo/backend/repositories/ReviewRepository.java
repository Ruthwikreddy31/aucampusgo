package com.campusgo.backend.repositories;

import com.campusgo.backend.models.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    Optional<Review> findByOrderIdAndCustomerId(Long orderId, Long customerId);
    Optional<Review> findByOrderId(Long orderId);
    List<Review> findByDeliveryPartnerId(Long deliveryPartnerId);
    List<Review> findByDeliveryPartnerIdOrderByCreatedAtDesc(Long deliveryPartnerId);

    @Query("select avg(r.rating) from Review r where r.deliveryPartnerId = :partnerId")
    Double averageRatingForPartner(@Param("partnerId") Long partnerId);
}

