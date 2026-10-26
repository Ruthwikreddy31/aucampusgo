package com.campusgo.backend.controllers;

import com.campusgo.backend.models.Shop;
import com.campusgo.backend.repositories.ShopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/shops")
@RequiredArgsConstructor
public class ShopController {

    private final ShopRepository shopRepository;

    @GetMapping
    public ResponseEntity<List<Shop>> getAllShops() {
        return ResponseEntity.ok(shopRepository.findByActiveTrue());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Shop> getShopById(@PathVariable Long id) {
        return shopRepository.findById(id)
                .filter(Shop::isActive)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Shop> createShop(@RequestBody Shop shop) {
        return ResponseEntity.ok(shopRepository.save(shop));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateShop(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        return shopRepository.findById(id).map(shop -> {
            if (payload.containsKey("name") && payload.get("name") != null) {
                shop.setName((String) payload.get("name"));
            }
            if (payload.containsKey("category") && payload.get("category") != null) {
                shop.setCategory((String) payload.get("category"));
            }
            if (payload.containsKey("description")) {
                shop.setDescription((String) payload.get("description"));
            }
            if (payload.containsKey("imageUrl")) {
                shop.setImageUrl((String) payload.get("imageUrl"));
            }
            if (payload.containsKey("preparationTime") && payload.get("preparationTime") != null) {
                shop.setPreparationTime(((Number) payload.get("preparationTime")).intValue());
            }
            if (payload.containsKey("location")) {
                shop.setLocation((String) payload.get("location"));
            }
            if (payload.containsKey("open") && payload.get("open") != null) {
                shop.setOpen(Boolean.TRUE.equals(payload.get("open")));
            }
            if (payload.containsKey("active") && payload.get("active") != null) {
                shop.setActive(Boolean.TRUE.equals(payload.get("active")));
            }
            return ResponseEntity.ok(shopRepository.save(shop));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteShop(@PathVariable Long id) {
        return shopRepository.findById(id).map(shop -> {
            shop.setActive(false);
            shopRepository.save(shop);
            return ResponseEntity.noContent().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
