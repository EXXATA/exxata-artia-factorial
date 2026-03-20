export class User {
  constructor({
    id,
    email,
    passwordHash = null,
    name,
    factorialEmployeeId = null,
    artiaUserId = null,
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    this.id = id;
    this.email = email;
    this.passwordHash = passwordHash;
    this.name = name;
    this.factorialEmployeeId = factorialEmployeeId;
    this.artiaUserId = artiaUserId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    this.validate();
  }

  validate() {
    if (!this.id) {
      throw new Error('User ID is required');
    }
    if (!this.email) {
      throw new Error('Email is required');
    }
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      factorialEmployeeId: this.factorialEmployeeId,
      artiaUserId: this.artiaUserId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}
