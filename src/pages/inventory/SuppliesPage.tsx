import React, { useState, useMemo } from 'react';
import {
  PackageCheck,
  Plus,
  Layers,
  AlertTriangle,
  Edit3,
  Trash2,
  FolderCog,
  Building2,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { KpiCard } from '../../components/ui/KpiCard';
import { Dropdown } from '../../components/ui/Dropdown';
import {
  PageHeader,
  SearchInput,
  PrimaryButton,
  SecondaryButton,
  EmptyState,
} from '../../components/ui/PageControls';
import { Modal, ConfirmDialog } from '../../components/ui/Overlay';
import { SupplyItem } from '../../types/hotel';
import { getInventoryHealthStatus } from '../../utils/formatters';

const DEFAULT_CATEGORIES = [
  'Rooms',
  'Bar',
  'Kitchen',
  'Laundry',
  'Cleaning',
  'Maintenance',
];

const MEASUREMENT_UNITS = [
  'Pieces',
  'Sets',
  'Packs',
  'Rolls',
  'Litres',
  'Kg',
  'Cartons',
  'Bottles',
];

export const SuppliesPage: React.FC = () => {
  const {
    supplies,
    selectedBranchId,
    settings,
    createSupplyItem,
    updateSupplyItem,
    deleteSupplyItem,
    recordStockOperation,
    saveSupplyCategories,
    notify,
    canManageInventory,
    hasPermission,
  } = useHotel();

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplyItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplyItem | null>(null);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);

  // Add/Edit Item Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<string>('Rooms');
  const [unit, setUnit] = useState('Pieces');
  const [availableQuantity, setAvailableQuantity] = useState<number>(50);
  const [reorderLevel, setReorderLevel] = useState<number>(15);
  const [itemNotes, setItemNotes] = useState('');

  // Manage Categories Modal State
  const [editableCategories, setEditableCategories] = useState<
    Array<{ originalName?: string; name: string }>
  >([]);
  const [newCategoryName, setNewCategoryName] = useState('');

  const availableCategories = useMemo(() => {
    const configured =
      settings.supplyCategories && settings.supplyCategories.length > 0
        ? settings.supplyCategories
        : DEFAULT_CATEGORIES;
    const fromItems = supplies.map((s) => s.category);
    return Array.from(new Set([...configured, ...fromItems]));
  }, [settings.supplyCategories, supplies]);

  const branchSupplies = useMemo(
    () =>
      supplies.filter(
        (s) => selectedBranchId === 'ALL' || s.branchId === selectedBranchId
      ),
    [supplies, selectedBranchId]
  );

  // Generate unique SKU
  const generateUniqueSku = () => {
    const existingSkus = new Set(supplies.map((s) => s.sku.toUpperCase()));
    let counter = supplies.length + 101;
    let candidate = `STK-${counter}`;
    while (existingSkus.has(candidate)) {
      counter += 1;
      candidate = `STK-${counter}`;
    }
    return candidate;
  };

  // 4 KPI Cards
  const totalItems = branchSupplies.length;
  const totalUnitsInStock = branchSupplies.reduce(
    (s, i) => s + i.availableQuantity,
    0
  );
  const lowStockCount = branchSupplies.filter(
    (s) =>
      getInventoryHealthStatus(s.availableQuantity, s.reorderLevel) !==
      'In Stock'
  ).length;
  const activeDepartmentsCount = new Set(branchSupplies.map((s) => s.category))
    .size;

  const filteredSupplies = useMemo(() => {
    return branchSupplies.filter((s) => {
      if (categoryFilter !== 'ALL' && s.category !== categoryFilter)
        return false;
      const health = getInventoryHealthStatus(
        s.availableQuantity,
        s.reorderLevel
      );
      if (statusFilter !== 'ALL' && health !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !s.name.toLowerCase().includes(q) &&
          !s.sku.toLowerCase().includes(q) &&
          !s.category.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [branchSupplies, categoryFilter, statusFilter, search]);

  const openNewItemModal = () => {
    setEditingItem(null);
    setName('');
    setSku(generateUniqueSku());
    setCategory(
      categoryFilter !== 'ALL'
        ? categoryFilter
        : availableCategories[0] || 'Rooms'
    );
    setUnit('Pieces');
    setAvailableQuantity(50);
    setReorderLevel(15);
    setItemNotes('');
    setShowItemModal(true);
  };

  const openEditItemModal = (item: SupplyItem) => {
    setEditingItem(item);
    setName(item.name);
    setSku(item.sku);
    setCategory(item.category);
    setUnit(item.unit);
    setAvailableQuantity(item.availableQuantity);
    setReorderLevel(item.reorderLevel);
    setItemNotes(item.notes || '');
    setShowItemModal(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const activeBranch =
      selectedBranchId === 'ALL' ? 'BR-01' : selectedBranchId;

    if (editingItem) {
      const prevQty = editingItem.availableQuantity;
      const nextQty = Math.max(0, Number(availableQuantity) || 0);
      const diff = nextQty - prevQty;

      updateSupplyItem(editingItem.id, {
        name: name.trim(),
        category,
        unit,
        reorderLevel: Math.max(0, Number(reorderLevel) || 0),
        notes: itemNotes.trim(),
      });

      if (diff !== 0) {
        recordStockOperation({
          inventoryModule: 'Supplies',
          itemId: editingItem.id,
          movementType: diff > 0 ? 'Stock received' : 'Adjustment',
          direction: diff > 0 ? 'IN' : 'OUT',
          quantity: Math.abs(diff),
          sourceOrDestination: category,
          notes:
            itemNotes.trim() ||
            `Quantity updated from ${prevQty} to ${nextQty} ${unit}`,
        });
      }
    } else {
      createSupplyItem({
        name: name.trim(),
        sku: sku.trim() || generateUniqueSku(),
        category,
        unit,
        availableQuantity: Math.max(0, Number(availableQuantity) || 0),
        reorderLevel: Math.max(0, Number(reorderLevel) || 0),
        purchaseCost: 2500,
        supplier: 'Hotel Central Store',
        storageLocation: `${category} Store`,
        branchId: activeBranch,
        notes: itemNotes.trim(),
      });
    }
    setShowItemModal(false);
  };

  const openManageCategories = () => {
    setEditableCategories(
      availableCategories.map((c) => ({ originalName: c, name: c }))
    );
    setNewCategoryName('');
    setShowCategoriesModal(true);
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (
      editableCategories.some(
        (c) => c.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      notify('Duplicate Department', 'That department already exists.', 'error');
      return;
    }
    setEditableCategories((prev) => [...prev, { name: trimmed }]);
    setNewCategoryName('');
  };

  const handleSaveCategories = () => {
    const cleaned = editableCategories
      .map((c) => ({ ...c, name: c.name.trim() }))
      .filter((c) => c.name.length > 0);
    if (cleaned.length === 0) return;

    const finalNames = cleaned.map((c) => c.name);
    const renames: Record<string, string> = {};
    cleaned.forEach((c) => {
      if (c.originalName && c.originalName !== c.name) {
        renames[c.originalName] = c.name;
      }
    });

    saveSupplyCategories(finalNames, renames);
    setShowCategoriesModal(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store Keeper"
        actions={
          canManageInventory ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <SecondaryButton onClick={openManageCategories}>
                <FolderCog className="w-4 h-4" />
                Manage Departments
              </SecondaryButton>
              <PrimaryButton onClick={openNewItemModal}>
                <Plus className="w-4 h-4" />
                Add Store Item
              </PrimaryButton>
            </div>
          ) : undefined
        }
      />

      {/* 4 KPI Cards — Overview height standard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Store Items"
          value={totalItems}
          icon={PackageCheck}
          tone="blue"
        />
        <KpiCard
          label="Total Units in Stock"
          value={totalUnitsInStock.toLocaleString()}
          icon={Layers}
          tone="emerald"
        />
        <KpiCard
          label="Low / Out of Stock"
          value={lowStockCount}
          icon={AlertTriangle}
          tone="amber"
        />
        <KpiCard
          label="Departments"
          value={activeDepartmentsCount}
          icon={Building2}
          tone="purple"
        />
      </div>

      {/* Store Keeper Register */}
      <div className="bg-[#F0F0F0] p-1 rounded-[20px]">
        <div className="bg-white rounded-[17px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Toolbar with Search on left, Department & Stock Status custom dropdowns on right */}
          <div className="p-4 border-b border-[#EFEFEA] flex flex-wrap items-center justify-between gap-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search item name, SKU, or department..."
              className="w-full sm:w-72"
            />

            <div className="flex flex-wrap items-center gap-2.5">
              <Dropdown
                value={categoryFilter}
                onChange={setCategoryFilter}
                size="sm"
                className="w-48"
                options={[
                  { value: 'ALL', label: 'All Departments' },
                  ...availableCategories.map((c) => ({ value: c, label: c })),
                ]}
              />

              <Dropdown
                value={statusFilter}
                onChange={setStatusFilter}
                size="sm"
                className="w-44"
                options={[
                  { value: 'ALL', label: 'All Stock Status' },
                  { value: 'In Stock', label: 'In Stock' },
                  { value: 'Low Stock', label: 'Low Stock' },
                  { value: 'Out of Stock', label: 'Out of Stock' },
                ]}
              />
            </div>
          </div>

          {filteredSupplies.length === 0 ? (
            <EmptyState
              icon={PackageCheck}
              title="No store items match your filter"
              description="Try clearing your department or stock status filter, or add a new store item."
              action={
                <PrimaryButton onClick={openNewItemModal}>
                  <Plus className="w-4 h-4" />
                  Add Store Item
                </PrimaryButton>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EFEFEF] bg-[#FAFAFA] whitespace-nowrap">
                    <th className="py-3.5 px-5 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                      SKU
                    </th>
                    <th className="py-3.5 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                      Item Name
                    </th>
                    <th className="py-3.5 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                      Department
                    </th>
                    <th className="py-3.5 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                      Unit
                    </th>
                    <th className="py-3.5 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                      Quantity
                    </th>
                    <th className="py-3.5 px-5 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] text-right whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6] text-[13px]">
                  {filteredSupplies.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[#FAFAFA] transition-colors whitespace-nowrap"
                    >
                      <td className="py-3.5 px-5 font-mono text-[12px] font-normal text-[#6B7280] whitespace-nowrap">
                        {item.sku}
                      </td>
                      <td className="py-3.5 px-4 font-normal text-[#1E1E1E] whitespace-nowrap">
                        {item.name}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-[6px] bg-[#F1EEF8] text-[#7463A6] text-[11.5px] font-medium">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-normal text-[#374151] whitespace-nowrap">
                        {item.unit}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-normal text-[#1E1E1E] tabular-nums">
                          {item.availableQuantity}
                        </span>
                        <span className="text-[11px] font-normal text-[#6B7280] ml-1.5">
                          (Min {item.reorderLevel})
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        {canManageInventory && (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditItemModal(item)}
                              title="Edit Item"
                              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111111] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {hasPermission('Delete') && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(item)}
                                title="Delete Item"
                                className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Store Item Modal */}
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title={editingItem ? 'Edit Store Item' : 'Add Store Item'}
        size="lg"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          {/* Row 1: Item Name | Department | Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
                Item Name <span className="text-[#B93829]">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Egyptian Cotton Bath Towels"
                className="w-full px-3 py-2 border border-[#E2E2DC] rounded-[10px] text-[13px] font-normal text-[#1E1E1E] focus:outline-none focus:border-[#7463A6]"
              />
            </div>

            <div>
              <Dropdown
                label="Department"
                value={category}
                onChange={setCategory}
                options={availableCategories.map((c) => ({
                  value: c,
                  label: c,
                }))}
              />
            </div>

            <div>
              <Dropdown
                label="Unit"
                value={unit}
                onChange={setUnit}
                options={MEASUREMENT_UNITS.map((u) => ({
                  value: u,
                  label: u,
                }))}
              />
            </div>
          </div>

          {/* Row 2: SKU (Auto) | Quantity | Minimum Reorder Level */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
                SKU (Auto)
              </label>
              <input
                type="text"
                readOnly
                value={sku}
                className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#E2E2DC] rounded-[10px] text-[13px] font-mono text-[#6E6E6A]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
                Quantity
              </label>
              <input
                type="number"
                min={0}
                required
                value={availableQuantity}
                onChange={(e) => setAvailableQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#E2E2DC] rounded-[10px] text-[13px] font-normal text-[#1E1E1E] tabular-nums focus:outline-none focus:border-[#7463A6]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
                Low Stock Level
              </label>
              <input
                type="number"
                min={0}
                required
                value={reorderLevel}
                onChange={(e) => setReorderLevel(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#E2E2DC] rounded-[10px] text-[13px] font-normal text-[#1E1E1E] tabular-nums focus:outline-none focus:border-[#7463A6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              placeholder="Storage location or handling note..."
              className="w-full px-3 py-2 border border-[#E2E2DC] rounded-[10px] text-[13px] font-normal text-[#1E1E1E] focus:outline-none focus:border-[#7463A6]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EFEFEF]">
            <button
              type="button"
              onClick={() => setShowItemModal(false)}
              className="px-4 py-2 rounded-[10px] text-[13px] font-medium text-[#374151] hover:bg-[#F3F4F6] cursor-pointer"
            >
              Cancel
            </button>
            <PrimaryButton type="submit">
              {editingItem ? 'Save Changes' : 'Add Store Item'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Manage Departments Modal */}
      <Modal
        isOpen={showCategoriesModal}
        onClose={() => setShowCategoriesModal(false)}
        title="Manage Store Departments"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New department name..."
              className="flex-1 px-3 py-2 border border-[#E2E2DC] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
            />
            <PrimaryButton type="button" onClick={handleAddCategory}>
              <Plus className="w-4 h-4" />
              Add
            </PrimaryButton>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-[#F2F2EE] border border-[#EFEFEA] rounded-[12px]">
            {editableCategories.map((cat, idx) => (
              <div
                key={idx}
                className="p-2.5 flex items-center justify-between gap-2 bg-white"
              >
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditableCategories((prev) =>
                      prev.map((c, i) => (i === idx ? { ...c, name: val } : c))
                    );
                  }}
                  className="flex-1 px-2.5 py-1.5 border border-[#E2E2DC] rounded-[8px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                />
                {editableCategories.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setEditableCategories((prev) =>
                        prev.filter((_, i) => i !== idx)
                      )
                    }
                    className="p-1.5 rounded-lg text-[#8E8E88] hover:text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#EFEFEA]">
            <SecondaryButton onClick={() => setShowCategoriesModal(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton onClick={handleSaveCategories}>
              Save Departments
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteSupplyItem(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        title="Delete Store Item"
        description={
          deleteTarget
            ? `Are you sure you want to remove "${deleteTarget.name}" (${deleteTarget.sku}) from Store Keeper?`
            : ''
        }
        confirmLabel="Delete Item"
        destructive
      />
    </div>
  );
};
