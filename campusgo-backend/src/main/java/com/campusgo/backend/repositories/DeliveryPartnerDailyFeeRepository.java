package com.campusgo.backend.repositories;

import com.campusgo.backend.models.DeliveryPartnerDailyFee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.List;

@Repository
public interface DeliveryPartnerDailyFeeRepository extends JpaRepository<DeliveryPartnerDailyFee, Long> {
    Optional<DeliveryPartnerDailyFee> findByDeliveryPartnerIdAndFeeDate(Long deliveryPartnerId, LocalDate feeDate);
    List<DeliveryPartnerDailyFee> findByDeliveryPartnerIdOrderByFeeDateDesc(Long deliveryPartnerId);
}
