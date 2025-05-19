// src/App.js
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { db, auth } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import emailjs from '@emailjs/browser';

import Admin from './Admin';
import ProtectedRoute from './ProtectedRoute';
import CartIcon from './CartIcon';
import { useTheme } from './ThemeContext';
import { FaSun, FaMoon, FaTrash } from 'react-icons/fa';

// Import CSS Modules
import styles from './App.module.css';
import homeStyles from './Home.module.css';
import cartStyles from './Cart.module.css';
import checkoutStyles from './Checkout.module.css';
import loginStyles from './Login.module.css';

// --- Home Component ---
const Home = ({ addToCart }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [quantities, setQuantities] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
  const [addedToCart, setAddedToCart] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftStart, setScrollLeftStart] = useState(0);

  // Memoize event handlers for drag-to-scroll
  const handleMouseDown = useCallback((e) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX((e.pageX || e.clientX) - scrollRef.current.offsetLeft);
    setScrollLeftStart(scrollRef.current.scrollLeft);
    scrollRef.current.style.cursor = 'grabbing';
  }, []); 

  const handleMouseLeaveOrUp = useCallback(() => {
    // Only change cursor if it was grabbing and the ref is still valid
    if (scrollRef.current && isDragging) { 
        scrollRef.current.style.cursor = 'grab';
    }
    setIsDragging(false); // Always set dragging to false
  }, [isDragging]); 

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = (e.pageX || e.clientX) - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; 
    scrollRef.current.scrollLeft = scrollLeftStart - walk;
  }, [isDragging, startX, scrollLeftStart]);

  useEffect(() => {
    const currentScrollRef = scrollRef.current;
    if (currentScrollRef) {
      currentScrollRef.style.cursor = 'grab';
      currentScrollRef.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mouseup', handleMouseLeaveOrUp);
      currentScrollRef.addEventListener('mouseleave', handleMouseLeaveOrUp); 
      currentScrollRef.addEventListener('mousemove', handleMouseMove);
    }
    return () => {
      if (currentScrollRef) {
        currentScrollRef.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mouseup', handleMouseLeaveOrUp);
        currentScrollRef.removeEventListener('mouseleave', handleMouseLeaveOrUp);
        currentScrollRef.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [handleMouseDown, handleMouseLeaveOrUp, handleMouseMove]); 
  
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sorted = items.sort((a, b) => {
          if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
            return a.displayOrder - b.displayOrder;
          }
          return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
        });
        setProducts(sorted);
        const uniqueCategories = [...new Set(sorted.map(p => p.category))].filter(Boolean);
        setCategories(uniqueCategories);
        const initialQuantities = {};
        sorted.forEach(item => {
          initialQuantities[item.id] = 1;
        });
        setQuantities(initialQuantities);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedCategory) { 
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedCategory]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleQuantityChange = (productId, value) => {
    const qty = Math.max(1, parseInt(value) || 1);
    setQuantities(prev => ({ ...prev, [productId]: qty }));
  };

  const renderProductCard = (p) => (
    <motion.div
      key={p.id}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={homeStyles.productCard}
    >
      {p.featured && <span className={homeStyles.badgeHot}>Hot Item</span>}
      {!p.inStock && <span className={homeStyles.badgeSoldOut}>Sold Out</span>}
      {p.image ? (
        <img src={p.image} alt={p.name} className={homeStyles.productImage} onError={(e) => e.target.style.display='none'}/>
      ) : (
        <div className={homeStyles.imageFiller} />
      )}
      <div className={homeStyles.productInfo}>
        <h3 className={homeStyles.productName}>{p.name}</h3>
        <p className={homeStyles.productPrice}>${p.price.toFixed(2)}</p>
        <div className={homeStyles.qtyContainer}>
          <button 
            onClick={() => handleQuantityChange(p.id, (quantities[p.id] || 1) - 1)} 
            className={homeStyles.qtyBtn}
            disabled={(quantities[p.id] || 1) <= 1}
          >-</button>
          <input
            type="number"
            min="1"
            value={quantities[p.id] || 1}
            onChange={(e) => handleQuantityChange(p.id, e.target.value)}
            className={homeStyles.qtyInput}
          />
          <button onClick={() => handleQuantityChange(p.id, (quantities[p.id] || 1) + 1)} className={homeStyles.qtyBtn}>+</button>
        </div>
        <button
          onClick={() => {
            addToCart({ ...p, quantity: quantities[p.id] || 1 });
            setAddedToCart(prev => ({ ...prev, [p.id]: true }));
            setTimeout(() => setAddedToCart(prev => ({ ...prev, [p.id]: false })), 2000);
          }}
          disabled={!p.inStock}
          className={`btn btn-primary ${homeStyles.addToCartButton}`}
        >
          {p.inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
        {addedToCart[p.id] && (
          <div className={homeStyles.addedToCartMessage}>
            Added to cart!
          </div>
        )}
      </div>
    </motion.div>
  );

  const displayProducts = products.filter(p => {
    const matchCategory = selectedCategory ? p.category === selectedCategory : true;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const [headerPanelHeight, setHeaderPanelHeight] = useState(0);
  const headerPanelRef = useRef(null);

  useEffect(() => {
    if (headerPanelRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          setHeaderPanelHeight(entry.target.offsetHeight);
        }
      });
      resizeObserver.observe(headerPanelRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);


  return (
    <div className={homeStyles.homeContainer}>
      <div className={homeStyles.fixedHeaderPanel} ref={headerPanelRef}>
        <h1 className={homeStyles.headerTitle}>JM Distribution</h1>
        <p className={homeStyles.headerSubtitle}>Cell: (714) 362-6281</p>
        <div className={homeStyles.searchContainer}>
          
<input
  type="text"
  placeholder="Search products..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className={homeStyles.searchInput} // CHANGED HERE
/>
        </div>
        <div className={homeStyles.categoryFilterContainerOuter}>
          <div
            ref={scrollRef}
            className={`${homeStyles.categoryFilterContainer} hide-scrollbar`}
          >
            <button 
              onClick={() => setSelectedCategory('')} 
              className={`${homeStyles.categoryButton} ${selectedCategory === '' ? homeStyles.categoryButtonActive : ''}`}
            >
              All
            </button>
            {categories.map(cat => (
              <button 
                key={cat} 
                onClick={() => setSelectedCategory(cat)} 
                className={`${homeStyles.categoryButton} ${selectedCategory === cat ? homeStyles.categoryButtonActive : ''}`}
              >
                {cat}
              </button>
            ))}
            <div className={homeStyles.spacerDiv}></div>
          </div>
        </div>
      </div>

      <div 
        className={homeStyles.productsGridContainer}
        style={{ 
          gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(150px, 1fr))' : 'repeat(auto-fill, minmax(230px, 1fr))',
          marginTop: headerPanelHeight ? `${headerPanelHeight + 16}px` : '210px'
        }}
      >
        <AnimatePresence>
          {displayProducts.length > 0 ? 
            displayProducts.map(renderProductCard) : 
            <p style={{textAlign: 'center', gridColumn: '1 / -1'}}>No products match your search.</p>
          }
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- Cart Component ---
const Cart = ({ cart, removeFromCart, updateCartQuantity }) => {
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className={`page-container ${cartStyles.cartContainer}`}>
      <h2 className={cartStyles.cartTitle}>Your Cart</h2>
      {cart.length === 0 ? (
        <p className={cartStyles.emptyCartMessage}>Your cart is empty.</p>
      ) : (
        <>
          <ul className={cartStyles.cartList}>
            {cart.map(item => (
              <li key={item.id} className={cartStyles.cartItem}>
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className={cartStyles.cartItemImage}
                    onError={(e) => e.target.style.display='none'}
                  />
                )}
                <div className={cartStyles.cartItemDetails}>
                  <strong className={cartStyles.cartItemName}>{item.name}</strong>
                  <div className={cartStyles.cartItemQuantityControls}>
                    <button
                      onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                      className={cartStyles.quantityAdjustButton}
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span className={cartStyles.cartItemQuantity}>{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                      className={cartStyles.quantityAdjustButton}
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className={cartStyles.removeButton}
                      title="Remove"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                <div className={cartStyles.cartItemPrice}>${(item.price * item.quantity).toFixed(2)}</div>
              </li>
            ))}
          </ul>
          <h3 className={cartStyles.cartTotal}>Total: ${total.toFixed(2)}</h3>
          <Link to="/checkout">
            <button className={`btn btn-primary ${cartStyles.checkoutButton}`}>
              Proceed to Checkout
            </button>
          </Link>
        </>
      )}
    </div>
  );
};

// --- Checkout Component ---
const Checkout = ({ cart, clearCart }) => {
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [addressState, setAddressState] = useState(''); 
  const [zip, setZip] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert("Cart is empty. Please add items to your cart before checking out.");
      return;
    }
    const order = {
      storeName, ownerName, phone,
      address: `${street}, ${city}, ${addressState}, ${zip}`,
      items: cart.map(item => ({ 
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image || null 
      })), 
      total: parseFloat(calculateTotal()), 
      createdAt: serverTimestamp()
    };

    try {
      // Using the provided EmailJS public key directly
      const emailJsPublicKey = '5YgacT8wW9cQ0ldnp'; 
      
      console.log("Attempting to send email with params:", {
        store_name: storeName, 
        owner_name: ownerName, 
        phone,
        address: `${street}, ${city}, ${addressState}, ${zip}`,
        total: calculateTotal(),
        items: cart.map(item => `${item.name} x${item.quantity} - $${item.price.toFixed(2)}`).join('\n')
      });

      await emailjs.send('service_2z696qf', 'template_5ziebjl', {
        store_name: storeName, 
        owner_name: ownerName, 
        phone,
        address: `${street}, ${city}, ${addressState}, ${zip}`,
        total: calculateTotal(),
        items: cart.map(item => `${item.name} x${item.quantity} - $${item.price.toFixed(2)}`).join('\n')
      }, emailJsPublicKey);
      
      console.log('EmailJS send successful');

      await addDoc(collection(db, "orders"), order);
      console.log('Firestore addDoc successful');

      setSubmitted(true);
      clearCart();
    } catch (error) {
      console.error("Detailed order submission error:", error);
      alert("There was a problem submitting your order. Please try again or contact support. Check console for details.");
    }
  };

  if (submitted) {
    return (
      <div className={`page-container ${checkoutStyles.orderPlacedContainer}`}>
        <h2 className={checkoutStyles.orderPlacedTitle}>Order Placed!</h2>
        <p className={checkoutStyles.orderPlacedMessage}>Thank you for your order.</p>
        <p className={checkoutStyles.orderPlacedMessage}>For questions call: (714)362-6281.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')} style={{marginTop: '1rem'}}>
            Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className={`page-container ${checkoutStyles.checkoutPageContainer}`}>
      <h2 className={checkoutStyles.checkoutTitle}>Checkout</h2>
      <form onSubmit={handleSubmit} className={checkoutStyles.checkoutForm}>
        <input placeholder="Store Name" value={storeName} onChange={e => setStoreName(e.target.value)} required className={`input-field ${checkoutStyles.checkoutInput}`} />
        <input placeholder="Owner Name" value={ownerName} onChange={e => setOwnerName(e.target.value)} required className={`input-field ${checkoutStyles.checkoutInput}`} />
        <input type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} required className={`input-field ${checkoutStyles.checkoutInput}`} />
        <input placeholder="Street Address" value={street} onChange={e => setStreet(e.target.value)} required className={`input-field ${checkoutStyles.checkoutInput}`} />
        <input placeholder="City" value={city} onChange={e => setCity(e.target.value)} required className={`input-field ${checkoutStyles.checkoutInput}`} />
        <input placeholder="State" value={addressState} onChange={e => setAddressState(e.target.value)} required className={`input-field ${checkoutStyles.checkoutInput}`} />
        <input placeholder="Zip Code" value={zip} onChange={e => setZip(e.target.value)} required className={`input-field ${checkoutStyles.checkoutInput}`} />
        <button type="submit" className={`btn btn-primary ${checkoutStyles.placeOrderButton}`}>
          Place Order
        </button>
      </form>
    </div>
  );
};

