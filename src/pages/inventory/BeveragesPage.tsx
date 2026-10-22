import React, { useState, useMemo } from 'react';
import {
  Wine,
  Plus,
  AlertTriangle,
  PackageX,
  DollarSign,
  Edit3,
  Trash2,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { KpiCard } from '../../components/ui/KpiCard';
import {
  PageHeader,
  TableToolbar,
  SearchInput,
  SelectFilter,
  PrimaryButton,
  EmptyState,
} from '../../components/ui/PageControls';
import { Modal } from '../../components/ui/Overlay';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { BeverageItem } from '../../types/hotel';
import {
  formatCurrency,
  getInventoryHealthStatus,
} from '../../utils/formatters';

type BeverageUnit = BeverageItem['unit'];

const BEVERAGE_UNITS: BeverageUnit[] = [
  'Bottle',
  'Can',
  'Pack',
  'Glass',
  'Crate',
];

export const BeveragesPage: React.FC = () => {
  const {
    beverages,
    selectedBranchId,
    settings,
    createBeverage,
    updateBeverage,
    deleteBeverage,
    recordStockOperation,
  } = useHotel();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priceSort, setPriceSort] = useState<'NONE' | 'ASC' | 'DESC'>('NONE');

  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BeverageItem | null>(null);

  // Add/Edit Form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState<BeverageUnit>('Bottle');
  const [availableQuantity, setAvailableQuantity] = useState<number>(24);
  const [reorderThreshold, setReorderThreshold] = useState<number>(10);
  const [sellingPrice, setSellingPrice] = useState<number>(5000);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');

  const branchBeverages = useMemo(
    () =>
      beverages.filter(
        (b) => selectedBranchId === 'ALL' || b.branchId === selectedBranchId
      ),
    [beverages, selectedBranchId]
  );

  // Generate unique SKU
  const generateUniqueSku = () => {
    const existingSkus = new Set(beverages.map((b) => b.sku.toUpperCase()));
    let counter = beverages.length + 101;
    let candidate = `BEV-${counter}`;
    while (existingSkus.has(candidate)) {
      counter += 1;
      candidate = `BEV-${counter}`;
    }
    return candidate;
  };

  // 4 KPIs
  const totalItems = branchBeverages.length;
  const totalStockValue = branchBeverages.reduce(
    (s, b) => s + b.availableQuantity * b.sellingPrice,
    0
  );
  const lowStockCount = branchBeverages.filter(
    (b) =>
      getInventoryHealthStatus(b.availableQuantity, b.reorderThreshold) ===
      'Low Stock'
  ).length;
  const outOfStockCount = branchBeverages.filter(
    (b) =>
      getInventoryHealthStatus(b.availableQuantity, b.reorderThreshold) ===
      'Out of Stock'
  ).length;

  const filteredBeverages = useMemo(() => {
    const list = branchBeverages.filter((b) => {
      const health = getInventoryHealthStatus(
        b.availableQuantity,
        b.reorderThreshold
      );
      if (statusFilter !== 'ALL' && health !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !b.name.toLowerCase().includes(q) &&
          !b.sku.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });

    if (priceSort === 'ASC') {
      return [...list].sort((a, b) => a.sellingPrice - b.sellingPrice);
    }
    if (priceSort === 'DESC') {
      return [...list].sort((a, b) => b.sellingPrice - a.sellingPrice);
    }
    return list;
  }, [branchBeverages, statusFilter, search, priceSort]);

  const openNewModal = () => {
    setEditingItem(null);
    setName('');
    setSku(generateUniqueSku());
    setUnit('Bottle');
    setAvailableQuantity(24);
    setReorderThreshold(10);
    setSellingPrice(5000);
    setAdjustmentReason('');
    setShowItemModal(true);
  };

  const openEditModal = (item: BeverageItem) => {
    setEditingItem(item);
    setName(item.name);
    setSku(item.sku);
    setUnit(item.unit);
    setAvailableQuantity(item.availableQuantity);
    setReorderThreshold(item.reorderThreshold);
    setSellingPrice(item.sellingPrice);
    setAdjustmentReason('');
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

      updateBeverage(editingItem.id, {
        name: name.trim(),
        unit,
        reorderThreshold: Math.max(0, Number(reorderThreshold) || 0),
        sellingPrice: Math.max(0, Number(sellingPrice) || 0),
      });

      if (diff !== 0) {
        recordStockOperation({
          inventoryModule: 'Beverages',
          itemId: editingItem.id,
          movementType: diff > 0 ? 'Stock received' : 'Adjustment',
          direction: diff > 0 ? 'IN' : 'OUT',
          quantity: Math.abs(diff),
          sourceOrDestination: 'Beverage Inventory Edit',
          notes:
            adjustmentReason.trim() ||
            `Quantity adjusted from ${prevQty} to ${nextQty} ${unit}`,
        });
      }
    } else {
      createBeverage({
        name: name.trim(),
        sku: sku.trim() || generateUniqueSku(),
        category: 'Beverages',
        unit,
        availableQuantity: Math.max(0, Number(availableQuantity) || 0),
        reorderThreshold: Math.max(0, Number(reorderThreshold) || 0),
        purchaseCost: Math.round(sellingPrice * 0.6),
        sellingPrice: Math.max(0, Number(sellingPrice) || 0),
        supplier: 'Hotel Beverage Store',
        storageLocation: 'Main Bar Cellar',
        branchId: activeBranch,
      });
    }
    setShowItemModal(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Beverage Inventory"
        actions={
          <PrimaryButton onClick={openNewModal}>
            <Plus className="w-4 h-4" />
            Add Beverage Item
          </PrimaryButton>
        }
      />

      {/* 4 KPI Cards — Overview height standard, no supporting text */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Items"
          value={totalItems}
          icon={Wine}
          tone="blue"
        />
        <KpiCard
          label="Total Stock Value"
          value={formatCurrency(totalStockValue, settings.currencySymbol)}
          icon={DollarSign}
          tone="emerald"
        />
        <KpiCard
          label="Low Stock Items"
          value={lowStockCount}
          icon={AlertTriangle}
          tone="amber"
        />
        <KpiCard
          label="Out of Stock Items"
          value={outOfStockCount}
          icon={PackageX}
          tone="red"
        />
      </div>

      {/* Beverages Table */}
      <div className="bg-[#F0F0F0] p-1 rounded-[20px]">
        <div className="bg-white rounded-[17px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <TableToolbar
            left={
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search beverage name or SKU..."
              />
            }
            right={
              <>
                <SelectFilter
                  label="Stock Status"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 'ALL', label: 'All Stock Status' },
                    { value: 'In Stock', label: 'In Stock' },
                    { value: 'Low Stock', label: 'Low Stock' },
                    { value: 'Out of Stock', label: 'Out of Stock' },
                  ]}
                />
                <SelectFilter
                  label="Sort Price"
                  value={priceSort}
                  onChange={(v) => setPriceSort(v as 'NONE' | 'ASC' | 'DESC')}
                  options={[
                    { value: 'NONE', label: 'Sort by Selling Price' },
                    { value: 'ASC', label: 'Selling Price: Lowest to Highest' },
                    {
                      value: 'DESC',
                      label: 'Selling Price: Highest to Lowest',
                    },
                  ]}
                />
              </>
            }
          />

          {filteredBeverages.length === 0 ? (
            <EmptyState
              icon={Wine}
              title="No beverage items match your filter"
              description="Try clearing your search or add a new beverage SKU."
              action={
                <PrimaryButton onClick={openNewModal}>
                  <Plus className="w-4 h-4" />
                  Add Beverage Item
                </PrimaryButton>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EFEFEF] bg-[#FAFAFA]">
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      SKU
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      Beverage Name
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      Unit
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      Quantity in Stock
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] text-right">
                      Selling Price
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      Stock Status
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6] text-[13px]">
                  {filteredBeverages.map((bev) => {
                    const status = getInventoryHealthStatus(
                      bev.availableQuantity,
                      bev.reorderThreshold
                    );
                    return (
                      <tr
                        key={bev.id}
                        className="hover:bg-[#FAFAFA] transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono text-[12px] font-semibold text-[#6B7280]">
                          {bev.sku}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#111111]">
                          {bev.name}
                        </td>
                        <td className="py-3.5 px-4 text-[#374151]">
                          {bev.unit}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-[#111111] tabular-nums">
                            {bev.availableQuantity}
                          </span>
                          <span className="text-[11px] text-[#6B7280] ml-1.5">
                            (Low at {bev.reorderThreshold})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-[#111111] tabular-nums">
                          {formatCurrency(
                            bev.sellingPrice,
                            settings.currencySymbol
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={status} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(bev)}
                              title="Edit Beverage"
                              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111111] hover:bg-[#F3F4F6]"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteBeverage(bev.id)}
                              title="Delete Beverage"
                              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEF2F2]"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Beverage Item Modal */}
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title={editingItem ? 'Edit Beverage Item' : 'Add Beverage Item'}
        size="md"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                Beverage Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hennessy VSOP (70cl)"
                className="w-full px-3.5 py-2 border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                SKU (Auto)
              </label>
              <input
                type="text"
                readOnly
                value={sku}
                className="w-full px-3.5 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px] text-[13px] font-mono text-[#6B7280]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as BeverageUnit)}
                className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
              >
                {BEVERAGE_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                Selling Price (₦)
              </label>
              <input
                type="number"
                min={0}
                step={100}
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                {editingItem ? 'Quantity in Stock' : 'Initial Quantity'}
              </label>
              <input
                type="number"
                min={0}
                required
                value={availableQuantity}
                onChange={(e) => setAvailableQuantity(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                Low Stock Level
              </label>
              <input
                type="number"
                min={0}
                required
                value={reorderThreshold}
                onChange={(e) => setReorderThreshold(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
              />
            </div>
          </div>

          {editingItem &&
            availableQuantity !== editingItem.availableQuantity && (
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                  Stock Adjustment Note
                </label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Reason for stock quantity change..."
                  className="w-full px-3.5 py-2 border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                />
              </div>
            )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EFEFEF]">
            <button
              type="button"
              onClick={() => setShowItemModal(false)}
              className="px-4 py-2 rounded-[10px] text-[13px] font-medium text-[#374151] hover:bg-[#F3F4F6]"
            >
              Cancel
            </button>
            <PrimaryButton type="submit">
              {editingItem ? 'Save Changes' : 'Add Beverage Item'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};
