import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {createClient} from '@supabase/supabase-js';
export async function GET(){
 const c=await cookies();
 const token=c.get('sb-access-token')?.value||'';
 if(!token)return NextResponse.json({access_token:''});
 const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
 const {data:{user}}=await client.auth.getUser(token);
 return NextResponse.json({access_token:user?token:''});
}