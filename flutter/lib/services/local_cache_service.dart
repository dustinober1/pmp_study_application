import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import '../models/flashcard_model.dart';
import 'package:riverpod/riverpod.dart';

class LocalCacheService {
  static final LocalCacheService _instance = LocalCacheService._internal();
  static Database? _database;

  factory LocalCacheService() {
    return _instance;
  }

  LocalCacheService._internal();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final documentsDirectory = await getApplicationDocumentsDirectory();
    final path = join(documentsDirectory.path, 'pmp_study_cache.db');

    return openDatabase(
      path,
      version: 1,
      onCreate: _createTables,
    );
  }

  Future<void> _createTables(Database db, int version) async {
    await db.execute('''
      CREATE TABLE IF NOT EXISTS flashcards (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        domainId TEXT NOT NULL,
        taskId TEXT NOT NULL,
        repetitions INTEGER DEFAULT 0,
        easeFactor REAL DEFAULT 2.5,
        interval INTEGER DEFAULT 1,
        nextReviewDate TEXT NOT NULL,
        lastReviewDate TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        isFavorite INTEGER DEFAULT 0,
        tags TEXT,
        syncStatus TEXT DEFAULT 'synced',
        lastSyncedAt TEXT
      )
    ''');

    await db.execute('''
      CREATE INDEX IF NOT EXISTS idx_flashcards_userId ON flashcards(userId)
    ''');

    await db.execute('''
      CREATE INDEX IF NOT EXISTS idx_flashcards_syncStatus ON flashcards(syncStatus)
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        flashcardId TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    ''');
  }

  // Flashcard cache operations
  Future<void> cacheFlashcard(FlashcardModel flashcard) async {
    final db = await database;
    final map = flashcard.toJson();
    map['syncStatus'] = 'synced';
    map['lastSyncedAt'] = DateTime.now().toIso8601String();

    await db.insert(
      'flashcards',
      _flattenFlashcard(map),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> cacheFlashcards(List<FlashcardModel> flashcards) async {
    final db = await database;
    final batch = db.batch();

    for (final flashcard in flashcards) {
      final map = flashcard.toJson();
      map['syncStatus'] = 'synced';
      map['lastSyncedAt'] = DateTime.now().toIso8601String();

      batch.insert(
        'flashcards',
        _flattenFlashcard(map),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }

    await batch.commit();
  }

  Future<FlashcardModel?> getFlashcard(String flashcardId) async {
    final db = await database;
    final results = await db.query(
      'flashcards',
      where: 'id = ?',
      whereArgs: [flashcardId],
    );

    if (results.isEmpty) return null;
    return _inflateFlashcard(results.first);
  }

  Future<List<FlashcardModel>> getUserFlashcards(String userId) async {
    final db = await database;
    final results = await db.query(
      'flashcards',
      where: 'userId = ?',
      whereArgs: [userId],
      orderBy: 'createdAt DESC',
    );

    return results.map(_inflateFlashcard).toList();
  }

  Future<List<FlashcardModel>> getDueFlashcards(String userId) async {
    final db = await database;
    final now = DateTime.now().toIso8601String();
    final results = await db.query(
      'flashcards',
      where: 'userId = ? AND nextReviewDate <= ?',
      whereArgs: [userId, now],
      orderBy: 'nextReviewDate ASC',
    );

    return results.map(_inflateFlashcard).toList();
  }

  Future<List<FlashcardModel>> getFlashcardsByDomain(
      String userId, String domainId) async {
    final db = await database;
    final results = await db.query(
      'flashcards',
      where: 'userId = ? AND domainId = ?',
      whereArgs: [userId, domainId],
    );

    return results.map(_inflateFlashcard).toList();
  }

  Future<List<FlashcardModel>> getFlashcardsByTask(
      String userId, String taskId) async {
    final db = await database;
    final results = await db.query(
      'flashcards',
      where: 'userId = ? AND taskId = ?',
      whereArgs: [userId, taskId],
    );

    return results.map(_inflateFlashcard).toList();
  }

  Future<void> updateFlashcard(FlashcardModel flashcard,
      {String syncStatus = 'pending'}) async {
    final db = await database;
    final map = flashcard.toJson();
    map['syncStatus'] = syncStatus;

    await db.update(
      'flashcards',
      _flattenFlashcard(map),
      where: 'id = ?',
      whereArgs: [flashcard.id],
    );
  }

  Future<void> deleteFlashcard(String flashcardId) async {
    final db = await database;
    await db.delete(
      'flashcards',
      where: 'id = ?',
      whereArgs: [flashcardId],
    );
  }

  Future<List<FlashcardModel>> getPendingSyncFlashcards() async {
    final db = await database;
    final results = await db.query(
      'flashcards',
      where: "syncStatus = 'pending'",
    );

    return results.map(_inflateFlashcard).toList();
  }

  Future<void> markFlashcardSynced(String flashcardId) async {
    final db = await database;
    await db.update(
      'flashcards',
      {
        'syncStatus': 'synced',
        'lastSyncedAt': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [flashcardId],
    );
  }

  // Sync queue operations
  Future<void> addToSyncQueue(
      String flashcardId, String operation, Map<String, dynamic> data) async {
    final db = await database;
    await db.insert(
      'sync_queue',
      {
        'flashcardId': flashcardId,
        'operation': operation,
        'data': _jsonEncode(data),
        'timestamp': DateTime.now().toIso8601String(),
      },
    );
  }

  Future<List<Map<String, dynamic>>> getSyncQueue() async {
    final db = await database;
    return await db.query(
      'sync_queue',
      orderBy: 'timestamp ASC',
    );
  }

  Future<void> clearSyncQueue(int id) async {
    final db = await database;
    await db.delete(
      'sync_queue',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> clearAllSyncQueue() async {
    final db = await database;
    await db.delete('sync_queue');
  }

  // Helper methods
  Map<String, dynamic> _flattenFlashcard(Map<String, dynamic> data) {
    return {
      'id': data['id'],
      'userId': data['userId'],
      'question': data['question'],
      'answer': data['answer'],
      'domainId': data['domainId'],
      'taskId': data['taskId'],
      'repetitions': data['repetitions'] ?? 0,
      'easeFactor': data['easeFactor'] ?? 2.5,
      'interval': data['interval'] ?? 1,
      'nextReviewDate': data['nextReviewDate'].toString(),
      'lastReviewDate': data['lastReviewDate'].toString(),
      'createdAt': data['createdAt'].toString(),
      'updatedAt': data['updatedAt'].toString(),
      'isFavorite': data['isFavorite'] == true ? 1 : 0,
      'tags': data['tags'] != null ? _jsonEncode(data['tags']) : null,
      'syncStatus': data['syncStatus'] ?? 'synced',
      'lastSyncedAt': data['lastSyncedAt'],
    };
  }

  FlashcardModel _inflateFlashcard(Map<String, dynamic> row) {
    return FlashcardModel(
      id: row['id'] as String,
      userId: row['userId'] as String,
      question: row['question'] as String,
      answer: row['answer'] as String,
      domainId: row['domainId'] as String,
      taskId: row['taskId'] as String,
      repetitions: row['repetitions'] as int? ?? 0,
      easeFactor: (row['easeFactor'] as num?)?.toDouble() ?? 2.5,
      interval: row['interval'] as int? ?? 1,
      nextReviewDate: DateTime.parse(row['nextReviewDate'] as String),
      lastReviewDate: DateTime.parse(row['lastReviewDate'] as String),
      createdAt: DateTime.parse(row['createdAt'] as String),
      updatedAt: DateTime.parse(row['updatedAt'] as String),
      isFavorite: (row['isFavorite'] as int?) == 1,
      tags: row['tags'] != null
          ? List<String>.from(_jsonDecode(row['tags'] as String) ?? [])
          : null,
    );
  }

  String _jsonEncode(dynamic value) {
    // Simple JSON encoding
    if (value is String) return value;
    if (value is List) return '[${value.join(",")}]';
    return value.toString();
  }

  dynamic _jsonDecode(String value) {
    if (value.startsWith('[') && value.endsWith(']')) {
      final cleaned = value.substring(1, value.length - 1);
      return cleaned.split(',').map((e) => e.trim()).toList();
    }
    return null;
  }

  Future<void> clearCache() async {
    final db = await database;
    await db.delete('flashcards');
    await db.delete('sync_queue');
  }
}

// Riverpod provider
final localCacheServiceProvider = Provider<LocalCacheService>((ref) {
  return LocalCacheService();
});
