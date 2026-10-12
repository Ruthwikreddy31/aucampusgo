package com.campusgo.backend.payload.request;

import lombok.Getter;
import lombok.Setter;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

@Getter
@Setter
public class OrderItemRequest {
    @NotNull
    @Min(1)
    private Long productId;

    @NotNull
    @Min(1)
    @Max(99)
    private Integer quantity;
}
