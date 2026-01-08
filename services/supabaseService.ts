
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

class SupabaseService {
  private client: SupabaseClient | null = null;

  init(url: string, key: string) {
    if (url && key) {
      this.client = createClient(url, key);
      return true;
    }
    return false;
  }

  async syncTable(tableName: string, data: any[]) {
    if (!this.client) return;
    try {
      // Usiamo upsert per aggiornare se esiste o inserire se nuovo
      const { error } = await this.client
        .from(tableName)
        .upsert(data, { onConflict: tableName === 'profiles' ? 'codice' : 'id' });
      
      if (error) console.error(`Errore sync ${tableName}:`, error);
    } catch (err) {
      console.error("Errore critico Supabase:", err);
    }
  }

  async deleteFromTable(tableName: string, id: string, idColumn: string = 'id') {
    if (!this.client) return;
    const { error } = await this.client
      .from(tableName)
      .delete()
      .eq(idColumn, id);
    if (error) console.error(`Errore delete ${tableName}:`, error);
  }

  async fetchTable(tableName: string) {
    if (!this.client) return null;
    const { data, error } = await this.client
      .from(tableName)
      .select('*');
    if (error) {
      console.error(`Errore fetch ${tableName}:`, error);
      return null;
    }
    return data;
  }
}

export const supabaseService = new SupabaseService();
