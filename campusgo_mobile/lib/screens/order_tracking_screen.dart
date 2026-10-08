import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/zest_providers.dart';

class OrderTrackingScreen extends ConsumerStatefulWidget {
  final int orderId;
  const OrderTrackingScreen({Key? key, required this.orderId}) : super(key: key);

  @override
  ConsumerState<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends ConsumerState<OrderTrackingScreen> {
  Timer? _timer;
  int _remainingSeconds = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 2), (timer) {
      ref.refresh(orderTrackingProvider(widget.orderId));
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Widget _buildStatusTimeline(String currentStatus) {
    final steps = [
      {'status': 'PLACED', 'label': 'Order Placed'},
      {'status': 'ACCEPTED', 'label': 'Accepted'},
      {'status': 'PREPARING', 'label': 'Preparing'},
      {'status': 'PACKED', 'label': 'Packed'},
      {'status': 'READY_FOR_PICKUP', 'label': 'Ready for Pickup'},
      {'status': 'DELIVERY_ASSIGNED', 'label': 'Partner Assigned'},
      {'status': 'PICKED_UP', 'label': 'Picked Up'},
      {'status': 'OUT_FOR_DELIVERY', 'label': 'Out for Delivery'},
      {'status': 'DELIVERED', 'label': 'Delivered'},
    ];

    int currentIndex = steps.indexWhere((s) => s['status'] == currentStatus);
    if (currentIndex == -1) currentIndex = 0;

    return Column(
      children: List.generate(steps.length, (index) {
        final step = steps[index];
        final isCompleted = index <= currentIndex;
        final isCurrent = index == currentIndex;

        return Row(
          children: [
            Column(
              children: [
                Icon(
                  isCompleted ? Icons.check_circle : Icons.radio_button_unchecked,
                  color: isCompleted ? const Color(0xFF10B981) : Colors.grey,
                  size: 20,
                ),
                if (index < steps.length - 1)
                  Container(
                    width: 2,
                    height: 24,
                    color: isCompleted ? const Color(0xFF10B981) : Colors.grey.shade300,
                  ),
              ],
            ),
            const SizedBox(width: 12),
            Text(
              step['label']!,
              style: TextStyle(
                fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                color: isCompleted ? Colors.black : Colors.grey,
                fontSize: 14,
              ),
            ),
          ],
        );
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final trackingAsync = ref.watch(orderTrackingProvider(widget.orderId));

    return Scaffold(
      appBar: AppBar(
        title: Text('Track Order #${widget.orderId}', style: const TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: trackingAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: Color(0xFF10B981))),
        error: (err, stack) => Center(child: Text('Error loading tracking info: $err')),
        data: (data) {
          final orderStatus = data['orderStatus'] ?? 'PLACED';
          final remainingSecs = data['remainingSeconds'] ?? 0;
          final deadlineStatus = data['deadlineStatus'] ?? 'On Time';
          final deliveryOtp = data['deliveryOtp'];
          final partner = data['deliveryPartner'];

          final mins = (remainingSecs / 60).floor();
          final secs = remainingSecs % 60;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Server Countdown Timer Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: deadlineStatus == 'Deadline Exceeded' ? Colors.red.shade50 : const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: deadlineStatus == 'Deadline Exceeded' ? Colors.red.shade200 : const Color(0xFFA7F3D0)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Delivery Deadline: ${data['deadlineMinutes'] ?? 5} min', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          const SizedBox(height: 4),
                          Text('Status: $deadlineStatus', style: TextStyle(color: deadlineStatus == 'Deadline Exceeded' ? Colors.red : const Color(0xFF047857), fontWeight: FontWeight.bold, fontSize: 12)),
                        ],
                      ),
                      Text(
                        '${mins < 10 ? '0$mins' : mins}:${secs < 10 ? '0$secs' : secs}',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.black,
                          color: deadlineStatus == 'Deadline Exceeded' ? Colors.red : const Color(0xFF047857),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Handover OTP Card
                if (deliveryOtp != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFCBD5E1)),
                    ),
                    child: Column(
                      children: [
                        const Text('HANDOVER DELIVERY OTP', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1, color: Color(0xFF475569))),
                        const SizedBox(height: 6),
                        Text(
                          '$deliveryOtp',
                          style: const TextStyle(fontSize: 32, fontWeight: FontWeight.black, letterSpacing: 8, color: Color(0xFF6C3CE9)),
                        ),
                        const SizedBox(height: 4),
                        const Text('Share this 4-digit code with courier upon handover', style: TextStyle(fontSize: 11, color: Colors.grey)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Assigned Delivery Partner Card
                if (partner != null) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Assigned Delivery Partner', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            const CircleAvatar(
                              backgroundColor: Color(0xFF10B981),
                              child: Icon(Icons.two_wheeler, color: Colors.white),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(partner['name'] ?? 'Courier Partner', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                  Text('⭐ ${partner['rating']} (${partner['completedDeliveries']} deliveries)', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text('₹${partner['bidAmount']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF10B981))),
                                Text('${partner['estimatedDeliveryTimeMinutes']}m ETA', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],

                // Order Status Timeline
                const Text('ORDER STATUS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.extrabold, letterSpacing: 1, color: Colors.grey)),
                const SizedBox(height: 12),
                _buildStatusTimeline(orderStatus),
              ],
            ),
          );
        },
      ),
    );
  }
}
