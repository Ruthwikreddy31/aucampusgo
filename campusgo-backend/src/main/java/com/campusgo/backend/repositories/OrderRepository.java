package com.campusgo.backend.repositories;

import com.campusgo.backend.models.Order;
import com.campusgo.backend.models.OrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Order> findByShopIdOrderByCreatedAtDesc(Long shopId);
    List<Order> findByDeliveryAgentIdOrderByCreatedAtDesc(Long agentId);
    List<Order> findByDeliveryAgentUserIdOrderByCreatedAtDesc(Long userId);
    List<Order> findByOrderStatusInOrderByCreatedAtDesc(List<OrderStatus> statuses);
    List<Order> findByCreatedAtAfter(LocalDateTime dateTime);
    java.util.Optional<Order> findByOrderNumber(String orderNumber);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.id = :id")
    Optional<Order> findByIdForUpdate(Long id);
    long countByDeliveryAgentUserIdAndOrderStatus(Long userId, OrderStatus status);
    long countByDeliveryAgentIdAndOrderStatus(Long agentId, OrderStatus status);

    @Query("select o from Order o where o.biddingStatus = 'OPEN' order by o.createdAt desc")
    List<Order> findAllOpenBiddingOrders();

    @Query("select o from Order o where o.selectedDeliveryPartnerId = :partnerId and o.orderStatus not in ('DELIVERED','CANCELLED','REJECTED') order by o.createdAt desc")
    List<Order> findBySelectedDeliveryPartnerIdAndActiveStatus(Long partnerId);
}
