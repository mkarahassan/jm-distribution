
// App.js (Full Features)
//import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { db, auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Admin from './Admin';
import { useNavigate } from 'react-router-dom';
import { FaShoppingCart } from 'react-icons/fa';


import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import ProtectedRoute from './ProtectedRoute';

import CartIcon from './CartIcon';










const Home = ({ addToCart }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [quantities, setQuantities] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
  const [addedToCart, setAddedToCart] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef();

  useEffect(() => {
    const fetchProducts = async () => {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sorted = items.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setProducts(sorted);
      const uniqueCategories = [...new Set(sorted.map(p => p.category))];
      setCategories(uniqueCategories);
      const initialQuantities = {};
      sorted.forEach(item => {
        initialQuantities[item.id] = 1;
      });
      setQuantities(initialQuantities);
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleQuantityChange = (productId, value) => {
    const qty = Math.max(1, parseInt(value) || 1);
    setQuantities(prev => ({ ...prev, [productId]: qty }));
  };

  const buttonStyle = (active) => ({
    padding: '0.5rem 1.2rem',
    background: active ? '#ff4081' : 'transparent',
    color: active ? '#fff' : '#ff4081',
    border: '2px solid #ff4081',
    borderRadius: '9999px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    scrollSnapAlign: 'start'
  });

  const renderProductCard = (p) => (
    <motion.div
      key={p.id}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'relative',
        background: '#222',
        padding: '1rem',
        borderRadius: '10px',
        textAlign: 'center',
        width: '100%',
        maxWidth: '250px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '350px'
      }}
    >
      {p.featured && <span style={badgeHot}>Hot Item</span>}
      {!p.inStock && <span style={badgeSoldOut}>Sold Out</span>}
      {p.image ? (
        <img src={p.image} alt={p.name} style={productImage} />
      ) : (
        <div style={imageFiller} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3 style={{ marginBottom: '0.25rem' }}>{p.name}</h3>
        <p style={{ marginBottom: '0.5rem' }}>${p.price.toFixed(2)}</p>
        <div style={qtyContainer}>
          <button onClick={() => handleQuantityChange(p.id, (quantities[p.id] || 1) - 1)} style={qtyBtn}>-</button>
          <input
            type="number"
            min="1"
            value={quantities[p.id] || 1}
            onChange={(e) => handleQuantityChange(p.id, e.target.value)}
            style={qtyInput}
          />
          <button onClick={() => handleQuantityChange(p.id, (quantities[p.id] || 1) + 1)} style={qtyBtn}>+</button>
        </div>
        <button
          onClick={() => {
            addToCart({ ...p, quantity: quantities[p.id] || 1 });
            setAddedToCart(prev => ({ ...prev, [p.id]: true }));
            setTimeout(() => setAddedToCart(prev => ({ ...prev, [p.id]: false })), 2000);
          }}
          disabled={!p.inStock}
          style={{
            marginTop: '0.5rem',
            background: p.inStock ? '#ff4081' : '#555',
            color: '#fff',
            border: 'none',
            borderRadius: '9999px',
            padding: '0.5rem 1rem',
            fontWeight: 'bold',
            cursor: p.inStock ? 'pointer' : 'not-allowed',
            opacity: p.inStock ? 1 : 0.6
          }}
        >
          {p.inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
        {addedToCart[p.id] && (
          <div style={{ color: '#8bc34a', marginTop: '0.5rem', fontSize: '0.85rem' }}>
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

  return (
    <div style={{ background: '', minHeight: '100vh', width: '100%', color: '#fff', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <div style={{
        position: 'fixed',
        top: 0,
        zIndex: 50,
        width: '100%',
        left: 0,
        right: 0,
        background: '#1a1a1a',
        boxSizing: 'border-box',
        padding: '1rem 1rem 0.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
        overflow: 'visible'
      }}>
        <h1 style={{ margin: 5, textAlign: 'center',marginTop: '60px', }}>JM Distribution</h1>
        <p style={{ margin: 5, textAlign: 'center', fontSize: '0.9rem', color: '#ccc' }}>
    Cell: (714) 362-6281
  </p>
        <div style={{
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  padding: '0 1rem',
  boxSizing: 'border-box',
  marginBottom: '1rem'
}}>
  <input
    type="text"
    placeholder="Search products..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    style={{
      width: '100%',
      maxWidth: '360px',
      padding: '0.5rem 1rem',
      borderRadius: '9999px',
      border: '1px solid #ccc',
      fontSize: '1rem',
      background: '#333',
      color: '#fff',
      boxSizing: 'border-box'
    }}
  />
</div>

        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div
            ref={scrollRef}
            style={{
              display: 'inline-flex',
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              gap: '0.75rem',
              padding: '0.5rem 0.5rem 0.5rem 0.5rem', // top right bottom left

              touchAction: 'pan-x',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
            className="hide-scrollbar"
          >
            <button onClick={() => setSelectedCategory('')} style={buttonStyle(selectedCategory === '')}>All</button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} style={buttonStyle(selectedCategory === cat)}>
                {cat}
              </button>
            ))}
            <div style={{ minWidth: '0.5rem' }}></div>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '1rem',
        justifyItems: 'center',
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1rem',
        boxSizing: 'border-box',
        marginTop: '245px' // enough space under the fixed panel
      }}>
        <AnimatePresence>
          {displayProducts.map(renderProductCard)}
        </AnimatePresence>
      </div>
    </div>
  );
};

const badgeHot = {
  position: 'absolute',
  top: '10px',
  right: '10px',
  background: '#ff4081',
  color: '#fff',
  padding: '2px 6px',
  fontSize: '0.75rem',
  borderRadius: '4px',
  zIndex: 1
};

const badgeSoldOut = {
  position: 'absolute',
  top: '10px',
  left: '10px',
  background: 'gray',
  color: '#fff',
  padding: '2px 6px',
  fontSize: '0.75rem',
  borderRadius: '4px',
  zIndex: 1
};

const productImage = {
  width: '100%',
  height: '150px',
  objectFit: 'contain',
  marginBottom: '1rem'
};

const imageFiller = {
  width: '100%',
  height: '150px',
  marginBottom: '1rem',
  visibility: 'hidden'
};

const qtyBtn = {
  width: '30px',
  height: '30px',
  borderRadius: '50%',
  border: 'none',
  background: '#ff4081',
  color: '#fff',
  fontWeight: 'bold',
  fontSize: '1rem',
  cursor: 'pointer'
};

const qtyInput = {
  width: '40px',
  textAlign: 'center',
  borderRadius: '999px',
  border: '1px solid #ccc',
  padding: '0.25rem 0.5rem'
};

const qtyContainer = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: '0.5rem',
  gap: '0.5rem',
  width: '100%'
};




//export default Home;





import { FaTrash } from 'react-icons/fa';


const Cart = ({ cart, removeFromCart, updateCartQuantity }) => {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div style={{ padding: '2rem', marginTop: '25px', background: '#1a1a1a', minHeight: '100vh', color: '#fff' }}>
      <h2>Your Cart</h2>
      {cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {cart.map(item => (
              <li
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1rem',
                  background: '#2a2a2a',
                  padding: '1rem',
                  borderRadius: '8px'
                }}
              >
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{ width: '50px', height: '50px', objectFit: 'contain' }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <strong>{item.name}</strong>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginTop: '0.25rem',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
  <button
    onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
    style={{
      width: '23px',
      height: '23px',
      borderRadius: '40%',
      border: 'none',
      background: '#ff4081',
      color: '#fff',
      fontWeight: 'bold',
      fontSize: '1rem',
      cursor: 'pointer'
    }}
  >
    -
  </button>
  <span>{item.quantity}</span>
  <button
    onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
    style={{
      width: '23px',
      height: '23px',
      borderRadius: '40%',
      border: 'none',
      background: '#ff4081',
      color: '#fff',
      fontWeight: 'bold',
      fontSize: '1rem',
      cursor: 'pointer'
    }}
  >
    +
  </button>
</div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'crimson',
                        cursor: 'pointer',
                        marginLeft: '0.5rem'
                      }}
                      title="Remove"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                <div style={{ whiteSpace: 'nowrap' }}>${item.price.toFixed(2)}</div>
              </li>
            ))}
          </ul>

          <h3>Total: ${total.toFixed(2)}</h3>
          <Link to="/checkout">
            <button
              style={{
                marginTop: '1rem',
                padding: '0.4rem 1rem',
                borderRadius: '999px',
                background: '#ff4081',
                border: 'none',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Proceed to Checkout
            </button>
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
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert("Cart is empty.");
      return;
    }

    const order = {
      storeName,
      ownerName,
      phone,
      address: `${street}, ${city}, ${state} ${zip}`,
      items: cart,
      total: parseFloat(calculateTotal()),
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, "orders"), order);
      setSubmitted(true);
      clearCart();
    } catch (error) {
      console.error("Error submitting order:", error);
      alert("There was a problem submitting the order.");
    }
  };

  const inputStyle = {
    marginBottom: '1rem',
    padding: '0.5rem',
    borderRadius: '8px',
    border: '1px solid #ccc',
    width: '100%'
  };

  if (submitted) {
    return (
      <div style={{ padding: '2rem', marginTop: '50px' }}>
        <h2>Order Placed!</h2>
        <p>Thank you for your order. </p>
        <p1>For questions call: (714)362-6281.</p1>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',         // stack the header and form vertically
      //justifyContent: 'center',        // center vertically
      marginTop: "50px",
      alignItems: 'center',            // center horizontally
      padding: '2rem',
      minHeight: '100vh',
      background: '#1a1a1a',
      boxSizing: 'border-box'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#fff' }}>Checkout</h2>
      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '700px',
        boxSizing: 'border-box'
      }}>
        <input placeholder="Store Name" value={storeName} onChange={e => setStoreName(e.target.value)} required style={inputStyle} />
        <input placeholder="Owner Name" value={ownerName} onChange={e => setOwnerName(e.target.value)} required style={inputStyle} />
        <input placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} required style={inputStyle} />
        <input placeholder="Street Address" value={street} onChange={e => setStreet(e.target.value)} required style={inputStyle} />
        <input placeholder="City" value={city} onChange={e => setCity(e.target.value)} required style={inputStyle} />
        <input placeholder="State" value={state} onChange={e => setState(e.target.value)} required style={inputStyle} />
        <input placeholder="Zip Code" value={zip} onChange={e => setZip(e.target.value)} required style={inputStyle} />

        <button
          type="submit"
          style={{
            width: '100%',                  // ✅ Matches input width
        padding: '0.5rem 1rem',         // ✅ Same padding as inputs
        borderRadius: '9999px',
        border: '1px solid #ccc',       // ✅ Match input border look
        background: '#ff4081',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '1rem',
        marginTop: '1rem',
        cursor: 'pointer',
        marginLeft: '6px'

          }}
        >
          Place Order
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
      console.error('Login error:', err.code, err.message);
      if (err.code === 'auth/user-not-found') {
        setError('No user found with this email.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password.');
      } else {
        setError('Login failed. ' + err.message);
      }
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '2rem auto' }}>
      <h2>Admin Login</h2>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column' }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ marginBottom: '1rem' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ marginBottom: '1rem' }}
        />
        <button type="submit">Login</button>
        {error && <p style={{ color: 'crimson', marginTop: '1rem' }}>{error}</p>}
      </form>
    </div>
  );
};

