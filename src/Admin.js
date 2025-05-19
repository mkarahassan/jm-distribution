// src/Admin.js
import React, { useState, useEffect, useCallback } from 'react';
import { db, storage } from './firebase';
import { collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

import styles from './Admin.module.css'; 

// StrictMode-compatible Droppable
const StrictModeDroppable = ({ children, ...props }) => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);
  if (!enabled) {
    return null;
  }
  return <Droppable {...props}>{children}</Droppable>;
};


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
  const [imagePreview, setImagePreview] = useState(null);
  const [inStock, setInStock] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); 
  const [editId, setEditId] = useState(null);

  const clearForm = useCallback(() => {
    setName('');
    setPrice('');
    setCategory('');
    setCustomCategory('');
    setImage(null);
    setImagePreview(null);
    setInStock(true);
    setFeatured(false);
    setEditId(null);
  }, []);
  
  const displayMessage = (msg, type = 'success', duration = 3000) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, duration);
  };

  const fetchProducts = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const items = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      const sorted = items.sort((a, b) => {
        if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
          return a.displayOrder - b.displayOrder;
        }
        return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      });
      setProducts(sorted);
      setFilteredProducts(sorted); 
      const uniqueCategories = [...new Set(sorted.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error fetching products:", error);
      displayMessage("Failed to fetch products.", "error");
    }
  }, []); 
  
  const fetchOrders = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'orders'));
      const items = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      const sortedItems = items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOrders(sortedItems);
      setFilteredOrders(sortedItems);
    } catch (error) {
      console.error("Error fetching orders:", error);
      displayMessage("Failed to fetch orders.", "error");
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, [fetchProducts, fetchOrders]);

  useEffect(() => {
    const filtered = orders.filter(order => {
      const searchTermLower = searchOrdersTerm.toLowerCase();
      return (
        order.storeName?.toLowerCase().includes(searchTermLower) ||
        order.ownerName?.toLowerCase().includes(searchTermLower) ||
        order.phone?.includes(searchTermLower) ||
        // order.id.toLowerCase().includes(searchTermLower) || // Removed Order ID from search
        (order.items && order.items.some(item => item.name.toLowerCase().includes(searchTermLower)))
      );
    });
    setFilteredOrders(filtered);
  }, [searchOrdersTerm, orders]);

  useEffect(() => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchProductsTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchProductsTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
    const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
    setCategories(uniqueCategories);
  }, [searchProductsTerm, products]);

  const handleDragEnd = useCallback(async (result) => {
    if (!result.destination || !result.source) return;
    if (result.destination.droppableId === result.source.droppableId &&
        result.destination.index === result.source.index) {
      return;
    }

    const reordered = Array.from(filteredProducts);
    const [movedItem] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, movedItem);
    
    setFilteredProducts(reordered); 
  
    try {
      const updatePromises = reordered.map((product, index) => 
        updateDoc(doc(db, 'products', product.id), { displayOrder: index })
      );
      await Promise.all(updatePromises);
      
      if (!searchProductsTerm) {
        setProducts(reordered);
      } else {
        await fetchProducts(); 
      }
      displayMessage("Product order updated successfully!", "success");
    } catch (error) {
      console.error("Error updating product order:", error);
      displayMessage("Failed to update product order.", "error");
      await fetchProducts(); 
    }
  }, [filteredProducts, fetchProducts, searchProductsTerm, products]);
  

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!name || !price || (!category && !customCategory)) {
      displayMessage("Please fill in all required fields (Name, Price, Category).", "error");
      return;
    }

    try {
      let imageUrl = editId ? products.find(p => p.id === editId)?.image || '' : '';
      if (image) {
        const imageRef = ref(storage, `products/${Date.now()}_${image.name}`);
        await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(imageRef);
      }

      const finalCategory = customCategory || category;
      if (!finalCategory) {
        displayMessage("Category is required.", "error");
        return;
      }

      const productData = {
        name,
        price: parseFloat(price),
        category: finalCategory,
        image: imageUrl,
        inStock,
        featured,
      };

      if (editId) {
        await updateDoc(doc(db, 'products', editId), productData);
        displayMessage('Product updated successfully!', 'success');
      } else {
        productData.createdAt = serverTimestamp();
        productData.displayOrder = products.length; 
        await addDoc(collection(db, 'products'), productData);
        displayMessage('Product uploaded successfully!', 'success');
      }

      clearForm();
      fetchProducts(); 
    } catch (error) {
      console.error('Upload failed:', error);
      displayMessage(`Upload failed: ${error.message}`, 'error');
    }
  };

  const handleEdit = (product) => {
    setEditId(product.id);
    setName(product.name);
    setPrice(product.price.toString());
    setCategory(product.category);
    setCustomCategory(''); 
    setInStock(product.inStock);
    setFeatured(product.featured);
    setImage(null); 
    setImagePreview(product.image || null); 
    setShowSection('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteDoc(doc(db, 'products', id));
        displayMessage('Product deleted successfully!', 'success');
        fetchProducts();
      } catch (error) {
        console.error("Error deleting product:", error);
        displayMessage(`Error deleting product: ${error.message}`, 'error');
      }
    }
  };

  const toggleProductField = async (id, field, value) => {
    try {
      await updateDoc(doc(db, 'products', id), { [field]: value });
      displayMessage(`Product ${field} updated.`, 'success');
      const updateState = (prevState) => prevState.map(p => p.id === id ? {...p, [field]: value} : p);
      setProducts(updateState);
      setFilteredProducts(updateState);
    } catch (error) {
      console.error(`Error toggling ${field}:`, error);
      displayMessage(`Error updating ${field}: ${error.message}`, 'error');
      fetchProducts();
    }
  };

  const handleDeleteOrder = async (id) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      try {
        await deleteDoc(doc(db, 'orders', id));
        displayMessage('Order deleted successfully!', 'success');
        fetchOrders();
      } catch (error) {
        console.error("Error deleting order:", error);
        displayMessage(`Error deleting order: ${error.message}`, 'error');
      }
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className={`admin-page-container ${styles.adminPanel}`}>
        <h2 className={styles.adminTitle}>Admin Panel</h2>
        
        <div className={styles.sectionToggleButtons}>
          <button 
            onClick={() => { setShowSection('add'); clearForm(); }} 
            className={`btn ${styles.pillButton} ${showSection === 'add' ? styles.pillButtonActive : ''}`}
          >
            {editId ? 'Edit Product' : 'Add Product'}
          </button>
          <button 
            onClick={() => setShowSection('products')}
            className={`btn ${styles.pillButton} ${showSection === 'products' ? styles.pillButtonActive : ''}`}
          >
            View Products
          </button>
          <button 
            onClick={() => setShowSection('orders')}
            className={`btn ${styles.pillButton} ${showSection === 'orders' ? styles.pillButtonActive : ''}`}
          >
            View Orders
          </button>
        </div>

        {message && (
          <div className={messageType === 'success' ? styles.successMessage : styles.errorMessage}>
            {message}
          </div>
        )}

        {showSection === 'add' && (
          <>
            <h3 className={styles.formSectionTitle}>{editId ? 'Edit Product' : 'Add New Product'}</h3>
            <form onSubmit={handleUpload} className={styles.adminForm}>
              <input type="text" placeholder="Product Name" value={name} onChange={(e) => setName(e.target.value)} required className={`input-field ${styles.adminInput}`} />
              <input type="number" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} required className={`input-field ${styles.adminInput}`} step="0.01" min="0" />
              
              <select value={category} onChange={(e) => { setCategory(e.target.value); setCustomCategory(''); }} className={`input-field ${styles.adminSelect}`}>
                <option value="">Select existing category or add new</option>
                {categories.map((cat, index) => (
                  <option key={index} value={cat}>{cat}</option>
                ))}
              </select>
              <input type="text" placeholder="Or enter new category" value={customCategory} onChange={(e) => { setCustomCategory(e.target.value); if(e.target.value) setCategory(''); }} className={`input-field ${styles.adminInput}`} />
              
              {imagePreview && <img src={imagePreview} alt="Preview" style={{maxWidth: '100px', maxHeight: '100px', marginBottom: '1rem', borderRadius:'4px', objectFit: 'contain'}} />}
              <input type="file" onChange={handleImageChange} className={`input-field ${styles.adminInput}`} accept="image/*" />

              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={inStock} onChange={() => setInStock(!inStock)} /> In Stock
              </label>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={featured} onChange={() => setFeatured(!featured)} /> Mark as Hot Item (Featured)
              </label>

              <button type="submit" className={`btn btn-primary ${styles.uploadButton}`}>{editId ? 'Update' : 'Upload'} Product</button>
              {editId && <button type="button" className={`btn ${styles.cancelButton}`} onClick={clearForm} >Cancel Edit</button>}
            </form>
          </>
        )}

        {showSection === 'products' && (
          <div className={styles.searchAndTableContainer}>
            <h3 className={styles.formSectionTitle}>All Products</h3>
            <input
              type="text"
              placeholder="Search products by name or category..."
              value={searchProductsTerm}
              onChange={(e) => setSearchProductsTerm(e.target.value)}
              className={`input-field ${styles.searchInput}`}
            />
            <StrictModeDroppable droppableId="products">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={styles.itemsList}
                >
                  {filteredProducts.map((p, index) => (
                    <Draggable key={p.id} draggableId={p.id} index={index}>
                      {(providedDraggable, snapshotDraggable) => (
                        <div
                          ref={providedDraggable.innerRef}
                          {...providedDraggable.draggableProps}
                          {...providedDraggable.dragHandleProps}
                          className={styles.productItemDraggable}
                          style={{
                            ...providedDraggable.draggableProps.style,
                            boxShadow: snapshotDraggable.isDragging ? '0 4px 8px rgba(0,0,0,0.2)' : '',
                          }}
                        >
                          {p.image ? <img src={p.image} alt={p.name} className={styles.productImageAdmin} onError={(e) => e.target.style.display='none'} /> : <div className={styles.productImageAdmin} style={{backgroundColor: 'var(--background-tertiary)'}} />}
                          <div className={styles.productDetails}>
                            <strong>{p.name}</strong><br />
                            ${p.price.toFixed(2)}<br />
                            <span>{p.category}</span>
                          </div>
                          <div className={styles.productToggles}>
                            <label>
                              <input
                                type="checkbox"
                                checked={!!p.featured}
                                onChange={() => toggleProductField(p.id, 'featured', !p.featured)}
                              /> Hot Item
                            </label>
                            <label>
                              <input
                                type="checkbox"
                                checked={!!p.inStock}
                                onChange={() => toggleProductField(p.id, 'inStock', !p.inStock)}
                              /> In Stock
                            </label>
                          </div>
                          <div className={styles.productActions}>
                            <button onClick={() => handleEdit(p)} className={`btn btn-secondary ${styles.productActionsButton}`}>Edit</button>
                            <button onClick={() => handleDeleteProduct(p.id)} className={`btn btn-danger ${styles.deleteButton}`}>Delete</button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                   {filteredProducts.length === 0 && !products.length && <p>Loading products...</p> }
                   {filteredProducts.length === 0 && products.length > 0 && <p>No products match your search.</p>}
                </div>
              )}
            </StrictModeDroppable>
          </div>
        )}

        {showSection === 'orders' && (
          <div className={styles.searchAndTableContainer}>
            <h3 className={styles.formSectionTitle}>Customer Orders</h3>
            <input
              type="text"
              placeholder="Search orders (Name, Phone, Item)..." // Removed ID from placeholder
              value={searchOrdersTerm}
              onChange={(e) => setSearchOrdersTerm(e.target.value)}
              className={`input-field ${styles.searchInput}`}
            />
            <div className={styles.itemsList}>
              {filteredOrders.length > 0 ? filteredOrders.map(order => (
                <div key={order.id} className={styles.orderItemCard}>
                  {/* <p><strong>Order ID:</strong> {order.id}</p>  // Removed Order ID display */}
                  <p><strong>Store Name:</strong> {order.storeName || order.name}</p>
                  <p><strong>Store Owner:</strong> {order.ownerName}</p>
                  <p><strong>Phone:</strong> {order.phone}</p>
                  <p><strong>Address:</strong> {order.address}</p>
                  <p><strong>Total:</strong> ${order.total.toFixed(2)}</p>
                  <p><strong>Ordered:</strong> {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleString() : 'N/A'}</p>
                  <strong>Items:</strong>
                  <ul>
                    {order.items.map((item, idx) => (
                      // Updated item display: Quantity x Name - Price
                      <li key={idx}>
                        {item.quantity} × {item.name} (@ ${item.price.toFixed(2)} each)
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => handleDeleteOrder(order.id)} className={`btn btn-danger ${styles.deleteOrderButton}`}>Delete Order</button>
                </div>
              )) : <p>No orders found.</p>}
            </div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
};

export default Admin;