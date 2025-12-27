import 'package:flutter/material.dart';
import 'package:vibration/vibration.dart';
import '../models/flashcard_model.dart';

enum RatingType { again, hard, good, easy }

class SwipeableFlashcard extends StatefulWidget {
  final FlashcardModel flashcard;
  final VoidCallback onNext;
  final VoidCallback? onPrevious;
  final Function(RatingType)? onRate;
  final int currentIndex;
  final int totalCards;

  const SwipeableFlashcard({
    Key? key,
    required this.flashcard,
    required this.onNext,
    this.onPrevious,
    this.onRate,
    required this.currentIndex,
    required this.totalCards,
  }) : super(key: key);

  @override
  State<SwipeableFlashcard> createState() => _SwipeableFlashcardState();
}

class _SwipeableFlashcardState extends State<SwipeableFlashcard>
    with SingleTickerProviderStateMixin {
  bool _showAnswer = false;
  late AnimationController _flipController;
  late AnimationController _swipeController;
  double _swipePosition = 0;
  bool _swiped = false;

  @override
  void initState() {
    super.initState();
    _flipController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );
    _swipeController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    _resetCard();
  }

  void _resetCard() {
    setState(() {
      _showAnswer = false;
      _swipePosition = 0;
      _swiped = false;
    });
    _flipController.reset();
    _swipeController.reset();
  }

  void _toggleFlip() {
    if (_flipController.isCompleted) {
      _flipController.reverse();
    } else {
      _flipController.forward();
    }
    setState(() {
      _showAnswer = !_showAnswer;
    });
  }

  Future<void> _performHapticFeedback() async {
    try {
      final canVibrate = await Vibration.hasVibrator() ?? false;
      if (canVibrate) {
        await Vibration.vibrate(duration: 50);
      }
    } catch (e) {
      // Vibration not available on this device
    }
  }

  void _handleSwipe(DragEndDetails details) {
    const swipeThreshold = 100;
    final velocity = details.velocity.pixelsPerSecond.dx;

    if (velocity.abs() > swipeThreshold || _swipePosition.abs() > 50) {
      _performHapticFeedback();

      if (velocity > 0 || _swipePosition > 0) {
        // Swiped right - might go to previous
        if (widget.onPrevious != null) {
          _animateSwipe(true);
        } else {
          _resetSwipe();
        }
      } else if (velocity < 0 || _swipePosition < 0) {
        // Swiped left - go to next
        _animateSwipe(false);
      }
    } else {
      _resetSwipe();
    }
  }

  void _resetSwipe() {
    _swipeController.reverse();
    setState(() {
      _swipePosition = 0;
    });
  }

  void _animateSwipe(bool isRight) {
    _swipeController.forward().then((_) {
      if (isRight && widget.onPrevious != null) {
        widget.onPrevious!();
        _resetCard();
      } else if (!isRight) {
        widget.onNext();
        _resetCard();
      }
    });
    setState(() {
      _swiped = true;
    });
  }

  void _rateCard(RatingType rating) async {
    await _performHapticFeedback();
    widget.onRate?.call(rating);
    Future.delayed(const Duration(milliseconds: 300), () {
      widget.onNext();
      _resetCard();
    });
  }

  @override
  void dispose() {
    _flipController.dispose();
    _swipeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final progress = (widget.currentIndex + 1) / widget.totalCards;

    return GestureDetector(
      onHorizontalDragUpdate: (details) {
        setState(() {
          _swipePosition += details.delta.dx;
        });
      },
      onHorizontalDragEnd: _handleSwipe,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Card ${widget.currentIndex + 1} of ${widget.totalCards}',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Theme.of(context).primaryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Text(
                        '${(progress * 100).toStringAsFixed(0)}%',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: Theme.of(context).primaryColor,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 6,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Center(
                child: Transform.translate(
                  offset: Offset(_swipePosition * 0.5, 0),
                  child: Opacity(
                    opacity: (1 - (_swipePosition.abs() / 300)).clamp(0, 1),
                    child: GestureDetector(
                      onTap: _toggleFlip,
                      child: _buildFlipCard(context),
                    ),
                  ),
                ),
              ),
            ),
          ),
          _buildRatingButtons(context),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildFlipCard(BuildContext context) {
    return AnimatedBuilder(
      animation: _flipController,
      builder: (context, child) {
        final angle = _flipController.value * 3.14159;
        final transform = Matrix4.identity()
          ..setEntry(3, 2, 0.001)
          ..rotateY(angle);

        return Transform(
          alignment: Alignment.center,
          transform: transform,
          child: Card(
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: _showAnswer
                      ? [
                          Colors.green.withOpacity(0.05),
                          Colors.green.withOpacity(0.02),
                        ]
                      : [
                          Theme.of(context).primaryColor.withOpacity(0.05),
                          Theme.of(context).primaryColor.withOpacity(0.02),
                        ],
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _showAnswer ? 'Answer' : 'Question',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      color: Colors.grey[600],
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 32),
                  SingleChildScrollView(
                    child: Text(
                      _showAnswer
                          ? widget.flashcard.answer
                          : widget.flashcard.question,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        height: 1.6,
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  Text(
                    'Tap to reveal ${_showAnswer ? 'question' : 'answer'}',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: Colors.grey[500],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _swipePosition > 30
                        ? '← Swipe for previous'
                        : _swipePosition < -30
                            ? 'Swipe for next →'
                            : 'Swipe left or right',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: Colors.grey[400],
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildRatingButtons(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'How did you do?',
            style: Theme.of(context).textTheme.titleSmall,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _RatingButton(
                icon: Icons.close,
                label: 'Again',
                color: Colors.red,
                onPressed: () => _rateCard(RatingType.again),
              ),
              const SizedBox(width: 8),
              _RatingButton(
                icon: Icons.thumb_down,
                label: 'Hard',
                color: Colors.orange,
                onPressed: () => _rateCard(RatingType.hard),
              ),
              const SizedBox(width: 8),
              _RatingButton(
                icon: Icons.thumb_up,
                label: 'Good',
                color: Colors.blue,
                onPressed: () => _rateCard(RatingType.good),
              ),
              const SizedBox(width: 8),
              _RatingButton(
                icon: Icons.check_circle,
                label: 'Easy',
                color: Colors.green,
                onPressed: () => _rateCard(RatingType.easy),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RatingButton extends StatefulWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onPressed;

  const _RatingButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onPressed,
  });

  @override
  State<_RatingButton> createState() => _RatingButtonState();
}

class _RatingButtonState extends State<_RatingButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.2).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onPressed() {
    _controller.forward().then((_) {
      _controller.reverse();
    });
    widget.onPressed();
  }

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: _onPressed,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                border: Border.all(
                  color: widget.color,
                  width: 1.5,
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    widget.icon,
                    color: widget.color,
                    size: 20,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    widget.label,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: widget.color,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