//export default Login;



function App() {
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);

  const addToCart = (product) => {
    const exists = cart.find(item => item.id === product.id);
    if (exists) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + product.quantity } // use the quantity passed in
          : item
      ));
    } else {
      setCart([...cart, { ...product }]); // already includes desired quantity
    }
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

  const navButtonStyle = {
    color: '#fff',
    background: '#ff4081',
    padding: '0.5rem 1rem', // reduced vertical padding
    borderRadius: '9999px',
    textDecoration: 'none',
    marginRight: '0.5rem',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    lineHeight: '1',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    transition: 'all 0.2s ease-in-out'
  };
  

  const updateCartQuantity = (id, quantity) => {
    setCart(cart.map(item =>
      item.id === id ? { ...item, quantity } : item
    ));
  };
  
 

  return (
    <Router>
      <nav style={{
  padding: '0.9rem',
  background: '#000',
  width: '100%',
  left: 0,
  right: 0,
  position: 'fixed',
  top: 0,
  zIndex: 1000,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'nowrap',
  boxSizing: 'border-box',
  overflowX: 'hidden'
}}>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/" style={navButtonStyle}>Home</Link>
          {user && <Link to="/admin" style={navButtonStyle}>Admin</Link>}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/cart" style={navButtonStyle}>
            <CartIcon cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} />
          </Link>
          {!user ? (
            <Link to="/login" style={navButtonStyle}>Login</Link>
          ) : (
            <button onClick={handleLogout} style={{ ...navButtonStyle, border: 'none', cursor: 'pointer' }}>Logout</button>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home addToCart={addToCart} />} />
        <Route path="/cart" element={<Cart cart={cart} removeFromCart={removeFromCart} updateCartQuantity={updateCartQuantity} />} />
        <Route path="/checkout" element={<Checkout cart={cart} clearCart={clearCart} />} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}


export default App;
