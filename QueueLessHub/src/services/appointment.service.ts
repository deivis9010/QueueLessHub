import type { AppointmentInput } from '../types/appointment.types';

import Appointment from '../models/appointment.model';
import Availability from '../models/availability.model';

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

const generateAppointmentsFromAvailability = async (doctorId: string, weeks: number) => {
  const availabilities = await Availability.find({ doctor: doctorId, active: true });
  const appointmentsToCreate = [] as Array<Record<string, unknown>>;
  const now = new Date();

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
        appointmentsToCreate.push({
          doctor: doctorId,
          date: new Date(slotStart),
          hour,
          duration,
          status: 'available',
          confirmed: false,
          availability: availability._id,
        });

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
  }).sort({ date: 1 });

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
};
