// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://fwzzrrjgehpbacjdcjak.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3enpycmpnZWhwYmFjamRjamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzI5NTIsImV4cCI6MjA2NTY0ODk1Mn0.DKnsnocm-vmxjRbYqlmskiieio2wHcAa2B_p6614n9E";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);