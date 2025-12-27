import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod/riverpod.dart';
import '../models/flashcard_model.dart';
import '../models/user_model.dart';
import '../providers/firebase_provider.dart';

class FirestoreService {
  final FirebaseFirestore _firestore;

  FirestoreService(this._firestore);

  // User Management
  Future<void> createUserProfile(UserModel user) async {
    await _firestore.collection('users').doc(user.uid).set(user.toJson());
  }

  Future<UserModel?> getUserProfile(String userId) async {
    final doc = await _firestore.collection('users').doc(userId).get();
    if (doc.exists) {
      return UserModel.fromJson(doc.data() ?? {});
    }
    return null;
  }

  Future<void> updateUserProfile(UserModel user) async {
    await _firestore
        .collection('users')
        .doc(user.uid)
        .update(user.toJson());
  }

  // Flashcard Management
  Future<void> createFlashcard(FlashcardModel flashcard) async {
    await _firestore
        .collection('flashcards')
        .doc(flashcard.id)
        .set(flashcard.toJson());
  }

  Future<FlashcardModel?> getFlashcard(String flashcardId) async {
    final doc =
        await _firestore.collection('flashcards').doc(flashcardId).get();
    if (doc.exists) {
      return FlashcardModel.fromJson(doc.data() ?? {});
    }
    return null;
  }

  Future<void> updateFlashcard(FlashcardModel flashcard) async {
    await _firestore
        .collection('flashcards')
        .doc(flashcard.id)
        .update(flashcard.toJson());
  }

  Future<void> deleteFlashcard(String flashcardId) async {
    await _firestore.collection('flashcards').doc(flashcardId).delete();
  }

  // Get user's flashcards
  Stream<List<FlashcardModel>> getUserFlashcards(String userId) {
    return _firestore
        .collection('flashcards')
        .where('userId', isEqualTo: userId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => FlashcardModel.fromJson(doc.data()))
          .toList();
    });
  }

  // Get flashcards due for review
  Stream<List<FlashcardModel>> getDueFlashcards(String userId) {
    return _firestore
        .collection('flashcards')
        .where('userId', isEqualTo: userId)
        .where('nextReviewDate', isLessThanOrEqualTo: DateTime.now())
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => FlashcardModel.fromJson(doc.data()))
          .toList();
    });
  }

  // Get flashcards by domain
  Stream<List<FlashcardModel>> getFlashcardsByDomain(
      String userId, String domainId) {
    return _firestore
        .collection('flashcards')
        .where('userId', isEqualTo: userId)
        .where('domainId', isEqualTo: domainId)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => FlashcardModel.fromJson(doc.data()))
          .toList();
    });
  }

  // Get flashcards by task
  Stream<List<FlashcardModel>> getFlashcardsByTask(
      String userId, String taskId) {
    return _firestore
        .collection('flashcards')
        .where('userId', isEqualTo: userId)
        .where('taskId', isEqualTo: taskId)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => FlashcardModel.fromJson(doc.data()))
          .toList();
    });
  }

  // Batch operations
  Future<void> batchCreateFlashcards(List<FlashcardModel> flashcards) async {
    final batch = _firestore.batch();
    for (final flashcard in flashcards) {
      batch.set(
        _firestore.collection('flashcards').doc(flashcard.id),
        flashcard.toJson(),
      );
    }
    await batch.commit();
  }

  Future<void> batchUpdateFlashcards(List<FlashcardModel> flashcards) async {
    final batch = _firestore.batch();
    for (final flashcard in flashcards) {
      batch.update(
        _firestore.collection('flashcards').doc(flashcard.id),
        flashcard.toJson(),
      );
    }
    await batch.commit();
  }
}

final firestoreServiceProvider = Provider<FirestoreService>((ref) {
  final firestore = ref.watch(firestoreProvider);
  return FirestoreService(firestore);
});
