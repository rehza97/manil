import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_sms_inbox/flutter_sms_inbox.dart';
import 'local_data_service.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/services.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final LocalDataService _localDataService = LocalDataService();
  final StreamController<Map<String, dynamic>> _queueController =
      StreamController<Map<String, dynamic>>.broadcast();
  final SmsQuery _smsQuery = SmsQuery();

  List<Map<String, dynamic>> _smsQueue = [];
  bool _isProcessing = false;
  bool _isSmsInProgress = false;
  int _processedCount = 0;

  Stream<Map<String, dynamic>> get queueStream => _queueController.stream;

  Future<void> loadSettings() async {
    try {
      // Request SMS permissions
      await _requestPermissions();

      // Load saved settings
      final prefs = await SharedPreferences.getInstance();
      final savedSettings = prefs.getString('sms_settings');
      if (savedSettings != null) {
        final settings = json.decode(savedSettings);
        debugPrint('Loaded SMS settings: $settings');
      }
    } catch (e) {
      debugPrint('Error loading settings: $e');
    }
  }

  Future<void> _requestPermissions() async {
    try {
      // Request SMS permissions
      final smsStatus = await Permission.sms.request();
      final phoneStatus = await Permission.phone.request();

      debugPrint('SMS Permission: $smsStatus');
      debugPrint('Phone Permission: $phoneStatus');

      if (smsStatus.isDenied || phoneStatus.isDenied) {
        debugPrint('SMS or Phone permissions denied');
      }
    } catch (e) {
      debugPrint('Error requesting permissions: $e');
    }
  }

  Future<bool> canSendSms() async {
    try {
      final smsPermission = await Permission.sms.status;
      return smsPermission.isGranted;
    } catch (e) {
      debugPrint('Error checking SMS capability: $e');
      return false;
    }
  }

  Future<Map<String, dynamic>> testSmsCapability() async {
    try {
      final canSend = await canSendSms();
      final phonePermission = await Permission.phone.status;

      return {
        'canSendSms': canSend,
        'smsPermission': (await Permission.sms.status).toString(),
        'phonePermission': phonePermission.toString(),
        'deviceInfo': await _getDeviceInfo(),
      };
    } catch (e) {
      return {'canSendSms': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> _getDeviceInfo() async {
    try {
      // Get device info using device_info_plus instead
      final deviceInfo = await DeviceInfoPlugin().androidInfo;
      return {
        'deviceModel': deviceInfo.model,
        'androidVersion': deviceInfo.version.release,
        'sdkInt': deviceInfo.version.sdkInt,
      };
    } catch (e) {
      return {'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> sendNotification({
    required String targetPhone,
    required String message,
    String? priority = 'normal',
  }) async {
    try {
      debugPrint('Sending SMS to $targetPhone: $message');

      // Add to queue for processing
      final smsData = {
        'id': DateTime.now().millisecondsSinceEpoch.toString(),
        'phone': targetPhone,
        'message': message,
        'priority': priority,
        'timestamp': DateTime.now().toIso8601String(),
        'status': 'queued',
      };

      _smsQueue.add(smsData);
      _notifyQueueUpdate();

      // Mock SMS sending for now
      await _sendRealSms(smsData);

      // Log the SMS
      await _localDataService.addLog('sms_sent', {
        'phone': targetPhone,
        'message': message,
        'timestamp': DateTime.now().toIso8601String(),
        'status': 'sent',
      });

      return {
        'sent': true,
        'delivered': true,
        'error': null,
        'messageId': smsData['id'],
      };
    } catch (e) {
      debugPrint('Error sending SMS: $e');

      // Log the error
      await _localDataService.addLog('sms_error', {
        'phone': targetPhone,
        'message': message,
        'error': e.toString(),
        'timestamp': DateTime.now().toIso8601String(),
      });

      return {
        'sent': false,
        'delivered': false,
        'error': e.toString(),
        'messageId': null,
      };
    }
  }

  Future<void> _sendRealSms(Map<String, dynamic> smsData) async {
    _isSmsInProgress = true;
    _notifyQueueUpdate();

    try {
      // Check if SMS permissions are granted, request if not
      var smsPermission = await Permission.sms.status;
      if (!smsPermission.isGranted) {
        debugPrint('📱 SMS permission not granted, requesting...');
        smsPermission = await Permission.sms.request();
        
        if (!smsPermission.isGranted) {
          // Check if permanently denied
          if (smsPermission.isPermanentlyDenied) {
            throw Exception('SMS permission permanently denied. Please grant SMS permission in app settings.');
          } else {
            throw Exception('SMS permission denied. Please grant SMS permission to send messages.');
          }
        }
      }

      // Also ensure phone permission is granted (required for some Android versions)
      var phonePermission = await Permission.phone.status;
      if (!phonePermission.isGranted) {
        debugPrint('📱 Phone permission not granted, requesting...');
        phonePermission = await Permission.phone.request();
        if (!phonePermission.isGranted) {
          debugPrint('⚠️ Phone permission not granted, continuing anyway...');
        }
      }

      debugPrint('✅ SMS permissions granted, sending SMS...');

      // Use platform channel to send SMS since flutter_sms_inbox doesn't support sending
      const platform = MethodChannel('sms_channel');
      final result = await platform.invokeMethod('sendSms', {
        'phoneNumber': smsData['phone'],
        'message': smsData['message'],
      });

      if (result != true) {
        throw Exception('Failed to send SMS: $result');
      }

      // Update status
      smsData['status'] = 'sent';
      _processedCount++;
      debugPrint('SMS sent successfully: ${smsData['id']}');
    } catch (e) {
      smsData['status'] = 'failed';
      smsData['error'] = e.toString();
      debugPrint('Failed to send SMS: $e');
      rethrow;
    } finally {
      _isSmsInProgress = false;
      _notifyQueueUpdate();
    }
  }

  void addToQueue(Map<String, dynamic> smsData) {
    _smsQueue.add(smsData);
    _notifyQueueUpdate();
  }

  void clearQueue() {
    _smsQueue.clear();
    _processedCount = 0;
    _notifyQueueUpdate();
  }

  Map<String, dynamic> getQueueStatus() {
    return {
      'queueLength': _smsQueue.length,
      'isProcessing': _isProcessing,
      'isSmsInProgress': _isSmsInProgress,
      'processedCount': _processedCount,
    };
  }

  void _notifyQueueUpdate() {
    _queueController.add(getQueueStatus());
  }

  Future<void> processQueue() async {
    if (_isProcessing || _smsQueue.isEmpty) return;

    _isProcessing = true;
    _notifyQueueUpdate();

    try {
      while (_smsQueue.isNotEmpty) {
        final smsData = _smsQueue.removeAt(0);
        await _sendRealSms(smsData);

        // Small delay between messages
        await Future.delayed(const Duration(milliseconds: 500));
      }
    } catch (e) {
      debugPrint('Error processing queue: $e');
    } finally {
      _isProcessing = false;
      _notifyQueueUpdate();
    }
  }

  void dispose() {
    _queueController.close();
  }
}
