const Appointment = require('../models/appointment.model');
const Availability = require('../models/availability.model');

const create = async (data) => Appointment.create(data);
const getAll = async () => Appointment.find();
const getById = async (id) => Appointment.findById(id);
const update = async (id, data) => Appointment.findByIdAndUpdate(id, data, { new: true });
const remove = async (id) => Appointment.findByIdAndDelete(id);
const getNextConfirmedAppointment = async (userId) =>
    Appointment.findOne({ user: userId, confirmed: true }).sort({ date: 1 });
const cancelConfirmedAppointment = async (userId) =>
    Appointment.findOneAndUpdate(
        { user: userId, confirmed: true },
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
  // Busca citas libres para un doctor en una fecha específica (sin usuario asignado, no canceladas, no en el pasado)
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  const now = new Date();
  // Cancela automáticamente las citas libres en el pasado
  await Appointment.updateMany({
    doctor: doctorId,
    date: { $lt: now },
    status: { $ne: 'cancelled' },
    user: null
  }, { status: 'cancelled' });
  // Devuelve solo las libres y futuras
  return Appointment.find({
    doctor: doctorId,
    user: null,
    status: 'free',
    date: { $gte: now, $gte: start, $lte: end }
  }).sort({ date: 1 });
};

const getAllFreeAppointmentsForDoctor = async (doctorId) => {
  const now = new Date();
  // Cancela automáticamente las citas libres en el pasado
  await Appointment.updateMany({
    doctor: doctorId,
    date: { $lt: now },
    status: { $ne: 'cancelled' },
    user: null
  }, { status: 'cancelled' });
  // Devuelve solo las libres y futuras
  return Appointment.find({
    doctor: doctorId,
    user: null,
    status: 'free',
    date: { $gte: now }
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
        getAllFreeAppointmentsForDoctor
    };
