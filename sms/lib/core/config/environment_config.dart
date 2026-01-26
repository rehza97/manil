import 'dart:io';
import 'package:flutter/foundation.dart';

/// Environment configuration for SMS Gateway App
/// Supports multiple environments: development, staging, production, lan
enum Environment { development, staging, production, lan }

class EnvironmentConfig {
  /// Current environment - defaults to production for direct deployment
  static Environment get current {
    const envString = String.fromEnvironment('ENV', defaultValue: 'production');

    switch (envString.toLowerCase()) {
      case 'production':
      case 'prod':
        return Environment.production;
      case 'staging':
      case 'stag':
        return Environment.staging;
      case 'development':
      case 'dev':
        return Environment.development;
      case 'lan':
        return Environment.lan;
      default:
        return Environment.production; // Default to production
    }
  }

  /// Check if running in production
  static bool get isProduction => current == Environment.production;

  /// Check if running in development
  static bool get isDevelopment => current == Environment.development;

  /// Check if running in staging
  static bool get isStaging => current == Environment.staging;

  /// Check if running in LAN mode (connect Android over same Wi-Fi)
  static bool get isLan => current == Environment.lan;

  /// True when ENV=lan and API_URL was not provided (compile-time).
  /// Use to show "Connect over LAN" instructions prominently (e.g. always visible).
  static bool get isLanWithoutApiUrl =>
      isLan && String.fromEnvironment('API_URL', defaultValue: '').isEmpty;

  /// Get API base URL based on environment
  static String get apiBaseUrl {
    // Check for explicit API_URL override (always wins)
    const apiUrl = String.fromEnvironment('API_URL', defaultValue: '');
    if (apiUrl.isNotEmpty) {
      return apiUrl;
    }

    // Environment-based URLs
    switch (current) {
      case Environment.production:
        // Production: Use direct backend URL with port
        return 'http://194.146.13.22';
      case Environment.staging:
        return 'http://staging.manara-delivery.com:8000';
      case Environment.lan:
        // LAN: API_URL must be set. Use placeholder and log warning.
        if (kDebugMode) {
          debugPrint(
            '⚠️ ENV=lan but API_URL not set. Use --dart-define=API_URL=http://YOUR_PC_IP:8000 '
            'or set Server URL in app Settings. See "Connect over LAN" in README.',
          );
        }
        return 'http://0.0.0.0:8000';
      case Environment.development:
        // Auto-detect platform for development
        try {
          if (Platform.isAndroid) {
            // Android Emulator - use 10.0.2.2 to access host's localhost
            return 'http://10.0.2.2:8000';
          } else {
            // Real device - fallback
            return 'http://192.168.1.4:8000';
          }
        } catch (e) {
          // Fallback if platform detection fails
          return 'http://192.168.1.4:8000';
        }
    }
  }

  /// Get environment display name
  static String get environmentName {
    switch (current) {
      case Environment.production:
        return 'Production';
      case Environment.staging:
        return 'Staging';
      case Environment.development:
        return 'Development';
      case Environment.lan:
        return 'LAN';
    }
  }

  /// Check if debug features should be enabled
  static bool get enableDebugFeatures {
    return isDevelopment || isStaging || isLan;
  }

  /// Log level based on environment
  static String get logLevel {
    switch (current) {
      case Environment.production:
        return 'error';
      case Environment.staging:
        return 'warning';
      case Environment.development:
      case Environment.lan:
        return 'debug';
    }
  }

  /// Print current configuration (for debugging)
  static void printConfig() {
    if (!kReleaseMode) {
      debugPrint('=== SMS Gateway App Configuration ===');
      debugPrint('Environment: $environmentName');
      debugPrint('API Base URL: $apiBaseUrl');
      debugPrint('Debug Features: $enableDebugFeatures');
      debugPrint('Log Level: $logLevel');
      debugPrint('=====================================');
    }
  }
}

/// How to use:
///
/// 📱 LOCAL DEVELOPMENT:
///
/// 1. Android Emulator:
///    flutter run
///    → Auto uses: http://10.0.2.2:8000
///
/// 2. Real Device:
///    flutter run --dart-define=API_URL=http://192.168.1.5:8000
///    → Replace with your computer's local IP
///
/// 📡 CONNECT OVER LAN (same Wi‑Fi):
///
/// - Phone and computer on same Wi‑Fi. Backend: docker compose up (port 8000).
/// - Find PC IP: ipconfig (Windows) or ifconfig / ip a (Mac/Linux).
/// - Run: flutter run --dart-define=ENV=lan --dart-define=API_URL=http://YOUR_PC_IP:8000
///   Or set that URL in app Settings (Server URL) and tap Test Connection.
/// - If connection fails: allow port 8000 in Windows Firewall (or equivalent).
///
/// 🚀 PRODUCTION:
///
/// 3. Production (VPS):
///    flutter run --dart-define=ENV=production
///    → Uses: http://194.146.13.22
///
/// 4. Production APK:
///    flutter build apk --release --dart-define=ENV=production
