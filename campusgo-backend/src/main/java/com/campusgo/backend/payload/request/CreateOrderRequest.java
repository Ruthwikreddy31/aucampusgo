package com.campusgo.backend.payload.request;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class CreateOrderRequest {
    private String customerName;
    private String customerPhone;
    private String deliveryLocation;
    private String deliveryInstructions;
    private String deliveryDeadline;
    private String paymentMethod;
    private Integer deadlineMinutes;
    private Double latitude;
    private Double longitude;
    private List<OrderItemRequest> items;
}
