// src/App.js
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { db, auth } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import emailjs from '@emailjs/browser';

import Admin from './Admin';
import ProtectedRoute from './ProtectedRoute';
import CartIcon from './CartIcon';
import { useTheme } from './ThemeContext';
// Added more icons for UI enhancements
import { FaSun, FaMoon, FaTrash, FaBars, FaTimes, FaShoppingCart, FaCheck, FaSadTear } from 'react-icons/fa';

import styles from './App.module.css';
import homeStyles from './Home.module.css';
import cartStyles from './Cart.module.css';
import checkoutStyles from './Checkout.module.css';
import loginStyles from './Login.module.css';

// --- Reusable UI Components ---

const SkeletonCard = () => (
    <div className={homeStyles.skeletonCard}>
        <div className={homeStyles.skeletonImage}></div>
        <div className={homeStyles.skeletonText} style={{width: '80%'}}></div>
        <div className={homeStyles.skeletonTextShort}></div>
        <div className={homeStyles.skeletonButton}></div>
    </div>
);

const EmptyState = ({ icon, message, buttonText, buttonLink }) => (
    <div className={cartStyles.emptyStateContainer}>
        <div className={cartStyles.emptyStateIcon}>{icon}</div>
        <p className={cartStyles.emptyStateMessage}>{message}</p>
        {buttonText && buttonLink && (
            <Link to={buttonLink} className="btn btn-primary">
                {buttonText}
            </Link>
        )}
    </div>
);


// --- Core App Components ---

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const DesktopNav = ({ user, theme, toggleTheme, cart, handleLogout }) => (
  <nav className={styles.appNav}>
    <div className={styles.navLinkGroup}>
      <Link to="/" className={styles.navButton}>Home</Link>
      {user && <Link to="/admin" className={styles.navButton}>Admin</Link>}
    </div>
    <div className={styles.navLinkGroup}>
      <button onClick={toggleTheme} className={styles.themeToggleButton} aria-label="Toggle theme">
        {theme === 'light' ? <FaMoon /> : <FaSun />}
      </button>
      <Link to="/cart" className={styles.navButton}>
        <CartIcon cartCount={cart.reduce((sum, item) => sum + (item.quantity || 0), 0)} />
      </Link>
      {!user ? ( <Link to="/login" className={styles.navButtonLink}>Admin Login</Link> ) : ( <button onClick={handleLogout} className={styles.navButtonLink}>Logout</button> )}
    </div>
  </nav>
);

