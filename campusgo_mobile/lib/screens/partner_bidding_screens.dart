import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/zest_providers.dart';

class PartnerBidSubmissionWidget extends StatefulWidget {
  final int requestId;
  final int orderId;
  final int deadlineMinutes;
  final Function(double amount, int estPickup, int estDelivery) onSubmitBid;

  const PartnerBidSubmissionWidget({
    Key? key,
    required this.requestId,
    required this.orderId,
    required this.deadlineMinutes,
    required this.onSubmitBid,
  }) : super(key: key);

  @override
  State<PartnerBidSubmissionWidget> createState() => _PartnerBidSubmissionWidgetState();
}

class _PartnerBidSubmissionWidgetState extends State<PartnerBidSubmissionWidget> {
  final TextEditingController _amountController = TextEditingController(text: '25');
  int _estPickup = 2;
  int _estDelivery = 5;

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
            children: [
              Text('NEW DELIVERY REQUEST #${widget.orderId}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              Chip(
                label: Text('${widget.deadlineMinutes} MIN DEADLINE', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                backgroundColor: const Color(0xFF10B981),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text('Submit your delivery fee (₹):', style: TextStyle(color: Colors.grey, fontSize: 13)),
          const SizedBox(height: 6),
          TextField(
            controller: _amountController,
            keyboardType: TextInputType.number,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
            decoration: InputDecoration(
              prefixText: '₹ ',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              filled: true,
              fillColor: const Color(0xFFF8FAFC),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Pickup ETA (mins)', style: TextStyle(fontSize: 11, color: Colors.grey)),
                    DropdownButton<int>(
                      value: _estPickup,
                      isExpanded: true,
                      items: [1, 2, 3, 4, 5].map((val) => DropdownMenuItem(value: val, child: Text('$val min'))).toList(),
                      onChanged: (val) => setState(() => _estPickup = val!),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Delivery ETA (mins)', style: TextStyle(fontSize: 11, color: Colors.grey)),
                    DropdownButton<int>(
                      value: _estDelivery,
                      isExpanded: true,
                      items: [3, 4, 5, 8, 10, 15].map((val) => DropdownMenuItem(value: val, child: Text('$val min'))).toList(),
                      onChanged: (val) => setState(() => _estDelivery = val!),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () {
                final amt = double.tryParse(_amountController.text) ?? 25.0;
                widget.onSubmitBid(amt, _estPickup, _estDelivery);
              },
              child: const Text('SUBMIT SEALED BID', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
            ),
          ),
        ],
      ),
    );
  }
}

class AssignmentConfirmationDialog extends StatefulWidget {
  final int assignmentId;
  final int orderId;
  final double bidAmount;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  const AssignmentConfirmationDialog({
    Key? key,
    required this.assignmentId,
    required this.orderId,
    required this.bidAmount,
    required this.onAccept,
    required this.onReject,
  }) : super(key: key);

  @override
  State<AssignmentConfirmationDialog> createState() => _AssignmentConfirmationDialogState();
}

class _AssignmentConfirmationDialogState extends State<AssignmentConfirmationDialog> {
  int _secondsLeft = 15;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_secondsLeft > 0) {
        setState(() => _secondsLeft--);
      } else {
        _timer?.cancel();
        widget.onReject();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      title: const Text('DELIVERY ASSIGNMENT! 🎉', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Customer selected your bid of ₹${widget.bidAmount.toStringAsFixed(0)} for Order #${widget.orderId}.'),
          const SizedBox(height: 16),
          Text(
            'Confirm within 00:${_secondsLeft < 10 ? '0$_secondsLeft' : _secondsLeft}s',
            style: const TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 20),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: widget.onReject,
          child: const Text('Reject', style: TextStyle(color: Colors.red)),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
          onPressed: widget.onAccept,
          child: const Text('ACCEPT DELIVERY', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}
