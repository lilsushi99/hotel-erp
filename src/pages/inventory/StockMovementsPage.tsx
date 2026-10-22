import React, { useState, useMemo } from 'react';
import {
  ArrowLeftRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertOctagon,
  Download,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { KpiCard } from '../../components/ui/KpiCard';
import { Dropdown } from '../../components/ui/Dropdown';
import {
  PageHeader,
  SearchInput,
  StatusBadge,
  Pagination,
  EmptyState,
} from '../../components/ui/PageControls';
import { exportToCsv } from '../../utils/formatters';

export const StockMovementsPage: React.FC = () => {
  const { stockMovements, selectedBranchId, notify } = useHotel();

  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const branchMovements = useMemo(
    () =>
      selectedBranchId === 'ALL'
        ? stockMovements
        : stockMovements.filter((m) => m.branchId === selectedBranchId),
    [stockMovements, selectedBranchId]
  );

  const kpis = useMemo(() => {
    const total = branchMovements.length;
    const inbound = branchMovements.filter((m) => m.direction === 'IN').length;
    const outbound = branchMovements.filter((m) => m.direction === 'OUT').length;
    const wasteOrAdj = branchMovements.filter(
      (m) => m.movementType === 'Waste' || m.movementType === 'Adjustment'
    ).length;
    return { total, inbound, outbound, wasteOrAdj };
  }, [branchMovements]);

  const filteredMovements = useMemo(() => {
    const q = search.trim().toLowerCase();
    return branchMovements.filter((m) => {
      if (
        q &&
        !m.id.toLowerCase().includes(q) &&
        !m.itemName.toLowerCase().includes(q) &&
        !m.sourceOrDestination.toLowerCase().includes(q) &&
        !m.responsibleUser.toLowerCase().includes(q) &&
        !(m.relatedReferenceId && m.relatedReferenceId.toLowerCase().includes(q))
      ) {
        return false;
      }
      if (moduleFilter !== 'ALL' && m.inventoryModule !== moduleFilter) return false;
      if (typeFilter !== 'ALL' && m.movementType !== typeFilter) return false;
      return true;
    });
  }, [branchMovements, search, moduleFilter, typeFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMovements.slice(start, start + pageSize);
  }, [filteredMovements, page]);

  const handleExport = () => {
    const rows = filteredMovements.map((m) => ({
      MovementID: m.id,
      DateTime: m.dateTime,
      Item: m.itemName,
      Module: m.inventoryModule,
      MovementType: m.movementType,
      Direction: m.direction,
      Quantity: m.quantity,
      Unit: m.unit,
      SourceOrDestination: m.sourceOrDestination,
      Reference: m.relatedReferenceId || '',
      ResponsibleUser: m.responsibleUser,
      Notes: m.notes,
    }));
    exportToCsv('lumina-stock-movements-ledger.csv', rows);
    notify('CSV Exported', `Exported ${rows.length} stock movement records.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements Ledger"
        subtitle="Audit log of all inventory receipts, POS bar sales, kitchen recipe consumption, housekeeping usage, and adjustments."
        actions={
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E1E1E] hover:bg-[#333330] text-white text-[13px] font-medium transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Ledger CSV
          </button>
        }
      />

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Movements"
          value={kpis.total}
          icon={ArrowLeftRight}
          supportingText="Automatic & manual logs"
          accentIcon={true}
        />
        <KpiCard
          label="Stock Received (IN)"
          value={kpis.inbound}
          icon={ArrowDownToLine}
          trendText="Replenishments"
          trendDirection="up"
          isTrendFavourable={true}
        />
        <KpiCard
          label="Sales & Usage (OUT)"
          value={kpis.outbound}
          icon={ArrowUpFromLine}
          supportingText="POS, Kitchen & Housekeeping"
        />
        <KpiCard
          label="Waste & Adjustments"
          value={kpis.wasteOrAdj}
          icon={AlertOctagon}
          supportingText="Audit reconciliations"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[24px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.025)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search movement ID, item, reference (e.g. POS-8801), or staff..."
            className="w-full sm:w-80"
          />
          <Dropdown
            value={moduleFilter}
            onChange={(v) => {
              setModuleFilter(v);
              setPage(1);
            }}
            size="sm"
            className="w-44"
            options={[
              { value: 'ALL', label: 'All Inventory Modules' },
              { value: 'Beverages', label: 'Beverages' },
              { value: 'Food', label: 'Food Inventory' },
              { value: 'Supplies', label: 'Operating Supplies' },
            ]}
          />
          <Dropdown
            value={typeFilter}
            onChange={(v) => {
              setTypeFilter(v);
              setPage(1);
            }}
            size="sm"
            className="w-56"
            options={[
              { value: 'ALL', label: 'All Movement Types' },
              { value: 'Stock received', label: 'Stock received' },
              { value: 'Bar/POS sale', label: 'Bar/POS sale' },
              {
                value: 'Kitchen ingredient consumption',
                label: 'Kitchen ingredient consumption',
              },
              { value: 'Housekeeping usage', label: 'Housekeeping usage' },
              { value: 'Laundry usage', label: 'Laundry usage' },
              { value: 'Waste', label: 'Waste' },
              { value: 'Adjustment', label: 'Adjustment' },
              {
                value: 'Transfer between locations',
                label: 'Transfer between locations',
              },
            ]}
          />
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.025)] overflow-hidden">
        {filteredMovements.length === 0 ? (
          <EmptyState
            title="No stock movements match your filter"
            description="Complete a POS sale, kitchen order, or stock receipt to generate movement logs."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EFEFEA] bg-[#FAF9F6] text-[12px] font-medium text-[#6E6E6A]">
                    <th className="py-3.5 px-5">Movement ID</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Item</th>
                    <th className="py-3.5 px-4">Movement Type</th>
                    <th className="py-3.5 px-4 text-right">Quantity</th>
                    <th className="py-3.5 px-4">Source / Destination</th>
                    <th className="py-3.5 px-4">Related Ref</th>
                    <th className="py-3.5 px-4">Responsible User</th>
                    <th className="py-3.5 px-5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F2EE] text-[13px]">
                  {paginated.map((m) => (
                    <tr key={m.id} className="hover:bg-[#F8F8F5]">
                      <td className="py-3.5 px-5 font-semibold text-[#1E1E1E] tabular-nums whitespace-nowrap">
                        {m.id}
                      </td>
                      <td className="py-3.5 px-4 text-[#6E6E6A] tabular-nums whitespace-nowrap">
                        {m.dateTime}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#1E1E1E]">
                          {m.itemName}
                        </div>
                        <div className="text-[11px] text-[#6E6E6A]">
                          {m.inventoryModule}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge
                          status={m.movementType}
                          tone={
                            m.direction === 'IN'
                              ? 'green'
                              : m.movementType === 'Waste'
                              ? 'red'
                              : 'peach'
                          }
                        />
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-semibold tabular-nums whitespace-nowrap ${
                          m.direction === 'IN' ? 'text-[#1F7A4C]' : 'text-[#B93829]'
                        }`}
                      >
                        {m.direction === 'IN' ? '+' : '-'}
                        {m.quantity} {m.unit}
                      </td>
                      <td className="py-3.5 px-4 text-[#3A3A36]">
                        {m.sourceOrDestination}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#8C3D2B] tabular-nums">
                        {m.relatedReferenceId || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-[#4A4A46]">
                        {m.responsibleUser}
                      </td>
                      <td className="py-3.5 px-5 text-[#6E6E6A] max-w-[180px] truncate">
                        {m.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={page}
              totalItems={filteredMovements.length}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
};
