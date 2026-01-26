import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import 'core/config/environment_config.dart';
import 'services/local_data_service.dart';
import 'services/erp_sms_service.dart';
import 'services/auth_service.dart';
import 'services/notification_service.dart';
import 'dart:async';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // CRITICAL: Prevent phone from sleeping - keep screen on
  await WakelockPlus.enable();
  // Ensure wakelock stays enabled even if app goes to background
  WakelockPlus.toggle(enable: true);

  // Initialize services
  await LocalDataService().initialize();

  // Initialize NotificationService and request SMS permissions
  final notificationService = NotificationService();
  await notificationService.loadSettings();
  debugPrint('📱 SMS permissions requested');

  // Initialize auth service - it will auto-configure from EnvironmentConfig
  final authService = AuthService();
  await authService.initialize();

  // Auto-register device if not already registered
  // This uses device-based auth (no email/password needed)
  if (!authService.isAuthenticated) {
    debugPrint('📱 Auto-registering device...');
    await authService.registerDevice();
  }

  await ErpSmsService().initialize();

  // Check if authentication has been completed
  final bool isAuthenticated = authService.isAuthenticated;

  runApp(MyApp(isAuthenticated: isAuthenticated));
}

class MyApp extends StatefulWidget {
  final bool isAuthenticated;

  const MyApp({super.key, this.isAuthenticated = false});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Ensure wakelock is enabled when app starts
    _ensureWakelockEnabled();
    // Start foreground service
    _startForegroundService();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    // Keep wakelock enabled regardless of app state
    _ensureWakelockEnabled();

