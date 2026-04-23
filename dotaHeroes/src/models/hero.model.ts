import mongoose, { Schema, Document } from "mongoose";

export interface IHero extends Document {
  name: string;
  description?: string;
  primaryAttribute: "Strength" | "Agility" | "Intelligence" | "Universal";
  attackType: "Melee" | "Ranged";
  imageUrl?: string;
  complexity: number;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;

  readonly powerProfile: string;
}

const heroSchema = new Schema<IHero>(
  {
    name: {
      type: String,
      required: [true, "Назва героя є обов'язковою"],
      trim: true,
      minlength: [1, "Назва занадто коротка"],
      maxlength: [100, "Назва занадто довга"],
    },
    description: {
      type: String,
      maxlength: 500,
      required: false,
    },
    primaryAttribute: {
      type: String,
      required: true,
      enum: ["Strength", "Agility", "Intelligence", "Universal"],
    },
    attackType: {
      type: String,
      required: true,
      enum: ["Melee", "Ranged"],
    },
    imageUrl: {
      type: String,
      required: false,
    },
    complexity: {
      type: Number,
      required: true,
      min: 1,
      max: 3,
      default: 1,
    },
    roles: {
      type: [String],
      required: true,
      validate: {
        validator: function (v: string[]) {
          return v && v.length > 0;
        },
        message: "Герой повинен мати хоча б одну роль",
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

heroSchema.virtual("powerProfile").get(function () {
  return `${this.primaryAttribute} / ${this.attackType}`;
});

export const HeroModel = mongoose.model<IHero>("Hero", heroSchema);
