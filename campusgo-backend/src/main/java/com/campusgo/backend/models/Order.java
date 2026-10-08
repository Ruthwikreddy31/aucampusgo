package com.campusgo.backend.models;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order extends BaseEntity {

    @Column(name = "order_number", unique = true)
    private String orderNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id")
    private Shop shop;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_agent_id")
    private DeliveryAgent deliveryAgent;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal deliveryFee = new BigDecimal("10.00");

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal platformFee = new BigDecimal("5.00");

    private Integer deadlineMinutes;

    private java.time.LocalDateTime deadlineAt;

    private Long selectedBidId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus orderStatus;

    @Builder.Default
    private String managerStatus = "PENDING"; // PENDING, ACCEPTED, REJECTED

    @Builder.Default
    private String preparationStatus = "NOT_STARTED"; // NOT_STARTED, PREPARING, READY_FOR_PICKUP

    @Builder.Default
    private String biddingStatus = "OPEN"; // OPEN, CLOSED, PARTNER_SELECTED

    private java.time.LocalDateTime biddingDeadline;

    private Long selectedDeliveryPartnerId;

    @Builder.Default
    private String deliveryStatus = "WAITING_FOR_BIDDING"; // WAITING_FOR_BIDDING, WAITING_FOR_PARTNER_CONFIRMATION, PARTNER_ASSIGNED, WAITING_FOR_PREPARATION, READY_FOR_PICKUP, PICKED_UP, OUT_FOR_DELIVERY, DELIVERED

    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "customer_phone")
    @Getter(AccessLevel.NONE)
    private String customerPhone;

    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getRawCustomerPhone() {
        return this.customerPhone;
    }

    public void setCustomerPhone(String customerPhone) {
        this.customerPhone = customerPhone;
    }

    public String getCustomerPhone() {
        return this.customerPhone;
    }

    @com.fasterxml.jackson.annotation.JsonGetter("customerPhone")
    public String getCustomerPhoneForJson() {
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof com.campusgo.backend.security.UserDetailsImpl userDetails) {
                boolean isOwner = this.getUser() != null && this.getUser().getId().equals(userDetails.getId());
                boolean isManagerOrAdmin = userDetails.getAuthorities().stream()
                        .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")
                                || a.getAuthority().equals("ROLE_MANAGER")
                                || a.getAuthority().equals("ROLE_STORE_STAFF")
                                || a.getAuthority().equals("ROLE_CANTEEN_MEMBER"));
                boolean isAssignedPartner = (this.getDeliveryAgent() != null
                        && this.getDeliveryAgent().getUser() != null
                        && this.getDeliveryAgent().getUser().getId().equals(userDetails.getId()))
                        || (this.getSelectedDeliveryPartnerId() != null
                        && this.getSelectedDeliveryPartnerId().equals(userDetails.getId()));

                if (isOwner || isManagerOrAdmin || isAssignedPartner) {
                    return this.customerPhone != null ? this.customerPhone : (this.getUser() != null ? this.getUser().getPhone() : null);
                }
            }
        } catch (Exception ignored) {
        }
        return "Hidden";
    }

    @Column(nullable = false)
    private String deliveryLocation;

    private String deliveryInstructions;

    @Column(name = "delivery_deadline")
    private String deliveryDeadline;

    @Column(name = "delivery_latitude")
    private Double deliveryLatitude;

    @Column(name = "delivery_longitude")
    private Double deliveryLongitude;

    @Column(nullable = false)
    private String paymentMethod;

    @Builder.Default
    private String paymentStatus = "PENDING";

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal discount = BigDecimal.ZERO;

    private Double latitude;
    private Double longitude;

    @Column(length = 10)
    private String pickupVerificationCode;

    private java.time.LocalDateTime pickupVerifiedAt;

    @Column(length = 10)
    @Getter(AccessLevel.NONE)
    private String deliveryOtp;

    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getDeliveryOtp() {
        return this.deliveryOtp;
    }

    @com.fasterxml.jackson.annotation.JsonGetter("deliveryOtp")
    public String getDeliveryOtpForJson() {
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof com.campusgo.backend.security.UserDetailsImpl userDetails) {
                boolean isOwner = this.getUser() != null && this.getUser().getId().equals(userDetails.getId());
                boolean isManagerOrAdmin = userDetails.getAuthorities().stream()
                        .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")
                                || a.getAuthority().equals("ROLE_MANAGER")
                                || a.getAuthority().equals("ROLE_STORE_STAFF")
                                || a.getAuthority().equals("ROLE_CANTEEN_MEMBER"));
                if (isOwner || isManagerOrAdmin) {
                    return this.deliveryOtp;
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    @Builder.Default
    private Boolean deliveryOtpVerified = false;

    private String deliveryProofPath;

    private java.time.LocalDateTime deliveredAt;

    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
    }

    public void removeItem(OrderItem item) {
        items.remove(item);
        item.setOrder(null);
    }
}
