import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  CheckCircle2,
  Clock,
  TrendingDown,
  Download,
  Check,
  XCircle,
  Trash2,
  Edit3,
  Palette,
  ArrowUpDown,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { KpiCard } from '../../components/ui/KpiCard';
import {
  PageHeader,
  TableToolbar,
  SearchInput,
  SelectFilter,
  PrimaryButton,
  SecondaryButton,
  EmptyState,
} from '../../components/ui/PageControls';
import { Modal } from '../../components/ui/Overlay';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  CustomDateRangePicker,
  CustomSingleDatePicker,
} from '../../components/ui/CustomDatePicker';
import {
  Expense,
  ExpenseCategoryConfig,
  PaymentMethod,
} from '../../types/hotel';
import {
  formatCurrency,
  formatDate,
  isDateInRange,
  getPresetDateRange,
  exportToCsv,
  TODAY_STR,
} from '../../utils/formatters';

const PAYMENT_METHODS: PaymentMethod[] = [
  'Bank Transfer',
  'Card',
  'Cash',
  'POS Terminal',
];

const CURATED_CATEGORY_COLORS = [
  '#7463A6',
  '#2563EB',
  '#0D9488',
  '#D97706',
  '#DC2626',
  '#4F46E5',
  '#15803D',
  '#9333EA',
  '#EA580C',
  '#0284C7',
  '#475569',
  '#BE123C',
];

const DEFAULT_CATEGORY_CONFIGS: ExpenseCategoryConfig[] = [
  { name: 'Utilities & Diesel', color: '#7463A6' },
  { name: 'Staff Salaries & Welfare', color: '#2563EB' },
  { name: 'Food & Kitchen Supplies', color: '#0D9488' },
  { name: 'Beverage Restock', color: '#D97706' },
  { name: 'Maintenance & Repairs', color: '#DC2626' },
  { name: 'Housekeeping & Laundry Supplies', color: '#4F46E5' },
  { name: 'Marketing & Guest Experience', color: '#15803D' },
  { name: 'Administration & Permits', color: '#6B7280' },
];

