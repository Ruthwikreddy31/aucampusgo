package com.campusgo.backend.repositories;

import com.campusgo.backend.models.ApplicationStatus;
import com.campusgo.backend.models.DeliveryPartnerApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryApplicationRepository extends JpaRepository<DeliveryPartnerApplication, Long> {
    Optional<DeliveryPartnerApplication> findTopByUserIdOrderByCreatedAtDesc(Long userId);
    List<DeliveryPartnerApplication> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<DeliveryPartnerApplication> findAllByOrderBySubmittedAtDesc();
    List<DeliveryPartnerApplication> findByStatusOrderBySubmittedAtDesc(ApplicationStatus status);
    Optional<DeliveryPartnerApplication> findByUserIdAndStatus(Long userId, ApplicationStatus status);
    long countByStatus(ApplicationStatus status);
}
