// src/CartIcon.js
import React from 'react';
import { FaShoppingCart } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './CartIcon.module.css';

const CartIcon = ({ cartCount }) => {
  return (
    <div className={styles.cartIconWrapper}>
      <FaShoppingCart className={styles.icon} />
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            className={styles.cartBadge}
            initial={{ scale: 0, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            key={cartCount} // Add key to re-animate on change if desired, though not strictly necessary here
          >
            {cartCount}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CartIcon;
