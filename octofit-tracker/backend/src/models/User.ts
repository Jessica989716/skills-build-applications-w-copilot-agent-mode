import { Schema, model } from 'mongoose';
import { Team } from './Team.js';

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email must be a valid email address'],
  },
  team: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    validate: {
      validator: async (teamId: Schema.Types.ObjectId | undefined) =>
        !teamId || Boolean(await Team.exists({ _id: teamId })),
      message: 'Team must reference an existing team',
    },
  },
  fitnessGoal: { type: String, required: true, trim: true },
});

userSchema.pre('save', async function () {
  if (this.isNew || this.isModified('team')) {
    const previous = this.isNew
      ? null
      : await model('User').findById(this._id).select('team').lean();
    const previousTeam = Array.isArray(previous) ? previous[0]?.team : previous?.team;
    this.$locals.previousTeamId = previousTeam?.toString();
  }
});

userSchema.post('save', async function (user) {
  const previousTeamId = user.$locals.previousTeamId as string | undefined;
  const currentTeamId = user.team?.toString();
  if (previousTeamId && previousTeamId !== currentTeamId) {
    await Team.updateOne({ _id: previousTeamId }, { $pull: { members: user._id } });
  }
  if (currentTeamId && previousTeamId !== currentTeamId) {
    await Team.updateOne({ _id: currentTeamId }, { $addToSet: { members: user._id } });
  }
  delete user.$locals.previousTeamId;
});

export const User = model('User', userSchema);
