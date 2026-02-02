import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'local_data_service.dart';
import 'notification_service.dart';
import 'auth_service.dart';

class ErpSmsService {
  static final ErpSmsService _instance = ErpSmsService._internal();
  factory ErpSmsService() => _instance;
  ErpSmsService._internal();

  final LocalDataService _localDataService = LocalDataService();
  final NotificationService _notificationService = NotificationService();
  final AuthService _authService = AuthService();

  Timer? _pollingTimer;
  Timer? _heartbeatTimer;
  Timer? _authCheckTimer;
  Timer? _queuePollTimer;
  bool _isPolling = false;
  int _consecutiveFailures = 0;
  DateTime? _lastSuccessfulPoll;
  DateTime? _lastHeartbeat;

  // Request timing tracking
  final List<int> _requestTimesMs = []; // Store last 50 request times
  final List<int> _responseTimesMs = []; // Store last 50 response times
  static const int _maxTimingHistory = 50;

  Future<void> initialize() async {
    try {
      // Initialize auth service
      await _authService.initialize();

      if (_authService.isAuthenticated) {
        debugPrint(
          'ERP SMS Service initialized with server: ${_authService.serverUrl}',
        );
      } else {
        debugPrint('ERP SMS Service initialized but not authenticated');
      }
    } catch (e) {
      debugPrint('Error initializing ERP SMS Service: $e');
    }
  }

