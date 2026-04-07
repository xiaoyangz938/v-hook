import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, ShoppingCart, Download, X, Eye, LayoutGrid, Clock, Globe, Beaker, Sparkles, Settings, HelpCircle, Heart, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

type CommunityItem = {
  id: number;
  title: string;
  author: string;
  image: string;
  views: string;
  downloads: string;
  description?: string;
  isLiked?: boolean;
  lastOpenedAt?: number;
  gcodeFileName?: string;
  gcodeUrl?: string;
  tdmFileName?: string;
  tdmUrl?: string;
  isUserCreated?: boolean;
  storageKey?: string;
};

export default function Community() {
  const [items, setItems] = useState<CommunityItem[]>([]);
  const [publicUploadsEnabled, setPublicUploadsEnabled] = useState(true);
  const [adminAuthEnabled, setAdminAuthEnabled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'online' | 'library' | 'recent'>('online');
  const [selectedItem, setSelectedItem] = useState<CommunityItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('You');
  const [description, setDescription] = useState('');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [gcodeFile, setGcodeFile] = useState<File | null>(null);
  const [tdmFile, setTdmFile] = useState<File | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    const storedPassword = window.localStorage.getItem('vhook-admin-password');
    if (storedPassword) {
      setAdminPassword(storedPassword);
      setIsAdmin(true);
    }

    fetch('/api/config')
      .then((response) => response.json())
      .then((data: { publicUploadsEnabled?: boolean; adminAuthEnabled?: boolean }) => {
        setPublicUploadsEnabled(Boolean(data.publicUploadsEnabled));
        setAdminAuthEnabled(Boolean(data.adminAuthEnabled));
      })
      .catch(() => {
        setPublicUploadsEnabled(false);
        setAdminAuthEnabled(false);
      });

    fetch('/api/community')
      .then((response) => response.json())
      .then((data: { items?: CommunityItem[] }) => {
        setItems((data.items || []).sort((a, b) => b.id - a.id));
      })
      .catch(() => {
        setItems([]);
      });
  }, []);

  const handleOpenItem = (item: CommunityItem) => {
    setSelectedItem(item);
    setItems((prev) =>
      prev.map((entry) => (entry.id === item.id ? { ...entry, lastOpenedAt: Date.now() } : entry))
    );
  };

  const toggleLike = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isLiked: !item.isLiked } : item)));

    if (selectedItem?.id === id) {
      setSelectedItem({ ...selectedItem, isLiked: !selectedItem.isLiked });
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      const response = await fetch(`/api/community/${id}`, {
        method: 'DELETE',
        headers: {
          'x-vhook-admin-password': adminPassword,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete community item');
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
      setSelectedItem((prev) => (prev?.id === id ? null : prev));
    } catch (error) {
      window.alert('Delete failed. Please try again.');
    }
  };

  const filteredItems = items
    .filter((item) => {
      if (activeTab === 'library') return item.isLiked;
      if (activeTab === 'recent') return item.lastOpenedAt !== undefined;
      return true;
    })
    .sort((a, b) => {
      if (activeTab === 'recent') {
        return (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0);
      }
      return b.id - a.id;
    });

  const resetUploadForm = () => {
    setTitle('');
    setAuthor('You');
    setDescription('');
    setCoverImageFile(null);
    setCoverImagePreview(null);
    setGcodeFile(null);
    setTdmFile(null);
    setAgreedToTerms(false);
    setIsSubmitting(false);
  };

  const handleCreateCommunityItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      window.alert('Please agree to the open-source community guidelines.');
      return;
    }

      setIsSubmitting(true);
    try {
      const payload = {
        title,
        author,
        description,
        coverImageDataUrl: coverImageFile ? await readFileAsDataUrl(coverImageFile) : undefined,
        coverImageFileName: coverImageFile?.name,
        gcodeDataUrl: gcodeFile ? await readFileAsDataUrl(gcodeFile) : undefined,
        gcodeFileName: gcodeFile?.name,
        tdmDataUrl: tdmFile ? await readFileAsDataUrl(tdmFile) : undefined,
        tdmFileName: tdmFile?.name,
      };

      const response = await fetch('/api/community', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vhook-admin-password': adminPassword,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || 'Failed to create community item');
      }

      const data = (await response.json()) as { item?: CommunityItem };
      if (data.item) {
        setActiveTab('online');
        setItems((prev) => [data.item!, ...prev.filter((item) => item.id !== data.item!.id)]);
      }

      setIsModalOpen(false);
      resetUploadForm();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Upload failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: adminPassword }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || 'Admin login failed');
      }

      window.localStorage.setItem('vhook-admin-password', adminPassword);
      setIsAdmin(true);
      setIsAdminModalOpen(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Admin login failed');
    }
  };

  const handleAdminLogout = () => {
    window.localStorage.removeItem('vhook-admin-password');
    setAdminPassword('');
    setIsAdmin(false);
  };

  return (
    <div className="h-screen bg-white flex flex-col font-sans text-gray-900 selection:bg-blue-100 selection:text-blue-900 pt-14">
      <header className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white border-b border-gray-100 gap-4 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <Link to="/" className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white font-serif font-bold shadow-sm hover:scale-105 transition-transform">V</Link>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl tracking-tight text-gray-900">MakerWorld</span>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold mt-1">Community</span>
          </div>
        </div>

        <div className="flex-1 w-full max-w-2xl mx-0 sm:mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search models, creators, or tags..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-full text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-gray-600">
          <button className="hover:text-gray-900 transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <button className="hover:text-gray-900 transition-colors">
            <ShoppingCart className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 shadow-inner cursor-pointer hover:ring-2 ring-offset-2 ring-blue-500 transition-all" />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col shrink-0">
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <button
              onClick={() => setActiveTab('library')}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-colors',
                activeTab === 'library' ? 'text-white bg-[#3a3a3a] shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Library
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-colors',
                activeTab === 'recent' ? 'text-white bg-[#3a3a3a] shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <Clock className="w-4 h-4" />
              Recently Opened
            </button>
            <button
              onClick={() => setActiveTab('online')}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-colors',
                activeTab === 'online' ? 'text-white bg-[#3a3a3a] shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <Globe className="w-4 h-4" />
              Online
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 rounded-full hover:bg-gray-50 transition-colors">
              <Beaker className="w-4 h-4" />
              MakerLab
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 rounded-full hover:bg-gray-50 transition-colors">
              <Sparkles className="w-4 h-4" />
              Creator Treasure
            </button>
          </nav>

          <div className="p-4 space-y-1 border-t border-gray-100 shrink-0">
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 rounded-full hover:bg-gray-50 transition-colors">
              <Settings className="w-4 h-4" />
              Settings
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 rounded-full hover:bg-gray-50 transition-colors">
              <HelpCircle className="w-4 h-4" />
              Support
            </a>
          </div>
        </aside>

        <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-y-auto bg-white">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-black m-0 tracking-tight">
                  {activeTab === 'online' && 'Application'}
                  {activeTab === 'library' && 'Library'}
                  {activeTab === 'recent' && 'Recently Opened'}
                </h1>
              </div>
              {publicUploadsEnabled && isAdmin ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all shadow-md hover:shadow-lg active:scale-95"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Creation
                  </button>
                  <button
                    onClick={handleAdminLogout}
                    className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Admin Logout
                  </button>
                </div>
              ) : adminAuthEnabled ? (
                <button
                  onClick={() => setIsAdminModalOpen(true)}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Admin Login
                </button>
              ) : (
                <div className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-500">
                  Upload disabled on public site
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              <AnimatePresence>
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group cursor-pointer flex flex-col"
                    onClick={() => handleOpenItem(item)}
                  >
                    <div className="aspect-[16/9] overflow-hidden relative rounded-2xl bg-gray-100 group/img">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="pt-4 flex flex-col">
                      <h4 className="font-serif font-bold text-black text-2xl m-0 line-clamp-1">{item.title}</h4>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-500 font-medium">{item.author}</span>
                        <div className="flex items-center gap-3 text-[11px] text-gray-400 font-medium">
                          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {item.views}</span>
                          <span className="flex items-center gap-1"><Download className="w-3.5 h-3.5" /> {item.downloads}</span>
                          <button
                            onClick={(e) => toggleLike(e, item.id)}
                            className={cn(
                              'flex items-center gap-1 transition-colors',
                              item.isLiked ? 'text-red-500' : 'hover:text-gray-600'
                            )}
                          >
                            <Heart className="w-3.5 h-3.5" fill={item.isLiked ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="relative aspect-[16/9] w-full bg-gray-100 shrink-0">
                <img src={selectedItem.image} alt={selectedItem.title} className="w-full h-full object-cover" />
                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">{selectedItem.title}</h2>
                    <p className="text-gray-500 font-medium">By {selectedItem.author}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => toggleLike(e, selectedItem.id)}
                      className={cn(
                        'p-3 rounded-full transition-colors border',
                        selectedItem.isLiked
                          ? 'bg-red-50 border-red-100 text-red-500'
                          : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                      )}
                    >
                      <Heart className="w-5 h-5" fill={selectedItem.isLiked ? 'currentColor' : 'none'} />
                    </button>
                    {publicUploadsEnabled && isAdmin && (selectedItem.isUserCreated || selectedItem.author === 'You') && (
                      <button
                        onClick={() => handleDeleteItem(selectedItem.id)}
                        className="p-3 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="prose prose-gray max-w-none">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {selectedItem.description || 'No description provided for this creation.'}
                  </p>
                </div>

                <div className="mt-8 flex items-center gap-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Eye className="w-5 h-5" />
                    <span className="font-medium">{selectedItem.views} Views</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 relative group cursor-pointer">
                    <Download className="w-5 h-5" />
                    <span className="font-medium">{selectedItem.downloads} Downloads</span>

                    <div className="absolute bottom-full left-0 mb-2 w-32 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden z-20">
                      {selectedItem.tdmFileName && selectedItem.tdmUrl ? (
                        <a href={selectedItem.tdmUrl} download={selectedItem.tdmFileName} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors">.3dm File</a>
                      ) : (
                        <div className="w-full text-left px-4 py-2 text-sm text-gray-400 cursor-not-allowed">No .3dm</div>
                      )}
                      {selectedItem.gcodeFileName && selectedItem.gcodeUrl ? (
                        <a href={selectedItem.gcodeUrl} download={selectedItem.gcodeFileName} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors">.gcode File</a>
                      ) : (
                        <div className="w-full text-left px-4 py-2 text-sm text-gray-400 cursor-not-allowed">No .gcode</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdminModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdminModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900">Admin Login</h2>
                <button
                  onClick={() => setIsAdminModalOpen(false)}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-5 p-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Admin Password</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none transition-all focus:bg-white focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-gray-900 px-4 py-2.5 font-medium text-white transition-colors hover:bg-gray-800"
                >
                  Login as Admin
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                resetUploadForm();
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Upload Creation</h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    resetUploadForm();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCommunityItem} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Project Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., V-Hook Racing Car"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
                  <label className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer group relative overflow-hidden block">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setCoverImageFile(file);
                        setCoverImagePreview(file ? URL.createObjectURL(file) : null);
                      }}
                    />
                    {coverImagePreview ? (
                      <div className="absolute inset-0">
                        <img src={coverImagePreview} alt="Cover Preview" className="w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="bg-black/60 text-white px-4 py-2 rounded-lg font-medium">Change Image</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">Click to upload</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, or WEBP</p>
                      </>
                    )}
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">G-code File</label>
                    <label className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer group h-32 flex flex-col items-center justify-center">
                      <input
                        type="file"
                        accept=".gcode"
                        className="hidden"
                        onChange={(e) => setGcodeFile(e.target.files?.[0] || null)}
                      />
                      {gcodeFile ? (
                        <div className="flex flex-col items-center w-full">
                          <Upload className="w-6 h-6 text-green-600 mb-2" />
                          <p className="text-sm font-medium text-green-700 truncate w-full px-2">{gcodeFile.name}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Upload className="w-6 h-6 text-gray-400 mb-2 group-hover:scale-110 transition-transform" />
                          <p className="text-sm font-medium text-gray-600">Upload .gcode</p>
                        </div>
                      )}
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">3DM File</label>
                    <label className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer group h-32 flex flex-col items-center justify-center">
                      <input
                        type="file"
                        accept=".3dm"
                        className="hidden"
                        onChange={(e) => setTdmFile(e.target.files?.[0] || null)}
                      />
                      {tdmFile ? (
                        <div className="flex flex-col items-center w-full">
                          <Upload className="w-6 h-6 text-blue-600 mb-2" />
                          <p className="text-sm font-medium text-blue-700 truncate w-full px-2">{tdmFile.name}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Upload className="w-6 h-6 text-gray-400 mb-2 group-hover:scale-110 transition-transform" />
                          <p className="text-sm font-medium text-gray-600">Upload .3dm</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell us about your creation..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
                  />
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer shrink-0"
                    required
                  />
                  <label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed cursor-pointer select-none">
                    I agree to share this creation under the open-source community guidelines, allowing others to download, use, and modify my files.
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetUploadForm();
                    }}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-md disabled:opacity-60"
                  >
                    {isSubmitting ? 'Publishing...' : 'Publish'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
