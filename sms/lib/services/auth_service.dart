import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../core/config/environment_config.dart';

/// Authentication Service for SMS Gateway App
/// Uses device token authentication (not user authentication)
class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  String? _deviceToken;
  String? _deviceId;
  DateTime? _tokenExpiry;
  String? _serverUrl;
  bool _isConnected = false;
  DateTime? _lastConnectionCheck;

  Future<void> initialize() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Auto-configure server URL from EnvironmentConfig (no manual setup needed)
      // This auto-detects: Android Emulator (10.0.2.2:8000) or Real Device (192.168.1.4:8000)
      final defaultUrl = EnvironmentConfig.apiBaseUrl;
      _serverUrl = prefs.getString('server_url') ?? defaultUrl;

      // If no saved URL, use the auto-detected default
      if (prefs.getString('server_url') == null) {
        await prefs.setString('server_url', defaultUrl);
        debugPrint('📡 Auto-configured server URL: $defaultUrl');
      }

      // Load device token and info
      _deviceToken = prefs.getString('device_token');
      _deviceId = prefs.getString('device_id');

      final expiryString = prefs.getString('token_expiry');
      if (expiryString != null) {
        _tokenExpiry = DateTime.parse(expiryString);
      }

      debugPrint('✅ Auth service initialized');
      debugPrint('   Server: $_serverUrl (auto-configured)');
      debugPrint('   Device ID: $_deviceId');
      debugPrint(
        '   Token: ${_deviceToken != null ? "Present" : "Not registered"}',
      );

      // Print environment config
      EnvironmentConfig.printConfig();

      // Check backend health first - ensure app is online
      debugPrint('🏥 Verifying backend is online...');
      final healthResult = await checkHealth();

      if (healthResult['success'] != true) {
        debugPrint(
          '⚠️ Backend health check failed: ${healthResult['message']}',
        );
        debugPrint(
          '⚠️ Will retry device registration, but backend may be offline',
        );
      } else {
        debugPrint('✅ Backend is online and healthy');
      }

      // Auto-register device if not already registered (no login needed)
      if (_deviceToken == null || _deviceId == null) {
        debugPrint('📱 Auto-registering device (no login required)...');
        await registerDevice();
      } else {
        // Check if token is expired
        if (_tokenExpiry != null && _tokenExpiry!.isBefore(DateTime.now())) {
          debugPrint('⚠️ Device token expired, auto re-registering...');
          await registerDevice();
        }
      }
    } catch (e) {
      debugPrint('❌ Error initializing auth service: $e');
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
      }
    } catch (e) {
      debugPrint('❌ Error getting device info: $e');
    }

    final packageInfo = await PackageInfo.fromPlatform();

    return {
      'device_id': deviceId,
      'device_name': deviceName,
      'app_version': packageInfo.version,
      'android_version': androidVersion,
    };
  }

  /// Register device with backend and get device token
  Future<bool> registerDevice() async {
    try {
      final deviceInfo = await _getDeviceInfo();
      _deviceId = deviceInfo['device_id'];

      final url = '$_serverUrl/api/v1/sms/app/heartbeat';
      debugPrint('📱 Registering device at: $url');

      final response = await http
          .post(
            Uri.parse(url),
            headers: {'Content-Type': 'application/json'},
            body: json.encode(deviceInfo),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        if (data['success'] == true && data['data'] != null) {
          final token = data['data']['access_token'];
          final deviceIdFromResponse = data['data']['device_id'];

          if (token == null || token.isEmpty) {
            debugPrint('❌ Registration failed: No access token in response');
            return false;
          }

          _deviceToken = token;
          _deviceId = deviceIdFromResponse ?? _deviceId;

          // Parse token expiry
          if (data['data']['token_expires_at'] != null) {
            _tokenExpiry = DateTime.parse(data['data']['token_expires_at']);
          }

          // Save to persistent storage IMMEDIATELY
          await _saveDeviceInfo();

          _isConnected = true;
          debugPrint('✅ Device registered successfully');
          debugPrint('   Device ID: $_deviceId');
          debugPrint(
            '   Token: ${token.substring(0, 20)}... (${token.length} chars)',
          );
          debugPrint('   Token expires: $_tokenExpiry');

          // Verify token was saved
          final prefs = await SharedPreferences.getInstance();
          final savedToken = prefs.getString('device_token');
          if (savedToken != token) {
            debugPrint(
              '⚠️ WARNING: Token mismatch after save! Expected: ${token.substring(0, 20)}..., Got: ${savedToken?.substring(0, 20)}...',
            );
          }

          return true;
        } else {
          debugPrint('❌ Registration failed: Invalid response format');
          debugPrint('   Response data: $data');
          return false;
        }
      } else {
        debugPrint('❌ Registration failed with status: ${response.statusCode}');
        debugPrint('   Response: ${response.body}');
        return false;
      }
    } catch (e) {
      debugPrint('❌ Error during device registration: $e');
      return false;
    }
  }

  Future<void> _saveDeviceInfo() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (_deviceToken != null) {
        await prefs.setString('device_token', _deviceToken!);
      }
      if (_deviceId != null) {
        await prefs.setString('device_id', _deviceId!);
      }
      if (_tokenExpiry != null) {
        await prefs.setString('token_expiry', _tokenExpiry!.toIso8601String());
      }
      await prefs.setString(
        'server_url',
        _serverUrl ?? EnvironmentConfig.apiBaseUrl,
      );
    } catch (e) {
      debugPrint('❌ Error saving device info: $e');
    }
  }

  /// Check backend health using /health endpoint
  Future<Map<String, dynamic>> checkHealth() async {
    try {
      if (_serverUrl == null) {
        return {
          'success': false,
          'message': 'Server URL not configured',
          'status': 'unhealthy',
        };
      }

      final url = '$_serverUrl/health';
      debugPrint('🏥 Checking backend health at: $url');

      final response = await http
          .get(Uri.parse(url))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final isHealthy = data['status'] == 'healthy';

        _isConnected = isHealthy;
        _lastConnectionCheck = DateTime.now();

        if (isHealthy) {
          debugPrint('✅ Backend is healthy and online');
          debugPrint('   Version: ${data['version'] ?? 'unknown'}');
          debugPrint('   Environment: ${data['environment'] ?? 'unknown'}');
        } else {
          debugPrint('⚠️ Backend responded but status is not healthy');
        }

        return {
          'success': isHealthy,
          'message': isHealthy
              ? 'Backend is online and healthy'
              : 'Backend is not healthy',
          'status': data['status'] ?? 'unknown',
          'version': data['version'],
          'environment': data['environment'],
          'services': data['services'],
        };
      } else {
        _isConnected = false;
        _lastConnectionCheck = DateTime.now();
        debugPrint('❌ Health check failed - Status: ${response.statusCode}');
        return {
          'success': false,
          'message': 'Health check failed: Status ${response.statusCode}',
          'status': 'unhealthy',
        };
      }
    } catch (e) {
      _isConnected = false;
      _lastConnectionCheck = DateTime.now();
      debugPrint('❌ Health check error: $e');
      return {
        'success': false,
        'message': 'Health check error: ${e.toString()}',
        'status': 'unhealthy',
      };
    }
  }

  Future<bool> checkConnection() async {
    // Use health check for more reliable connection verification
    final healthResult = await checkHealth();
    return healthResult['success'] == true;
  }

  Future<void> updateServerUrl(String serverUrl) async {
    _serverUrl = serverUrl;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_url', serverUrl);
    debugPrint('🔄 Server URL updated to: $serverUrl');

    // Test connection with new URL
    await checkConnection();

    // Re-register device with new server
    await registerDevice();
  }

  /// Get authentication headers for API requests
  /// Uses X-Device-Token header instead of Bearer token
  Future<Map<String, String>> getAuthHeaders() async {
    // Reload token from storage to ensure we have the latest
    final prefs = await SharedPreferences.getInstance();
    final storedToken = prefs.getString('device_token');

    // If stored token exists and differs from memory, use stored token
    if (storedToken != null && storedToken != _deviceToken) {
      debugPrint('🔄 Token mismatch detected, using stored token');
      _deviceToken = storedToken;
    }

    // Check if token is about to expire (within 7 days)
    if (_tokenExpiry != null &&
        _tokenExpiry!.isBefore(DateTime.now().add(const Duration(days: 7)))) {
      debugPrint('⚠️ Device token expiring soon, re-registering...');
      await registerDevice();
      // Reload after registration
      _deviceToken = prefs.getString('device_token');
    }

    if (_deviceToken == null || _deviceToken!.isEmpty) {
      debugPrint('❌ No device token available, attempting registration...');
      final success = await registerDevice();
      if (!success) {
        debugPrint('❌ Failed to register device, cannot get auth headers');
        throw Exception('Device not registered. Please register device first.');
      }
      // Reload after registration
      _deviceToken = prefs.getString('device_token');
    }

    if (_deviceToken == null || _deviceToken!.isEmpty) {
      debugPrint('❌ Device token still empty after registration attempt');
      throw Exception('Device token is missing. Please register device.');
    }

    debugPrint(
      '🔐 Using device token: ${_deviceToken!.substring(0, 20)}... (${_deviceToken!.length} chars)',
    );

    return {
      'Content-Type': 'application/json',
      'X-Device-Token': _deviceToken!,
    };
  }

  bool get isAuthenticated => _deviceToken != null && _deviceId != null;
  String get serverUrl => _serverUrl ?? EnvironmentConfig.apiBaseUrl;
  String? get deviceToken => _deviceToken;
  String? get accessToken => _deviceToken; // Alias for deviceToken
  String? get deviceId => _deviceId;
  bool get isConnected => _isConnected;
  DateTime? get lastConnectionCheck => _lastConnectionCheck;

  String get connectionStatus {
    if (!_isConnected) return 'Disconnected';
    if (!isAuthenticated) return 'Not Registered';
    if (_lastConnectionCheck != null) {
      final timeSince = DateTime.now().difference(_lastConnectionCheck!);
      if (timeSince.inMinutes < 1) {
        return 'Connected (${timeSince.inSeconds}s ago)';
      } else {
        return 'Connected (${timeSince.inMinutes}m ago)';
      }
    }
    return 'Connected';
  }

  String get deviceInfo {
    if (_deviceId == null) return 'Not registered';
    return 'Device: $_deviceId';
  }

  /// Logout and clear device authentication
  Future<void> logout() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('device_token');
      await prefs.remove('device_id');
      await prefs.remove('token_expiry');

      _deviceToken = null;
      _deviceId = null;
      _tokenExpiry = null;
      _isConnected = false;

      debugPrint('✅ Logged out successfully');
    } catch (e) {
      debugPrint('❌ Error during logout: $e');
    }
  }

  /// Test connection to a specific URL (hits /health for reliable check).
  Future<Map<String, dynamic>> testConnection(String url) async {
    try {
      final base = url.endsWith('/') ? url.substring(0, url.length - 1) : url;
      final healthUrl = base.contains('/health') ? base : '$base/health';
      debugPrint('🔌 Testing connection to: $healthUrl');

      final response = await http
          .get(Uri.parse(healthUrl))
          .timeout(const Duration(seconds: 5));

      final success = response.statusCode == 200;

      return {
        'success': success,
        'message': success
            ? 'Connection successful'
            : 'Connection failed: Status ${response.statusCode}',
      };
    } catch (e) {
      debugPrint('❌ Connection test error: $e');
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }

  /// Get suggested IP addresses for local network.
  /// For LAN: use your computer's IP (ipconfig / ifconfig). These are common patterns.
  Future<List<String>> getSuggestedIPs() async {
    try {
      final suggestions = <String>[];

      // Common local network patterns. Prefer your PC's IP (ipconfig/ifconfig) for LAN.
      suggestions.add('http://192.168.1.5:8000'); // example host IP
      suggestions.add('http://192.168.1.1:8000');
      suggestions.add('http://192.168.0.1:8000');
      suggestions.add('http://192.168.1.100:8000');
      suggestions.add('http://192.168.1.4:8000');
      suggestions.add('http://10.0.2.2:8000'); // Android emulator
      suggestions.add('http://localhost:8000');
      suggestions.add('http://127.0.0.1:8000');

      // Add current server URL if it exists
      if (_serverUrl != null && !suggestions.contains(_serverUrl)) {
        suggestions.insert(0, _serverUrl!);
      }

      return suggestions;
    } catch (e) {
      debugPrint('❌ Error getting suggested IPs: $e');
      return [];
    }
  }

  /// Login with email and password (for admin authentication)
  /// Note: This is separate from device registration
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      if (_serverUrl == null) {
        return {'success': false, 'message': 'Server URL not configured'};
      }

      final url = '$_serverUrl/api/v1/auth/login';
      debugPrint('🔐 Attempting login at: $url');

      final response = await http
          .post(
            Uri.parse(url),
            headers: {'Content-Type': 'application/json'},
            body: json.encode({'email': email, 'password': password}),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        if (data['success'] == true) {
          debugPrint('✅ Login successful');
          return {
            'success': true,
            'message': 'Login successful',
            'data': data['data'],
          };
        } else {
          return {
            'success': false,
            'message': data['message'] ?? 'Login failed',
          };
        }
      } else {
        debugPrint('❌ Login failed with status: ${response.statusCode}');
        return {
          'success': false,
          'message': 'Login failed: Status ${response.statusCode}',
        };
      }
    } catch (e) {
      debugPrint('❌ Login error: $e');
      return {'success': false, 'message': 'Login error: ${e.toString()}'};
    }
  }
}
