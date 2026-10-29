import type { AppointmentInput } from '../types/appointment.types';

import Appointment from '../models/appointment.model';
import Availability from '../models/availability.model';
import Doctor from '../models/doctor.model';

type AppointmentData = AppointmentInput;

const create = async (data: AppointmentData) => {
  const doc = await Appointment.create(data);
  return Appointment.findById(doc._id)
    .populate('client')
    .populate({ path: 'availability', populate: { path: 'doctor' } });
};

const getAll = async () =>
  Appointment.find()
    .populate('client')
    .populate({ path: 'availability', populate: { path: 'doctor' } });
const getById = async (id: string) =>
  Appointment.findById(id)
    .populate('client')
    .populate({ path: 'availability', populate: { path: 'doctor' } });
const update = async (id: string, data: AppointmentData) =>
  Appointment.findByIdAndUpdate(id, data, { new: true })
    .populate('client')
    .populate({ path: 'availability', populate: { path: 'doctor' } });
const remove = async (id: string) => Appointment.findByIdAndDelete(id);

const getNextConfirmedAppointment = async (clientId: string) =>
  Appointment.findOne({
    client: clientId,
    confirmed: true,
    status: 'scheduled',
    date: { $gt: new Date() }, // Filtro para obtener solo citas futuras
  })
    .sort({ date: 1 })
    .populate('client')
    .populate({ path: 'availability', populate: { path: 'doctor' } });

const cancelConfirmedAppointment = async (clientId: string) =>
  Appointment.findOneAndUpdate(
    { client: clientId, confirmed: true, status: 'scheduled' },
    { confirmed: false, status: 'cancelled' },
    { sort: { date: 1 }, new: true }
  )
    .populate('client')
    .populate({ path: 'availability', populate: { path: 'doctor' } });

/**
 * Generates free appointment slots from the active availabilities of one doctor, or of every doctor when no doctor is given.
 * Slots that already exist for the doctor (same start date) are skipped, so running it twice does not duplicate them.
 */
const generateAppointmentsFromAvailability = async (doctorId: string | undefined, weeks: number) => {
  const doctorIds: string[] = doctorId
    ? [doctorId]
    : (await Availability.distinct('doctor', { active: true })).map((id) => String(id));

  const created: Array<Awaited<ReturnType<typeof generateForDoctor>>[number]> = [];
  for (const id of doctorIds) {
    created.push(...(await generateForDoctor(id, weeks)));
  }
  return created;
};

const getAnyAvailabilityIdsForDoctor = async (doctorId: string) => {
  const availabilities = await Availability.find({ doctor: doctorId });
  return availabilities.map((availability) => availability._id);
};

const generateForDoctor = async (doctorId: string, weeks: number) => {
  const availabilities = await Availability.find({ doctor: doctorId, active: true });
  const appointmentsToCreate = [] as Array<Record<string, unknown>>;
  const now = new Date();

  // Appointments have no doctor field, so existing slots are looked up through every availability of the doctor.
  const existing = await Appointment.find({
    availability: { $in: await getAnyAvailabilityIdsForDoctor(doctorId) },
    date: { $gte: now },
  }).select('date');
  const existingTimes = new Set(existing.map((appointment) => new Date(appointment.date).getTime()));

  for (const availability of availabilities) {
    const { dayOfWeek, startHour, endHour, duration } = availability as {
      dayOfWeek: number;
      startHour: string;
      endHour: string;
      duration: number;
      _id: unknown;
    };
    for (let week = 0; week < weeks; week++) {
      const baseDate = new Date(now);
      const currentDay = baseDate.getDay();
      let daysToAdd = ((dayOfWeek - currentDay + 7) % 7) + week * 7;
      if (daysToAdd === 0 && week === 0 && now.getHours() > parseInt(startHour.split(':')[0], 10)) {
        daysToAdd += 7;
      }

      const appointmentDate = new Date(baseDate.setDate(baseDate.getDate() + daysToAdd));
      const [startHourNum, startMin] = startHour.split(':').map(Number);
      appointmentDate.setHours(startHourNum, startMin, 0, 0);

      let slotStart = new Date(appointmentDate);
      const [endHourNum, endMin] = endHour.split(':').map(Number);
      const slotEnd = new Date(appointmentDate);
      slotEnd.setHours(endHourNum, endMin, 0, 0);

      while (slotStart.getTime() + duration * 60000 <= slotEnd.getTime()) {
        const hour = `${String(slotStart.getHours()).padStart(2, '0')}:${String(slotStart.getMinutes()).padStart(2, '0')}`;
        const time = slotStart.getTime();
        if (!existingTimes.has(time)) {
          existingTimes.add(time);
          appointmentsToCreate.push({
            doctor: doctorId,
            date: new Date(slotStart),
            hour,
            duration,
            status: 'available',
            confirmed: false,
            availability: availability._id,
          });
        }

        slotStart = new Date(slotStart.getTime() + (duration + 10) * 60000);
      }
    }
  }

  if (appointmentsToCreate.length === 0) {
    return [];
  }

  return Appointment.insertMany(appointmentsToCreate);
};

const getAvailabilityById = async (availabilityId: string) => Availability.findById(availabilityId);

const getAvailabilityIdsForDoctor = async (doctorId: string) => {
  const availabilities = await Availability.find({ doctor: doctorId, active: true });
  if (!availabilities || availabilities.length === 0) {
    return [];
  }

  return availabilities.map((availability) => availability._id);
};

