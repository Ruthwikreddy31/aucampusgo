package com.campusgo.backend.controllers;

import com.campusgo.backend.models.Product;
import com.campusgo.backend.repositories.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductRepository productRepository;

    @GetMapping
    public ResponseEntity<List<Product>> getAllProducts() {
        return ResponseEntity.ok(productRepository.findByActiveTrue());
    }

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<List<Product>> getProductsByShop(@PathVariable Long shopId) {
        return ResponseEntity.ok(productRepository.findByShopIdAndActiveTrue(shopId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProductById(@PathVariable Long id) {
        return productRepository.findById(id)
                .filter(Product::isActive)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/suggested")
    public ResponseEntity<List<Product>> getSuggestedProducts(
            @RequestParam(value = "excludeIds", required = false) List<Long> excludeIds) {
        List<Product> allActive = productRepository.findByActiveTrue();
        if (excludeIds != null && !excludeIds.isEmpty()) {
            return ResponseEntity.ok(
                    allActive.stream()
                            .filter(p -> !excludeIds.contains(p.getId()))
                            .limit(8)
                            .toList()
            );
        }
        return ResponseEntity.ok(allActive.stream().limit(8).toList());
    }
}

