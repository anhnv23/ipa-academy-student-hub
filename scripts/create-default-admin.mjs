import {createClient} from "@supabase/supabase-js";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!service)throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY");
const client=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
const email="admin@ipa.local",password="Admin@123";
const{data,error}=await client.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username:"admin"}});
if(error&&!/already/i.test(error.message))throw error;
let id=data?.user?.id;if(!id){const{data:list}=await client.auth.admin.listUsers();id=list.users.find(u=>u.email===email)?.id}
if(!id)throw new Error("Không tìm thấy tài khoản admin");
const{error:pErr}=await client.from("profiles").upsert({id,username:"admin",full_name:"IPA Admin",role:"admin"});if(pErr)throw pErr;
console.log("Created: username admin / password Admin@123");