const getFreeAppointmentsForDoctorAndDate = async (doctorId: string, date: string | Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  const now = new Date();

  await Appointment.updateMany(
    {
      availability: { $in: await getAvailabilityIdsForDoctor(doctorId) },
      date: { $lt: now },
      free: true,
      client: null,
    },
    { free: false }
  );

  return Appointment.find({
    availability: { $in: await getAvailabilityIdsForDoctor(doctorId) },
    client: null,
    free: true,
    date: { $gte: start, $lte: end },
  }).sort({ date: 1 });
};

const getAllFreeAppointmentsForDoctor = async (doctorId: string) => {
  const now = new Date();

  await Appointment.updateMany(
    {
      availability: { $in: await getAvailabilityIdsForDoctor(doctorId) },
      date: { $lt: now },
      free: true,
      client: null,
    },
    { free: false }
  );

  return Appointment.find({
    availability: { $in: await getAvailabilityIdsForDoctor(doctorId) },
    client: null,
    free: true,
    date: { $gte: now },
  }).sort({ date: 1 });
};

const getAllConfirmedAppointmentsForClient = async (clientId: string) =>
  Appointment.find({
    client: clientId,
    confirmed: true,
    status: 'scheduled',
  })
    .sort({ date: 1 })
    .populate({ path: 'availability', populate: { path: 'doctor' } });

/**
 * Atomically books a free future slot. Returns null if the slot was already taken.
 */
const claimFreeAppointment = async (appointmentId: string, clientId: string) =>
  Appointment.findOneAndUpdate(
    { _id: appointmentId, free: true, client: null, date: { $gte: new Date() } },
    { client: clientId, free: false, confirmed: true, status: 'scheduled' },
    { new: true }
  ).populate({ path: 'availability', populate: { path: 'doctor' } });

/**
 * Cancels a future confirmed appointment that belongs to the client and frees the slot.
 * Returns null if the appointment does not match.
 */
const cancelOwnedAppointment = async (appointmentId: string, clientId: string) =>
  Appointment.findOneAndUpdate(
    {
      _id: appointmentId,
      client: clientId,
      confirmed: true,
      status: 'scheduled',
      date: { $gt: new Date() },
    },
    { confirmed: false, status: 'cancelled', free: true, client: null },
    { new: true }
  ).populate({ path: 'availability', populate: { path: 'doctor' } });

/**
 * Marks the client's confirmed appointments in the past as cancelled.
 * Returns the number of updated appointments.
 */
const cancelPastAppointments = async (clientId: string) => {
  const result = await Appointment.updateMany(
    {
      client: clientId,
      confirmed: true,
      status: 'scheduled',
      date: { $lte: new Date() },
    },
    { confirmed: false, status: 'cancelled' }
  );
  return result.modifiedCount;
};

export interface DoctorWithFreeSlots {
  id: string;
  name: string;
  specialty?: string;
  freeSlots: Array<{ id: string; date: Date }>;
}

interface GroupedFreeSlots {
  _id: unknown;
  slots: Array<{ id: unknown; date: Date }>;
}

/**
 * Returns every doctor with its free future slots, using one aggregate query instead of one query per doctor.
 * Doctors without free slots are included with an empty list.
 */
const getDoctorsWithFreeSlots = async (): Promise<DoctorWithFreeSlots[]> => {
  const now = new Date();

  await Appointment.updateMany(
    { date: { $lt: now }, free: true, client: null },
    { free: false }
  );

  const grouped = await Appointment.aggregate<GroupedFreeSlots>([
    { $match: { client: null, free: true, date: { $gte: now } } },
    { $sort: { date: 1 } },
    {
      $lookup: {
        from: Availability.collection.name,
        localField: 'availability',
        foreignField: '_id',
        as: 'availability',
      },
    },
    { $unwind: '$availability' },
    { $match: { 'availability.active': true } },
    {
      $group: {
        _id: '$availability.doctor',
        slots: { $push: { id: '$_id', date: '$date' } },
      },
    },
  ]);

  const slotsByDoctor = new Map(
    grouped.map((group) => {
      const seen = new Set<number>();
      const slots = group.slots
        .map((slot) => ({ id: String(slot.id), date: new Date(slot.date) }))
        .filter((slot) => {
          const time = slot.date.getTime();
          if (seen.has(time)) {
            return false;
          }
          seen.add(time);
          return true;
        });
      return [String(group._id), slots] as const;
    })
  );

  const doctors = await Doctor.find();

  return doctors.map((doctor) => {
    const id = String(doctor._id);
    return {
      id,
      name: String(doctor.name),
      specialty: doctor.specialty ? String(doctor.specialty) : undefined,
      freeSlots: slotsByDoctor.get(id) ?? [],
    };
  });
};

export default {
  create,
  getAll,
  getById,
  update,
  remove,
  getNextConfirmedAppointment,
  cancelConfirmedAppointment,
  generateAppointmentsFromAvailability,
  getFreeAppointmentsForDoctorAndDate,
  getAllFreeAppointmentsForDoctor,
  getAllConfirmedAppointmentsForClient,
  getAvailabilityById,
  claimFreeAppointment,
  cancelOwnedAppointment,
  cancelPastAppointments,
  getDoctorsWithFreeSlots,
};
