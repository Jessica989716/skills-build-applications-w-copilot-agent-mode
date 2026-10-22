import mongoose, { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Activity details are required'), { status: 400 });
  }

  const { userId, teamId, type, minutes, points, occurredAt } = input as Record<string, unknown>;
  if (
    typeof userId !== 'string' || !Types.ObjectId.isValid(userId)
    || typeof teamId !== 'string' || !Types.ObjectId.isValid(teamId)
    || typeof type !== 'string' || !type.trim()
    || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1
    || (points !== undefined && (typeof points !== 'number' || !Number.isFinite(points) || points < 0))
    || (occurredAt !== undefined && typeof occurredAt !== 'string' && typeof occurredAt !== 'number' && !(occurredAt instanceof Date))
  ) {
    throw Object.assign(new Error('Activity details are invalid'), { status: 400 });
  }

  const [user, team] = await Promise.all([
    User.findById(userId).select('_id').lean(),
    Team.findById(teamId).select('_id').lean(),
  ]);
  if (!user || !team) {
    throw Object.assign(new Error('Activity user or team was not found'), { status: 404 });
  }

  const activityDate = occurredAt === undefined ? new Date() : new Date(occurredAt);
  if (Number.isNaN(activityDate.getTime())) {
    throw Object.assign(new Error('Activity date is invalid'), { status: 400 });
  }

  try {
    return await Activity.create({
      user: user._id,
      team: team._id,
      type: type.trim(),
      minutes,
      points: points ?? minutes,
      occurredAt: activityDate,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
      throw Object.assign(error, { status: 400 });
    }
    throw error;
  }
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(_input: unknown) {
  throw Object.assign(new Error('Team validation is not implemented yet'), { status: 501 });
}

export async function getLeaderboard() {
  return [];
}

export async function suggestWorkouts(_userEmail: string) {
  return Workout.find().limit(1).lean();
}

export { User };
