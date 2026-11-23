import { Transition, Variants } from "motion/react";

// One spring for everything that moves, so the whole app shares the same feel: quick, soft landing, no wobble
export const spring: Transition = { type: "spring", stiffness: 380, damping: 32, mass: 0.8 };

export const tap = { scale: 0.88 };

// Whole views slide up a little as they fade in; leaving is quicker than arriving, so switching never feels sluggish
export const viewVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.2, 0.8, 0.2, 1] } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.16 } },
};

// Rows of a list arrive one after another rather than all at once
export const listVariants: Variants = {
    visible: { transition: { staggerChildren: 0.035 } },
};

export const rowVariants: Variants = {
    hidden: { opacity: 0, x: -12 },
    visible: { opacity: 1, x: 0, transition: spring },
    exit: { opacity: 0, x: 24, transition: { duration: 0.18 } },
};
