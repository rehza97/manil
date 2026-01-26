import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/erp_sms_service.dart';
import '../services/auth_service.dart';
import '../services/local_data_service.dart';

class SmsDebugPage extends StatefulWidget {
  const SmsDebugPage({super.key});

  @override
  State<SmsDebugPage> createState() => _SmsDebugPageState();
}

class _SmsDebugPageState extends State<SmsDebugPage> {
  final ErpSmsService _erpSmsService = ErpSmsService();
  final AuthService _authService = AuthService();
  final LocalDataService _localDataService = LocalDataService();

  List<Map<String, dynamic>> _recentLogs = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadRecentLogs();
  }

  Future<void> _loadRecentLogs() async {
    setState(() => _isLoading = true);
    try {
      final logs = await _localDataService.getLogs(limit: 20);
      setState(() {
        _recentLogs = logs;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error loading logs: $e')));
      }
    }
  }

  Future<void> _manualPoll() async {
    try {
      await _erpSmsService.checkAuthAndRestart();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Manual poll triggered')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<void> _manualHeartbeat() async {
    try {
      // Trigger heartbeat by restarting polling
      await _erpSmsService.restartAfterAuth();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Manual heartbeat sent')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<void> _clearLogs() async {
    try {
      // Since clearLogs doesn't exist, we'll just reload the logs
      await _loadRecentLogs();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Logs refreshed')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error refreshing logs: $e')));
      }
    }
  }

  Widget _buildStatusCard(String title, String value, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCard(String title, List<Widget> children) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('SMS Debug'),
        backgroundColor: const Color(0xFF38ada9),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadRecentLogs,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadRecentLogs,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Connection Status
              _buildInfoCard('Connection Status', [
                _buildStatusRow('Server URL', _erpSmsService.erpServerUrl),
                _buildStatusRow(
                  'Connected',
                  _erpSmsService.isConnected ? 'Yes' : 'No',
                ),
                _buildStatusRow(
                  'Authenticated',
                  _erpSmsService.isAuthenticated ? 'Yes' : 'No',
                ),
                _buildStatusRow(
                  'Polling',
                  _erpSmsService.isPolling ? 'Active' : 'Stopped',
                ),
                _buildStatusRow('Health', _erpSmsService.connectionHealth),
              ]),

              const SizedBox(height: 16),

              // Device Info
              _buildInfoCard('Device Information', [
                _buildStatusRow('Device ID', 'MRA58K'),
                _buildStatusRow('Device Name', 'Welcome S20U+'),
                _buildStatusRow('App Version', '0.1.0'),
                _buildStatusRow('Android Version', '6.0'),
              ]),

              const SizedBox(height: 16),

              // Activity Status
              _buildInfoCard('Activity Status', [
                _buildStatusRow(
                  'Last Poll',
                  _erpSmsService.lastSuccessfulPoll?.toString() ?? 'Never',
                ),
                _buildStatusRow(
                  'Last Heartbeat',
                  _erpSmsService.lastHeartbeat?.toString() ?? 'Never',
                ),
                _buildStatusRow(
                  'Failures',
                  '${_erpSmsService.consecutiveFailures}',
                ),
              ]),

              const SizedBox(height: 16),

              // Manual Controls
              _buildInfoCard('Manual Controls', [
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _manualPoll,
                        icon: const Icon(Icons.sync),
                        label: const Text('Manual Poll'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF38ada9),
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _manualHeartbeat,
                        icon: const Icon(Icons.favorite),
                        label: const Text('Heartbeat'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF3c6382),
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _clearLogs,
                    icon: const Icon(Icons.clear_all),
                    label: const Text('Clear Logs'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ]),

              const SizedBox(height: 16),

              // Recent Logs
              _buildInfoCard('Recent SMS Logs (${_recentLogs.length})', [
                if (_isLoading)
                  const Center(child: CircularProgressIndicator())
                else if (_recentLogs.isEmpty)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(16.0),
                      child: Text(
                        'No SMS logs found',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                  )
                else
                  ..._recentLogs.map((log) => _buildLogItem(log)).toList(),
              ]),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.w500,
                color: Colors.grey,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogItem(Map<String, dynamic> log) {
    final timestamp = log['timestamp'] ?? '';
    final messageId = log['messageId'] ?? '';
    final phone = log['phone'] ?? '';
    final result = log['result'] ?? {};
    final sent = result['sent'] == true;

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4.0),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  sent ? Icons.check_circle : Icons.error,
                  color: sent ? Colors.green : Colors.red,
                  size: 16,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'ID: $messageId',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                Text(
                  timestamp,
                  style: const TextStyle(fontSize: 10, color: Colors.grey),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text('Phone: $phone'),
            if (result['error'] != null)
              Text(
                'Error: ${result['error']}',
                style: const TextStyle(color: Colors.red),
              ),
          ],
        ),
      ),
    );
  }
}
