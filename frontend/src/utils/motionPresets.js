// Shared motion values. Durations stay between 150 and 250ms, no bounce, no loops.
// MotionConfig reducedMotion="user" (main.jsx) drops the transform animations for users who ask for less motion.
export const EASE = [0.22, 1, 0.36, 1];
export const FAST = { duration: 0.15, ease: EASE };
export const NORMAL = { duration: 0.2, ease: EASE };

const STAGGER_S = 0.03;
const STAGGER_LIMIT = 10;

// Enter animation for a card in a list: fade + 6px rise, staggered, first 10 items only
export const cardEnter = (index) =>
  index < STAGGER_LIMIT
    ? {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        transition: { ...NORMAL, delay: index * STAGGER_S },
      }
    : { initial: false };

// Press feedback for buttons. Hover is plain CSS.
export const tap = { whileTap: { scale: 0.97 }, transition: FAST };

// Backdrop + panel of a modal dialog, used with AnimatePresence
export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: NORMAL,
};
export const modalPanel = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: NORMAL,
};
