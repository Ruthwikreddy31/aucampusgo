package com.campusgo.backend.controllers;

import com.campusgo.backend.models.Cart;
import com.campusgo.backend.models.CartItem;
import com.campusgo.backend.payload.request.CartItemRequest;
import com.campusgo.backend.payload.request.UpdateCartItemRequest;
import com.campusgo.backend.security.UserDetailsImpl;
import com.campusgo.backend.services.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getCart(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        Cart cart = cartService.getOrCreateCart(userDetails.getId());
        return ResponseEntity.ok(toCartResponse(cart));
    }

    @PostMapping("/items")
    public ResponseEntity<Map<String, Object>> addItem(
            @Valid @RequestBody CartItemRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        CartItem item = cartService.addItem(userDetails.getId(), request.getProductId(), request.getQuantity());
        return ResponseEntity.ok(toCartItemResponse(item));
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<Map<String, Object>> updateItem(
            @PathVariable Long itemId,
            @Valid @RequestBody UpdateCartItemRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        CartItem item = cartService.updateItem(userDetails.getId(), itemId, request.getQuantity());
        return ResponseEntity.ok(toCartItemResponse(item));
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<Void> removeItem(
            @PathVariable Long itemId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        cartService.removeItem(userDetails.getId(), itemId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> clearCart(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        cartService.clearCart(userDetails.getId());
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> toCartResponse(Cart cart) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", cart.getId());
        response.put("userId", cart.getUser().getId());
        response.put("items", cart.getItems().stream().map(this::toCartItemResponse).toList());
        response.put("createdAt", cart.getCreatedAt());
        response.put("updatedAt", cart.getUpdatedAt());
        return response;
    }

    private Map<String, Object> toCartItemResponse(CartItem item) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", item.getId());
        response.put("cartId", item.getCart().getId());
        response.put("productId", item.getProduct().getId());
        response.put("quantity", item.getQuantity());
        response.put("price", item.getPrice());
        response.put("product", toProductResponse(item.getProduct()));
        return response;
    }

    private Map<String, Object> toProductResponse(com.campusgo.backend.models.Product product) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", product.getId());
        response.put("shopId", product.getShop().getId());
        response.put("name", product.getName());
        response.put("description", product.getDescription());
        response.put("price", product.getPrice());
        response.put("imageUrl", product.getImageUrl());
        response.put("available", product.isAvailable());
        response.put("active", product.isActive());
        response.put("category", product.getCategory());
        response.put("shop", Map.of(
                "id", product.getShop().getId(),
                "name", product.getShop().getName(),
                "category", product.getShop().getCategory()
        ));
        return response;
    }
}
