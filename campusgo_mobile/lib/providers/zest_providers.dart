import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/zest_models.dart';
import '../services/zest_api_service.dart';

final apiServiceProvider = Provider<ZestApiService>((ref) {
  return ZestApiService();
});

final orderTrackingProvider = FutureProvider.family<Map<String, dynamic>, int>((ref, orderId) async {
  final api = ref.watch(apiServiceProvider);
  return api.getOrderTracking(orderId);
});

final topBidsProvider = FutureProvider.family<List<DeliveryBidModel>, int>((ref, requestId) async {
  final api = ref.watch(apiServiceProvider);
  return api.getTop5Bids(requestId);
});

final dailyFeeProvider = FutureProvider.family<Map<String, dynamic>, int>((ref, partnerId) async {
  final api = ref.watch(apiServiceProvider);
  return api.getDailyFeeStatus(partnerId);
});
