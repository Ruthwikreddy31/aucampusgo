package com.campusgo.backend.repositories;

import com.campusgo.backend.models.PrintJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PrintJobRepository extends JpaRepository<PrintJob, Long> {

    List<PrintJob> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<PrintJob> findByOrderIdOrderByCreatedAtDesc(Long orderId);

    Optional<PrintJob> findByIdAndUserId(Long id, Long userId);

    // For manager: find by orderId and printStatus
    List<PrintJob> findByPrintStatusOrderByCreatedAtAsc(String printStatus);
}
