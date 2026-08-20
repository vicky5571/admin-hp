"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Brand,
  Category,
  CreateProductPayload,
  Product,
  TaxClass,
  createBrand,
  createCategory,
  createProduct,
  deleteProduct,
  fetchBrands,
  fetchCategories,
  fetchProducts,
  fetchTaxClasses,
  updateProduct,
} from "@/lib/api";

const PRODUCT_TYPES = [
  { value: "SERIALIZED", label: "Serialized (IMEI / Serial)", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "NON_SERIALIZED", label: "Non-Serialized (Standard)", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "SERVICE", label: "Service / Labor", badge: "bg-amber-50 text-amber-700 border-amber-200" },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [taxClasses, setTaxClasses] = useState<TaxClass[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Form Fields
  const [formSku, setFormSku] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<string>("SERIALIZED");
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formBrandId, setFormBrandId] = useState<string>("");
  const [formCostPrice, setFormCostPrice] = useState<string>("");
  const [formSrp, setFormSrp] = useState<string>("");
  const [formTaxClassId, setFormTaxClassId] = useState<string>("");
  const [formMinStockAlert, setFormMinStockAlert] = useState<string>("5");
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  // Quick Add Sub-modals
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [brandSubmitting, setBrandSubmitting] = useState(false);
  const [brandError, setBrandError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, brandRes, taxRes] = await Promise.all([
        fetchProducts({ limit: 200 }),
        fetchCategories(),
        fetchBrands(),
        fetchTaxClasses().catch(() => ({ success: true, data: [] })),
      ]);

      setProducts(prodRes.data ?? []);
      setCategories(catRes.data ?? []);
      setBrands(brandRes.data ?? []);
      setTaxClasses(taxRes.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open modal for new product
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormSku(`PRD-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormName("");
    setFormType("SERIALIZED");
    setFormCategoryId("");
    setFormBrandId("");
    setFormCostPrice("");
    setFormSrp("");
    setFormTaxClassId("");
    setFormMinStockAlert("5");
    setFormIsActive(true);
    setModalError("");
    setIsModalOpen(true);
  };

  // Open modal for editing existing product
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormSku(p.sku);
    setFormName(p.name);
    setFormType(p.productType);
    setFormCategoryId(p.categoryId ? String(p.categoryId) : "");
    setFormBrandId(p.brandId ? String(p.brandId) : "");
    setFormCostPrice(String(parseFloat(p.costPrice) || 0));
    setFormSrp(String(parseFloat(p.srp) || 0));
    setFormTaxClassId(p.taxClassId ? String(p.taxClassId) : "");
    setFormMinStockAlert(String(p.minStockAlert ?? 0));
    setFormIsActive(p.isActive);
    setModalError("");
    setIsModalOpen(true);
  };

  // Generate a random SKU
  const handleGenerateSku = () => {
    const prefix = formType === "SERIALIZED" ? "TEL" : formType === "NON_SERIALIZED" ? "ACC" : "SRV";
    const rand = Math.floor(100000 + Math.random() * 900000);
    setFormSku(`${prefix}-${rand}`);
  };

  // Save (Create or Update)
  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSku.trim()) {
      setModalError("SKU is required");
      return;
    }
    if (!formName.trim()) {
      setModalError("Product name is required");
      return;
    }

    const costNum = parseFloat(formCostPrice) || 0;
    const srpNum = parseFloat(formSrp) || 0;

    if (srpNum < 0 || costNum < 0) {
      setModalError("Prices cannot be negative");
      return;
    }

    setModalSubmitting(true);
    setModalError("");

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          sku: formSku.trim(),
          name: formName.trim(),
          productType: formType,
          categoryId: formCategoryId ? Number(formCategoryId) : null,
          brandId: formBrandId ? Number(formBrandId) : null,
          costPrice: costNum,
          srp: srpNum,
          taxClassId: formTaxClassId ? Number(formTaxClassId) : null,
          minStockAlert: Number(formMinStockAlert) || 0,
          isActive: formIsActive,
        });
        setSuccess(`Product "${formName}" updated successfully!`);
      } else {
        const payload: CreateProductPayload = {
          sku: formSku.trim(),
          name: formName.trim(),
          productType: formType,
          categoryId: formCategoryId ? Number(formCategoryId) : undefined,
          brandId: formBrandId ? Number(formBrandId) : undefined,
          costPrice: costNum,
          srp: srpNum,
          taxClassId: formTaxClassId ? Number(formTaxClassId) : undefined,
          minStockAlert: Number(formMinStockAlert) || 0,
          isActive: formIsActive,
        };
        await createProduct(payload);
        setSuccess(`Product "${formName}" created successfully!`);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Toggle active status directly
  const handleToggleStatus = async (p: Product) => {
    try {
      await updateProduct(p.id, { isActive: !p.isActive });
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, isActive: !item.isActive } : item)),
      );
      setSuccess(`Product "${p.name}" set to ${!p.isActive ? "Active" : "Inactive"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product status");
    }
  };

  // Delete product
  const handleDeleteProduct = async (p: Product) => {
    if (!confirm(`Are you sure you want to delete product "${p.name}" (${p.sku})?`)) {
      return;
    }
    try {
      await deleteProduct(p.id);
      setProducts((prev) => prev.filter((item) => item.id !== p.id));
      setSuccess(`Product "${p.name}" deleted successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    }
  };

  // Quick Add Category
  const handleQuickAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setCategorySubmitting(true);
    setCategoryError("");
    try {
      const res = await createCategory(newCategoryName.trim());
      const newCat = res.data;
      setCategories((prev) => {
        if (prev.some((c) => c.id === newCat.id)) return prev;
        return [...prev, newCat];
      });
      setFormCategoryId(String(newCat.id));
      setShowAddCategoryModal(false);
      setNewCategoryName("");
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "Failed to add category");
    } finally {
      setCategorySubmitting(false);
    }
  };

  // Quick Add Brand
  const handleQuickAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    setBrandSubmitting(true);
    setBrandError("");
    try {
      const res = await createBrand(newBrandName.trim());
      const newB = res.data;
      setBrands((prev) => {
        if (prev.some((b) => b.id === newB.id)) return prev;
        return [...prev, newB];
      });
      setFormBrandId(String(newB.id));
      setShowAddBrandModal(false);
      setNewBrandName("");
    } catch (err) {
      setBrandError(err instanceof Error ? err.message : "Failed to add brand");
    } finally {
      setBrandSubmitting(false);
    }
  };

  // Computed filtered list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchName = p.name.toLowerCase().includes(q);
        const matchBrand = p.brand?.name.toLowerCase().includes(q);
        const matchCat = p.category?.name.toLowerCase().includes(q);
        if (!matchSku && !matchName && !matchBrand && !matchCat) return false;
      }
      if (categoryFilter && String(p.categoryId) !== categoryFilter) return false;
      if (brandFilter && String(p.brandId) !== brandFilter) return false;
      if (typeFilter && p.productType !== typeFilter) return false;
      if (statusFilter !== "") {
        const isActive = statusFilter === "true";
        if (p.isActive !== isActive) return false;
      }
      return true;
    });
  }, [products, searchQuery, categoryFilter, brandFilter, typeFilter, statusFilter]);

  // Real-time Margin Calculation in Form
  const formCostNum = parseFloat(formCostPrice) || 0;
  const formSrpNum = parseFloat(formSrp) || 0;
  const formProfit = formSrpNum - formCostNum;
  const formMarginPercent = formCostNum > 0 ? ((formProfit / formCostNum) * 100).toFixed(1) : "0.0";

  // Summary Metrics
  const serializedCount = products.filter((p) => p.productType === "SERIALIZED").length;
  const accessoryCount = products.filter((p) => p.productType === "NON_SERIALIZED").length;
  const activeCount = products.filter((p) => p.isActive).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Products & Catalog
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {products.length} Items
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Master catalog management, serialized IMEI flags, margins, and category taxonomy.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Product
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white p-4 border border-gray-200 shadow-2xs">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Products</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{products.length}</div>
        </div>
        <div className="rounded-xl bg-white p-4 border border-gray-200 shadow-2xs">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Serialized Devices</div>
          <div className="text-2xl font-bold text-purple-700 mt-1">{serializedCount}</div>
        </div>
        <div className="rounded-xl bg-white p-4 border border-gray-200 shadow-2xs">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Accessories / General</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{accessoryCount}</div>
        </div>
        <div className="rounded-xl bg-white p-4 border border-gray-200 shadow-2xs">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active in Store</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{activeCount}</div>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-600 hover:text-emerald-800 font-bold">
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Search & Multi-Filters Toolbar */}
      <div className="rounded-xl bg-white p-4 border border-gray-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by SKU, product name, brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-gray-300 bg-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Filter */}
          <div>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-gray-300 bg-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-gray-300 bg-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Product Types</option>
              {PRODUCT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Badges & Reset */}
        {(searchQuery || categoryFilter || brandFilter || typeFilter || statusFilter) && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-500">
              Showing <strong>{filteredProducts.length}</strong> of {products.length} products
            </span>
            <button
              onClick={() => {
                setSearchQuery("");
                setCategoryFilter("");
                setBrandFilter("");
                setTypeFilter("");
                setStatusFilter("");
              }}
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/75 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3.5">SKU & Identification</th>
                <th className="px-4 py-3.5">Product Name</th>
                <th className="px-4 py-3.5">Category & Brand</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5 text-right">Cost Price</th>
                <th className="px-4 py-3.5 text-right">SRP</th>
                <th className="px-4 py-3.5 text-center">Margin</th>
                <th className="px-4 py-3.5 text-center">Min Stock</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading master catalog...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                    No products found matching your filters.
                  </td>
                </tr>
              )}
              {filteredProducts.map((p) => {
                const cost = parseFloat(p.costPrice) || 0;
                const srp = parseFloat(p.srp) || 0;
                const profit = srp - cost;
                const margin = cost > 0 ? ((profit / cost) * 100).toFixed(0) : "0";

                const typeInfo = PRODUCT_TYPES.find((t) => t.value === p.productType) ?? {
                  badge: "bg-gray-100 text-gray-700 border-gray-200",
                  label: p.productType,
                };

                return (
                  <tr key={p.id} className="hover:bg-gray-50/75 transition-colors">
                    {/* SKU */}
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-gray-900 text-xs">
                        {p.sku}
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-gray-900 text-sm">{p.name}</div>
                    </td>

                    {/* Category & Brand */}
                    <td className="px-4 py-3.5 text-xs text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-900">
                          {p.brand?.name || "—"}
                        </span>
                        {p.category && (
                          <span className="text-gray-400">/</span>
                        )}
                        <span className="text-gray-500">
                          {p.category?.name || ""}
                        </span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${typeInfo.badge}`}>
                        {p.productType === "SERIALIZED" && "📱 "}
                        {p.productType === "NON_SERIALIZED" && "📦 "}
                        {p.productType === "SERVICE" && "🛠️ "}
                        {p.productType.replace(/_/g, " ")}
                      </span>
                    </td>

                    {/* Cost Price */}
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-gray-600">
                      IDR {cost.toLocaleString()}
                    </td>

                    {/* SRP */}
                    <td className="px-4 py-3.5 text-right font-mono text-xs font-bold text-gray-900">
                      IDR {srp.toLocaleString()}
                    </td>

                    {/* Margin */}
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold font-mono ${
                          profit >= 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {profit >= 0 ? `+${margin}%` : `${margin}%`}
                      </span>
                    </td>

                    {/* Min Stock */}
                    <td className="px-4 py-3.5 text-center text-xs font-mono text-gray-600">
                      {p.minStockAlert}
                    </td>

                    {/* Status Toggle */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(p)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                          p.isActive
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="rounded-lg p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit Product"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p)}
                          className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Product"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {editingProduct ? "Edit Product" : "Create New Product"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingProduct
                    ? `Update SKU #${editingProduct.sku}`
                    : "Add a new product to master inventory & POS catalog"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {modalError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-200">
                {modalError}
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSubmitProduct} className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Row 1: SKU & Generate Button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700 uppercase">
                      SKU Code <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateSku}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      🎲 Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TEL-IP15-128"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono font-bold focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Product Type Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Product Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none"
                  >
                    {PRODUCT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Product Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Product Name / Model Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. iPhone 15 128GB Black or 20W USB-C Adapter"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Row 3: Category & Brand with Quick Add Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700 uppercase">
                      Category
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryModal(true)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      + Add
                    </button>
                  </div>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">None / Unassigned</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700 uppercase">
                      Brand / Manufacturer
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddBrandModal(true)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      + Add
                    </button>
                  </div>
                  <select
                    value={formBrandId}
                    onChange={(e) => setFormBrandId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">None / Unassigned</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing & Real-time Margin Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Pricing & Profit Margins (IDR)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                      Cost Price (IDR) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step="1000"
                      placeholder="0"
                      value={formCostPrice}
                      onChange={(e) => setFormCostPrice(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-right font-semibold bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                      SRP (Suggested Retail Price) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step="1000"
                      placeholder="0"
                      value={formSrp}
                      onChange={(e) => setFormSrp(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-right font-bold text-blue-700 bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Live Profit Calculation Banner */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                  <span className="text-gray-600">
                    Calculated Profit:{" "}
                    <strong className={formProfit >= 0 ? "text-emerald-700 font-mono" : "text-rose-700 font-mono"}>
                      IDR {formProfit.toLocaleString()}
                    </strong>
                  </span>
                  <span className="text-gray-600">
                    Gross Margin:{" "}
                    <strong className={formProfit >= 0 ? "text-emerald-700 font-mono" : "text-rose-700 font-mono"}>
                      {formProfit >= 0 ? `+${formMarginPercent}%` : `${formMarginPercent}%`}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Tax Class, Min Stock Alert, and Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Tax Class
                  </label>
                  <select
                    value={formTaxClassId}
                    onChange={(e) => setFormTaxClassId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Standard (Default)</option>
                    {taxClasses.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({parseFloat(t.ratePercent)}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Min. Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formMinStockAlert}
                    onChange={(e) => setFormMinStockAlert(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-center font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span className="text-xs font-semibold text-gray-800">
                      Active for POS & Sales
                    </span>
                  </label>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {modalSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingProduct ? "Save Changes" : "Create Product"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-gray-200">
            <h4 className="text-sm font-bold text-gray-900 mb-1">Add New Category</h4>
            <p className="text-xs text-gray-500 mb-3">Create a category (e.g. Smartphones - New, Smartphones - Second, Accessories).</p>
            {categoryError && (
              <div className="mb-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">
                {categoryError}
              </div>
            )}
            <form onSubmit={handleQuickAddCategory} className="space-y-3">
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Smartphones - Second"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCategoryModal(false);
                    setCategoryError("");
                  }}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={categorySubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {categorySubmitting ? "Adding..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Brand Modal */}
      {showAddBrandModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-gray-200">
            <h4 className="text-sm font-bold text-gray-900 mb-1">Add New Brand</h4>
            <p className="text-xs text-gray-500 mb-3">Create a new brand or manufacturer.</p>
            {brandError && (
              <div className="mb-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">
                {brandError}
              </div>
            )}
            <form onSubmit={handleQuickAddBrand} className="space-y-3">
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Apple, Samsung, Anker, Xiaomi"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBrandModal(false);
                    setBrandError("");
                  }}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={brandSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {brandSubmitting ? "Adding..." : "Save Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}