  Future<void> startPolling() async {
    if (_isPolling) return;

    // Check if authenticated before starting
    if (!_authService.isAuthenticated) {
      debugPrint(
        '⚠️ Not authenticated, cannot start polling. Please login first.',
      );
      return;
    }

    _isPolling = true;
    _consecutiveFailures = 0;
    debugPrint('🔄 Starting ERP SMS polling...');

    // Start heartbeat timer (every 60 seconds)
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 60), (timer) {
      _sendHeartbeat();
    });

    // Start queue poll timer (every 10 seconds) - always call GET /pending
    _queuePollTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      _pollForSmsMessages();
    });

    // Start auth check timer (every 30 seconds)
    _authCheckTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      checkAuthAndRestart();
    });

    // Initial poll and heartbeat
    await _pollForSmsMessages();
    await _sendHeartbeat();
  }

  Future<void> stopPolling() async {
    _isPolling = false;
    _pollingTimer?.cancel();
    _pollingTimer = null;
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
    _authCheckTimer?.cancel();
    _authCheckTimer = null;
    _queuePollTimer?.cancel();
    _queuePollTimer = null;
    debugPrint('⏹️ Stopped ERP SMS polling');
  }

  Future<void> _sendHeartbeat() async {
    try {
      // Get device info for the heartbeat
      final deviceInfo = await _getDeviceInfo();

      final url = '${_authService.serverUrl}/api/v1/sms/app/heartbeat';

      // Heartbeat endpoint doesn't require auth (public endpoint)
      // But we can send auth headers if available for better tracking
      Map<String, String> headers = {'Content-Type': 'application/json'};
      try {
        final authHeaders = await _authService.getAuthHeaders();
        headers.addAll(authHeaders);
      } catch (e) {
        // Not authenticated yet - that's OK for heartbeat
        debugPrint('💓 Sending heartbeat without auth (initial registration)');
      }

      final requestBody = json.encode(deviceInfo);

      debugPrint('💓 Sending heartbeat to: $url');

      final response = await http
          .post(Uri.parse(url), headers: headers, body: requestBody)
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        _lastHeartbeat = DateTime.now();
        debugPrint('💓 Heartbeat successful');

        // Parse response and update token if provided
        try {
          final data = json.decode(response.body);
          if (data['success'] == true && data['data'] != null) {
            final token = data['data']['access_token'];
            if (token != null && token.isNotEmpty) {
              debugPrint('💓 Updating token from heartbeat response');
              // Use registerDevice to properly save the token
              await _authService.registerDevice();
            }
          }
        } catch (e) {
          debugPrint('⚠️ Could not parse heartbeat response: $e');
        }

        // Call queue endpoint after each successful heartbeat so we always fetch pending SMS
        if (_isPolling) {
          _pollForSmsMessages();
        }

        // Reset consecutive failures on successful heartbeat
        _consecutiveFailures = 0;
      } else {
        debugPrint('❌ Heartbeat failed with status: ${response.statusCode}');
        debugPrint('Response body: ${response.body}');
        _consecutiveFailures++;
      }
    } catch (e) {
      debugPrint('❌ Error sending heartbeat: $e');
      _consecutiveFailures++;
    }
  }

  Future<Map<String, dynamic>> _getDeviceInfo() async {
    final deviceInfo = DeviceInfoPlugin();
    String deviceId = 'unknown';
    String deviceName = 'SMS Gateway App';
    String androidVersion = 'unknown';

    try {
      if (defaultTargetPlatform == TargetPlatform.android) {
        final androidInfo = await deviceInfo.androidInfo;
        deviceId = androidInfo.id;
        deviceName = '${androidInfo.brand} ${androidInfo.model}';
        androidVersion = androidInfo.version.release;
      } else if (defaultTargetPlatform == TargetPlatform.iOS) {
        final iosInfo = await deviceInfo.iosInfo;
        deviceId = iosInfo.identifierForVendor ?? 'unknown';
        deviceName = '${iosInfo.name} ${iosInfo.model}';
        androidVersion = iosInfo.systemVersion;
      }
    } catch (e) {
      debugPrint('Error getting device info: $e');
    }

    final packageInfo = await PackageInfo.fromPlatform();

    return {
      'device_id': deviceId,
      'device_name': deviceName,
      'app_version': packageInfo.version,
      'android_version': androidVersion,
    };
  }

  Future<void> _pollForSmsMessages() async {
    try {
      // Use device_id from query params as backend expects (backend allows GET /pending without token)
      final deviceId = _authService.deviceId ?? 'unknown';
      final url =
          '${_authService.serverUrl}/api/v1/sms/app/pending?limit=10&device_id=$deviceId';

      // Get auth headers if available; otherwise use minimal headers so we always call the queue endpoint
      Map<String, String> headers = {'Content-Type': 'application/json'};
      try {
        if (_authService.isAuthenticated) {
          final authHeaders = await _authService.getAuthHeaders();
          headers.addAll(authHeaders);
          debugPrint('🔐 Auth headers prepared for queue poll');
        } else {
          debugPrint('📱 Queue poll without token (device_id=$deviceId)');
        }
      } catch (e) {
        debugPrint('⚠️ Using queue poll without auth: $e');
      }

      debugPrint('📱 Polling for SMS messages: $url');
      debugPrint('🔐 Request headers: ${headers.keys.join(", ")}');
      debugPrint(
        '🔐 X-Device-Token present: ${headers.containsKey('X-Device-Token')}',
      );
      if (headers.containsKey('X-Device-Token')) {
        final token = headers['X-Device-Token'] ?? '';
        debugPrint('🔐 Token length: ${token.length} chars');
        debugPrint(
          '🔐 Token preview: ${token.isNotEmpty ? token.substring(0, 20) : "EMPTY"}...',
        );
      }

      // Track request time (from send to response received)
      final requestStartTime = DateTime.now();
      final response = await http
          .get(Uri.parse(url), headers: headers)
          .timeout(const Duration(seconds: 15));
      final requestEndTime = DateTime.now();

      // Calculate and store request timing (total round-trip time)
      final requestTimeMs = requestEndTime
          .difference(requestStartTime)
          .inMilliseconds;
      _addRequestTime(requestTimeMs);

      debugPrint('📡 Response status: ${response.statusCode}');
      if (response.statusCode != 200) {
        debugPrint('📡 Response body: ${response.body}');
      }

      if (response.statusCode == 200) {
        // Track response parsing time
        final responseParseStart = DateTime.now();
        final messagesRaw = json.decode(response.body) as List<dynamic>? ?? [];
        final responseParseEnd = DateTime.now();

        // Calculate response parsing time
        final responseTimeMs = responseParseEnd
            .difference(responseParseStart)
            .inMilliseconds;
        _addResponseTime(responseTimeMs);

        _lastSuccessfulPoll = DateTime.now();
        _consecutiveFailures = 0;

        if (messagesRaw.isNotEmpty) {
          debugPrint(
            '📨 Received ${messagesRaw.length} SMS messages from server',
          );
        } else {
          debugPrint('📭 No pending SMS messages');
        }

        // Convert each message to Map<String, dynamic> before processing
        for (final messageRaw in messagesRaw) {
          try {
            final message = _convertMap(messageRaw);
            if (message.isNotEmpty) {
              await _processSmsMessage(message);
            } else {
              debugPrint('⚠️ Skipping invalid message format: $messageRaw');
            }
          } catch (e, stackTrace) {
            debugPrint('❌ Error converting message: $e');
            debugPrint('   Message data: $messageRaw');
            debugPrint('   Stack trace: $stackTrace');
          }
        }
      } else if (response.statusCode == 401) {
        debugPrint(
          '❌ Authentication failed, attempting to re-register device...',
        );

        // Try to re-register the device
        final registrationSuccess = await _authService.registerDevice();

        if (registrationSuccess && _authService.isAuthenticated) {
          debugPrint('✅ Device re-registered successfully, will retry poll');
          _consecutiveFailures = 0;
        } else {
          debugPrint('❌ Failed to re-register device');
          _consecutiveFailures++;

          // If too many auth failures, stop polling
          if (_consecutiveFailures >= 5) {
            debugPrint('⚠️ Too many authentication failures, stopping polling');
            await stopPolling();
          }
        }
      } else {
        debugPrint('❌ Polling failed with status: ${response.statusCode}');
        debugPrint('Response body: ${response.body}');
        _consecutiveFailures++;
      }
    } catch (e) {
      debugPrint('❌ Error polling for SMS messages: $e');
      _consecutiveFailures++;

      // If too many consecutive failures, check connection
      if (_consecutiveFailures >= 3) {
        debugPrint('⚠️ Multiple consecutive failures, checking connection...');
        await _authService.checkConnection();
      }
    }
    // Next poll is driven by _queuePollTimer (every 10s)
  }

  Future<void> _processSmsMessage(Map<String, dynamic> message) async {
    try {
      // Ensure message is properly typed (defensive check)
      final messageMap = _convertMap(message);

      final messageId = messageMap['id'] as String?;
      final phone = messageMap['phone_number'] as String?;
      final text = messageMap['message'] as String?;

      if (messageId == null || phone == null || text == null) {
        debugPrint('❌ Invalid SMS message format: $messageMap');
        debugPrint(
          '   Missing fields - id: ${messageId != null}, phone: ${phone != null}, message: ${text != null}',
        );
        return;
      }

      debugPrint('📤 Processing SMS message $messageId to $phone');

      // Send the SMS
      final result = await _notificationService.sendNotification(
        targetPhone: phone,
        message: text,
      );

      // Report status back to ERP
      await _reportSmsStatus(messageId, result);

      // Log the message
      await _localDataService.addLog('erp_sms', {
        'messageId': messageId,
        'phone': phone,
        'message': text,
        'result': result,
        'timestamp': DateTime.now().toIso8601String(),
      });

      if (result['sent'] == true) {
        debugPrint('✅ SMS sent successfully to $phone');
      } else {
        debugPrint('❌ SMS failed to send to $phone: ${result['error']}');
      }
    } catch (e) {
      debugPrint('❌ Error processing SMS message: $e');
    }
  }

  Future<void> _reportSmsStatus(
    String messageId,
    Map<String, dynamic> result,
  ) async {
    try {
      if (!_authService.isAuthenticated) {
        debugPrint('❌ Not authenticated, cannot report status');
        return;
      }

      final url = '${_authService.serverUrl}/api/v1/sms/app/update';
      final headers = await _authService.getAuthHeaders();

      // Get device info for the update
      final deviceInfo = await _getDeviceInfo();

      final statusData = {
        'device_info': deviceInfo,
        'sms_updates': [
          {
            'sms_id': messageId,
            'status': result['sent'] == true ? 'sent' : 'failed',
            'error_message': result['error'],
            'delivery_status': result['sent'] == true ? 'sent' : null,
          },
        ],
      };

      debugPrint('📊 Reporting SMS status for message $messageId');

      final response = await http
          .post(Uri.parse(url), headers: headers, body: json.encode(statusData))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        debugPrint('✅ Successfully reported SMS status for message $messageId');
      } else {
        debugPrint('❌ Failed to report SMS status: ${response.statusCode}');
        debugPrint('Response body: ${response.body}');
      }
    } catch (e) {
      debugPrint('❌ Error reporting SMS status: $e');
    }
  }

  Future<void> updateConfiguration(String serverUrl) async {
    await _authService.updateServerUrl(serverUrl);
    debugPrint('ERP configuration updated');
  }

  bool get isPolling => _isPolling;
  String get erpServerUrl => _authService.serverUrl;
  bool get isAuthenticated => _authService.isAuthenticated;
  bool get isConnected => _authService.isConnected;
  int get consecutiveFailures => _consecutiveFailures;
  DateTime? get lastSuccessfulPoll => _lastSuccessfulPoll;
  DateTime? get lastHeartbeat => _lastHeartbeat;

  String get connectionHealth {
    if (!isConnected) return 'Disconnected';
    if (_consecutiveFailures == 0) return 'Healthy';
    if (_consecutiveFailures < 3) return 'Warning';
    return 'Poor';
  }

  void dispose() {
    stopPolling();
  }

  // Method to check authentication and restart polling if needed
  Future<void> checkAuthAndRestart() async {
    if (!_authService.isAuthenticated) {
      debugPrint('🔐 Not authenticated, stopping polling');
      await stopPolling();
      return;
    }

    if (!_isPolling) {
      debugPrint('🔄 Authentication restored, restarting polling');
      await startPolling();
    }
  }

  // Method to restart polling after authentication
  Future<void> restartAfterAuth() async {
    debugPrint('🔄 Restarting ERP service after authentication...');
    await stopPolling();
    await startPolling();
  }

  // Request timing methods
  void _addRequestTime(int timeMs) {
    _requestTimesMs.add(timeMs);
    if (_requestTimesMs.length > _maxTimingHistory) {
      _requestTimesMs.removeAt(0);
    }
  }

  void _addResponseTime(int timeMs) {
    _responseTimesMs.add(timeMs);
    if (_responseTimesMs.length > _maxTimingHistory) {
      _responseTimesMs.removeAt(0);
    }
  }

  double get averageRequestTimeMs {
    if (_requestTimesMs.isEmpty) return 0.0;
    final sum = _requestTimesMs.reduce((a, b) => a + b);
    return sum / _requestTimesMs.length;
  }

  double get averageResponseTimeMs {
    if (_responseTimesMs.isEmpty) return 0.0;
    final sum = _responseTimesMs.reduce((a, b) => a + b);
    return sum / _responseTimesMs.length;
  }

  // Helper function to safely convert Map<dynamic, dynamic> to Map<String, dynamic>
  Map<String, dynamic> _convertMap(dynamic map) {
    if (map == null) return {};
    if (map is Map<String, dynamic>) return map;
    if (map is Map) {
      return Map<String, dynamic>.from(map);
    }
    return {};
  }

  // Get SMS messages list
  Future<List<Map<String, dynamic>>> getSmsMessages({int limit = 50}) async {
    try {
      final logs = await _localDataService.getLogs(limit: limit);
      final smsMessages = <Map<String, dynamic>>[];

      for (final logRaw in logs) {
        try {
          // Convert log immediately to ensure type safety
          final log = _convertMap(logRaw);

          // Check if this is an SMS log
          final logType = log['type'];
          if (logType != 'erp_sms' && logType.toString() != 'erp_sms') {
            continue;
          }

          // Safely convert the data map
          final dataRaw = log['data'];
          if (dataRaw == null) {
            debugPrint('⚠️ Skipping log with null data: $log');
            continue;
          }

          final data = _convertMap(dataRaw);
          if (data.isEmpty) {
            debugPrint('⚠️ Skipping log with empty data: $log');
            continue;
          }

          // Safely convert the result map if it exists
          final resultRaw = data['result'];
          final result = resultRaw != null ? _convertMap(resultRaw) : null;

          smsMessages.add({
            'id': data['messageId']?.toString() ?? '',
            'phone': data['phone']?.toString() ?? '',
            'message': data['message']?.toString() ?? '',
            'status': result != null && result['sent'] == true
                ? 'sent'
                : 'failed',
            'error': result?['error']?.toString(),
            'timestamp': log['timestamp']?.toString() ?? '',
          });
        } catch (e, stackTrace) {
          debugPrint('❌ Error processing log entry: $e');
          debugPrint('   Log data: $logRaw');
          debugPrint('   Error type: ${e.runtimeType}');
          debugPrint('   Stack trace: $stackTrace');
          // Continue processing other logs
          continue;
        }
      }

      // Sort by timestamp (newest first)
      smsMessages.sort((a, b) {
        final timestampA = a['timestamp']?.toString() ?? '';
        final timestampB = b['timestamp']?.toString() ?? '';
        return timestampB.compareTo(timestampA);
      });

      return smsMessages.take(limit).toList();
    } catch (e, stackTrace) {
      debugPrint('❌ Error getting SMS messages: $e');
      debugPrint('   Error type: ${e.runtimeType}');
      debugPrint('   Stack trace: $stackTrace');
      // Return empty list on error to prevent UI crashes
      return [];
    }
  }
}
