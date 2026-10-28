export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  staffId?: string;
  department?: string;
  designation?: string;
  role: 'guest' | 'vip' | 'staff' | 'dept_admin' | 'superadmin';
  status: 'active' | 'suspended';
  isDeptAdmin?: boolean;
  adminDepartment?: string;
  preferences?: string[];
  createdAt?: string;
  lastLogin?: string;
  isSuperAdmin?: boolean;
  mustChangePassword?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
  redirectUrl?: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  vipUsers: number;
  guestUsers: number;
  totalServices?: number;
  totalBookings?: number;
  totalRevenue?: number;
}

export interface MongoInfo {
  status: string;
  readyState: number;
  database: string;
  host: string;
  uptime: number;
}

export interface VerifiedStaffMember {
  _id: string;
  srNo: number;
  staffId: string;
  name: string;
  department: string;
  designation: string;
  dateOfJoining: string;
  email: string;
  phone: string;
  category: string;
  isRegistered: boolean;
  registeredUserId?: string | null;
  createdAt?: string;
}

export interface VerifiedStaffStats {
  total: number;
  registered: number;
  pending: number;
  categories: {
    name: string;
    count: number;
    registered: number;
  }[];
}

export interface LeisureServiceItem {
  _id: string;
  title: string;
  category: 'Wellness & Spa' | 'Culinary & Dining' | 'Adventure & Water' | 'VIP Entertainment' | 'Sports & Golf' | string;
  price: number;
  duration: string;
  capacity: number;
  description: string;
  perks: string[];
  image: string;
  available: boolean;
  rating: number;
}

export interface GuestRequestItem {
  _id: string;
  user?: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  designation?: string;
  institution?: string;
  purposeOfVisit?: string;
  referenceCode: string;
  clearanceStatus?: 'pending' | 'approved' | 'rejected';
  clearedBy?: string;
  clearanceNotes?: string;
  clearedAt?: string;
  accommodation?: {
    selected: boolean;
    checkInDate?: string;
    checkOutDate?: string;
    roomType?: string;
    guestsCount?: number;
    specialRequests?: string;
    allocatedRoom?: string;
    assignedBy?: string;
    status?: 'pending' | 'allocated' | 'completed' | 'cancelled';
    adminNotes?: string;
  };
  food?: {
    selected: boolean;
    dietaryPreference?: 'Vegetarian' | 'Non-Vegetarian' | 'Jain' | 'Vegan' | 'Other' | string;
    mealsRequired?: string[];
    specialDietaryNotes?: string;
    cateringStatus?: 'pending' | 'arranged' | 'completed' | 'cancelled';
    assignedBy?: string;
    adminNotes?: string;
  };
  transport?: {
    selected: boolean;
    pickupLocation?: string;
    dropLocation?: string;
    pickupDateTime?: string;
    passengers?: number;
    vehiclePreference?: string;
    allocatedVehicle?: string;
    allocatedDriver?: string;
    driverPhone?: string;
    status?: 'pending' | 'assigned' | 'in_transit' | 'completed' | 'cancelled';
    assignedBy?: string;
    adminNotes?: string;
  };
  leisure?: {
    selected: boolean;
    activities?: string[];
    preferredDates?: string;
    specialRequests?: string;
    status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    assignedBy?: string;
    adminNotes?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

