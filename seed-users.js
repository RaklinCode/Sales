
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envConfig[key.trim()] = value.trim().replace(/^['"]|['"]$/g, '');
    }
});


// Use environment variables instead of hardcoded credentials
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const adminPassword = envConfig.VITE_ADMIN_PASSWORD || 'admin1234';

const users = [
    { name: 'Alice', email: 'alice@test.com', password: 'password123', account_type: 'rep' },
    { name: 'Bob', email: 'bob@test.com', password: 'password123', account_type: 'rep' },
    { name: 'Charlie', email: 'charlie@test.com', password: 'password123', account_type: 'rep' },
    { name: 'Admin', email: 'admin@sales.com', password: adminPassword, account_type: 'admin' },
];

async function seedUsers() {
    console.log('Seeding users...');

    for (const user of users) {
        console.log(`Attempting to sign up user: ${user.name}`);
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: user.email,
            password: user.password,
            options: {
                data: {
                    name: user.name,
                    account_type: user.account_type,
                },
            },
        });

        if (authError) {
            console.error(`Sign up failed for ${user.name}:`, authError.message);

            // Fallback: Try inserting into user_profiles directly
            console.log(`Attempting direct insert into user_profiles for ${user.name}...`);
            const fakeId = randomUUID();
            const { error: dbError } = await supabase
                .from('user_profiles')
                .insert({
                    id: fakeId,
                    name: user.name,
                    account_type: user.account_type,
                    // email: user.email // user_profiles might not have email column, usually it's in auth.users
                });

            if (dbError) {
                console.error(`Direct insert failed for ${user.name}:`, dbError.message);
            } else {
                console.log(`Successfully inserted ${user.name} into user_profiles directly.`);
            }

        } else {
            console.log(`Successfully signed up ${user.name}`);
        }
    }

    console.log('Seeding complete.');
}

seedUsers();
