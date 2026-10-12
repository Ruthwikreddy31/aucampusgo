package com.campusgo.backend.payload.request;

import lombok.Getter;
import lombok.Setter;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

@Getter
@Setter
public class CreateOrderRequest {
    @NotBlank
    @Size(max = 80)
    private String customerName;

    @NotBlank
    @Pattern(regexp = "^[0-9+\\-\\s()]{7,20}$", message = "Invalid phone number")
    private String customerPhone;

    @NotBlank
    @Size(max = 240)
    private String deliveryLocation;

    @Size(max = 500)
    private String deliveryInstructions;

    @Size(max = 80)
    private String deliveryDeadline;

    @NotBlank
    @Size(max = 40)
    private String paymentMethod;
    private Integer deadlineMinutes;

    @DecimalMin("-90.0")
    @DecimalMax("90.0")
    private Double latitude;

    @DecimalMin("-180.0")
    @DecimalMax("180.0")
    private Double longitude;

    @Valid
    @NotEmpty
    @Size(max = 50)
    private List<OrderItemRequest> items;
}
