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
    link: { type: String, default: "#" },
    github: { type: String, default: "" }
  },
  { _id: false }
);

const SocialSchema = new mongoose.Schema(
  {
    platform: { type: String, required: true },
    url: { type: String, required: true },
    icon: { type: String, required: true },
    showInNavbar: { type: Boolean, default: true },
    showInOrbit: { type: Boolean, default: true },
    showInContact: { type: Boolean, default: true },
    showInEmail: { type: Boolean, default: true }
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
    profile_image_public_id: { type: String, default: "" },
    stats: { type: [StatSchema], default: [] },
    skills: { type: [String], default: [] },
    projects: { type: [ProjectSchema], default: [] },
    socials: { type: [SocialSchema], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model("Profile", ProfileSchema);