const MobileNav = ({ user, theme, toggleTheme, cart, handleLogout, searchQuery, setSearchQuery }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMenu = () => { setIsMenuOpen(!isMenuOpen); };
  const NavLink = ({ to, children }) => ( <Link to={to} onClick={() => setIsMenuOpen(false)} className={styles.mobileMenuLink}> {children} </Link> );

  return (
    <div className={styles.mobileNavContainer}>
      <div className={styles.topBar}> Call or Text: (714) 362-6281 </div>
      <div className={styles.mainMobileNav}>
        <button onClick={toggleMenu} className={styles.hamburgerIcon} aria-label="Open menu"><FaBars /></button>
        <Link to="/" className={styles.mobileLogo}>JM</Link>
        <div className={styles.mobileSearchWrapper}>
          <input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={styles.mobileSearchInput}/>
        </div>
        <Link to="/cart" className={styles.mobileCartIcon} aria-label="View cart">
          <CartIcon cartCount={cart.reduce((sum, item) => sum + (item.quantity || 0), 0)} />
        </Link>
      </div>
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={toggleMenu} className={styles.mobileMenuOverlay}/>
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween", ease: "easeOut", duration: 0.3 }} className={styles.mobileMenuContent}>
              <div className={styles.mobileMenuHeader}>
                <h3>Menu</h3>
                <button onClick={toggleMenu} className={styles.closeMenuButton} aria-label="Close menu"><FaTimes /></button>
              </div>
              <NavLink to="/">Home</NavLink>
              <NavLink to="/cart">Cart</NavLink>
              {user && <NavLink to="/admin">Admin</NavLink>}
              <button onClick={() => { toggleTheme(); setIsMenuOpen(false); }} className={styles.mobileMenuLink} style={{ background: 'none', border: 'none', padding: 0, width: 'auto', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span>Toggle Theme</span>
                {theme === 'light' ? <FaMoon /> : <FaSun />}
              </button>
              <div className={styles.mobileMenuActions}>
                {!user ? ( <NavLink to="/login">Admin Login</NavLink> ) : ( <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); setIsMenuOpen(false); }} className={styles.mobileMenuLink}>Logout</a> )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};


const Home = ({ addToCart, searchQuery, isMobile, setSearchQuery }) => { // Added setSearchQuery to props
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [quantities, setQuantities] = useState({}); 
  const [addedToCart, setAddedToCart] = useState({});
  const [isLoading, setIsLoading] = useState(true); 
  const scrollRef = useRef(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftStart, setScrollLeftStart] = useState(0);

  const handleMouseDown = useCallback((e) => { if (!scrollRef.current) return; setIsDragging(true); setStartX((e.pageX || e.clientX) - scrollRef.current.offsetLeft); setScrollLeftStart(scrollRef.current.scrollLeft); scrollRef.current.style.cursor = 'grabbing'; }, []); 
  const handleMouseLeaveOrUp = useCallback(() => { if (scrollRef.current && isDragging) { scrollRef.current.style.cursor = 'grab'; } setIsDragging(false); }, [isDragging]); 
  const handleMouseMove = useCallback((e) => { if (!isDragging || !scrollRef.current) return; e.preventDefault(); const x = (e.pageX || e.clientX) - scrollRef.current.offsetLeft; const walk = (x - startX) * 1.5; scrollRef.current.scrollLeft = scrollLeftStart - walk; }, [isDragging, startX, scrollLeftStart]);

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
      setIsLoading(true); 
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sorted = items.sort((a, b) => (a.displayOrder !== undefined && b.displayOrder !== undefined) ? a.displayOrder - b.displayOrder : (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        setProducts(sorted);
        const uniqueCategories = [...new Set(sorted.map(p => p.category))].filter(Boolean);
        setCategories(uniqueCategories);
        const initialQuantities = {};
        sorted.forEach(item => { initialQuantities[item.id] = '1'; });
        setQuantities(initialQuantities);
      } catch (error) { console.error("Error fetching products:", error); }
      setIsLoading(false); 
    };
    fetchProducts();
  }, []);

  useEffect(() => { if (selectedCategory) { window.scrollTo({ top: 0, behavior: 'smooth' }); } }, [selectedCategory]);
  
  const handleQuantityInputChange = (productId, rawValue) => { if (rawValue === '' || /^[1-9][0-9]*$/.test(rawValue)) { setQuantities(prev => ({ ...prev, [productId]: rawValue })); } else if (rawValue === '0' && quantities[productId] !== '0') { setQuantities(prev => ({ ...prev, [productId]: rawValue })); } };
  const handleQuantityInputBlur = (productId) => { const currentValue = quantities[productId]; const parsedValue = parseInt(currentValue); if (isNaN(parsedValue) || parsedValue < 1) { setQuantities(prev => ({ ...prev, [productId]: '1' })); } };
  const adjustQuantity = (productId, amount) => { const currentVal = parseInt(quantities[productId]) || 0; let newVal = currentVal + amount; if (newVal < 1) { newVal = 1; } setQuantities(prev => ({ ...prev, [productId]: String(newVal) })); };

  const renderProductCard = (p) => (
    <motion.div key={p.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className={homeStyles.productCard}>
      {p.featured && <span className={homeStyles.badgeHot}>Hot Item</span>}
      {!p.inStock && <span className={homeStyles.badgeSoldOut}>Sold Out</span>}
      {p.image ? ( <img src={p.image} alt={p.name} className={homeStyles.productImage} loading="lazy" onError={(e) => e.target.style.display='none'}/> ) : ( <div className={homeStyles.imageFiller} /> )}
      <div className={homeStyles.productInfo}>
        <h3 className={homeStyles.productName}>{p.name}</h3>
        <p className={homeStyles.productPrice}>${p.price.toFixed(2)}</p>
        <div className={homeStyles.qtyContainer}>
          <button onClick={() => adjustQuantity(p.id, -1)} className={homeStyles.qtyBtn} disabled={(parseInt(quantities[p.id]) || 1) <= 1 && quantities[p.id] !== '0'}>-</button>
          <input type="number" value={quantities[p.id] === undefined ? '1' : quantities[p.id]} onChange={(e) => handleQuantityInputChange(p.id, e.target.value)} onBlur={() => handleQuantityInputBlur(p.id)} className={homeStyles.qtyInput} min="1" />
          <button onClick={() => adjustQuantity(p.id, 1)} className={homeStyles.qtyBtn}>+</button>
        </div>
        <button
          onClick={() => {
            const quantityToAdd = Math.max(1, parseInt(quantities[p.id]) || 1);
            addToCart({ ...p, quantity: quantityToAdd });
            setAddedToCart(prev => ({ ...prev, [p.id]: true }));
            if (String(quantities[p.id]) !== String(quantityToAdd)) {
                 setQuantities(prev => ({ ...prev, [p.id]: String(quantityToAdd) }));
            }
            setTimeout(() => setAddedToCart(prev => ({ ...prev, [p.id]: false })), 1500);
          }}
          disabled={!p.inStock || addedToCart[p.id]}
          className={`btn btn-primary ${homeStyles.addToCartButton} ${addedToCart[p.id] ? homeStyles.addedState : ''}`}
        >
          {!p.inStock 
            ? 'Out of Stock' 
            : addedToCart[p.id] 
              ? <><FaCheck /> Added!</> 
              : 'Add to Cart'
          }
        </button>
      </div>
    </motion.div>
  );

  const displayProducts = products.filter(p => {
    const matchCategory = selectedCategory ? p.category === selectedCategory : true;
    const matchSearch = searchQuery ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : true;
    return matchCategory && matchSearch;
  });

  const [headerPanelHeight, setHeaderPanelHeight] = useState(0);
  const headerPanelRef = useRef(null);

  useEffect(() => {
    if (headerPanelRef.current) {
      const resizeObserver = new ResizeObserver(entries => { for (let entry of entries) { setHeaderPanelHeight(entry.target.offsetHeight); } });
      resizeObserver.observe(headerPanelRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  return (
    <div className={homeStyles.homeContainer}>
      <div className={homeStyles.fixedHeaderPanel} ref={headerPanelRef} style={{ top: isMobile ? '85px' : '60px' }}>
        <h1 className={homeStyles.headerTitle}>JM Distribution</h1>
        {!isMobile && ( <p className={homeStyles.headerSubtitle}>Cell: (714) 362-6281</p> )}
        
        {/* UPDATED: Conditionally render search bar for desktop view */}
        {!isMobile && (
          <div className={homeStyles.searchContainer}>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={homeStyles.searchInput} 
            />
          </div>
        )}

        <div className={homeStyles.categoryFilterContainerOuter}>
          <div ref={scrollRef} className={`${homeStyles.categoryFilterContainer} hide-scrollbar`}>
            <button onClick={() => setSelectedCategory('')} className={`${homeStyles.categoryButton} ${selectedCategory === '' ? homeStyles.categoryButtonActive : ''}`}>All</button>
            {categories.map(cat => ( <button key={cat} onClick={() => setSelectedCategory(cat)} className={`${homeStyles.categoryButton} ${selectedCategory === cat ? homeStyles.categoryButtonActive : ''}`}> {cat} </button> ))}
            <div className={styles.spacerDiv}></div>
          </div>
        </div>
      </div>
      <div className={homeStyles.productsGridContainer} style={{ gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(150px, 1fr))' : 'repeat(auto-fill, minmax(230px, 1fr))', marginTop: headerPanelHeight ? `${headerPanelHeight + 16}px` : '210px' }}>
        <AnimatePresence>
          {isLoading ? (
            Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={index} />)
          ) : displayProducts.length > 0 ? (
            displayProducts.map(renderProductCard)
          ) : (
            <div style={{ gridColumn: '1 / -1', marginTop: '2rem' }}>
              <EmptyState
                icon={<FaSadTear />}
                message="No products found matching your search."
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const Cart = ({ cart, removeFromCart, updateCartQuantity }) => {
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  return (
    <div className={`page-container ${cartStyles.cartContainer}`}>
      <h2 className={cartStyles.cartTitle}>Your Cart</h2>
      {cart.length === 0 ? (
        <EmptyState 
            icon={<FaShoppingCart />}
            message="Your cart is currently empty."
            buttonText="Continue Shopping"
            buttonLink="/"
        />
      ) : (
        <>
          <ul className={cartStyles.cartList}>
            {cart.map(item => (
              <li key={item.id} className={cartStyles.cartItem}>
                {item.image && ( <img src={item.image} alt={item.name} className={cartStyles.cartItemImage} loading="lazy" onError={(e) => e.target.style.display='none'}/> )}
                <div className={cartStyles.cartItemDetails}>
                  <strong className={cartStyles.cartItemName}>{item.name}</strong>
                  <div className={cartStyles.cartItemQuantityControls}>
                    <button onClick={() => updateCartQuantity(item.id, item.quantity - 1)} className={cartStyles.quantityAdjustButton} disabled={item.quantity <= 1}>-</button>
                    <span className={cartStyles.cartItemQuantity}>{item.quantity}</span>
                    <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)} className={cartStyles.quantityAdjustButton}>+</button>
                    <button onClick={() => removeFromCart(item.id)} className={cartStyles.removeButton} title="Remove"><FaTrash /></button>
                  </div>
                </div>
                <div className={cartStyles.cartItemPrice}>${(item.price * item.quantity).toFixed(2)}</div>
              </li>
            ))}
          </ul>
          <h3 className={cartStyles.cartTotal}>Total: ${total.toFixed(2)}</h3>
          <Link to="/checkout">
            <button className={`btn btn-primary ${cartStyles.checkoutButton}`}>Proceed to Checkout</button>
          </Link>
        </>
      )}
    </div>
  );
};

const Checkout = ({ cart, clearCart }) => {
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [addressState, setAddressState] = useState(''); 
  const [zip, setZip] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) { alert("Cart is empty."); return; }
    setIsSubmitting(true);
    const order = { storeName, ownerName, phone, address: `${street}, ${city}, ${addressState}, ${zip}`, items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity, image: item.image || null })), total: parseFloat(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)), createdAt: serverTimestamp() };
    try {
      const emailJsPublicKey = '5YgacT8wW9cQ0ldnp'; 
      const emailParams = { store_name: storeName, owner_name: ownerName, phone, address: `${street}, ${city}, ${addressState}, ${zip}`, total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2), items: cart.map(item => `${item.name} x${item.quantity} - $${item.price.toFixed(2)}`).join('\n') };
      await emailjs.send('service_2z696qf', 'template_5ziebjl', emailParams, emailJsPublicKey);
      await addDoc(collection(db, "orders"), order);
      setSubmitted(true);
      clearCart();
    } catch (error) {
      console.error("Detailed order submission error:", error);
      alert("There was a problem submitting your order. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };
  if (submitted) {
    return (
      <div className={`page-container ${checkoutStyles.orderPlacedContainer}`}>
        <h2 className={checkoutStyles.orderPlacedTitle}>Order Placed!</h2>
        <p className={checkoutStyles.orderPlacedMessage}>Thank you for your order.</p>
        <p className={checkoutStyles.orderPlacedMessage}>For questions call: (714)362-6281.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')} style={{marginTop: '1rem'}}>Back to Home</button>
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
        <button type="submit" className={`btn btn-primary ${checkoutStyles.placeOrderButton}`} disabled={isSubmitting}>
          {isSubmitting ? 'Placing Order...' : 'Place Order'}
        </button>
      </form>
    </div>
  );
};

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
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') { setError('No user found with this email.'); } 
      else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') { setError('Incorrect password.'); } 
      else { setError('Login failed. Please try again.'); }
    }
  };
  return (
    <div className={`page-container ${loginStyles.loginContainer}`}>
      <h2 className={loginStyles.loginTitle}>Admin Login</h2>
      <form onSubmit={handleLogin} className={loginStyles.loginForm}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className={`input-field ${loginStyles.loginInput}`} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className={`input-field ${loginStyles.loginInput}`} />
        <button type="submit" className={`btn btn-primary ${loginStyles.loginButton}`}>Login</button>
        {error && <p className={loginStyles.errorMessage}>{error}</p>}
      </form>
    </div>
  );
};


