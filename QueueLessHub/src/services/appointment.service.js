/**
 * Obtiene una disponibilidad por su ID.
 * @param {String} availabilityId - ID de la disponibilidad.
 * @returns {Promise<Object|null>} - La disponibilidad encontrada o null.
 */
const getAvailabilityById = async (availabilityId) => {
  return Availability.findById(availabilityId);
};
const Appointment = require('../models/appointment.model');
const Availability = require('../models/availability.model');

const create = async (data) => Appointment.create(data);
const getAll = async () => Appointment.find();
const getById = async (id) => Appointment.findById(id);
const update = async (id, data) => Appointment.findByIdAndUpdate(id, data, { new: true });
const remove = async (id) => Appointment.findByIdAndDelete(id);
const getNextConfirmedAppointment = async (clientId) =>
    Appointment.findOne({ client: clientId, confirmed: true, status: 'scheduled' }).sort({ date: 1 });
const cancelConfirmedAppointment = async (clientId) =>
    Appointment.findOneAndUpdate(
        { client: clientId, confirmed: true, status: 'scheduled' },
        { confirmed: false, status: 'cancelled' },
        { sort: { date: 1 }, new: true }
    );

    /**
     * Genera citas para un doctor basado en sus disponibilidades activas.
     * @param {String} doctorId - ID del doctor.
     * @param {Number} weeks - Número de semanas a programar.
     * @returns {Promise<Array>} - Citas creadas.
     */
    const generateAppointmentsFromAvailability = async (doctorId, weeks) => {
        const availabilities = await Availability.find({ doctor: doctorId, active: true });
        const appointmentsToCreate = [];
        const now = new Date();

        for (const availability of availabilities) {
            const { dayOfWeek, startHour, endHour, duration } = availability; // startHour/endHour formato "HH:mm"
            for (let w = 0; w < weeks; w++) {
                const baseDate = new Date(now);
                const currentDay = baseDate.getDay();
                let daysToAdd = (dayOfWeek - currentDay + 7) % 7 + (w * 7);
                if (
                    daysToAdd === 0 &&
                    w === 0 &&
                    now.getHours() > parseInt(startHour.split(':')[0])
                ) {
                    daysToAdd += 7;
                }
                const appointmentDate = new Date(baseDate.setDate(baseDate.getDate() + daysToAdd));
                // Setear la hora de inicio
                const [startHourNum, startMin] = startHour.split(':').map(Number);
                appointmentDate.setHours(startHourNum, startMin, 0, 0);

                // Calcular los slots de citas
                let slotStart = new Date(appointmentDate);
                const [endHourNum, endMin] = endHour.split(':').map(Number);
                const slotEnd = new Date(appointmentDate);
                slotEnd.setHours(endHourNum, endMin, 0, 0);

                while (slotStart.getTime() + duration * 60000 <= slotEnd.getTime()) {
                    // Extraer la hora en formato "HH:mm"
                    const hour =
                        slotStart.getHours().toString().padStart(2, '0') +
                        ':' +
                        slotStart.getMinutes().toString().padStart(2, '0');

                    appointmentsToCreate.push({
                        doctor: doctorId,
                        date: new Date(slotStart),
                        hour,
                        duration,
                        status: 'available',
                        confirmed: false,
                        availability: availability._id
                    });
                    // Siguiente slot: duración + margen de 10 min
                    slotStart = new Date(slotStart.getTime() + (duration + 10) * 60000);
                }
            }
        }

        if (appointmentsToCreate.length === 0) return [];

        return Appointment.insertMany(appointmentsToCreate);
    };

const getFreeAppointmentsForDoctorAndDate = async (doctorId, date) => {
  // Busca citas libres para un doctor en una fecha específica (sin cliente asignado, no canceladas, no en el pasado)
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  const now = new Date();
  // Cancela automáticamente las citas libres en el pasado
  await Appointment.updateMany({
    availability: { $in: await getAvailabilityIdsForDoctor(doctorId) },
    date: { $lt: now },
    free: true,
    client: null
  }, { free: false });
  // Devuelve solo las libres y futuras
  return Appointment.find({
    availability: { $in: await getAvailabilityIdsForDoctor(doctorId) },
    client: null,
    free: true,
    date: { $gte: now, $gte: start, $lte: end }
  }).sort({ date: 1 });
};

const getAllFreeAppointmentsForDoctor = async (doctorId) => {
  const now = new Date();
  // Cancela automáticamente las citas libres en el pasado
  await Appointment.updateMany({
    availability: { $in: await getAvailabilityIdsForDoctor(doctorId) },
    date: { $lt: now },
    free: true,
    client: null
  }, { free: false });
  // Devuelve solo las libres y futuras
  return Appointment.find({
    availability: { $in: await getAvailabilityIdsForDoctor(doctorId) },
    client: null,
    free: true,
    date: { $gte: now }
  }).sort({ date: 1 });
};

// Helper para obtener los IDs de disponibilidad de un doctor
const getAvailabilityIdsForDoctor = async (doctorId) => {
  // Devuelve un array vacío si el doctor no tiene disponibilidades activas
  const availabilities = await Availability.find({ doctor: doctorId, active: true });
  if (!availabilities || availabilities.length === 0) return [];
  return availabilities.map(a => a._id);
};
/* * Obtiene todas las citas libres de un doctor.
 * @param {String} doctorId - ID del doctor.
 * @returns {Promise<Array>} - Lista de citas libres.
 */
/**
 * Obtiene todas las citas confirmadas y programadas de un cliente.
 * @param {String} clientId - ID del cliente.
 * @returns {Promise<Array>} - Lista de citas confirmadas y programadas.
 */
const getAllConfirmedAppointmentsForClient = async (clientId) => {
    return Appointment.find({
        client: clientId,
        confirmed: true,
        status: 'scheduled'
    }).sort({ date: 1 });
};

    module.exports = {
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
        getAvailabilityById
    };
