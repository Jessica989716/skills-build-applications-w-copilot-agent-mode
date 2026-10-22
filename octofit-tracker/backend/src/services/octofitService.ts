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

export async function createTeam(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Team details are required'), { status: 400 });
  }

  const { name, mascot, members = [] } = input as Record<string, unknown>;
  if (
    typeof name !== 'string' || !name.trim()
    || typeof mascot !== 'string' || !mascot.trim()
    || !Array.isArray(members)
    || !members.every((member): member is string => typeof member === 'string' && Types.ObjectId.isValid(member))
  ) {
    throw Object.assign(new Error('Team details are invalid'), { status: 400 });
  }

  const uniqueMemberIds = [...new Set(members)];
  const users = await User.find({ _id: { $in: uniqueMemberIds } });
  if (users.length !== uniqueMemberIds.length) {
    throw Object.assign(new Error('One or more team members were not found'), { status: 404 });
  }

  try {
    const team = await Team.create({
      name: name.trim(),
      mascot: mascot.trim(),
      members: uniqueMemberIds,
    });
    for (const user of users) {
      user.team = team._id;
      await user.save();
    }
    return team;
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
      throw Object.assign(error, { status: 400 });
    }
    throw error;
  }
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().select('name').lean(),
    Activity.aggregate<{ _id: Types.ObjectId; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(totals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));
  return teams
    .map((team) => ({ teamName: team.name, totalPoints: pointsByTeam.get(team._id.toString()) ?? 0 }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).select('fitnessGoal').lean();
  if (!user) {
    throw Object.assign(new Error('User was not found'), { status: 404 });
  }

  const [activity] = await Activity.aggregate<{ _id: string; count: number }>([
    { $match: { user: user._id } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 1 },
  ]);
  const preferredFocus = user.fitnessGoal || activity?._id;
  const workouts = await Workout.find().lean();
  return workouts
    .sort((left, right) => Number(right.focus === preferredFocus) - Number(left.focus === preferredFocus))
    .map((workout) => ({
      ...workout,
      reason: workout.focus === preferredFocus
        ? `Matches your ${preferredFocus} fitness goal and activity pattern.`
        : `Supports your ${preferredFocus} fitness goal with complementary training.`,
    }));
}

export { User };
