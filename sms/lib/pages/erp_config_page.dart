import 'package:flutter/material.dart';
import '../services/erp_sms_service.dart';
import '../services/auth_service.dart';
import 'dart:async';

class ErpConfigPage extends StatefulWidget {
  const ErpConfigPage({super.key});

  @override
  State<ErpConfigPage> createState() => _ErpConfigPageState();
}

class _ErpConfigPageState extends State<ErpConfigPage> {
  final _formKey = GlobalKey<FormState>();
  final _baseUrlController = TextEditingController();
  final _emailController = TextEditingController(text: 'admin@dataforge.com');
  final _passwordController = TextEditingController(text: 'Admin123!');

  bool _isLoading = false;
  bool _isConnected = false;
  String _connectionStatus = 'غير متصل';
  String _deviceId = '';
  List<String> _suggestedIPs = [];

  final ErpSmsService _erpService = ErpSmsService();
  final AuthService _authService = AuthService();
  Timer? _statusUpdateTimer;

  @override
  void initState() {
    super.initState();
    _loadCurrentConfig();
    _startStatusUpdates();
  }

  @override
  void dispose() {
    _baseUrlController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _statusUpdateTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadCurrentConfig() async {
    setState(() {
      _isLoading = true;
    });

    try {
      _baseUrlController.text = _authService.serverUrl;
      _isConnected = _authService.isConnected;
      _deviceId = 'SMS Gateway Device';

      final suggestions = await _authService.getSuggestedIPs();
      setState(() {
        _suggestedIPs = suggestions;
        _connectionStatus = _isConnected ? 'متصل' : 'غير متصل';
      });
    } catch (e) {
      debugPrint('Error loading config: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _startStatusUpdates() {
    // Update status every 5 seconds
    _statusUpdateTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (mounted) {
        setState(() {
          _isConnected = _authService.isConnected;
          _connectionStatus = _authService.connectionStatus;
        });
      }
    });
  }

  Future<void> _saveConfiguration() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      // Update server URL
      await _authService.updateServerUrl(_baseUrlController.text.trim());

      // Try to authenticate with new URL
      final result = await _authService.login(
        _emailController.text.trim(),
        _passwordController.text.trim(),
      );

      if (result['success'] == true) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('تم حفظ الإعدادات وتسجيل الدخول بنجاح'),
            backgroundColor: Colors.green,
          ),
        );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('فشل في تسجيل الدخول: ${result['message']}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }

      // Reload configuration
      await _loadCurrentConfig();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('خطأ في حفظ الإعدادات: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _testConnection() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final result = await _authService.testConnection(
        _baseUrlController.text.trim(),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              result['success'] == true
                  ? 'تم الاتصال بنجاح'
                  : 'فشل في الاتصال: ${result['message']}',
            ),
            backgroundColor:
                result['success'] == true ? Colors.green : Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('خطأ في اختبار الاتصال: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('إعدادات ERP'),
        backgroundColor: const Color(0xFF38ada9),
        foregroundColor: Colors.white,
      ),
      body:
          _isLoading
              ? const Center(child: CircularProgressIndicator())
              : SingleChildScrollView(
                padding: const EdgeInsets.all(16.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Connection Status Card
                      Card(
                        color:
                            _isConnected
                                ? Colors.green.withValues(alpha: 0.1)
                                : Colors.red.withValues(alpha: 0.1),
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    _isConnected
                                        ? Icons.check_circle
                                        : Icons.error,
                                    color:
                                        _isConnected
                                            ? Colors.green
                                            : Colors.red,
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'حالة الاتصال',
                                    style:
                                        Theme.of(context).textTheme.titleMedium,
                                  ),
                                  const Spacer(),
                                  IconButton(
                                    icon: const Icon(Icons.refresh),
                                    onPressed: () async {
                                      await _authService.checkConnection();
                                      setState(() {});
                                    },
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text('الحالة: $_connectionStatus'),
                              Text('الخادم: ${_authService.serverUrl}'),
                              Text('معرف الجهاز: $_deviceId'),
                              Text(
                                'صحة الاتصال: ${_erpService.connectionHealth}',
                              ),
                              if (_erpService.consecutiveFailures > 0)
                                Text(
                                  'الأخطاء المتتالية: ${_erpService.consecutiveFailures}',
                                  style: const TextStyle(color: Colors.red),
                                ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Configuration Form
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'إعدادات الاتصال',
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
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Icon(
                                            Icons.info_outline,
                                            size: 20,
                                            color: Theme.of(context)
                                                .colorScheme
                                                .primary,
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            'Connect over same Wi‑Fi (LAN)',
                                            style: Theme.of(context)
                                                .textTheme
                                                .titleSmall,
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        '1) Connect phone and computer to '
                                        'the same Wi‑Fi.\n2) Find your '
                                        'computer\'s IP (e.g. ipconfig on '
                                        'Windows).\n3) Enter '
                                        'http://YOUR_IP:8000 below.\n4) Tap '
                                        '"Test Connection".',
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 16),
                              TextFormField(
                                controller: _baseUrlController,
                                decoration: InputDecoration(
                                  labelText: 'رابط الخادم (IP الجهاز)',
                                  hintText: 'http://192.168.1.4:8000',
                                  border: const OutlineInputBorder(),
                                  suffixIcon: IconButton(
                                    icon: const Icon(Icons.wifi_find),
                                    onPressed: _testConnection,
                                  ),
                                ),
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'يرجى إدخال رابط الخادم';
                                  }
                                  if (!value.startsWith('http://') &&
                                      !value.startsWith('https://')) {
                                    return 'يجب أن يبدأ الرابط بـ http:// أو https://';
                                  }
                                  return null;
                                },
                              ),

                              const SizedBox(height: 8),

                              // Suggested IPs
                              if (_suggestedIPs.isNotEmpty) ...[
                                Text(
                                  'Use your computer\'s IP (ipconfig / '
                                  'ifconfig) when connecting over LAN. '
                                  'Common patterns:',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                                const SizedBox(height: 4),
                                Wrap(
                                  spacing: 8,
                                  children:
                                      _suggestedIPs
                                          .map(
                                            (ip) => ActionChip(
                                              label: Text(
                                                ip
                                                    .replaceAll('http://', '')
                                                    .replaceAll(':8000', ''),
                                                style: const TextStyle(
                                                  fontSize: 12,
                                                ),
                                              ),
                                              onPressed: () {
                                                _baseUrlController.text = ip;
                                              },
                                            ),
                                          )
                                          .toList(),
                                ),
                                const SizedBox(height: 16),
                              ],

                              TextFormField(
                                controller: _emailController,
                                decoration: const InputDecoration(
                                  labelText: 'البريد الإلكتروني',
                                  hintText: 'admin@dataforge.com',
                                  border: OutlineInputBorder(),
                                  prefixIcon: Icon(Icons.email),
                                ),
                                keyboardType: TextInputType.emailAddress,
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'يرجى إدخال البريد الإلكتروني';
                                  }
                                  return null;
                                },
                              ),

                              const SizedBox(height: 16),

                              TextFormField(
                                controller: _passwordController,
                                decoration: const InputDecoration(
                                  labelText: 'كلمة المرور',
                                  hintText: 'Admin123!',
                                  border: OutlineInputBorder(),
                                  prefixIcon: Icon(Icons.lock),
                                ),
                                obscureText: true,
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'يرجى إدخال كلمة المرور';
                                  }
                                  return null;
                                },
                              ),

                              const SizedBox(height: 24),

                              Row(
                                children: [
                                  Expanded(
                                    child: ElevatedButton(
                                      onPressed:
                                          _isLoading ? null : _testConnection,
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.orange,
                                        foregroundColor: Colors.white,
                                      ),
                                      child: const Text('اختبار الاتصال'),
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: ElevatedButton(
                                      onPressed:
                                          _isLoading
                                              ? null
                                              : _saveConfiguration,
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(
                                          0xFF38ada9,
                                        ),
                                        foregroundColor: Colors.white,
                                      ),
                                      child: const Text('حفظ الإعدادات'),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Information Card
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'معلومات مهمة',
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                '• هذا التطبيق يعمل كبوابة SMS لـ ERP\n'
                                '• يجب أن يكون خادم ERP متاحاً على الشبكة المحلية\n'
                                '• استخدم عنوان IP الخاص بالجهاز للاتصالات الخارجية\n'
                                '• سيتم إرسال الرسائل تلقائياً عند استلامها من ERP\n'
                                '• يمكن مراقبة حالة الاتصال والرسائل المعلقة\n'
                                '• التطبيق يرسل نبضات قلب كل دقيقة',
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Service Control Card
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'التحكم في الخدمة',
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              const SizedBox(height: 16),
                              Row(
                                children: [
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      onPressed:
                                          _erpService.isPolling
                                              ? () async {
                                                await _erpService.stopPolling();
                                                setState(() {});
                                              }
                                              : () async {
                                                await _erpService
                                                    .startPolling();
                                                setState(() {});
                                              },
                                      icon: Icon(
                                        _erpService.isPolling
                                            ? Icons.stop
                                            : Icons.play_arrow,
                                      ),
                                      label: Text(
                                        _erpService.isPolling
                                            ? 'إيقاف الخدمة'
                                            : 'تشغيل الخدمة',
                                      ),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor:
                                            _erpService.isPolling
                                                ? Colors.red
                                                : Colors.green,
                                        foregroundColor: Colors.white,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'حالة الخدمة: ${_erpService.isPolling ? "🔄 نشطة" : "⏹️ متوقفة"}',
                                style: TextStyle(
                                  color:
                                      _erpService.isPolling
                                          ? Colors.green
                                          : Colors.red,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
    );
  }
}
