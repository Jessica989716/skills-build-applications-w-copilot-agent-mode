import { Schema, Types, model } from 'mongoose';

const teamSchema = new Schema({
  name: { type: String, required: true, trim: true },
  mascot: { type: String, required: true, trim: true },
  members: {
    type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    default: [],
    validate: {
      validator: async (memberIds: Types.ObjectId[]) => {
        const uniqueIds = new Set(memberIds.map((memberId) => memberId.toString()));
        return memberIds.length === uniqueIds.size
          && await model('User').countDocuments({ _id: { $in: memberIds } }) === memberIds.length;
      },
      message: 'Team members must be unique references to existing users',
    },
  },
});

export const Team = model('Team', teamSchema);
