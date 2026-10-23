import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  CheckCircle2,
  Clock,
  TrendingDown,
  Download,
  Check,
  Trash2,
  Edit3,
  Palette,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { KpiCard } from '../../components/ui/KpiCard';
import {
  PageHeader,
  TableToolbar,
  SearchInput,
  PrimaryButton,
  SecondaryButton,
  EmptyState,
} from '../../components/ui/PageControls';
import { Modal, ConfirmDialog } from '../../components/ui/Overlay';
import { Dropdown } from '../../components/ui/Dropdown';
import {
  DateRangeControl,
  CustomSingleDatePicker,
} from '../../components/ui/CustomDatePicker';
import {
  Expense,
  ExpenseCategoryConfig,
  PaymentMethod,
  DateRangeFilter,
} from '../../types/hotel';
import {
  formatCurrency,
  formatDate,
  isDateInRange,
  getPresetDateRange,
  exportToCsv,
  getExpenseDepartment,
  TODAY_STR,
} from '../../utils/formatters';

const PAYMENT_METHODS: PaymentMethod[] = [
  'Bank Transfer',
  'Card',
  'Cash',
  'POS Terminal',
];

const EXPENSE_DEPARTMENTS: string[] = [
  'Rooms',
  'Bar',
  'Restaurant',
  'Laundry',
  'Housekeeping/Cleaning',
  'Maintenance',
  'Administration',
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
    currentUser,
    selectedBranchId,
    settings,
    createExpense,
    updateExpense,
    deleteExpense,
    saveExpenseCategories,
    notify,
  } = useHotel();

  const [dateFilter, setDateFilter] = useState<DateRangeFilter>(() =>
    getPresetDateRange('month')
  );

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Expense Form State
  const [date, setDate] = useState(TODAY_STR);
  const [category, setCategory] = useState<string>('Utilities & Power');
  const [department, setDepartment] = useState<string>('Maintenance');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(45000);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('Bank Transfer');
  const [responsibleStaff, setResponsibleStaff] = useState(
    currentUser.name
  );

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

  const branchExpenses = useMemo(
    () =>
      expenses.filter(
        (e) =>
          (selectedBranchId === 'ALL' || e.branchId === selectedBranchId) &&
          isDateInRange(e.date, dateFilter)
      ),
    [expenses, selectedBranchId, dateFilter]
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
      if (categoryFilter !== 'ALL' && e.category !== categoryFilter)
        return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const dept = getExpenseDepartment(e).toLowerCase();
        const matchRef = e.reference.toLowerCase().includes(q);
        const matchDesc = e.description.toLowerCase().includes(q);
        const matchStaff = e.responsibleStaff.toLowerCase().includes(q);
        const matchDept = dept.includes(q);
        if (!matchRef && !matchDesc && !matchStaff && !matchDept) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [branchExpenses, categoryFilter, search]);

  const openNewModal = () => {
    setEditingExpense(null);
    setDate(TODAY_STR);
    const defaultCat = categoryConfigs[0]?.name || 'Utilities & Power';
    setCategory(defaultCat);
    setDepartment(getExpenseDepartment({ category: defaultCat }));
    setDescription('');
    setAmount(45000);
    setPaymentMethod('Bank Transfer');
    setResponsibleStaff(currentUser.name);
    setShowModal(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setDate(exp.date);
    setCategory(exp.category);
    setDepartment(getExpenseDepartment(exp));
    setDescription(exp.description);
    setAmount(exp.amount);
    setPaymentMethod(exp.paymentMethod);
    setResponsibleStaff(exp.responsibleStaff || currentUser.name);
    setShowModal(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0 || !department) return;
    const activeBranch =
      selectedBranchId === 'ALL' ? 'BR-01' : selectedBranchId;

    if (editingExpense) {
      updateExpense(editingExpense.id, {
        date,
        category,
        department,
        description: description.trim(),
        amount,
        paymentMethod,
        responsibleStaff,
      });
    } else {
      createExpense({
        date,
        category,
        department,
        description: description.trim(),
        amount,
        paymentMethod,
        status: 'Approved',
        responsibleStaff: currentUser.name,
        branchId: activeBranch,
        notes: '',
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
        ExpenseID: e.reference,
        Date: e.date,
        Category: e.category,
        Description: e.description,
        RecordedBy: e.responsibleStaff,
        Amount: e.amount,
        PaymentMethod: e.paymentMethod,
        Department: getExpenseDepartment(e),
      }))
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Management"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <DateRangeControl value={dateFilter} onChange={setDateFilter} />
            <SecondaryButton onClick={openManageCategoriesModal}>
              <Palette className="w-4 h-4" />
              Expense Category
            </SecondaryButton>
            <PrimaryButton onClick={openNewModal}>
              <Plus className="w-4 h-4" />
              Record Expense
            </PrimaryButton>
          </div>
        }
      />

      {/* 4 KPI Cards — Overview height standard */}
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
                placeholder="Search expense ID, description, department, or staff..."
              />
            }
            right={
              <div className="flex flex-wrap items-center gap-2">
                <Dropdown
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  options={[
                    { value: 'ALL', label: 'All Expense Categories' },
                    ...categoryConfigs.map((c) => ({
                      value: c.name,
                      label: c.name,
                    })),
                  ]}
                  className="w-56"
                />
                <SecondaryButton onClick={handleExport}>
                  <Download className="w-4 h-4" />
                  Export CSV
                </SecondaryButton>
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
                    <th className="py-3 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                      Expense ID
                    </th>
                    <th className="py-3 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                      Date
                    </th>
                    <th className="py-3 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                      Category
                    </th>
                    <th className="py-3 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                      Description
                    </th>
                    <th className="py-3 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                      Recorded By
                    </th>
                    <th className="py-3 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] text-right whitespace-nowrap">
                      Amount
                    </th>
                    <th className="py-3 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                      Payment Method
                    </th>
                    <th className="py-3 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                      Department
                    </th>
                    <th className="py-3 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] text-right whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6] text-[13px]">
                  {filteredExpenses.map((exp) => {
                    const dept = getExpenseDepartment(exp);
                    return (
                      <tr
                        key={exp.id}
                        className="hover:bg-[#FAFAFA] transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-normal text-[#111111] text-[12.5px] whitespace-nowrap">
                          {exp.reference}
                        </td>
                        <td className="py-3.5 px-4 font-normal text-[#4B5563] whitespace-nowrap">
                          {formatDate(exp.date)}
                        </td>
                        <td className="py-3.5 px-4 font-normal text-[#111111] whitespace-nowrap">
                          {exp.category}
                        </td>
                        <td className="py-3.5 px-4 font-normal text-[#111111] whitespace-nowrap">
                          {exp.description}
                        </td>
                        <td className="py-3.5 px-4 font-normal text-[#374151] whitespace-nowrap">
                          {exp.responsibleStaff}
                        </td>
                        <td className="py-3.5 px-4 text-right font-normal text-[#111111] tabular-nums whitespace-nowrap">
                          {formatCurrency(exp.amount, settings.currencySymbol)}
                        </td>
                        <td className="py-3.5 px-4 font-normal text-[#4B5563] whitespace-nowrap">
                          {exp.paymentMethod}
                        </td>
                        <td className="py-3.5 px-4 font-normal text-[#374151] whitespace-nowrap">
                          {dept}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(exp)}
                              title="Edit Expense"
                              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111111] hover:bg-[#F3F4F6] cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingExpense(exp)}
                              title="Delete Expense"
                              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
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

      {/* Record / Edit Expense Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingExpense ? 'Edit Expense' : 'Record New Expense'}
        size="md"
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1.5">
                Expense Date
              </label>
              <CustomSingleDatePicker value={date} onChange={setDate} />
            </div>
            <div>
              <Dropdown
                label="Expense Category *"
                value={category}
                onChange={setCategory}
                options={categoryConfigs.map((cat) => ({
                  value: cat.name,
                  label: cat.name,
                }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1.5">
              Description *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 1,500L Automotive Gas Oil (Diesel) Delivery"
              className="w-full px-3.5 py-2 border border-[#E5E7EB] rounded-[11px] text-[13px] focus:outline-none focus:border-[#7463A6]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Dropdown
                label="Department *"
                value={department}
                onChange={setDepartment}
                options={EXPENSE_DEPARTMENTS.map((dept) => ({
                  value: dept,
                  label: dept,
                }))}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1.5">
                Amount ({settings.currencySymbol}) *
              </label>
              <input
                type="number"
                min={1}
                step={500}
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-[#E5E7EB] rounded-[11px] text-[13px] focus:outline-none focus:border-[#7463A6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Dropdown
                label="Payment Method"
                value={paymentMethod}
                onChange={(val) => setPaymentMethod(val as PaymentMethod)}
                options={PAYMENT_METHODS.map((pm) => ({
                  value: pm,
                  label: pm,
                }))}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1.5">
                Recorded By
              </label>
              <input
                type="text"
                readOnly
                value={editingExpense ? responsibleStaff : currentUser.name}
                className="w-full px-3.5 py-2 bg-[#F7F7F5] border border-[#E5E7EB] rounded-[11px] text-[13px] text-[#4B5563] cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EFEFEF]">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-[10px] text-[13px] font-medium text-[#374151] hover:bg-[#F3F4F6] cursor-pointer"
            >
              Cancel
            </button>
            <PrimaryButton type="submit">
              {editingExpense ? 'Save Changes' : 'Submit Expense'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* Delete Expense Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingExpense)}
        onClose={() => setDeletingExpense(null)}
        onConfirm={() => {
          if (deletingExpense) {
            deleteExpense(deletingExpense.id);
            setDeletingExpense(null);
          }
        }}
        title="Delete Expense Record"
        description={
          deletingExpense
            ? `Are you sure you want to permanently delete expense ${deletingExpense.reference} (${deletingExpense.description})? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Expense"
        destructive
      />

      {/* Expense Category Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Expense Category"
        size="lg"
      >
        <form onSubmit={handleSaveCategoriesSubmit} className="space-y-5">
          {/* Add New Category Bar */}
          <div className="p-3.5 rounded-[14px] bg-[#FAFAFA] border border-[#E5E7EB] space-y-3">
            <label className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
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
                    className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
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
                className="px-3.5 py-2 rounded-[10px] text-[12px] font-medium bg-[#7463A6] text-white hover:bg-[#635394] transition-colors inline-flex items-center gap-1 cursor-pointer"
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
                      className="flex-1 px-2.5 py-1.5 border border-[#E5E7EB] rounded-lg text-[13px] font-normal text-[#111111] focus:outline-none focus:border-[#7463A6]"
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
                        className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
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
              className="px-4 py-2 rounded-[10px] text-[13px] font-medium text-[#374151] hover:bg-[#F3F4F6] cursor-pointer"
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
