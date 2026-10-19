import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://jwofuqoudhunprvsgvct.supabase.co';
const supabaseKey = 'sb_publishable_YaKRQX6aWAlARmhjTPJleA_HYAYPDZO';

export const supabase = createClient(supabaseUrl, supabaseKey);