import 'package:riverpod/riverpod.dart';
import '../models/user_model.dart';
import '../services/firestore_service.dart';
import 'firebase_provider.dart';

// Get current user profile
final userProfileProvider = FutureProvider<UserModel?>((ref) async {
  final userId = ref.watch(currentUserIdProvider);
  final firestoreService = ref.watch(firestoreServiceProvider);

  if (userId == null) {
    return null;
  }

  return firestoreService.getUserProfile(userId);
});

// Notifier for user profile operations
class UserProfileNotifier extends StateNotifier<AsyncValue<void>> {
  final FirestoreService _firestoreService;

  UserProfileNotifier(this._firestoreService)
      : super(const AsyncValue.data(null));

  Future<void> updateUserProfile(UserModel user) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await _firestoreService.updateUserProfile(user);
    });
  }

  Future<void> createUserProfile(UserModel user) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await _firestoreService.createUserProfile(user);
    });
  }
}

final userProfileNotifierProvider =
    StateNotifierProvider<UserProfileNotifier, AsyncValue<void>>((ref) {
  final firestoreService = ref.watch(firestoreServiceProvider);
  return UserProfileNotifier(firestoreService);
});
