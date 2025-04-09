import React, { useState, useEffect } from 'react';
import { db, storage } from './firebase';
import { collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Papa from 'papaparse';

const Admin = () => {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchOrdersTerm, setSearchOrdersTerm] = useState('');
  const [searchProductsTerm, setSearchProductsTerm] = useState('');
  const [showSection, setShowSection] = useState('products');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [image, setImage] = useState(null);
  const [inStock, setInStock] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [message, setMessage] = useState('');
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  useEffect(() => {
    const filtered = orders.filter(order => {
      return (
        order.storeName?.toLowerCase().includes(searchOrdersTerm.toLowerCase()) ||
        order.ownerName?.toLowerCase().includes(searchOrdersTerm.toLowerCase()) ||
        order.phone?.includes(searchOrdersTerm)
      );
    });
    setFilteredOrders(filtered);
  }, [searchOrdersTerm, orders]);

  useEffect(() => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchProductsTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
    const uniqueCategories = [...new Set(products.map(p => p.category))];
    setCategories(uniqueCategories);
  }, [searchProductsTerm, products]);

  const fetchProducts = async () => {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setProducts(items);
    setFilteredProducts(items);
    const uniqueCategories = [...new Set(items.map(p => p.category))];
    setCategories(uniqueCategories);
  };

  const fetchOrders = async () => {
    const querySnapshot = await getDocs(collection(db, 'orders'));
    const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const sortedItems = items.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
    setOrders(sortedItems);
    setFilteredOrders(sortedItems);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    try {
      let imageUrl = '';
      if (image) {
        const imageRef = ref(storage, `products/${image.name}`);
        await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(imageRef);
      } else if (editId) {
        const existing = products.find(p => p.id === editId);
        imageUrl = existing?.image || '';
      }

      const productData = {
        name,
        price: parseFloat(price),
        category: customCategory || category,
        image: imageUrl,
        inStock,
        featured,
        createdAt: serverTimestamp()
      };

      if (editId) {
        await updateDoc(doc(db, 'products', editId), productData);
        setMessage('Product updated successfully!');
        setEditId(null);
      } else {
        await addDoc(collection(db, 'products'), productData);
        setMessage('Product uploaded successfully!');
      }

      setName('');
      setPrice('');
      setCategory('');
      setCustomCategory('');
      setImage(null);
      setInStock(true);
      setFeatured(false);
      fetchProducts();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Something went wrong.');
    }
  };

  const handleEdit = (product) => {
    setEditId(product.id);
    setName(product.name);
    setPrice(product.price);
    setCategory(product.category);
    setInStock(product.inStock);
    setFeatured(product.featured);
    setShowSection('add');
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'products', id));
    fetchProducts();
  };

  const toggleProductField = async (id, field, value) => {
    await updateDoc(doc(db, 'products', id), { [field]: value });
    fetchProducts();
  };

  const handleDeleteOrder = async (id) => {
    await deleteDoc(doc(db, 'orders', id));
    fetchOrders();
  };

  const pillButtonStyle = {
    marginRight: '1rem',
    padding: '0.5rem 1rem',
    borderRadius: '999px',
    background: '#ff4081',
    border: 'none',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer'
  };

  const inputStyle = {
    marginBottom: '1rem',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: '1px solid #ccc',
    background: '#fff',
    color: '#000'
  };
  
  const uploadButtonStyle = {
    marginTop: '1rem',
    borderRadius: '999px',
    background: '#28a745',
    border: 'none',
    color: 'white',
    fontWeight: 'bold',
    padding: '0.5rem 1.5rem',
    cursor: 'pointer'
  };

  return (
    <div style={{ padding: '2rem', background: '#1a1a1a', minHeight: '100vh', color: '#fff' }}>
      <h2>Admin Panel</h2>

      <div style={{ marginBottom: '2rem' }}>
        <button onClick={() => setShowSection('add')} style={pillButtonStyle}>Add Product</button>
        <button onClick={() => setShowSection('products')} style={pillButtonStyle}>View Products</button>
        <button onClick={() => setShowSection('orders')} style={pillButtonStyle}>View Orders</button>
      </div>


      {showSection === 'add' && (
        <>
          <h3>{editId ? 'Edit Product' : 'Add New Product'}</h3>
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', maxWidth: '400px' }}>
          <input type="text" placeholder="Product Name" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
<input type="number" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} required style={inputStyle} />

<select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
  <option value="">Select existing category</option>
  {categories.map((cat, index) => (
    <option key={index} value={cat}>{cat}</option>
  ))}
</select>

<input type="text" placeholder="Or enter new category" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} style={inputStyle} />
<input type="file" onChange={(e) => setImage(e.target.files[0])} style={inputStyle} />

<label style={{ marginBottom: '0.5rem' }}>
  <input type="checkbox" checked={inStock} onChange={() => setInStock(!inStock)} /> In Stock
</label>
<label style={{ marginBottom: '1rem' }}>
  <input type="checkbox" checked={featured} onChange={() => setFeatured(!featured)} /> Mark as Hot Item
</label>

<button type="submit" style={uploadButtonStyle}>{editId ? 'Update' : 'Upload'} Product</button>

          </form>
          {message && <p style={{ marginTop: '1rem', color: 'lightgreen' }}>{message}</p>}
        </>
      )}

      {showSection === 'products' && (
        <>
          <h3>All Products</h3>
          <input
            type="text"
            placeholder="Search products..."
            value={searchProductsTerm}
            onChange={(e) => setSearchProductsTerm(e.target.value)}
            style={{ marginBottom: '1rem', padding: '0.5rem', width: '100%', maxWidth: '400px' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredProducts.map(p => (
              <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto auto', alignItems: 'center', background: '#333', padding: '1rem', borderRadius: '8px', gap: '1rem' }}>
                {p.image && <img src={p.image} alt={p.name} style={{ width: '60px', height: '60px', objectFit: 'contain' }} />}
                <div>
                  <strong>{p.name}</strong><br />
                  ${p.price.toFixed(2)}<br />
                  <span>{p.category}</span>
                </div>
                <div>
                  <label>
                    <input
                      type="checkbox"
                      checked={p.featured}
                      onChange={() => toggleProductField(p.id, 'featured', !p.featured)}
                    /> Hot Item
                  </label>
                  <br />
                  <label>
                    <input
                      type="checkbox"
                      checked={p.inStock}
                      onChange={() => toggleProductField(p.id, 'inStock', !p.inStock)}
                    /> In Stock
                  </label>
                </div>
                <div>
                  <button onClick={() => handleEdit(p)} style={{ marginBottom: '0.5rem' }}>Edit</button>
                  <button onClick={() => handleDelete(p.id)} style={{ background: 'crimson', color: '#fff' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showSection === 'orders' && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Customer Orders</h3>
          <input
            type="text"
            placeholder="Search by store, owner, or phone"
            value={searchOrdersTerm}
            onChange={(e) => setSearchOrdersTerm(e.target.value)}
            style={{ marginBottom: '1rem', padding: '0.5rem', width: '100%', maxWidth: '400px' }}
          />
          {filteredOrders.map(order => (
            <div key={order.id} style={{ background: '#444', padding: '1rem', marginBottom: '1rem', borderRadius: '8px' }}>
              <p><strong>Store Name:</strong> {order.storeName || order.name}</p>
              <p><strong>Store Owner:</strong> {order.ownerName}</p>
              <p><strong>Phone:</strong> {order.phone}</p>
              <p><strong>Address:</strong> {order.address}</p>
              <p><strong>Total:</strong> ${order.total.toFixed(2)}</p>
              <p><strong>Ordered:</strong> {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
              <ul>
                {order.items.map((item, idx) => (
                  <li key={idx}>{item.name} × {item.quantity}</li>
                ))}
              </ul>
              <button onClick={() => handleDeleteOrder(order.id)} style={{ marginTop: '0.5rem', background: 'crimson', color: '#fff' }}>Delete Order</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Admin;
