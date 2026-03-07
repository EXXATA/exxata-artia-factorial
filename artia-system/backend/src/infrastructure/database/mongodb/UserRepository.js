import mongoose from 'mongoose';
import { User } from '../../../domain/entities/User.js';

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const UserModel = mongoose.model('User', userSchema);

export class UserRepository {
  async create(userData) {
    const userDoc = new UserModel({
      userId: userData.id,
      email: userData.email,
      passwordHash: userData.passwordHash,
      name: userData.name
    });

    await userDoc.save();
    return this.toDomain(userDoc);
  }

  async findById(id) {
    const userDoc = await UserModel.findOne({ userId: id });
    return userDoc ? this.toDomain(userDoc) : null;
  }

  async findByEmail(email) {
    const userDoc = await UserModel.findOne({ email });
    return userDoc ? this.toDomain(userDoc) : null;
  }

  async update(id, userData) {
    const userDoc = await UserModel.findOneAndUpdate(
      { userId: id },
      {
        email: userData.email,
        name: userData.name,
        updatedAt: new Date()
      },
      { new: true }
    );

    return userDoc ? this.toDomain(userDoc) : null;
  }

  async delete(id) {
    await UserModel.deleteOne({ userId: id });
    return true;
  }

  toDomain(userDoc) {
    return new User({
      id: userDoc.userId,
      email: userDoc.email,
      passwordHash: userDoc.passwordHash,
      name: userDoc.name,
      createdAt: userDoc.createdAt,
      updatedAt: userDoc.updatedAt
    });
  }
}
