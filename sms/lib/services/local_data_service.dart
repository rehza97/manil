import 'dart:async';
import 'package:hive_flutter/hive_flutter.dart';

class LocalDataService {
  static final LocalDataService _instance = LocalDataService._internal();
  factory LocalDataService() => _instance;
  LocalDataService._internal();

  bool _initialized = false;
  late Box<Map> _smsQueueBox;
  late Box<Map> _logsBox;
  late Box<Map> _settingsBox;

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      // Initialize Hive
      await Hive.initFlutter();

      // Open boxes
      _smsQueueBox = await Hive.openBox<Map>('sms_queue');
      _logsBox = await Hive.openBox<Map>('logs');
      _settingsBox = await Hive.openBox<Map>('settings');

      _initialized = true;
      print('Local data service initialized successfully');
    } catch (e) {
      print('Error initializing local data service: $e');
      rethrow;
    }
  }

  // SMS Queue operations
  Future<void> addSmsToQueue(Map<String, dynamic> smsData) async {
    final key = '${smsData['timestamp']}_${smsData['phone']}';
    await _smsQueueBox.put(key, smsData);
  }

  Future<List<Map<String, dynamic>>> getSmsQueue() async {
    final List<Map<String, dynamic>> queue = [];

    for (var key in _smsQueueBox.keys) {
      final smsDataRaw = _smsQueueBox.get(key);
      if (smsDataRaw != null) {
        final smsData = _convertMap(smsDataRaw);
        queue.add(smsData);
      }
    }

    // Sort by timestamp
    queue.sort(
      (a, b) => (a['timestamp']?.toString() ?? '').compareTo(b['timestamp']?.toString() ?? ''),
    );
    return queue;
  }

  Future<void> removeSmsFromQueue(String key) async {
    await _smsQueueBox.delete(key);
  }

  Future<void> updateSmsStatus(
    String key,
    String status, {
    String? error,
  }) async {
    final smsDataRaw = _smsQueueBox.get(key);
    if (smsDataRaw != null) {
      final smsData = _convertMap(smsDataRaw);
      smsData['status'] = status;
      if (error != null) smsData['error'] = error;
      smsData['updatedAt'] = DateTime.now().toIso8601String();
      await _smsQueueBox.put(key, smsData);
    }
  }

  // Logging operations
  Future<void> addLog(String type, Map<String, dynamic> data) async {
    final log = {
      'type': type,
      'data': data,
      'timestamp': DateTime.now().toIso8601String(),
    };
    await _logsBox.add(log);
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

  Future<List<Map<String, dynamic>>> getLogs({int limit = 100}) async {
    final List<Map<String, dynamic>> logs = [];
    final keys = _logsBox.keys.toList();

    // Get the most recent logs
    final startIndex = keys.length > limit ? keys.length - limit : 0;
    for (int i = startIndex; i < keys.length; i++) {
      final logRaw = _logsBox.get(keys[i]);
      if (logRaw != null) {
        final log = _convertMap(logRaw);
        logs.add(log);
      }
    }

    return logs.reversed.toList();
  }

  // Settings operations
  Future<void> saveSetting(String key, dynamic value) async {
    await _settingsBox.put(key, {
      'value': value,
      'updated': DateTime.now().toIso8601String(),
    });
  }

  dynamic getSetting(String key) {
    final settingRaw = _settingsBox.get(key);
    if (settingRaw != null) {
      final setting = _convertMap(settingRaw);
      return setting['value'];
    }
    return null;
  }

  // ERP Configuration
  Future<void> saveErpConfig(String serverUrl, String authToken) async {
    await saveSetting('erp_server_url', serverUrl);
    await saveSetting('erp_auth_token', authToken);
  }

  String? getErpServerUrl() {
    return getSetting('erp_server_url') as String?;
  }

  String? getErpAuthToken() {
    return getSetting('erp_auth_token') as String?;
  }

  // SMS Configuration
  Future<void> saveSmsConfig({
    required int selectedSimIndex,
    required String phoneNumber,
    required String messageTemplate,
    required bool autoSendEnabled,
    required int delayMinutes,
  }) async {
    await saveSetting('selected_sim_index', selectedSimIndex);
    await saveSetting('phone_number', phoneNumber);
    await saveSetting('message_template', messageTemplate);
    await saveSetting('auto_send_enabled', autoSendEnabled);
    await saveSetting('delay_minutes', delayMinutes);
  }

  Map<String, dynamic> getSmsConfig() {
    return {
      'selectedSimIndex': getSetting('selected_sim_index') ?? 0,
      'phoneNumber': getSetting('phone_number') ?? '',
      'messageTemplate': getSetting('message_template') ?? '',
      'autoSendEnabled': getSetting('auto_send_enabled') ?? false,
      'delayMinutes': getSetting('delay_minutes') ?? 0,
    };
  }

  // Close the service
  Future<void> close() async {
    await _smsQueueBox.close();
    await _logsBox.close();
    await _settingsBox.close();
  }
}
