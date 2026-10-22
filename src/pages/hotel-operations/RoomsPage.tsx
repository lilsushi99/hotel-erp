import React, { useState, useMemo } from 'react';
import {
  BedDouble,
  CheckCircle2,
  Brush,
  Wrench,
  Plus,
  Users,
  Edit3,
  Trash2,
  Layers,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { Room, RoomOperationalStatus, RoomType } from '../../types/hotel';
import { KpiCard } from '../../components/ui/KpiCard';
import { Dropdown } from '../../components/ui/Dropdown';
import { Modal, ConfirmDialog } from '../../components/ui/Overlay';
import {
  PageHeader,
  SearchInput,
  StatusBadge,
  Pagination,
  EmptyState,
} from '../../components/ui/PageControls';
import { formatCurrency } from '../../utils/formatters';

export const RoomsPage: React.FC = () => {
  const {
    rooms,
    roomTypes,
    selectedBranchId,
    settings,
    createRoom,
    updateRoom,
    updateRoomStatus,
    deleteRoom,
    createRoomType,
    updateRoomType,
    deleteRoomType,
    notify,
  } = useHotel();

  const sym = settings.currencySymbol;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 8; // 4-column grid, 2 rows per page

  // Room Form Modal
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [floor, setFloor] = useState('1st Floor');
  const [status, setStatus] = useState<RoomOperationalStatus>('Available');
  const [rate, setRate] = useState<number>(85000);
  const [capacity, setCapacity] = useState<number>(2);
  const [roomError, setRoomError] = useState('');

  // Room Types Manager Modal
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<RoomType | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeRoomCount, setTypeRoomCount] = useState<number>(4);
  const [typeError, setTypeError] = useState('');

  const [deleteRoomTarget, setDeleteRoomTarget] = useState<Room | null>(null);

  const branchRooms = useMemo(
    () =>
      selectedBranchId === 'ALL'
        ? rooms
        : rooms.filter((r) => r.branchId === selectedBranchId),
    [rooms, selectedBranchId]
  );

  const counts = useMemo(() => {
    return {
      total: branchRooms.length,
      available: branchRooms.filter((r) => r.status === 'Available').length,
      occupied: branchRooms.filter((r) => r.status === 'Occupied').length,
      cleaningOrMaint: branchRooms.filter(
        (r) => r.status === 'Cleaning' || r.status === 'Maintenance'
      ).length,
    };
  }, [branchRooms]);

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return branchRooms.filter((r) => {
      const rt = roomTypes.find((t) => t.id === r.roomTypeId);
      if (
        q &&
        !r.roomNumber.toLowerCase().includes(q) &&
        !(rt?.name.toLowerCase().includes(q)) &&
        !r.floor.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && r.roomTypeId !== typeFilter) return false;
      return true;
    });
  }, [branchRooms, roomTypes, search, statusFilter, typeFilter]);

  const paginatedRooms = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRooms.slice(start, start + pageSize);
  }, [filteredRooms, page]);

  const openAddRoom = () => {
    setEditingRoom(null);
    setRoomError('');
    setRoomNumber('');
    const defaultType = roomTypes[0];
    setRoomTypeId(defaultType?.id || '');
    setFloor('2nd Floor');
    setStatus('Available');
    setRate(defaultType?.defaultRate || 85000);
    setCapacity(defaultType?.capacity || 2);
    setIsRoomModalOpen(true);
  };

  const openEditRoom = (rm: Room) => {
    setEditingRoom(rm);
    setRoomError('');
    setRoomNumber(rm.roomNumber);
    setRoomTypeId(rm.roomTypeId);
    setFloor(rm.floor);
    setStatus(rm.status);
    setRate(rm.rate);
    setCapacity(rm.capacity);
    setIsRoomModalOpen(true);
  };

  const handleRoomTypeChangeInForm = (newTypeId: string) => {
    setRoomTypeId(newTypeId);
    const rt = roomTypes.find((t) => t.id === newTypeId);
    if (rt && !editingRoom) {
      setRate(rt.defaultRate);
      setCapacity(rt.capacity);
    }
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setRoomError('');
    if (!roomNumber.trim() || !roomTypeId) {
      setRoomError('Room number and room type are required.');
      return;
    }

    const activeBranch = selectedBranchId === 'ALL' ? 'BR-01' : selectedBranchId;

    if (editingRoom) {
      const res = updateRoom(editingRoom.id, {
        roomNumber: roomNumber.trim(),
        roomTypeId,
        floor,
        status,
        rate,
        capacity,
      });
      if (!res.ok) {
        setRoomError(res.error || 'Error updating room.');
        return;
      }
      setIsRoomModalOpen(false);
    } else {
      const res = createRoom({
        roomNumber: roomNumber.trim(),
        roomTypeId,
        branchId: activeBranch,
        floor,
        status,
        rate,
        capacity,
        notes: '',
      });
      if (!res.ok) {
        setRoomError(res.error || 'Error creating room.');
        return;
      }
      setIsRoomModalOpen(false);
    }
  };

  const handleSaveRoomType = (e: React.FormEvent) => {
    e.preventDefault();
    setTypeError('');
    const trimmedName = typeName.trim();
    if (!trimmedName) {
      setTypeError('Room Type Name is required.');
      return;
    }
    if (!typeRoomCount || typeRoomCount < 1) {
      setTypeError('Number of rooms in this category must be at least 1.');
      return;
    }

    const duplicate = roomTypes.find(
      (rt) =>
        rt.name.toLowerCase() === trimmedName.toLowerCase() &&
        (!editingType || rt.id !== editingType.id)
    );
    if (duplicate) {
      setTypeError(`A room category named "${trimmedName}" already exists.`);
      return;
    }

    if (editingType) {
      updateRoomType(editingType.id, {
        name: trimmedName,
        roomCount: typeRoomCount,
      });
    } else {
      createRoomType({
        name: trimmedName,
        roomCount: typeRoomCount,
        description: `${trimmedName} category`,
        defaultRate: 100000,
        capacity: 2,
        amenities: ['High-Speed Wi-Fi', 'Smart TV'],
      });
    }
    setEditingType(null);
    setTypeName('');
    setTypeRoomCount(4);
  };

  const renderRoomStatusIcon = (rmStatus: RoomOperationalStatus) => {
    switch (rmStatus) {
      case 'Available':
        return <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />;
      case 'Occupied':
        return <BedDouble className="w-5 h-5 text-[#7463A6]" />;
      case 'Cleaning':
        return <Brush className="w-5 h-5 text-[#D97706]" />;
      case 'Maintenance':
        return <Wrench className="w-5 h-5 text-[#DC2626]" />;
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Rooms & Categories"
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setEditingType(null);
                setTypeName('');
                setTypeRoomCount(4);
                setTypeError('');
                setIsTypeModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-white border border-[#E2E2DC] hover:bg-[#F6F6F4] text-[#1E1E1E] text-[13px] font-medium transition-colors cursor-pointer"
            >
              <Layers className="w-4 h-4 text-[#7463A6]" />
              Room Type
            </button>
            <button
              type="button"
              onClick={openAddRoom}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#7463A6] hover:bg-[#635394] text-white text-[13px] font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Room
            </button>
          </>
        }
      />

      {/* 4 KPI Cards — Only Title, Icon, and Main Figure */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Rooms"
          value={counts.total}
          icon={BedDouble}
          iconTone="purple"
        />
        <KpiCard
          label="Available Rooms"
          value={counts.available}
          icon={CheckCircle2}
          iconTone="green"
        />
        <KpiCard
          label="Occupied Rooms"
          value={counts.occupied}
          icon={Users}
          iconTone="blue"
        />
        <KpiCard
          label="Cleaning and Maintenance"
          value={counts.cleaningOrMaint}
          icon={Wrench}
          iconTone="amber"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search room number, floor, or category..."
            className="w-full sm:w-72"
          />
          <Dropdown
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            size="sm"
            className="w-44"
            options={[
              { value: 'ALL', label: 'All Room Statuses' },
              { value: 'Available', label: 'Available' },
              { value: 'Occupied', label: 'Occupied' },
              { value: 'Cleaning', label: 'Cleaning' },
              { value: 'Maintenance', label: 'Maintenance' },
            ]}
          />
          <Dropdown
            value={typeFilter}
            onChange={(v) => {
              setTypeFilter(v);
              setPage(1);
            }}
            size="sm"
            className="w-44"
            options={[
              { value: 'ALL', label: 'All Room Types' },
              ...roomTypes.map((rt) => ({ value: rt.id, label: rt.name })),
            ]}
          />
        </div>
      </div>

      {/* 4-Column Visual Room Cards Grid */}
      {filteredRooms.length === 0 ? (
        <div className="bg-white rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <EmptyState
            title="No rooms match your filter"
            description="Clear filters or add a new room."
            actionLabel="Add Room"
            onAction={openAddRoom}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {paginatedRooms.map((room) => {
              const rt = roomTypes.find((t) => t.id === room.roomTypeId);
              return (
                <div
                  key={room.id}
                  className="bg-white rounded-[14px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between border border-transparent hover:border-[#E2E2DC] transition-all"
                >
                  <div>
                    {/* Top Row: Room Number, Distinct Status Icon & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[10px] bg-[#F6F6F4] flex items-center justify-center text-[#1E1E1E] shrink-0">
                          {renderRoomStatusIcon(room.status)}
                        </div>
                        <div>
                          <div className="text-[17px] font-medium text-[#1E1E1E] tabular-nums leading-tight">
                            Room {room.roomNumber}
                          </div>
                          <div className="text-[12px] text-[#6E6E6A]">
                            {rt?.name || 'Standard'} · {room.floor}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={room.status} />
                    </div>

                    {/* Rate & Capacity */}
                    <div className="mt-4 pt-3.5 border-t border-[#F2F2EE] flex items-center justify-between text-[13px]">
                      <div>
                        <div className="text-[11px] text-[#8E8E88]">Room Rate</div>
                        <div className="font-semibold text-[#1E1E1E] tabular-nums text-[15px]">
                          {formatCurrency(room.rate, sym)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-[#8E8E88]">Capacity</div>
                        <div className="font-medium text-[#3A3A36] tabular-nums">
                          Up to {room.capacity} Guests
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Operational Status Switcher & Edit/Delete */}
                  <div className="mt-4 pt-3.5 border-t border-[#F2F2EE] flex items-center justify-between gap-2">
                    <Dropdown
                      size="sm"
                      value={room.status}
                      onChange={(val) =>
                        updateRoomStatus(room.id, val as RoomOperationalStatus)
                      }
                      className="flex-1"
                      options={[
                        { value: 'Available', label: 'Set Available' },
                        { value: 'Occupied', label: 'Set Occupied' },
                        { value: 'Cleaning', label: 'Set Cleaning' },
                        { value: 'Maintenance', label: 'Set Maintenance' },
                      ]}
                    />
                    <button
                      type="button"
                      onClick={() => openEditRoom(room)}
                      className="p-2 rounded-xl bg-[#F6F6F4] hover:bg-[#EAEAE4] text-[#4A4A46] transition-colors"
                      title="Edit Room"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteRoomTarget(room)}
                      className="p-2 rounded-xl bg-[#F6F6F4] hover:bg-[#FCECE9] text-[#6E6E6A] hover:text-[#B93829] transition-colors"
                      title="Delete Room"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <Pagination
              currentPage={page}
              totalItems={filteredRooms.length}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      {/* ADD / EDIT ROOM MODAL — Simplified to 6 Fields */}
      <Modal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        title={editingRoom ? `Edit Room ${editingRoom.roomNumber}` : 'Add Room'}
      >
        <form onSubmit={handleSaveRoom} className="space-y-4">
          {roomError && (
            <div className="p-3 rounded-xl bg-[#FCECE9] text-[#B93829] text-[13px]">
              {roomError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[#4A4A46] mb-1.5">
                Room Number <span className="text-[#B93829]">*</span>
              </label>
              <input
                type="text"
                required
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. 205"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E2DC] text-[14px] tabular-nums"
              />
            </div>
            <Dropdown
              label="Room Type"
              required
              value={roomTypeId}
              onChange={handleRoomTypeChangeInForm}
              options={roomTypes.map((rt) => ({
                value: rt.id,
                label: rt.name,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Dropdown
              label="Operational Status"
              value={status}
              onChange={(v) => setStatus(v as RoomOperationalStatus)}
              options={[
                { value: 'Available', label: 'Available' },
                { value: 'Occupied', label: 'Occupied' },
                { value: 'Cleaning', label: 'Cleaning' },
                { value: 'Maintenance', label: 'Maintenance' },
              ]}
            />
            <div>
              <label className="block text-[12px] font-medium text-[#4A4A46] mb-1.5">
                Room Rate ({sym})
              </label>
              <input
                type="number"
                min={0}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E2DC] text-[14px] tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[#4A4A46] mb-1.5">
                Maximum Capacity
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E2DC] text-[14px] tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#4A4A46] mb-1.5">
                Floor / Wing
              </label>
              <input
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="e.g. 2nd Floor"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E2DC] text-[14px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EFEFEA]">
            <button
              type="button"
              onClick={() => setIsRoomModalOpen(false)}
              className="px-4 py-2 rounded-[10px] text-[13px] font-normal bg-[#F6F6F4] text-[#4A4A46] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-[10px] text-[13px] font-medium bg-[#7463A6] hover:bg-[#635394] text-white cursor-pointer"
            >
              {editingRoom ? 'Save Changes' : 'Create Room'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ROOM TYPES & CATEGORIES MODAL — 2-Column Grid + 2-Field Form */}
      <Modal
        isOpen={isTypeModalOpen}
        onClose={() => setIsTypeModalOpen(false)}
        title="Room Types & Categories"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          {/* Existing Room Categories in 2-Column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
            {roomTypes.map((rt) => {
              const roomsInCatCount =
                rt.roomCount ?? rooms.filter((r) => r.roomTypeId === rt.id).length;
              return (
                <div
                  key={rt.id}
                  className="p-3.5 rounded-2xl border border-[#EFEFEA] bg-white flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-[#1E1E1E] truncate">
                      {rt.name}
                    </div>
                    <div className="text-[12px] text-[#6E6E6A] tabular-nums mt-0.5">
                      {roomsInCatCount} {roomsInCatCount === 1 ? 'Room' : 'Rooms'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingType(rt);
                        setTypeName(rt.name);
                        setTypeRoomCount(roomsInCatCount || 1);
                        setTypeError('');
                      }}
                      className="p-1.5 rounded-lg bg-[#F6F6F4] hover:bg-[#EAEAE4] text-[#4A4A46] cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const res = deleteRoomType(rt.id);
                        if (!res.ok && res.error) {
                          notify('Cannot Delete Category', res.error, 'error');
                        }
                      }}
                      className="p-1.5 rounded-lg bg-[#F6F6F4] hover:bg-[#FCECE9] text-[#B93829] cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={handleSaveRoomType}
            className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#EFEFEA] space-y-3"
          >
            <div className="text-[13px] font-semibold text-[#1E1E1E]">
              {editingType ? `Edit Category: ${editingType.name}` : 'Add Room Type'}
            </div>

            {typeError && (
              <div className="p-2.5 rounded-xl bg-[#FCECE9] text-[#B93829] text-[12px] font-medium">
                {typeError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11.5px] font-medium text-[#4A4A46] mb-1">
                  Room Type Name <span className="text-[#B93829]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  placeholder="e.g. Executive Suite"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2E2DC] text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-[#4A4A46] mb-1">
                  Number of Rooms in This Category <span className="text-[#B93829]">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={typeRoomCount}
                  onChange={(e) => setTypeRoomCount(Math.max(1, Number(e.target.value)))}
                  placeholder="e.g. 6"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2E2DC] text-[13px] tabular-nums"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              {editingType && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingType(null);
                    setTypeName('');
                    setTypeRoomCount(4);
                    setTypeError('');
                  }}
                  className="px-3 py-1.5 rounded-xl text-[12px] text-[#6E6E6A] cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 rounded-[10px] bg-[#7463A6] hover:bg-[#635394] text-white text-[12px] font-medium cursor-pointer"
              >
                {editingType ? 'Update Category' : 'Add Room Type'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteRoomTarget}
        onClose={() => setDeleteRoomTarget(null)}
        onConfirm={() => {
          if (deleteRoomTarget) {
            const res = deleteRoom(deleteRoomTarget.id);
            if (!res.ok && res.error) {
              notify('Cannot Delete Room', res.error, 'error');
            }
          }
        }}
        title="Delete Room"
        description={`Are you sure you want to delete Room ${deleteRoomTarget?.roomNumber}?`}
        confirmLabel="Delete Room"
      />
    </div>
  );
};