function App() {
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const { theme, toggleTheme } = useTheme(); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => { setIsMobile(window.innerWidth <= 768); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addToCart = (product) => { setCart(currentCart => { const exists = currentCart.find(item => item.id === product.id); if (exists) { return currentCart.map(item => item.id === product.id ? { ...item, quantity: (item.quantity || 0) + (product.quantity || 0) } : item ); } else { return [...currentCart, { ...product, quantity: product.quantity || 1 }]; } }); };
  const removeFromCart = (id) => { setCart(cart.filter(item => item.id !== id)); };
  const clearCart = () => { setCart([]); };
  useEffect(() => { const unsubscribe = onAuthStateChanged(auth, setUser); return () => unsubscribe(); }, []);
  const handleLogout = () => { signOut(auth); };
  const updateCartQuantity = (id, quantity) => { const numQuantity = Number(quantity); if (numQuantity < 1) { removeFromCart(id); return; } setCart(cart.map(item => item.id === id ? { ...item, quantity: numQuantity } : item )); };
  
  return (
    <Router>
      <ScrollToTop />
      {isMobile ? (
        <MobileNav 
          user={user} 
          theme={theme} 
          toggleTheme={toggleTheme} 
          cart={cart} 
          handleLogout={handleLogout}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      ) : (
        <DesktopNav 
          user={user} 
          theme={theme} 
          toggleTheme={toggleTheme} 
          cart={cart} 
          handleLogout={handleLogout}
        />
      )}
      <main className={styles.mainContent}>
        <Routes>
          <Route path="/" element={<Home addToCart={addToCart} searchQuery={searchQuery} isMobile={isMobile} setSearchQuery={setSearchQuery} />} />
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
