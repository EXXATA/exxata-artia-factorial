export class User {
  constructor({
    id,
    email,
    passwordHash,
    name,
    factorialEmployeeId = null,
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    this.id = id;
    this.email = email;
    this.passwordHash = passwordHash;
    this.name = name;
    this.factorialEmployeeId = factorialEmployeeId;
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
    if (!this.passwordHash) {
      throw new Error('Password hash is required');
    }
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      factorialEmployeeId: this.factorialEmployeeId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}