// --- Login Component ---
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin');
    } catch (err) {
      console.error('Login error:', err.code, err.message);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        setError('No user found with this email.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect password.');
      } else {
        setError('Login failed. Please try again.');
      }
    }
  };

  return (
    <div className={`page-container ${loginStyles.loginContainer}`}>
      <h2 className={loginStyles.loginTitle}>Admin Login</h2>
      <form onSubmit={handleLogin} className={loginStyles.loginForm}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={`input-field ${loginStyles.loginInput}`}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={`input-field ${loginStyles.loginInput}`}
        />
        <button type="submit" className={`btn btn-primary ${loginStyles.loginButton}`}>Login</button>
        {error && <p className={loginStyles.errorMessage}>{error}</p>}
      </form>
    </div>
  );
};

// --- App Component ---
function App() {
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const { theme, toggleTheme } = useTheme(); 

  const addToCart = (product) => {
    setCart(currentCart => {
      const exists = currentCart.find(item => item.id === product.id);
      if (exists) {
        return currentCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: (item.quantity || 0) + (product.quantity || 0) }
            : item
        );
      } else {
        return [...currentCart, { ...product, quantity: product.quantity || 1 }];
      }
    });
  };
  
  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };
  
  const updateCartQuantity = (id, quantity) => {
    const numQuantity = Number(quantity);
    if (numQuantity < 1) { 
      removeFromCart(id);
      return;
    }
    setCart(cart.map(item =>
      item.id === id ? { ...item, quantity: numQuantity } : item
    ));
  };
  
  return (
    <Router>
      <nav className={styles.appNav}>
        <div className={styles.navLinkGroup}>
          <Link to="/" className={styles.navButton} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Home</Link>
          {user && <Link to="/admin" className={styles.navButton} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Admin</Link>}
        </div>
        <div className={styles.navLinkGroup}>
          <button onClick={toggleTheme} className={styles.themeToggleButton} aria-label="Toggle theme">
            {theme === 'light' ? <FaMoon /> : <FaSun />}
          </button>
          <Link to="/cart" className={styles.navButton} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <CartIcon cartCount={cart.reduce((sum, item) => sum + (item.quantity || 0), 0)} />
          </Link>
          {!user ? (
            <Link to="/login" className={styles.navButtonLink}>Admin Login</Link>
          ) : (
            <button onClick={handleLogout} className={styles.navButtonLink}>Logout</button>
          )}
        </div>
      </nav>

      <main className={styles.mainContent}>
        <Routes>
          <Route path="/" element={<Home addToCart={addToCart} />} />
          <Route path="/cart" element={<Cart cart={cart} removeFromCart={removeFromCart} updateCartQuantity={updateCartQuantity} />} />
          <Route path="/checkout" element={<Checkout cart={cart} clearCart={clearCart} />} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
