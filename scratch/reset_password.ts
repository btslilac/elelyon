import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function reset() {
  const email = 'goodnesswema20@gmail.com';
  // Get user auth_id from users table
  const { data: userRow } = await supabase.from('users').select('auth_id').eq('email', email).single();
  if (!userRow) {
    console.error('User not found in profile table');
    return;
  }
  
  const { data, error } = await supabase.auth.admin.updateUserById(
    userRow.auth_id,
    { password: 'Password123!' }
  );

  if (error) {
    console.error('Error resetting password:', error);
  } else {
    console.log('Successfully updated password for', email);
  }
}

reset();
