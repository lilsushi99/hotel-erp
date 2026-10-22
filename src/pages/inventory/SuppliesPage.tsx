import React, { useState, useMemo } from 'react';
import {
  PackageCheck,
  Plus,
  Layers,
  AlertTriangle,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardCheck,
  Edit3,
  Trash2,
  FolderCog,
  Check,
  X,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { KpiCard } from '../../components/ui/KpiCard';
import {
  PageHeader,
  TableToolbar,
  SearchInput,
  SelectFilter,
  StatusTabs,
  PrimaryButton,
  SecondaryButton,
  EmptyState,
} from '../../components/ui/PageControls';
import { Modal } from '../../components/ui/Overlay';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SupplyItem, StockMovementType } from '../../types/hotel';
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
    stockMovements,
    staff,
    selectedBranchId,
    settings,
    createSupplyItem,
    updateSupplyItem,
    deleteSupplyItem,
    recordStockOperation,
    saveSupplyCategories,
    notify,
  } = useHotel();

  const [viewTab, setViewTab] = useState<'REGISTER' | 'HISTORY'>('REGISTER');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // History filters
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('ALL');
  const [historySearch, setHistorySearch] = useState('');

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplyItem | null>(null);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);

  // Stock Receive / Issue / Physical Count Modal
  const [stockActionModal, setStockActionModal] = useState<{
    item: SupplyItem;
    mode: 'IN' | 'OUT' | 'COUNT';
  } | null>(null);
  const [opQuantity, setOpQuantity] = useState<number>(10);
  const [countedQuantity, setCountedQuantity] = useState<number>(0);
  const [opMovementType, setOpMovementType] =
    useState<StockMovementType>('Stock received');
  const [opSourceDest, setOpSourceDest] = useState('');
  const [opResponsibleStaff, setOpResponsibleStaff] = useState(
    'Adaeze Okafor-Vance'
  );
  const [opNotes, setOpNotes] = useState('');

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

  const branchMovements = useMemo(
    () =>
      stockMovements.filter(
        (m) => selectedBranchId === 'ALL' || m.branchId === selectedBranchId
      ),
    [stockMovements, selectedBranchId]
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
  const stockAdjustmentsCount = branchMovements.filter(
    (m) =>
      m.inventoryModule === 'Supplies' ||
      m.movementType === 'Adjustment' ||
      m.movementType === 'Physical Count'
  ).length;

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

  const filteredMovements = useMemo(() => {
    return branchMovements.filter((m) => {
      if (historyTypeFilter !== 'ALL' && m.movementType !== historyTypeFilter)
        return false;
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        if (
          !m.itemName.toLowerCase().includes(q) &&
          !m.id.toLowerCase().includes(q) &&
          !m.responsibleUser.toLowerCase().includes(q) &&
          !m.notes.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [branchMovements, historyTypeFilter, historySearch]);

  const openNewModal = () => {
    setEditingItem(null);
    setName('');
    setSku(generateUniqueSku());
    setCategory(availableCategories[0] || 'Rooms');
    setUnit('Pieces');
    setAvailableQuantity(50);
    setReorderLevel(15);
    setItemNotes('');
    setShowItemModal(true);
  };

  const openEditModal = (item: SupplyItem) => {
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
      updateSupplyItem(editingItem.id, {
        name: name.trim(),
        category,
        unit,
        availableQuantity: Math.max(0, Number(availableQuantity) || 0),
        reorderLevel: Math.max(0, Number(reorderLevel) || 0),
        notes: itemNotes.trim(),
      });
    } else {
      createSupplyItem({
        name: name.trim(),
        sku: sku.trim() || generateUniqueSku(),
        category,
        unit,
        availableQuantity: Math.max(0, Number(availableQuantity) || 0),
        reorderLevel: Math.max(0, Number(reorderLevel) || 0),
        purchaseCost: 0,
        supplier: 'Central Hotel Store',
        storageLocation: `${category} Store`,
        notes: itemNotes.trim(),
        branchId: activeBranch,
      });
    }
    setShowItemModal(false);
  };

  const openStockAction = (
    item: SupplyItem,
    mode: 'IN' | 'OUT' | 'COUNT'
  ) => {
    setStockActionModal({ item, mode });
    setOpQuantity(10);
    setCountedQuantity(item.availableQuantity);
    setOpMovementType(
      mode === 'IN'
        ? 'Stock received'
        : mode === 'OUT'
        ? 'Housekeeping usage'
        : 'Physical Count'
    );
    setOpSourceDest(
      mode === 'IN'
        ? 'Central Store Delivery'
        : mode === 'OUT'
        ? `${item.category} Department`
        : `${item.category} Physical Audit`
    );
    setOpResponsibleStaff(staff[0]?.name || 'Adaeze Okafor-Vance');
    setOpNotes('');
  };

  const handleStockOperationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockActionModal) return;
    const { item, mode } = stockActionModal;

    if (mode === 'COUNT') {
      const variance = countedQuantity - item.availableQuantity;
      if (variance === 0) {
        notify(
          'Count Verified',
          `${item.name} matches recorded quantity (${item.availableQuantity} ${item.unit}). No variance.`
        );
        setStockActionModal(null);
        return;
      }
      if (!opNotes.trim()) {
        notify(
          'Reason Required',
          'Please provide a reconciliation reason for the stock count variance.',
          'error'
        );
        return;
      }
      const res = recordStockOperation({
        inventoryModule: 'Supplies',
        itemId: item.id,
        movementType: 'Physical Count',
        direction: variance > 0 ? 'IN' : 'OUT',
        quantity: Math.abs(variance),
        sourceOrDestination: opSourceDest || `${item.category} Physical Count`,
        responsibleUser: opResponsibleStaff,
        notes: `Physical Count: Recorded ${item.availableQuantity} → Counted ${countedQuantity} (Variance ${
          variance > 0 ? `+${variance}` : variance
        }). Reason: ${opNotes.trim()}`,
      });
      if (!res.ok && res.error) {
        notify('Stock Count Error', res.error, 'error');
        return;
      }
      setStockActionModal(null);
      return;
    }

    const res = recordStockOperation({
      inventoryModule: 'Supplies',
      itemId: item.id,
      movementType: opMovementType,
      direction: mode,
      quantity: opQuantity,
      sourceOrDestination:
        opSourceDest || (mode === 'IN' ? 'Store Restock' : item.category),
      responsibleUser: opResponsibleStaff,
      notes:
        opNotes.trim() ||
        `${mode === 'IN' ? 'Received' : 'Issued'} ${opQuantity} ${item.unit}`,
    });
    if (!res.ok && res.error) {
      notify('Stock Error', res.error, 'error');
      return;
    }
    setStockActionModal(null);
  };

  const openManageCategories = () => {
    setEditableCategories(
      availableCategories.map((c) => ({ originalName: c, name: c }))
    );
    setNewCategoryName('');
    setShowCategoriesModal(true);
  };

  const handleAddCategoryRow = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (
      editableCategories.some(
        (c) => c.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      notify('Duplicate Category', 'That category already exists.', 'error');
      return;
    }
    setEditableCategories((prev) => [...prev, { name: trimmed }]);
    setNewCategoryName('');
  };

  const handleSaveCategories = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = editableCategories
      .map((c) => ({ ...c, name: c.name.trim() }))
      .filter((c) => c.name.length > 0);
    if (valid.length === 0) return;

    const renamedMap: Record<string, string> = {};
    valid.forEach((c) => {
      if (c.originalName && c.originalName !== c.name) {
        renamedMap[c.originalName] = c.name;
      }
    });

    saveSupplyCategories(
      valid.map((c) => c.name),
      renamedMap
    );
    setShowCategoriesModal(false);
  };

  const countVariance =
    stockActionModal?.mode === 'COUNT'
      ? countedQuantity - stockActionModal.item.availableQuantity
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Keeper"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <SecondaryButton onClick={openManageCategories}>
              <FolderCog className="w-4 h-4" />
              Manage Categories
            </SecondaryButton>
            <PrimaryButton onClick={openNewModal}>
              <Plus className="w-4 h-4" />
              Add Item
            </PrimaryButton>
          </div>
        }
      />

      {/* 4 KPI Cards — Overview height standard, no supporting text */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Stock Items"
          value={totalItems}
          icon={PackageCheck}
          tone="blue"
        />
        <KpiCard
          label="Total Units in Stock"
          value={totalUnitsInStock.toLocaleString()}
          icon={Layers}
          tone="purple"
        />
        <KpiCard
          label="Low Stock Items"
          value={lowStockCount}
          icon={AlertTriangle}
          tone="amber"
        />
        <KpiCard
          label="Stock Adjustments"
          value={stockAdjustmentsCount}
          icon={History}
          tone="emerald"
        />
      </div>

      {/* Main Container with Register vs Audit History Switch */}
      <div className="bg-[#F0F0F0] p-1 rounded-[20px]">
        <div className="bg-white rounded-[17px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-5 pt-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#F3F4F6] pb-3">
            <div className="inline-flex p-1 rounded-[12px] bg-[#F3F4F6]">
              <button
                type="button"
                onClick={() => setViewTab('REGISTER')}
                className={`px-3.5 py-1.5 rounded-[9px] text-[12px] font-semibold transition-all ${
                  viewTab === 'REGISTER'
                    ? 'bg-[#7463A6] text-white shadow-xs'
                    : 'text-[#6B7280] hover:text-[#111111]'
                }`}
              >
                Stock Register ({branchSupplies.length})
              </button>
              <button
                type="button"
                onClick={() => setViewTab('HISTORY')}
                className={`px-3.5 py-1.5 rounded-[9px] text-[12px] font-semibold transition-all ${
                  viewTab === 'HISTORY'
                    ? 'bg-[#7463A6] text-white shadow-xs'
                    : 'text-[#6B7280] hover:text-[#111111]'
                }`}
              >
                Stock Movement & Audit History ({branchMovements.length})
              </button>
            </div>
          </div>

          {viewTab === 'REGISTER' ? (
            <>
              <div className="px-5 pt-3">
                <StatusTabs
                  tabs={[
                    {
                      id: 'ALL',
                      label: 'All Departments',
                      count: branchSupplies.length,
                    },
                    ...availableCategories.map((cat) => ({
                      id: cat,
                      label: cat,
                      count: branchSupplies.filter((s) => s.category === cat)
                        .length,
                    })),
                  ]}
                  activeTab={categoryFilter}
                  onChange={setCategoryFilter}
                />
              </div>

              <TableToolbar
                left={
                  <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Search item name, SKU, or department..."
                  />
                }
                right={
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
                }
              />

              {filteredSupplies.length === 0 ? (
                <EmptyState
                  icon={PackageCheck}
                  title="No stock items match your filter"
                  description="Try switching department tabs or add a new item to Stock Keeper."
                  action={
                    <PrimaryButton onClick={openNewModal}>
                      <Plus className="w-4 h-4" />
                      Add Item
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
                          Item Name
                        </th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                          Department / Category
                        </th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                          Unit
                        </th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                          Recorded Quantity
                        </th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                          Status
                        </th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F6] text-[13px]">
                      {filteredSupplies.map((sup) => {
                        const status = getInventoryHealthStatus(
                          sup.availableQuantity,
                          sup.reorderLevel
                        );
                        return (
                          <tr
                            key={sup.id}
                            className="hover:bg-[#FAFAFA] transition-colors"
                          >
                            <td className="py-3.5 px-4 font-mono text-[12px] font-semibold text-[#6B7280]">
                              {sup.sku}
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-semibold text-[#111111]">
                                {sup.name}
                              </p>
                              {sup.notes && (
                                <p className="text-[11px] text-[#6B7280] truncate max-w-[220px]">
                                  {sup.notes}
                                </p>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded-md bg-[#F3F4F6] text-[#374151] text-[12px] font-medium">
                                {sup.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-[#374151]">
                              {sup.unit}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-[#111111] tabular-nums">
                                {sup.availableQuantity}
                              </span>
                              <span className="text-[11px] text-[#6B7280] ml-1.5">
                                (Min {sup.reorderLevel})
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <StatusBadge status={status} />
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => openStockAction(sup, 'IN')}
                                  title="Receive Stock (+IN)"
                                  className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[#ECFDF5] text-[#15803D] hover:bg-[#D1FAE5] inline-flex items-center gap-0.5"
                                >
                                  <ArrowDownLeft className="w-3 h-3" />
                                  Receive
                                </button>
                                <button
                                  onClick={() => openStockAction(sup, 'OUT')}
                                  title="Issue / Remove Stock (-OUT)"
                                  className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[#FFFBEB] text-[#B45309] hover:bg-[#FEF3C7] inline-flex items-center gap-0.5"
                                >
                                  <ArrowUpRight className="w-3 h-3" />
                                  Issue
                                </button>
                                <button
                                  onClick={() => openStockAction(sup, 'COUNT')}
                                  title="Physical Stock Count & Variance Reconciliation"
                                  className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[#F1EEF8] text-[#7463A6] hover:bg-[#7463A6] hover:text-white transition-colors inline-flex items-center gap-1"
                                >
                                  <ClipboardCheck className="w-3 h-3" />
                                  Count
                                </button>
                                <button
                                  onClick={() => openEditModal(sup)}
                                  title="Edit Item"
                                  className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111111] hover:bg-[#F3F4F6]"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteSupplyItem(sup.id)}
                                  title="Delete Item"
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
            </>
          ) : (
            <>
              <TableToolbar
                left={
                  <SearchInput
                    value={historySearch}
                    onChange={setHistorySearch}
                    placeholder="Search item, reference ID, staff, or reason..."
                  />
                }
                right={
                  <SelectFilter
                    label="Movement Type"
                    value={historyTypeFilter}
                    onChange={setHistoryTypeFilter}
                    options={[
                      { value: 'ALL', label: 'All Movement Types' },
                      { value: 'Stock received', label: 'Stock Received (+IN)' },
                      {
                        value: 'Housekeeping usage',
                        label: 'Department Issue (-OUT)',
                      },
                      {
                        value: 'Physical Count',
                        label: 'Physical Count Reconciliation',
                      },
                      { value: 'Adjustment', label: 'Adjustment' },
                      { value: 'Waste', label: 'Waste / Damage' },
                    ]}
                  />
                }
              />

              {filteredMovements.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="No stock movement records found"
                  description="Receive stock, issue items to a department, or perform a physical count to log movements."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#EFEFEF] bg-[#FAFAFA]">
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                          Ref & Date/Time
                        </th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                          Stock Item
                        </th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                          Movement Type
                        </th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                          Quantity Change
                        </th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                          Department / Source
                        </th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                          Staff
                        </th>
                        <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                          Reconciliation / Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F6] text-[13px]">
                      {filteredMovements.map((mov) => (
                        <tr
                          key={mov.id}
                          className="hover:bg-[#FAFAFA] transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <p className="font-mono font-semibold text-[#111111] text-[12px]">
                              {mov.id}
                            </p>
                            <p className="text-[11px] text-[#6B7280]">
                              {mov.dateTime}
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-[#111111]">
                              {mov.itemName}
                            </p>
                            <p className="text-[11px] text-[#6B7280]">
                              {mov.inventoryModule}
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusBadge status={mov.movementType} />
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 font-bold tabular-nums ${
                                mov.direction === 'IN'
                                  ? 'text-[#15803D]'
                                  : 'text-[#DC2626]'
                              }`}
                            >
                              {mov.direction === 'IN' ? '+' : '-'}
                              {mov.quantity} {mov.unit}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[#374151]">
                            {mov.sourceOrDestination}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-[#111111]">
                            {mov.responsibleUser}
                          </td>
                          <td className="py-3.5 px-4 text-[#6B7280] max-w-[260px]">
                            <p className="truncate" title={mov.notes}>
                              {mov.notes}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add / Edit Stock Item Modal */}
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title={editingItem ? 'Edit Stock Item' : 'Add Stock Item'}
        size="md"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                Item Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Egyptian Cotton Bath Towels"
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
                Category / Department
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                Unit of Measurement
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
              >
                {MEASUREMENT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                {editingItem ? 'Recorded Quantity' : 'Initial Quantity'}
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
                value={reorderLevel}
                onChange={(e) => setReorderLevel(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
              Notes / Description (Optional)
            </label>
            <input
              type="text"
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              placeholder="e.g. Standard specification or storage note..."
              className="w-full px-3.5 py-2 border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EFEFEF]">
            <button
              type="button"
              onClick={() => setShowItemModal(false)}
              className="px-4 py-2 rounded-[10px] text-[13px] font-medium text-[#374151] hover:bg-[#F3F4F6]"
            >
              Cancel
            </button>
            <PrimaryButton type="submit">
              {editingItem ? 'Save Changes' : 'Add Item'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Manage Categories Modal */}
      <Modal
        isOpen={showCategoriesModal}
        onClose={() => setShowCategoriesModal(false)}
        title="Manage Stock Keeper Categories"
        size="md"
      >
        <form onSubmit={handleSaveCategories} className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category or department name..."
              className="flex-1 px-3.5 py-2 border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
            />
            <button
              type="button"
              onClick={handleAddCategoryRow}
              className="px-3.5 py-2 rounded-[10px] text-[12px] font-semibold bg-[#F1EEF8] text-[#7463A6] hover:bg-[#7463A6] hover:text-white transition-colors inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-[#F3F4F6] border border-[#E5E7EB] rounded-[12px]">
            {editableCategories.map((cat, idx) => {
              const itemCount = supplies.filter(
                (s) => s.category === (cat.originalName || cat.name)
              ).length;
              return (
                <div
                  key={idx}
                  className="px-3.5 py-2.5 flex items-center justify-between gap-2 bg-white"
                >
                  <input
                    type="text"
                    required
                    value={cat.name}
                    onChange={(e) =>
                      setEditableCategories((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, name: e.target.value } : item
                        )
                      )
                    }
                    className="flex-1 px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-[13px] font-medium text-[#111111] focus:outline-none focus:border-[#7463A6]"
                  />
                  <span className="text-[11px] text-[#6B7280] shrink-0">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </span>
                  {itemCount === 0 && editableCategories.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditableCategories((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                      className="p-1 text-[#9CA3AF] hover:text-[#DC2626]"
                      title="Remove empty category"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EFEFEF]">
            <button
              type="button"
              onClick={() => setShowCategoriesModal(false)}
              className="px-4 py-2 rounded-[10px] text-[13px] font-medium text-[#374151] hover:bg-[#F3F4F6]"
            >
              Cancel
            </button>
            <PrimaryButton type="submit">
              <Check className="w-4 h-4" />
              Save Categories
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Stock Receive / Issue / Physical Count Modal */}
      <Modal
        isOpen={!!stockActionModal}
        onClose={() => setStockActionModal(null)}
        title={
          stockActionModal?.mode === 'IN'
            ? `Receive Stock — ${stockActionModal.item.name}`
            : stockActionModal?.mode === 'OUT'
            ? `Issue / Remove Stock — ${stockActionModal.item.name}`
            : `Physical Stock Count — ${stockActionModal?.item.name || ''}`
        }
        size="md"
      >
        {stockActionModal && (
          <form onSubmit={handleStockOperationSubmit} className="space-y-4">
            {stockActionModal.mode === 'COUNT' ? (
              <>
                <div className="grid grid-cols-3 gap-3 p-3.5 rounded-[12px] bg-[#FAFAFA] border border-[#E5E7EB] text-center">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      Recorded Qty
                    </p>
                    <p className="text-[18px] font-bold text-[#111111] tabular-nums mt-0.5">
                      {stockActionModal.item.availableQuantity}{' '}
                      <span className="text-[11px] font-normal text-[#6B7280]">
                        {stockActionModal.item.unit}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      Physical Count
                    </p>
                    <p className="text-[18px] font-bold text-[#7463A6] tabular-nums mt-0.5">
                      {countedQuantity}{' '}
                      <span className="text-[11px] font-normal text-[#6B7280]">
                        {stockActionModal.item.unit}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      Variance
                    </p>
                    <p
                      className={`text-[18px] font-bold tabular-nums mt-0.5 ${
                        countVariance === 0
                          ? 'text-[#6B7280]'
                          : countVariance > 0
                          ? 'text-[#15803D]'
                          : 'text-[#DC2626]'
                      }`}
                    >
                      {countVariance > 0 ? `+${countVariance}` : countVariance}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                      Physical Counted Quantity ({stockActionModal.item.unit}) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={countedQuantity}
                      onChange={(e) =>
                        setCountedQuantity(Math.max(0, Number(e.target.value)))
                      }
                      className="w-full px-3.5 py-2 border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                      Counted By (Staff)
                    </label>
                    <select
                      value={opResponsibleStaff}
                      onChange={(e) => setOpResponsibleStaff(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                    >
                      {staff.map((st) => (
                        <option key={st.id} value={st.name}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                    Reconciliation Reason / Note{' '}
                    {countVariance !== 0 ? '*' : '(Optional)'}
                  </label>
                  <input
                    type="text"
                    required={countVariance !== 0}
                    value={opNotes}
                    onChange={(e) => setOpNotes(e.target.value)}
                    placeholder={
                      countVariance !== 0
                        ? 'Explain discrepancy (e.g. unrecorded issue, breakage, recount)...'
                        : 'Count verified with zero discrepancy'
                    }
                    className="w-full px-3.5 py-2 border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                      Movement Type
                    </label>
                    <select
                      value={opMovementType}
                      onChange={(e) =>
                        setOpMovementType(e.target.value as StockMovementType)
                      }
                      className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                    >
                      {stockActionModal.mode === 'IN' ? (
                        <>
                          <option value="Stock received">
                            Stock Received (+IN)
                          </option>
                          <option value="Adjustment">
                            Positive Adjustment
                          </option>
                        </>
                      ) : (
                        <>
                          <option value="Housekeeping usage">
                            Departmental Issue
                          </option>
                          <option value="Laundry usage">Laundry Usage</option>
                          <option value="Waste">Damage / Waste</option>
                          <option value="Adjustment">
                            Negative Adjustment
                          </option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                      Quantity ({stockActionModal.item.unit})
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={
                        stockActionModal.mode === 'OUT'
                          ? stockActionModal.item.availableQuantity
                          : undefined
                      }
                      required
                      value={opQuantity}
                      onChange={(e) => setOpQuantity(Number(e.target.value))}
                      className="w-full px-3.5 py-2 border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                      {stockActionModal.mode === 'IN'
                        ? 'Source / Supplier'
                        : 'Destination Department'}
                    </label>
                    <input
                      type="text"
                      value={opSourceDest}
                      onChange={(e) => setOpSourceDest(e.target.value)}
                      className="w-full px-3.5 py-2 border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                      Recorded By (Staff)
                    </label>
                    <select
                      value={opResponsibleStaff}
                      onChange={(e) => setOpResponsibleStaff(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                    >
                      {staff.map((st) => (
                        <option key={st.id} value={st.name}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                    Notes / Reason
                  </label>
                  <input
                    type="text"
                    value={opNotes}
                    onChange={(e) => setOpNotes(e.target.value)}
                    placeholder="e.g. Weekly floor allocation or batch restock"
                    className="w-full px-3.5 py-2 border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EFEFEF]">
              <button
                type="button"
                onClick={() => setStockActionModal(null)}
                className="px-4 py-2 rounded-[10px] text-[13px] font-medium text-[#374151] hover:bg-[#F3F4F6]"
              >
                Cancel
              </button>
              <PrimaryButton type="submit">
                {stockActionModal.mode === 'COUNT'
                  ? 'Confirm Physical Count'
                  : 'Confirm Stock Update'}
              </PrimaryButton>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
