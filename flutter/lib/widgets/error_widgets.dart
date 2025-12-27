import 'package:flutter/material.dart';

class ErrorAlert extends StatelessWidget {
  final String message;
  final VoidCallback? onDismiss;
  final AlertType type;
  final bool showIcon;

  const ErrorAlert({
    Key? key,
    required this.message,
    this.onDismiss,
    this.type = AlertType.error,
    this.showIcon = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final colors = _getColors(isDark);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: colors['backgroundColor'],
        border: Border.all(color: colors['borderColor']!),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          if (showIcon) ...[
            Text(
              _getIcon(),
              style: const TextStyle(fontSize: 20),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                color: colors['textColor'],
                fontSize: 14,
              ),
            ),
          ),
          if (onDismiss != null) ...[
            const SizedBox(width: 12),
            GestureDetector(
              onTap: onDismiss,
              child: Text(
                '✕',
                style: TextStyle(
                  color: colors['textColor'],
                  fontSize: 18,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Map<String, Color?> _getColors(bool isDark) {
    switch (type) {
      case AlertType.error:
        return {
          'backgroundColor': isDark ? Colors.red[900]!.withOpacity(0.2) : Colors.red[50],
          'borderColor': isDark ? Colors.red[800] : Colors.red[200],
          'textColor': isDark ? Colors.red[400] : Colors.red[700],
        };
      case AlertType.warning:
        return {
          'backgroundColor': isDark ? Colors.orange[900]!.withOpacity(0.2) : Colors.orange[50],
          'borderColor': isDark ? Colors.orange[800] : Colors.orange[200],
          'textColor': isDark ? Colors.orange[400] : Colors.orange[700],
        };
      case AlertType.success:
        return {
          'backgroundColor': isDark ? Colors.green[900]!.withOpacity(0.2) : Colors.green[50],
          'borderColor': isDark ? Colors.green[800] : Colors.green[200],
          'textColor': isDark ? Colors.green[400] : Colors.green[700],
        };
      case AlertType.info:
        return {
          'backgroundColor': isDark ? Colors.blue[900]!.withOpacity(0.2) : Colors.blue[50],
          'borderColor': isDark ? Colors.blue[800] : Colors.blue[200],
          'textColor': isDark ? Colors.blue[400] : Colors.blue[700],
        };
    }
  }

  String _getIcon() {
    switch (type) {
      case AlertType.error:
        return '⚠️';
      case AlertType.warning:
        return '⚡';
      case AlertType.success:
        return '✅';
      case AlertType.info:
        return 'ℹ️';
    }
  }
}

enum AlertType { error, warning, success, info }

class ErrorScreen extends StatelessWidget {
  final String title;
  final String message;
  final VoidCallback? onRetry;

  const ErrorScreen({
    Key? key,
    required this.title,
    required this.message,
    this.onRetry,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Error'),
        elevation: 0,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                '⚠️',
                style: TextStyle(fontSize: 64),
              ),
              const SizedBox(height: 24),
              Text(
                title,
                style: Theme.of(context).textTheme.headlineSmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                message,
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              if (onRetry != null) ...[
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: onRetry,
                  child: const Text('Retry'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
