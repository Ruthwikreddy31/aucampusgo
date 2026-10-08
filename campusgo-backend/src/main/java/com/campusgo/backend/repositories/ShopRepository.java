package com.campusgo.backend.repositories;

import com.campusgo.backend.models.Shop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShopRepository extends JpaRepository<Shop, Long> {
    List<Shop> findByActiveTrue();
    long countByActiveTrue();
    List<Shop> findByManagerUserId(Long managerUserId);
}
