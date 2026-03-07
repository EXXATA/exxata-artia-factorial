import { supabase } from './supabaseClient.js';

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

  async create({ email, name, passwordHash, factorialEmployeeId, artiaUserId, artiaToken }) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        name,
        password_hash: passwordHash,
        factorial_employee_id: factorialEmployeeId,
        artia_user_id: artiaUserId,
        artia_token: artiaToken
      })
      .select()
      .single();

    if (error) throw error;
    return this.toDomain(data);
  }

  async updateArtiaToken(userId, artiaToken) {
    const { error } = await supabase
      .from('users')
      .update({
        artia_token: artiaToken,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
    return true;
  }

  async getArtiaToken(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('artia_token')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data?.artia_token;
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

  toDomain(row) {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.password_hash,
      factorialEmployeeId: row.factorial_employee_id,
      artiaUserId: row.artia_user_id,
      artiaToken: row.artia_token,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
