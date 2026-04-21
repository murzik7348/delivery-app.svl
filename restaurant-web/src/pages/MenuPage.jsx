import { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Loader2, Save, UtensilsCrossed, Info, Camera, Trash2 } from 'lucide-react';
import { fetchProducts, updateProduct, getRestaurantInfo, uploadProductImage, deleteProductImage } from '../api/restaurant';
import { resolveImageUrl } from '../api/client';

export default function MenuPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    getRestaurantInfo().then(res => {
      const id = res.id || res.data?.id;
      loadProducts(id);
    });
  }, []);

  const loadProducts = async (id) => {
    setLoading(true);
    try {
      const res = await fetchProducts({ page: 1, pageSize: 150, restaurantId: id });
      setProducts(res.items || res.data || (Array.isArray(res) ? res : []));
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const parseIngredients = (desc = '') => {
    const description = desc || '';
    const match = description.match(/\[INGS:(.*?)\]/);
    if (match && match[1]) {
      return match[1].split(',').filter(i => i.trim());
    }
    return [];
  };

  const getCleanDescription = (desc = '') => {
    const description = desc || '';
    return description.replace(/\[INGS:.*?\]/, '').trim();
  };

  const handleEditClick = (product) => {
    setEditingItem(product);
    setIngredients(parseIngredients(product.description));
  };

  const handleAddIngredient = () => {
    if (newIngredient.trim() && !ingredients.includes(newIngredient.trim())) {
      setIngredients([...ingredients, newIngredient.trim()]);
      setNewIngredient('');
    }
  };

  const handleRemoveIngredient = (ing) => {
    setIngredients(ingredients.filter(i => i !== ing));
  };

  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }, 'image/jpeg', 0.7); // 70% quality
        };
      };
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !editingItem) return;

    if (!editingItem.id) {
      alert('Помилка: ID продукту не знайдено');
      return;
    }

    setImageUploadLoading(true);
    try {
      console.log('🖼️ Original file size:', (file.size / 1024).toFixed(2), 'KB');
      const compressedFile = await compressImage(file);
      console.log('📉 Compressed file size:', (compressedFile.size / 1024).toFixed(2), 'KB');
      
      await uploadProductImage(editingItem.id, compressedFile);
      // Refresh products to show new image
      getRestaurantInfo().then(res => {
        const id = res.id || res.data?.id;
        loadProducts(id);
      });
    } catch (err) {
      console.error('Image upload failed:', err);
      const serverError = err.response?.data?.errors;
      const errorMsg = serverError ? Object.values(serverError).flat().join(', ') : 'Не вдалося завантажити зображення';
      alert(`Помилка завантаження: ${errorMsg}`);
    } finally {
      setImageUploadLoading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!editingItem) return;
    if (!window.confirm('Видалити зображення страви?')) return;

    setImageUploadLoading(true);
    try {
      await deleteProductImage(editingItem.id);
      getRestaurantInfo().then(res => {
        const id = res.id || res.data?.id;
        loadProducts(id);
      });
    } catch (err) {
      console.error('Image deletion failed:', err);
      alert('Не вдалося видалити зображення');
    } finally {
      setImageUploadLoading(false);
    }
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      const rawDesc = getCleanDescription(editingItem.description);
      const ingString = ingredients.length > 0 ? `[INGS:${ingredients.join(',')}]` : '';
      const finalDesc = `${rawDesc} ${ingString}`.trim();

      await updateProduct(editingItem.id, {
        ...editingItem,
        description: finalDesc
      });

      setProducts(products.map(p => 
        p.id === editingItem.id ? { ...p, description: finalDesc } : p
      ));
      setEditingItem(null);
    } catch (err) {
      alert('Помилка при збереженні інгредієнтів');
    } finally {
      setSaveLoading(false);
    }
  };

  const filtered = products.filter(p => 
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in relative max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-white mb-1 uppercase tracking-tight">Керування Меню</h2>
          <p className="text-textSecondary text-sm">Налаштуйте склад страв для правильного готування на кухні.</p>
        </div>
        
        <div className="relative group w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Пошук страви за назвою..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-borderWhite rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-textSecondary focus:outline-none focus:border-primary transition-all shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="h-[60vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(product => {
            const productIngs = parseIngredients(product.description);
            return (
              <div key={product.id} className="glass-panel p-5 group hover:border-borderPrimary transition-all duration-300 flex flex-col h-full bg-surface/40 hover:bg-surface/60">
                <div className="relative h-40 mb-4 rounded-xl overflow-hidden border border-borderWhite shadow-inner">
                  {product.urlBase || product.imageUrl ? (
                    <img src={resolveImageUrl(product.urlBase || product.imageUrl)} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-surfaceLighter flex items-center justify-center">
                      <UtensilsCrossed className="w-10 h-10 text-textSecondary opacity-20" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-borderWhite">
                    <span className="text-xs font-bold text-white">{product.price} ₴</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <h3 className="font-bold text-white text-lg line-clamp-1">{product.name}</h3>
                  <div className="flex flex-wrap gap-1.5 h-16 overflow-y-auto pr-1 scrollbar-hide">
                    {productIngs.length > 0 ? (
                      productIngs.map((ing, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px] font-medium uppercase tracking-wider">
                          {ing}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-textSecondary italic opacity-60">Склад не вказано</span>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => handleEditClick(product)}
                  className="mt-4 w-full py-2.5 rounded-xl glass-button text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary shadow-glow-primary transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" /> Налаштувати склад
                </button>
              </div>
            );
          })}
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
           <div className="glass-panel max-w-xl w-full p-8 relative border-primary/50 shadow-glow-primary overflow-hidden animate-in zoom-in duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary animate-pulse" />
              
              <div className="flex justify-between items-start mb-8">
                 <div className="flex items-center gap-4">
                    <div className="relative group">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-borderWhite shadow-lg">
                        {editingItem.urlBase || editingItem.imageUrl ? (
                           <img src={resolveImageUrl(editingItem.urlBase || editingItem.imageUrl)} className="w-full h-full object-cover" alt="" />
                        ) : (
                           <div className="w-full h-full bg-surfaceLighter flex items-center justify-center">
                              <UtensilsCrossed className="w-6 h-6 text-textSecondary opacity-40" />
                           </div>
                        )}
                        {imageUploadLoading && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-2 -right-2 flex gap-1">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="p-1.5 bg-primary text-white rounded-lg shadow-lg hover:scale-110 transition-transform"
                          title="Змінити фото"
                        >
                          <Camera className="w-3 h-3" />
                        </button>
                        {(editingItem.urlBase || editingItem.imageUrl) && (
                          <button 
                            onClick={handleDeleteImage}
                            className="p-1.5 bg-danger text-white rounded-lg shadow-lg hover:scale-110 transition-transform"
                            title="Видалити фото"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight">Склад страви</h3>
                      <p className="text-textSecondary text-sm font-medium mt-1">{editingItem.name}</p>
                    </div>
                 </div>
                 <button onClick={() => setEditingItem(null)} className="p-2 rounded-full hover:bg-surfaceLighter transition-all">
                    <X className="w-6 h-6 text-textSecondary" />
                 </button>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                className="hidden" 
                accept="image/*"
              />

              <div className="space-y-6">
                 <div>
                    <label className="block text-xs font-black text-textSecondary uppercase tracking-widest mb-4">Доступні компоненти</label>
                    <div className="flex flex-wrap gap-2 min-h-[100px] p-6 bg-surface/50 rounded-2xl border border-dashed border-borderWhite">
                       {ingredients.map((ing, idx) => (
                         <div key={idx} className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold shadow-glow-primary animate-in zoom-in duration-200">
                            {ing}
                            <button onClick={() => handleRemoveIngredient(ing)} className="hover:text-danger hover:scale-125 transition-all outline-none">
                               <X className="w-4 h-4" />
                            </button>
                         </div>
                       ))}
                       {ingredients.length === 0 && (
                         <div className="flex flex-col items-center justify-center w-full text-center opacity-40">
                           <Info className="w-6 h-6 mb-2" />
                           <p className="text-[10px] font-bold uppercase tracking-widest">Додайте компоненти нижче</p>
                         </div>
                       )}
                    </div>
                 </div>

                 <div className="flex gap-2">
                    <input 
                      autoFocus
                      type="text" 
                      value={newIngredient}
                      onChange={(e) => setNewIngredient(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient()}
                      placeholder="Напр: Томати, Гірчиця..."
                      className="flex-1 bg-surface border border-borderWhite rounded-xl py-4 px-4 text-white placeholder-textSecondary focus:outline-none focus:border-secondary transition-all"
                    />
                    <button 
                      onClick={handleAddIngredient}
                      className="px-6 rounded-xl bg-secondary text-white font-black shadow-glow-secondary hover:bg-secondary/90 hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-wider"
                    >
                      ДОДАТИ
                    </button>
                 </div>

                 <div className="pt-6 border-t border-borderWhite flex gap-4">
                    <button 
                      onClick={() => setEditingItem(null)}
                      className="flex-1 py-4 glass-button rounded-xl text-white font-bold uppercase tracking-widest text-xs hover:bg-surfaceLighter transition-all"
                    >
                      Скасувати
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={saveLoading || imageUploadLoading}
                      className="flex-[2] py-4 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-glow-primary hover:bg-primaryHover disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {saveLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Зберегти склад</>}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
