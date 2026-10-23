import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  CalendarCheck,
  CalendarRange,
  Wallet,
  BedDouble,
  Plus,
  Minus,
  List,
  GanttChart,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
  Trash2,
  ArrowUpDown,
  CheckCircle2,
  CreditCard,
  Search,
  X,
  UserCheck,
  ChevronDown,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import {
  Booking,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../types/hotel';
import { KpiCard } from '../../components/ui/KpiCard';
import { Dropdown } from '../../components/ui/Dropdown';
import { Modal, Drawer, ConfirmDialog } from '../../components/ui/Overlay';
import {
  PageHeader,
  SearchInput,
  StatusBadge,
  Pagination,
  EmptyState,
  DateRangeControl,
  CustomSingleDatePicker,
  CustomTimePicker,
} from '../../components/ui/PageControls';
import {
  TODAY_STR,
  formatCompactCurrency,
  formatCurrency,
  formatDateReadable,
  calculateNights,
  doBookingDatesOverlap,
  addDays,
  getDatesArray,
} from '../../utils/formatters';

const BOOKING_PAYMENT_METHODS: PaymentMethod[] = ['Card', 'Bank Transfer', 'Cash'];

export const BookingsPage: React.FC = () => {
  const {
    bookings,
    rooms,
    roomTypes,
    guests,
    selectedBranchId,
    settings,
    createBooking,
    updateBooking,
    deleteBooking,
  } = useHotel();

  const sym = settings.currencySymbol;

  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('ALL');
  const [dateFromFilter, setDateFromFilter] = useState<string>('2026-10-01');
  const [dateToFilter, setDateToFilter] = useState<string>('2026-10-31');
  const [sortBy, setSortBy] = useState<'checkInDate' | 'totalAmount' | 'id'>('checkInDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Timeline state
  const [timelineStart, setTimelineStart] = useState<string>('2026-10-15');
  const [timelineDays, setTimelineDays] = useState<number>(14);

  // Modal & Drawer state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string>('');

  // Form fields (exact 17-item streamlined reservation flow)
  const [guestIdInput, setGuestIdInput] = useState<string>('');
  const [guestSearchQuery, setGuestSearchQuery] = useState<string>('');
  const [guestDropdownOpen, setGuestDropdownOpen] = useState<boolean>(false);

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [roomDropdownOpen, setRoomDropdownOpen] = useState(false);

  const [checkInDate, setCheckInDate] = useState(TODAY_STR);
  const [checkInTime, setCheckInTime] = useState(settings.defaultCheckInTime);
  const [checkOutDate, setCheckOutDate] = useState(addDays(TODAY_STR, 2));
  const [checkOutTime, setCheckOutTime] = useState('');
  const [roomRate, setRoomRate] = useState<number>(85000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Unpaid');
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>('Confirmed');

  const guestLookupRef = useRef<HTMLDivElement>(null);
  const roomSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (guestLookupRef.current && !guestLookupRef.current.contains(e.target as Node)) {
        setGuestDropdownOpen(false);
      }
      if (roomSelectorRef.current && !roomSelectorRef.current.contains(e.target as Node)) {
        setRoomDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const branchBookings = useMemo(
    () =>
      selectedBranchId === 'ALL'
        ? bookings
        : bookings.filter((b) => b.branchId === selectedBranchId),
    [bookings, selectedBranchId]
  );

  const branchRooms = useMemo(
    () =>
      selectedBranchId === 'ALL'
        ? rooms
        : rooms.filter((r) => r.branchId === selectedBranchId),
    [rooms, selectedBranchId]
  );

  // KPI metrics (only title, icon, and main figure) filtered by the booking date filter
  const kpis = useMemo(() => {
    const periodBookings = branchBookings.filter((b) => {
      if (dateFromFilter && b.checkOutDate < dateFromFilter) return false;
      if (dateToFilter && b.checkInDate > dateToFilter) return false;
      return true;
    });
    const active = periodBookings.filter(
      (b) => b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Checked In'
    ).length;
    const total = periodBookings.length;
    const revenue = periodBookings
      .filter((b) => b.bookingStatus !== 'Cancelled')
      .reduce((s, b) => s + b.totalAmount, 0);
    const availableRooms = branchRooms.filter((r) => r.status === 'Available').length;
    return { active, total, revenue, availableRooms };
  }, [branchBookings, branchRooms, dateFromFilter, dateToFilter]);

  // Filtered & sorted bookings
  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return branchBookings
      .filter((b) => {
        if (
          q &&
          !b.id.toLowerCase().includes(q) &&
          !b.guestName.toLowerCase().includes(q) &&
          !b.roomNumber.toLowerCase().includes(q) &&
          !(b.guestPhone && b.guestPhone.toLowerCase().includes(q))
        ) {
          return false;
        }
        if (statusFilter !== 'ALL' && b.bookingStatus !== statusFilter) return false;
        const normalizedPayStatus = b.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid';
        if (paymentFilter !== 'ALL' && normalizedPayStatus !== paymentFilter) return false;
        if (roomTypeFilter !== 'ALL' && b.roomTypeId !== roomTypeFilter) return false;
        if (dateFromFilter && b.checkOutDate < dateFromFilter) return false;
        if (dateToFilter && b.checkInDate > dateToFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const mult = sortOrder === 'asc' ? 1 : -1;
        if (sortBy === 'totalAmount') return (a.totalAmount - b.totalAmount) * mult;
        if (sortBy === 'id') return a.id.localeCompare(b.id) * mult;
        return a.checkInDate.localeCompare(b.checkInDate) * mult;
      });
  }, [
    branchBookings,
    search,
    statusFilter,
    paymentFilter,
    roomTypeFilter,
    dateFromFilter,
    dateToFilter,
    sortBy,
    sortOrder,
  ]);

  const paginatedBookings = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [filteredBookings, page]);

  const selectedBooking = useMemo(
    () => bookings.find((b) => b.id === selectedBookingId) || null,
    [bookings, selectedBookingId]
  );

  // Evaluate room availability and conflict explanation for a given [checkInDate, checkOutDate)
  const getRoomAvailabilityForDates = useMemo(() => {
    return (rmId: string, inDate: string, outDate: string, ignoreBookingId?: string | null) => {
      const rm = rooms.find((r) => r.id === rmId);
      if (!rm) {
        return { available: false, reason: 'Room not found' };
      }

      // Check overlapping reservations
      const conflict = bookings.find(
        (b) =>
          b.id !== ignoreBookingId &&
          b.roomId === rmId &&
          b.bookingStatus !== 'Cancelled' &&
          b.bookingStatus !== 'Checked Out' &&
          doBookingDatesOverlap(inDate, outDate, b.checkInDate, b.checkOutDate)
      );

      if (conflict) {
        return {
          available: false,
          reason: `Reserved (${conflict.id} · ${conflict.checkInDate} to ${conflict.checkOutDate})`,
        };
      }

      // If check-in includes today, also check live room operational blocks
      if (inDate <= TODAY_STR && outDate > TODAY_STR) {
        if (rm.status === 'Maintenance') {
          return {
            available: false,
            reason: 'Unavailable — Under Maintenance',
          };
        }
        if (rm.status === 'Cleaning') {
          return {
            available: false,
            reason: 'Unavailable — Housekeeping Cleaning in progress',
          };
        }
        if (rm.status === 'Occupied' && !ignoreBookingId) {
          return {
            available: false,
            reason: 'Unavailable — Currently Occupied',
          };
        }
      }

      return { available: true, reason: 'Available' };
    };
  }, [rooms, bookings]);

  const [bookingStep, setBookingStep] = useState<1 | 2>(1);

  const openCreateModal = (prefillRoomId?: string, prefillDate?: string) => {
    setEditingBookingId(null);
    setBookingStep(1);
    setFormError('');
    setGuestIdInput('');
    setGuestSearchQuery('');
    setGuestDropdownOpen(false);
    setGuestName('');
    setGuestPhone('');
    setGuestEmail('');

    const start = prefillDate || TODAY_STR;
    const end = addDays(start, 2);

    const candidateRoom =
      branchRooms.find((r) => r.id === prefillRoomId) ||
      branchRooms.find((r) => getRoomAvailabilityForDates(r.id, start, end, null).available) ||
      branchRooms[0];

    const initialTypeId = candidateRoom
      ? candidateRoom.roomTypeId
      : roomTypes[0]?.id || '';

    setSelectedRoomTypeId(initialTypeId);
    setRoomId(candidateRoom ? candidateRoom.id : '');
    setRoomSearchQuery('');
    setRoomDropdownOpen(false);
    setRoomRate(candidateRoom ? candidateRoom.rate : 85000);
    setCheckInDate(start);
    setCheckInTime(settings.defaultCheckInTime);
    setCheckOutDate(end);
    setCheckOutTime('');
    setPaymentMethod('Card');
    setPaymentStatus('Unpaid');
    setBookingStatus('Confirmed');
    setIsFormOpen(true);
  };

  const openEditModal = (bk: Booking) => {
    setEditingBookingId(bk.id);
    setBookingStep(1);
    setFormError('');
    setGuestIdInput(bk.guestId);
    setGuestSearchQuery(bk.guestName);
    setGuestDropdownOpen(false);
    setGuestName(bk.guestName);
    setGuestPhone(bk.guestPhone);
    setGuestEmail(bk.guestEmail || '');
    setSelectedRoomTypeId(bk.roomTypeId);
    setRoomId(bk.roomId);
    setRoomSearchQuery('');
    setRoomDropdownOpen(false);
    setCheckInDate(bk.checkInDate);
    setCheckInTime(bk.checkInTime);
    setCheckOutDate(bk.checkOutDate);
    setCheckOutTime(bk.checkOutTime || '');
    setRoomRate(bk.roomRate);
    setPaymentMethod(
      BOOKING_PAYMENT_METHODS.includes(bk.paymentMethod) ? bk.paymentMethod : 'Card'
    );
    setPaymentStatus(bk.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid');
    setBookingStatus(bk.bookingStatus);
    setIsFormOpen(true);
  };

  const computedNights = useMemo(
    () => Math.max(1, calculateNights(checkInDate, checkOutDate)),
    [checkInDate, checkOutDate]
  );

  const computedTotal = useMemo(
    () => computedNights * roomRate,
    [computedNights, roomRate]
  );

  const handleDurationChange = (nextNightsRaw: number) => {
    const validNights = Math.max(1, Math.min(365, Math.floor(nextNightsRaw || 1)));
    const nextCheckOut = addDays(checkInDate, validNights);
    setCheckOutDate(nextCheckOut);
  };

  const handleCheckInDateChange = (newCheckIn: string) => {
    const currentDuration = Math.max(1, calculateNights(checkInDate, checkOutDate));
    setCheckInDate(newCheckIn);
    if (checkOutDate <= newCheckIn) {
      setCheckOutDate(addDays(newCheckIn, currentDuration));
    }
  };

  const handleCheckOutDateChange = (newCheckOut: string) => {
    if (newCheckOut <= checkInDate) {
      setCheckOutDate(addDays(checkInDate, 1));
    } else {
      setCheckOutDate(newCheckOut);
    }
  };

  const handleRoomTypeSelect = (newTypeId: string) => {
    setSelectedRoomTypeId(newTypeId);
    const roomsInCat = branchRooms.filter((r) => r.roomTypeId === newTypeId);
    const firstAvail =
      roomsInCat.find(
        (r) =>
          getRoomAvailabilityForDates(r.id, checkInDate, checkOutDate, editingBookingId)
            .available
      ) || roomsInCat[0];

    if (firstAvail) {
      setRoomId(firstAvail.id);
      setRoomRate(firstAvail.rate);
    } else {
      setRoomId('');
      const rt = roomTypes.find((t) => t.id === newTypeId);
      if (rt) setRoomRate(rt.defaultRate);
    }
  };

  const handleRoomSelect = (newRoomId: string) => {
    setRoomId(newRoomId);
    setRoomDropdownOpen(false);
    setRoomSearchQuery('');
    const rm = rooms.find((r) => r.id === newRoomId);
    if (rm) {
      setSelectedRoomTypeId(rm.roomTypeId);
      setRoomRate(rm.rate);
    }
  };

  // Returning Guest Lookup autocomplete matches
  const matchingGuests = useMemo(() => {
    const q = guestSearchQuery.trim().toLowerCase();
    if (!q) return guests.slice(0, 6);
    return guests
      .filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.phone.toLowerCase().includes(q) ||
          (g.secondaryPhone && g.secondaryPhone.toLowerCase().includes(q)) ||
          g.email.toLowerCase().includes(q) ||
          g.id.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [guests, guestSearchQuery]);

  const handleSelectReturningGuest = (gId: string) => {
    const g = guests.find((x) => x.id === gId);
    if (!g) return;
    setGuestIdInput(g.id);
    setGuestSearchQuery(`${g.name} (${g.phone})`);
    setGuestDropdownOpen(false);
    setGuestName(g.name);
    setGuestPhone(g.phone);
    setGuestEmail(g.email || '');
  };

  const handleClearReturningGuest = () => {
    setGuestIdInput('');
    setGuestSearchQuery('');
    setGuestDropdownOpen(false);
  };

  // Searchable room options filtered by selected Room Type
  const roomOptionsWithAvailability = useMemo(() => {
    const q = roomSearchQuery.trim().toLowerCase();
    return branchRooms
      .filter((r) => !selectedRoomTypeId || r.roomTypeId === selectedRoomTypeId)
      .map((r) => {
        const rt = roomTypes.find((t) => t.id === r.roomTypeId);
        const availability = getRoomAvailabilityForDates(
          r.id,
          checkInDate,
          checkOutDate,
          editingBookingId
        );
        return {
          room: r,
          roomTypeName: rt?.name || 'Suite',
          available: availability.available,
          reason: availability.reason,
        };
      })
      .filter((item) => {
        if (!q) return true;
        return (
          item.room.roomNumber.toLowerCase().includes(q) ||
          item.roomTypeName.toLowerCase().includes(q) ||
          item.room.floor.toLowerCase().includes(q)
        );
      });
  }, [
    branchRooms,
    selectedRoomTypeId,
    roomTypes,
    roomSearchQuery,
    getRoomAvailabilityForDates,
    checkInDate,
    checkOutDate,
    editingBookingId,
  ]);

  const selectedRoomObj = useMemo(
    () => branchRooms.find((r) => r.id === roomId) || rooms.find((r) => r.id === roomId),
    [branchRooms, rooms, roomId]
  );

  const selectedRoomAvailability = useMemo(
    () =>
      roomId
        ? getRoomAvailabilityForDates(roomId, checkInDate, checkOutDate, editingBookingId)
        : { available: false, reason: 'Select a room' },
    [roomId, getRoomAvailabilityForDates, checkInDate, checkOutDate, editingBookingId]
  );

  const handleNextStep = () => {
    setFormError('');
    if (!guestName.trim()) {
      setFormError('Please enter the guest full name.');
      return;
    }
    const selectedRm = rooms.find((r) => r.id === roomId);
    if (!selectedRm) {
      setFormError('Please select a room.');
      return;
    }
    if (checkOutDate <= checkInDate) {
      setFormError('Check-out date must be after check-in date.');
      return;
    }
    if (bookingStatus !== 'Cancelled' && bookingStatus !== 'Checked Out') {
      const avail = getRoomAvailabilityForDates(
        selectedRm.id,
        checkInDate,
        checkOutDate,
        editingBookingId
      );
      if (!avail.available) {
        setFormError(`Room ${selectedRm.roomNumber} cannot be booked: ${avail.reason}.`);
        return;
      }
    }
    setBookingStep(2);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingStep === 1) {
      handleNextStep();
      return;
    }
    setFormError('');

    const selectedRm = rooms.find((r) => r.id === roomId);
    if (!selectedRm) {
      setFormError('Please select a room.');
      return;
    }

    if (checkOutDate <= checkInDate) {
      setFormError('Check-out date must be after check-in date.');
      return;
    }

    if (bookingStatus !== 'Cancelled' && bookingStatus !== 'Checked Out') {
      const avail = getRoomAvailabilityForDates(
        selectedRm.id,
        checkInDate,
        checkOutDate,
        editingBookingId
      );
      if (!avail.available) {
        setFormError(`Room ${selectedRm.roomNumber} cannot be booked: ${avail.reason}.`);
        return;
      }
    }

    const resolvedPayStatus: PaymentStatus =
      paymentStatus === 'Paid' ? 'Paid' : 'Unpaid';
    const finalAmountPaid = resolvedPayStatus === 'Paid' ? computedTotal : 0;

    if (editingBookingId) {
      const res = updateBooking(editingBookingId, {
        guestName,
        guestPhone,
        guestEmail,
        roomId: selectedRm.id,
        roomNumber: selectedRm.roomNumber,
        roomTypeId: selectedRm.roomTypeId,
        branchId: selectedRm.branchId,
        checkInDate,
        checkInTime,
        checkOutDate,
        checkOutTime: checkOutTime || settings.defaultCheckOutTime,
        roomRate,
        totalAmount: computedTotal,
        amountPaid: finalAmountPaid,
        paymentMethod,
        paymentStatus: resolvedPayStatus,
        bookingStatus,
      });
      if (!res.ok) {
        setFormError(res.error || 'Could not update booking.');
        return;
      }
      setIsFormOpen(false);
    } else {
      const res = createBooking({
        guestId: guestIdInput || undefined,
        guestName,
        guestPhone,
        guestEmail,
        guestAddress: '',
        roomId: selectedRm.id,
        roomNumber: selectedRm.roomNumber,
        roomTypeId: selectedRm.roomTypeId,
        branchId: selectedRm.branchId,
        checkInDate,
        checkInTime,
        checkOutDate,
        checkOutTime: checkOutTime || settings.defaultCheckOutTime,
        roomRate,
        totalAmount: computedTotal,
        amountPaid: finalAmountPaid,
        paymentMethod,
        paymentStatus: resolvedPayStatus,
        bookingStatus,
        notes: '',
      });
      if (!res.ok) {
        setFormError(res.error || 'Could not create booking.');
        return;
      }
      setIsFormOpen(false);
    }
  };

  // Timeline dates & filtered rooms
  const timelineDateList = useMemo(
    () => getDatesArray(timelineStart, timelineDays),
    [timelineStart, timelineDays]
  );

  const timelineRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return branchRooms.filter((rm) => {
      if (roomTypeFilter !== 'ALL' && rm.roomTypeId !== roomTypeFilter) return false;
      if (!q) return true;
      const roomMatches = rm.roomNumber.toLowerCase().includes(q);
      const guestMatches = branchBookings.some(
        (b) =>
          b.roomId === rm.id &&
          (b.guestName.toLowerCase().includes(q) || b.id.toLowerCase().includes(q))
      );
      return roomMatches || guestMatches;
    });
  }, [branchRooms, roomTypeFilter, search, branchBookings]);

  const getBookingBarColors = (status: BookingStatus) => {
    switch (status) {
      case 'Checked In':
        return 'bg-[#F1EEF8] text-[#7463A6] border-[#D7CEF0]';
      case 'Confirmed':
        return 'bg-[#E9F5EE] text-[#16A34A] border-[#B8E1C8]';
      case 'Pending':
        return 'bg-[#FEF4E6] text-[#D97706] border-[#F5D6A7]';
      case 'Checked Out':
        return 'bg-[#F0F0EC] text-[#5C5C58] border-[#DCDCD4]';
      default:
        return 'bg-[#FCECE9] text-[#DC2626] border-[#F2B8B0]';
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bookings & Reservations"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 1. View Dropdown: Table View vs Timeline View */}
            <Dropdown
              value={viewMode}
              onChange={(v) => setViewMode(v as 'table' | 'timeline')}
              size="sm"
              className="w-36"
              options={[
                { value: 'table', label: 'Table View' },
                { value: 'timeline', label: 'Timeline View' },
              ]}
            />

            {/* 2. Date Dropdown */}
            <DateRangeControl
              fromDate={dateFromFilter}
              toDate={dateToFilter}
              onChange={(from, to) => {
                setDateFromFilter(from);
                setDateToFilter(to);
                setPage(1);
              }}
            />

            {/* 3. New Booking Button */}
            <button
              type="button"
              onClick={() => openCreateModal()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#7463A6] hover:bg-[#635394] text-white text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              New Booking
            </button>
          </div>
        }
      />

      {/* 4 KPI Cards — Only Title, Icon, and Main Figure */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active Bookings"
          value={kpis.active}
          icon={CalendarCheck}
          iconTone="purple"
        />
        <KpiCard
          label="Total Bookings"
          value={kpis.total}
          icon={CalendarRange}
          iconTone="teal"
        />
        <KpiCard
          label="Booking Revenue"
          value={formatCompactCurrency(kpis.revenue, sym)}
          fullValueTooltip={formatCurrency(kpis.revenue, sym)}
          icon={Wallet}
          iconTone="green"
        />
        <KpiCard
          label="Available Rooms"
          value={kpis.availableRooms}
          icon={BedDouble}
          iconTone="amber"
        />
      </div>

      {/* Unified Search & Filter Container */}
      <div className="bg-white rounded-[14px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search ID, guest name, phone, or room..."
            className="w-full sm:w-64"
          />

          <Dropdown
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            size="sm"
            className="w-40"
            options={[
              { value: 'ALL', label: 'All Booking Statuses' },
              { value: 'Pending', label: 'Pending' },
              { value: 'Confirmed', label: 'Confirmed' },
              { value: 'Checked In', label: 'Checked In' },
              { value: 'Checked Out', label: 'Checked Out' },
              { value: 'Cancelled', label: 'Cancelled' },
            ]}
          />

          <Dropdown
            value={paymentFilter}
            onChange={(v) => {
              setPaymentFilter(v);
              setPage(1);
            }}
            size="sm"
            className="w-36"
            options={[
              { value: 'ALL', label: 'All Payments' },
              { value: 'Paid', label: 'Paid' },
              { value: 'Unpaid', label: 'Unpaid' },
            ]}
          />

          <Dropdown
            value={roomTypeFilter}
            onChange={(v) => {
              setRoomTypeFilter(v);
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

        <div className="flex items-center gap-2">
          {(statusFilter !== 'ALL' ||
            paymentFilter !== 'ALL' ||
            roomTypeFilter !== 'ALL' ||
            search) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setPaymentFilter('ALL');
                setRoomTypeFilter('ALL');
                setDateFromFilter('2026-10-01');
                setDateToFilter('2026-10-31');
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-[8px] text-[12px] text-[#7463A6] hover:bg-[#F1EEF8] font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: TABLE VIEW */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
          {filteredBookings.length === 0 ? (
            <EmptyState
              title="No matching bookings"
              description="Adjust your search or status filters, or create a new reservation."
              actionLabel="New Booking"
              onAction={() => openCreateModal()}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#EFEFEA] bg-[#FAF9F6] text-[12px] font-medium text-[#6E6E6A] whitespace-nowrap">
                      <th className="py-3.5 px-5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy('id');
                            setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                          }}
                          className="inline-flex items-center gap-1 hover:text-[#1E1E1E]"
                        >
                          Booking ID <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Guest Name</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Room</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy('checkInDate');
                            setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                          }}
                          className="inline-flex items-center gap-1 hover:text-[#1E1E1E]"
                        >
                          Check-in <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Check-out</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSortBy('totalAmount');
                            setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                          }}
                          className="inline-flex items-center gap-1 hover:text-[#1E1E1E]"
                        >
                          Amount <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Payment Status</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Booking Status</th>
                      <th className="py-3.5 px-5 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F2EE] text-[13.5px]">
                    {paginatedBookings.map((bk) => {
                      const rt = roomTypes.find((t) => t.id === bk.roomTypeId);
                      const displayPayStatus = bk.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid';
                      return (
                        <tr
                          key={bk.id}
                          onClick={() => setSelectedBookingId(bk.id)}
                          className="hover:bg-[#F8F8F5] transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 px-5 font-medium text-[#1E1E1E] tabular-nums whitespace-nowrap">
                            {bk.id}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-medium text-[#1E1E1E]">{bk.guestName}</div>
                            {bk.guestPhone && (
                              <div className="text-[12px] text-[#6E6E6A] tabular-nums">
                                {bk.guestPhone}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-medium text-[#1E1E1E] tabular-nums">
                              Room {bk.roomNumber}
                            </span>
                            <span className="text-[12px] text-[#6E6E6A] block">
                              {rt?.name || 'Suite'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[#3A3A36] tabular-nums whitespace-nowrap">
                            <div>{formatDateReadable(bk.checkInDate)}</div>
                            <div className="text-[11px] text-[#8E8E88]">{bk.checkInTime}</div>
                          </td>
                          <td className="py-3.5 px-4 text-[#3A3A36] tabular-nums whitespace-nowrap">
                            <div>{formatDateReadable(bk.checkOutDate)}</div>
                            <div className="text-[11px] text-[#8E8E88]">
                              {bk.nights} night{bk.nights > 1 ? 's' : ''}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-[#1E1E1E] tabular-nums whitespace-nowrap">
                            <div>{formatCurrency(bk.totalAmount, sym)}</div>
                            {displayPayStatus === 'Unpaid' && bk.bookingStatus !== 'Cancelled' && (
                              <div className="text-[11px] font-normal text-[#B93829]">
                                Due: {formatCurrency(bk.totalAmount - bk.amountPaid, sym)}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <StatusBadge status={displayPayStatus} />
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <StatusBadge status={bk.bookingStatus} />
                          </td>
                          <td
                            className="py-3.5 px-5 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedBookingId(bk.id)}
                                className="p-1.5 rounded-lg text-[#6E6E6A] hover:text-[#1E1E1E] hover:bg-[#EFEFEA]"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(bk)}
                                className="p-1.5 rounded-lg text-[#6E6E6A] hover:text-[#1E1E1E] hover:bg-[#EFEFEA]"
                                title="Edit Booking"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTargetId(bk.id)}
                                className="p-1.5 rounded-lg text-[#6E6E6A] hover:text-[#B93829] hover:bg-[#FCECE9]"
                                title="Delete Booking"
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

              <Pagination
                currentPage={page}
                totalItems={filteredBookings.length}
                pageSize={pageSize}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      ) : (
        /* VIEW 2: GANTT / TIMELINE VIEW */
        <div className="bg-white rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col">
          {/* Timeline Controls Bar */}
          <div className="px-5 py-4 border-b border-[#EFEFEA] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTimelineStart(addDays(timelineStart, -7))}
                className="p-2 rounded-[9px] border border-[#E2E2DC] bg-white hover:bg-[#F6F6F4] text-[#4A4A46] transition-colors"
                title="Previous 7 days"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setTimelineStart('2026-10-16')}
                className="px-3 py-1.5 rounded-[9px] border border-[#E2E2DC] bg-white hover:bg-[#F6F6F4] text-[13px] font-medium text-[#1E1E1E] transition-colors"
              >
                Today ({formatDateReadable(TODAY_STR)})
              </button>
              <button
                type="button"
                onClick={() => setTimelineStart(addDays(timelineStart, 7))}
                className="p-2 rounded-[9px] border border-[#E2E2DC] bg-white hover:bg-[#F6F6F4] text-[#4A4A46] transition-colors"
                title="Next 7 days"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <Dropdown
                value={String(timelineDays)}
                onChange={(v) => setTimelineDays(Number(v))}
                size="sm"
                className="w-36 ml-2"
                options={[
                  { value: '10', label: '10 Days Window' },
                  { value: '14', label: '14 Days Window' },
                  { value: '21', label: '21 Days Window' },
                ]}
              />
            </div>

            {/* Status Legend */}
            <div className="flex flex-wrap items-center gap-4 text-[12px] text-[#6E6E6A]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#F1EEF8] border border-[#D7CEF0]" />
                <span>Checked In</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#E9F5EE] border border-[#B8E1C8]" />
                <span>Confirmed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#FEF4E6] border border-[#F5D6A7]" />
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#F0F0EC] border border-[#DCDCD4]" />
                <span>Checked Out</span>
              </div>
            </div>
          </div>

          {/* Scrollable Gantt Matrix */}
          <div className="overflow-x-auto max-h-[560px] overflow-y-auto relative">
            <div
              className="min-w-max"
              style={{
                width: `${190 + timelineDateList.length * 94}px`,
              }}
            >
              {/* Sticky Date Header */}
              <div className="sticky top-0 z-20 flex bg-[#FAF9F6] border-b border-[#EAEAE4]">
                <div className="sticky left-0 z-30 w-[190px] shrink-0 px-4 py-3 bg-[#FAF9F6] border-r border-[#EAEAE4] text-[12px] font-medium text-[#4A4A46]">
                  Room / Category
                </div>
                {timelineDateList.map((d) => {
                  const isToday = d === TODAY_STR;
                  const dt = new Date(d + 'T00:00:00');
                  const dayName = dt.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNum = dt.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });
                  return (
                    <div
                      key={d}
                      className={`w-[94px] shrink-0 px-2 py-2.5 text-center border-r border-[#EFEFEA] ${
                        isToday ? 'bg-[#F1EEF8]' : ''
                      }`}
                    >
                      <div
                        className={`text-[11px] font-medium ${
                          isToday ? 'text-[#7463A6]' : 'text-[#8E8E88]'
                        }`}
                      >
                        {isToday ? 'TODAY' : dayName}
                      </div>
                      <div className="text-[12px] font-medium text-[#1E1E1E] tabular-nums">
                        {dayNum}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Room Rows */}
              <div className="divide-y divide-[#EFEFEA]">
                {timelineRooms.map((room) => {
                  const rt = roomTypes.find((t) => t.id === room.roomTypeId);
                  const roomBookings = branchBookings.filter(
                    (b) =>
                      b.roomId === room.id &&
                      b.bookingStatus !== 'Cancelled' &&
                      (statusFilter === 'ALL' || b.bookingStatus === statusFilter) &&
                      (paymentFilter === 'ALL' ||
                        (b.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid') === paymentFilter)
                  );

                  return (
                    <div key={room.id} className="flex relative h-[64px] group">
                      {/* Pinned Left Room Column */}
                      <div className="sticky left-0 z-10 w-[190px] shrink-0 px-4 py-2.5 bg-white group-hover:bg-[#FAF9F6] border-r border-[#EAEAE4] flex items-center justify-between">
                        <div>
                          <div className="text-[13.5px] font-medium text-[#1E1E1E] tabular-nums">
                            Room {room.roomNumber}
                          </div>
                          <div className="text-[11px] text-[#6E6E6A] truncate">
                            {rt?.name || 'Standard'}
                          </div>
                        </div>
                        <StatusBadge status={room.status} />
                      </div>

                      {/* Day Grid Cells */}
                      <div className="flex relative flex-1">
                        {timelineDateList.map((d) => {
                          const isToday = d === TODAY_STR;
                          return (
                            <div
                              key={d}
                              onClick={() => openCreateModal(room.id, d)}
                              className={`w-[94px] shrink-0 h-full border-r border-[#F2F2EE] cursor-pointer hover:bg-[#F6F6F4]/70 transition-colors ${
                                isToday ? 'bg-[#F1EEF8]/40' : ''
                              }`}
                              title={`Click to book Room ${room.roomNumber} starting ${d}`}
                            />
                          );
                        })}

                        {/* Booking Bars Spanning Occupied Nights [checkInDate, checkOutDate) */}
                        {roomBookings.map((bk) => {
                          const windowStart = timelineDateList[0];
                          const windowEndExclusive = addDays(
                            timelineDateList[timelineDateList.length - 1],
                            1
                          );

                          if (
                            bk.checkOutDate <= windowStart ||
                            bk.checkInDate >= windowEndExclusive
                          ) {
                            return null;
                          }

                          const visibleStart =
                            bk.checkInDate < windowStart ? windowStart : bk.checkInDate;
                          const visibleEnd =
                            bk.checkOutDate > windowEndExclusive
                              ? windowEndExclusive
                              : bk.checkOutDate;

                          const offsetDays = calculateNights(windowStart, visibleStart);
                          const spanNights = Math.max(
                            1,
                            calculateNights(visibleStart, visibleEnd)
                          );

                          const leftPx = offsetDays * 94 + 4;
                          const widthPx = spanNights * 94 - 8;

                          return (
                            <button
                              key={bk.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBookingId(bk.id);
                              }}
                              style={{
                                left: `${leftPx}px`,
                                width: `${widthPx}px`,
                              }}
                              title={`${bk.id} · ${bk.guestName} | ${bk.checkInDate} → ${bk.checkOutDate} (${bk.nights} nights) | ${formatCurrency(bk.totalAmount, sym)} (${bk.bookingStatus})`}
                              className={`absolute top-2.5 h-[44px] rounded-[10px] border px-3 py-1 text-left shadow-xs flex flex-col justify-center overflow-hidden transition-transform hover:scale-[1.01] cursor-pointer z-10 ${getBookingBarColors(
                                bk.bookingStatus
                              )}`}
                            >
                              <div className="text-[12px] font-medium truncate leading-tight">
                                {bk.guestName}
                              </div>
                              <div className="text-[10.5px] opacity-85 truncate tabular-nums leading-tight mt-0.5">
                                {bk.id} · {bk.nights}n · {formatCompactCurrency(bk.totalAmount, sym)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOOKING DETAILS SIDE DRAWER */}
      <Drawer
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBookingId(null)}
        title={selectedBooking ? `Booking ${selectedBooking.id}` : 'Booking Details'}
        subtitle={
          selectedBooking
            ? `Room ${selectedBooking.roomNumber} · Created ${formatDateReadable(
                selectedBooking.createdAt
              )}`
            : ''
        }
      >
        {selectedBooking && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-[12px] bg-[#F6F6F4]">
              <div>
                <div className="text-[12px] text-[#6E6E6A]">Booking Status</div>
                <div className="mt-1">
                  <StatusBadge status={selectedBooking.bookingStatus} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-[12px] text-[#6E6E6A]">Payment Status</div>
                <div className="mt-1">
                  <StatusBadge
                    status={selectedBooking.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'}
                  />
                </div>
              </div>
            </div>

            {/* Guest Information */}
            <div className="space-y-2">
              <h3 className="text-[13px] font-medium text-[#1E1E1E]">
                Guest Information
              </h3>
              <div className="p-4 rounded-[12px] border border-[#EFEFEA] space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Guest Name</span>
                  <span className="font-medium text-[#1E1E1E]">
                    {selectedBooking.guestName} ({selectedBooking.guestId})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Phone Number</span>
                  <span className="text-[#1E1E1E] tabular-nums">
                    {selectedBooking.guestPhone || '—'}
                  </span>
                </div>
                {selectedBooking.guestEmail && (
                  <div className="flex justify-between">
                    <span className="text-[#6E6E6A]">Email</span>
                    <span className="text-[#1E1E1E]">{selectedBooking.guestEmail}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stay & Room Schedule */}
            <div className="space-y-2">
              <h3 className="text-[13px] font-medium text-[#1E1E1E]">
                Accommodation & Stay Schedule
              </h3>
              <div className="p-4 rounded-[12px] border border-[#EFEFEA] space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Assigned Room</span>
                  <span className="font-medium text-[#1E1E1E]">
                    Room {selectedBooking.roomNumber} (
                    {roomTypes.find((r) => r.id === selectedBooking.roomTypeId)?.name ||
                      'Standard'}
                    )
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Check-in</span>
                  <span className="text-[#1E1E1E] tabular-nums">
                    {formatDateReadable(selectedBooking.checkInDate)} at{' '}
                    {selectedBooking.checkInTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Check-out</span>
                  <span className="text-[#1E1E1E] tabular-nums">
                    {formatDateReadable(selectedBooking.checkOutDate)}
                    {selectedBooking.checkOutTime ? ` at ${selectedBooking.checkOutTime}` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Occupied Nights</span>
                  <span className="font-medium text-[#1E1E1E] tabular-nums">
                    {selectedBooking.nights} night{selectedBooking.nights > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Summary (without Folio or Reservation Notes) */}
            <div className="space-y-2">
              <h3 className="text-[13px] font-medium text-[#1E1E1E]">
                Payment Summary
              </h3>
              <div className="p-4 rounded-[12px] border border-[#EFEFEA] space-y-2.5 text-[13px] tabular-nums">
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Room Rate</span>
                  <span className="text-[#1E1E1E]">
                    {formatCurrency(selectedBooking.roomRate, sym)} / night
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Total Amount</span>
                  <span className="font-medium text-[#1E1E1E]">
                    {formatCurrency(selectedBooking.totalAmount, sym)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Amount Paid</span>
                  <span className="text-[#1F7A4C] font-medium">
                    {formatCurrency(selectedBooking.amountPaid, sym)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#F0F0EC]">
                  <span className="font-medium text-[#1E1E1E]">Outstanding Balance</span>
                  <span
                    className={`font-medium ${
                      selectedBooking.totalAmount - selectedBooking.amountPaid > 0
                        ? 'text-[#B93829]'
                        : 'text-[#1F7A4C]'
                    }`}
                  >
                    {formatCurrency(
                      Math.max(0, selectedBooking.totalAmount - selectedBooking.amountPaid),
                      sym
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-[12px] text-[#6E6E6A]">
                  <span>Payment Method</span>
                  <span>{selectedBooking.paymentMethod}</span>
                </div>
              </div>
            </div>

            {/* Quick Operational Actions */}
            <div className="space-y-2.5 pt-3 border-t border-[#EFEFEA]">
              <div className="grid grid-cols-2 gap-2.5">
                {selectedBooking.bookingStatus === 'Confirmed' && (
                  <button
                    type="button"
                    onClick={() =>
                      updateBooking(selectedBooking.id, { bookingStatus: 'Checked In' })
                    }
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] bg-[#7463A6] hover:bg-[#635394] text-white text-[13px] font-medium transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Check In Guest
                  </button>
                )}

                {selectedBooking.bookingStatus === 'Checked In' && (
                  <button
                    type="button"
                    onClick={() =>
                      updateBooking(selectedBooking.id, { bookingStatus: 'Checked Out' })
                    }
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] bg-[#1E1E1E] hover:bg-[#333330] text-white text-[13px] font-medium transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Check Out Guest
                  </button>
                )}

                {selectedBooking.totalAmount > selectedBooking.amountPaid &&
                  selectedBooking.bookingStatus !== 'Cancelled' && (
                    <button
                      type="button"
                      onClick={() =>
                        updateBooking(selectedBooking.id, {
                          amountPaid: selectedBooking.totalAmount,
                          paymentStatus: 'Paid',
                        })
                      }
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] bg-[#E9F5EE] hover:bg-[#D5EDE0] text-[#1F7A4C] text-[13px] font-medium transition-colors cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      Mark Balance Paid
                    </button>
                  )}

                <button
                  type="button"
                  onClick={() => {
                    const bk = selectedBooking;
                    setSelectedBookingId(null);
                    openEditModal(bk);
                  }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] bg-[#F6F6F4] hover:bg-[#EAEAE4] text-[#1E1E1E] text-[13px] font-medium transition-colors cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Booking
                </button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* CREATE / EDIT BOOKING MODAL — 2-Step Progress Reservation Flow */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingBookingId ? `Edit Booking ${editingBookingId}` : 'Create New Booking'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          {/* Top 2-Step Progress Indicator */}
          <div className="pb-3.5 border-b border-[#EFEFEA]">
            <div className="flex items-center justify-between gap-3">
              {/* Step 1 Node */}
              <button
                type="button"
                onClick={() => setBookingStep(1)}
                className="flex items-center gap-2.5 text-left cursor-pointer group"
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors shrink-0 ${
                    bookingStep >= 1
                      ? 'bg-[#7463A6] text-white'
                      : 'bg-[#F0F0EC] text-[#6E6E6A]'
                  }`}
                >
                  1
                </span>
                <div>
                  <div
                    className={`text-[12.5px] font-medium leading-tight ${
                      bookingStep === 1 ? 'text-[#1E1E1E]' : 'text-[#6E6E6A]'
                    }`}
                  >
                    Guest & Stay Details
                  </div>
                  <div className="text-[11px] text-[#8E8E88]">
                    Guest profile, room & dates
                  </div>
                </div>
              </button>

              {/* Connecting Progress Line */}
              <div className="flex-1 h-1.5 rounded-full bg-[#EFEFEA] overflow-hidden mx-2">
                <div
                  className={`h-full transition-all duration-300 ${
                    bookingStep === 2 ? 'w-full bg-[#7463A6]' : 'w-1/2 bg-[#7463A6]/45'
                  }`}
                />
              </div>

              {/* Step 2 Node */}
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center gap-2.5 text-left cursor-pointer group"
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors shrink-0 ${
                    bookingStep === 2
                      ? 'bg-[#7463A6] text-white'
                      : 'bg-[#F0F0EC] text-[#6E6E6A]'
                  }`}
                >
                  2
                </span>
                <div>
                  <div
                    className={`text-[12.5px] font-medium leading-tight ${
                      bookingStep === 2 ? 'text-[#1E1E1E]' : 'text-[#6E6E6A]'
                    }`}
                  >
                    Payment & Confirmation
                  </div>
                  <div className="text-[11px] text-[#8E8E88]">
                    Settlement & booking status
                  </div>
                </div>
              </button>
            </div>
          </div>

          {formError && (
            <div className="p-3 rounded-[10px] bg-[#FCECE9] text-[#B93829] text-[13px] font-medium">
              {formError}
            </div>
          )}

          {bookingStep === 1 ? (
            <>
              {/* 1. Returning Guest Lookup (Searchable, Optional) */}
              {!editingBookingId && (
                <div ref={guestLookupRef} className="relative">
                  <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
                    Returning Guest Lookup
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#8E8E88] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={guestSearchQuery}
                      onFocus={() => setGuestDropdownOpen(true)}
                      onChange={(e) => {
                        setGuestSearchQuery(e.target.value);
                        setGuestDropdownOpen(true);
                        if (!e.target.value.trim()) {
                          setGuestIdInput('');
                        }
                      }}
                      placeholder="Type guest name, phone number, or email to auto-fill..."
                      className="w-full pl-9 pr-8 py-2 rounded-[10px] bg-white border border-[#E2E2DC] text-[13px] font-normal text-[#1E1E1E] placeholder:text-[#8E8E88] focus:outline-none focus:border-[#7463A6] transition-colors"
                    />
                    {(guestSearchQuery || guestIdInput) && (
                      <button
                        type="button"
                        onClick={handleClearReturningGuest}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-[6px] text-[#8E8E88] hover:text-[#1E1E1E] hover:bg-[#F6F6F4] cursor-pointer"
                        title="Clear guest selection"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {guestDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-[#E6E6E0] rounded-[11px] shadow-[0_12px_30px_rgba(0,0,0,0.1)] py-1 z-50 max-h-52 overflow-y-auto">
                      {matchingGuests.length === 0 ? (
                        <div className="px-3.5 py-2.5 text-[12.5px] font-normal text-[#6E6E6A]">
                          No returning guest match — continue entering guest details below.
                        </div>
                      ) : (
                        matchingGuests.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => handleSelectReturningGuest(g.id)}
                            className={`w-full px-3.5 py-2 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              guestIdInput === g.id
                                ? 'bg-[#F1EEF8] text-[#7463A6]'
                                : 'hover:bg-[#F6F6F4] text-[#1E1E1E]'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-[13px] font-medium truncate">
                                {g.name}{' '}
                                <span className="text-[11.5px] font-normal text-[#6E6E6A] tabular-nums">
                                  · {g.phone}
                                </span>
                              </div>
                              <div className="text-[11.5px] font-normal text-[#6E6E6A] truncate">
                                {g.email || 'No email on file'}
                              </div>
                            </div>
                            <UserCheck className="w-3.5 h-3.5 text-[#7463A6] shrink-0" />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Row 2: Full Name | Phone Number | Email */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
                    Full Name <span className="text-[#B93829]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Chidi Nwosu"
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E2E2DC] text-[13px] font-normal text-[#1E1E1E] focus:outline-none focus:border-[#7463A6]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+234 803 412 8890"
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E2E2DC] text-[13px] font-normal text-[#1E1E1E] tabular-nums focus:outline-none focus:border-[#7463A6]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="guest@company.com"
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E2E2DC] text-[13px] font-normal text-[#1E1E1E] focus:outline-none focus:border-[#7463A6]"
                  />
                </div>
              </div>

              {/* Row 3: Room Type (if any) | Room Selection | Room Rate */}
              <div
                className={`grid grid-cols-1 ${
                  roomTypes.length > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
                } gap-3.5`}
              >
                {roomTypes.length > 0 && (
                  <div>
                    <Dropdown
                      label="Room Type"
                      value={selectedRoomTypeId}
                      onChange={handleRoomTypeSelect}
                      options={[
                        { value: '', label: 'All Room Categories' },
                        ...roomTypes.map((rt) => ({
                          value: rt.id,
                          label: rt.name,
                        })),
                      ]}
                    />
                  </div>
                )}

                <div ref={roomSelectorRef} className="relative">
                  <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
                    Room Selection <span className="text-[#B93829]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setRoomDropdownOpen((o) => !o)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-[10px] bg-white border text-left transition-all cursor-pointer ${
                      roomDropdownOpen
                        ? 'border-[#7463A6] ring-2 ring-[#7463A6]/12'
                        : 'border-[#E2E2DC] hover:border-[#C8C8C0]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      {selectedRoomObj ? (
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[13px] font-medium text-[#1E1E1E] truncate">
                            Room {selectedRoomObj.roomNumber}
                          </span>
                          <span
                            className={`text-[10.5px] font-medium px-1.5 py-0.5 rounded-[5px] shrink-0 ${
                              selectedRoomAvailability.available
                                ? 'bg-[#E9F5EE] text-[#16A34A]'
                                : 'bg-[#FCECE9] text-[#B93829]'
                            }`}
                          >
                            {selectedRoomAvailability.available ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[13px] text-[#8E8E88]">Select room...</span>
                      )}
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-[#6E6E6A] shrink-0 transition-transform ${
                        roomDropdownOpen ? 'rotate-180 text-[#7463A6]' : ''
                      }`}
                    />
                  </button>

                  {roomDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-[#E6E6E0] rounded-[11px] shadow-[0_12px_30px_rgba(0,0,0,0.12)] z-50 overflow-hidden min-w-[260px]">
                      <div className="p-2 border-b border-[#F0F0EC]">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-[#8E8E88] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={roomSearchQuery}
                            onChange={(e) => setRoomSearchQuery(e.target.value)}
                            placeholder="Search room number..."
                            className="w-full pl-8 pr-3 py-1.5 rounded-[8px] bg-[#FAF9F6] border border-[#E2E2DC] text-[12.5px] font-normal text-[#1E1E1E] focus:outline-none focus:border-[#7463A6]"
                          />
                        </div>
                      </div>
                      <div className="max-h-56 overflow-y-auto divide-y divide-[#F5F5F2]">
                        {roomOptionsWithAvailability.length === 0 ? (
                          <div className="px-3 py-2.5 text-[12px] text-[#6E6E6A]">
                            No rooms found in this category.
                          </div>
                        ) : (
                          roomOptionsWithAvailability.map((opt) => {
                            const isSelected = opt.room.id === roomId;
                            return (
                              <button
                                key={opt.room.id}
                                type="button"
                                onClick={() => handleRoomSelect(opt.room.id)}
                                className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#F1EEF8]'
                                    : opt.available
                                    ? 'hover:bg-[#F6F6F4]'
                                    : 'bg-[#FAF9F6]/70 hover:bg-[#F6F6F4]'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="text-[13px] font-medium text-[#1E1E1E] truncate">
                                    Room {opt.room.roomNumber}{' '}
                                    <span className="text-[12px] font-normal text-[#6E6E6A] tabular-nums">
                                      ({formatCurrency(opt.room.rate, sym)})
                                    </span>
                                  </div>
                                  <div
                                    className={`text-[11px] font-normal truncate ${
                                      opt.available ? 'text-[#16A34A]' : 'text-[#B93829]'
                                    }`}
                                  >
                                    {opt.reason}
                                  </div>
                                </div>
                                <span
                                  className={`text-[10.5px] font-medium px-2 py-0.5 rounded-[6px] shrink-0 ${
                                    opt.available
                                      ? 'bg-[#E9F5EE] text-[#16A34A]'
                                      : 'bg-[#FCECE9] text-[#B93829]'
                                  }`}
                                >
                                  {opt.available ? 'Available' : 'Conflict'}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
                    Room Rate
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={roomRate}
                    onChange={(e) => setRoomRate(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-[10px] border border-[#E2E2DC] text-[13px] font-normal text-[#1E1E1E] tabular-nums focus:outline-none focus:border-[#7463A6]"
                  />
                </div>
              </div>

              {/* Row 4: Number of Nights | Check-in Date | Check-in Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
                    Number of Nights
                  </label>
                  <div className="flex items-center rounded-[10px] border border-[#E2E2DC] bg-white overflow-hidden focus-within:border-[#7463A6]">
                    <button
                      type="button"
                      onClick={() => handleDurationChange(computedNights - 1)}
                      disabled={computedNights <= 1}
                      className="px-2.5 py-2 text-[#4A4A46] hover:bg-[#F6F6F4] disabled:opacity-35 transition-colors cursor-pointer"
                      aria-label="Decrease nights"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={computedNights}
                      onChange={(e) => handleDurationChange(Number(e.target.value))}
                      className="w-full text-center py-2 text-[13px] font-medium text-[#1E1E1E] tabular-nums focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleDurationChange(computedNights + 1)}
                      className="px-2.5 py-2 text-[#4A4A46] hover:bg-[#F6F6F4] transition-colors cursor-pointer"
                      aria-label="Increase nights"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <CustomSingleDatePicker
                  label="Check-in Date"
                  required
                  value={checkInDate}
                  onChange={handleCheckInDateChange}
                />

                <CustomTimePicker
                  label="Check-in Time"
                  value={checkInTime}
                  onChange={setCheckInTime}
                  optional={true}
                  placeholder="Select time"
                  align="right"
                />
              </div>

              {/* Row 5: Check-out Date | Check-out Time | Spacer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <CustomSingleDatePicker
                  label="Check-out Date"
                  required
                  value={checkOutDate}
                  minDate={addDays(checkInDate, 1)}
                  onChange={handleCheckOutDateChange}
                />

                <CustomTimePicker
                  label="Check-out Time"
                  value={checkOutTime}
                  onChange={setCheckOutTime}
                  optional={true}
                  placeholder="Select time"
                />

                <div className="hidden sm:block" />
              </div>

              {/* Step 1 Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#EFEFEA]">
                <div className="flex items-center gap-2.5">
                  <span className="text-[13px] text-[#6E6E6A]">Estimated Total:</span>
                  <span className="text-[17px] font-semibold text-[#1E1E1E] tabular-nums">
                    {formatCurrency(computedTotal, sym)}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 rounded-[10px] text-[13px] font-normal text-[#4A4A46] bg-[#F6F6F4] hover:bg-[#EAEAE4] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-5 py-2 rounded-[10px] text-[13px] font-medium text-white bg-[#7463A6] hover:bg-[#635394] transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Step 2: Stay & Billing Summary Banner */}
              <div className="p-4 rounded-[12px] bg-[#FAF9F6] border border-[#E6E6E0] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11.5px] text-[#6E6E6A]">Guest</div>
                    <div className="text-[14px] font-semibold text-[#1E1E1E]">
                      {guestName || 'Guest'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11.5px] text-[#6E6E6A]">Assigned Room</div>
                    <div className="text-[14px] font-semibold text-[#1E1E1E]">
                      {selectedRoomObj ? `Room ${selectedRoomObj.roomNumber}` : '—'}
                    </div>
                  </div>
                </div>
                <div className="pt-2.5 border-t border-[#EFEFEA] flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-[#4A4A46]">
                  <span>
                    {formatDateReadable(checkInDate)} → {formatDateReadable(checkOutDate)} (
                    {computedNights} {computedNights === 1 ? 'night' : 'nights'})
                  </span>
                  <span className="tabular-nums">
                    Rate: {formatCurrency(roomRate, sym)} / night
                  </span>
                </div>
              </div>

              {/* Payment Method | Payment Status | Booking Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <Dropdown
                  label="Payment Method"
                  value={paymentMethod}
                  onChange={(v) => setPaymentMethod(v as PaymentMethod)}
                  options={BOOKING_PAYMENT_METHODS.map((pm) => ({ value: pm, label: pm }))}
                />

                <Dropdown
                  label="Payment Status"
                  value={paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'}
                  onChange={(v) => setPaymentStatus(v as PaymentStatus)}
                  options={[
                    { value: 'Paid', label: 'Paid' },
                    { value: 'Unpaid', label: 'Unpaid' },
                  ]}
                />

                <Dropdown
                  label="Booking Status"
                  value={bookingStatus}
                  onChange={(v) => setBookingStatus(v as BookingStatus)}
                  options={[
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Confirmed', label: 'Confirmed' },
                    { value: 'Checked In', label: 'Checked In' },
                    { value: 'Checked Out', label: 'Checked Out' },
                    { value: 'Cancelled', label: 'Cancelled' },
                  ]}
                />
              </div>

              {/* Step 2 Footer: Total Amount, Back & Confirm Booking */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#EFEFEA]">
                <div className="flex items-center gap-2.5">
                  <span className="text-[13px] text-[#6E6E6A]">Total Amount:</span>
                  <span className="text-[18px] font-semibold text-[#1E1E1E] tabular-nums">
                    {formatCurrency(computedTotal, sym)}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBookingStep(1)}
                    className="px-4 py-2 rounded-[10px] text-[13px] font-medium text-[#4A4A46] bg-[#F6F6F4] hover:bg-[#EAEAE4] transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-[10px] text-[13px] font-medium text-white bg-[#7463A6] hover:bg-[#635394] transition-colors cursor-pointer"
                  >
                    {editingBookingId ? 'Save Changes' : 'Confirm Booking'}
                  </button>
                </div>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) deleteBooking(deleteTargetId);
        }}
        title="Delete Booking Record"
        description={`Are you sure you want to permanently delete reservation ${deleteTargetId}? This action will remove it from both the booking table and timeline.`}
        confirmLabel="Delete Booking"
      />
    </div>
  );
};
