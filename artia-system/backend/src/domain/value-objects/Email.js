export class Email {
  constructor(value) {
    this.value = value;
    this.validate();
  }

  validate() {
    if (!this.value || typeof this.value !== 'string') {
      throw new Error('Email must be a non-empty string');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.value)) {
      throw new Error('Invalid email format');
    }
  }

  equals(otherEmail) {
    return this.value.toLowerCase() === otherEmail.value.toLowerCase();
  }

  toString() {
    return this.value;
  }

  toJSON() {
    return this.value;
  }
}
