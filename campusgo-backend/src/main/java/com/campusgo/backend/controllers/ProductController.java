package com.campusgo.backend.controllers;

import com.campusgo.backend.models.Product;
import com.campusgo.backend.models.Shop;
import com.campusgo.backend.repositories.ProductRepository;
import com.campusgo.backend.repositories.ShopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductRepository productRepository;
    private final ShopRepository shopRepository;

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

    @PostMapping
    public ResponseEntity<?> createProduct(@RequestBody Map<String, Object> payload) {
        try {
            String name = (String) payload.get("name");
            if (name == null || name.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Product name is required"));
            }

            Number shopIdNum = (Number) payload.get("shopId");
            Shop shop = null;
            if (shopIdNum != null) {
                shop = shopRepository.findById(shopIdNum.longValue()).orElse(null);
            }
            if (shop == null) {
                List<Shop> allShops = shopRepository.findByActiveTrue();
                if (!allShops.isEmpty()) {
                    shop = allShops.get(0);
                } else {
                    return ResponseEntity.badRequest().body(Map.of("message", "No shop available"));
                }
            }

            BigDecimal price = BigDecimal.ZERO;
            if (payload.get("price") != null) {
                price = new BigDecimal(payload.get("price").toString());
            }

            String category = "Food";
            Object catObj = payload.get("category");
            if (catObj instanceof String s && !s.isBlank()) {
                category = s;
            } else if (catObj instanceof Map<?, ?> m && m.get("name") != null) {
                category = m.get("name").toString();
            }

            Product product = Product.builder()
                    .name(name.trim())
                    .description((String) payload.get("description"))
                    .price(price)
                    .category(category)
                    .imageUrl((String) payload.get("imageUrl"))
                    .shop(shop)
                    .available(payload.containsKey("available") ? Boolean.TRUE.equals(payload.get("available")) : true)
                    .active(payload.containsKey("active") ? Boolean.TRUE.equals(payload.get("active")) : true)
                    .stock(payload.containsKey("stock") && payload.get("stock") != null ? ((Number) payload.get("stock")).intValue() : 100)
                    .build();

            Product saved = productRepository.save(product);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProduct(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        return productRepository.findById(id).map(product -> {
            if (payload.containsKey("name") && payload.get("name") != null) {
                product.setName(((String) payload.get("name")).trim());
            }
            if (payload.containsKey("description")) {
                product.setDescription((String) payload.get("description"));
            }
            if (payload.containsKey("price") && payload.get("price") != null) {
                product.setPrice(new BigDecimal(payload.get("price").toString()));
            }
            if (payload.containsKey("imageUrl")) {
                product.setImageUrl((String) payload.get("imageUrl"));
            }
            if (payload.containsKey("category")) {
                Object catObj = payload.get("category");
                if (catObj instanceof String s) {
                    product.setCategory(s);
                } else if (catObj instanceof Map<?, ?> m && m.get("name") != null) {
                    product.setCategory(m.get("name").toString());
                }
            }
            if (payload.containsKey("available") && payload.get("available") != null) {
                product.setAvailable(Boolean.TRUE.equals(payload.get("available")));
            }
            if (payload.containsKey("active") && payload.get("active") != null) {
                product.setActive(Boolean.TRUE.equals(payload.get("active")));
            }
            if (payload.containsKey("stock") && payload.get("stock") != null) {
                product.setStock(((Number) payload.get("stock")).intValue());
            }
            if (payload.containsKey("shopId") && payload.get("shopId") != null) {
                Long sId = ((Number) payload.get("shopId")).longValue();
                shopRepository.findById(sId).ifPresent(product::setShop);
            }

            Product updated = productRepository.save(product);
            return ResponseEntity.ok(updated);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable Long id) {
        return productRepository.findById(id).map(product -> {
            product.setActive(false);
            productRepository.save(product);
            return ResponseEntity.noContent().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