export const ExpensesPage: React.FC = () => {
  const {
    expenses,
    staff,
    selectedBranchId,
    settings,
    createExpense,
    updateExpense,
    updateExpenseStatus,
    deleteExpense,
    saveExpenseCategories,
    notify,
  } = useHotel();

  const [datePreset, setDatePreset] = useState<
    'today' | 'week' | 'month' | 'custom'
  >('month');
  const [dateRange, setDateRange] = useState(() => {
    const base = getPresetDateRange('month');
    return { fromDate: base.startDate, toDate: '2026-10-31' };
  });

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [dateSortOrder, setDateSortOrder] = useState<'DESC' | 'ASC'>('DESC');

  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Expense Form State
  const [date, setDate] = useState(TODAY_STR);
  const [category, setCategory] = useState<string>('Utilities & Diesel');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(45000);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('Bank Transfer');
  const [responsibleStaff, setResponsibleStaff] = useState(
    'Adaeze Okafor-Vance'
  );
  const [notes, setNotes] = useState('');

  // Manage Categories Modal State
  const [editableConfigs, setEditableConfigs] = useState<
    Array<{ originalName?: string; name: string; color: string }>
  >([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(
    CURATED_CATEGORY_COLORS[0]
  );

  const categoryConfigs: ExpenseCategoryConfig[] = useMemo(() => {
    const base =
      settings.expenseCategoryConfigs &&
      settings.expenseCategoryConfigs.length > 0
        ? settings.expenseCategoryConfigs
        : DEFAULT_CATEGORY_CONFIGS;
    const map = new Map<string, string>();
    base.forEach((c) => map.set(c.name, c.color));
    (settings.expenseCategories || []).forEach((name, idx) => {
      if (!map.has(name)) {
        map.set(
          name,
          CURATED_CATEGORY_COLORS[idx % CURATED_CATEGORY_COLORS.length]
        );
      }
    });
    expenses.forEach((e, idx) => {
      if (!map.has(e.category)) {
        map.set(
          e.category,
          CURATED_CATEGORY_COLORS[idx % CURATED_CATEGORY_COLORS.length]
        );
      }
    });
    return Array.from(map.entries()).map(([name, color]) => ({ name, color }));
  }, [settings.expenseCategoryConfigs, settings.expenseCategories, expenses]);

  const getCategoryColor = (catName: string) =>
    categoryConfigs.find((c) => c.name === catName)?.color || '#7463A6';

  const handleDatePresetChange = (value: string) => {
    const preset = value as 'today' | 'week' | 'month' | 'custom';
    setDatePreset(preset);
    if (preset !== 'custom') {
      const next = getPresetDateRange(preset);
      setDateRange({
        fromDate: next.startDate,
        toDate: preset === 'month' ? '2026-10-31' : next.endDate,
      });
    }
  };

  const branchExpenses = useMemo(
    () =>
      expenses.filter(
        (e) =>
          (selectedBranchId === 'ALL' || e.branchId === selectedBranchId) &&
          isDateInRange(e.date, dateRange.fromDate, dateRange.toDate)
      ),
    [expenses, selectedBranchId, dateRange]
  );

  // KPIs
  const totalSpend = branchExpenses
    .filter((e) => e.status !== 'Rejected')
    .reduce((s, e) => s + e.amount, 0);

  const approvedSpend = branchExpenses
    .filter((e) => e.status === 'Approved')
    .reduce((s, e) => s + e.amount, 0);

  const pendingApprovalAmount = branchExpenses
    .filter((e) => e.status === 'Pending')
    .reduce((s, e) => s + e.amount, 0);

  // Top category
  const topCategoryEntry = useMemo(() => {
    const map: Record<string, number> = {};
    branchExpenses
      .filter((e) => e.status !== 'Rejected')
      .forEach((e) => {
        map[e.category] = (map[e.category] || 0) + e.amount;
      });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return sorted[0] || ['None', 0];
  }, [branchExpenses]);

  const filteredExpenses = useMemo(() => {
    const list = branchExpenses.filter((e) => {
      if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && e.category !== categoryFilter)
        return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchRef = e.reference.toLowerCase().includes(q);
        const matchDesc = e.description.toLowerCase().includes(q);
        const matchStaff = e.responsibleStaff.toLowerCase().includes(q);
        const matchNotes = e.notes.toLowerCase().includes(q);
        if (!matchRef && !matchDesc && !matchStaff && !matchNotes) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (dateSortOrder === 'DESC') {
        return b.date.localeCompare(a.date);
      }
      return a.date.localeCompare(b.date);
    });
  }, [branchExpenses, statusFilter, categoryFilter, search, dateSortOrder]);

  const openNewModal = () => {
    setEditingExpense(null);
    setDate(TODAY_STR);
    setCategory(categoryConfigs[0]?.name || 'Utilities & Diesel');
    setDescription('');
    setAmount(45000);
    setPaymentMethod('Bank Transfer');
    setResponsibleStaff(staff[0]?.name || 'Adaeze Okafor-Vance');
    setNotes('');
    setShowModal(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setDate(exp.date);
    setCategory(exp.category);
    setDescription(exp.description);
    setAmount(exp.amount);
    setPaymentMethod(exp.paymentMethod);
    setResponsibleStaff(exp.responsibleStaff);
    setNotes(exp.notes);
    setShowModal(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0) return;
    const activeBranch =
      selectedBranchId === 'ALL' ? 'BR-01' : selectedBranchId;

    if (editingExpense) {
      updateExpense(editingExpense.id, {
        date,
        category,
        description: description.trim(),
        amount,
        paymentMethod,
        responsibleStaff,
        notes: notes.trim(),
      });
    } else {
      createExpense({
        date,
        category,
        description: description.trim(),
        amount,
        paymentMethod,
        status: 'Pending',
        responsibleStaff,
        branchId: activeBranch,
        notes: notes.trim(),
      });
    }
    setShowModal(false);
  };

  const openManageCategoriesModal = () => {
    setEditableConfigs(
      categoryConfigs.map((c) => ({
        originalName: c.name,
        name: c.name,
        color: c.color,
      }))
    );
    setNewCategoryName('');
    setNewCategoryColor(
      CURATED_CATEGORY_COLORS[
        categoryConfigs.length % CURATED_CATEGORY_COLORS.length
      ]
    );
    setShowCategoryModal(true);
  };

  const handleAddCategoryRow = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (
      editableConfigs.some(
        (c) => c.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      notify(
        'Duplicate Category',
        'That expense category already exists.',
        'error'
      );
      return;
    }
    setEditableConfigs((prev) => [
      ...prev,
      { name: trimmed, color: newCategoryColor },
    ]);
    setNewCategoryName('');
    setNewCategoryColor(
      CURATED_CATEGORY_COLORS[
        (editableConfigs.length + 1) % CURATED_CATEGORY_COLORS.length
      ]
    );
  };

  const handleSaveCategoriesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = editableConfigs
      .map((c) => ({ ...c, name: c.name.trim() }))
      .filter((c) => c.name.length > 0);
    if (cleaned.length === 0) return;

    const renamedMap: Record<string, string> = {};
    cleaned.forEach((c) => {
      if (c.originalName && c.originalName !== c.name) {
        renamedMap[c.originalName] = c.name;
      }
    });

    saveExpenseCategories(
      cleaned.map((c) => ({ name: c.name, color: c.color })),
      renamedMap
    );
    setShowCategoryModal(false);
  };

  const handleExport = () => {
    exportToCsv(
      'lumina-expenses-ledger.csv',
      filteredExpenses.map((e) => ({
        Reference: e.reference,
        Date: e.date,
        Category: e.category,
        Description: e.description,
        Amount: e.amount,
        PaymentMethod: e.paymentMethod,
        Status: e.status,
        ResponsibleStaff: e.responsibleStaff,
        Notes: e.notes,
      }))
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Management"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <SelectFilter
              value={datePreset}
              onChange={handleDatePresetChange}
              options={[
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'Last 7 Days' },
                { value: 'month', label: 'This Month' },
                { value: 'custom', label: 'Custom Range' },
              ]}
            />
            {datePreset === 'custom' && (
              <CustomDateRangePicker
                fromDate={dateRange.fromDate}
                toDate={dateRange.toDate}
                onChange={(fromDate, toDate) =>
                  setDateRange({ fromDate, toDate })
                }
              />
            )}
            <SecondaryButton onClick={openManageCategoriesModal}>
              <Palette className="w-4 h-4" />
              Manage Expense Categories
            </SecondaryButton>
            <PrimaryButton onClick={openNewModal}>
              <Plus className="w-4 h-4" />
              Record Expense
            </PrimaryButton>
          </div>
        }
      />

      {/* 4 KPI Cards — Overview height standard, no supporting text */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Expenses"
          value={formatCurrency(totalSpend, settings.currencySymbol)}
          icon={Receipt}
          tone="red"
        />
        <KpiCard
          label="Approved Expenses"
          value={formatCurrency(approvedSpend, settings.currencySymbol)}
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiCard
          label="Pending Approval"
          value={formatCurrency(pendingApprovalAmount, settings.currencySymbol)}
          icon={Clock}
          tone="amber"
        />
        <KpiCard
          label="Largest Cost Driver"
          value={formatCurrency(
            Number(topCategoryEntry[1]),
            settings.currencySymbol
          )}
          icon={TrendingDown}
          tone="purple"
        />
      </div>

      {/* Main Expenses Table */}
      <div className="bg-[#F0F0F0] p-1 rounded-[20px]">
        <div className="bg-white rounded-[17px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <TableToolbar
            left={
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search reference, description, or staff..."
              />
            }
            right={
              <div className="flex flex-wrap items-center gap-2">
                <SelectFilter
                  label="Category"
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  options={[
                    { value: 'ALL', label: 'All Expense Categories' },
                    ...categoryConfigs.map((c) => ({
                      value: c.name,
                      label: c.name,
                    })),
                  ]}
                />
                <SelectFilter
                  label="Status"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 'ALL', label: 'All Statuses' },
                    { value: 'Approved', label: 'Approved' },
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Rejected', label: 'Rejected' },
                  ]}
                />
                <SecondaryButton onClick={handleExport}>
                  <Download className="w-4 h-4" />
                  Export CSV
                </SecondaryButton>
                <button
                  type="button"
                  onClick={() =>
                    setDateSortOrder((prev) =>
                      prev === 'DESC' ? 'ASC' : 'DESC'
                    )
                  }
                  title={
                    dateSortOrder === 'DESC'
                      ? 'Sorted: Newest First (Click for Oldest First)'
                      : 'Sorted: Oldest First (Click for Newest First)'
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-white hover:bg-[#FAFAFA] text-[#111111] font-medium text-[12px] border border-[#E2E2DC] transition-colors cursor-pointer"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#7463A6]" />
                  {dateSortOrder === 'DESC' ? 'Newest' : 'Oldest'}
                </button>
              </div>
            }
          />

          {filteredExpenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses match your filter"
              description="Try expanding the date range or record a new operational expense."
              action={
                <PrimaryButton onClick={openNewModal}>
                  <Plus className="w-4 h-4" />
                  Record Expense
                </PrimaryButton>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EFEFEF] bg-[#FAFAFA]">
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      Ref & Date
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      Category
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      Description & Payment Method
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      Recorded By
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] text-right">
                      Amount
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      Status
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] text-right">
                      Workflow Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6] text-[13px]">
                  {filteredExpenses.map((exp) => {
                    const catColor = getCategoryColor(exp.category);
                    return (
                      <tr
                        key={exp.id}
                        className="hover:bg-[#FAFAFA] transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <p className="font-mono font-semibold text-[#111111] text-[12px]">
                            {exp.reference}
                          </p>
                          <p className="text-[11px] text-[#6B7280]">
                            {formatDate(exp.date)}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F9FAFB] border border-[#ECECEC] text-[#111111] text-[12px] font-medium">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: catColor }}
                            />
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-[#111111]">
                            {exp.description}
                          </p>
                          <p className="text-[11px] text-[#6B7280]">
                            {exp.paymentMethod}
                            {exp.notes ? ` · ${exp.notes}` : ''}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-[#374151]">
                          {exp.responsibleStaff}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#111111] tabular-nums">
                          {formatCurrency(exp.amount, settings.currencySymbol)}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={exp.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            {exp.status === 'Pending' && (
                              <>
                                <button
                                  onClick={() =>
                                    updateExpenseStatus(exp.id, 'Approved')
                                  }
                                  className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[#ECFDF5] text-[#15803D] hover:bg-[#D1FAE5] inline-flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  Approve
                                </button>
                                <button
                                  onClick={() =>
                                    updateExpenseStatus(exp.id, 'Rejected')
                                  }
                                  className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2] inline-flex items-center gap-1"
                                >
                                  <XCircle className="w-3 h-3" />
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => openEditModal(exp)}
                              title="Edit Expense"
                              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111111] hover:bg-[#F3F4F6]"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteExpense(exp.id)}
                              title="Delete Expense"
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

      {/* Record / Edit Expense Modal (no subtitle, CustomSingleDatePicker) */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingExpense ? 'Edit Expense' : 'Record New Expense'}
        size="md"
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                Expense Date
              </label>
              <CustomSingleDatePicker value={date} onChange={setDate} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                Expense Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
              >
                {categoryConfigs.map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
              Description *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 1,500L Automotive Gas Oil (Diesel) Delivery"
              className="w-full px-3.5 py-2 border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                Amount (₦) *
              </label>
              <input
                type="number"
                min={1}
                step={500}
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
                className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                Recorded By
              </label>
              <select
                value={responsibleStaff}
                onChange={(e) => setResponsibleStaff(e.target.value)}
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
              Vendor / Invoice Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Vendor name, invoice number, or approval remark"
              className="w-full px-3.5 py-2 border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EFEFEF]">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-[10px] text-[13px] font-medium text-[#374151] hover:bg-[#F3F4F6]"
            >
              Cancel
            </button>
            <PrimaryButton type="submit">
              {editingExpense ? 'Save Changes' : 'Submit Expense'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Manage Expense Categories & Colors Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Manage Expense Categories"
        size="lg"
      >
        <form onSubmit={handleSaveCategoriesSubmit} className="space-y-5">
          {/* Add New Category Bar */}
          <div className="p-3.5 rounded-[14px] bg-[#FAFAFA] border border-[#E5E7EB] space-y-3">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
              Create New Expense Category
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name (e.g. Security & Surveillance)..."
                className="flex-1 min-w-[200px] px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
              />
              <div className="flex items-center gap-1.5">
                {CURATED_CATEGORY_COLORS.slice(0, 8).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewCategoryColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      newCategoryColor === c
                        ? 'scale-110 ring-2 ring-offset-2 ring-[#7463A6]'
                        : ' opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddCategoryRow}
                className="px-3.5 py-2 rounded-[10px] text-[12px] font-semibold bg-[#7463A6] text-white hover:bg-[#635394] transition-colors inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Category
              </button>
            </div>
          </div>

          {/* Existing Categories List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#F3F4F6] border border-[#E5E7EB] rounded-[14px]">
            {editableConfigs.map((cfg, idx) => {
              const linkedCount = expenses.filter(
                (e) => e.category === (cfg.originalName || cfg.name)
              ).length;
              return (
                <div
                  key={idx}
                  className="p-3 flex flex-wrap items-center justify-between gap-3 bg-white"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <input
                      type="text"
                      required
                      value={cfg.name}
                      onChange={(e) =>
                        setEditableConfigs((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, name: e.target.value } : item
                          )
                        )
                      }
                      className="flex-1 px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-[13px] font-medium text-[#111111] focus:outline-none focus:border-[#7463A6]"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {CURATED_CATEGORY_COLORS.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        onClick={() =>
                          setEditableConfigs((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, color: swatch } : item
                            )
                          )
                        }
                        className={`w-4 h-4 rounded-full transition-transform ${
                          cfg.color === swatch
                            ? 'scale-125 ring-2 ring-offset-1 ring-[#111111]'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: swatch }}
                        title={`Select ${swatch}`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-[#6B7280] w-16 text-right shrink-0">
                    {linkedCount} {linkedCount === 1 ? 'record' : 'records'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EFEFEF]">
            <button
              type="button"
              onClick={() => setShowCategoryModal(false)}
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
    </div>
  );
};
