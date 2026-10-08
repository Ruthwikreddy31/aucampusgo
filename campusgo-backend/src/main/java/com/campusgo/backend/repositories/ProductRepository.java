package com.campusgo.backend.repositories;

import com.campusgo.backend.models.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByShopIdAndActiveTrue(Long shopId);
    List<Product> findByActiveTrue();
}