    if (state == AppLifecycleState.resumed) {
      // App came to foreground - ensure service is running
      _startForegroundService();
    } else if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      // App going to background - ensure service keeps running
      _startForegroundService();
    }
  }

  Future<void> _ensureWakelockEnabled() async {
    try {
      if (!await WakelockPlus.enabled) {
        await WakelockPlus.enable();
        debugPrint('🔋 Wakelock enabled to keep screen on');
      }
    } catch (e) {
      debugPrint('⚠️ Failed to enable wakelock: $e');
    }
  }

  Future<void> _startForegroundService() async {
    try {
      const platform = MethodChannel('sms_channel');
      await platform.invokeMethod('startForegroundService');
      debugPrint('🔄 Foreground service started');
    } catch (e) {
      debugPrint('⚠️ Failed to start foreground service: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SMS Gateway Service',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF38ada9),
        ), // Using DoctorMind primary color
        useMaterial3: true,
      ),
      home: widget.isAuthenticated ? const HomePage() : const LoginPage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool _isLoading = true;
  final ErpSmsService _erpSmsService = ErpSmsService();
  final AuthService _authService = AuthService();
  Timer? _statusUpdateTimer;
  List<Map<String, dynamic>> _smsMessages = [];

  @override
  void initState() {
    super.initState();
    _ensureScreenStaysOn();
    _initializeApp();

    // Update status and SMS list every 5 seconds
    _statusUpdateTimer = Timer.periodic(const Duration(seconds: 5), (
      timer,
    ) async {
      if (mounted) {
        await _loadSmsMessages();
        // Ensure wakelock is still enabled
        _ensureScreenStaysOn();
        setState(() {
          // Trigger rebuild to update status and times
        });
      }
    });
  }

  @override
  void dispose() {
    _statusUpdateTimer?.cancel();
    // CRITICAL: We don't disable wakelock on dispose to keep phone awake
    // The app must stay running even when closed
    super.dispose();
  }

  Future<void> _ensureScreenStaysOn() async {
    try {
      if (!await WakelockPlus.enabled) {
        await WakelockPlus.enable();
        debugPrint('🔋 Screen wake lock enabled');
      }
    } catch (e) {
      debugPrint('⚠️ Failed to enable wake lock: $e');
    }
  }

  Future<void> _initializeApp() async {
    try {
      // Request battery optimization exemption to prevent system from killing app
      await _requestBatteryOptimizationExemption();

      // Verify backend health
      debugPrint('🏥 Verifying backend health...');
      final healthResult = await _authService.checkHealth();
      if (healthResult['success'] == true) {
        debugPrint('✅ Backend is online and healthy');
      } else {
        debugPrint(
          '⚠️ Backend health check failed: ${healthResult['message']}',
        );
      }

      // Ensure authentication is ready before starting ERP polling
      if (_authService.isAuthenticated) {
        debugPrint('✅ User is authenticated, starting ERP polling...');
        await _erpSmsService.restartAfterAuth();
      } else {
        debugPrint('⚠️ User not authenticated, ERP polling will not start');
        await _authService.initialize();
        if (_authService.isAuthenticated) {
          debugPrint('✅ Authentication restored, starting ERP polling...');
          await _erpSmsService.restartAfterAuth();
        }
      }

      // Load SMS messages
      await _loadSmsMessages();

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      debugPrint('Error initializing: $e');
    }
  }

  Future<void> _requestBatteryOptimizationExemption() async {
    try {
      const platform = MethodChannel('sms_channel');
      await platform.invokeMethod('requestBatteryOptimization');
      debugPrint('🔋 Battery optimization exemption requested');
    } catch (e) {
      debugPrint('⚠️ Failed to request battery optimization exemption: $e');
    }
  }

  Future<void> _loadSmsMessages() async {
    try {
      final messages = await _erpSmsService.getSmsMessages(limit: 50);
      if (mounted) {
        setState(() {
          _smsMessages = messages;
        });
      }
    } catch (e) {
      debugPrint('Error loading SMS messages: $e');
    }
  }

  Widget _buildStatusCard() {
    final isConnected = _authService.isConnected;
    final connectionHealth = _erpSmsService.connectionHealth;
    final avgRequestMs = _erpSmsService.averageRequestTimeMs;
    final avgResponseMs = _erpSmsService.averageResponseTimeMs;

    Color statusColor;
    IconData statusIcon;
    String statusText;

    if (!isConnected) {
      statusColor = Colors.red;
      statusIcon = Icons.cloud_off;
      statusText = 'Disconnected';
    } else if (connectionHealth == 'Healthy') {
      statusColor = Colors.green;
      statusIcon = Icons.cloud_done;
      statusText = 'Connected';
    } else if (connectionHealth == 'Warning') {
      statusColor = Colors.orange;
      statusIcon = Icons.cloud_sync;
      statusText = 'Warning';
    } else {
      statusColor = Colors.red;
      statusIcon = Icons.cloud_queue;
      statusText = 'Poor Connection';
    }

    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(statusIcon, color: statusColor, size: 32),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'SMS Gateway Status',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        statusText,
                        style: TextStyle(
                          color: statusColor,
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: _buildStatItem(
                    'Request Time',
                    '${avgRequestMs.toStringAsFixed(0)} ms',
                    Icons.send,
                    Colors.blue,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildStatItem(
                    'Response Time',
                    '${avgResponseMs.toStringAsFixed(0)} ms',
                    Icons.reply,
                    Colors.green,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Divider(),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Server',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      Text(
                        _authService.serverUrl
                            .replaceAll('http://', '')
                            .replaceAll('https://', ''),
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Polling',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      Text(
                        _erpSmsService.isPolling ? '🔄 Active' : '⏹️ Inactive',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w500,
                          color: _erpSmsService.isPolling
                              ? Colors.green
                              : Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: color),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  label,
                  style: Theme.of(
                    context,
                  ).textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: color,
            ),
            overflow: TextOverflow.ellipsis,
            maxLines: 1,
          ),
        ],
      ),
    );
  }

  Widget _buildSmsList() {
    if (_smsMessages.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            children: [
              Icon(Icons.inbox, size: 48, color: Colors.grey[400]),
              const SizedBox(height: 16),
              Text(
                'No SMS messages yet',
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(color: Colors.grey[600]),
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                const Icon(Icons.message, size: 24),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    'SMS Messages',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const Spacer(),
                Text(
                  '${_smsMessages.length}',
                  style: Theme.of(
                    context,
                  ).textTheme.titleMedium?.copyWith(color: Colors.grey[600]),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _smsMessages.length > 20 ? 20 : _smsMessages.length,
            separatorBuilder: (context, index) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final sms = _smsMessages[index];
              final status = sms['status'] as String? ?? 'unknown';
              final isSuccess = status == 'sent';
              final message = sms['message'] as String? ?? '';
              final otpCode = _extractOtpCode(message);

              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: isSuccess
                      ? Colors.green.withValues(alpha: 0.2)
                      : Colors.red.withValues(alpha: 0.2),
                  child: Icon(
                    isSuccess ? Icons.check : Icons.error,
                    color: isSuccess ? Colors.green : Colors.red,
                    size: 20,
                  ),
                ),
                title: Text(
                  sms['phone'] as String? ?? 'Unknown',
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 4),
                    // Show OTP code prominently if found
                    if (otpCode != null) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.blue.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.blue, width: 2),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.lock,
                              size: 16,
                              color: Colors.blue,
                            ),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                otpCode,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue,
                                  letterSpacing: 1.2,
                                ),
                                overflow: TextOverflow.ellipsis,
                                maxLines: 1,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                    // Show full message
                    Text(
                      message,
                      maxLines: otpCode != null ? 1 : 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _formatTimestampString(sms['timestamp'] as String? ?? ''),
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                  ],
                ),
                trailing: Chip(
                  label: Text(
                    status.toUpperCase(),
                    style: const TextStyle(fontSize: 10),
                  ),
                  backgroundColor: isSuccess
                      ? Colors.green.withValues(alpha: 0.2)
                      : Colors.red.withValues(alpha: 0.2),
                  labelStyle: TextStyle(
                    color: isSuccess ? Colors.green[900] : Colors.red[900],
                    fontWeight: FontWeight.bold,
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  String _formatTimestampString(String timestamp) {
    try {
      final dt = DateTime.parse(timestamp);
      final now = DateTime.now();
      final difference = now.difference(dt);

      if (difference.inMinutes < 1) {
        return '${difference.inSeconds}s ago';
      } else if (difference.inHours < 1) {
        return '${difference.inMinutes}m ago';
      } else if (difference.inDays < 1) {
        return '${difference.inHours}h ago';
      } else {
        return '${difference.inDays}d ago';
      }
    } catch (e) {
      return timestamp;
    }
  }

  /// Extract OTP code from SMS message
  /// Looks for 4-6 digit codes, often preceded by keywords like "code", "OTP", "كود", etc.
  String? _extractOtpCode(String message) {
    if (message.isEmpty) return null;

    // Common OTP patterns:
    // - 4-6 digit numbers
    // - May be preceded by keywords: code, OTP, verification, كود, رمز
    // - May be separated by spaces, dashes, or colons
    // - May be at the end of the message

    // Pattern 1: Look for "code" or "OTP" followed by digits
    final codePattern1 = RegExp(
      r'(?:code|otp|verification|كود|رمز)[\s:]*(\d{4,6})',
      caseSensitive: false,
    );
    final match1 = codePattern1.firstMatch(message);
    if (match1 != null && match1.group(1) != null) {
      return match1.group(1);
    }

    // Pattern 2: Look for standalone 4-6 digit numbers (common OTP length)
    final codePattern2 = RegExp(r'\b(\d{4,6})\b');
    final matches = codePattern2.allMatches(message);

    // If multiple matches, prefer the one that looks more like an OTP
    // (usually the last one or one that's isolated)
    if (matches.isNotEmpty) {
      // Get all potential codes
      final potentialCodes = matches.map((m) => m.group(1)!).toList();

      // Prefer 6-digit codes (most common OTP length)
      final sixDigit = potentialCodes.where((c) => c.length == 6).toList();
      if (sixDigit.isNotEmpty) {
        return sixDigit.last; // Return the last 6-digit code found
      }

      // Otherwise, prefer 5-digit codes
      final fiveDigit = potentialCodes.where((c) => c.length == 5).toList();
      if (fiveDigit.isNotEmpty) {
        return fiveDigit.last;
      }

      // Otherwise, return the last 4-digit code
      final fourDigit = potentialCodes.where((c) => c.length == 4).toList();
      if (fourDigit.isNotEmpty) {
        return fourDigit.last;
      }

      // Fallback: return the last match
      return potentialCodes.last;
    }

    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('SMS Gateway'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () async {
              await _loadSmsMessages();
              setState(() {});
            },
            tooltip: 'Refresh',
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (context) => const SettingsPage()),
              );
            },
            tooltip: 'Settings',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () async {
                await _loadSmsMessages();
                setState(() {});
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Status Card
                    _buildStatusCard(),
                    const SizedBox(height: 16),

                    // SMS Messages List
                    _buildSmsList(),
                  ],
                ),
              ),
            ),
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _serverUrlController = TextEditingController();
  bool _isLoading = false;
  bool _showAdvanced = false;
  List<String> _suggestedIPs = [];
  final AuthService _authService = AuthService();

  @override
  void initState() {
    super.initState();
    _autoSetup();
  }

  Future<void> _autoSetup() async {
    setState(() {
      _isLoading = true;
    });

    try {
      // Auto-configure from EnvironmentConfig
      _serverUrlController.text = _authService.serverUrl;

      // First, verify backend is online using health check
      debugPrint('🏥 Verifying backend health...');
      final healthResult = await _authService.checkHealth();

      if (healthResult['success'] == true) {
        debugPrint('✅ Backend is online: ${healthResult['message']}');
      } else {
        debugPrint(
          '⚠️ Backend health check failed: ${healthResult['message']}',
        );
        // Continue anyway, will retry
      }

      // Try to auto-register device
      if (!_authService.isAuthenticated) {
        debugPrint('📱 Auto-registering device...');
        final success = await _authService.registerDevice();

        if (success && _authService.isAuthenticated) {
          // Successfully registered, go to home
          if (mounted) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(builder: (context) => const HomePage()),
            );
            return;
          }
        }
      } else {
        // Already authenticated, verify health and go to home
        if (healthResult['success'] == true && mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => const HomePage()),
          );
          return;
        }
      }

      // Load suggested IPs for advanced settings
      final suggestions = await _authService.getSuggestedIPs();
      setState(() {
        _suggestedIPs = suggestions;
      });
    } catch (e) {
      debugPrint('❌ Auto-setup error: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _serverUrlController.dispose();
    super.dispose();
  }

  Future<void> _testConnection() async {
    if (_serverUrlController.text.isEmpty) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final result = await _authService.testConnection(
        _serverUrlController.text,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message']),
            backgroundColor: result['success'] ? Colors.green : Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Widget _buildConnectOverLanCard(BuildContext context) {
    return Card(
      color: Theme.of(context)
          .colorScheme
          .primaryContainer
          .withValues(alpha: 0.3),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.info_outline,
                  size: 20,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Connect over same Wi‑Fi (LAN)',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '1) Connect phone and computer to the same '
              'Wi‑Fi.\n2) Find your computer\'s IP (e.g. '
              'ipconfig on Windows).\n3) Enter '
              'http://YOUR_IP:8000 below.\n4) Tap '
              '"Test Connection".',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.sms, size: 80, color: Color(0xFF38ada9)),
              const SizedBox(height: 32),
              Text(
                'DataForge SMS Gateway',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 32),
              const CircularProgressIndicator(),
              const SizedBox(height: 16),
              Text(
                'Auto-configuring...',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 8),
              Text(
                'Server: ${_authService.serverUrl}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('SMS Gateway Setup'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          IconButton(
            icon: Icon(_showAdvanced ? Icons.expand_less : Icons.expand_more),
            onPressed: () {
              setState(() {
                _showAdvanced = !_showAdvanced;
              });
            },
            tooltip: _showAdvanced ? 'Hide Advanced' : 'Show Advanced',
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.sms, size: 80, color: Color(0xFF38ada9)),
                const SizedBox(height: 32),
                Text(
                  'DataForge SMS Gateway',
                  style: Theme.of(context).textTheme.headlineSmall,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                if (EnvironmentConfig.isLanWithoutApiUrl) ...[
                  _buildConnectOverLanCard(context),
                  const SizedBox(height: 16),
                ],
                Card(
                  color: Colors.green.withValues(alpha: 0.1),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      children: [
                        const Icon(
                          Icons.check_circle,
                          color: Colors.green,
                          size: 48,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Auto-Configured!',
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Server: ${_authService.serverUrl}',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        Text(
                          'Status: ${_authService.isAuthenticated ? "Connected" : "Not Connected"}',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        FutureBuilder<Map<String, dynamic>>(
                          future: _authService.checkHealth(),
                          builder: (context, snapshot) {
                            if (snapshot.connectionState ==
                                ConnectionState.waiting) {
                              return const Padding(
                                padding: EdgeInsets.only(top: 8.0),
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              );
                            }
                            if (snapshot.hasData) {
                              final health = snapshot.data!;
                              final isHealthy = health['success'] == true;
                              return Padding(
                                padding: const EdgeInsets.only(top: 8.0),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      isHealthy
                                          ? Icons.health_and_safety
                                          : Icons.error,
                                      color: isHealthy
                                          ? Colors.green
                                          : Colors.red,
                                      size: 20,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      isHealthy
                                          ? 'Backend Online'
                                          : 'Backend Offline',
                                      style: TextStyle(
                                        color: isHealthy
                                            ? Colors.green
                                            : Colors.red,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }
                            return const SizedBox.shrink();
                          },
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: () async {
                            setState(() {
                              _isLoading = true;
                            });
                            try {
                              await _authService.registerDevice();
                              if (_authService.isAuthenticated && mounted) {
                                Navigator.of(context).pushReplacement(
                                  MaterialPageRoute(
                                    builder: (context) => const HomePage(),
                                  ),
                                );
                              }
                            } finally {
                              if (mounted) {
                                setState(() {
                                  _isLoading = false;
                                });
                              }
                            }
                          },
                          icon: const Icon(Icons.refresh),
                          label: const Text('Connect Now'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF38ada9),
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                if (_showAdvanced) ...[
                  Text(
                    'Advanced Settings',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 16),
                  Card(
                    color: Theme.of(context)
                        .colorScheme
                        .primaryContainer
                        .withOpacity(0.3),
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.info_outline,
                                size: 20,
                                color:
                                    Theme.of(context).colorScheme.primary,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Connect over same Wi‑Fi (LAN)',
                                style:
                                    Theme.of(context).textTheme.titleSmall,
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '1) Connect phone and computer to the same '
                            'Wi‑Fi.\n2) Find your computer\'s IP (e.g. '
                            'ipconfig on Windows).\n3) Enter '
                            'http://YOUR_IP:8000 below.\n4) Tap '
                            '"Test Connection".',
                            style:
                                Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _serverUrlController,
                    decoration: InputDecoration(
                      labelText: 'Server URL (Machine IP)',
                      hintText: 'http://192.168.1.4:8000',
                      prefixIcon: const Icon(Icons.link),
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.wifi_find),
                        onPressed: _testConnection,
                        tooltip: 'Test Connection',
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter server URL';
                      }
                      if (!value.startsWith('http://') &&
                          !value.startsWith('https://')) {
                        return 'URL must start with http:// or https://';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 8),
                  if (_suggestedIPs.isNotEmpty) ...[
                    Text(
                      'Use your computer\'s IP (ipconfig / ifconfig) when '
                      'connecting over LAN. Common patterns:',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 4),
                    Wrap(
                      spacing: 8,
                      children: _suggestedIPs
                          .map(
                            (ip) => ActionChip(
                              label: Text(
                                ip
                                    .replaceAll('http://', '')
                                    .replaceAll(':8000', ''),
                                style: const TextStyle(fontSize: 12),
                              ),
                              onPressed: () {
                                _serverUrlController.text = ip;
                              },
                            ),
                          )
                          .toList(),
                    ),
                    const SizedBox(height: 16),
                  ],
                  ElevatedButton(
                    onPressed: () async {
                      if (_formKey.currentState!.validate()) {
                        setState(() {
                          _isLoading = true;
                        });
                        try {
                          await _authService.updateServerUrl(
                            _serverUrlController.text,
                          );
                          await _authService.registerDevice();
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'Server URL updated successfully',
                                ),
                                backgroundColor: Colors.green,
                              ),
                            );
                            setState(() {
                              _isLoading = false;
                            });
                          }
                        } catch (e) {
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Error: $e'),
                                backgroundColor: Colors.red,
                              ),
                            );
                            setState(() {
                              _isLoading = false;
                            });
                          }
                        }
                      }
                    },
                    child: const Text('Update Server URL'),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  final _formKey = GlobalKey<FormState>();
  final _serverUrlController = TextEditingController();
  final AuthService _authService = AuthService();
  List<String> _suggestedIPs = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  @override
  void dispose() {
    _serverUrlController.dispose();
    super.dispose();
  }

  Future<void> _loadSettings() async {
    _serverUrlController.text = _authService.serverUrl;
    final suggestions = await _authService.getSuggestedIPs();
    setState(() {
      _suggestedIPs = suggestions;
    });
  }

  Future<void> _testConnection() async {
    if (_serverUrlController.text.isEmpty) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final result = await _authService.testConnection(
        _serverUrlController.text,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message']),
            backgroundColor: result['success'] ? Colors.green : Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _saveSettings() async {
    if (_formKey.currentState!.validate()) {
      try {
        await _authService.updateServerUrl(_serverUrlController.text);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Settings saved successfully')),
          );
          Navigator.of(context).pop();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('Error saving settings: $e')));
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Server Configuration',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 16),
              Card(
                color: Theme.of(context)
                    .colorScheme
                    .primaryContainer
                    .withOpacity(0.3),
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.info_outline,
                            size: 20,
                            color:
                                Theme.of(context).colorScheme.primary,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Connect over same Wi‑Fi (LAN)',
                            style:
                                Theme.of(context).textTheme.titleSmall,
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '1) Connect phone and computer to the same '
                        'Wi‑Fi.\n2) Find your computer\'s IP (e.g. '
                        'ipconfig on Windows).\n3) Enter '
                        'http://YOUR_IP:8000 below.\n4) Tap '
                        '"Test Connection".',
                        style:
                            Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _serverUrlController,
                decoration: InputDecoration(
                  labelText: 'Server URL (Machine IP)',
                  hintText: 'http://192.168.1.4:8000',
                  prefixIcon: const Icon(Icons.link),
                  suffixIcon: IconButton(
                    icon: _isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.wifi_find),
                    onPressed: _isLoading ? null : _testConnection,
                    tooltip: 'Test Connection',
                  ),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter server URL';
                  }
                  if (!value.startsWith('http://') &&
                      !value.startsWith('https://')) {
                    return 'URL must start with http:// or https://';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Suggested IPs
              if (_suggestedIPs.isNotEmpty) ...[
                Text(
                  'Use your computer\'s IP (ipconfig / ifconfig) when '
                  'connecting over LAN. Common patterns:',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 8),
                ...(_suggestedIPs.map(
                  (ip) => Card(
                    child: ListTile(
                      leading: const Icon(Icons.network_wifi),
                      title: Text(ip),
                      trailing: IconButton(
                        icon: const Icon(Icons.copy),
                        onPressed: () {
                          _serverUrlController.text = ip;
                        },
                      ),
                      onTap: () {
                        _serverUrlController.text = ip;
                      },
                    ),
                  ),
                )),
                const SizedBox(height: 16),
              ],

              const Spacer(),
              ElevatedButton(
                onPressed: _saveSettings,
                child: const Text('Save Settings'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
