export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bank_statements: {
        Row: {
          file_name: string
          file_path: string
          id: string
          processed: boolean | null
          processed_at: string | null
          upload_date: string
          user_id: string
        }
        Insert: {
          file_name: string
          file_path: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          upload_date?: string
          user_id: string
        }
        Update: {
          file_name?: string
          file_path?: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          upload_date?: string
          user_id?: string
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          balance: number | null
          category: Database["public"]["Enums"]["ledger_category"] | null
          created_at: string
          credit_amount: number | null
          debit_amount: number | null
          description: string
          id: string
          reference_number: string | null
          statement_id: string
          transaction_date: string
          user_id: string
        }
        Insert: {
          balance?: number | null
          category?: Database["public"]["Enums"]["ledger_category"] | null
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          description: string
          id?: string
          reference_number?: string | null
          statement_id: string
          transaction_date: string
          user_id: string
        }
        Update: {
          balance?: number | null
          category?: Database["public"]["Enums"]["ledger_category"] | null
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string
          id?: string
          reference_number?: string | null
          statement_id?: string
          transaction_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "bank_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_items: {
        Row: {
          bill_id: string
          created_at: string
          id: string
          name: string
          price: number
          quantity: number
          total: number
        }
        Insert: {
          bill_id: string
          created_at?: string
          id?: string
          name: string
          price: number
          quantity?: number
          total: number
        }
        Update: {
          bill_id?: string
          created_at?: string
          id?: string
          name?: string
          price?: number
          quantity?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          bill_date: string
          bill_number: string
          bill_type: string
          cgst: number | null
          created_at: string
          description: string | null
          id: string
          igst: number | null
          sgst: number | null
          tax_amount: number | null
          total_amount: number
          updated_at: string
          user_id: string
          vendor_name: string
        }
        Insert: {
          bill_date: string
          bill_number: string
          bill_type?: string
          cgst?: number | null
          created_at?: string
          description?: string | null
          id?: string
          igst?: number | null
          sgst?: number | null
          tax_amount?: number | null
          total_amount: number
          updated_at?: string
          user_id: string
          vendor_name: string
        }
        Update: {
          bill_date?: string
          bill_number?: string
          bill_type?: string
          cgst?: number | null
          created_at?: string
          description?: string | null
          id?: string
          igst?: number | null
          sgst?: number | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          user_id?: string
          vendor_name?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          gst_number: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      detailed_ledgers: {
        Row: {
          account_name: string
          bill_id: string | null
          category: Database["public"]["Enums"]["ledger_category"]
          created_at: string
          credit_amount: number | null
          date: string
          debit_amount: number | null
          description: string | null
          id: string
          party_name: string
          user_id: string
        }
        Insert: {
          account_name: string
          bill_id?: string | null
          category: Database["public"]["Enums"]["ledger_category"]
          created_at?: string
          credit_amount?: number | null
          date: string
          debit_amount?: number | null
          description?: string | null
          id?: string
          party_name: string
          user_id: string
        }
        Update: {
          account_name?: string
          bill_id?: string | null
          category?: Database["public"]["Enums"]["ledger_category"]
          created_at?: string
          credit_amount?: number | null
          date?: string
          debit_amount?: number | null
          description?: string | null
          id?: string
          party_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "detailed_ledgers_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          amount: number
          balance: number
          bill_id: string | null
          created_at: string
          date: string
          description: string
          id: string
          reference: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance: number
          bill_id?: string | null
          created_at?: string
          date: string
          description: string
          id?: string
          reference: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance?: number
          bill_id?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          reference?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_access: {
        Row: {
          accountant_id: string
          approved_at: string | null
          approved_by: string | null
          id: string
          organization_id: string
          requested_at: string
          status: string | null
        }
        Insert: {
          accountant_id: string
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          organization_id: string
          requested_at?: string
          status?: string | null
        }
        Update: {
          accountant_id?: string
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          organization_id?: string
          requested_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          company_name: string | null
          created_at: string
          email: string
          full_name: string | null
          gst_number: string | null
          id: string
          role: string | null
          updated_at: string
          user_type: Database["public"]["Enums"]["user_type"] | null
        }
        Insert: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          gst_number?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Update: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          gst_number?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ledger_category:
        | "travel_expense"
        | "fuel_expense"
        | "office_expense"
        | "construction_expense"
        | "material_expense"
        | "salary_expense"
        | "rent_expense"
        | "utilities_expense"
        | "professional_fees"
        | "marketing_expense"
        | "maintenance_expense"
        | "insurance_expense"
        | "sales_income"
        | "service_income"
        | "other_income"
        | "cgst_payable"
        | "sgst_payable"
        | "igst_payable"
        | "cgst_receivable"
        | "sgst_receivable"
        | "igst_receivable"
        | "accounts_payable"
        | "accounts_receivable"
        | "cash"
        | "bank"
        | "other"
      user_type: "individual" | "organization" | "accountant"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ledger_category: [
        "travel_expense",
        "fuel_expense",
        "office_expense",
        "construction_expense",
        "material_expense",
        "salary_expense",
        "rent_expense",
        "utilities_expense",
        "professional_fees",
        "marketing_expense",
        "maintenance_expense",
        "insurance_expense",
        "sales_income",
        "service_income",
        "other_income",
        "cgst_payable",
        "sgst_payable",
        "igst_payable",
        "cgst_receivable",
        "sgst_receivable",
        "igst_receivable",
        "accounts_payable",
        "accounts_receivable",
        "cash",
        "bank",
        "other",
      ],
      user_type: ["individual", "organization", "accountant"],
    },
  },
} as const
