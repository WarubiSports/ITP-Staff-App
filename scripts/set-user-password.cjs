const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setPassword() {
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.log('Error listing users:', listError.message);
    return;
  }
  
  const user = users.users.find(u => u.email === 'maxbisinger@gmail.com');
  
  if (!user) {
    console.log('User not found');
    return;
  }
  
  console.log('Found user:', user.id);
  
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    password: 'TempPass123!',
    email_confirm: true
  });
  
  if (error) {
    console.log('Error setting password:', error.message);
  } else {
    console.log('Password set to: TempPass123!');
  }
}

setPassword();
