
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

class SupabaseService {
  private client: SupabaseClient | null = null;

  init(url: string, key: string) {
    if (url && key && url.startsWith('http')) {
      try {
        this.client = createClient(url, key);
        return true;
      } catch (e) {
        console.error("Errore init Supabase:", e);
        return false;
      }
    }
    return false;
  }

  disconnect() {
    this.client = null;
  }

  isInitialized(): boolean {
    return this.client !== null;
  }

  async syncTable(tableName: string, data: any[]) {
    if (!this.client) throw new Error("Client non inizializzato");
    try {
      // Upsert gestisce sia inserimento che aggiornamento
      const { error } = await this.client
        .from(tableName)
        .upsert(data, { onConflict: tableName === 'profiles' ? 'codice' : 'id' });
      
      if (error) throw error;
    } catch (err: any) {
      console.error(`Errore sync ${tableName}:`, err);
      throw new Error(err.message || "Errore sconosciuto di rete o permessi");
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
    try {
      const { data, error } = await this.client
        .from(tableName)
        .select('*');
      if (error) throw error;
      return data;
    } catch (e: any) {
      console.error(`Errore fetch ${tableName}:`, e);
      return null;
    }
  }
}

export const supabaseService = new SupabaseService();
