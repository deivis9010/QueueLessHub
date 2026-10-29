/**
 * Removes duplicate free appointments (same doctor and same start date).
 * Booked rows (with a client) are never deleted.
 *
 * Dry run (default): npm run cleanup:duplicate-appointments
 * Apply changes:     npm run cleanup:duplicate-appointments -- --apply
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Appointment from '../src/models/appointment.model';
import Availability from '../src/models/availability.model';

type AppointmentRow = {
  _id: mongoose.Types.ObjectId;
  availability: mongoose.Types.ObjectId;
  date: Date;
  client?: mongoose.Types.ObjectId | null;
};

type AvailabilityRow = {
  _id: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
};

async function run(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  const apply = process.argv.includes('--apply');
  await mongoose.connect(uri);

  const availabilities = await Availability.find({}).select('doctor').lean<AvailabilityRow[]>();
  const doctorByAvailability = new Map(availabilities.map((a) => [a._id.toString(), a.doctor.toString()]));

  const appointments = await Appointment.find({}).select('availability date client').sort({ _id: 1 }).lean<AppointmentRow[]>();

  const groups = new Map<string, AppointmentRow[]>();
  for (const appointment of appointments) {
    const doctorId = doctorByAvailability.get(appointment.availability.toString());
    if (!doctorId) continue;
    const key = `${doctorId}|${new Date(appointment.date).getTime()}`;
    const group = groups.get(key) ?? [];
    group.push(appointment);
    groups.set(key, group);
  }

  const toDelete: mongoose.Types.ObjectId[] = [];
  let duplicateGroups = 0;
  let bookedDuplicates = 0;

  for (const group of groups.values()) {
    if (group.length < 2) continue;
    duplicateGroups++;

    const booked = group.filter((row) => row.client);
    const free = group.filter((row) => !row.client);
    const keep = booked.length > 0 ? booked[0] : free[0];

    bookedDuplicates += Math.max(booked.length - 1, 0);
    for (const row of group) {
      if (row !== keep && !row.client) {
        toDelete.push(row._id);
      }
    }
  }

  console.log(`Duplicate groups found: ${duplicateGroups}`);
  console.log(`Free duplicate rows to remove: ${toDelete.length}`);
  console.log(`Booked duplicates skipped (review manually): ${bookedDuplicates}`);

  if (!apply) {
    console.log('Dry run only. Re-run with -- --apply to delete the free duplicates.');
  } else if (toDelete.length > 0) {
    const result = await Appointment.deleteMany({ _id: { $in: toDelete } });
    console.log(`Deleted: ${result.deletedCount}`);
  }

  await mongoose.disconnect();
}

run().catch(async (error: unknown) => {
  console.error('Cleanup failed:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
