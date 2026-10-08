import 'dart:convert';

class OrderModel {
  final int id;
  final String orderNumber;
  final String orderStatus;
  final int? deadlineMinutes;
  final DateTime? deadlineAt;
  final double totalAmount;
  final double subtotal;
  final double deliveryFee;
  final double platformFee;
  final String deliveryLocation;
  final String? deliveryOtp;
  final bool deliveryOtpVerified;
  final int? selectedBidId;
  final DeliveryAgentModel? deliveryAgent;

  OrderModel({
    required this.id,
    required this.orderNumber,
    required this.orderStatus,
    this.deadlineMinutes,
    this.deadlineAt,
    required this.totalAmount,
    required this.subtotal,
    required this.deliveryFee,
    required this.platformFee,
    required this.deliveryLocation,
    this.deliveryOtp,
    this.deliveryOtpVerified = false,
    this.selectedBidId,
    this.deliveryAgent,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    return OrderModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      orderNumber: json['orderNumber'] ?? '',
      orderStatus: json['orderStatus'] ?? 'PLACED',
      deadlineMinutes: json['deadlineMinutes'],
      deadlineAt: json['deadlineAt'] != null ? DateTime.tryParse(json['deadlineAt']) : null,
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0.0,
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0.0,
      deliveryFee: (json['deliveryFee'] as num?)?.toDouble() ?? 15.0,
      platformFee: (json['platformFee'] as num?)?.toDouble() ?? 5.0,
      deliveryLocation: json['deliveryLocation'] ?? '',
      deliveryOtp: json['deliveryOtp'],
      deliveryOtpVerified: json['deliveryOtpVerified'] ?? false,
      selectedBidId: json['selectedBidId'],
      deliveryAgent: json['deliveryAgent'] != null ? DeliveryAgentModel.fromJson(json['deliveryAgent']) : null,
    );
  }
}

class DeliveryAgentModel {
  final int id;
  final String name;
  final String phone;
  final double rating;

  DeliveryAgentModel({
    required this.id,
    required this.name,
    required this.phone,
    this.rating = 4.8,
  });

  factory DeliveryAgentModel.fromJson(Map<String, dynamic> json) {
    return DeliveryAgentModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      name: json['name'] ?? (json['user'] != null ? json['user']['name'] : 'Campus Courier'),
      phone: json['phone'] ?? '+91 98480 22334',
      rating: (json['rating'] as num?)?.toDouble() ?? 4.8,
    );
  }
}

class DeliveryRequestModel {
  final int id;
  final int orderId;
  final int deadlineMinutes;
  final DateTime deadlineAt;
  final DateTime bidEndAt;
  final String status;
  final List<DeliveryBidModel> bids;

  DeliveryRequestModel({
    required this.id,
    required this.orderId,
    required this.deadlineMinutes,
    required this.deadlineAt,
    required this.bidEndAt,
    required this.status,
    required this.bids,
  });

  factory DeliveryRequestModel.fromJson(Map<String, dynamic> json) {
    var bidsList = <DeliveryBidModel>[];
    if (json['bids'] != null) {
      bidsList = (json['bids'] as List).map((i) => DeliveryBidModel.fromJson(i)).toList();
    }
    return DeliveryRequestModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      orderId: json['orderId'] is int ? json['orderId'] : int.parse(json['orderId'].toString()),
      deadlineMinutes: json['deadlineMinutes'] ?? 5,
      deadlineAt: json['deadlineAt'] != null ? DateTime.parse(json['deadlineAt']) : DateTime.now().add(const Duration(minutes: 5)),
      bidEndAt: json['bidEndAt'] != null ? DateTime.parse(json['bidEndAt']) : DateTime.now().add(const Duration(seconds: 30)),
      status: json['status'] ?? 'OPEN',
      bids: bidsList,
    );
  }
}

class DeliveryBidModel {
  final int id;
  final int requestId;
  final int orderId;
  final int deliveryPartnerId;
  final String deliveryPartnerName;
  final double rating;
  final int completedDeliveries;
  final double amount;
  final int estimatedPickupTimeMinutes;
  final int estimatedDeliveryTimeMinutes;
  final String status;

  DeliveryBidModel({
    required this.id,
    required this.requestId,
    required this.orderId,
    required this.deliveryPartnerId,
    required this.deliveryPartnerName,
    required this.rating,
    required this.completedDeliveries,
    required this.amount,
    required this.estimatedPickupTimeMinutes,
    required this.estimatedDeliveryTimeMinutes,
    required this.status,
  });

  factory DeliveryBidModel.fromJson(Map<String, dynamic> json) {
    return DeliveryBidModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      requestId: json['requestId'] is int ? json['requestId'] : int.parse(json['requestId'].toString()),
      orderId: json['orderId'] is int ? json['orderId'] : int.parse(json['orderId'].toString()),
      deliveryPartnerId: json['deliveryPartnerId'] is int ? json['deliveryPartnerId'] : int.parse(json['deliveryPartnerId'].toString()),
      deliveryPartnerName: json['deliveryPartnerName'] ?? 'Campus Courier',
      rating: (json['rating'] as num?)?.toDouble() ?? 4.8,
      completedDeliveries: json['completedDeliveries'] ?? 45,
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      estimatedPickupTimeMinutes: json['estimatedPickupTimeMinutes'] ?? 2,
      estimatedDeliveryTimeMinutes: json['estimatedDeliveryTimeMinutes'] ?? 5,
      status: json['status'] ?? 'ACTIVE',
    );
  }
}

class DeliveryAssignmentModel {
  final int id;
  final int orderId;
  final int deliveryPartnerId;
  final int bidId;
  final DateTime assignedAt;
  final DateTime expiresAt;
  final String status;

  DeliveryAssignmentModel({
    required this.id,
    required this.orderId,
    required this.deliveryPartnerId,
    required this.bidId,
    required this.assignedAt,
    required this.expiresAt,
    required this.status,
  });

  factory DeliveryAssignmentModel.fromJson(Map<String, dynamic> json) {
    return DeliveryAssignmentModel(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      orderId: json['orderId'] is int ? json['orderId'] : int.parse(json['orderId'].toString()),
      deliveryPartnerId: json['deliveryPartnerId'] is int ? json['deliveryPartnerId'] : int.parse(json['deliveryPartnerId'].toString()),
      bidId: json['bidId'] is int ? json['bidId'] : int.parse(json['bidId'].toString()),
      assignedAt: json['assignedAt'] != null ? DateTime.parse(json['assignedAt']) : DateTime.now(),
      expiresAt: json['expiresAt'] != null ? DateTime.parse(json['expiresAt']) : DateTime.now().add(const Duration(seconds: 15)),
      status: json['status'] ?? 'PENDING_CONFIRMATION',
    );
  }
}
