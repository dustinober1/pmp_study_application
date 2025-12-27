import 'dart:io';
import 'package:flutter/foundation.dart';

/// Service for handling file picking operations
class FilePickerService {
  /// Pick a JSON file from device storage
  ///
  /// Returns the file if successful, null if cancelled
  /// Throws exception if file cannot be accessed
  static Future<File?> pickJsonFile() async {
    if (kIsWeb) {
      // Web platform file picking would be handled differently
      // For now, throw an exception indicating web support is needed
      throw UnsupportedError('File picker not implemented for web platform');
    }

    if (Platform.isAndroid || Platform.isIOS) {
      return _pickJsonFileNative();
    }

    throw UnsupportedError('Platform not supported for file picking');
  }

  /// Native platform file picker for Android/iOS
  static Future<File?> _pickJsonFileNative() async {
    // This would typically use a package like file_picker
    // For now, this is a placeholder that shows the expected interface
    // In production, you would add 'file_picker' package to pubspec.yaml

    // Example implementation would be:
    // final result = await FilePicker.platform.pickFiles(
    //   type: FileType.custom,
    //   allowedExtensions: ['json'],
    // );
    // if (result != null && result.files.isNotEmpty) {
    //   return File(result.files.first.path!);
    // }
    // return null;

    throw UnsupportedError(
      'Native file picker requires file_picker package. Add it to pubspec.yaml: file_picker: ^5.5.0',
    );
  }

  /// Validate that a file is a JSON file
  static bool isJsonFile(File file) {
    return file.path.toLowerCase().endsWith('.json');
  }

  /// Get file size in human-readable format
  static String getFileSize(File file) {
    final bytes = file.lengthSync();
    if (bytes < 1024) {
      return '$bytes B';
    } else if (bytes < 1024 * 1024) {
      return '${(bytes / 1024).toStringAsFixed(2)} KB';
    } else {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(2)} MB';
    }
  }
}
