// src/CartIcon.js
import React, { useEffect, useState } from 'react';
import { FaShoppingCart } from 'react-icons/fa';
import { motion, useAnimation } from 'framer-motion';
import styles from './CartIcon.module.css'; // Import CSS Module

const CartIcon = ({ cartCount }) => {
  const controls = useAnimation();
  const [prevCount, setPrevCount] = useState(cartCount);

  useEffect(() => {
    if (cartCount > prevCount) {
      controls.start({
        y: [0, -5, 0],
        transition: { duration: 0.5, ease: 'easeInOut' }
      });
    }
    setPrevCount(cartCount);
  }, [cartCount, controls, prevCount]);

  return (
    <motion.div
      animate={controls}
      className={styles.cartIconWrapper}
      // The inline style 'paddingTop' was minimal; if still needed,
      // it's often better to adjust line-height or padding on the parent button.
      // For now, removing it as the flex alignment should handle most cases.
      // style={{ paddingTop: '2px' }}
    >
      <FaShoppingCart className={styles.icon} />
      <span className={styles.text}>Cart ({cartCount})</span> {/* Display cart count directly here */}
    </motion.div>
  );
};

export default CartIcon;