// CartIcon.js
import React, { useEffect, useState } from 'react';
import { FaShoppingCart } from 'react-icons/fa';
import { motion, useAnimation } from 'framer-motion';

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
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        paddingTop: '2px' // 👈 This nudges everything downward inside the button
      }}
    >
      <FaShoppingCart style={{ fontSize: '1rem' }} />
      <span style={{ fontSize: '1rem' }}>Cart</span>
    </motion.div>
  );
};

export default CartIcon;
