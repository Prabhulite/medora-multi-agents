import { AppDataSource } from '../../../config/data-source.js';
import { AmbulanceDriver, AmbulanceTrip, AmbulanceVehicle, Patient, User } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js';
import { nextSequenceNumber } from '../../patients/services/number-sequence.service.js';
import type { CreateTripInput, RegisterDriverInput, TripListQuery, TripStatusInput, UpdateDriverInput, VehicleInput, VehicleUpdateInput } from '../validators/ambulance.validators.js';

const activeStatuses: AmbulanceTrip['status'][] = ['assigned', 'en_route', 'on_scene', 'transporting'];
const localDate = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const relations = { vehicle: true, driver: true, patient: true, dispatchedBy: true, updatedBy: true } as const;
function tripResponse(trip: AmbulanceTrip) {
  const { driver, patient, dispatchedBy, updatedBy, ...fields } = trip;
  return { ...fields, driver: driver ? { id: driver.id, fullName: driver.fullName, employeeId: driver.employeeId } : null, patient: patient ? { id: patient.id, fullName: [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' '), mrdNumber: patient.mrdNumber } : null, dispatchedBy: dispatchedBy ? { fullName: dispatchedBy.fullName } : null, updatedBy: updatedBy ? { fullName: updatedBy.fullName } : null };
}
function duplicateResource(error: unknown): never {
  if (error && typeof error === 'object' && 'driverError' in error && error.driverError && typeof error.driverError === 'object' && 'code' in error.driverError && error.driverError.code === 'ER_DUP_ENTRY') throw new ConflictError('Vehicle or driver registration already exists');
  throw error;
}

