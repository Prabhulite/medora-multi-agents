import { api } from '../../lib/api';

interface Envelope<T> { data: T }
export interface AmbulanceVehicle { id: number; code: string; registrationNumber: string; name: string; isActive: boolean; available: boolean }
export interface AmbulanceDriver { id: number; recordId: number; fullName: string; employeeId: string | null; licenseNumber: string; licenseValidUntil: string; isActive: boolean; available: boolean }
export interface AmbulanceStaff { id: number; fullName: string; employeeId: string | null }
export type TripStatus = 'assigned' | 'en_route' | 'on_scene' | 'transporting' | 'completed' | 'cancelled';
export interface AmbulanceTrip { id: number; tripNumber: string; vehicleId: number; vehicle: AmbulanceVehicle; driverId: number; driver: AmbulanceDriver; patientId: number | null; patient: { id: number; fullName: string; mrdNumber: string } | null; pickupLocation: string; destination: string; status: TripStatus; notes: string | null; closureNote: string | null; dispatchedAt: string; departedAt: string | null; sceneAt: string | null; transportingAt: string | null; closedAt: string | null }
export interface DispatchPayload { vehicleId: number; driverId: number; patientId?: number | null; pickupLocation: string; destination: string; notes?: string | null }
export const ambulanceApi = {
  vehicles: async () => (await api.get<Envelope<AmbulanceVehicle[]>>('/ambulance/vehicles')).data.data,
  createVehicle: async (payload: { code: string; registrationNumber: string; name: string }) => (await api.post<Envelope<AmbulanceVehicle>>('/ambulance/vehicles', payload)).data.data,
  updateVehicle: async (id: number, payload: { isActive: boolean }) => (await api.patch<Envelope<AmbulanceVehicle>>(`/ambulance/vehicles/${id}`, payload)).data.data,
  drivers: async () => (await api.get<Envelope<AmbulanceDriver[]>>('/ambulance/drivers')).data.data,
  staff: async () => (await api.get<Envelope<AmbulanceStaff[]>>('/ambulance/staff')).data.data,
  registerDriver: async (payload: { staffId: number; licenseNumber: string; licenseValidUntil: string }) => (await api.post<Envelope<unknown>>('/ambulance/drivers', payload)).data.data,
  updateDriver: async (recordId: number, payload: { isActive?: boolean; licenseValidUntil?: string }) => (await api.patch<Envelope<unknown>>(`/ambulance/drivers/${recordId}`, payload)).data.data,
  trips: async () => (await api.get<Envelope<AmbulanceTrip[]>>('/ambulance/trips')).data.data,
  dispatch: async (payload: DispatchPayload) => (await api.post<Envelope<AmbulanceTrip>>('/ambulance/trips', payload)).data.data,
  status: async (id: number, status: Exclude<TripStatus, 'assigned'>, closureNote?: string) => (await api.patch<Envelope<AmbulanceTrip>>(`/ambulance/trips/${id}/status`, { status, closureNote })).data.data,
};
