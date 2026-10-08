import 'package:dio/dio.dart';
import '../models/zest_models.dart';

class ZestApiService {
  final Dio _dio;

  ZestApiService({String baseUrl = 'http://localhost:8080'})
      : _dio = Dio(BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
          headers: {'Content-Type': 'application/json'},
        ));

  void setAuthToken(String token) {
    _dio.options.headers['Authorization'] = 'Bearer $token';
  }

  Future<DeliveryRequestModel> createDeliveryRequest(int orderId, int deadlineMinutes) async {
    final response = await _dio.post(
      '/api/bidding/orders/$orderId/request',
      data: {'deadlineMinutes': deadlineMinutes},
    );
    return DeliveryRequestModel.fromJson(response.data);
  }

  Future<List<DeliveryBidModel>> getTop5Bids(int requestId) async {
    final response = await _dio.get('/api/bidding/requests/$requestId/top-bids');
    final List list = response.data;
    return list.map((item) => DeliveryBidModel.fromJson(item)).toList();
  }

  Future<DeliveryBidModel> submitBid({
    required int requestId,
    required double amount,
    int estPickup = 3,
    int estDelivery = 5,
  }) async {
    final response = await _dio.post(
      '/api/bidding/requests/$requestId/bids',
      data: {
        'amount': amount,
        'estimatedPickupTimeMinutes': estPickup,
        'estimatedDeliveryTimeMinutes': estDelivery,
      },
    );
    return DeliveryBidModel.fromJson(response.data);
  }

  Future<DeliveryAssignmentModel> selectPartner(int requestId, int bidId) async {
    final response = await _dio.post(
      '/api/bidding/requests/$requestId/select-bid/$bidId',
    );
    return DeliveryAssignmentModel.fromJson(response.data);
  }

  Future<OrderModel> confirmAssignment(int assignmentId) async {
    final response = await _dio.post(
      '/api/delivery-assignments/$assignmentId/accept',
    );
    return OrderModel.fromJson(response.data);
  }

  Future<List<OrderModel>> getManagerOrders() async {
    final response = await _dio.get('/api/manager/orders');
    final List list = response.data;
    return list.map((item) => OrderModel.fromJson(item)).toList();
  }

  Future<OrderModel> acceptManagerOrder(int orderId) async {
    final response = await _dio.post('/api/manager/orders/$orderId/accept');
    return OrderModel.fromJson(response.data);
  }

  Future<OrderModel> updateManagerOrderStatus(int orderId, String action) async {
    final response = await _dio.post('/api/manager/orders/$orderId/$action');
    return OrderModel.fromJson(response.data);
  }

  Future<Map<String, dynamic>> getOrderTracking(int orderId) async {
    final response = await _dio.get('/api/orders/$orderId/tracking');
    return response.data;
  }

  Future<bool> verifyDeliveryOtp(int orderId, String otp) async {
    final response = await _dio.post(
      '/api/delivery/orders/$orderId/verify-otp',
      data: {'otp': otp},
    );
    return response.data['success'] == true;
  }

  Future<void> updatePartnerLocation(int orderId, double lat, double lng) async {
    await _dio.post(
      '/api/delivery/location',
      data: {
        'orderId': orderId,
        'latitude': lat,
        'longitude': lng,
      },
    );
  }

  Future<Map<String, dynamic>> getDailyFeeStatus(int partnerId) async {
    final response = await _dio.get('/api/wallet/partner/$partnerId/daily-fee-status');
    return response.data;
  }

  Future<Map<String, dynamic>> payDailyFee(int partnerId) async {
    final response = await _dio.post('/api/wallet/partner/$partnerId/pay-daily-fee');
    return response.data;
  }
}
