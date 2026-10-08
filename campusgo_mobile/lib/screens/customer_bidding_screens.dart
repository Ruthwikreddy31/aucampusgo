import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/zest_models.dart';
import '../providers/zest_providers.dart';

class DeadlineSelectionWidget extends StatefulWidget {
  final Function(int minutes) onSelected;
  const DeadlineSelectionWidget({Key? key, required this.onSelected}) : super(key: key);

  @override
  State<DeadlineSelectionWidget> createState() => _DeadlineSelectionWidgetState();
}

class _DeadlineSelectionWidgetState extends State<DeadlineSelectionWidget> {
  int _selectedMins = 5;

  final List<Map<String, dynamic>> _options = [
    {'mins': 5, 'label': '5 Minutes', 'badge': '⚡ Express'},
    {'mins': 10, 'label': '10 Minutes', 'badge': '🚀 Fast'},
    {'mins': 15, 'label': '15 Minutes', 'badge': '🕒 Standard'},
    {'mins': 20, 'label': '20 Minutes', 'badge': '📦 Regular'},
    {'mins': 30, 'label': '30 Minutes', 'badge': '🍵 Flexible'},
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              Text(
                'How quickly do you need delivery?',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              Chip(
                label: Text('ZestModel', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                backgroundColor: Color(0xFF6C3CE9),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _options.map((opt) {
              final isSelected = _selectedMins == opt['mins'];
              return ChoiceChip(
                label: Text('${opt['label']} (${opt['badge']})'),
                selected: isSelected,
                selectedColor: const Color(0xFF10B981).withOpacity(0.2),
                backgroundColor: Colors.grey.shade100,
                labelStyle: TextStyle(
                  color: isSelected ? const Color(0xFF047857) : Colors.black87,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
                onSelected: (selected) {
                  if (selected) {
                    setState(() => _selectedMins = opt['mins']);
                    widget.onSelected(opt['mins']);
                  }
                },
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

class LiveBidsScreen extends ConsumerStatefulWidget {
  final int requestId;
  final int deadlineMinutes;
  final Function(DeliveryBidModel bid) onPartnerSelected;

  const LiveBidsScreen({
    Key? key,
    required this.requestId,
    required this.deadlineMinutes,
    required this.onPartnerSelected,
  }) : super(key: key);

  @override
  ConsumerState<LiveBidsScreen> createState() => _LiveBidsScreenState();
}

class _LiveBidsScreenState extends ConsumerState<LiveBidsScreen> {
  int _secondsRemaining = 30;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_secondsRemaining > 0) {
        setState(() => _secondsRemaining--);
      } else {
        _timer?.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _confirmAndSelect(DeliveryBidModel bid) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Text('Confirm Delivery Partner'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(bid.deliveryPartnerName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('⭐ Rating: ${bid.rating} (${bid.completedDeliveries} deliveries)'),
            Text('💰 Delivery Fee: ₹${bid.amount.toStringAsFixed(0)}'),
            Text('⏱️ Est. Delivery: ${bid.estimatedDeliveryTimeMinutes} minutes'),
            const SizedBox(height: 12),
            const Text(
              'Are you sure you want to select this delivery partner?',
              style: TextStyle(color: Colors.grey, fontSize: 13),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              widget.onPartnerSelected(bid);
            },
            child: const Text('Confirm Selection', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bidsAsync = ref.watch(topBidsProvider(widget.requestId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Delivery Bids', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
      ),
      body: Container(
        color: const Color(0xFF0F172A),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.amber.withOpacity(0.3)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Delivery Deadline: ${widget.deadlineMinutes} minutes',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _secondsRemaining > 0 ? 'Collecting bids from campus partners...' : 'Bidding closed • Top 5 Shortlisted',
                        style: const TextStyle(color: Colors.grey, fontSize: 12),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.amber),
                    ),
                    child: Text(
                      '00:${_secondsRemaining < 10 ? '0$_secondsRemaining' : _secondsRemaining}',
                      style: const TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'TOP 5 LOWEST BIDS',
              style: TextStyle(color: Color(0xFF10B981), fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 1),
            ),
            const SizedBox(height: 10),
            Expanded(
              child: bidsAsync.when(
                loading: () => const Center(child: CircularProgressIndicator(color: Color(0xFF10B981))),
                error: (err, stack) => Center(child: Text('Error loading bids: $err', style: const TextStyle(color: Colors.red))),
                data: (bids) {
                  if (bids.isEmpty) {
                    return const Center(
                      child: Text('No bids submitted yet. Please wait...', style: TextStyle(color: Colors.white70)),
                    );
                  }
                  return ListView.builder(
                    itemCount: bids.length,
                    itemBuilder: (ctx, index) {
                      final bid = bids[index];
                      final isFirst = index == 0;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: isFirst ? const Color(0xFF10B981) : const Color(0xFF334155), width: isFirst ? 2 : 1),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              backgroundColor: const Color(0xFF334155),
                              child: Text('#${index + 1}', style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(bid.deliveryPartnerName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                                      if (isFirst) ...[
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(color: const Color(0xFF10B981), borderRadius: BorderRadius.circular(6)),
                                          child: const Text('Lowest', style: TextStyle(color: Colors.black, fontSize: 10, fontWeight: FontWeight.bold)),
                                        ),
                                      ],
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '⭐ ${bid.rating} • ${bid.completedDeliveries} deliveries • ETA ${bid.estimatedDeliveryTimeMinutes}m',
                                    style: const TextStyle(color: Colors.grey, fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text('₹${bid.amount.toStringAsFixed(0)}', style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.black, fontSize: 20)),
                                const SizedBox(height: 6),
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF10B981),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  ),
                                  onPressed: () => _confirmAndSelect(bid),
                                  child: const Text('Select', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 12)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