export const ambulanceService = {
  async vehicles() {
    const [vehicles, active] = await Promise.all([AppDataSource.getRepository(AmbulanceVehicle).find({ order: { code: 'ASC' } }), AppDataSource.getRepository(AmbulanceTrip).createQueryBuilder('trip').select('trip.vehicle_id', 'vehicleId').where('trip.status IN (:...statuses)', { statuses: activeStatuses }).getRawMany<{ vehicleId: number }>()]);
    const busy = new Set(active.map((row) => Number(row.vehicleId)));
    return vehicles.map((vehicle) => ({ ...vehicle, available: vehicle.isActive && !busy.has(vehicle.id) }));
  },
  async createVehicle(input: VehicleInput) {
    const repo = AppDataSource.getRepository(AmbulanceVehicle);
    const code = input.code.toUpperCase(); const registrationNumber = input.registrationNumber.toUpperCase();
    if (await repo.exist({ where: [{ code }, { registrationNumber }] })) throw new ConflictError('Vehicle code or registration already exists');
    try { return await repo.save(repo.create({ code, registrationNumber, name: input.name, isActive: true })); }
    catch (error) { return duplicateResource(error); }
  },
  async updateVehicle(id: number, input: VehicleUpdateInput) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(AmbulanceVehicle);
      const vehicle = await repo.createQueryBuilder('vehicle').setLock('pessimistic_write').where('vehicle.id = :id', { id }).getOne();
      if (!vehicle) throw new NotFoundError('Vehicle not found');
      if (input.isActive === false && await manager.getRepository(AmbulanceTrip).createQueryBuilder('trip').where('trip.vehicle_id = :id AND trip.status IN (:...statuses)', { id, statuses: activeStatuses }).getExists()) throw new ConflictError('Cannot deactivate a vehicle on an active trip');
      const code = input.code?.toUpperCase(); const registrationNumber = input.registrationNumber?.toUpperCase();
      if ((code && code !== vehicle.code && await repo.exist({ where: { code } })) || (registrationNumber && registrationNumber !== vehicle.registrationNumber && await repo.exist({ where: { registrationNumber } }))) throw new ConflictError('Vehicle code or registration already exists');
      if (code) vehicle.code = code;
      if (registrationNumber) vehicle.registrationNumber = registrationNumber;
      if (input.name !== undefined) vehicle.name = input.name;
      if (input.isActive !== undefined) vehicle.isActive = input.isActive;
      try { return await repo.save(vehicle); }
      catch (error) { return duplicateResource(error); }
    });
  },
  async drivers() {
    const records = await AppDataSource.getRepository(AmbulanceDriver).find({ relations: { staff: true }, order: { id: 'ASC' } });
    const active = await AppDataSource.getRepository(AmbulanceTrip).createQueryBuilder('trip').select('trip.driver_id', 'driverId').where('trip.status IN (:...statuses)', { statuses: activeStatuses }).getRawMany<{ driverId: number }>();
    const busy = new Set(active.map((row) => Number(row.driverId)));
    return records.map((record) => ({ id: record.staffId, recordId: record.id, fullName: record.staff.fullName, employeeId: record.staff.employeeId, licenseNumber: record.licenseNumber, licenseValidUntil: record.licenseValidUntil, isActive: record.isActive, available: record.isActive && record.staff.isActive && record.licenseValidUntil >= localDate() && !busy.has(record.staffId) }));
  },
  async staffCandidates() {
    return (await AppDataSource.getRepository(User).find({ where: { isActive: true }, order: { fullName: 'ASC' } })).map((user) => ({ id: user.id, fullName: user.fullName, employeeId: user.employeeId }));
  },
  async registerDriver(input: RegisterDriverInput) {
    return AppDataSource.transaction(async (manager) => {
      const staff = await manager.getRepository(User).createQueryBuilder('staff').setLock('pessimistic_write').where('staff.id = :id', { id: input.staffId }).getOne();
      if (!staff || !staff.isActive) throw new NotFoundError('Active staff member not found');
      const repo = manager.getRepository(AmbulanceDriver);
      if (await repo.exist({ where: [{ staffId: input.staffId }, { licenseNumber: input.licenseNumber.toUpperCase() }] })) throw new ConflictError('Driver or license is already registered');
      try { return await repo.save(repo.create({ staffId: input.staffId, licenseNumber: input.licenseNumber.toUpperCase(), licenseValidUntil: input.licenseValidUntil, isActive: true })); }
      catch (error) { return duplicateResource(error); }
    });
  },
  async updateDriver(id: number, input: UpdateDriverInput) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(AmbulanceDriver);
      const record = await repo.findOne({ where: { id } });
      if (!record) throw new NotFoundError('Driver registration not found');
      await manager.getRepository(User).createQueryBuilder('staff').setLock('pessimistic_write').where('staff.id = :id', { id: record.staffId }).getOne();
      const locked = await repo.createQueryBuilder('driver').setLock('pessimistic_write').where('driver.id = :id', { id }).getOne();
      if (!locked) throw new NotFoundError('Driver registration not found');
      if (input.isActive === false && await manager.getRepository(AmbulanceTrip).createQueryBuilder('trip').where('trip.driver_id = :staffId AND trip.status IN (:...statuses)', { staffId: locked.staffId, statuses: activeStatuses }).getExists()) throw new ConflictError('Cannot deactivate a driver on an active trip');
      if (input.licenseNumber) {
        const licenseNumber = input.licenseNumber.toUpperCase();
        if (licenseNumber !== locked.licenseNumber && await repo.exist({ where: { licenseNumber } })) throw new ConflictError('License is already registered');
        locked.licenseNumber = licenseNumber;
      }
      if (input.licenseValidUntil) locked.licenseValidUntil = input.licenseValidUntil;
      if (input.isActive !== undefined) locked.isActive = input.isActive;
      try { return await repo.save(locked); }
      catch (error) { return duplicateResource(error); }
    });
  },
  async trips(query: TripListQuery) {
    return (await AppDataSource.getRepository(AmbulanceTrip).find({ where: { ...(query.status ? { status: query.status } : {}), ...(query.patientId ? { patientId: query.patientId } : {}) }, relations, order: { dispatchedAt: 'DESC' }, take: 200 })).map(tripResponse);
  },
  async dispatch(input: CreateTripInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const vehicle = await manager.getRepository(AmbulanceVehicle).createQueryBuilder('vehicle').setLock('pessimistic_write').where('vehicle.id = :id', { id: input.vehicleId }).getOne();
      if (!vehicle || !vehicle.isActive) throw new NotFoundError('Active ambulance vehicle not found');
      const driver = await manager.getRepository(User).createQueryBuilder('driver').setLock('pessimistic_write').where('driver.id = :id', { id: input.driverId }).getOne();
      if (!driver || !driver.isActive) throw new NotFoundError('Active driver not found');
      const registration = await manager.getRepository(AmbulanceDriver).findOne({ where: { staffId: driver.id, isActive: true } });
      if (!registration || registration.licenseValidUntil < localDate()) throw new ConflictError('Driver registration is inactive or expired');
      if (input.patientId && !(await manager.getRepository(Patient).exist({ where: { id: input.patientId, isActive: true } }))) throw new NotFoundError('Active patient not found');
      const conflict = await manager.getRepository(AmbulanceTrip).createQueryBuilder('trip').where('(trip.vehicle_id = :vehicleId OR trip.driver_id = :driverId) AND trip.status IN (:...statuses)', { vehicleId: vehicle.id, driverId: driver.id, statuses: activeStatuses }).getOne();
      if (conflict) throw new ConflictError(conflict.vehicleId === vehicle.id ? 'Vehicle already has an active trip' : 'Driver already has an active trip');
      const trip = await manager.getRepository(AmbulanceTrip).save(manager.getRepository(AmbulanceTrip).create({ tripNumber: await nextSequenceNumber(manager, 'AMB', 'AMB', 6), vehicleId: vehicle.id, driverId: driver.id, patientId: input.patientId ?? null, pickupLocation: input.pickupLocation, destination: input.destination, notes: input.notes ?? null, status: 'assigned', dispatchedAt: new Date(), dispatchedById: userId }));
      return tripResponse((await manager.getRepository(AmbulanceTrip).findOne({ where: { id: trip.id }, relations }))!);
    });
  },
  async status(id: number, input: TripStatusInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const lookup = await manager.getRepository(AmbulanceTrip).findOne({ where: { id } });
      if (!lookup) throw new NotFoundError('Ambulance trip not found');
      await manager.getRepository(AmbulanceVehicle).createQueryBuilder('vehicle').setLock('pessimistic_write').where('vehicle.id = :id', { id: lookup.vehicleId }).getOne();
      await manager.getRepository(User).createQueryBuilder('driver').setLock('pessimistic_write').where('driver.id = :id', { id: lookup.driverId }).getOne();
      const repo = manager.getRepository(AmbulanceTrip);
      const trip = await repo.createQueryBuilder('trip').setLock('pessimistic_write').where('trip.id = :id', { id }).getOne();
      if (!trip) throw new NotFoundError('Ambulance trip not found');
      const next: Record<string, AmbulanceTrip['status']> = { assigned: 'en_route', en_route: 'on_scene', on_scene: 'transporting', transporting: 'completed' };
      if (input.status !== 'cancelled' && next[trip.status] !== input.status) throw new ConflictError('Invalid ambulance trip status transition');
      if (input.status === 'cancelled' && !activeStatuses.includes(trip.status)) throw new ConflictError('Trip is already closed');
      trip.status = input.status; trip.updatedById = userId;
      const now = new Date();
      if (input.status === 'en_route') trip.departedAt = now;
      if (input.status === 'on_scene') trip.sceneAt = now;
      if (input.status === 'transporting') trip.transportingAt = now;
      if (input.status === 'completed' || input.status === 'cancelled') { trip.closedAt = now; trip.closureNote = input.closureNote ?? null; }
      await repo.save(trip);
      return tripResponse((await repo.findOne({ where: { id }, relations }))!);
    });
  },
};
