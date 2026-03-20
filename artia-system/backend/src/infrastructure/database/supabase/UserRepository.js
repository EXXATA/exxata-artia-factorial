import { supabase } from './supabaseClient.js';
import { User } from '../../../domain/entities/User.js';

export class UserRepository {
  async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? this.toDomain(data) : null;
  }

  async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? this.toDomain(data) : null;
  }

  async findAll() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('email', { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => this.toDomain(row));
  }

  async create({ id, email, name, passwordHash = null, factorialEmployeeId, artiaUserId }) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id,
        email,
        name,
        password_hash: passwordHash,
        factorial_employee_id: factorialEmployeeId,
        artia_user_id: artiaUserId
      })
      .select()
      .single();

    if (error) throw error;
    return this.toDomain(data);
  }

  async findByFactorialEmployeeId(employeeId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('factorial_employee_id', employeeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? this.toDomain(data) : null;
  }

  async updateFactorialEmployeeId(userId, employeeId) {
    const { error } = await supabase
      .from('users')
      .update({
        factorial_employee_id: employeeId,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
    return true;
  }

  async updatePassword(userId, passwordHash) {
    const { data, error } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return this.toDomain(data);
  }

  async updateIdentity(userId, updates = {}) {
    const payload = {
      updated_at: new Date().toISOString()
    };

    if (updates.email !== undefined) {
      payload.email = updates.email;
    }

    if (updates.name !== undefined) {
      payload.name = updates.name;
    }

    if (updates.factorialEmployeeId !== undefined) {
      payload.factorial_employee_id = updates.factorialEmployeeId;
    }

    if (updates.artiaUserId !== undefined) {
      payload.artia_user_id = updates.artiaUserId;
    }

    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return this.toDomain(data);
  }

  async ensureProfile({ id, email, name, factorialEmployeeId, artiaUserId }) {
    const payload = {
      id,
      email,
      name,
      factorial_employee_id: factorialEmployeeId,
      artia_user_id: artiaUserId,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return this.toDomain(data);
  }

  toDomain(row) {
    return new User({
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.password_hash || null,
      factorialEmployeeId: row.factorial_employee_id,
      artiaUserId: row.artia_user_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }
}
