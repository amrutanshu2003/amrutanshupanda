import mongoose from "mongoose";

const StatSchema = new mongoose.Schema(
  {
    value: { type: String, required: true },
    label: { type: String, required: true }
  },
  { _id: false }
);

const ProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    link: { type: String, default: "#" }
  },
  { _id: false }
);

const ProfileSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    headline: { type: String, required: true },
    email: { type: String, required: true },
    about: { type: String, required: true },
    profile_image_data: { type: String, default: "" },
    stats: { type: [StatSchema], default: [] },
    skills: { type: [String], default: [] },
    projects: { type: [ProjectSchema], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model("Profile", ProfileSchema);
