import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getProducts, getCategories, getRestaurants, addProduct, editProduct, removeProduct, toggleProductStatus } from '../store/slices/catalogSlice';
import { Search, Plus, Edit2, Trash2, X, Loader2, Image as ImageIcon } from 'lucide-react';

function ProductModal({ isOpen, onClose, product, categories, restaurants, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    weightGrams: '',
    categoryId: '',
    description: '',
    restaurantId: '' 
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        price: product.price || '',
        weightGrams: product.weightGrams || '',
        categoryId: product.categoryId || (categories.length > 0 ? categories[0].id : ''),
        description: product.description || '',
        restaurantId: product.restaurantId || (restaurants?.length > 0 ? restaurants[0].id : '')
      });
      setImagePreview(product.imageUrl || '');
    } else {
      setFormData({
        name: '',
        price: '',
        weightGrams: '',
        categoryId: categories.length > 0 ? categories[0].id : '',
        description: '',
        restaurantId: restaurants?.length > 0 ? restaurants[0].id : ''
      });
      setImagePreview('');
    }
    setImageFile(null);
  }, [product, categories, restaurants, isOpen]);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
      const file = e.target.files[0];
      if (file) {
          setImageFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
              setImagePreview(reader.result);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      
      const payload = {
          ...formData,
          price: Number(formData.price),
          weightGrams: Number(formData.weightGrams),
          categoryId: Number(formData.categoryId),
          restaurantId: Number(formData.restaurantId)
      };
      
      await onSubmit(payload, imageFile, product?.id);
      setIsSubmitting(false);
      onClose();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-panel max-w-lg w-full p-6 relative border-borderPrimary shadow-glow-primary my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">{product ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} className="p-2 bg-surfaceLighter text-textSecondary hover:text-white rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Image Upload Area */}
          <div className="flex flex-col items-center justify-center mb-4">
              <div 
                className="w-32 h-32 rounded-2xl bg-surfaceLighter border-2 border-dashed border-borderWhite flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden group relative"
                onClick={() => fileInputRef.current?.click()}
              >
                  {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs font-bold">Change Image</span>
                        </div>
                      </>
                  ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-textSecondary group-hover:text-primary mb-2 transition-colors" />
                        <span className="text-xs text-textSecondary font-medium text-center px-2">Upload Photo</span>
                      </>
                  )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                accept="image/*" 
                className="hidden" 
              />
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">Name</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-surface border border-borderWhite rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-primary transition-all shadow-sm"
              placeholder="E.g. Pepperoni Pizza"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">Price (₴)</label>
              <input 
                required
                type="number"
                min="0"
                step="0.01" 
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                className="w-full bg-surface border border-borderWhite rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-primary transition-all shadow-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">Weight (g)</label>
              <input 
                required
                type="number" 
                min="0"
                value={formData.weightGrams}
                onChange={(e) => setFormData({...formData, weightGrams: e.target.value})}
                className="w-full bg-surface border border-borderWhite rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-primary transition-all shadow-sm"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">Category</label>
              <select 
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                className="w-full bg-surface border border-borderWhite rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-primary transition-all shadow-sm"
              >
                <option value="" disabled>Select category</option>
                {categories.map((cat, idx) => (
                   <option key={typeof cat === 'string' ? cat : (cat.id || idx)} value={typeof cat === 'string' ? cat : (cat.id || idx)}>
                     {typeof cat === 'string' ? cat : (cat.name || `Cat #${cat.id}`)}
                   </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">Restaurant</label>
              <select 
                required
                value={formData.restaurantId}
                onChange={(e) => setFormData({...formData, restaurantId: e.target.value})}
                className="w-full bg-surface border border-borderWhite rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-primary transition-all shadow-sm"
              >
                <option value="" disabled>Select restaurant</option>
                {restaurants && restaurants.length > 0 ? (
                  restaurants.map((rest, idx) => {
                    const rId = typeof rest === 'string' ? rest : (rest.id || idx);
                    const rName = typeof rest === 'string' ? rest : (rest.name || `Rest #${rest.id}`);
                    return (
                      <option key={rId} value={rId}>{rName}</option>
                    );
                  })
                ) : (
                  <option value="1">Default Restaurant (ID: 1)</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">Description</label>
            <textarea 
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full bg-surface border border-borderWhite rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-primary transition-all shadow-sm"
              placeholder="Short description of the product..."
            ></textarea>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 glass-button py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:bg-surfaceLighter"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 bg-primary hover:bg-primaryHover disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-bold flex items-center justify-center transition-all shadow-glow-primary"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CatalogPage() {
  const dispatch = useDispatch();
  const { products: items, categories, restaurants, isLoading } = useSelector(state => state.catalog);
  
  const [search, setSearch] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState('ALL');

  useEffect(() => {
    dispatch(getProducts({ page: 1, pageSize: 100 }));
    dispatch(getCategories());
    dispatch(getRestaurants());
  }, [dispatch]);

  const filteredItems = Array.isArray(items) ? items.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || 
                          categories.find(c => c.id === u.categoryId)?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesFolder = selectedFolderId === 'ALL' || u.restaurantId.toString() === selectedFolderId.toString();
    return matchesSearch && matchesFolder;
  }) : [];

  const handleOpenModal = (product = null) => {
      setEditingProduct(product);
      setModalOpen(true);
  };

  const handleSaveProduct = async (payload, imageFile, id) => {
      if (id) {
          await dispatch(editProduct({ id, data: payload, imageFile }));
      } else {
          await dispatch(addProduct({ productData: payload, imageFile }));
      }
      dispatch(getProducts({ page: 1, pageSize: 100 })); // Refresh
  };

  const handleDelete = async (id) => {
      if(window.confirm('Are you sure you want to delete this product?')) {
          await dispatch(removeProduct(id));
      }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Catalog Management</h2>
          <p className="text-textSecondary text-sm">Manage food items, prices and availability.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="relative group w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search dishes..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface border border-borderWhite rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-textSecondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all shadow-sm"
            />
          </div>
          
          <button 
            onClick={() => handleOpenModal()} 
            className="bg-primary hover:bg-primaryHover text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center transition-all shadow-glow-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </button>
        </div>
      </div>

      {/* Tabs / Folders for Restaurants and Shops */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedFolderId('ALL')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
            selectedFolderId === 'ALL' 
              ? 'bg-primary text-white shadow-glow-primary' 
              : 'bg-surface border border-borderWhite text-textSecondary hover:text-white hover:border-primary/50'
          }`}
        >
          All Items
        </button>
        {restaurants && restaurants.map((rest, index) => {
          const restId = typeof rest === 'string' ? rest : (rest.id || index);
          const restName = typeof rest === 'string' ? rest : (rest.name || `Rest #${rest.id}`);
          
          return (
            <button
              key={restId}
              onClick={() => setSelectedFolderId(restId)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                selectedFolderId === restId 
                  ? 'bg-primary text-white shadow-glow-primary' 
                  : 'bg-surface border border-borderWhite text-textSecondary hover:text-white hover:border-primary/50'
              }`}
            >
              📁 {restName}
            </button>
          );
        })}
      </div>

      <div className="glass-panel overflow-hidden relative min-h-[400px]">
         
         {isLoading && (!items || items.length === 0) ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 backdrop-blur-sm">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
         ) : null}

         <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
             <thead>
               <tr className="bg-surfaceLighter/50 border-b border-borderWhite text-xs uppercase tracking-wider text-textSecondary font-semibold">
                 <th className="p-4">Item Name</th>
                 <th className="p-4">Category</th>
                 <th className="p-4">Restaurant</th>
                 <th className="p-4">Weight</th>
                 <th className="p-4">Price</th>
                 <th className="p-4 text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-borderWhite">
               {filteredItems.map(item => {
                 const restaurantName = restaurants?.find(r => r.id === item.restaurantId)?.name || `Rest #${item.restaurantId || 1}`;
                 return (
                 <tr key={item.id} className="hover:bg-surfaceLighter/30 transition-colors group">
                   
                   <td className="p-4">
                     <div className="flex items-center">
                       {item.imageUrl ? (
                         <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover mr-3 border border-borderWhite" />
                       ) : (
                         <div className="w-10 h-10 rounded-lg bg-surfaceLighter border border-borderWhite flex items-center justify-center mr-3">
                           <ImageIcon className="w-4 h-4 text-textSecondary" />
                         </div>
                       )}
                       <div>
                         <p className="text-white font-medium">{item.name}</p>
                         <p className="text-textSecondary text-xs truncate max-w-[200px]">{item.description}</p>
                       </div>
                     </div>
                   </td>
                   
                   <td className="p-4">
                     <span className="bg-surface px-2.5 py-1 text-xs font-semibold rounded border border-borderWhite text-textSecondary">
                       {categories.find(c => c.id === item.categoryId)?.name || `Cat #${item.categoryId}`}
                     </span>
                   </td>
                   
                   <td className="p-4">
                     <span className="text-textSecondary text-sm">
                       {restaurantName}
                     </span>
                   </td>

                   <td className="p-4 text-textSecondary text-sm">
                       {item.weightGrams}g
                   </td>
                   
                   <td className="p-4">
                     <span className="text-white font-bold">{item.price} ₴</span>
                   </td>
                   
                   <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(item)}
                          className="p-2 text-textSecondary hover:text-white bg-surface hover:bg-surfaceLighter border border-borderWhite rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-textSecondary hover:text-danger bg-surface hover:bg-danger/10 border border-borderWhite hover:border-danger/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                   </td>
                 </tr>
               )})}
             </tbody>
           </table>
           
           {filteredItems.length === 0 && !isLoading && (
             <div className="p-8 text-center text-textSecondary">
               No items found matching "{search}"
             </div>
           )}
         </div>
      </div>

      <ProductModal 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        product={editingProduct} 
        categories={categories}
        restaurants={restaurants}
        onSubmit={handleSaveProduct}
      />
    </div>
  );
}
